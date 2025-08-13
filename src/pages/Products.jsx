import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import FilterSidebar from "../components/FilterSidebar";
import {
  useProducts,
  usePrefetchProduct,
  useCartMutations,
} from "../api/hooks";
import ProductCard from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

const slugifyBrandLabel = (label) =>
  encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"));

export default function Products() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") || "1", 10);
  const searchTerm = params.get("query")?.trim() || "";
  const categorySlug = params.get("category");
  const brandSlug = params.get("brand");

  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const activeBrandLabel = useMemo(() => {
    if (!brandSlug || !brandOptions.length) return null;
    return (
      brandOptions.find((b) => slugifyBrandLabel(b.label) === brandSlug)
        ?.label ?? null
    );
  }, [brandSlug, brandOptions]);

  const activeCategoryLabel = useMemo(() => {
    if (!categorySlug || !categoryOptions.length) return null;
    return (
      categoryOptions.find((c) => encodeURIComponent(c.slug) === categorySlug)
        ?.name ?? null
    );
  }, [categorySlug, categoryOptions]);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const toast = useToast();

  const [busyId, setBusyId] = useState(null);
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();

  // ---- Brands (with tiny cache) ----
  useEffect(() => {
    let cancelled = false;

    const fetchBrands = async () => {
      try {
        const cached = sessionStorage.getItem("brandOptions");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) setBrandOptions(parsed);
        } else {
          const res = await fetch(
            "https://keneta.laratest-app.com/api/v1/attributes?sort=id"
          );
          const json = await res.json();
          const brandAttr = json.data.find((attr) => attr.code === "brand");
          const options = brandAttr?.options ?? [];
          sessionStorage.setItem("brandOptions", JSON.stringify(options));
          if (!cancelled) setBrandOptions(options);
        }
      } catch {
        // ignore; page still works without labels
      }
    };

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Categories (with tiny cache) ----
  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const cached = sessionStorage.getItem("categoryOptions");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) setCategoryOptions(parsed);
        } else {
          const res = await fetch(
            "https://keneta.laratest-app.com/api/v1/categories?sort=id"
          );
          const json = await res.json();
          const all = json?.data || [];
          sessionStorage.setItem("categoryOptions", JSON.stringify(all));
          if (!cancelled) setCategoryOptions(all);
        }
      } catch {
        // ignore; page still works without labels
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Map slug -> id (when options are ready)
  const mappedBrandId = useMemo(() => {
    if (!brandSlug || !brandOptions.length) return null;
    return (
      brandOptions.find((b) => slugifyBrandLabel(b.label) === brandSlug)?.id ??
      null
    );
  }, [brandSlug, brandOptions]);

  const mappedCategoryId = useMemo(() => {
    if (!categorySlug || !categoryOptions.length) return null;
    return (
      categoryOptions.find((c) => encodeURIComponent(c.slug) === categorySlug)
        ?.id ?? null
    );
  }, [categorySlug, categoryOptions]);

  // Build a **stable** query string for the products API.
  const needsBrandMap =
    !!brandSlug && !mappedBrandId && brandOptions.length === 0;
  const needsCatMap =
    !!categorySlug && !mappedCategoryId && categoryOptions.length === 0;
  const canQuery = !(needsBrandMap || needsCatMap);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();

    // Copy through any primitive params first
    for (const [key, value] of params.entries()) {
      if (!value || !value.trim()) continue;
      if (key === "query" || key === "sort" || key === "page") {
        qs.set(key, value.trim());
      }
    }

    // Server-side filtering — only set when we have the IDs
    if (mappedCategoryId) qs.set("category_id", String(mappedCategoryId));
    if (mappedBrandId) qs.set("brand", String(mappedBrandId));

    // Explicit pagination size (adjust key to match your API)
    if (!qs.has("limit")) qs.set("limit", "12");

    return qs.toString();
  }, [params, mappedBrandId, mappedCategoryId]);

  // Products query
  const { data, isPending, isFetching, isError } = useProducts(queryString, {
    enabled: canQuery,
    keepPreviousData: true,
    staleTime: 60_000,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 12));

  const goToPage = useCallback(
    (p) => {
      if (p < 1 || p > totalPages) return;
      const qs = new URLSearchParams(params);
      qs.set("page", String(p));
      setParams(qs);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [params, setParams, totalPages]
  );

  const buildPageItems = useCallback(() => {
    const arr = [];
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
      return arr;
    }
    arr.push(1);
    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    if (start > 2) arr.push("ellipsis-start");
    for (let p = start; p <= end; p++) arr.push(p);
    if (end < totalPages - 1) arr.push("ellipsis-end");
    arr.push(totalPages);
    return arr;
  }, [page, totalPages]);

  const pageItems = buildPageItems();

  // FAST add-to-cart (no await). Busy state only for the clicked card.
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
          onSettled: () => {
            setBusyId((curr) => (curr === id ? null : curr));
          },
        }
      );
    },
    [addItem, toast]
  );

  // Perceived speed: skeletons
  if (!canQuery || isPending) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
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

  if (isError) {
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

          {products.length === 0 ? (
            <p className="text-center text-gray-500">
              {searchTerm
                ? `Nuk u gjetën produkte për "${searchTerm}".`
                : "No products match that filter."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
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

              {totalPages > 1 && (
                <nav
                  className="mt-10 flex justify-center items-center gap-1 select-none flex-wrap"
                  aria-label="pagination"
                >
                  <button
                    onClick={() => goToPage(1)}
                    disabled={page === 1}
                    className="px-2 py-2 rounded bg-gray-100 disabled:opacity-40"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="px-2 py-2 rounded bg-gray-100 disabled:opacity-40"
                  >
                    {"<"}
                  </button>

                  {pageItems.map((item, idx) =>
                    typeof item === "string" ? (
                      <span key={`ell-${idx}`} className="px-3 py-2">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item)}
                        className={`px-3 py-2 rounded transition-all ${
                          item === page
                            ? "bg-indigo-600 text-white font-semibold"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-2 py-2 rounded bg-gray-100 disabled:opacity-40"
                  >
                    {">"}
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-2 py-2 rounded bg-gray-100 disabled:opacity-40"
                  >
                    ⏭
                  </button>
                </nav>
              )}
            </>
          )}

          {isFetching && !isPending && (
            <div
              className="fixed bottom-4 right-4"
              aria-live="polite"
              aria-busy="true"
              title="Loading…"
            >
              ⏳
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
