// src/pages/Products.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import { List as ListIcon, LayoutGrid as GridIcon } from "lucide-react";

import FilterSidebar from "../components/FilterSidebar";
import ProductCard from "../components/ProductCard";
import ProductListItem from "../components/ProductListItem";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import Spinner from "../components/Spinner";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { usePrefetchProduct, useCartMutations } from "../api/hooks";
import { API_V1 } from "../api/config";
import CategoryNavigator from "../components/CategoryNavigator";
import Breadcrumbs from "../components/Breadcrumbs";

/* ================================
 * Performance + Caching Notes
 * - No giant /categories?limit=10000 fetch.
 * - Breadcrumbs trail is resolved via:
 *    • category_id → GET /categories/{id} climb parents
 *    • category_slug → bounded DFS via GET /descendant-categories
 * - Caches in sessionStorage: slug index, trail cache, children cache.
 * - All remote calls are abortable and de-duped in-flight.
 * ================================ */

const PER_PAGE = 12;
const MIN_SEARCH_LEN = 3;

// Public endpoint used for fallback category traversal (children-by-parent)
const API_PUBLIC_V1 = "https://keneta.laratest-app.com/api/v1";

// If your true root differs, change this
const CATEGORY_ROOT_ID = 1;

const slugifyBrandLabel = (label) =>
  encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"));

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

/* ---------------- category helpers ---------------- */
function normCat(c) {
  if (!c) return null;
  return {
    id: Number(c.id ?? c.category_id ?? c.value ?? 0) || 0,
    parent_id:
      c.parent_id != null
        ? Number(c.parent_id)
        : c.parent?.id != null
        ? Number(c.parent.id)
        : null,
    slug: String(c.slug ?? c.code ?? c.value ?? c.name ?? "").toLowerCase(),
    name: String(c.name ?? c.label ?? c.title ?? c.slug ?? "Category"),
    level:
      c.level != null
        ? Number(c.level)
        : c.depth != null
        ? Number(c.depth)
        : undefined,
    status: String(c.status ?? "1"),
    translations: Array.isArray(c.translations) ? c.translations : [],
  };
}

/* ===== sessionStorage caches (tiny + fast) ===== */
const SS_SLUG_INDEX = "cat.slugIndex.v1"; // slug -> {id,parent_id,name,slug}
const SS_TRAIL_CACHE = "cat.trailCache.v1"; // slug -> Trail[]
const SS_CHILDREN_CACHE = "cat.childrenCache.v1"; // parentId -> rows[]

function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getSlugIndexCache() { return ssGet(SS_SLUG_INDEX, {}); }
function setSlugIndexCache(obj) { ssSet(SS_SLUG_INDEX, obj); }
function getTrailCache() { return ssGet(SS_TRAIL_CACHE, {}); }
function setTrailCache(obj) { ssSet(SS_TRAIL_CACHE, obj); }
function getChildrenCache() { return ssGet(SS_CHILDREN_CACHE, {}); }
function setChildrenCache(obj) { ssSet(SS_CHILDREN_CACHE, obj); }

/* ===== network helpers ===== */
async function getCategoryById(id, { signal } = {}) {
  if (!id) return null;
  const res = await fetch(`${API_V1}/categories/${encodeURIComponent(id)}`, { signal });
  const json = await res.json();
  return normCat(json?.data ?? json);
}

