// src/pages/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCartMutations } from "../api/hooks";

export default function ProductDetails() {
  const { id } = useParams();
  const { addItem } = useCartMutations();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  // load product once
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/products/${id}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (!json?.data) throw new Error("Product not found");
        if (!ignore) setProduct(json.data);
      } catch (e) {
        if (!ignore) setError(e.message);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleAdd = async () => {
    if (!product || qty < 1) return;
    setBusy(true);
    try {
      await addItem.mutateAsync({ productId: product.id, quantity: qty });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert("Failed to add to cart: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Image */}
        <div className="w-full lg:w-1/2">
          <img
            src={
              product.base_image?.original_image_url ||
              product.base_image?.medium_image_url ||
              "https://via.placeholder.com/600x400?text=No+Image"
            }
            alt={product.name}
            className="w-full h-auto rounded-lg object-contain bg-gray-100"
          />
        </div>

        {/* Details */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div
            className="text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
          <div className="text-xl font-bold text-indigo-600">
            {product.formatted_price}
          </div>

          <div className="flex items-center gap-4 mt-4">
            {/* Qty selector */}
            <div className="flex items-center border rounded select-none">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1"
              >
                −
              </button>
              <div className="px-4 py-1 w-10 text-center">{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-1"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAdd}
              disabled={busy}
              className="bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {added && (
            <div className="text-green-600 text-sm mt-1">
              Product added to cart!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
