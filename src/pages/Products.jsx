// src/pages/Products.jsx
import React, { useMemo, useState, useEffect, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import FilterSidebar from "../components/FilterSidebar";
import {
  useProducts,
  usePrefetchProduct,
  useCartMutations,
} from "../api/hooks";
import { AuthContext } from "../context/AuthContext";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import "../index.css";

export default function Products() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") || "1", 10);
  const searchTerm = params.get("query")?.trim().toLowerCase() || "";
  const categorySlug = params.get("category");
  const brandSlug = params.get("brand");

  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [activeBrandLabel, setActiveBrandLabel] = useState(null);
  const [activeCategoryLabel, setActiveCategoryLabel] = useState(null);

  const { currentUser } = useContext(AuthContext);
  const [wishlistItems, setWishlistItems] = useState([]);

  const [busyId, setBusyId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const { addItem } = useCartMutations();
  const prefetch = usePrefetchProduct();

  useEffect(() => {
    const fetchBrands = async () => {
      const response = await fetch(
        "https://keneta.laratest-app.com/api/v1/attributes?sort=id"
      );
      const data = await response.json();
      const brandAttr = data.data.find((attr) => attr.code === "brand");
      if (brandAttr?.options) {
        setBrandOptions(brandAttr.options);
        const match = brandAttr.options.find(
          (b) =>
            encodeURIComponent(b.label.toLowerCase().replace(/\s+/g, "-")) ===
            brandSlug
        );
        if (match) setActiveBrandLabel(match.label);
      }
    };
    fetchBrands();
  }, [brandSlug]);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(
        "https://keneta.laratest-app.com/api/v1/categories?sort=id"
      );
      const json = await res.json();
      const all = json?.data || [];
      setCategoryOptions(all);
      const match = all.find(
        (cat) => encodeURIComponent(cat.slug) === categorySlug
      );
      if (match) setActiveCategoryLabel(match.name);
    };
    fetchCategories();
  }, [categorySlug]);

  const queryParams = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (!value || !value.trim()) continue;
    if (key === "category") {
      const match = categoryOptions.find(
        (cat) => encodeURIComponent(cat.slug) === value
      );
      if (match) queryParams.set("category_id", match.id);
    } else if (key === "brand") {
      const match = brandOptions.find(
        (b) =>
          encodeURIComponent(b.label.toLowerCase().replace(/\s+/g, "-")) ===
          value
      );
      if (match) queryParams.set("brand", match.id);
    } else if (key === "query") {
      queryParams.set("query", value.trim());
    } else {
      queryParams.set(key, value);
    }
  }

  const { data, isPending, isFetching, isError } = useProducts(queryParams);
  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  const filtered = useMemo(
    () =>
      searchTerm
        ? products.filter((p) => p.name.toLowerCase().includes(searchTerm))
        : products,
    [products, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(total / 12));

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const fetchWishlist = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com/api/v1/customer/wishlist",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        const json = await res.json();
        const productIds = (json.data || []).map((item) => item.product_id);
        setWishlistItems(productIds);
      } catch (err) {
        console.error("Failed to fetch wishlist", err);
      }
    };

    fetchWishlist();
  }, [currentUser]);

  const toggleWishlist = async (productId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to use wishlist.");
      return;
    }

    try {
      await fetch(
        `https://keneta.laratest-app.com/api/v1/customer/wishlist/${productId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            additional: {
              product_id: productId,
              quantity: 1,
            },
          }),
        }
      );

      setWishlistItems((prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
      );
    } catch (err) {
      console.error("Failed to toggle wishlist", err);
    }
  };

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

  if (isPending) return <p className="text-center p-4">Loading…</p>;
  if (isError)
    return <p className="text-center text-red-500">Error loading products.</p>;

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
                    className="bg-white rounded-lg shadow flex flex-col relative"
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <button onClick={() => toggleWishlist(p.id)}>
                        {wishlistItems.includes(p.id) ? (
                          <FaHeart className="text-2xl text-red-500" />
                        ) : (
                          <FiHeart className="text-2xl text-gray-400 hover:text-red-500" />
                        )}
                      </button>
                    </div>

                    <Link
                      to={`/products/${p.url_key}`}
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
                      {p.quantity > 0 ? (
                        <>
                          <button
                            onClick={() => handleAdd(p.id)}
                            disabled={busyId === p.id}
                            className={`px-3 py-1 rounded border ${
                              busyId === p.id
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
                        </>
                      ) : (
                        <span className="text-sm text-red-500">
                          Out of stock.
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {!searchTerm && totalPages > 1 && (
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
            <div className="fixed bottom-4 right-4 animate-spin">⏳</div>
          )}
        </section>
      </div>
    </div>
  );
}