// Abortable + bounded DFS using /descendant-categories
async function findTrailBySlugRemote(slug, getChildren, { signal, maxRequests = 16, maxDepth = 8 } = {}) {
  if (!slug) return [];
  const TARGET = String(slug).toLowerCase();
  const tokens = TARGET.split(/[^a-z0-9]+/).filter(Boolean);
  const looksRelevant = (s) => {
    if (!s) return false;
    if (s === TARGET) return true;
    // any token match (e.g. "vegla", "ngjitje", ...)
    return tokens.some((t) => s.includes(t));
  };

  let requests = 0;
  const stack = [{ parentId: CATEGORY_ROOT_ID, path: [] }];
  const visited = new Set();

  while (stack.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { parentId, path } = stack.pop();
    const key = String(parentId);
    if (visited.has(key)) continue;
    visited.add(key);

    if (++requests > maxRequests) break; // safety cap
    const children = await getChildren(parentId, { signal });

    // score children: prefer exact/longer/contains
    const scored = children
      .map(normCat)
      .map((n) => ({
        n,
        score:
          n.slug === TARGET ? 1000 : looksRelevant(n.slug) ? n.slug.length : 0,
      }))
      .sort((a, b) => a.score - b.score);

    // iterate from highest score
    for (let i = scored.length - 1; i >= 0; i--) {
      const child = scored[i].n;
      const nextPath = [...path, child];
      const childSlug = String(child.slug || "").toLowerCase();
      if (childSlug === TARGET) return nextPath;
      if (nextPath.length < maxDepth && scored[i].score > 0) {
        stack.push({ parentId: child.id, path: nextPath });
      }
    }
  }
  return [];
}

// Cached + abortable children fetcher (in-memory + sessionStorage)
function useChildrenFetcher() {
  const memCacheRef = useRef(new Map()); // parentId -> rows[]
  const inflightRef = useRef(new Map()); // parentId -> Promise

  const getChildren = useCallback(async (parentId, { signal } = {}) => {
    const key = String(parentId);

    // in-memory cache
    if (memCacheRef.current.has(key)) {
      return memCacheRef.current.get(key);
    }

    // session cache
    const ss = getChildrenCache();
    if (ss[key]) {
      memCacheRef.current.set(key, ss[key]);
      return ss[key];
    }

    // in-flight de-dupe
    if (inflightRef.current.has(key)) {
      return inflightRef.current.get(key);
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });

    const p = (async () => {
      try {
        const url = `${API_PUBLIC_V1}/descendant-categories?parent_id=${encodeURIComponent(parentId)}`;
        const resp = await fetch(url, { signal: controller.signal });
        const json = await resp.json();
        const rows = (json?.data || []).filter((c) => String(c.status ?? "1") === "1");
        memCacheRef.current.set(key, rows);
        const updated = { ...getChildrenCache(), [key]: rows };
        setChildrenCache(updated);
        return rows;
      } finally {
        inflightRef.current.delete(key);
      }
    })();

    inflightRef.current.set(key, p);
    return p;
  }, []);

  return getChildren;
}

