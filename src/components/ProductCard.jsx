import React, { memo } from "react";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { MdCompareArrows } from "react-icons/md";
import { useCompare } from "../context/CompareContext";
import useSaleFlag from "../hooks/useSaleFlag";
import { useToast } from "../context/ToastContext";

function ProductCard({
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

  // sale flag uses PDP dates (frontend-only)
  const { saleActive, pct, hasStrike, priceLabel, strikeLabel } = useSaleFlag(
    product,
    { apiBase: "https://admin.keneta-ks.com/api/v2" }
  );

  return (
    <article className="group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 hover:shadow-lg transition overflow-hidden relative flex flex-col h-full">
      {/* Overlay actions */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist?.(idNum);
            toast.success(
              isWishlisted ? "Removed from wishlist." : "Added to wishlist."
            );
          }}
          className="h-9 w-9 rounded-full grid place-items-center bg-white/95 backdrop-blur ring-1 ring-black/5 shadow-sm transition hover:ring-red-200"
        >
          {isWishlisted ? (
            <FaHeart className="text-xl text-red-500" />
          ) : (
            <FiHeart className="text-xl text-gray-500 group-hover:text-red-500" />
          )}
        </button>

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
          className={`h-9 w-9 rounded-full grid place-items-center bg-white/95 backdrop-blur ring-1 shadow-sm transition
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

      {/* Clickable content block (fills remaining height) */}
      <Link
        to={`/products/${product?.url_key}`}
        onMouseEnter={() => prefetch && prefetch(idNum)}
        className="flex-1 flex flex-col"
      >
        {/* Fixed-height image area */}
        <div className="relative bg-gray-50">
          {saleActive && pct ? (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
              −{pct}%
            </span>
          ) : null}

          <img
            src={
              product?.base_image?.large_image_url ||
              product?.base_image?.medium_image_url ||
              "https://via.placeholder.com/480x360"
            }
            alt={product?.name}
            className="w-full h-48 sm:h-56 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>

        {/* Text area with fixed row heights */}
        <div className="p-4 flex flex-col flex-1">
          <h2 className="text-sm sm:text-base font-semibold leading-snug text-gray-900 truncate">
            {product?.name}
          </h2>

          {/* Price row: fixed minimum height */}
          <div className="mt-2 flex items-baseline gap-2 min-h-[1.5rem]">
            <span className="text-[var(--secondary)] font-bold">
              {priceLabel}
            </span>
            {hasStrike && strikeLabel && (
              <span className="text-sm text-gray-400 line-through">
                {strikeLabel}
              </span>
            )}
          </div>

          {/* Status row: fixed min height so cards line up */}
          <div className="mt-1 text-xs font-medium min-h-[1.25rem]">
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

          <div className="mt-auto" />
        </div>
      </Link>

      {/* Bottom action row always aligned */}
      <div className="px-4 pb-4">
        {inStock ? (
          <button
            onClick={() => handleAddToCart?.(idNum)}
            disabled={busy}
            className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition
              ${
                busy
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-white hover:text-[var(--primary)] hover:border-[var(--primary)]"
              }`}
          >
            {busy ? "Adding…" : "Add to Cart"}
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-xl px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            Out of stock
          </button>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
