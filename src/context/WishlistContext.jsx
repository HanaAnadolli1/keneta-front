// src/context/WishlistContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_V1 } from "../api/config";

// --- Storage keys ------------------------------------------------------------
const GUEST_KEY = "guest_wishlist"; // guest list lives in localStorage
const MERGED_FLAG = "wishlist_merged_once"; // mark that we merged after login

// --- API base ----------------------------------------------------------------
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
  const [wishlistItems, setWishlistItems] = useState([]); // product IDs
  const [loading, setLoading] = useState(true);

  // Keep the current auth token in state so changes cause effects to re-run
  const [token, setToken] = useState(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );

  // --- Small utils -----------------------------------------------------------
  const getToken = () =>
    (typeof window !== "undefined" ? localStorage.getItem("token") : null) ||
    null;

  const safeJson = (text, fallback) => {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  };

  // Read / write guest wishlist IDs from storage
  const readGuestIds = () => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const arr = safeJson(raw, []);
    return Array.isArray(arr) ? Array.from(new Set(arr.map(Number))) : [];
  };

  const writeGuestIds = (ids) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      GUEST_KEY,
      JSON.stringify(Array.from(new Set(ids.map(Number))))
    );
  };

  // Server I/O ----------------------------------------------------------------
  const loadFromServer = async () => {
    const t = getToken();
    if (!t) return [];
    const res = await fetch(API, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) throw new Error("Failed to load wishlist");
    // Accept either [{product_id}] or plain IDs
    const data = await res.json();
    const ids = Array.isArray(data)
      ? data
          .map((x) =>
            typeof x === "number"
              ? x
              : typeof x?.product_id !== "undefined"
              ? Number(x.product_id)
              : null
          )
          .filter((x) => Number.isFinite(x))
      : [];
    return Array.from(new Set(ids));
  };

  const addToServer = async (productId) => {
    const t = getToken();
    if (!t) return;
    // Many backends accept POST /customer/wishlist/{id}; others need body
    const endpoint = `${API}/${productId}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({
        additional: { product_id: Number(productId), quantity: 1 },
      }),
    });
    if (!res.ok) {
      // If server uses a different shape, at least throw so caller can inspect
      throw new Error("Failed to add to wishlist");
    }
  };

  const removeFromServer = async (productId) => {
    const t = getToken();
    if (!t) return;
    const endpoint = `${API}/${productId}`;
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      throw new Error("Failed to remove from wishlist");
    }
  };

  // --- Keep token in sync with localStorage / other tabs / redirects ---------
  useEffect(() => {
    const sync = () =>
      setToken(
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      );

    window.addEventListener("auth-changed", sync); // call this in your auth flow
    window.addEventListener("storage", sync); // cross-tab
    window.addEventListener("focus", sync); // after redirects

    // Lightweight polling fallback in case nothing else fires
    let prev = getToken();
    const id = setInterval(() => {
      const curr = getToken();
      if (curr !== prev) {
        prev = curr;
        setToken(curr);
      }
    }, 1000);

    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, []);

  // --- Initial load + merge-once logic --------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        if (token) {
          // Load current server wishlist
          const serverIds = await loadFromServer();

          // Merge guest -> server exactly once after login
          const alreadyMerged = localStorage.getItem(MERGED_FLAG) === "1";
          const guestIds = alreadyMerged ? [] : readGuestIds();

          const toAdd = guestIds.filter((id) => !serverIds.includes(id));
          for (const id of toAdd) {
            try {
              await addToServer(id);
            } catch (e) {
              // Best-effort merge: continue others even if one fails
              // (Consider logging e)
            }
          }

          // Reload authoritative server list
          const finalServerIds = await loadFromServer();
          if (!cancelled) {
            setWishlistItems(finalServerIds);
          }

          // Clear guest list & mark merged
          localStorage.removeItem(GUEST_KEY);
          localStorage.setItem(MERGED_FLAG, "1");
        } else {
          // Logout/guest flow — per requirements, clear guest wishlist after logout
          localStorage.removeItem(GUEST_KEY);
          localStorage.removeItem(MERGED_FLAG); // allow merge next login
          if (!cancelled) {
            setWishlistItems([]); // start clean as a guest
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Persist guest list *only* when not logged in
  useEffect(() => {
    if (!token) {
      writeGuestIds(wishlistItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistItems, token]);

  // --- Public API ------------------------------------------------------------
  const refreshWishlist = async () => {
    if (!token) return;
    const ids = await loadFromServer();
    setWishlistItems(ids);
  };

  const isWishlisted = (productId) => {
    const id = Number(productId);
    return wishlistItems.includes(id);
  };

  const toggleWishlist = async (productId) => {
    const id = Number(productId);

    if (token) {
      // Authenticated: update on server and refresh
      if (isWishlisted(id)) {
        await removeFromServer(id);
      } else {
        await addToServer(id);
      }
      await refreshWishlist();
      return;
    }

    // Guest: update local list (persisted via effect above)
    setWishlistItems((prev) => {
      const set = new Set(prev);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
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
