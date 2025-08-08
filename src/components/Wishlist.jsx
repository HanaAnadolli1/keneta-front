import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchWishlist = async () => {
    setLoading(true);

    try {
      if (token) {
        // ✅ Logged-in user: fetch from server
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
        setWishlist(json.data || []);
      } else {
        // ✅ Guest: fetch product data from localStorage
        const local = JSON.parse(
          localStorage.getItem("guest_wishlist") || "[]"
        );
        if (!local.length) {
          setWishlist([]);
          return;
        }

        const res = await fetch(
          `https://keneta.laratest-app.com/api/v1/products?ids=${local.join(
            ","
          )}`
        );
        const json = await res.json();

        const guestWishlist = (json.data || []).map((product) => ({
          id: product.id,
          product_id: product.id,
          product,
        }));

        setWishlist(guestWishlist);
      }
    } catch (err) {
      console.error("Wishlist fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const moveToCart = async (productId) => {
    const item = wishlist.find((w) => w.product_id === productId);
    if (!item?.product || item.product.quantity < 1) {
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

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to move");
      fetchWishlist();
    } catch (err) {
      console.error("Move to cart failed", err);
      alert(err.message || "Failed to move to cart.");
    }
  };

  const removeItem = async (productId) => {
    if (token) {
      try {
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
        fetchWishlist();
      } catch (err) {
        console.error("Remove failed", err);
      }
    } else {
      // ✅ Remove from guest wishlist
      const local = JSON.parse(localStorage.getItem("guest_wishlist") || "[]");
      const updated = local.filter((id) => id !== productId);
      localStorage.setItem("guest_wishlist", JSON.stringify(updated));
      fetchWishlist();
    }
  };

  const clearAll = async () => {
    if (token) {
      try {
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
        fetchWishlist();
      } catch (err) {
        console.error("Clear all failed", err);
      }
    } else {
      // ✅ Clear guest wishlist
      localStorage.removeItem("guest_wishlist");
      setWishlist([]);
    }
  };

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
            if (!product) return null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 border-b pb-4"
              >
                <Link
                  to={`/products/${product.url_key}`}
                  className="flex gap-4"
                >
                  <img
                    src={
                      product.base_image?.medium_image_url ||
                      "https://via.placeholder.com/100"
                    }
                    alt={product.name}
                    className="w-20 h-20 object-contain bg-gray-50"
                  />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-gray-600 text-sm">
                      {product.formatted_price || "€0.00"}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  {token && product.quantity > 0 ? (
                    <button
                      onClick={() => moveToCart(product.id)}
                      className="bg-[#001242] text-white px-4 py-2 rounded text-sm"
                    >
                      Move To Cart
                    </button>
                  ) : !token ? null : (
                    <span className="text-sm text-red-500">Out of Stock</span>
                  )}

                  <div className="text-right text-sm">
                    {product.formatted_price}
                    {product.formatted_compare_at_price && (
                      <div className="line-through text-gray-400 text-xs">
                        {product.formatted_compare_at_price}
                      </div>
                    )}
                    <button
                      className="block text-red-500 text-xs mt-1"
                      onClick={() => removeItem(product.id)}
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
