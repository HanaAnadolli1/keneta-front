import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const WishlistContext = createContext({
  wishlistItems: [],
  isWishlisted: () => false,
  toggleWishlist: async (_id) => {},
  refreshWishlist: async () => {},
  wishlistCount: 0,
  loading: false,
});

const API = "https://keneta.laratest-app.com/api/v1/customer/wishlist";
const GUEST_KEY = "guest_wishlist";
const MERGED_FLAG = "guest_wishlist_merged";

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]); // product IDs (numbers)
  const [loading, setLoading] = useState(true);
  const [authTick, setAuthTick] = useState(0); // bump to re-run effects when auth changes

  // ——— Helpers ———
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const toUniqueNums = (arr) => Array.from(new Set(arr.map((n) => Number(n))));

  const loadFromServer = async () => {
    const token = getToken();
    if (!token) return [];
    const res = await fetch(API, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    const ids = toUniqueNums((json.data || []).map((it) => it.product_id));
    return ids;
  };

  const loadFromGuest = () => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? toUniqueNums(parsed) : [];
    } catch {
      return [];
    }
  };

  const saveGuest = (ids) => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(toUniqueNums(ids)));
  };

  // ——— React to login/logout coming from AuthContext ———
  useEffect(() => {
    const onAuth = () => setAuthTick((x) => x + 1);
    window.addEventListener("auth-changed", onAuth);
    window.addEventListener("storage", onAuth); // cross-tab
    return () => {
      window.removeEventListener("auth-changed", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  // ——— Initial load + merge-once logic ———
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = getToken();

        if (token) {
          const serverIds = await loadFromServer();

          // Merge guest -> server once after login
          const alreadyMerged = localStorage.getItem(MERGED_FLAG) === "1";
          const guestIds = alreadyMerged ? [] : loadFromGuest();

          const missing = toUniqueNums(
            guestIds.filter((id) => !serverIds.includes(Number(id)))
          );

          // Add only missing on server
          await Promise.all(
            missing.map((id) =>
              fetch(`${API}/${id}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  additional: { product_id: id, quantity: 1 },
                }),
              }).catch(() => {})
            )
          );

          const finalServerIds = await loadFromServer();
          setWishlistItems(finalServerIds);

          // Clear guest list now it’s merged
          localStorage.removeItem(GUEST_KEY);
          localStorage.setItem(MERGED_FLAG, "1");
        } else {
          // Guest flow
          const guestIds = loadFromGuest();
          setWishlistItems(guestIds);
          localStorage.removeItem(MERGED_FLAG); // allow merge next login
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authTick]); // re-run whenever auth changes

  // Persist guest list only when NOT logged in
  useEffect(() => {
    if (!getToken()) saveGuest(wishlistItems);
  }, [wishlistItems]);

  // ——— Public API ———
  const isWishlisted = (id) => (wishlistItems || []).includes(Number(id));

  const refreshWishlist = async () => {
    if (!getToken()) return;
    const ids = await loadFromServer();
    setWishlistItems(ids);
  };

  const toggleWishlist = async (productId) => {
    const id = Number(productId);
    const token = getToken();

    if (token) {
      try {
        await fetch(`${API}/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ additional: { product_id: id, quantity: 1 } }),
        });
        await refreshWishlist();
      } catch (e) {
        console.error("Toggle wishlist failed", e);
      }
      return;
    }

    // Guest: deterministic toggle
    setWishlistItems((prev) => {
      const set = new Set(prev.map(Number));
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  const wishlistCount = useMemo(
    () => (wishlistItems || []).length,
    [wishlistItems]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems: wishlistItems || [],
        isWishlisted,
        toggleWishlist,
        refreshWishlist,
        wishlistCount,
        loading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
