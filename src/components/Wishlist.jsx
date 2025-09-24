// src/components/Wishlist.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  useContext,
  memo,
} from "react";
import { Link } from "react-router-dom";
import { API_V1 } from "../api/config";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { AuthContext } from "../context/AuthContext";
import useSaleFlag from "../hooks/useSaleFlag";
import logo from "../assets/logo.png";

const GUEST_KEY = "guest_wishlist";

/* ----------------------------- helpers ---------------------------------- */

function decodeJWT(token) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// Build a robust product image URL; fall back to inline SVG (no network)
function getCardImage(product) {
  const candidates = [
    product?.base_image?.large_image_url,
    product?.base_image?.medium_image_url,
    product?.base_image?.small_image_url,
    product?.thumbnail_url,
    product?.image_url,
    product?.images?.[0]?.url,
    product?.images?.[0]?.large_image_url,
    product?.images?.[0]?.medium_image_url,
    product?.images?.[0]?.small_image_url,
  ].filter(Boolean);

  const first = candidates[0];
  if (first) return first;

  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
          font-size='10' fill='#9ca3af'>no image</text>
      </svg>`
    )
  );
}

function formatCurrency(n, product) {
  const code = product?.currency_code || product?.currency || "EUR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(n));
  } catch {
    return `${n}`;
  }
}

function stripHTML(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

function resolvePrices(product, sale) {
  const priceLabel = stripHTML(
    sale?.priceLabel ||
      product?.formatted_final_price ||
      product?.formatted_price ||
      product?.price_html ||
      product?.display_price ||
      (Number.isFinite(product?.final_price)
        ? formatCurrency(product.final_price, product)
        : Number.isFinite(product?.price)
        ? formatCurrency(product.price, product)
        : "")
  );

  const strikeLabel = stripHTML(
    sale?.strikeLabel ||
      product?.formatted_compare_at_price ||
      product?.formatted_regular_price ||
      (Number.isFinite(product?.compare_at_price)
        ? formatCurrency(product.compare_at_price, product)
        : "")
  );

  const hasStrike =
    Boolean(sale?.hasStrike) ||
    (Boolean(strikeLabel) &&
      String(strikeLabel).trim() !== String(priceLabel).trim());

  return { priceLabel, strikeLabel, hasStrike };
}

/** Normalize many possible API shapes into a product object */
function normalizeProductShape(j) {
  // common shapes: {data:{...}}, {data:[...]}, {...}, {product:{...}}
  const p =
    j?.data?.id
      ? j.data
      : Array.isArray(j?.data) && j.data[0]?.id
      ? j.data[0]
      : j?.product?.id
      ? j.product
      : j;

  return p && Number(p.id) ? p : null;
}

/** Hydrate minimal product shape so image/price fields match the grid */
async function fetchBareByIds(ids, token) {
  const unique = Array.from(new Set(ids.map(Number))).filter(Number.isFinite);
  if (unique.length === 0) return [];

  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // --- 1) Try batch endpoints first (fast path)
  try {
    // ids[]=1&ids[]=2
    const qs1 = unique.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    let res = await fetch(`${API_V1}/v2/products?${qs1}`, { headers });

    // ids=1,2
    if (!res.ok) {
      const qs2 = `ids=${unique.join(",")}`;
      res = await fetch(`${API_V1}/v2/products?${qs2}`, { headers });
    }

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const items =
        json?.items ??
        json?.data?.items ??
        (Array.isArray(json?.data) ? json.data : []) ??
        json?.products ??
        [];
      if (Array.isArray(items) && items.length) return items;
    }
  } catch {
    // fall through to per-ID
  }

  // --- 2) Fallback: fetch each product by id and normalize
  const results = await Promise.all(
    unique.map(async (id) => {
      const tries = [
        `${API_V1}/products/${id}`,
        `${API_V1}/products?id=${id}`, // some backends
      ];
      for (const url of tries) {
        try {
          const r = await fetch(url, { headers });
          if (!r.ok) continue;
          const j = await r.json().catch(() => ({}));
          const p = normalizeProductShape(j);
          if (p) return p;
        } catch {
          /* try next */
        }
      }
      return null;
    })
  );

  return results.filter(Boolean);
}

// Wait until every <img> inside `root` has finished loading (or errored)
function waitForImages(root, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    if (!imgs.length) return resolve();
    let done = 0;
    const finish = () => {
      done += 1;
      if (done >= imgs.length) resolve();
    };
    setTimeout(resolve, timeoutMs);
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return finish();
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
    });
  });
}

function isCrossOrigin(url) {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

// Public CORS proxy (for PDF capture of cross-origin images)
function toCORSProxy(originalUrl, cacheBust = true) {
  try {
    const u = new URL(originalUrl, window.location.href);
    const base = `${u.host}${u.pathname}`;
    const qs = u.search ? u.search.slice(1) : "";
    const cb = cacheBust ? (qs ? `&cb_pdf=${Date.now()}` : `cb_pdf=${Date.now()}`) : "";
    const finalQS = [qs, cb].filter(Boolean).join("&");
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}${
      finalQS ? `&${finalQS}` : ""
    }`;
  } catch {
    return originalUrl;
  }
}

