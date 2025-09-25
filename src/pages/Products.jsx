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
import Spinner from "../components/Spinner";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { usePrefetchProduct, useCartMutations } from "../api/hooks";
import { API_V1 } from "../api/config";
import CategoryNavigator from "../components/CategoryNavigator";
import Breadcrumbs from "../components/Breadcrumbs";

/* ================================
 * Dynamic Category Breadcrumbs System
 * - When category_id present: climb parent chain via /categories/:id
 * - When chain flat/broken: fallback to bounded DFS via /descendant-categories
 * - When only category/category_slug: use DFS directly
 * - DFS caches children in memory + sessionStorage, de-dupes in-flight requests
 * - DFS aborts cleanly on route changes, ranks by token overlap
 * - Persists final trail to sessionStorage for reuse
 * - Product queries prefer numeric category_id when known, else use slug
 * - Shows full breadcrumbs (Home / Products / … / Active) with links except last
 * ================================ */

const PER_PAGE = 12;
const MIN_SEARCH_LEN = 3;
const API_PUBLIC_V1 = API_V1;

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

  // Look for parent relationship in various possible field names
  const parentId =
    c.parent_id ??
    c.parentId ??
    c.parent?.id ??
    c.parent_category_id ??
    c.category_parent_id ??
    c.parent ??
    null;

  const normalized = {
    id: Number(c.id ?? c.category_id ?? c.value ?? 0) || 0,
    parent_id: parentId != null ? Number(parentId) : null,
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

  return normalized;
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
    if (!pid || pid === 0 || !byId.has(pid)) {
      break;
    }
    cur = byId.get(pid);
    guard++;
  }

  const result = trail.reverse();
  return result;
}

// Build hierarchy by analyzing descendant relationships (optimized with caching)
async function buildHierarchyFromDescendants(
  targetId,
  targetSlug,
  { signal } = {}
) {
  // Check cache first
  const cacheKey = `hierarchy_${targetId || targetSlug}`;
  const cached = ssGet(cacheKey, null);
  if (cached) {
    return cached;
  }

  try {
    // Get all root categories first (like Menu.jsx)
    const rootRes = await fetch(
      `${API_PUBLIC_V1}/descendant-categories?parent_id=1`,
      { signal }
    );
    const rootData = await rootRes.json();
    const rootCategories = (rootData?.data || []).filter((c) => c.status === 1);

    // Try to find the target category by searching through descendants
    // Limit to first 8 root categories to balance speed and completeness
    const limitedRoots = rootCategories.slice(0, 8);

    for (const root of limitedRoots) {
      const trail = await findCategoryInDescendants(
        targetId,
        targetSlug,
        root.id,
        root,
        { signal }
      );
      if (trail.length > 0) {
        // Cache the result
        ssSet(cacheKey, trail);
        return trail;
      }
    }

    return [];
  } catch (error) {
    // Only log non-abort errors (abort errors are expected when component unmounts)
    if (error.name !== 'AbortError') {
      console.warn("Failed to build hierarchy from descendants:", error);
    }
    return [];
  }
}

// Recursively search for a category in descendants and build complete trail (with caching)
async function findCategoryInDescendants(
  targetId,
  targetSlug,
  parentId,
  parentCategory,
  { signal, depth = 0 } = {}
) {
  if (depth > 8) return []; // Allow deeper search for complete trails

  // Check cache for this parent's children
  const childrenCacheKey = `children_${parentId}`;
  let children = ssGet(childrenCacheKey, null);

  if (!children) {
    try {
      const res = await fetch(
        `${API_PUBLIC_V1}/descendant-categories?parent_id=${parentId}`,
        { signal }
      );
      const data = await res.json();
      children = (data?.data || []).filter((c) => c.status === 1);
      // Cache the children
      ssSet(childrenCacheKey, children);
    } catch (error) {
      // Only log non-abort errors (abort errors are expected when component unmounts)
      if (error.name !== 'AbortError') {
        console.warn(`Failed to search descendants of ${parentId}:`, error);
      }
      return [];
    }
  }

  // Check if target is in direct children
  for (const child of children) {
    if (child.id === targetId || child.slug === targetSlug) {
      // Build the complete trail by including the parent
      const trail = parentCategory ? [parentCategory, child] : [child];
      return trail;
    }
  }

  // Recursively search in children
  for (const child of children) {
    const subTrail = await findCategoryInDescendants(
      targetId,
      targetSlug,
      child.id,
      child,
      { signal, depth: depth + 1 }
    );
    if (subTrail.length > 0) {
      // Prepend the parent to build the complete trail
      const trail = parentCategory ? [parentCategory, ...subTrail] : subTrail;
      return trail;
    }
  }

  return [];
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
  try {
    const res = await fetch(
      `${API_PUBLIC_V1}/categories/${encodeURIComponent(id)}`,
      {
        signal,
      }
    );
    if (!res.ok) {
      console.warn(
        `Failed to fetch category ${id}: ${res.status} ${res.statusText}`
      );
      return null;
    }
    const json = await res.json();
    const category = normCat(json?.data ?? json);
    return category;
  } catch (error) {
    console.warn(`Error fetching category ${id}:`, error);
    return null;
  }
}

