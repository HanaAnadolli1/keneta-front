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

// Use the SAME public categories endpoints as Menu.jsx / CategoryNavigator
const API_PUBLIC_V1 = "https://keneta.laratest-app.com/api/v1";

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
  if (looksLikeHtml(raw)) return <div dangerouslySetInnerHTML={{ __html: raw }} />;
  const bullets = renderBulletList(raw);
  if (bullets) return bullets;
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
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

  const breadcrumbsBase = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/products" },
  ];

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
        const endpoint = `https://keneta.laratest-app.com/api/products/${product.id}/related`;
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
    const rows = (j?.data || []).filter((c) => String(c.status) === "1");
    childrenCacheRef.current.set(key, rows);
    return rows;
  }, []);

  // DFS from parent 1 to find full path to slug
  const findPathToSlug = useCallback(
    async (targetSlug) => {
      if (!targetSlug) return [];
      const MAX_DEPTH = 8;
      const stack = [{ parentId: 1, path: [] }];

      while (stack.length) {
        const { parentId, path } = stack.pop();
        const children = await getChildren(parentId);
        for (const child of children) {
          const nextPath = [...path, child];
          if (child.slug === targetSlug) return nextPath;
          if (nextPath.length < MAX_DEPTH) {
            stack.push({ parentId: child.id, path: nextPath });
          }
        }
      }
      return [];
    },
    [getChildren]
  );

  const byId = useMemo(() => {
    const m = new Map();
    for (const c of allCategories) m.set(String(c?.id), c);
    return m;
  }, [allCategories]);

  const pickPrimaryCategory = (cats) => {
    if (!Array.isArray(cats) || cats.length === 0) return null;
    return (
      cats.slice().sort((a, b) => (b?.level ?? 0) - (a?.level ?? 0))[0] ||
      cats[0]
    );
  };

  // Build the category trail without calling a non-existent product-categories endpoint
  useEffect(() => {
    if (!product) return;

    (async () => {
      // 1) Gather possible categories from product (robust across shapes)
      let productCats = [];

      if (Array.isArray(product?.categories) && product.categories.length) {
        productCats = product.categories
          .map((c) =>
            c && typeof c === "object"
              ? {
                  id: c.id ?? c.category_id ?? c?.pivot?.category_id,
                  slug: c.slug,
                  name: c.name,
                  level: c.level,
                }
              : null
          )
          .filter(Boolean);
      } else if (Array.isArray(product?.category_ids)) {
        productCats = product.category_ids
          .map((id) => byId.get(String(id)))
          .filter(Boolean)
          .map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            level: c.level,
          }));
      } else if (product?.category_id) {
        const c = byId.get(String(product.category_id));
        if (c) {
          productCats = [
            { id: c.id, slug: c.slug, name: c.name, level: c.level },
          ];
        }
      } else if (product?.category && typeof product.category === "object") {
        const cid =
          product.category.id ??
          product.category.category_id ??
          product.category?.pivot?.category_id;
        const slug = product.category.slug ?? byId.get(String(cid))?.slug;
        const name =
          product.category.name ?? byId.get(String(cid))?.name ?? slug;
        if (cid || slug) {
          productCats = [{ id: cid, slug, name, level: product.category.level }];
        }
      }

      // 2) LAST RESORT: if page was opened from /products?category=slug, accept it
      const urlCategory =
        new URLSearchParams(location.search).get("category") || null;
      if ((!productCats || productCats.length === 0) && urlCategory) {
        const c = allCategories.find((x) => x.slug === urlCategory);
        if (c) {
          productCats = [
            { id: c.id, slug: c.slug, name: c.name, level: c.level },
          ];
        }
      }

      const primary = pickPrimaryCategory(productCats);
      const slug =
        primary?.slug ||
        (primary?.id ? byId.get(String(primary.id))?.slug : null);

      if (!slug) {
        setCategoryTrail([]); // no category info available
        return;
      }

      // 3) Walk the same tree as your menu to get the full chain
      const path = await findPathToSlug(slug); // [{id, slug, name}, …leaf]
      if (path.length) {
        const items = path.map((n, i) =>
          i === path.length - 1
            ? { label: n.name } // current category (unlinked)
            : {
                label: n.name,
                path: `/products?category=${encodeURIComponent(n.slug)}`,
              }
        );
        setCategoryTrail(items);
      } else {
        setCategoryTrail([{ label: primary?.name || slug }]);
      }
    })();
  }, [product, allCategories, byId, findPathToSlug, location.search]);

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
    product?.currency_options?.symbol || (currencyMatch ? currencyMatch[0] : "€");
  const totalLabel = `${currencySymbol}${(unitPrice * qty).toFixed(2)}`;

  const onThumbnailClick = (index) => {
    setSelectedIndex(index);
    galleryRef.current?.slideToIndex(index);
  };

  const { addItem: add } = { addItem };
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
      {/* Breadcrumbs include the full category path (no 404 calls) */}
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
            <div className="bg-gray-50 rounded-2xl ring-1 ring-black/5 overflow-hidden">
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
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold leading-tight text-gray-900">
              {product.name}
            </h1>
            <button
              type="button"
              title={wished ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => {
                toggleWishlist?.(idNum);
                toast.success(
                  wished ? "Removed from wishlist." : "Added to wishlist."
                );
              }}
              className="h-10 w-10 grid place-items-center ring-1 ring-black/0"
            >
              {wished ? (
                <FaHeart className="text-lg text-red-500" />
              ) : (
                <FiHeart className="text-lg text-gray-600" />
              )}
            </button>
          </div>

          <div className="text-2xl font-bold text-black">{unitPriceLabel}</div>

          {/* Short description (supports bullets & HTML) */}
          <div className="text-gray-500">
            {(() => {
              const raw = product?.short_description || "";
              if (!raw) return null;
              if (looksLikeHtml(raw)) return <div dangerouslySetInnerHTML={{ __html: raw }} />;
              return renderBulletList(raw) || <p>{raw}</p>;
            })()}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-700">
            <span className="font-semibold">Total Amount</span>
            <span className="font-semibold">{totalLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl ring-1 ring-gray-300 overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-lg hover:bg-gray-50"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="px-5 py-2 w-12 text-center font-medium">
                {qty}
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-lg hover:bg-gray-50"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={addItem.isPending}
              className={`h-11 px-6 rounded-xl text-sm font-semibold transition ring-1 ${
                addItem.isPending
                  ? "bg-gray-100 text-gray-500 ring-gray-200 cursor-not-allowed"
                  : "bg-indigo-600 text-white ring-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {addItem.isPending ? "Adding…" : "Add To Cart"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCompare}
            disabled={!canAddMoreCompare && !compared}
            className="group inline-flex items-center gap-2 text-sm text-gray-800 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              compared
                ? "Remove from compare"
                : count >= max
                ? `Limit ${max}`
                : "Add to compare"
            }
          >
            <span
              className={`h-8 w-8 rounded-full grid place-items-center ring-1 shadow-sm ${
                compared
                  ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                  : "bg-white ring-black/10 text-gray-700 group-hover:text-emerald-700"
              }`}
            >
              <MdCompareArrows className="text-base" />
            </span>
            <span className="font-medium">
              {compared ? "Compared" : "Compare"}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div role="tablist" aria-label="Product information" className="flex items-center gap-8 border-b">
          <button
            role="tab"
            aria-selected={activeTab === "description"}
            aria-controls="tab-panel-description"
            onClick={() => setActiveTab("description")}
            className={`py-3 -mb-px text-sm font-medium transition ${
              activeTab === "description" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-800"
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
              activeTab === "additional" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-800"
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
              activeTab === "reviews" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Reviews
          </button>
        </div>

        <div className="py-6 text-gray-700 leading-relaxed">
          {activeTab === "description" && (
            <div id="tab-panel-description" role="tabpanel">
              {renderRichText(product.description || product.short_description || "")}
            </div>
          )}

          {activeTab === "additional" && (
            <div id="tab-panel-additional" role="tabpanel">
              {pairs.length === 0 ? (
                <p className="text-gray-500">No additional information.</p>
              ) : (
                <div className="w-full">
                  {pairs.map((row, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-[max-content,1fr] lg:grid-cols-[max-content,1fr,max-content,1fr]
                        gap-x-6 gap-y-2 px-4 py-3 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                    >
                      {row.map((pair) => (
                        <React.Fragment key={pair.label}>
                          <div className="text-sm text-gray-500">{pair.label}</div>
                          <div className="text-sm text-gray-800">{pair.value ?? "—"}</div>
                        </React.Fragment>
                      ))}
                      {row.length === 1 && (
                        <>
                          <div className="hidden lg:block" />
                          <div className="hidden lg:block" />
                        </>
                      )}
                    </div>
                  ))}
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
                  new URLSearchParams(location.search).get("openReviewForm") === "1"
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">
            Related products
          </h2>
          {related?.length > 0 && (
            <span className="text-sm text-gray-500">{related.length} items</span>
          )}
        </div>

        {relatedLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" aria-hidden />
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
