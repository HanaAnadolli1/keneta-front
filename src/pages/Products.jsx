// src/pages/Products.jsx
import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import FilterSidebar from "../components/FilterSidebar";
import {
  useProducts,
  usePrefetchProduct,
  useCartMutations,
} from "../api/hooks";
import "../index.css";

export default function Products() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") || "1", 10);
  const searchTerm = params.get("search")?.trim().toLowerCase() || "";

  const { data, isPending, isFetching, isError } = useProducts(params);
  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  // Only filter the current page of products
  const filtered = useMemo(
    () =>
      searchTerm
        ? products.filter((p) => p.name.toLowerCase().includes(searchTerm))
        : products,
    [products, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(total / 12));
  const prefetch = usePrefetchProduct();
  const { addItem } = useCartMutations();
  const [busyId, setBusyId] = useState(null);
  const [addedId, setAddedId] = useState(null);

  const handleAdd = async (id) => {
    setBusyId(id);
    try {
      await addItem.mutateAsync({ productId: id, quantity: 1 });
      setAddedId(id);
      setTimeout(() => setAddedId((curr) => (curr === id ? null : curr)), 2000);
    } catch (e) {
      alert("Failed to add to cart: " + e.message);
    } finally {
      setBusyId((curr) => (curr === id ? null : curr));
    }
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    const qs = new URLSearchParams(params);
    qs.set("page", p);
    setParams(qs);
  };

  // pagination UI logic (same as before)…
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

  if (isPending) return <p className="text-center p-4">Loading…</p>;
  if (isError)
    return <p className="text-center text-red-500">Error loading products.</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
      <FilterSidebar />

      <section className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500">
            {searchTerm
              ? `Nuk u gjetën produkte për "${searchTerm}".`
              : "No products match that filter."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((p, idx) => (
                <article
                  key={`${p.id}-${idx}`}
                  className="bg-white rounded-lg shadow flex flex-col"
                >
                  <Link
                    to={`/products/${p.id}`}
                    onMouseEnter={() => prefetch(p.id)}
                    className="block flex-1"
                  >
                    <img
                      src={
                        p.base_image?.medium_image_url ||
                        "https://via.placeholder.com/300x200"
                      }
                      alt={p.name}
                      className="w-full h-48 object-contain bg-gray-100"
                    />
                    <div className="p-4">
                      <h2 className="text-base font-semibold mb-1 line-clamp-2">
                        {p.name}
                      </h2>
                      <p className="font-bold text-indigo-600">
                        {p.formatted_price}
                      </p>
                    </div>
                  </Link>
                  <div className="p-4 border-t flex justify-between items-center">
                    <button
                      onClick={() => handleAdd(p.id)}
                      disabled={busyId === p.id}
                      className={`px-3 py-1 rounded border ${
                        busyId
                          ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-500"
                          : "border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
                      }`}
                    >
                      {busyId === p.id ? "Adding…" : "Add to Cart"}
                    </button>
                    {addedId === p.id && (
                      <span className="ml-2 text-green-600 text-sm">
                        Added!
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Hide pagination when doing a search */}
            {!searchTerm && totalPages > 1 && (
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
          <div className="fixed bottom-4 right-4 animate-spin">⏳</div>
        )}
      </section>
    </div>
  );
}
