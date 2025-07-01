// src/pages/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ensureCsrfCookie, getCsrfToken } from "../utils/csrf";
import { API_V1, API_CART } from "../api/config";

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_STORE = new Map();

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function ProductDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  // 1) generate our fake CSRF token once on mount
  useEffect(() => {
    ensureCsrfCookie();
  }, []);

  // 2) load + cache product detail
  useEffect(() => {
    let ignore = false;

    (async () => {
      setError(null);

      const cached = CACHE_STORE.get(id);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setProduct(cached.data);
        return;
      }

      const res = await fetch(`${API_V1}/products/${id}`);
      if (!res.ok) {
        setError(`Load failed (status ${res.status})`);
        return;
      }
      const json = await safeJson(res);
      if (!json?.data) {
        setError("Product not found");
        return;
      }
      if (!ignore) {
        setProduct(json.data);
        CACHE_STORE.set(id, { data: json.data, ts: Date.now() });
      }
    })();

    return () => {
      ignore = true;
    };
  }, [id]);

  // 3) add-to-cart + invalidate cart query
  const addToCart = async () => {
    if (!product || qty < 1) return;
    setBusy(true);
    setAdded(false);

    try {
      const token = getCsrfToken();
      const res = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: qty,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(json?.message || `Status ${res.status}`);
      }

      // 🎉 Tell React-Query to refetch the cart
      queryClient.invalidateQueries(["cart"]);

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      alert(`Failed to add to cart: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // render error or loading states
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  // main UI
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Product Image */}
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

        {/* Product Details */}
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
            {/* Quantity Selector */}
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

            {/* Add to Cart Button */}
            <button
              onClick={addToCart}
              disabled={busy}
              className="bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {/* Status Messages */}
          {busy && (
            <div className="text-blue-600 text-sm mt-1">Adding to cart…</div>
          )}
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
