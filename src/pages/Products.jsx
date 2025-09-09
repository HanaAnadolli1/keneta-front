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
 * Fast + resilient breadcrumbs
 * - Prefer local list (all slugs incl. translations, + normalized)
 * - On miss: fetch full categories ONCE, retry locally
 * - Final: bounded DFS via /descendant-categories (depth 12)
 * - Cached: children, trails (by normalized slug)
 * ================================ */

const PER_PAGE = 12;
const MIN_SEARCH_LEN = 3;
const API_PUBLIC_V1 = "https://keneta.laratest-app.com/api/v1";

// If your real root differs, this still works once we load full list (uses many roots)
const FALLBACK_ROOT_ID = 1;

/* ---------- utils ---------- */
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

const normSlug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ---------- payload helpers ---------- */
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

/* ---------- category helpers ---------- */
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

function mapById(categories) {
  const m = new Map();
  (categories || []).forEach((c) => {
    const n = normCat(c);
    if (n?.id) m.set(n.id, n);
  });
  return m;
}

function buildSlugIndex(categories) {
  const bySlug = new Map(); // key -> normalized category
  for (const c of categories || []) {
    const n = normCat(c);
    if (!n?.id) continue;

    const slugs = [
      n.slug,
      ...(n.translations || [])
        .map((t) => t?.slug)
        .filter(Boolean)
        .map((s) => s.toLowerCase()),
    ].filter(Boolean);

    for (const raw of slugs) {
      bySlug.set(raw, n);
      bySlug.set(encodeURIComponent(raw), n);
      bySlug.set(normSlug(raw), n);
    }
  }
  return bySlug;
}

function buildTrailFromFlatList(target, byId) {
  const trail = [];
  let cur = target ? normCat(target) : null;
  let guard = 0;
  while (cur && guard < 40) {
    trail.push(cur);
    const pid = cur.parent_id;
    if (!pid || pid === 0 || !byId.has(pid)) break;
    cur = byId.get(pid);
    guard++;
  }
  return trail.reverse();
}

/* ---------- sessionStorage caches ---------- */
const SS_TRAIL_CACHE = "cat.trailCache.v2"; // normalized slug -> Trail[]
const SS_CHILDREN_CACHE = "cat.childrenCache.v1"; // parentId -> rows[]
const SS_ALL_CATEGORIES = "categoryOptions"; // your existing cache key

