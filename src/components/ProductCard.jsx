import React, { memo } from "react";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

function ProductCard({
  product,
  isWishlisted = false,
  toggleWishlist,
  handleAddToCart,
  busy = false,
  added = false,
  prefetch,
}) {
  const idNum = Number(product?.id);
  const inStock = (product?.quantity ?? 0) > 0;

  return (
    <article className="bg-white rounded-lg shadow flex flex-col relative">
      {/* Wishlist Icon */}
      <button
        type="button"
        className="absolute top-2 right-2 z-10"
        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist?.(idNum);
        }}
      >
        {isWishlisted ? (
          <FaHeart className="text-2xl text-red-500" />
        ) : (
          <FiHeart className="text-2xl text-gray-400 hover:text-red-500" />
        )}
      </button>

      {/* Product Link + Image */}
      <Link
        to={`/products/${product.url_key}`}
        onMouseEnter={() => prefetch && prefetch(idNum)}
        className="block flex-1"
      >
        <img
          src={
            product.base_image?.medium_image_url ||
            "https://via.placeholder.com/300x200"
          }
          alt={product.name}
          className="w-full h-48 object-contain bg-gray-100"
          loading="lazy"
        />
        <div className="p-4">
          <h2 className="text-base font-semibold mb-1 line-clamp-2">
            {product.name}
          </h2>
          <p className="font-bold text-indigo-600">{product.formatted_price}</p>
        </div>
      </Link>

      {/* Add to Cart */}
      <div className="p-4 border-t flex justify-between items-center">
        {inStock ? (
          <>
            <button
              onClick={() => handleAddToCart?.(idNum)}
              disabled={busy}
              className={`px-3 py-1 rounded border ${
                busy
                  ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-500"
                  : "border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
              }`}
            >
              {busy ? "Adding…" : "Add to Cart"}
            </button>
            {added && (
              <span className="ml-2 text-green-600 text-sm">Added!</span>
            )}
          </>
        ) : (
          <span className="text-sm text-red-500">Out of stock.</span>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
