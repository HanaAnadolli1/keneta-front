import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_V1 } from "../api/config";
import Spinner from "../components/Spinner";
import { useWishlist } from "../context/WishlistContext";
import { useCartMutations } from "../api/hooks";
import useSaleFlag from "../hooks/useSaleFlag";

function stripHTML(str) {
  if (!str) return "";
  return String(str).replace(/<[^>]*>/g, "").trim();
}

function getImages(p) {
  const list =
    p?.images ??
    p?.gallery_images ??
    p?.media_gallery ??
    p?.media ?? [];
  const base =
    p?.base_image?.large_image_url ||
    p?.base_image?.medium_image_url ||
    p?.base_image?.url ||
    null;

  const urls = [
    base,
    ...list
      .map(
        (im) =>
          im?.large_image_url ||
          im?.medium_image_url ||
          im?.url ||
          im?.src ||
          null
      )
      .filter(Boolean),
  ].filter(Boolean);

  // de-dup
  return Array.from(new Set(urls));
}

function getSafeImage(url) {
  if (url) return url;
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
          font-size='16' fill='#9ca3af'>no image</text>
      </svg>`
    )
  );
}

export default function ProductDetail() {
  const { url_key } = useParams(); // route: /products/:url_key
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(null);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addItem } = useCartMutations();

  // load product by url_key (defensive)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Primary attempt: /products/:url_key
        let res = await fetch(`${API_V1}/products/${encodeURIComponent(url_key)}`);
        if (!res.ok) {
          // Fallback: /products?url_key={key}
          res = await fetch(
            `${API_V1}/products?url_key=${encodeURIComponent(url_key)}`
          );
        }
        const json = await res.json();
        const p =
          json?.data?.product ||
          json?.data ||
          json?.product ||
          (Array.isArray(json?.data?.items) ? json.data.items[0] : null) ||
          (Array.isArray(json?.items) ? json.items[0] : null) ||
          null;

        if (!p) throw new Error("Product not found");

        if (!cancelled) {
          setProduct(p);
          const imgs = getImages(p);
          setActiveImg(imgs[0] || null);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url_key]);

  const inStock = useMemo(
    () => product ? (product?.in_stock ?? (product?.quantity ?? 0) > 0) : false,
    [product]
  );

  const saleInfo = useSaleFlag(product, { apiBase: API_V1 });
  const priceLabel =
    stripHTML(
      saleInfo?.priceLabel ||
        product?.formatted_final_price ||
        product?.formatted_price ||
        ""
    ) || "";
  const strikeLabel = stripHTML(
    saleInfo?.strikeLabel ||
      product?.formatted_compare_at_price ||
      product?.formatted_regular_price ||
      ""
  );
  const hasStrike =
    saleInfo?.hasStrike ||
    (strikeLabel &&
      String(strikeLabel).trim() !== String(priceLabel).trim());

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Spinner size="lg" label="Loading product…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <p className="text-red-600">{error}</p>
        <Link to="/products" className="text-indigo-600 underline">
          Back to products
        </Link>
      </div>
    );
  }
  if (!product) return null;

  const images = getImages(product);
  const brand =
    product?.brand?.label ||
    product?.brand_label ||
    product?.brand ||
    null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs (simple) */}
      <nav className="text-sm mb-4 text-gray-500">
        <Link to="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/products" className="hover:underline">
          Products
        </Link>{" "}
        / <span className="text-gray-700">{product?.name || url_key}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <section>
          <div className="aspect-[4/3] w-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src={getSafeImage(activeImg)}
              alt={product?.name}
              className="w-full h-full object-contain"
              onError={(e) => (e.currentTarget.src = getSafeImage(null))}
            />
          </div>

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(src)}
                  className={`h-20 rounded-lg overflow-hidden bg-gray-50 border ${
                    activeImg === src ? "border-[#132232]" : "border-gray-200"
                  }`}
                  aria-label={`Image ${i + 1}`}
                >
                  <img
                    src={getSafeImage(src)}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => (e.currentTarget.src = getSafeImage(null))}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Info / actions */}
        <section>
          {brand && (
            <div className="text-sm text-gray-500 mb-1">Brand: {brand}</div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-[#132232]">
            {product?.name || url_key}
          </h1>

          <div className="mt-3 flex items-end gap-3">
            <span className="text-2xl md:text-3xl font-extrabold text-[#132232]">
              {priceLabel}
            </span>
            {hasStrike && strikeLabel && (
              <span className="text-lg text-gray-400 line-through">
                {strikeLabel}
              </span>
            )}
            {saleInfo?.saleActive && saleInfo?.pct ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                −{saleInfo.pct}%
              </span>
            ) : null}
          </div>

          <div className="mt-2">
            {inStock ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-sm">
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-sm">
                Out of stock
              </span>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => addItem.mutate({ productId: product.id, quantity: 1 })}
              disabled={!inStock}
              className={`px-6 py-3 rounded-md text-white font-semibold transition ${
                inStock
                  ? "bg-[#132232] hover:opacity-90"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {inStock ? "Add to Cart" : "Out of Stock"}
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`px-6 py-3 rounded-md font-semibold border transition ${
                isWishlisted(product.id)
                  ? "border-red-300 text-red-600 bg-white"
                  : "border-gray-300 text-gray-700 bg-white hover:border-red-300 hover:text-red-600"
              }`}
            >
              {isWishlisted(product.id) ? "Wishlisted" : "Add to Wishlist"}
            </button>
          </div>

          {/* Short details */}
          <div className="mt-8 prose max-w-none">
            {product?.description ? (
              <div
                className="prose-sm sm:prose"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p className="text-gray-600">
                No description provided for this product.
              </p>
            )}
          </div>

          {/* Categories (quick links) */}
          {Array.isArray(product?.categories) && product.categories.length > 0 && (
            <div className="mt-6 text-sm text-gray-500">
              Categories:{" "}
              {product.categories.map((c, i) => {
                const slug =
                  c?.slug ||
                  (Array.isArray(c?.translations)
                    ? c.translations[0]?.slug
                    : null) ||
                  null;
                const label = c?.name || slug || c?.id;
                const to = slug
                  ? `/products?category=${encodeURIComponent(slug)}`
                  : c?.id
                  ? `/products?category_id=${c.id}`
                  : "/products";
                return (
                  <span key={c.id || i}>
                    <Link to={to} className="text-indigo-600 hover:underline">
                      {label}
                    </Link>
                    {i < product.categories.length - 1 ? ", " : ""}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
