// src/pages/ProductDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { API_V1, API_CART } from "../config";

const CSRF_ROUTE = "/sanctum/csrf-cookie";
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_STORE = new Map();

// helper to parse JSON safely
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getCsrfToken() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  // ensure we only hit CSRF endpoint once
  const csrfReady = useRef(false);
  const ensureCsrf = async () => {
    if (!csrfReady.current) {
      await fetch(`${API_CART}${CSRF_ROUTE}`, {
        credentials: "include",
      });
      csrfReady.current = true;
    }
  };

  // load & cache product
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
        setError(`Failed to load (status ${res.status})`);
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

  // add to cart
  const addToCart = async () => {
    if (!product || qty < 1) return;
    setBusy(true);
    setAdded(false);

    try {
      await ensureCsrf();
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

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error("Add to cart error:", err);
      alert(`Failed to add to cart: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <img
          src={
            product.base_image?.original_image_url ||
            product.base_image?.medium_image_url ||
            "https://via.placeholder.com/600x400?text=No+Image"
          }
          alt={product.name}
          className="w-full lg:w-1/2 object-contain bg-gray-100 rounded-lg"
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

          <div className="flex items-center gap-4 mt-4">
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
            <button
              onClick={addToCart}
              disabled={busy}
              className="bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {busy && (
            <div className="text-blue-600 text-sm mt-1">Adding to cart…</div>
          )}
          {added && (
            <div className="text-green-600 text-sm mt-1">Product added!</div>
          )}
        </div>
      </div>
    </div>
  );
}
