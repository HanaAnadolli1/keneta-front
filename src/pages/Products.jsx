// src/pages/Products.jsx
import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import FilterSidebar from "../components/FilterSidebar";
import { useProducts, usePrefetchProduct } from "../api/hooks";
import "../index.css";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") || "1", 10);

  const { data, isPending, isError, error, isFetching } = useProducts(params);
  const products = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 12));
  const prefetch = usePrefetchProduct();

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    const qs = new URLSearchParams(params);
    qs.set("page", p);
    setParams(qs);
  };

  const buildPageItems = () => {
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
  };

  const pageItems = buildPageItems();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      <FilterSidebar />
      <hr className="md:hidden border-t" />

      <section className="flex-1">
        {isPending && <p className="text-center p-4">Loading…</p>}

        {isError && (
          <p className="text-center p-4 text-[#1e456c]">
            Failed to load products: {error.message}
          </p>
        )}

        {!isPending && !isError && (
          <>
            {products.length === 0 ? (
              <p className="text-center text-gray-500">
                No product with that filter.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} prefetch={prefetch} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-10 flex justify-center items-center gap-1 select-none"
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

                    {pageItems.map((item) =>
                      typeof item === "string" ? (
                        <span key={item} className="px-3 py-2">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goToPage(item)}
                          className={`px-3 py-2 rounded transition-all ${
                            item === page
                              ? "bg-[#1a3c5c] text-white font-semibold"
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
          </>
        )}

        {isFetching && !isPending && (
          <div className="fixed bottom-4 right-4 animate-spin text-[#1d446b]">
            ⏳
          </div>
        )}
      </section>
    </div>
  );
}