/* ---------------- component ---------------- */
export default function Products() {
  const [params] = useSearchParams();

  const sort = params.get("sort") || "";
  const order = params.get("order") || "";
  const searchTerm = params.get("query")?.trim() || "";
  const categorySlugParam =
    params.get("category") || params.get("category_slug") || "";
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
  const [metaNotice, setMetaNotice] = useState(null);

  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // grid/list toggle (persist to sessionStorage)
  const [viewMode, setViewMode] = useState(() => {
    return sessionStorage.getItem("products.viewMode") || "grid";
  });
  useEffect(() => {
    sessionStorage.setItem("products.viewMode", viewMode);
  }, [viewMode]);

  const loadingLock = useRef(false);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();

  /* -------- Load brands -------- */
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

  /* ---------------- FAST breadcrumbs: compute trail without mega-fetch ---------------- */
  const getChildren = useChildrenFetcher();
  const [computedTrail, setComputedTrail] = useState([]);
  const [trailLoading, setTrailLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      if (!hasCategoryFilter) {
        if (!cancelled) {
          setComputedTrail([]);
          setMetaNotice(null);
        }
        return;
      }

      setTrailLoading(true);
      try {
        let trail = [];

        if (categoryIdParam) {
          // climb via /categories/{id} -> parent -> ...
          const start = await getCategoryById(categoryIdParam, { signal: ac.signal });
          if (start) {
            const t = [];
            let cur = start;
            let guard = 0;
            while (cur && guard < 20) {
              t.push(cur);
              if (!cur.parent_id) break;
              if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
              cur = await getCategoryById(cur.parent_id, { signal: ac.signal });
              guard++;
            }
            trail = t.reverse();

            // seed caches
            const idx = getSlugIndexCache();
            if (start.slug)
              idx[start.slug.toLowerCase()] = {
                id: start.id,
                parent_id: start.parent_id,
                name: start.name,
                slug: start.slug,
              };
            setSlugIndexCache(idx);
          }
        } else if (categorySlugParam) {
          const slug = String(decodeURIComponent(categorySlugParam)).toLowerCase();
          // cached trail hit?
          const trailCache = getTrailCache();
          const hit = trailCache[slug];
          if (hit?.length) {
            trail = hit;
          } else {
            trail = await findTrailBySlugRemote(slug, getChildren, { signal: ac.signal, maxRequests: 16, maxDepth: 8 });
            if (trail.length) {
              setTrailCache({ ...trailCache, [slug]: trail });
              const idx = getSlugIndexCache();
              for (const n of trail) {
                if (n?.slug) idx[n.slug.toLowerCase()] = { id: n.id, parent_id: n.parent_id, name: n.name, slug: n.slug };
              }
              setSlugIndexCache(idx);
            }
          }
        }

        if (!cancelled) {
          setComputedTrail(trail);
          if ((categorySlugParam && !trail.length) && !categoryIdParam) {
            setMetaNotice("Category filter not recognized.");
          } else {
            setMetaNotice(null);
          }
        }
      } catch (e) {
        if (!cancelled && e?.name !== "AbortError") console.warn("trail build failed", e);
      } finally {
        if (!cancelled) setTrailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort(); // cancel any in-flight children fetches
    };
  }, [categoryIdParam, categorySlugParam, hasCategoryFilter, getChildren]);

  // Persist the FULL trail so ProductDetails can reuse it
  useEffect(() => {
    if (computedTrail.length) {
      const compact = computedTrail.map((c) => ({
        id: c.id ?? null,
        slug: c.slug ?? "",
        name: c.name ?? "",
      }));
      sessionStorage.setItem("recent.trail.json", JSON.stringify(compact));
      const last = computedTrail[computedTrail.length - 1];
      if (last?.slug) {
        sessionStorage.setItem("recent.category.slug", String(last.slug));
        sessionStorage.setItem("recent.category.name", String(last.name || ""));
      }
    }
  }, [computedTrail]);

  /* -------- brand slug -> id / label -------- */
  const mappedBrandIdFromSlug = useMemo(() => {
    if (!brandSlugParam || !brandOptions.length) return null;
    return (
      brandOptions.find(
        (b) => slugifyBrandLabel(b.label) === slugifyBrandLabel(brandSlugParam)
      )?.id ?? null
    );
  }, [brandSlugParam, brandOptions]);

  const activeBrandLabel = useMemo(() => {
    if (!brandSlugParam || !brandOptions.length) return null;
    return (
      brandOptions.find(
        (b) => slugifyBrandLabel(b.label) === slugifyBrandLabel(brandSlugParam)
      )?.label ?? null
    );
  }, [brandSlugParam, brandOptions]);

  const activeCategoryLabel = useMemo(() => {
    if (computedTrail.length) return computedTrail[computedTrail.length - 1]?.name ?? null;
    return null;
  }, [computedTrail]);

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

  /* -------- Build filter QS (IMPORTANT: slug vs id) -------- */
  const baseFiltersQS = useMemo(() => {
    const qs = new URLSearchParams();

    if (sort) qs.set("sort", sort);
    if (order) qs.set("order", order);

    if (searchTerm.length >= MIN_SEARCH_LEN) qs.set("query", searchTerm);

    // brand
    if (brandParam && isCsvOfIds(brandParam)) {
      qs.set("brand", normalizeCsv(brandParam));
    } else if (mappedBrandIdFromSlug) {
      qs.set("brand", String(mappedBrandIdFromSlug));
    } else if (brandSlugParam) {
      qs.set("brand_slug", brandSlugParam);
    }

    // category — prefer ID from computed trail / URL, else slug
    if (categoryIdParam) {
      qs.set("category_id", String(categoryIdParam));
      qs.set("category", String(categoryIdParam));
    } else if (computedTrail.length && computedTrail[computedTrail.length - 1]?.id) {
      const id = computedTrail[computedTrail.length - 1].id;
      qs.set("category_id", String(id));
      qs.set("category", String(id));
    } else if (categorySlugParam) {
      const dec = decodeURIComponent(categorySlugParam);
      qs.set("category_slug", dec);
    }

    return qs.toString();
  }, [
    sort,
    order,
    searchTerm,
    brandParam,
    brandSlugParam,
    mappedBrandIdFromSlug,
    computedTrail,
    categorySlugParam,
    categoryIdParam,
  ]);

  /* -------- Fetch one page -------- */
  const fetchPage = useCallback(
    async (pageToFetch, { append }) => {
      const qs = new URLSearchParams(baseFiltersQS);
      qs.set("per_page", String(PER_PAGE));
      qs.set("page", String(pageToFetch));

      const url = `${API_V1}/products?${qs.toString()}`;
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
    if (loadingLock.current || loadingMore || !hasMore || initialLoading)
      return;
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

  /* ---------------- breadcrumbs (progressive) ---------------- */
  const breadcrumbItems = useMemo(() => {
    const base = [
      { label: "Home", path: "/" },
      { label: "Products", path: "/products" },
    ];
    if (computedTrail.length) {
      const trailItems = computedTrail.map((c, i) => {
        const isLast = i === computedTrail.length - 1;
        const to = `/products?category=${encodeURIComponent(c.slug)}`;
        return isLast ? { label: c.name } : { label: c.name, path: to };
      });
      return [...base, ...trailItems];
    }
    if (hasCategoryFilter && trailLoading) {
      return [...base, { label: "Loading…" }];
    }
    return base;
  }, [computedTrail, hasCategoryFilter, trailLoading]);

  /* ---------------- render ---------------- */
  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex flex-col md:flex-row gap-8">
          <FilterSidebar />
          <section className="flex-1">
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
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row gap-8">
        <FilterSidebar />

        <section className="flex-1 min-w-0">
          {hasCategoryFilter && <CategoryNavigator />}

          <div className="mb-4 flex items-center justify-between">
            {activeBrandLabel || activeCategoryLabel ? (
              <p className="text-lg text-gray-700">
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
            ) : (
              <span />
            )}

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition ${
                  viewMode === "list"
                    ? "text-[#132232] border border-[#132232]"
                    : "text-gray-500 hover:text-[#132232] border border-transparent"
                }`}
                aria-label="List view"
                title="List view"
              >
                <ListIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition ${
                  viewMode === "grid"
                    ? "text-[#132232] border border-[#132232]"
                    : "text-gray-500 hover:text-[#132232] border border-transparent"
                }`}
                aria-label="Grid view"
                title="Grid view"
              >
                <GridIcon size={18} />
              </button>
            </div>
          </div>

          {metaNotice && (
            <div
              role="status"
              className="mb-4 rounded-md bg-amber-50 text-amber-900 px-3 py-2 text-sm"
            >
              {metaNotice}
            </div>
          )}

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
              {viewMode === "grid" && (
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
              )}

              {viewMode === "list" && (
                <ul className="space-y-5">
                  {items.map((product) => (
                    <li key={product.id}>
                      <ProductListItem
                        product={product}
                        isWishlisted={isWishlisted(product.id)}
                        toggleWishlist={toggleWishlist}
                        handleAddToCart={handleAdd}
                        busy={busyId === Number(product.id)}
                        prefetch={prefetch}
                      />
                    </li>
                  ))}
                </ul>
              )}

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
