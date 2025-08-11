// src/components/Wishlist.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_V1 } from "../api/config";

const GUEST_KEY = "guest_wishlist";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]); // [{ id, product_id, product? }, ...]
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // --- Helpers ---------------------------------------------------------------
  const readGuestIds = () => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  };

  const writeGuestIds = (ids) => {
    localStorage.setItem(
      GUEST_KEY,
      JSON.stringify(Array.from(new Set(ids.map(Number))))
    );
  };

  const fetchProduct = async (id) => {
    const res = await fetch(`${API_V1}/products/${id}`, {
      headers: { Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    return json?.data || null;
  };

  // Normalize any API shape to an array of items
  const normalizeWishlistResponse = (json) => {
    if (!json) return [];
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json?.data?.items)) return json.data.items;
    if (json.data && typeof json.data === "object") return [json.data];
    return [];
  };

  // Hydrate items with missing product objects
  const hydrateMissingProducts = async (items) => {
    const withProducts = await Promise.all(
      items.map(async (it) => {
        if (it.product) return it;
        const prod = await fetchProduct(it.product_id).catch(() => null);
        return { ...it, product: prod || null };
      })
    );
    return withProducts;
  };

  // --- Load wishlist ---------------------------------------------------------
  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      if (token) {
        // Logged-in: fetch from server
        const res = await fetch(
          `https://keneta.laratest-app.com/api/v1/customer/wishlist?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        let items = normalizeWishlistResponse(json);

        // Ensure each has product
        items = await hydrateMissingProducts(items);

        setWishlist(items);
      } else {
        // Guest: read IDs, fetch their product details
        const ids = readGuestIds();
        if (ids.length === 0) {
          setWishlist([]);
          return;
        }
        const products = await Promise.all(
          ids.map((id) => fetchProduct(id).catch(() => null))
        );

        const items = products
          .map((prod, idx) => ({
            id: ids[idx], // local synthetic id
            product_id: ids[idx],
            product: prod,
          }))
          .filter(Boolean);

        setWishlist(items);
      }
    } catch (err) {
      console.error("Wishlist fetch error", err);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // --- Actions ---------------------------------------------------------------
  const moveToCart = async (productId) => {
    if (!token) {
      alert("Please login to move items to the cart.");
      return;
    }
    const item = wishlist.find(
      (w) => Number(w.product_id) === Number(productId)
    );
    const product = item?.product;

    // If product is configurable (has super attributes), direct to PDP
    if (product?.super_attributes?.length) {
      alert("Please select a variant on the product page.");
      return;
    }
    if (!product || product.quantity < 1) {
      alert("Product is out of stock.");
      return;
    }

    try {
      const res = await fetch(
        `https://keneta.laratest-app.com/api/v1/customer/wishlist/${productId}/move-to-cart`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            additional: {
              product_id: productId,
              quantity: 1,
            },
          }),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to move");

      // Refresh after moving
      fetchWishlist();
    } catch (err) {
      console.error("Move to cart failed", err);
      alert(err.message || "Failed to move to cart.");
    }
  };

  const removeItem = async (productId) => {
    try {
      if (token) {
        // Server toggle (POST) removes when already present
        await fetch(
          `https://keneta.laratest-app.com/api/v1/customer/wishlist/${productId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              additional: {
                product_id: productId,
                quantity: 1,
              },
            }),
          }
        );
      } else {
        // Guest: remove from local list
        const ids = readGuestIds().filter(
          (id) => Number(id) !== Number(productId)
        );
        writeGuestIds(ids);
      }
      fetchWishlist(); // Refresh UI
    } catch (err) {
      console.error("Remove failed", err);
    }
  };

  const clearAll = async () => {
    try {
      if (token) {
        await fetch(
          `https://keneta.laratest-app.com/api/v1/customer/wishlist/all`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
      } else {
        writeGuestIds([]);
      }
      fetchWishlist();
    } catch (err) {
      console.error("Clear all failed", err);
    }
  };

  // --- Render ---------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wishlist</h1>
        {wishlist.length > 0 && (
          <button
            onClick={clearAll}
            className="px-4 py-1 border rounded hover:bg-red-100 text-sm"
          >
            Delete All
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : wishlist.length === 0 ? (
        <p>Your wishlist is empty.</p>
      ) : (
        <div className="space-y-6">
          {wishlist.map((item) => {
            const product = item.product;
            const urlKey = product?.url_key;

            return (
              <div
                key={`${item.id}-${item.product_id}`}
                className="flex items-center justify-between gap-4 border-b pb-4"
              >
                <Link
                  to={urlKey ? `/products/${urlKey}` : "#"}
                  className={`flex gap-4 ${
                    urlKey ? "" : "pointer-events-none opacity-70"
                  }`}
                >
                  <img
                    src={
                      product?.base_image?.medium_image_url ||
                      "https://via.placeholder.com/100"
                    }
                    alt={product?.name || "Product"}
                    className="w-20 h-20 object-contain bg-gray-50"
                  />
                  <div>
                    <p className="font-medium">
                      {product?.name || `#${item.product_id}`}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {product?.formatted_price || "—"}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  {/* Move to Cart or Out of Stock (only for logged in) */}
                  {token ? (
                    product?.quantity > 0 ? (
                      <button
                        onClick={() => moveToCart(item.product_id)}
                        className="bg-[#001242] text-white px-4 py-2 rounded text-sm"
                      >
                        Move To Cart
                      </button>
                    ) : (
                      <span className="text-sm text-red-500">Out of Stock</span>
                    )
                  ) : (
                    <span className="text-sm text-gray-500">
                      Login to move to cart
                    </span>
                  )}

                  {/* Price & Remove */}
                  <div className="text-right text-sm">
                    {product?.formatted_price || "—"}
                    {product?.formatted_compare_at_price && (
                      <div className="line-through text-gray-400 text-xs">
                        {product.formatted_compare_at_price}
                      </div>
                    )}
                    <button
                      className="block text-red-500 text-xs mt-1"
                      onClick={() => removeItem(item.product_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