// bounded DFS using /descendant-categories; can start from multiple roots
// ranks matches by token overlap without pruning zero-score branches
async function findTrailBySlugRemote(
  slugLike,
  getChildren,
  roots = [FALLBACK_ROOT_ID],
  { signal, maxRequests = 48, maxDepth = 12 } = {}
) {
  if (!slugLike) return [];
  const TARGET = normSlug(slugLike);
  const tokens = TARGET.split(/[^a-z0-9]+/).filter(Boolean);

  // Enhanced scoring function for token overlap
  const calculateScore = (slug) => {
    const ns = normSlug(slug);
    if (ns === TARGET) return 1000; // exact match gets highest score

    // Count token overlaps
    const slugTokens = ns.split(/[^a-z0-9]+/).filter(Boolean);
    let overlapCount = 0;
    let totalTokens = Math.max(tokens.length, slugTokens.length);

    for (const token of tokens) {
      if (slugTokens.some((st) => st.includes(token) || token.includes(st))) {
        overlapCount++;
      }
    }

    // Return overlap ratio as score (0-100), plus length bonus for longer matches
    const overlapRatio =
      totalTokens > 0 ? (overlapCount / totalTokens) * 100 : 0;
    const lengthBonus = Math.min(ns.length * 0.1, 10); // small bonus for longer matches
    return overlapRatio + lengthBonus;
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
        score: calculateScore(n.slug),
      }))
      .sort((a, b) => b.score - a.score); // sort descending (highest score first)

    for (const { n: child, score } of scored) {
      const nextPath = [...path, child];
      if (normSlug(child.slug) === TARGET) return nextPath;

      // Don't prune zero-score branches - include all children for comprehensive search
      if (nextPath.length < maxDepth) {
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
  // Brand parameter now contains brand names (comma-separated) instead of IDs
  const brandSlugParam = params.get("brand_slug") || "";

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
          const cachedOptions = JSON.parse(cached);
          console.log("🏷️ Brand Options Loaded from Cache:", {
            totalOptions: cachedOptions.length,
            sampleOptions: cachedOptions.slice(0, 5).map(opt => ({ id: opt.id, label: opt.label }))
          });
          setBrandOptions(cachedOptions);
          return;
        }
        const res = await fetch(`${API_PUBLIC_V1}/attributes?sort=id`, {
          signal: ac.signal,
        });
        const json = await res.json();
        const options =
          json?.data?.find?.((a) => a.code === "brand")?.options ?? [];
        console.log("🏷️ Brand Options Loaded:", {
          totalOptions: options.length,
          sampleOptions: options.slice(0, 5).map(opt => ({ id: opt.id, label: opt.label }))
        });
        sessionStorage.setItem("brandOptions", JSON.stringify(options));
        setBrandOptions(options);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("brand load failed", e);
      }
    })();
    return () => ac.abort();
  }, []);

  /* ---------------- dynamic breadcrumbs ---------------- */
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
          // Strategy 1: Climb parent chain via /categories/:id
          const start = await getCategoryById(categoryIdParam, {
            signal: ac.signal,
          });

          if (start) {
            const t = [];
            let cur = start;
            let guard = 0;
            while (cur && guard < 30) {
              t.push(cur);
              if (!cur.parent_id || cur.parent_id === 0) {
                break;
              }
              if (ac.signal.aborted)
                throw new DOMException("Aborted", "AbortError");
              cur = await getCategoryById(cur.parent_id, { signal: ac.signal });
              guard++;
            }
            trail = t.reverse();
          }

          // Strategy 2: If chain is flat or broken, try building from full categories list
          if (!trail.length || trail.length === 1) {
            try {
              // Load full categories list to build complete trail
              const r = await fetch(
                `${API_PUBLIC_V1}/categories?sort=id&order=asc&limit=10000`,
                { signal: ac.signal }
              );
              const j = await r.json();
              const fresh = j?.data || [];

              if (fresh.length) {
                const byId = mapById(fresh);
                const bySlug = buildSlugIndex(fresh);

                // Try to find the category by ID first
                let target = byId.get(Number(categoryIdParam));

                if (!target) {
                  // If not found by ID, try by slug
                  const decoded = decodeURIComponent(categorySlugParam || "");
                  if (decoded) {
                    target =
                      bySlug.get(decoded.toLowerCase()) ||
                      bySlug.get(categorySlugParam) ||
                      bySlug.get(normSlug(decoded));
                  }
                }

                if (target) {
                  trail = buildTrailFromFlatList(target, byId);
                }

                // If still no trail, try to build it by analyzing the hierarchy
                if (!trail.length || trail.length === 1) {
                  const decoded = decodeURIComponent(categorySlugParam || "");
                  trail = await buildHierarchyFromDescendants(
                    Number(categoryIdParam),
                    decoded,
                    { signal: ac.signal }
                  );
                }
              }
            } catch (e) {
              // Only log non-abort errors (abort errors are expected when component unmounts)
              if (e.name !== 'AbortError') {
                console.warn("Failed to load full categories:", e);
              }
            }
          }

          // Strategy 3: If still no trail, fallback to DFS
          if (!trail.length || trail.length === 1) {
            const decoded = decodeURIComponent(categorySlugParam || "");
            if (decoded) {
              // Use DFS with current category as starting point
              const roots = start?.id ? [start.id] : [FALLBACK_ROOT_ID];
              trail = await findTrailBySlugRemote(decoded, getChildren, roots, {
                signal: ac.signal,
                maxRequests: 48,
                maxDepth: 12,
              });
            }
          }
        } else if (categorySlugParam) {
          // Strategy 4: Use hierarchy-based approach when only slug is present
          const decoded = decodeURIComponent(categorySlugParam);
          const slugNorm = normSlug(decoded);

          // --- 1) Try hierarchy-based approach (like Menu.jsx) with timeout
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Hierarchy search timeout")),
                8000
              )
            );
            trail = await Promise.race([
              buildHierarchyFromDescendants(null, decoded, {
                signal: ac.signal,
              }),
              timeoutPromise,
            ]);
          } catch (error) {
            console.warn("Hierarchy search failed or timed out:", error);
            trail = [];
          }

          // --- 2) If no trail, check local cache
          let all = ssGet(SS_ALL_CATEGORIES, []);
          if (!trail.length) {
            let byId = mapById(all);
            let bySlug = buildSlugIndex(all);
            let hit =
              bySlug.get(decoded.toLowerCase()) ||
              bySlug.get(categorySlugParam) ||
              bySlug.get(slugNorm);

            if (hit) {
              trail = buildTrailFromFlatList(hit, byId);
            }
          }

          // --- 3) Load full categories list if not found locally
          if (!trail.length) {
            try {
              const r = await fetch(
                `${API_PUBLIC_V1}/categories?sort=id&order=asc&limit=10000`,
                { signal: ac.signal }
              );
              const j = await r.json();
              const fresh = j?.data || [];
              if (fresh.length) {
                ssSet(SS_ALL_CATEGORIES, fresh);
                all = fresh;
                let byId = mapById(all);
                let bySlug = buildSlugIndex(all);
                let hit =
                  bySlug.get(decoded.toLowerCase()) ||
                  bySlug.get(categorySlugParam) ||
                  bySlug.get(slugNorm);
                if (hit) {
                  trail = buildTrailFromFlatList(hit, byId);
                }
              }
            } catch {
              /* ignore */
            }
          }

          // --- 4) Check trail cache
          if (!trail.length) {
            const cache = ssGet(SS_TRAIL_CACHE, {});
            const cached =
              cache[slugNorm] ||
              cache[decoded.toLowerCase()] ||
              cache[categorySlugParam];
            if (cached?.length) {
              trail = cached;
            }
          }

          // --- 5) DFS fallback with multiple roots
          if (!trail.length) {
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

            // Cache the result
            if (trail.length) {
              const table = ssGet(SS_TRAIL_CACHE, {});
              ssSet(SS_TRAIL_CACHE, { ...table, [slugNorm]: trail });
            }
          }
        }

        if (!cancelled) {
          // If we still don't have a trail but have a category, create a minimal trail
          if (!trail.length && (categoryIdParam || categorySlugParam)) {
            if (categoryIdParam) {
              // Create a minimal trail with just the current category
              const current = await getCategoryById(categoryIdParam, {
                signal: ac.signal,
              });
              if (current) {
                trail = [current];
              }
            } else if (categorySlugParam) {
              // Create a minimal trail with just the current category slug
              const decoded = decodeURIComponent(categorySlugParam);
              trail = [
                {
                  id: null,
                  name: decoded,
                  slug: decoded,
                  parent_id: null,
                },
              ];
            }
          }
          setComputedTrail(trail);
          // Only show error when no trail can be built even after all fallbacks
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
  // Parse brand names from URL parameter and convert to IDs
  const selectedBrandIds = useMemo(() => {
    console.log("🏷️ Brand Parameter Debug:", {
      brandParam,
      brandSlugParam,
      rawBrandParam: params.get("brand"),
      rawBrandSlugParam: params.get("brand_slug")
    });
    
    if (!brandParam || !brandOptions.length) return [];
    
    const brandNames = brandParam
      .split(",")
      .map((name) => decodeURIComponent(name.trim()))
      .filter(Boolean);
      
    const ids = brandNames
      .map(name => {
        const brand = brandOptions.find(b => b.label === name);
        return brand?.id;
      })
      .filter(Boolean);
      
    console.log("🏷️ Brand Names to IDs:", {
      brandNames,
      ids,
      brandOptions: brandOptions.slice(0, 3).map(b => ({ id: b.id, label: b.label }))
    });
    
    return ids;
  }, [brandParam, brandSlugParam, params, brandOptions]);

  // Get brand labels for display (using brand IDs)
  const activeBrandLabel = useMemo(() => {
    if (!selectedBrandIds.length || !brandOptions.length) return null;
    
    const labels = selectedBrandIds
      .map(id => brandOptions.find(b => b.id === id)?.label)
      .filter(Boolean);
      
    return labels.join(", ");
  }, [selectedBrandIds, brandOptions]);

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
        brand: brandParam,
        brandSlug: brandSlugParam,
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

    // brand - use brand IDs for API calls
    if (selectedBrandIds.length > 0) {
      qs.set("brand", selectedBrandIds.join(","));
      console.log("🏷️ API Brand Filter:", {
        selectedBrandIds,
        brandQueryString: selectedBrandIds.join(",")
      });
    } else if (brandSlugParam) {
      qs.set("brand_slug", brandSlugParam);
      console.log("🏷️ API Brand Slug Filter:", {
        brandSlugParam
      });
    }

    // category — always prefer numeric category_id when known, else use slug
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
    selectedBrandIds,
    brandSlugParam,
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
      
      // Debug logging for search issues
      if (searchTerm) {
        console.log("🔍 Search Debug:", {
          searchTerm,
          url,
          queryString: qs.toString(),
          baseFiltersQS
        });
      }
      
      // Debug logging for brand filtering
      if (selectedBrandIds.length > 0 || brandSlugParam) {
        console.log("🏷️ Final API URL Debug:", {
          url,
          queryString: qs.toString(),
          brandFilter: selectedBrandIds.length > 0 ? selectedBrandIds.join(",") : brandSlugParam,
          allParams: Object.fromEntries(qs.entries())
        });
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Debug logging for API response
      if (selectedBrandIds.length > 0 || brandSlugParam) {
        console.log("🏷️ API Response Debug:", {
          url,
          brandFilter: selectedBrandIds.length > 0 ? selectedBrandIds.join(",") : brandSlugParam,
          responseStatus: res.status,
          responseData: json,
          totalItems: json?.data?.items?.length || json?.items?.length || 0,
          sampleItems: (json?.data?.items || json?.items || []).slice(0, 3).map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand || item.attributes?.brand || 'No brand info'
          }))
        });
      }
      
      const { items: newItems, hasNext } = extractProductsPayload(json);
      
      // Debug logging for search results
      if (searchTerm) {
        console.log("🔍 Search Results:", {
          searchTerm,
          itemsCount: newItems.length,
          items: newItems.map(item => ({ id: item.id, name: item.name }))
        });
      }
      
      // Client-side filtering for search results to ensure relevance
      let filteredItems = newItems;
      if (searchTerm && searchTerm.length >= MIN_SEARCH_LEN) {
        filteredItems = newItems.filter(item => {
          const name = (item.name || '').toLowerCase();
          const sku = (item.sku || '').toLowerCase();
          const searchTermLower = searchTerm.toLowerCase();
          
          // Check if search term appears in name or SKU
          const nameMatches = name.includes(searchTermLower);
          const skuMatches = sku.includes(searchTermLower);
          
          // Also check for word boundary matches (more precise)
          const nameWordMatch = name.split(/\s+/).some(word => 
            word.startsWith(searchTermLower) || word.includes(searchTermLower)
          );
          
          const matches = nameMatches || skuMatches || nameWordMatch;
          
          if (!matches) {
            console.log("🔍 Filtered out irrelevant product:", {
              name: item.name,
              sku: item.sku,
              searchTerm: searchTerm,
              nameMatches,
              skuMatches,
              nameWordMatch
            });
          }
          
          return matches;
        });
        
        console.log("🔍 After client-side filtering:", {
          originalCount: newItems.length,
          filteredCount: filteredItems.length,
          filteredResults: filteredItems.map(item => ({ id: item.id, name: item.name }))
        });
      }

      setItems((prev) => {
        const merged = append ? [...prev, ...filteredItems] : filteredItems;
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

  // initial load - wait for brand options if needed
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
        
        // If we have brand names but no brand options loaded, don't make API call yet
        if (brandParam && !brandSlugParam && brandOptions.length === 0) {
          console.log("🏷️ Waiting for brand options to load before making API call...");
          if (!cancelled) {
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
  }, [fetchPage, isShortSearchOnly, brandParam, brandSlugParam, brandOptions]);

  // load more button handler
  const handleLoadMore = useCallback(async () => {
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
      
      // Enhanced error logging for production debugging
      console.log("🛒 Add to Cart Debug:", {
        productId: id,
        isLoggedIn: !!localStorage.getItem("token"),
        apiRoot: import.meta.env.DEV ? "localhost" : "production",
        timestamp: new Date().toISOString()
      });
      
      addItem.mutate(
        { productId: id, quantity: 1 },
        {
          onSuccess: (data) => {
            console.log("✅ Add to Cart Success:", data);
            toast.remove(tid);
            toast.success("Item added to cart.");
          },
          onError: (e) => {
            console.error("❌ Add to Cart Error:", {
              error: e,
              message: e?.message,
              stack: e?.stack,
              productId: id,
              isLoggedIn: !!localStorage.getItem("token"),
              apiRoot: import.meta.env.DEV ? "localhost" : "production"
            });
            toast.remove(tid);
            toast.error(e?.message || "Failed to add to cart.");
          },
          onSettled: () => setBusyId((curr) => (curr === id ? null : curr)),
        }
      );
    },
    [addItem, toast]
  );

  /* ---------------- full breadcrumbs with links ---------------- */
  const breadcrumbItems = useMemo(() => {
    const base = [{ label: "Home", path: "/" }];

    if (computedTrail.length) {
      const trailItems = computedTrail.map((c, i) => {
        const isLast = i === computedTrail.length - 1;
        // Use category_id if available, otherwise fall back to slug
        const categoryParam = c.id
          ? `category_id=${c.id}`
          : `category=${encodeURIComponent(c.slug)}`;
        const to = `/products?${categoryParam}`;
        return isLast ? { label: c.name } : { label: c.name, path: to };
      });
      const result = [...base, ...trailItems];
      return result;
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

  if (error)
    return <p className="text-center text-red-500">Error loading products.</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row gap-8">
        <FilterSidebar />

        <section className="flex-1 min-w-0">
          {hasCategoryFilter && <CategoryNavigator activeCategoryName={activeCategoryLabel} />}

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

              {hasMore && (
                <div className="my-6 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Spinner size="sm" />
                        Loading more…
                      </>
                    ) : (
                      "Load More Products"
                    )}
                  </button>
                </div>
              )}
              {!hasMore && items.length > 0 && (
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
