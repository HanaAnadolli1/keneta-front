// src/pages/Products.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import FilterSidebar from "../components/FilterSidebar";
import ProductCard from "../components/ProductCard";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { usePrefetchProduct, useCartMutations } from "../api/hooks";

const API_ROOT = "https://keneta.laratest-app.com/api";
const PER_PAGE = 12;

// brand label → slug used in URL
const slugifyBrandLabel = (label) =>
  encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"));

// diacritic-tolerant compare (ujitese → ujitëse)
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// read items + simple/length-aware pagination flags
function extractProductsPayload(resp) {
  const items =
    resp?.items ??
    resp?.data?.items ??
    (Array.isArray(resp?.data) ? resp.data : []) ??
    resp?.products ??
    [];

  const lastPage =
    resp?.last_page ??
    resp?.meta?.last_page ??
    resp?.pagination?.last_page ??
    null;

  const currentPage =
    resp?.current_page ??
    resp?.meta?.current_page ??
    resp?.pagination?.current_page ??
    1;

  const hasNext =
    Boolean(resp?.next_page_url) || (lastPage ? currentPage < lastPage : false);

  return { items, lastPage, currentPage, hasNext };
}

export default function Products() {
  const [params] = useSearchParams(); // we read filters from URL, but we DO NOT sync page anymore
  const sort = params.get("sort") || "";
  const order = params.get("order") || "";
  const searchTerm = params.get("query")?.trim() || "";
  const categorySlugParam = params.get("category") || "";
  const brandSlug = params.get("brand") || "";

  // meta lookups
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [metaNotice, setMetaNotice] = useState(null);

  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1); // internal page for infinite scroll
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch lock to avoid duplicate loads when sentinel fires rapidly
  const loadingLock = useRef(false);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();

  // ---- load brands (session cache)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const cached = sessionStorage.getItem("brandOptions");
        if (cached) {
          setBrandOptions(JSON.parse(cached));
          return;
        }
        const res = await fetch(`${API_ROOT}/v1/attributes?sort=id`, {
          signal: ac.signal,
        });
        const json = await res.json();
        const brandAttr = json?.data?.find?.((a) => a.code === "brand");
        const options = brandAttr?.options ?? [];
        sessionStorage.setItem("brandOptions", JSON.stringify(options));
        setBrandOptions(options);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("brand load failed", e);
      }
    })();
    return () => ac.abort();
  }, []);

  // ---- load categories (session cache)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const cached = sessionStorage.getItem("categoryOptions");
        if (cached) {
          setCategoryOptions(JSON.parse(cached));
          return;
        }
        const res = await fetch(`${API_ROOT}/v1/categories?sort=id`, {
          signal: ac.signal,
        });
        const json = await res.json();
        const all = json?.data || [];
        sessionStorage.setItem("categoryOptions", JSON.stringify(all));
        setCategoryOptions(all);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("category load failed", e);
      }
    })();
    return () => ac.abort();
  }, []);

  // ---- resolve brand id from URL brand slug
  const mappedBrandId = useMemo(() => {
    if (!brandSlug || !brandOptions.length) return null;
    return (
      brandOptions.find((b) => slugifyBrandLabel(b.label) === brandSlug)?.id ??
      null
    );
  }, [brandSlug, brandOptions]);

  // ---- build tolerant index for categories & resolve
  const categoryIndex = useMemo(() => {
    const map = new Map();
    for (const c of categoryOptions) {
      if (!c?.slug) continue;
      const raw = c.slug;
      map.set(raw, c);
      map.set(encodeURIComponent(raw), c);
      map.set(normalize(raw), c);
    }
    return map;
  }, [categoryOptions]);

  const resolvedCategory = useMemo(() => {
    if (!categorySlugParam || !categoryIndex.size) return null;
    const decoded = decodeURIComponent(categorySlugParam);
    return (
      categoryIndex.get(decoded) ||
      categoryIndex.get(categorySlugParam) ||
      categoryIndex.get(normalize(decoded)) ||
      null
    );
  }, [categorySlugParam, categoryIndex]);

  const activeCategoryLabel = resolvedCategory?.name ?? null;
  const activeBrandLabel = useMemo(() => {
    if (!brandSlug || !brandOptions.length) return null;
    return (
      brandOptions.find((b) => slugifyBrandLabel(b.label) === brandSlug)
        ?.label ?? null
    );
  }, [brandSlug, brandOptions]);

  // ---- helpful banner if provided slug can’t be mapped
  useEffect(() => {
    if (brandSlug && brandOptions.length && !mappedBrandId) {
      setMetaNotice("Brand filter not recognized.");
    } else if (
      categorySlugParam &&
      categoryOptions.length &&
      !resolvedCategory
    ) {
      setMetaNotice("Category filter not recognized.");
    } else {
      setMetaNotice(null);
    }
  }, [
    brandSlug,
    brandOptions.length,
    mappedBrandId,
    categorySlugParam,
    categoryOptions.length,
    resolvedCategory,
  ]);

  // ------------------------------------------------------------------
  // Reset list ONLY when URL-level filters change (not when mappings resolve)
  // ------------------------------------------------------------------
  const resetKey = useMemo(
    () =>
      JSON.stringify({
        sort,
        order,
        query: searchTerm,
        brand: brandSlug,
        category: categorySlugParam,
      }),
    [sort, order, searchTerm, brandSlug, categorySlugParam]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    setError(null);
  }, [resetKey]);

  // ---- build filter QS (no page/per_page here)
  const baseFiltersQS = useMemo(() => {
    const qs = new URLSearchParams();
    if (sort) qs.set("sort", sort);
    if (order) qs.set("order", order);
    if (searchTerm) qs.set("query", searchTerm);

    // Prefer ID if available, else pass slug (this can change later without resetting)
    if (mappedBrandId) qs.set("brand", String(mappedBrandId));
    else if (brandSlug) qs.set("brand_slug", brandSlug);

    if (resolvedCategory?.id)
      qs.set("category_id", String(resolvedCategory.id));
    else if (categorySlugParam) {
      const dec = decodeURIComponent(categorySlugParam);
      qs.set("category_slug", dec);
      qs.set("category", dec); // use whichever your backend honors
    }

    return qs.toString();
  }, [
    sort,
    order,
    searchTerm,
    mappedBrandId,
    brandSlug,
    resolvedCategory,
    categorySlugParam,
  ]);

  // ---- fetch a specific page and (optionally) append
  const fetchPage = useCallback(
    async (pageToFetch, { append }) => {
      const qs = new URLSearchParams(baseFiltersQS);
      qs.set("per_page", String(PER_PAGE));
      qs.set("page", String(pageToFetch));
      const url = `${API_ROOT}/products/bare?${qs.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const { items: newItems, hasNext } = extractProductsPayload(json);

      setItems((prev) => {
        const merged = append ? [...prev, ...newItems] : newItems;
        const seen = new Set();
        const deduped = [];
        for (const it of merged) {
          const key = it?.id ?? it?.sku ?? Math.random();
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(it);
        }
        return deduped;
      });

      setHasMore(hasNext);
      setPage(pageToFetch);
    },
    [baseFiltersQS]
  );

  // ---- initial load (page 1)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchPage(1, { append: false });
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  // ---- onIntersect handler with a simple lock (prevents double fires)
  const handleIntersect = useCallback(async () => {
    if (loadingLock.current || !hasMore || initialLoading) return;
    loadingLock.current = true;
    try {
      await fetchPage(page + 1, { append: true });
    } catch (e) {
      setError(e);
    } finally {
      loadingLock.current = false;
    }
  }, [fetchPage, page, hasMore, initialLoading]);

  // add to cart
  const [busyId, setBusyId] = useState(null);
  const handleAdd = useCallback(
    (id) => {
      setBusyId(id);
      const tid = toast.info("Adding to cart…", { duration: 0 });
      addItem.mutate(
        { productId: id, quantity: 1 },
        {
          onSuccess: () => {
            toast.remove(tid);
            toast.success("Item added to cart.");
          },
          onError: (e) => {
            toast.remove(tid);
            toast.error(e?.message || "Failed to add to cart.");
          },
          onSettled: () => setBusyId((curr) => (curr === id ? null : curr)),
        }
      );
    },
    [addItem, toast]
  );

  // ---- render
  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <div className="flex flex-col md:flex-row gap-8">
          <FilterSidebar />
          <section className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow">
                  <div className="w-full h-48 bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500">Error loading products.</p>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <FilterSidebar />

        <section className="flex-1">
          {(activeBrandLabel || activeCategoryLabel) && (
            <p className="mb-4 text-lg text-gray-700">
              Showing products for{" "}
              {activeCategoryLabel && (
                <>
                  category:{" "}
                  <span className="font-semibold text-indigo-600">
                    {activeCategoryLabel}
                  </span>
                </>
              )}
              {activeBrandLabel && (
                <>
                  {activeCategoryLabel && " and "}brand:{" "}
                  <span className="font-semibold text-indigo-600">
                    {activeBrandLabel}
                  </span>
                </>
              )}
            </p>
          )}

          {metaNotice && (
            <div
              role="status"
              className="mb-4 rounded-md bg-amber-50 text-amber-900 px-3 py-2 text-sm"
            >
              {metaNotice}
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-center text-gray-500">
              {searchTerm
                ? `Nuk u gjetën produkte për "${searchTerm}".`
                : "No products match that filter."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={isWishlisted(product.id)}
                    toggleWishlist={toggleWishlist}
                    handleAddToCart={handleAdd}
                    busy={busyId === Number(product.id)}
                    prefetch={prefetch}
                  />
                ))}
              </div>

              {/* Sentinel triggers the next page load when visible */}
              <InfiniteScrollSentinel
                onIntersect={handleIntersect}
                disabled={!hasMore}
                // You can tweak rootMargin for earlier/later loads:
                // rootMargin="1400px 0px"
              />

              {/* Bottom spinner while loading next page */}
              {loadingLock.current && (
                <div
                  className="my-6 text-center text-sm text-gray-500"
                  aria-live="polite"
                >
                  Loading…
                </div>
              )}
              {!hasMore && (
                <div className="my-6 text-center text-sm text-gray-500">
                  No more products
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
