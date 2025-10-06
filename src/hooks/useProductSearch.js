// src/hooks/useProductSearch.js
import { useCallback, useRef, useState } from "react";

// Hardcode the API host as requested.
// (You can still override via VITE_API_BASE_URL if you want later.)
const API_BASE = (
  import.meta?.env?.VITE_API_BASE_URL || "https://admin.keneta-ks.com"
)
  .trim()
  .replace(/\/+$/, "");

function normalizeProduct(p) {
  return {
    id: p.id ?? p.product_id ?? p.sku ?? Math.random().toString(36).slice(2),
    name: p.name ?? p.product_name ?? "",
    slug: p.slug ?? p.url_key ?? null,
    sku: p.sku ?? null,
    base_image: p.base_image ?? {
      small_image_url: p?.images?.[0]?.small_image_url,
      medium_image_url: p?.images?.[0]?.medium_image_url,
      original_image_url: p?.images?.[0]?.original_image_url,
    },
    thumbnail_url: p.thumbnail_url,
    image_url: p.image_url,
    images: Array.isArray(p.images) ? p.images : [],
    formatted_final_price: p.formatted_final_price,
    formatted_price: p.formatted_price,
    final_price: p.final_price,
    price: p.price,
    brand_id: p.brand_id ?? p?.attributes?.brand_id,
    category_id:
      p.category_id ??
      (Array.isArray(p.categories) && p.categories[0]?.id) ??
      (Array.isArray(p.category_ids) && p.category_ids[0]) ??
      null,
    in_stock: p.in_stock,
    created_at: p.created_at,
  };
}

export function useProductSearch() {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef(null);

  /** GET https://admin.keneta-ks.com/api/v2/search?q=&per_page=&page= */
  const searchProducts = useCallback(async (q, opts = {}) => {
    const { limit = 36, page = 1, extraParams = {} } = opts;

    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    const params = new URLSearchParams({
      q: q ?? "",
      limit: String(limit), // Use 'limit' instead of 'per_page'
      page: String(page),
    });
    for (const [k, v] of Object.entries(extraParams)) {
      if (v != null && v !== "") params.set(k, String(v));
    }

    console.log("🔍 Search hook - limit:", limit, "page:", page);
    console.log(
      "🔍 Search hook - URL:",
      `${API_BASE}/api/v2/search?${params.toString()}`
    );

    setLoading(true);
    try {
      const url = `${API_BASE}/api/v2/search?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.meta?.redirect_url) {
        return {
          redirect_url: json.meta.redirect_url,
          products: [],
          meta: json.meta,
          total: 0,
          last_page: 1,
          current_page: 1,
          hasNext: false,
        };
      }

      const dataArray = Array.isArray(json?.data) ? json.data : [];
      const products = dataArray.map(normalizeProduct);

      console.log("📦 Search hook - raw data length:", dataArray.length);
      console.log("📦 Search hook - products length:", products.length);

      const total =
        json?.meta?.total ??
        (typeof dataArray.length === "number" ? dataArray.length : 0);

      const last_page =
        json?.meta?.last_page ?? json?.pagination?.last_page ?? undefined;

      const current_page =
        json?.meta?.current_page ?? json?.pagination?.current_page ?? page;

      const hasNext =
        typeof last_page === "number"
          ? current_page < last_page
          : Boolean(json?.next_page_url);

      return {
        products,
        meta: json?.meta || {},
        total,
        last_page: last_page ?? (hasNext ? current_page + 1 : current_page),
        current_page,
        hasNext,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { searchProducts, loading };
}
