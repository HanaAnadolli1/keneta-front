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
import Spinner from "../components/Spinner";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { usePrefetchProduct, useCartMutations } from "../api/hooks";
import { API_V1 } from "../api/config";
import CategoryNavigator from "../components/CategoryNavigator";

const PER_PAGE = 12;
const MIN_SEARCH_LEN = 3;

const slugifyBrandLabel = (label) =>
  encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"));

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isCsvOfIds = (v) =>
  typeof v === "string" && /^[0-9]+(,[0-9]+)*$/.test(v.trim());

const normalizeCsv = (csv) =>
  Array.from(
    new Set(
      (csv || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  ).join(",");

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
  const [params] = useSearchParams();
  const sort = params.get("sort") || "";
  const order = params.get("order") || "";
  const searchTerm = params.get("query")?.trim() || "";
  const categorySlugParam = params.get("category") || "";
  const categoryIdParam = params.get("category_id") || "";

  const brandParam = params.get("brand") || "";
  const brandSlugParam = !isCsvOfIds(brandParam)
    ? brandParam || params.get("brand_slug") || ""
    : "";

  const isSearchActive = searchTerm.length >= MIN_SEARCH_LEN;
  const hasCategoryFilter = Boolean(categoryIdParam || categorySlugParam);
  const hasBrandFilter = Boolean(brandParam || brandSlugParam);
  const isShortSearchOnly =
    !!searchTerm && !isSearchActive && !hasCategoryFilter && !hasBrandFilter;

  // meta lookups
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [metaNotice, setMetaNotice] = useState(null);

  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadingLock = useRef(false);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();

  // Load brands
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const cached = sessionStorage.getItem("brandOptions");
        if (cached) {
          setBrandOptions(JSON.parse(cached));
          return;
        }
        const res = await fetch(`${API_V1}/attributes?sort=id`, {
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

  // Load categories
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const cached = sessionStorage.getItem("categoryOptions");
        if (cached) {
          setCategoryOptions(JSON.parse(cached));
          return;
        }
        const res = await fetch(`${API_V1}/categories?sort=id`, {
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

  // resolve brand
  const mappedBrandIdFromSlug = useMemo(() => {
    if (!brandSlugParam || !brandOptions.length) return null;
    return (
      brandOptions.find(
        (b) =>
          slugifyBrandLabel(b.label) === slugifyBrandLabel(brandSlugParam)
      )?.id ?? null
    );
  }, [brandSlugParam, brandOptions]);

  // category tolerant index
  const categoryIndex = useMemo(() => {
    const map = new Map();
    for (const c of categoryOptions) {
      if (!c?.slug) continue;
      const raw = c.slug;
      map.set(raw, c);
      map.set(encodeURIComponent(raw), c);
      map.set(
        raw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        c
      );
    }
    return map;
  }, [categoryOptions]);

  const resolvedCategory = useMemo(() => {
    if (!categorySlugParam || !categoryIndex.size) return null;
    const decoded = decodeURIComponent(categorySlugParam);
    return (
      categoryIndex.get(decoded) ||
      categoryIndex.get(categorySlugParam) ||
      categoryIndex.get(
        decoded
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ) ||
      null
    );
  }, [categorySlugParam, categoryIndex]);

  const activeCategoryLabel = useMemo(() => {
    if (categoryIdParam && categoryOptions.length) {
      return (
        categoryOptions.find((c) => String(c.id) === String(categoryIdParam))
          ?.name ?? null
      );
    }
    return resolvedCategory?.name ?? null;
  }, [categoryIdParam, categoryOptions, resolvedCategory]);

  const activeBrandLabel = useMemo(() => {
    if (!brandSlugParam || !brandOptions.length) return null;
    return (
      brandOptions.find(
        (b) => slugifyBrandLabel(b.label) === slugifyBrandLabel(brandSlugParam)
      )?.label ?? null
    );
  }, [brandSlugParam, brandOptions]);

  useEffect(() => {
    if (brandSlugParam && brandOptions.length && !mappedBrandIdFromSlug) {
      setMetaNotice("Brand filter not recognized.");
    } else if (
      !categoryIdParam &&
      categorySlugParam &&
      categoryOptions.length &&
      !resolvedCategory
    ) {
      setMetaNotice("Category filter not recognized.");
    } else {
      setMetaNotice(null);
    }
  }, [
    brandSlugParam,
    brandOptions.length,
    mappedBrandIdFromSlug,
    categorySlugParam,
    categoryOptions.length,
    resolvedCategory,
    categoryIdParam,
  ]);

  // Reset list when URL-level filters change
  const resetKey = useMemo(
    () =>
      JSON.stringify({
        sort,
        order,
        query: searchTerm,
        brand: brandParam || brandSlugParam,
        category: categorySlugParam,
        categoryId: categoryIdParam,
      }),
    [
      sort,
      order,
      searchTerm,
      brandParam,
      brandSlugParam,
      categorySlugParam,
      categoryIdParam,
    ]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    setLoadingMore(false);
    setError(null);
  }, [resetKey]);

  // Build filter QS
  const baseFiltersQS = useMemo(() => {
    const qs = new URLSearchParams();

    if (sort) qs.set("sort", sort);
    if (order) qs.set("order", order);

    if (searchTerm.length >= MIN_SEARCH_LEN) qs.set("query", searchTerm);

    if (brandParam && isCsvOfIds(brandParam)) {
      qs.set("brand", normalizeCsv(brandParam));
    } else if (mappedBrandIdFromSlug) {
      qs.set("brand", String(mappedBrandIdFromSlug));
    } else if (brandSlugParam) {
      qs.set("brand_slug", brandSlugParam);
    }

    if (categoryIdParam) {
      // ✅ category_id takes precedence
      qs.set("category_id", String(categoryIdParam));
      // (Optional) some backends also accept 'category' as id
      if (!qs.has("category")) qs.set("category", String(categoryIdParam));
    } else if (resolvedCategory?.id) {
      qs.set("category_id", String(resolvedCategory.id));
      if (!qs.has("category")) qs.set("category", String(resolvedCategory.id));
    } else if (categorySlugParam) {
      const dec = decodeURIComponent(categorySlugParam);
      qs.set("category_slug", dec);
      qs.set("category", dec);
    }

    return qs.toString();
  }, [
    sort,
    order,
    searchTerm,
    brandParam,
    brandSlugParam,
    mappedBrandIdFromSlug,
    resolvedCategory,
    categorySlugParam,
    categoryIdParam,
  ]);

  // fetch one page
  const fetchPage = useCallback(
    async (pageToFetch, { append }) => {
      const qs = new URLSearchParams(baseFiltersQS);
      qs.set("per_page", String(PER_PAGE));
      qs.set("page", String(pageToFetch));

      const url = `${API_V1}/products?${qs.toString()}`;
      // Optional: debug the outgoing URL
      // console.debug("[products] url", url);

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

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isShortSearchOnly) {
          if (!cancelled) {
            setItems([]);
            setHasMore(false);
            setInitialLoading(false);
          }
          return;
        }
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
  }, [fetchPage, isShortSearchOnly]);

  // infinite scroll
  const handleIntersect = useCallback(async () => {
    if (loadingLock.current || loadingMore || !hasMore || initialLoading) return;
    loadingLock.current = true;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, { append: true });
    } catch (e) {
      setError(e);
    } finally {
      loadingLock.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, page, hasMore, initialLoading, loadingMore]);

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
            {/* Navigator placeholder to keep layout consistent */}
            {hasCategoryFilter && <div className="mb-6" />}

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

            <div className="mt-8 flex justify-center">
              <Spinner size="lg" label="Loading products…" />
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

        <section className="flex-1 min-w-0">
          {hasCategoryFilter && <CategoryNavigator />}

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

          {/* Short-search guard */}
          {isShortSearchOnly && (
            <p className="text-center text-gray-500">
              Shkruani të paktën {MIN_SEARCH_LEN} karaktere për të kërkuar.
            </p>
          )}

          {!isShortSearchOnly && items.length === 0 ? (
            <p className="text-center text-gray-500">
              {isSearchActive
                ? `Nuk u gjetën produkte për "${searchTerm}".`
                : "No products match that filter."}
            </p>
          ) : !isShortSearchOnly ? (
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

              <InfiniteScrollSentinel
                onIntersect={handleIntersect}
                disabled={!hasMore}
              />

              {loadingMore && (
                <div className="my-6 flex justify-center">
                  <Spinner label="Loading more…" />
                </div>
              )}
              {!loadingMore && !hasMore && (
                <div className="my-6 text-center text-sm text-gray-500">
                  No more products
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
