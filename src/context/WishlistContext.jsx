// src/context/WishlistContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_V1 } from "../api/config";

// Storage keys
const GUEST_KEY = "guest_wishlist";

// API base
const API = `${API_V1}/customer/wishlist`;

const WishlistContext = createContext({
  wishlistItems: [], // array of product IDs (numbers)
  isWishlisted: (_id) => false,
  toggleWishlist: async (_id) => {},
  refreshWishlist: async () => {},
  wishlistCount: 0,
  loading: false,
});

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]); // product IDs (numbers)
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );

  // --- utils ---------------------------------------------------------------
  const getToken = () =>
    (typeof window !== "undefined" ? localStorage.getItem("token") : null) ||
    null;

  const toUniqueNums = (arr) =>
    Array.from(new Set((arr || []).map((x) => Number(x)).filter(Number.isFinite)));

  const readGuestIds = () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return toUniqueNums(parsed);
    } catch {
      return [];
    }
  };

  const writeGuestIds = (ids) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(GUEST_KEY, JSON.stringify(toUniqueNums(ids)));
  };

  // Normalize any server response to an array of numeric product IDs
  const extractIds = (json) => {
    const rows = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.items)
      ? json.data.items
      : Array.isArray(json?.wishlist)
      ? json.wishlist
      : [];

    return toUniqueNums(
      rows.map((x) => {
        if (typeof x === "number") return x;
        if (x?.product_id != null) return x.product_id;
        if (x?.product?.id != null) return x.product.id;
        if (x?.id != null && x?.product == null) return x.id; // fallback
        return null;
      })
    );
  };

  // --- server I/O ----------------------------------------------------------
  const loadFromServer = async () => {
    const t = getToken();
    if (!t) return [];
    const res = await fetch(`${API}?limit=200`, {
      headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    return extractIds(json);
  };

  const addToServer = async (productId) => {
    const t = getToken();
    if (!t) return;
    const id = Number(productId);

    // Try POST /customer/wishlist/:id (toggle)
    let res = await fetch(`${API}/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ additional: { product_id: id, quantity: 1 } }),
    });

    // Fallback: POST /customer/wishlist (some backends use this)
    if (!res.ok) {
      res = await fetch(`${API}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ product_id: id, quantity: 1 }),
      });
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      // If it "already exists", treat as success
      if (res.status === 409 || /exist/i.test(txt)) return;
      throw new Error(txt || "Failed to add to wishlist");
    }
  };

  const removeFromServer = async (productId) => {
    const t = getToken();
    if (!t) return;
    const id = Number(productId);

    // Prefer DELETE
    let res = await fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
    });

    // Fallback to toggle POST
    if (!res.ok) {
      res = await fetch(`${API}/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ additional: { product_id: id, quantity: 1 } }),
      });
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      // If it's already gone, treat as success
      if (res.status === 404) return;
      throw new Error(txt || "Failed to remove from wishlist");
    }
  };

  // --- keep token in sync ---------------------------------------------------
  useEffect(() => {
    const sync = () =>
      setToken(
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      );
    window.addEventListener("auth-changed", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    // tiny polling safety net
    let prev = getToken();
    const id = setInterval(() => {
      const curr = getToken();
      if (curr !== prev) {
        prev = curr;
        setToken(curr);
      }
    }, 800);

    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, []);

  // --- load & merge on login; clear on logout -------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        if (token) {
          // Always try to merge whatever is in guest storage (ignore stale flags)
          const serverIds = await loadFromServer().catch(() => []);
          const guestIds = readGuestIds();

          const toAdd = toUniqueNums(guestIds).filter(
            (id) => !serverIds.includes(id)
          );

          // Post missing items to server
          for (const id of toAdd) {
            try {
              await addToServer(id);
            } catch {
              /* continue best-effort */
            }
          }

          // Reload authoritative server list
          const finalServerIds = await loadFromServer().catch(() => []);
          if (!cancelled) setWishlistItems(finalServerIds);

          // Clear guest storage after successful (or best-effort) merge
          localStorage.removeItem(GUEST_KEY);
        } else {
          // Logged out: clear guest wishlist per requirements
          localStorage.removeItem(GUEST_KEY);
          if (!cancelled) setWishlistItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Persist guest list only when not logged in
  useEffect(() => {
    if (!token) writeGuestIds(wishlistItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistItems, token]);

  // Public API
  const refreshWishlist = async () => {
    if (!token) return;
    const ids = await loadFromServer().catch(() => []);
    setWishlistItems(ids);
  };

  const isWishlisted = (productId) => {
    const id = Number(productId);
    return wishlistItems.includes(id);
  };

  const toggleWishlist = async (productId) => {
    const id = Number(productId);

    if (token) {
      if (isWishlisted(id)) {
        await removeFromServer(id);
      } else {
        await addToServer(id);
      }
      await refreshWishlist();
      return;
    }

    // guest: local only
    setWishlistItems((prev) => {
      const set = new Set(prev);
      set.has(id) ? set.delete(id) : set.add(id);
      return Array.from(set);
    });
  };

  const value = useMemo(
    () => ({
      wishlistItems,
      isWishlisted,
      toggleWishlist,
      refreshWishlist,
      wishlistCount: wishlistItems.length,
      loading,
    }),
    [wishlistItems, loading]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
