// src/components/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCartMutations } from "../api/hooks";

const API_V1 = "/api/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PRODUCT_CACHE = new Map();

export default function ProductDetails() {
  const { id } = useParams();
  const { addItem } = useCartMutations();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  // load with simple cache
  useEffect(() => {
    let ignore = false;
    (async () => {
      setError(null);
      const cached = PRODUCT_CACHE.get(id);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setProduct(cached.data);
        return;
      }
      const res = await fetch(`${API_V1}/products/${id}`);
      if (!res.ok) {
        setError(`Load failed: ${res.status}`);
        return;
      }
      const json = await res.json();
      if (!json?.data) {
        setError("Not found");
        return;
      }
      if (ignore) return;
      PRODUCT_CACHE.set(id, { data: json.data, ts: Date.now() });
      setProduct(json.data);
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  const onAdd = () => {
    setBusy(true);
    addItem.mutate(
      { productId: product.id, quantity: qty },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        },
        onError: () => alert("Failed to add to cart"),
        onSettled: () => setBusy(false),
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <img
          src={
            product.base_image?.original_image_url ||
            product.base_image?.medium_image_url ||
            "https://via.placeholder.com/600x400"
          }
          alt={product.name}
          className="w-full lg:w-1/2 object-contain bg-gray-100 rounded"
        />

        <div className="w-full lg:w-1/2 space-y-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div
            className="text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
          <div className="text-xl font-bold text-indigo-600">
            {product.formatted_price}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded">
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

            <button
              onClick={onAdd}
              disabled={busy || addItem.isLoading}
              className="relative bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {busy || addItem.isLoading ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {added && (
            <div className="text-green-600 text-sm mt-2">Added to cart!</div>
          )}
        </div>
      </div>
    </div>
  );
}
