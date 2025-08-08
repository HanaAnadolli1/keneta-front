// src/context/WishlistContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);

  const token = localStorage.getItem("token");

  // Load wishlist from API or localStorage
  useEffect(() => {
    const loadWishlist = async () => {
      if (token) {
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
          const ids = (json.data || []).map((item) => item.product_id);
          setWishlistItems(ids);
        } catch (err) {
          console.error("Failed to load wishlist", err);
        }
      } else {
        // Load from localStorage
        const local = localStorage.getItem("guest_wishlist");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              setWishlistItems(parsed);
            }
          } catch (e) {
            console.error("Invalid guest wishlist format");
          }
        }
      }
    };

    loadWishlist();
  }, [token]);

  // Save guest wishlist to localStorage
  useEffect(() => {
    if (!token) {
      localStorage.setItem("guest_wishlist", JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, token]);

  const toggleWishlist = async (productId) => {
    if (token) {
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
        refreshWishlist();
      } catch (err) {
        console.error("Failed to toggle wishlist", err);
      }
    } else {
      setWishlistItems((prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
      );
    }
  };

  const isWishlisted = (productId) => wishlistItems.includes(productId);

  const refreshWishlist = async () => {
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
      const ids = (json.data || []).map((item) => item.product_id);
      setWishlistItems(ids);
    } catch (err) {
      console.error("Failed to refresh wishlist", err);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        toggleWishlist,
        isWishlisted,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