/* --------------------------- Row component ------------------------------- */

const WishlistRow = memo(function WishlistRow({
  item,
  token,
  showHeaderForPDF,
  moveToCart,
  removeItem,
}) {
  const product = item.product;

  const urlKey =
    product?.url_key || product?.slug || (product?.id ? String(product.id) : "");

  const sale = useSaleFlag(product, { apiBase: API_V1 });
  const { priceLabel, strikeLabel, hasStrike } = resolvePrices(product, sale);

  const rawImage = getCardImage(product);
  const cross = isCrossOrigin(rawImage);

  // During PDF capture, proxy cross-origin images so html2canvas can read pixels
  const imgSrc = useMemo(() => {
    if (!rawImage) return rawImage;
    if (showHeaderForPDF && cross) return toCORSProxy(rawImage, true);
    return rawImage;
  }, [rawImage, cross, showHeaderForPDF]);

  // ✅ Be permissive: only declare OOS if we can prove it
  const qty = Number(product?.quantity);
  const computedInStock =
    product?.in_stock === true ||
    (product?.in_stock === undefined && (!Number.isFinite(qty) || qty > 0));

  return (
    <div className="flex items-center justify-between gap-4 pb-4 p-2">
      <Link
        to={urlKey ? `/products/${urlKey}` : "#"}
        className={`flex gap-4 ${urlKey ? "" : "pointer-events-none opacity-70"}`}
      >
        <img
          src={imgSrc}
          crossOrigin={showHeaderForPDF && cross ? "anonymous" : undefined}
          alt={product?.name || product?.product_name || `#${item.product_id}`}
          className="w-20 h-20 object-contain bg-gray-50"
          referrerPolicy={showHeaderForPDF ? "no-referrer" : undefined}
          onError={(e) => {
            e.currentTarget.src = getCardImage({});
          }}
        />

        <div>
          <p className="font-medium">
            {product?.name || product?.product_name || `#${item.product_id}`}
          </p>
          <div className="text-gray-600 text-sm">
            <span className="font-medium">{priceLabel || "—"}</span>
            {hasStrike && strikeLabel && (
              <span className="ml-2 line-through text-gray-400 text-xs">
                {strikeLabel}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4">
        {token ? (
          computedInStock ? (
            <button
              onClick={() => moveToCart(item.product_id)}
              className="bg-[#001242] text-white px-4 py-2 rounded text-sm"
              style={showHeaderForPDF ? { display: "none" } : undefined}
            >
              Move To Cart
            </button>
          ) : (
            <span className="text-sm text-red-500">Out of Stock</span>
          )
        ) : (
          <span className="text-sm text-gray-500">Login to move to cart</span>
        )}

        <div className="text-right text-sm">
          <span className="font-medium">{priceLabel || "—"}</span>
          {hasStrike && strikeLabel && (
            <div className="line-through text-gray-400 text-xs">{strikeLabel}</div>
          )}
          {!showHeaderForPDF && (
            <button
              className="block text-red-500 text-xs mt-1"
              onClick={() => removeItem(item.product_id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/* ----------------------------- main component ---------------------------- */

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]); // [{ id, product_id, product }]
  const [loading, setLoading] = useState(false);

  const { currentUser } = useContext(AuthContext);

  // Token for API calls
  const [token, setToken] = useState(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );

  // PDF state
  const [busyPDF, setBusyPDF] = useState(false);
  const [showHeaderForPDF, setShowHeaderForPDF] = useState(false);
  const printRef = useRef(null);

  // keep token in sync
  useEffect(() => {
    const sync = () =>
      setToken(
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      );
    window.addEventListener("auth-changed", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const id = setInterval(sync, 800);
    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, []);

  // Build customer object from AuthContext (with tiny JWT fallback)
  const jwtClaims = useMemo(() => (token ? decodeJWT(token) : null), [token]);
  const customer = useMemo(() => {
    const first =
      currentUser?.first_name ??
      currentUser?.firstname ??
      jwtClaims?.first_name ??
      jwtClaims?.given_name ??
      "";
    const last =
      currentUser?.last_name ??
      currentUser?.lastname ??
      jwtClaims?.last_name ??
      jwtClaims?.family_name ??
      "";
    const full_name =
      currentUser?.name || [first, last].filter(Boolean).join(" ") || "Customer";
    const email = currentUser?.email ?? jwtClaims?.email ?? "-";
    const phone =
      currentUser?.phone ??
      currentUser?.telephone ??
      currentUser?.phone_number ??
      "-";
    return { full_name, email, phone };
  }, [currentUser, jwtClaims]);

  /* -------- Load wishlist and hydrate (batch + robust per-id fallback) ------ */

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      if (token) {
        // 1) Get wishlist rows
        const res = await fetch(`${API_V1}/customer/wishlist?limit=100`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.wishlist)
          ? json.wishlist
          : [];

        const ids = [];
        const prefilled = new Map(); // id -> product (if present)
        for (const r of rows) {
          const id = Number(r?.product_id ?? r?.product?.id ?? r?.id);
          if (Number.isFinite(id)) {
            ids.push(id);
            if (r?.product && typeof r.product === "object") {
              prefilled.set(id, r.product);
            }
          }
        }

        // 2) Hydrate via /v2/products or per-id for any missing ones
        const toFetch = ids.filter((id) => !prefilled.has(id));
        const bare = await fetchBareByIds(toFetch, token);
        const byId = new Map(bare.map((p) => [Number(p.id), p]));

        // 3) Build items
        const items = ids.map((id) => ({
          id,
          product_id: id,
          product: prefilled.get(id) || byId.get(id) || { id },
        }));

        setWishlist(items);
      } else {
        // Guest
        const ids = (() => {
          try {
            const raw = localStorage.getItem(GUEST_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
          } catch {
            return [];
          }
        })();

        if (ids.length === 0) {
          setWishlist([]);
        } else {
          const bare = await fetchBareByIds(ids, null);
          const byId = new Map(bare.map((p) => [Number(p.id), p]));
          const items = ids.map((id) => ({
            id,
            product_id: id,
            product: byId.get(Number(id)) || { id },
          }));
          setWishlist(items);
        }
      }
    } catch (e) {
      console.error("Wishlist fetch error", e);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  /* ------------------------------ actions --------------------------------- */

  const moveToCart = async (productId) => {
    if (!token) {
      alert("Please login to move items to the cart.");
      return;
    }
    const item = wishlist.find((w) => Number(w.product_id) === Number(productId));
    const product = item?.product;

    if (product?.super_attributes?.length) {
      alert("Please select a variant on the product page.");
      return;
    }
    if (!product) {
      alert("Product details missing.");
      return;
    }

    // ✅ Only block if we can PROVE it's out of stock
    const qty = Number(product?.quantity);
    const definitelyOut =
      product?.in_stock === false || (Number.isFinite(qty) && qty <= 0);

    if (definitelyOut) {
      alert("Product is out of stock.");
      return;
    }

    try {
      const res = await fetch(
        `${API_V1}/customer/wishlist/${productId}/move-to-cart`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ additional: { product_id: productId, quantity: 1 } }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to move");
      fetchWishlist();
    } catch (err) {
      console.error("Move to cart failed", err);
      alert(err.message || "Failed to move to cart.");
    }
  };

  const removeItem = async (productId) => {
    try {
      if (token) {
        await fetch(`${API_V1}/customer/wishlist/${productId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ additional: { product_id: productId, quantity: 1 } }),
        });
      } else {
        const raw = localStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(ids)
          ? ids.filter((id) => Number(id) !== Number(productId))
          : [];
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      }
      fetchWishlist();
    } catch (err) {
      console.error("Remove failed", err);
    }
  };

  const clearAll = async () => {
    try {
      if (token) {
        await fetch(`${API_V1}/customer/wishlist/all`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      } else {
        localStorage.setItem(GUEST_KEY, JSON.stringify([]));
      }
      fetchWishlist();
    } catch (err) {
      console.error("Clear all failed", err);
    }
  };

  /* ------------------------------- PDF ------------------------------------ */

  const downloadPDF = async () => {
    if (!token || !currentUser || !printRef.current) return;
    setBusyPDF(true);
    try {
      setShowHeaderForPDF(true);
      await new Promise((r) => requestAnimationFrame(r)); // let DOM update
      await waitForImages(printRef.current); // wait so images are painted/proxied

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        imageTimeout: 7000,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const nameForFile = (customer.full_name || "Customer").replace(/\s+/g, "_");
      pdf.save(`Wishlist_${nameForFile}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setShowHeaderForPDF(false);
      setBusyPDF(false);
    }
  };

  /* ------------------------------ render ---------------------------------- */

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wishlist</h1>
        <div className="flex gap-3">
          {wishlist.length > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-1 border rounded hover:bg-red-100 text-sm"
              data-html2canvas-ignore="true"
            >
              Delete All
            </button>
          )}
          {token && currentUser && wishlist.length > 0 && (
            <button
              onClick={downloadPDF}
              disabled={busyPDF}
              className="px-4 py-1 border rounded bg-black text-white hover:opacity-90 text-sm disabled:opacity-50"
              data-html2canvas-ignore="true"
              title="Download wishlist as PDF"
            >
              {busyPDF ? "Preparing…" : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Everything inside printRef is captured in the PDF */}
      <div ref={printRef} className="space-y-6">
        {/* Hidden on-screen; visible only during PDF capture */}
        <div
          style={{ display: showHeaderForPDF ? "block" : "none" }}
          className="rounded border p-4 bg-white"
        >
          <div className="flex items-center justify-between mb-3">
            <img src={logo} alt="Keneta Logo" className="h-10" />
            <div className="text-lg font-semibold">Wishlist Report</div>
          </div>

          <div className="grid gap-1 text-sm md:grid-cols-2">
            <div><strong>Name:</strong> {customer.full_name}</div>
            <div><strong>Email:</strong> {customer.email}</div>
            <div><strong>Phone:</strong> {customer.phone}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
            <div><strong>Total Items:</strong> {wishlist.length}</div>
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : wishlist.length === 0 ? (
          <p>Your wishlist is empty.</p>
        ) : (
          <div className="space-y-6">
            {wishlist.map((item) => (
              <WishlistRow
                key={`${item.id}-${item.product_id}`}
                item={item}
                token={token}
                showHeaderForPDF={showHeaderForPDF}
                moveToCart={moveToCart}
                removeItem={removeItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
