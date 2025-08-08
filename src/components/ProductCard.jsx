// src/components/ProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

export default function ProductCard({
  product,
  isWishlisted,
  toggleWishlist,
  handleAddToCart,
  busyId,
  addedId,
  prefetch,
}) {
  return (
    <article className="bg-white rounded-lg shadow flex flex-col relative">
      {/* Wishlist Icon */}
      <div className="absolute top-2 right-2 z-10">
        <button onClick={() => toggleWishlist(product.id)}>
          {isWishlisted ? (
            <FaHeart className="text-2xl text-red-500" />
          ) : (
            <FiHeart className="text-2xl text-gray-400 hover:text-red-500" />
          )}
        </button>
      </div>

      {/* Product Link + Image */}
      <Link
        to={`/products/${product.url_key}`}
        onMouseEnter={() => prefetch(product.id)}
        className="block flex-1"
      >
        <img
          src={
            product.base_image?.medium_image_url ||
            "https://via.placeholder.com/300x200"
          }
          alt={product.name}
          className="w-full h-48 object-contain bg-gray-100"
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
        {product.quantity > 0 ? (
          <>
            <button
              onClick={() => handleAddToCart(product.id)}
              disabled={busyId === product.id}
              className={`px-3 py-1 rounded border ${
                busyId === product.id
                  ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-500"
                  : "border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
              }`}
            >
              {busyId === product.id ? "Adding…" : "Add to Cart"}
            </button>
            {addedId === product.id && (
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
