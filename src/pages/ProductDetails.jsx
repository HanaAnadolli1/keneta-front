import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

const API_V1 = "/api/v1"; // catalog data
const API_CART = "/api"; // cart actions
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
    setAdded(false); // reset previous state

    try {
      await ensureSession();
      const token = getCsrf();

      const r = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ product_id: product.id, quantity: qty }),
      });

      if (!r.ok) throw new Error(`status ${r.status}`);

      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      console.error("Add‑to‑cart failed", err);
      alert("Failed to add to cart.");
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
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div
            className="text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
          <div className="text-xl font-bold text-indigo-600">
            {product.formatted_price}
          </div>

          <div className="flex items-center gap-4 mt-4">
            {/* quantity chooser */}
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

            {/* add‑to‑cart */}
            <div className="flex flex-col gap-1 items-center min-w-[160px]">
              <button
                onClick={addToCart}
                disabled={busy}
                className="relative bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to Cart"}

                {/* spinner overlays button text while busy */}
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
              </button>

              {/* status messages */}
              {busy && !added && (
                <div className="text-blue-600 text-sm mt-1">
                  Adding to cart…
                </div>
              )}
              {added && (
                <div className="text-green-600 text-sm mt-1 transition-opacity duration-300">
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
