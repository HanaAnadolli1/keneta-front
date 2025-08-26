// src/pages/ProductDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

// helper: chunk rows into groups of `size`
const chunkPairs = (rows, size = 2) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

/** ------------- Description helpers ------------- **/

// Detects if the string already contains HTML tags
const looksLikeHtml = (s = "") => /<[^>]+>/.test(s);

// Convert a "•item •item ..." or "• item\n• item" style string into a React <ul>
const renderBulletList = (text = "") => {
  if (!text) return null;

  // Normalize multiple spaces and convert common separators into single spaces
  const normalized = text.replace(/\s+/g, " ").trim();

  // Split by bullet "•" (U+2022). We allow an optional space after it.
  // We also handle cases where the string starts with a bullet or has bullets mid-string.
  const parts = normalized
    .split(/(?:^|[\s])•\s*/g)
    .map((t) => t.trim())
    .filter(Boolean);

  // If we didn't really split into multiple items, it's not a bullet list
  if (parts.length <= 1) return null;

  return (
    <ul className="list-disc pl-5 space-y-1">
      {parts.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
};

// General renderer: prefers HTML, else bullets, else newline list, else paragraph
const renderRichText = (raw = "") => {
  if (!raw) {
    return <p className="text-gray-500">No description.</p>;
  }

  // 1) If backend already provides HTML, trust it (your content source controls safety)
  if (looksLikeHtml(raw)) {
    return <div dangerouslySetInnerHTML={{ __html: raw }} />;
  }

  // 2) If it contains "•" bullets, render them as <ul>
  const bullets = renderBulletList(raw);
  if (bullets) return bullets;

  // 3) Fallback: split on newlines into a list (if there are several lines)
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

  // 4) Final fallback: simple paragraph
  return <p>{raw}</p>;
};

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
  const [activeTab, setActiveTab] = useState("description"); // description | additional | reviews

  // read customer token (adapt to your auth)
  const accessToken =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token");

  // Open the Reviews tab automatically if URL requests it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const hashWantsReviews = location.hash?.toLowerCase() === "#reviews";
    if (tab === "reviews" || hashWantsReviews) {
      setActiveTab("reviews");
    }
  }, [location.search, location.hash]);

  // hooks above returns
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${API_V1}/products?url_key=${url_key}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json?.data) || json.data.length === 0) {
          throw new Error("Product not found");
        }
        if (!ignore) setProduct(json.data[0]);
      } catch (e) {
        if (!ignore) setError(e.message);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [url_key]);

  // If redirected back with ?openReviewForm=1, pass the flag to ProductReviews
  const openReviewForm =
    new URLSearchParams(location.search).get("openReviewForm") === "1";

  // extra rows
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

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  // computed
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
  const currencySymbol =
    product?.currency_options?.symbol ||
    (product?.formatted_price?.match(/[^\d.,\s-]+/)?.[0] ?? "€");
  const totalLabel = `${currencySymbol}${(unitPrice * qty).toFixed(2)}`;

  const onThumbnailClick = (index) => {
    setSelectedIndex(index);
    galleryRef.current?.slideToIndex(index);
  };

  const reviewsSummary = product?.reviews;

  const { addItem: add } = { addItem }; // alias for clarity
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
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

          {/* Short description (now supports bullets & HTML) */}
          <div className="text-gray-500">
            {(() => {
              const raw = product?.short_description || "";
              if (!raw) return null;
              if (looksLikeHtml(raw)) {
                return <div dangerouslySetInnerHTML={{ __html: raw }} />;
              }
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
              className={`h-11 px-6 rounded-xl text-sm font-semibold transition ring-1
                ${
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
              className={`h-8 w-8 rounded-full grid place-items-center ring-1 shadow-sm
              ${
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
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-800"
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
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-800"
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
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Reviews
          </button>
        </div>

        <div className="py-6 text-gray-700 leading-relaxed">
          {activeTab === "description" && (
            <div id="tab-panel-description" role="tabpanel">
              {/* Renders HTML if present; otherwise turns bullet "•" text into a proper <ul> */}
              {renderRichText(
                product.description || product.short_description || ""
              )}
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
                        gap-x-6 gap-y-2 px-4 py-3 ${
                          idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }`}
                    >
                      {row.map((pair) => (
                        <React.Fragment key={pair.label}>
                          <div className="text-sm text-gray-500">
                            {pair.label}
                          </div>
                          <div className="text-sm text-gray-800">
                            {pair.value ?? "—"}
                          </div>
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
                autoOpenForm={openReviewForm}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
