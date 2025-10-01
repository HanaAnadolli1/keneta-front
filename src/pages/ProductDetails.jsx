// src/pages/ProductDetails.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useParams, useLocation } from "react-router-dom";
import { useCartMutations } from "../api/hooks";
import { API_V1 } from "../api/config";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import "../custom.css";

import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { MdCompareArrows } from "react-icons/md";
import { useWishlist } from "../context/WishlistContext";
import { useCompare } from "../context/CompareContext";
import { useToast } from "../context/ToastContext";

import ProductReviews from "../components/ProductReviews";
import ProductCard from "../components/ProductCard";
import Breadcrumbs from "../components/Breadcrumbs";

const API_PUBLIC_V1 = "https://admin.keneta-ks.com/api/v2";

/* ---------------- small helpers ---------------- */
const chunkPairs = (rows, size = 2) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const looksLikeHtml = (s = "") => /<[^>]+>/.test(s);

const renderBulletList = (text = "") => {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  const parts = normalized
    .split(/(?:^|[\s])•\s*/g)
    .map((t) => t.trim())
    .filter(Boolean);
  if (parts.length <= 1) return null;
  return (
    <ul className="list-disc pl-5 space-y-1">
      {parts.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
};

const renderRichText = (raw = "") => {
  if (!raw) return <p className="text-gray-500">No description.</p>;
  if (looksLikeHtml(raw))
    return <div dangerouslySetInnerHTML={{ __html: raw }} />;

  // Check for various bullet point formats and convert to checkmarks
  const bulletPatterns = [
    /•/g, // Standard bullet
    /·/g, // Middle dot
    /▪/g, // Black small square
    /▫/g, // White small square
    /‣/g, // Triangular bullet
    /⁃/g, // Hyphen bullet
  ];

  let hasBullets = false;
  let processedText = raw;

  // Replace all bullet patterns with a marker
  bulletPatterns.forEach((pattern) => {
    if (pattern.test(processedText)) {
      hasBullets = true;
      processedText = processedText.replace(pattern, "|||BULLET|||");
    }
  });

  if (hasBullets) {
    const features = processedText
      .split("|||BULLET|||")
      .filter((item) => item.trim())
      .map((item) => item.trim());
    if (features.length > 1) {
      return (
        <div className="space-y-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--primary)] font-semibold mt-0.5">
                ✓
              </span>
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  const bullets = renderBulletList(raw);
  if (bullets) return bullets;
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    );
  }
  return <p>{raw}</p>;
};

/* ---------- normalization + trail helpers ---------- */
const normalizeSlug = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_/]+/g, "-")
    .replace(/^-+|-+$/g, "");

const makeSlugCandidates = (s = "") => {
  const raw = String(s || "");
  const dec = decodeURIComponent(raw);
  const enc = encodeURIComponent(dec);
  const n1 = normalizeSlug(raw);
  const n2 = normalizeSlug(dec);
  return new Set([raw, dec, enc, raw.toLowerCase(), dec.toLowerCase(), n1, n2]);
};

const normCat = (c) => {
  if (!c) return null;
  return {
    id: Number(c.id ?? c.category_id ?? c?.pivot?.category_id ?? 0) || 0,
    parent_id:
      c.parent_id != null
        ? Number(c.parent_id)
        : c.parent?.id != null
        ? Number(c.parent.id)
        : null,
    slug: normalizeSlug(c.slug ?? c.code ?? c.value ?? c.name ?? ""),
    name: String(c.name ?? c.label ?? c.title ?? c.slug ?? "Category"),
    level:
      c.level != null
        ? Number(c.level)
        : c.depth != null
        ? Number(c.depth)
        : undefined,
    translations: Array.isArray(c.translations) ? c.translations : [],
    status: String(c.status ?? "1"),
  };
};

const mapById = (categories) => {
  const m = new Map();
  (categories || []).forEach((c) => {
    const n = normCat(c);
    if (n?.id) m.set(n.id, n);
  });
  return m;
};

const buildTrailFromFlatList = (target, flatMap) => {
  const trail = [];
  let cur = target ? normCat(target) : null;
  let guard = 0;
  while (cur && guard < 20) {
    trail.push(cur);
    const pid = cur.parent_id;
    if (!pid || pid === 0 || !flatMap.has(pid)) break;
    cur = flatMap.get(pid);
    guard++;
  }
  return trail.reverse();
};

// DFS across /descendant-categories; matches by id or robust slug; try multiple roots
const createTrailFinder = (getChildren, rootIds = [1]) => {
  return async (target) => {
    if (!target) return [];
    const wantId = Number(target.id || 0) || null;
    const wantCandidates = new Set([
      ...makeSlugCandidates(target.slug),
      ...(target.translations || [])
        .map((t) => t?.slug)
        .filter(Boolean)
        .flatMap((s) => [...makeSlugCandidates(s)]),
    ]);

    const MAX_DEPTH = 10;

    for (const rootId of rootIds) {
      const stack = [{ parentId: rootId, path: [] }];

      while (stack.length) {
        const { parentId, path } = stack.pop();
        const children = await getChildren(parentId);
        for (const raw of children) {
          const child = normCat(raw);
          const nextPath = [...path, child];

          const childCandidates = new Set([
            ...makeSlugCandidates(child.slug),
            ...(child.translations || [])
              .map((t) => t?.slug)
              .filter(Boolean)
              .flatMap((s) => [...makeSlugCandidates(s)]),
          ]);

          const slugMatches =
            wantCandidates.size > 0 &&
            [...childCandidates].some((c) => wantCandidates.has(c));

          if ((wantId && child.id === wantId) || slugMatches) {
            return nextPath;
          }

          if (nextPath.length < MAX_DEPTH) {
            stack.push({ parentId: child.id, path: nextPath });
          }
        }
      }
    }

    return [];
  };
};

/* ---------------- component ---------------- */
export default function ProductDetails() {
  const { url_key } = useParams();
  const location = useLocation();
  const { addItem } = useCartMutations();

  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addWithFlash, remove, isCompared, max, count } = useCompare();
  const toast = useToast();

  const galleryRef = useRef();

  // base product
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("description");

  // related
  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(null);

  // breadcrumbs
  const [categoryTrail, setCategoryTrail] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const childrenCacheRef = useRef(new Map()); // parentId -> children[]

  const breadcrumbsBase = [{ label: "Home", path: "/" }];

  const accessToken =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token");

  /* --------- responsive flag --------- */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --------- product by url_key --------- */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(
          `${API_V1}/products?url_key=${encodeURIComponent(url_key)}`
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        if (!list.length) throw new Error("Product not found");
        if (!ignore) setProduct(list[0]);
      } catch (e) {
        if (!ignore) setError(e.message);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [url_key]);

  /* --------- all categories list (id↔slug/name map) --------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_V1}/categories?sort=id&order=asc&limit=10000`
        );
        const j = await res.json();
        if (!cancelled) setAllCategories(Array.isArray(j?.data) ? j.data : []);
      } catch {
        if (!cancelled) setAllCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------- related --------- */
  useEffect(() => {
    if (!product?.id) return;
    let ignore = false;
    const controller = new AbortController();
    (async () => {
      try {
        setRelatedError(null);
        setRelatedLoading(true);
        const endpoint = `https://admin.keneta-ks.com/api/v2/products/${product.id}/related`;
        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) throw new Error(`Related: status ${res.status}`);
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];
        if (!ignore) setRelated(items);
      } catch (e) {
        if (!ignore) setRelatedError(e.message);
      } finally {
        if (!ignore) setRelatedLoading(false);
      }
    })();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [product?.id]);

  /* --------- breadcrumbs: menu-style traversal --------- */
  const getChildren = useCallback(async (parentId) => {
    const key = String(parentId);
    if (childrenCacheRef.current.has(key)) {
      return childrenCacheRef.current.get(key);
    }
    const res = await fetch(
      `${API_PUBLIC_V1}/descendant-categories?parent_id=${encodeURIComponent(
        parentId
      )}`
    );
    if (!res.ok) throw new Error(`cats ${res.status}`);
    const j = await res.json();
    const rows = (j?.data || []).filter((c) => String(c.status ?? "1") === "1");
    childrenCacheRef.current.set(key, rows);
    return rows;
  }, []);

  // Infer roots from local list; add 1 as a safe fallback
  const rootIds = useMemo(() => {
    const roots = (allCategories || [])
      .map(normCat)
      .filter((c) => c && (!c.parent_id || c.parent_id === 0))
      .map((c) => c.id);
    return Array.from(new Set([...(roots || []), 1]));
  }, [allCategories]);

  const findTrailRemote = useMemo(
    () => createTrailFinder(getChildren, rootIds),
    [getChildren, rootIds]
  );

  const byId = useMemo(() => mapById(allCategories), [allCategories]);

  const pickPrimaryCategory = (cats) => {
    if (!Array.isArray(cats) || cats.length === 0) return null;
    const withLevel = cats.filter((c) => c.level != null);
    if (withLevel.length) {
      return withLevel
        .slice()
        .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
    }
    return cats[cats.length - 1];
  };

  // Build the category trail (with robust fallbacks)
  useEffect(() => {
    if (!product) return;

    (async () => {
      // 0) Instant UI using persisted trail from Products page (authoritative until replaced)
      try {
        const cachedTrail = JSON.parse(
          sessionStorage.getItem("recent.trail.json") || "null"
        );
        if (Array.isArray(cachedTrail) && cachedTrail.length) {
          const items = cachedTrail.map((n, i) =>
            i === cachedTrail.length - 1
              ? { label: n.name || n.slug || "Category" }
              : {
                  label: n.name || n.slug || "Category",
                  path: `/products?category=${encodeURIComponent(
                    n.slug || ""
                  )}`,
                }
          );
          setCategoryTrail(items);
        }
      } catch {}

      // Build/verify with data
      let productCats = [];

      // A) from payload
      if (Array.isArray(product?.categories) && product.categories.length) {
        productCats = product.categories
          .map(normCat)
          .filter((n) => n?.id || n?.slug);
      } else if (Array.isArray(product?.category_ids)) {
        productCats = product.category_ids
          .map((id) => byId.get(Number(id)))
          .filter(Boolean);
      } else if (product?.category_id) {
        const c = byId.get(Number(product.category_id));
        if (c) productCats = [c];
      } else if (product?.category && typeof product.category === "object") {
        const n = normCat(product.category);
        if (n?.id || n?.slug) productCats = [n];
      }

      // B) richer endpoints
      if (!productCats.length) {
        try {
          const r1 = await fetch(`${API_V1}/products/${product.id}`);
          if (r1.ok) {
            const j1 = await r1.json();
            const p1 = j1?.data || j1;
            if (Array.isArray(p1?.categories)) {
              productCats = p1.categories
                .map(normCat)
                .filter((n) => n?.id || n?.slug);
            }
            if (!productCats.length && Array.isArray(p1?.category_ids)) {
              productCats = p1.category_ids
                .map((id) => byId.get(Number(id)))
                .filter(Boolean);
            }
          }
        } catch {}
      }
      if (!productCats.length) {
        try {
          const r2 = await fetch(`${API_V1}/products/${product.id}/categories`);
          if (r2.ok) {
            const j2 = await r2.json();
            const rows = Array.isArray(j2?.data) ? j2.data : [];
            productCats = rows.map(normCat).filter((n) => n?.id || n?.slug);
          }
        } catch {}
      }

      // C) hints
      if (!productCats.length && Array.isArray(product?.breadcrumbs)) {
        const last = product.breadcrumbs.slice().pop();
        const n = normCat(last);
        if (n?.id || n?.slug) productCats = [n];
      }
      if (!productCats.length && Array.isArray(product?.category_tree)) {
        const last = product.category_tree.slice().pop();
        const n = normCat(last);
        if (n?.id || n?.slug) productCats = [n];
      }

      // D) URL / persisted single slug
      if (!productCats.length) {
        const params = new URLSearchParams(location.search);
        const urlCategory =
          params.get("category") || params.get("category_slug");
        const hinted =
          urlCategory || sessionStorage.getItem("recent.category.slug");
        if (hinted) {
          const target = normalizeSlug(hinted);
          const found =
            [...byId.values()].find(
              (x) =>
                normalizeSlug(x.slug) === target ||
                (Array.isArray(x.translations) &&
                  x.translations.some((t) => normalizeSlug(t?.slug) === target))
            ) || null;
          if (found) productCats = [found];
        }
      }

      const primary = productCats.length
        ? pickPrimaryCategory(productCats)
        : null;
      if (!primary) return;

      // LOCAL + REMOTE, prefer longer
      const localTrail = byId.size ? buildTrailFromFlatList(primary, byId) : [];
      let remoteTrail = [];
      try {
        remoteTrail = await findTrailRemote(primary);
      } catch {}

      const best =
        remoteTrail.length > localTrail.length ? remoteTrail : localTrail;

      if (best.length) {
        setCategoryTrail(
          best.map((n, i) =>
            i === best.length - 1
              ? { label: n.name }
              : {
                  label: n.name,
                  path: `/products?category=${encodeURIComponent(n.slug)}`,
                }
          )
        );
      } else if (categoryTrail.length === 0) {
        setCategoryTrail([{ label: primary.name || primary.slug }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, allCategories, byId, location.search]);

  /* --------- auto-open reviews tab --------- */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const hashWantsReviews = location.hash?.toLowerCase() === "#reviews";
    if (tab === "reviews" || hashWantsReviews) setActiveTab("reviews");
  }, [location.search, location.hash]);

  /* --------- extra rows --------- */
  const extraRows = useMemo(() => {
    const p = product || {};
    const v = p?.variants && !Array.isArray(p.variants) ? p.variants : null;

    const length = p.length ?? v?.length;
    const width = p.width ?? v?.width;
    const height = p.height ?? v?.height;

    const rows = [
      { label: "SKU", value: p.sku },
      { label: "Type", value: p.type },
      { label: "Brand", value: p.brand ?? p?.attributes?.brand_label },
      { label: "Weight", value: p.weight ?? v?.weight },
      {
        label: "Dimensions",
        value:
          length || width || height
            ? `${length ?? "—"} × ${width ?? "—"} × ${height ?? "—"}`
            : null,
      },
      {
        label: "In Stock",
        value: p.in_stock != null ? (p.in_stock ? "Yes" : "No") : null,
      },
    ].filter((r) => r.value != null && r.value !== "");
    return rows;
  }, [product]);

  const pairs = chunkPairs(extraRows, 2);

  /* --------- loading/error gates --------- */
  const pageCrumbs = [
    ...breadcrumbsBase,
    ...categoryTrail,
    { label: product?.name || "Product" },
  ];

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Breadcrumbs items={[...breadcrumbsBase, { label: "Product" }]} />
        <div className="text-red-600">{error}</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Breadcrumbs items={[...breadcrumbsBase, { label: "Product" }]} />
        Loading…
      </div>
    );
  }

  /* --------- derived UI values --------- */
  const galleryImages =
    Array.isArray(product?.images) && product.images.length > 0
      ? product.images.map((img) => ({
          original: img.original_image_url,
          thumbnail: img.small_image_url || img.medium_image_url,
        }))
      : product?.base_image?.original_image_url
      ? [
          {
            original: product.base_image.original_image_url,
            thumbnail:
              product.base_image.small_image_url ||
              product.base_image.medium_image_url,
          },
        ]
      : [];

  const idNum = Number(product.id);
  const wished = isWishlisted(idNum);
  const compared = isCompared(idNum);
  const canAddMoreCompare = compared || count < max;

  const unitPriceLabel = product.formatted_price ?? "€0.00";
  const unitPrice = Number(product?.price ?? 0);
  const currencyMatch = String(product?.formatted_price || "").match(
    /[^\d.,\s-]+/
  );
  const currencySymbol =
    product?.currency_options?.symbol ||
    (currencyMatch ? currencyMatch[0] : "€");
  const totalLabel = `${currencySymbol}${(unitPrice * qty).toFixed(2)}`;

  const onThumbnailClick = (index) => {
    setSelectedIndex(index);
    galleryRef.current?.slideToIndex(index);
  };

  const add = addItem;
  const handleAdd = () => {
    if (!product || qty < 1) return;
    const tid = toast.info("Adding to cart…", { duration: 0 });
    add.mutate(
      { productId: product.id, quantity: qty },
      {
        onSuccess: () => {
          toast.remove(tid);
          toast.success("Item added to cart.");
        },
        onError: (e) => {
          toast.remove(tid);
          toast.error(e?.message || "Failed to add to cart.");
        },
      }
    );
  };

  const handleCompare = () => {
    if (compared) {
      remove(idNum);
      toast.info("Removed from compare.");
      return;
    }
    if (!canAddMoreCompare) {
      toast.warn(`Compare limit reached (max ${max}).`);
      return;
    }
    addWithFlash(product);
    toast.success("Item added to compare list.");
  };

  /* ---------------- render ---------------- */
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumbs include the full category path */}
      <Breadcrumbs items={pageCrumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* LEFT */}
        <div className="flex gap-4">
          {galleryImages.length > 1 && (
            <div className="hidden md:flex flex-col gap-4">
              {galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img.thumbnail}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => onThumbnailClick(idx)}
                  className={`w-20 h-20 object-contain border rounded-xl cursor-pointer bg-white ${
                    selectedIndex === idx
                      ? "ring-2 ring-indigo-600"
                      : "ring-1 ring-black/5"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex-1">
            <div className="rounded-2xl ring-1 ring-black/5 overflow-hidden">
              <ImageGallery
                ref={galleryRef}
                items={galleryImages}
                startIndex={selectedIndex}
                showThumbnails={false}
                showPlayButton={false}
                showFullscreenButton={false}
                showNav={false}
                showBullets={isMobile}
                additionalClass="custom-gallery"
              />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-6">
          {/* Brand Badge */}
          {product.brand && (
            <div className="inline-flex">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {product.brand}
              </span>
            </div>
          )}

          {/* Product Title */}
          <h1 className="text-3xl font-bold leading-tight text-[var(--primary)]">
            {product.name}
          </h1>

          {/* SKU and EAN */}
          <div className="space-y-1">
            {product.sku && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">SKU:</span> {product.sku}
              </div>
            )}
            {product.ean && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">EAN:</span> {product.ean}
              </div>
            )}
          </div>

          {/* Features Section - Convert bullet points to checkmarks */}
          {product.short_description && (
            <div className="space-y-2">
              {(() => {
                const raw = product.short_description || "";
                if (!raw) return null;

                // Decode HTML entities and remove HTML tags
                let processedText = raw;

                // Decode common HTML entities
                processedText = processedText
                  .replace(/&bull;/g, "•")
                  .replace(/&euml;/g, "ë")
                  .replace(/&ccedil;/g, "ç")
                  .replace(/&auml;/g, "ä")
                  .replace(/&ouml;/g, "ö")
                  .replace(/&uuml;/g, "ü")
                  .replace(/&Auml;/g, "Ä")
                  .replace(/&Ouml;/g, "Ö")
                  .replace(/&Uuml;/g, "Ü")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");

                // Remove HTML tags
                processedText = processedText.replace(/<[^>]*>/g, "");

                // Check if it contains bullet points
                if (processedText.includes("•")) {
                  const features = processedText
                    .split("•")
                    .filter((item) => item.trim())
                    .map((item) => item.trim());
                  return (
                    <>
                      {features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[var(--secondary)] font-semibold mt-0.5">
                            ✓
                          </span>
                          <span className="text-sm text-gray-700">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </>
                  );
                }

                // If no bullet points, show as regular text
                return <p className="text-sm text-gray-700">{processedText}</p>;
              })()}
            </div>
          )}

          {/* Price */}
          <div className="text-3xl font-bold text-[var(--secondary)]">
            {unitPriceLabel}
          </div>

          {/* Availability */}
          <div className="inline-flex">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              In stock
            </span>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-[var(--secondary)] hover:bg-gray-300 font-medium"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="px-4 py-2 w-12 text-center font-medium bg-white border-x border-gray-300">
                {qty}
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-[var(--secondary)] hover:bg-gray-300 font-medium"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {/* Add to Cart Button */}
            <button
              onClick={handleAdd}
              disabled={addItem.isPending}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                addItem.isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[var(--primary)] hover:bg-[var(--secondary)]"
              }`}
            >
              {addItem.isPending ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {/* Compare and Wishlist */}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <button
              type="button"
              onClick={handleCompare}
              disabled={!canAddMoreCompare && !compared}
              className="flex items-center gap-2 hover:text-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                compared
                  ? "Remove from compare"
                  : count >= max
                  ? `Limit ${max}`
                  : "Add to compare"
              }
            >
              <MdCompareArrows className="text-lg" />
              <span className="font-medium">Compare</span>
            </button>

            <button
              type="button"
              title={wished ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => {
                toggleWishlist?.(idNum);
                toast.success(
                  wished ? "Removed from wishlist." : "Added to wishlist."
                );
              }}
              className="flex items-center gap-2 hover:text-[var(--primary)]"
            >
              {wished ? (
                <FaHeart className="text-lg text-red-500" />
              ) : (
                <FiHeart className="text-lg" />
              )}
              <span className="font-medium">Add to wishlist</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div
          role="tablist"
          aria-label="Product information"
          className="flex items-center gap-8 border-b"
        >
          <button
            role="tab"
            aria-selected={activeTab === "description"}
            aria-controls="tab-panel-description"
            onClick={() => setActiveTab("description")}
            className={`py-3 -mb-px text-sm font-medium transition ${
              activeTab === "description"
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-gray-500 hover:text-[var(--primary)]"
            }`}
          >
            Description
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "additional"}
            aria-controls="tab-panel-additional"
            onClick={() => setActiveTab("additional")}
            className={`py-3 -mb-px text-sm font-medium transition ${
              activeTab === "additional"
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-gray-500 hover:text-[var(--primary)]"
            }`}
          >
            Additional Information
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "reviews"}
            aria-controls="tab-panel-reviews"
            onClick={() => setActiveTab("reviews")}
            className={`py-3 -mb-px text-sm font-medium transition ${
              activeTab === "reviews"
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-gray-500 hover:text-[var(--primary)]"
            }`}
          >
            Reviews
          </button>
        </div>

        <div className="py-6 text-gray-700 leading-relaxed">
          {activeTab === "description" && (
            <div id="tab-panel-description" role="tabpanel">
              {renderRichText(
                product.description || product.short_description || ""
              )}
            </div>
          )}

          {activeTab === "additional" && (
            <div id="tab-panel-additional" role="tabpanel">
              {pairs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">
                    No additional information available.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-2 gap-6 p-8">
                    {pairs.flat().map((pair, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide flex-shrink-0">
                          {pair.label}
                        </div>
                        <div className="text-sm text-gray-800 font-semibold text-right flex-shrink-0">
                          {pair.value ?? "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div id="tab-panel-reviews" role="tabpanel">
              <ProductReviews
                productId={Number(product.id)}
                summary={product.reviews}
                accessToken={accessToken || null}
                autoOpenForm={
                  new URLSearchParams(location.search).get("openReviewForm") ===
                  "1"
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl lg:text-2xl font-semibold text-[var(--primary)]">
            Related products
          </h2>
          {related?.length > 0 && (
            <span className="text-sm text-gray-500">
              {related.length} items
            </span>
          )}
        </div>

        {relatedLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-gray-100 animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        )}

        {!relatedLoading && relatedError && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200">
            Failed to load related products: {relatedError}
          </div>
        )}

        {!relatedLoading && !relatedError && related?.length === 0 && (
          <p className="text-gray-500">No related products.</p>
        )}

        {!relatedLoading && !relatedError && related?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
