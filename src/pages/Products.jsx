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
import { FaCalendarAlt } from "react-icons/fa";

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
import { useProductSearch } from "../hooks/useProductSearch";
import { useCategoryBreadcrumbs } from "../hooks/useBreadcrumbs";

/* ================================
 * Products Page
 * - Search mode → /api/v2/search?q=&per_page=&page=
 * - Listing mode → /api/v2/products?category/brand/sort/order
 * - Brand filter expects IDs for API; we map brand names (in URL) to IDs
 * - Category filter prefers numeric category_id, falls back to slug
 * ================================ */

const PER_PAGE = 12;
const MIN_SEARCH_LEN = 3;
const API_PUBLIC_V1 = API_V1;

export default function Products() {
  const [params] = useSearchParams();

  // URL params
  const sort = params.get("sort") || "";
  const order = params.get("order") || "";
  const searchTerm = params.get("query")?.trim() || "";
  const categorySlugParam =
    params.get("category") || params.get("category_slug") || "";
  const categoryIdParam = params.get("category_id") || "";
  const brandParam = params.get("brand") || ""; // can be names in your app
  const brandSlugParam = params.get("brand_slug") || ""; // optional
  const promotionIdParam = params.get("promotion_id") || "";
  
  // Category-specific filter format: attributes[brand][], attributes[color][], etc.
  const categoryBrandParam = useMemo(() => params.getAll("attributes[brand][]") || [], [params]);
  const categoryColorParam = useMemo(() => params.getAll("attributes[color][]") || [], [params]);
  const categorySizeParam = useMemo(() => params.getAll("attributes[size][]") || [], [params]);

  const isSearchActive = searchTerm.length >= MIN_SEARCH_LEN;
  const hasCategoryFilter = Boolean(categoryIdParam || categorySlugParam);
  const hasBrandFilter = Boolean(brandParam || brandSlugParam || categoryBrandParam.length > 0);
  const hasPromotionFilter = Boolean(promotionIdParam);
  const isShortSearchOnly =
    !!searchTerm &&
    !isSearchActive &&
    !hasCategoryFilter &&
    !hasBrandFilter &&
    !hasPromotionFilter;

  // meta
  const [brandOptions, setBrandOptions] = useState([]);
  const [metaNotice, setMetaNotice] = useState(null);
  const [promotionData, setPromotionData] = useState(null);

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

  // sorting and out-of-stock toggle
  const [sortBy, setSortBy] = useState(
    () => sessionStorage.getItem("products.sortBy") || "name-asc"
  );
  const [hideOutOfStock, setHideOutOfStock] = useState(
    () => sessionStorage.getItem("products.hideOutOfStock") === "true" || false
  );
  useEffect(() => {
    sessionStorage.setItem("products.sortBy", sortBy);
  }, [sortBy]);
  useEffect(() => {
    sessionStorage.setItem(
      "products.hideOutOfStock",
      hideOutOfStock.toString()
    );
  }, [hideOutOfStock]);

  const loadingLock = useRef(false);
  const scrollPositionRef = useRef(0);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();
  const { searchProducts } = useProductSearch();

  /* -------- Load brand options (for name→id mapping) -------- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const cached = sessionStorage.getItem("brandOptions");
        if (cached) {
          setBrandOptions(JSON.parse(cached));
          return;
        }
        const res = await fetch(`${API_PUBLIC_V1}/attributes?sort=id`, {
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

  /* -------- Brand helpers -------- */
  // brandParam comes as comma-separated brand names in your app; map to IDs for API
  const selectedBrandIds = useMemo(() => {
    const allBrandNames = [];
    
    // Handle general format: brand=3M,AKFIX
    if (brandParam && brandOptions.length) {
      const brandNames = brandParam
        .split(",")
        .map((name) => decodeURIComponent(name.trim()))
        .filter(Boolean);
      allBrandNames.push(...brandNames);
    }
    
    // Handle category-specific format: attributes[brand][]=3M&attributes[brand][]=AKFIX
    if (categoryBrandParam.length > 0) {
      allBrandNames.push(...categoryBrandParam);
    }
    
    // Map all brand names to IDs
    const ids = allBrandNames
      .map((name) => brandOptions.find((b) => b.label === name)?.id)
      .filter(Boolean);
    
    return ids;
  }, [brandParam, categoryBrandParam, brandOptions]);

  const activeBrandLabel = useMemo(() => {
    if (!selectedBrandIds.length || !brandOptions.length) return null;
    const labels = selectedBrandIds
      .map((id) => brandOptions.find((b) => b.id === id)?.label)
      .filter(Boolean);
    return labels.join(", ");
  }, [selectedBrandIds, brandOptions]);

  // Active category name (if you already compute a trail elsewhere, you can set this)
  const activeCategoryLabel = null;

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
        promotionId: promotionIdParam,
        categoryBrand: categoryBrandParam,
        categoryColor: categoryColorParam,
        categorySize: categorySizeParam,
      }),
    [
      sort,
      order,
      searchTerm,
      brandParam,
      brandSlugParam,
      categorySlugParam,
      categoryIdParam,
      promotionIdParam,
      categoryBrandParam,
      categoryColorParam,
      categorySizeParam,
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

  /* -------- Promotion header data (optional) -------- */
  useEffect(() => {
    const fetchPromotionData = async () => {
      if (!promotionIdParam) {
        setPromotionData(null);
        return;
      }
      try {
        const response = await fetch(
          `https://admin.keneta-ks.com/api/custom-promotions`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const promotion = data.data?.find(
          (p) => p.id === parseInt(promotionIdParam)
        );
        setPromotionData(promotion || null);
      } catch (err) {
        console.error("Failed to fetch promotion data:", err);
        setPromotionData(null);
      }
    };

    fetchPromotionData();
  }, [promotionIdParam]);

  /* -------- Build base filter QS for listing mode -------- */
  const baseFiltersQS = useMemo(() => {
    const qs = new URLSearchParams();

    if (sort) qs.set("sort", sort);
    if (order) qs.set("order", order);

    // brand — use category-specific format when on category page, else general format
    if (selectedBrandIds.length > 0) {
      if (categorySlugParam) {
        // Category page: use attributes[brand][] format
        selectedBrandIds.forEach(brandId => {
          qs.append("attributes[brand][]", String(brandId));
        });
      } else {
        // General page: use brand=id1,id2 format
        qs.set("brand", selectedBrandIds.join(","));
      }
    } else if (brandSlugParam) {
      qs.set("brand_slug", brandSlugParam);
    }
    
    // Handle other category-specific filters
    if (categoryColorParam.length > 0) {
      categoryColorParam.forEach(color => {
        qs.append("attributes[color][]", color);
      });
    }
    
    if (categorySizeParam.length > 0) {
      categorySizeParam.forEach(size => {
        qs.append("attributes[size][]", size);
      });
    }

    // category — prefer numeric category_id when known, else slug
    if (categoryIdParam) {
      qs.set("category_id", String(categoryIdParam));
      qs.set("category", String(categoryIdParam));
    } else if (categorySlugParam) {
      const dec = decodeURIComponent(categorySlugParam);
      qs.set("category_slug", dec);
    }

    // promotion filter
    if (promotionIdParam) {
      qs.set("promotion_id", promotionIdParam);
    }

    return qs.toString();
  }, [
    sort,
    order,
    selectedBrandIds,
    brandSlugParam,
    categorySlugParam,
    categoryIdParam,
    promotionIdParam,
  ]);

  /* -------- Fetch one page -------- */
  const fetchPage = useCallback(
    async (pageToFetch, { append }) => {
      try {
        // SEARCH MODE → call Laravel /api/v2/search
        if (isSearchActive) {
          const extra = {};

          // category
          if (categoryIdParam) {
            extra.category_id = String(categoryIdParam);
            extra.category = String(categoryIdParam);
          } else if (categorySlugParam) {
            extra.category_slug = decodeURIComponent(categorySlugParam);
          }

          // brand
          if (selectedBrandIds.length > 0) {
            if (categorySlugParam) {
              // Category search: use attributes[brand][] format
              extra["attributes[brand][]"] = selectedBrandIds.map(String);
            } else {
              // General search: use brand=id1,id2 format
              extra.brand = selectedBrandIds.join(",");
            }
          } else if (brandSlugParam) {
            extra.brand_slug = brandSlugParam;
          }
          
          // Handle other category-specific filters in search
          if (categoryColorParam.length > 0) {
            extra["attributes[color][]"] = categoryColorParam;
          }
          
          if (categorySizeParam.length > 0) {
            extra["attributes[size][]"] = categorySizeParam;
          }

          // sort/order passthrough
          if (sort) extra.sort = sort;
          if (order) extra.order = order;

          const { products, hasNext } = await searchProducts(searchTerm, {
            limit: PER_PAGE,
            page: pageToFetch,
            extraParams: extra,
          });

          setItems((prev) => (append ? [...prev, ...products] : products));
          setHasMore(Boolean(hasNext));
          setPage(pageToFetch);
          setInitialLoading(false);
          return;
        }

        // LISTING MODE → normal products endpoint
        const qs = new URLSearchParams(baseFiltersQS);
        qs.set("per_page", String(PER_PAGE));
        qs.set("page", String(pageToFetch));
        const url = `${API_V1}/products?${qs.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const dataArray = Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.items)
          ? json.items
          : [];

        const lastPage =
          json?.meta?.last_page ??
          json?.pagination?.last_page ??
          json?.last_page ??
          pageToFetch;

        const currentPage =
          json?.meta?.current_page ??
          json?.pagination?.current_page ??
          json?.current_page ??
          pageToFetch;

        const hasNext =
          typeof lastPage === "number" ? currentPage < lastPage : false;

        setItems((prev) => (append ? [...prev, ...dataArray] : dataArray));
        setHasMore(Boolean(hasNext));
        setPage(pageToFetch);
        setInitialLoading(false);
      } catch (e) {
        setError(e);
        setInitialLoading(false);
      }
    },
    [
      isSearchActive,
      searchTerm,
      searchProducts,
      baseFiltersQS,
      categoryIdParam,
      categorySlugParam,
      selectedBrandIds,
      brandSlugParam,
      sort,
      order,
    ]
  );

  /* -------- Initial + Load-more -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled || loadingLock.current) return;
      loadingLock.current = true;
      await fetchPage(1, { append: false });
      loadingLock.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (loadingMore || !hasMore) return;
    
    // Save current scroll position
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    
    setLoadingMore(true);
    
    try {
      await fetchPage(page + 1, { append: true });
      
      // Restore scroll position after a short delay to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 100);
      
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  /* -------- Client-side sort & hide out-of-stock -------- */
  const sortedAndFilteredItems = useMemo(() => {
    let filtered = [...items];
    if (hideOutOfStock) {
      filtered = filtered.filter((p) => p.in_stock !== false);
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return String(a.name || "").localeCompare(String(b.name || ""));
        case "name-desc":
          return String(b.name || "").localeCompare(String(a.name || ""));
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "newest":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case "oldest":
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return 0;
      }
    });
    return filtered;
  }, [items, sortBy, hideOutOfStock]);

  /* -------- Breadcrumbs -------- */
  // Use category breadcrumb API if category is selected
  const { breadcrumbs: categoryBreadcrumbs, loading: breadcrumbsLoading } = useCategoryBreadcrumbs(categorySlugParam);
  
  const breadcrumbItems = useMemo(() => {
    const base = [{ label: "Home", path: "/" }];
    
    // If we have category breadcrumbs from API, use them
    if (categoryBreadcrumbs.length > 0) {
      return [...base, ...categoryBreadcrumbs];
    }
    
    // If we have a category slug but no API breadcrumbs, show simple category breadcrumb
    if (categorySlugParam) {
      const categoryName = decodeURIComponent(categorySlugParam).replace(/-/g, ' ');
      return [...base, { label: categoryName }]; // Current category (no path)
    }
    
    // Default: just Home > Products
    return [...base, { label: "Products" }];
  }, [categoryBreadcrumbs, categorySlugParam]);

  /* -------- Render gates -------- */
  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Breadcrumbs items={breadcrumbItems} />
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
          {/* Promotion Header */}
          {promotionData && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--primary)] mb-3">
                    {promotionData.name}
                  </h1>
                  <div className="flex items-center text-[var(--third)]">
                    <FaCalendarAlt className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(promotionData.from).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}{" "}
                      -{" "}
                      {new Date(promotionData.to).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                {promotionData.logo_url && (
                  <div className="mt-4 md:mt-0">
                    <img
                      src={promotionData.logo_url}
                      alt={`${promotionData.name} logo`}
                      className="h-12 w-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {!isSearchActive && (
            <CategoryNavigator activeCategoryName={activeCategoryLabel} />
          )}

          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Sorting Dropdown */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-select"
                  className="text-sm font-medium text-gray-700"
                >
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                >
                  <option value="name-asc">A-Z</option>
                  <option value="name-desc">Z-A</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Out of Stock Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Largo te shiturat
                </span>
                <button
                  type="button"
                  onClick={() => setHideOutOfStock(!hideOutOfStock)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                    hideOutOfStock ? "bg-[var(--primary)]" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={hideOutOfStock}
                  aria-label="Hide out of stock products"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      hideOutOfStock ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* View Mode Buttons */}
              <div className="hidden md:flex items-center gap-2 sm:ml-auto">
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
                  {sortedAndFilteredItems.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      toggleWishlist={toggleWishlist}
                      handleAddToCart={(p) =>
                        addItem.mutate(
                          { productId: p.id, quantity: 1 },
                          {
                            onSuccess: () =>
                              toast.success("Item added to cart."),
                            onError: () =>
                              toast.error("Failed to add to cart."),
                          }
                        )
                      }
                      busy={false}
                      prefetch={prefetch}
                    />
                  ))}
                </div>
              )}

              {viewMode === "list" && (
                <ul className="space-y-5">
                  {sortedAndFilteredItems.map((product) => (
                    <li key={product.id}>
                      <ProductListItem
                        product={product}
                        isWishlisted={isWishlisted(product.id)}
                        toggleWishlist={toggleWishlist}
                        handleAddToCart={(p) =>
                          addItem.mutate(
                            { productId: p.id, quantity: 1 },
                            {
                              onSuccess: () =>
                                toast.success("Item added to cart."),
                              onError: () =>
                                toast.error("Failed to add to cart."),
                            }
                          )
                        }
                        busy={false}
                        prefetch={prefetch}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
