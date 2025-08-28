import React, { memo } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiGrid, FiList } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { MdCompareArrows } from "react-icons/md";
import { useCompare } from "../context/CompareContext";
import useSaleFlag from "../hooks/useSaleFlag";
import { useToast } from "../context/ToastContext";

function ProductListItem({
  product,
  isWishlisted = false,
  toggleWishlist,
  handleAddToCart,
  busy = false,
  prefetch,
}) {
  const idNum = Number(product?.id);
  const inStock = product?.in_stock ?? (product?.quantity ?? 0) > 0;

  const toast = useToast();
  const { addWithFlash, remove, isCompared, max, count } = useCompare();
  const compared = isCompared(idNum);
  const canAddMore = compared || count < max;

  const { saleActive, pct, hasStrike, priceLabel, strikeLabel } = useSaleFlag(
    product,
    { apiBase: "https://keneta.laratest-app.com/api/v1" }
  );

  const imgSrc =
    product?.base_image?.large_image_url ||
    product?.base_image?.medium_image_url ||
    "https://via.placeholder.com/480x360";

  return (
    <article className="group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 hover:shadow-lg transition overflow-hidden">
      <div className="flex">
        {/* Image */}
        <Link
          to={`/products/${product?.url_key}`}
          onMouseEnter={() => prefetch && prefetch(idNum)}
          className="relative shrink-0 bg-gray-50 w-[260px] max-w-[45%] flex items-center justify-center"
        >
          {saleActive && pct ? (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
              −{pct}%
            </span>
          ) : null}

          <img
            src={imgSrc}
            alt={product?.name}
            className="w-full h-48 object-contain"
            loading="lazy"
          />
        </Link>

        {/* Right content */}
        <div className="flex-1 p-5">
          {/* Top line: title + quick actions */}
          <div className="flex items-start gap-3">
            <Link
              to={`/products/${product?.url_key}`}
              onMouseEnter={() => prefetch && prefetch(idNum)}
              className="text-lg font-semibold text-gray-900 hover:text-[var(--primary)] flex-1"
              title={product?.name}
            >
              {product?.name}
            </Link>

            <div className="flex items-center gap-2">
              {/* Wishlist */}
              <button
                type="button"
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                title={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist?.(idNum);
                  toast.success(
                    isWishlisted ? "Removed from wishlist." : "Added to wishlist."
                  );
                }}
                className="h-9 w-9 rounded-full grid place-items-center bg-white/95 backdrop-blur ring-1 ring-black/5 shadow-sm hover:ring-red-200"
              >
                {isWishlisted ? (
                  <FaHeart className="text-xl text-red-500" />
                ) : (
                  <FiHeart className="text-xl text-gray-500 group-hover:text-red-500" />
                )}
              </button>

              {/* Compare */}
              <button
                type="button"
                aria-label={compared ? "Remove from compare" : "Add to compare"}
                title={
                  compared
                    ? "Remove from compare"
                    : count >= max
                    ? `Limit ${max}`
                    : "Add to compare"
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (compared) {
                    remove(idNum);
                    toast.info("Removed from compare.");
                  } else if (!canAddMore) {
                    toast.warn(`Compare limit reached (max ${max}).`);
                  } else {
                    addWithFlash(product);
                    toast.success("Item added to compare list.");
                  }
                }}
                disabled={!canAddMore && !compared}
                className={`h-9 w-9 rounded-full grid place-items-center bg-white/95 backdrop-blur ring-1 shadow-sm
                  ${
                    compared
                      ? "text-emerald-600 ring-emerald-200"
                      : "text-gray-500 hover:text-emerald-600 hover:ring-emerald-200"
                  }
                  ${!canAddMore && !compared ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <MdCompareArrows className="text-xl" />
              </button>
            </div>
          </div>

          {/* Price + strike */}
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-[var(--secondary)] font-bold text-xl">
              {priceLabel}
            </span>
            {hasStrike && strikeLabel && (
              <span className="text-sm text-gray-400 line-through">
                {strikeLabel}
              </span>
            )}
          </div>

          {/* Optional subtitle / review note placeholder to match your screenshot */}
          <div className="mt-2 text-sm text-gray-500">
            Be the first to review this product
          </div>

          {/* Stock pill + CTA */}
          <div className="mt-4 flex items-center gap-4">
            <div className="text-xs font-medium">
              {inStock ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                  In stock
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-2 py-0.5">
                  Out of stock
                </span>
              )}
            </div>

            <div className="ml-auto">
              {inStock ? (
                <button
                  onClick={() => handleAddToCart?.(idNum)}
                  disabled={busy}
                  className={`rounded-xl px-6 py-2 text-sm font-semibold transition
                    ${
                      busy
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-white hover:text-[var(--primary)]"
                    }`}
                >
                  {busy ? "Adding…" : "Add To Cart"}
                </button>
              ) : (
                <button
                  disabled
                  className="rounded-xl px-6 py-2 text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Out of stock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(ProductListItem);