const ssGet = (k, fb) => {
  try {
    const v = sessionStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const ssSet = (k, v) => {
  try {
    sessionStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

/* ---------- network helpers ---------- */
async function getCategoryById(id, { signal } = {}) {
  if (!id) return null;
  const res = await fetch(`${API_V1}/categories/${encodeURIComponent(id)}`, {
    signal,
  });
  const json = await res.json();
  return normCat(json?.data ?? json);
}

// bounded DFS using /descendant-categories; can start from multiple roots
async function findTrailBySlugRemote(
  slugLike,
  getChildren,
  roots = [FALLBACK_ROOT_ID],
  { signal, maxRequests = 48, maxDepth = 12 } = {}
) {
  if (!slugLike) return [];
  const TARGET = normSlug(slugLike);
  const tokens = TARGET.split(/[^a-z0-9]+/).filter(Boolean);
  const looksRelevant = (s) => {
    const ns = normSlug(s);
    if (ns === TARGET) return true;
    return tokens.some((t) => ns.includes(t));
  };

  let requests = 0;
  const visited = new Set();
  const stack = roots.map((r) => ({ parentId: r, path: [] }));

  while (stack.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { parentId, path } = stack.pop();
    const key = String(parentId);
    if (visited.has(key)) continue;
    visited.add(key);

    if (++requests > maxRequests) break;
    const children = await getChildren(parentId, { signal });

    const scored = children
      .map(normCat)
      .map((n) => ({
        n,
        score:
          normSlug(n.slug) === TARGET
            ? 1000
            : looksRelevant(n.slug)
            ? n.slug.length
            : 0,
      }))
      .sort((a, b) => a.score - b.score);

    for (let i = scored.length - 1; i >= 0; i--) {
      const child = scored[i].n;
      const nextPath = [...path, child];
      if (normSlug(child.slug) === TARGET) return nextPath;
      if (nextPath.length < maxDepth && scored[i].score > 0) {
        stack.push({ parentId: child.id, path: nextPath });
      }
    }
  }
  return [];
}

// cached + abortable children fetcher
function useChildrenFetcher() {
  const mem = useRef(new Map());
  const inflight = useRef(new Map());

  const getChildren = useCallback(async (parentId, { signal } = {}) => {
    const key = String(parentId);

    if (mem.current.has(key)) return mem.current.get(key);

    const ss = ssGet(SS_CHILDREN_CACHE, {});
    if (ss[key]) {
      mem.current.set(key, ss[key]);
      return ss[key];
    }

    if (inflight.current.has(key)) return inflight.current.get(key);

    const ctrl = new AbortController();
    signal?.addEventListener?.("abort", () => ctrl.abort(), { once: true });

    const p = (async () => {
      try {
        const url = `${API_PUBLIC_V1}/descendant-categories?parent_id=${encodeURIComponent(
          parentId
        )}`;
        const r = await fetch(url, { signal: ctrl.signal });
        const j = await r.json();
        const rows = (j?.data || []).filter(
          (c) => String(c.status ?? "1") === "1"
        );
        mem.current.set(key, rows);
        ssSet(SS_CHILDREN_CACHE, {
          ...ssGet(SS_CHILDREN_CACHE, {}),
          [key]: rows,
        });
        return rows;
      } finally {
        inflight.current.delete(key);
      }
    })();

    inflight.current.set(key, p);
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

  // meta
  const [brandOptions, setBrandOptions] = useState([]);
  const [metaNotice, setMetaNotice] = useState(null);

  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // grid/list toggle
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem("products.viewMode") || "grid"
  );
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
        const options =
          json?.data?.find?.((a) => a.code === "brand")?.options ?? [];
        sessionStorage.setItem("brandOptions", JSON.stringify(options));
        setBrandOptions(options);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("brand load failed", e);
      }
    })();
    return () => ac.abort();
  }, []);

  /* ---------------- breadcrumbs ---------------- */
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
          // climb parents via /categories/{id}
          const start = await getCategoryById(categoryIdParam, {
            signal: ac.signal,
          });
          if (start) {
            const t = [];
            let cur = start;
            let guard = 0;
            while (cur && guard < 30) {
              t.push(cur);
              if (!cur.parent_id) break;
              if (ac.signal.aborted)
                throw new DOMException("Aborted", "AbortError");
              cur = await getCategoryById(cur.parent_id, { signal: ac.signal });
              guard++;
            }
            trail = t.reverse();
          }
        } else if (categorySlugParam) {
          const decoded = decodeURIComponent(categorySlugParam);
          const slugNorm = normSlug(decoded);

          // --- 1) local (maybe already cached by other screens)
          let all = ssGet(SS_ALL_CATEGORIES, []);
          let byId = mapById(all);
          let bySlug = buildSlugIndex(all);
          let hit =
            bySlug.get(decoded.toLowerCase()) ||
            bySlug.get(categorySlugParam) ||
            bySlug.get(slugNorm);

          if (hit) {
            trail = buildTrailFromFlatList(hit, byId);
          }

          // --- 2) If not found, load full list ONCE and retry locally
          if (!trail.length) {
            try {
              const r = await fetch(
                `${API_V1}/categories?sort=id&order=asc&limit=10000`,
                { signal: ac.signal }
              );
              const j = await r.json();
              const fresh = j?.data || [];
              if (fresh.length) {
                ssSet(SS_ALL_CATEGORIES, fresh);
                all = fresh;
                byId = mapById(all);
                bySlug = buildSlugIndex(all);
                hit =
                  bySlug.get(decoded.toLowerCase()) ||
                  bySlug.get(categorySlugParam) ||
                  bySlug.get(slugNorm);
                if (hit) trail = buildTrailFromFlatList(hit, byId);
              }
            } catch {
              /* ignore */
            }
          }

          // --- 3) Trail cache (normalized key)
          if (!trail.length) {
            const cache = ssGet(SS_TRAIL_CACHE, {});
            const cached =
              cache[slugNorm] ||
              cache[decoded.toLowerCase()] ||
              cache[categorySlugParam];
            if (cached?.length) trail = cached;
          }

          // --- 4) DFS fallback (start from best known roots)
          if (!trail.length) {
            // if we have full list, use all root nodes as DFS starts
            const roots = (
              all.length
                ? all
                    .filter(
                      (c) =>
                        c && (c.parent_id == null || Number(c.parent_id) === 0)
                    )
                    .map((c) => Number(c.id))
                : [FALLBACK_ROOT_ID]
            ).filter(Boolean);

            trail = await findTrailBySlugRemote(decoded, getChildren, roots, {
              signal: ac.signal,
              maxRequests: 48,
              maxDepth: 12,
            });

            if (trail.length) {
              const table = ssGet(SS_TRAIL_CACHE, {});
              ssSet(SS_TRAIL_CACHE, { ...table, [slugNorm]: trail });
            }
          }
        }

        if (!cancelled) {
          setComputedTrail(trail);
          if (categorySlugParam && !trail.length && !categoryIdParam) {
            setMetaNotice("Category filter not recognized.");
          } else {
            setMetaNotice(null);
          }
        }
      } catch (e) {
        if (!cancelled && e?.name !== "AbortError")
          console.warn("trail build failed", e);
      } finally {
        if (!cancelled) setTrailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [categoryIdParam, categorySlugParam, hasCategoryFilter, getChildren]);

  // Persist recent trail for other components
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

  /* -------- brand helpers -------- */
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

  const activeCategoryLabel = useMemo(
    () =>
      computedTrail.length
        ? computedTrail[computedTrail.length - 1]?.name ?? null
        : null,
    [computedTrail]
  );

  /* -------- reset list on filter change -------- */
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

  /* -------- Build filter QS -------- */
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
    } else if (
      computedTrail.length &&
      computedTrail[computedTrail.length - 1]?.id
    ) {
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
    if (hasCategoryFilter && trailLoading)
      return [...base, { label: "Loading…" }];
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

  if (error)
    return <p className="text-center text-red-500">Error loading products.</p>;

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

          {metaNotice && !trailLoading && (
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
