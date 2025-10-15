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
import { useProductBreadcrumbs } from "../hooks/useBreadcrumbs";
import useSaleFlag from "../hooks/useSaleFlag";
import { buildApiHeaders } from "../utils/apiHelpers";

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

/* ---------------- component ---------------- */
export default function ProductDetails() {
  const { url_key } = useParams();
  const location = useLocation();
  const { addItem } = useCartMutations();

  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addWithFlash, remove, isCompared, max, count } = useCompare();
  const toast = useToast();

  const galleryRef = useRef();
  const imageRef = useRef();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // base product
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // zoom states
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showImageModal, setShowImageModal] = useState(false);

  // Use sale flag hook for proper price display
  const { saleActive, hasStrike, priceLabel, strikeLabel } = useSaleFlag(
    product,
    { apiBase: "https://admin.keneta-ks.com/api/v2" }
  );

  const [activeTab, setActiveTab] = useState("description");

  // related
  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(null);

  // breadcrumbs - using API
  const {
    breadcrumbs: apiBreadcrumbs,
    loading: breadcrumbsLoading,
    error: breadcrumbsError,
  } = useProductBreadcrumbs(url_key);

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
        // First, get the product ID from the list endpoint
        const listRes = await fetch(
          `${API_V1}/products?url_key=${encodeURIComponent(url_key)}`
        );
        if (!listRes.ok) throw new Error(`Status ${listRes.status}`);
        const listJson = await listRes.json();
        const list = Array.isArray(listJson?.data) ? listJson.data : [];
        if (!list.length) throw new Error("Product not found");

        const productId = list[0].id;

        // Then fetch the detailed product data with special pricing
        const detailRes = await fetch(`${API_V1}/products/${productId}`, {
          headers: buildApiHeaders(),
        });
        if (!detailRes.ok)
          throw new Error(`Detail fetch failed: ${detailRes.status}`);
        const detailJson = await detailRes.json();

        if (!ignore) setProduct(detailJson.data);
      } catch (e) {
        if (!ignore) setError(e.message);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [url_key]);

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

  /* --------- auto-open reviews tab --------- */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const hashWantsReviews = location.hash?.toLowerCase() === "#reviews";
    if (tab === "reviews" || hashWantsReviews) setActiveTab("reviews");
  }, [location.search, location.hash]);

  /* --------- modal slider navigation callbacks --------- */
  const goToPrevImage = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setSelectedIndex((prev) => {
      if (prev <= 0) return prev;
      const newIndex = prev - 1;
      galleryRef.current?.slideToIndex(newIndex);
      return newIndex;
    });
  }, []);

  const goToNextImage = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setSelectedIndex((prev) => {
      const newIndex = prev + 1;
      galleryRef.current?.slideToIndex(newIndex);
      return newIndex;
    });
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        goToNextImage();
      } else {
        goToPrevImage();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [goToPrevImage, goToNextImage]);

  /* --------- keyboard navigation --------- */
  useEffect(() => {
    if (!showImageModal) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeImageModal();
      if (e.key === "ArrowLeft") goToPrevImage(e);
      if (e.key === "ArrowRight") goToNextImage(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImageModal, goToPrevImage, goToNextImage]);

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
  // Use API breadcrumbs if available, fallback to smart breadcrumbs from product data
  const pageCrumbs = useMemo(() => {
    if (apiBreadcrumbs.length > 0) {
      // Add Home at the beginning and product name at the end
      return [
        { label: "Home", path: "/" },
        ...apiBreadcrumbs,
        { label: product?.name || "Product" },
      ];
    }

    // Fallback: build breadcrumbs from product data
    const base = [{ label: "Home", path: "/" }];

    // Try to get category info from product
    if (
      product?.categories &&
      Array.isArray(product.categories) &&
      product.categories.length > 0
    ) {
      const category = product.categories[0]; // Use first category
      const categoryBreadcrumb = {
        label: category.name || category.label || "Category",
        path: `/products?category=${encodeURIComponent(
          category.slug || category.name || ""
        )}`,
      };
      return [
        ...base,
        categoryBreadcrumb,
        { label: product?.name || "Product" },
      ];
    }

    // Fallback: simple breadcrumbs
    return [
      ...base,
      { label: "Products", path: "/products" },
      { label: product?.name || "Product" },
    ];
  }, [apiBreadcrumbs, product]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Breadcrumbs
          items={[{ label: "Home", path: "/" }, { label: "Product" }]}
        />
        <div className="text-red-600">{error}</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Breadcrumbs
          items={[{ label: "Home", path: "/" }, { label: "Product" }]}
        />
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

  // Check stock status - same logic as ProductCard
  const inStock = product?.in_stock ?? (product?.quantity ?? 0) > 0;

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
    if (!product || !product.id || qty < 1) return;

    // Ensure productId is a number
    const productId = Number(product.id);
    if (!productId || isNaN(productId)) {
      toast.error("Invalid product ID");
      return;
    }

    const tid = toast.info("Adding to cart…", { duration: 0 });
    add.mutate(
      { productId, quantity: qty },
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

  // Zoom handlers for desktop
  const handleMouseMove = (e) => {
    if (!imageRef.current || isMobile) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (!isMobile) setIsZooming(true);
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsZooming(false);
  };

  // Image modal handlers (works on all screen sizes)
  const handleImageClick = () => {
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  /* ---------------- render ---------------- */
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumbs include the full category path */}
      <Breadcrumbs items={pageCrumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* LEFT */}
        <div className="flex gap-4 relative">
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

          <div className="flex-1 relative">
            <div
              ref={imageRef}
              className="rounded-2xl ring-1 ring-black/5 overflow-hidden cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleImageClick}
            >
              <ImageGallery
                ref={galleryRef}
                items={galleryImages}
                startIndex={selectedIndex}
                showThumbnails={false}
                showPlayButton={false}
                showFullscreenButton={false}
                showNav={false}
                showBullets={isMobile}
                disableSwipe={isMobile}
                additionalClass="custom-gallery"
              />
            </div>

            {/* Desktop Zoom View - Shows on the side */}
            {!isMobile && isZooming && galleryImages[selectedIndex] && (
              <div className="absolute left-full ml-4 top-0 w-96 h-96 rounded-2xl ring-1 ring-black/5 overflow-hidden bg-white shadow-2xl z-10 hidden xl:block">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${galleryImages[selectedIndex].original})`,
                    backgroundSize: "200%",
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            )}
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
          <div className="space-y-2">
            <div
              className={`text-3xl font-bold ${
                saleActive
                  ? "text-[var(--secondary)]"
                  : "text-[var(--secondary)]"
              }`}
            >
              {priceLabel}
            </div>
            {hasStrike && strikeLabel && (
              <div className="text-lg text-[var(--secondary)] line-through font-medium">
                {strikeLabel}
              </div>
            )}
            {/* VAT Text */}
            <div className="text-xs text-gray-400">
              Çmimet përfshijnë TVSH-në.
            </div>
          </div>

          {/* Availability */}
          <div className="inline-flex">
            {inStock ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm font-medium">
                ✓ In Stock
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-sm font-medium">
                ✗ Out of Stock
              </span>
            )}
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
              disabled={addItem.isPending || !inStock}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                addItem.isPending || !inStock
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[var(--primary)] hover:bg-[var(--secondary)]"
              }`}
            >
              {addItem.isPending
                ? "Adding…"
                : !inStock
                ? "Out of Stock"
                : "Add to Cart"}
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
              onClick={async () => {
                try {
                  await toggleWishlist?.(idNum);
                  toast.success(
                    wished ? "Removed from wishlist." : "Added to wishlist."
                  );
                } catch (error) {
                  toast.error(
                    error?.message ||
                      "Failed to update wishlist. Please try again."
                  );
                }
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

      {/* Image Modal - Works on all screen sizes */}
      {showImageModal && galleryImages[selectedIndex] && (
        <div
          className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-[var(--secondary)] text-4xl font-bold w-14 h-14 flex items-center justify-center rounded-full hover:bg-gray-100 transition z-[10000]"
            aria-label="Close"
          >
            ×
          </button>

          {/* Left Arrow - Only show if multiple images */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex =
                  selectedIndex > 0
                    ? selectedIndex - 1
                    : galleryImages.length - 1;
                setSelectedIndex(newIndex);
                galleryRef.current?.slideToIndex(newIndex);
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--secondary)] text-5xl font-bold w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100 transition z-[10000]"
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <div
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={galleryImages[selectedIndex].original}
              alt={`${product.name} - Full view`}
              className="max-w-full max-h-[95vh] object-contain select-none"
            />

            {/* Image counter */}
            {galleryImages.length > 1 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                {selectedIndex + 1} / {galleryImages.length}
              </div>
            )}

            {/* Navigation bullets for modal */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(idx);
                      galleryRef.current?.slideToIndex(idx);
                    }}
                    className={`w-3 h-3 rounded-full transition ${
                      selectedIndex === idx
                        ? "bg-[var(--secondary)]"
                        : "bg-gray-400"
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Arrow - Only show if multiple images */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex =
                  selectedIndex < galleryImages.length - 1
                    ? selectedIndex + 1
                    : 0;
                setSelectedIndex(newIndex);
                galleryRef.current?.slideToIndex(newIndex);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--secondary)] text-5xl font-bold w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100 transition z-[10000]"
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
