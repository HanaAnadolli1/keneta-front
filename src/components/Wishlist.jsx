import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const token = localStorage.getItem("token");

  // Fetch wishlist on mount
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!token) return;

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
        setWishlist(json?.data || []);
      } catch (err) {
        console.error("Wishlist fetch error", err);
      }
    };

    fetchWishlist();
  }, [token]);

  // Move to cart with quantity 1
  const moveToCart = async (productId) => {
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

      // Refetch wishlist
      setWishlist((prev) =>
        prev.filter((item) => item.product_id !== productId)
      );
    } catch (err) {
      console.error("Failed to move to cart", err);
      alert("Failed to move to cart.");
    }
  };

  // Remove from wishlist
  const removeFromWishlist = async (productId) => {
    try {
      const res = await fetch(
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
            },
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to remove");

      // Update local state
      setWishlist((prev) =>
        prev.filter((item) => item.product_id !== productId)
      );
    } catch (err) {
      console.error("Remove failed", err);
    }
  };

  const deleteAll = async () => {
    try {
      const res = await fetch(
        "https://keneta.laratest-app.com/api/v1/customer/wishlist/all",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete all");

      setWishlist([]);
    } catch (err) {
      console.error("Delete all failed", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Wishlist</h1>
        {wishlist.length > 0 && (
          <button
            onClick={deleteAll}
            className="text-sm text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Delete All
          </button>
        )}
      </div>

      {wishlist.length === 0 ? (
        <p>No items in your wishlist.</p>
      ) : (
        <div className="space-y-6">
          {wishlist.map((item) => {
            const product = item.product;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b pb-4"
              >
                <Link
                  to={`/products/${product?.url_key}`}
                  className="flex items-center gap-4"
                >
                  <img
                    src={
                      product?.base_image?.small_image_url ||
                      "https://via.placeholder.com/80"
                    }
                    alt={product?.name}
                    className="w-20 h-20 object-contain bg-gray-100 rounded"
                  />
                  <div>
                    <h2 className="text-base font-medium">{product?.name}</h2>
                    <p className="text-sm text-gray-600">
                      {product?.formatted_price || "€0.00"}
                    </p>
                  </div>
                </Link>

                <div className="flex gap-4 items-center">
                  <button
                    onClick={() => moveToCart(product.id)}
                    className="bg-[#001242] text-white px-4 py-2 rounded text-sm"
                  >
                    Move To Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
