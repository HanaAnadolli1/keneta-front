// src/pages/ProductDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

const API_V1 = "/api/v1"; // your catalog endpoint
const API_CART = "/api"; // your cart endpoint
const CSRF_ROUTE = "/sanctum/csrf-cookie"; // Laravel Sanctum CSRF cookie route
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_STORE = new Map(); // id → { data, ts }

// safe JSON parse helper
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// pull the token value out of the XSRF-TOKEN cookie
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  // ensure we only hit the CSRF endpoint once per session
  const csrfReady = useRef(false);
  const ensureCsrfCookie = async () => {
    if (!csrfReady.current) {
      await fetch(`${API_CART}${CSRF_ROUTE}`, { credentials: "include" });
      csrfReady.current = true;
    }
  };

  // load + cache product details
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
        setError(`Failed to load product (status ${res.status})`);
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

  // click handler for “Add to Cart”
  const addToCart = async () => {
    if (!product || qty < 1) return;

    setBusy(true);
    setAdded(false);

    try {
      // 1) get a fresh XSRF cookie
      await ensureCsrfCookie();

      // 2) read the token out of the cookie
      const token = getCsrfToken();

      // 3) POST to the /checkout/cart endpoint
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

      // parse JSON so we can read any “message” field
      const json = await safeJson(res);

      if (!res.ok) {
        // show the server’s message (e.g. “CSRF token mismatch”)
        throw new Error(json?.message || `Status ${res.status}`);
      }

      // success flash
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      console.error("Add-to-cart failed:", err);
      alert(`Failed to add to cart: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // render errors / loading
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  // main UI
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
            {/* Quantity */}
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

            {/* Add to cart */}
            <button
              onClick={addToCart}
              disabled={busy}
              className="relative bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {/* feedback */}
          {busy && !added && (
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
