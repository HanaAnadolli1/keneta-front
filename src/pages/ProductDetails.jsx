import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { API_V1, API_CART } from "../api/config";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5‑minute freshness window

/**********************************************************************
 * 🗄️  SIMPLE MEMORY CACHE for individual product records
 *********************************************************************/
const PRODUCT_DETAIL_CACHE = new Map(); // id → { data, ts }

/* helpers ----------------------------------------------------------- */
const safeJson = async (r) => {
  try {
    return await r.json();
  } catch {
    return null;
  }
};
const getCsrf = () => {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

/* component --------------------------------------------------------- */
export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  const sessionReady = useRef(false);

  /* Prefetch cart session so add‑to‑cart feels instant -------------- */
  const ensureSession = async () => {
    if (sessionReady.current) return;
    await fetch(`${API_CART}/checkout/cart`, { credentials: "include" });
    sessionReady.current = true;
  };
  useEffect(() => {
    ensureSession(); // fire-and-forget
  }, []);

  /* load product details (with cache) ------------------------------- */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setError(null);

      const cached = PRODUCT_DETAIL_CACHE.get(id);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setProduct(cached.data);
        return;
      }

      const r = await fetch(`${API_V1}/products/${id}`);
      if (!r.ok) {
        setError(`Failed to load (status ${r.status})`);
        return;
      }

      const j = await safeJson(r);
      if (!j?.data) {
        setError("Product not found");
        return;
      }

      if (ignore) return;
      setProduct(j.data);
      PRODUCT_DETAIL_CACHE.set(id, { data: j.data, ts: Date.now() });
    })();

    return () => {
      ignore = true;
    };
  }, [id]);

  /* add to cart (optimistic) --------------------------------------- */
  const addToCart = async () => {
    if (!product || qty < 1) return;

    setBusy(true);
    setAdded(false);

    try {
      // Ensure Laravel sets guest session
      await fetch(`${API_CART}/checkout/cart`, {
        credentials: "include",
      });

      // Correct route: POST to /api/checkout/cart with payload
      const r = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include", // Needed to send/receive session cookie
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: qty,
        }),
      });

      if (!r.ok) {
        const errJson = await r.json().catch(() => null);
        const msg = errJson?.message || `status ${r.status}`;
        throw new Error(msg);
      }

      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      console.error("Add‑to‑cart failed", err);
      alert("Failed to add to cart: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  /* guard states ---------------------------------------------------- */
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  /* render ---------------------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* image */}
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

        {/* details */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h1 className="text-2xl font-semibold text-[#132232]">
            {product.name}
          </h1>
          <div
            className="text-[#152a41]"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
          <div className="text-xl font-bold text-[#1a3c5c]">
            {product.formatted_price}
          </div>

          <div className="flex items-center gap-4 mt-4">
            {/* quantity chooser */}
            <div className="flex items-center border border-[#1d446b] rounded select-none">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-[#132232] hover:text-[#1a3c5c]"
              >
                −
              </button>
              <div className="px-4 py-1 w-10 text-center text-[#132232]">
                {qty}
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-1 text-[#132232] hover:text-[#1a3c5c]"
              >
                +
              </button>
            </div>

            {/* add-to-cart */}
            <div className="flex flex-col gap-1 items-center min-w-[160px]">
              <button
                onClick={addToCart}
                disabled={busy}
                className="relative bg-[#1a3c5c] text-white px-6 py-2 rounded disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to Cart"}
                {busy && (
                  <svg
                    className="animate-spin h-5 w-5 text-white absolute inset-y-0 right-3 my-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
              </button>

              {/* status messages */}
              {busy && !added && (
                <div className="text-[#1d446b] text-sm mt-1">
                  Adding to cart…
                </div>
              )}
              {added && (
                <div className="text-[#1e456c] text-sm mt-1 transition-opacity duration-300">
                  Product added to cart!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
