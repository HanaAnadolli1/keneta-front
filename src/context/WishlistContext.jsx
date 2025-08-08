import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);

  const token = localStorage.getItem("token");

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
      setWishlist(json.data || []);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
    }
  };

  const isWishlisted = (productId) =>
    wishlist.some((item) => item.product_id === productId);

  const refreshWishlist = () => fetchWishlist();

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isWishlisted,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
