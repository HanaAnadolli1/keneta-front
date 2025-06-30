// src/components/ProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../index.css";
import { useCartMutations } from "../api/hooks"; // adjust path as needed

/**
 * ProductCard: displays a product with slide-up details on hover
 */
export default function ProductCard({ product, prefetch }) {
  const { addItem } = useCartMutations();

  const handleAdd = () => {
    addItem.mutate({
      productId: product.id,
      quantity: 1,
    });
  };

  return (
    <article
      className="group relative bg-white rounded-lg shadow overflow-hidden"
      onMouseEnter={() => prefetch(product.id)}
    >
      {/* image */}
      <Link to={`/products/${product.id}`} className="block">
        <img
          src={
            product.base_image?.medium_image_url ||
            "https://via.placeholder.com/300x200?text=No+Image"
          }
          alt={product.name}
          className="w-full h-48 object-cover bg-gray-100"
        />
      </Link>

      {/* slide-up details */}
      <div className="absolute left-0 right-0 bottom-0 bg-white p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-[#132232] font-semibold text-lg">
          {product.formatted_price}
        </p>
        <button
          onClick={handleAdd}
          disabled={addItem.isLoading}
          className={
            "mt-2 w-full border border-[#1a3c5c] text-[#1a3c5c] py-2 rounded transition " +
            (addItem.isLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#1a3c5c] hover:text-white")
          }
        >
          {addItem.isLoading ? "Adding…" : "Add To Cart"}
        </button>
        {addItem.isError && (
          <p className="text-red-500 text-sm mt-1">Error adding to cart</p>
        )}
      </div>

      {/* static info */}
      <div className="p-4">
        <h2 className="text-base font-semibold line-clamp-2 text-[#132232]">
          {product.name}
        </h2>
      </div>
    </article>
  );
}
