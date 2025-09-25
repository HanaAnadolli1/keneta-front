import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { ensureCsrfCookie, getCsrfToken } from "../utils/csrf";
import { API_V1, API_CART } from "./config";
import axios from "./axios";

const PER_PAGE = 12;
const SESSION_COOKIE = "bagisto_session";
const SESSION_LENGTH = 40;
// add near the top (below other consts)
const API_PRODUCTS_BARE = "https://admin.keneta-ks.com/api/v2/products";

function generateSessionValue(len = SESSION_LENGTH) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

export function ensureSession() {
  let sess = Cookies.get(SESSION_COOKIE);
  if (!sess) {
    sess = generateSessionValue();
    Cookies.set(SESSION_COOKIE, sess, {
      expires: 365,
      sameSite: "Lax",
    });
  }
  return sess;
}

export function useProducts(search, options = {}) {
  // Accept string OR URLSearchParams (backward compatible)
  let qs = new URLSearchParams();

  if (!search) {
    // default
  } else if (typeof search === "string") {
    const s = search.startsWith("?") ? search.slice(1) : search;
    qs = new URLSearchParams(s);
  } else {
    // assume URLSearchParams
    qs = new URLSearchParams(search.toString());
  }

  // Back-compat: old code used `limit`; new API expects `per_page`
  if (qs.has("limit")) {
    const v = qs.get("limit") || String(PER_PAGE);
    qs.delete("limit");
    if (!qs.has("per_page")) qs.set("per_page", v);
  }
  if (!qs.has("per_page")) qs.set("per_page", String(PER_PAGE));

  const queryString = qs.toString();

  return useQuery({
    queryKey: ["products", queryString],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `https://admin.keneta-ks.com/api/v2/products?${queryString}`,
        {
          signal,
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Fetch products failed: ${res.status} ${err}`);
      }
      const json = await res.json();

      const items = Array.isArray(json)
        ? json
        : json?.data || json?.items || json?.products || [];

      const total =
        (json?.meta?.total ?? json?.total) ||
        Number(res.headers?.get?.("X-Total-Count")) ||
        items.length;

      return { items, total };
    },
    keepPreviousData: true,
    staleTime: 60_000,
    ...options,
  });
}

export function useProduct(id) {
  return useQuery({
    enabled: !!id,
    queryKey: ["product", id],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_V1}/products/${id}`, {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Fetch product failed: ${res.status}`);
      }
      const json = await res.json();
      if (!json?.data) {
        throw new Error("Product not found");
      }
      return json.data;
    },
  });
}

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async ({ signal }) => {
      ensureSession();
      const token = localStorage.getItem("token");
      // Customer cart
      if (token) {
        const res = await axios.get("/customer/cart", { signal });
        return res.data.data;
      }
      // Guest cart
      const res = await fetch(`${API_CART}/checkout/cart`, {
        credentials: "include",
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Fetch cart failed: ${res.status}`);
      }
      const json = await res.json();
      return json.data;
    },
  });
}

export function usePrefetchProduct() {
  const qc = useQueryClient();
  return (id) =>
    qc.prefetchQuery({
      queryKey: ["product", id],
      queryFn: async () => {
        const r = await fetch(`${API_V1}/products/${id}`);
        if (!r.ok) throw new Error("404");
        const j = await r.json();
        if (!j?.data) throw new Error("Product not found");
        return j.data;
      },
    });
}

export function useCartMutations() {
  const qc = useQueryClient();
  const token = localStorage.getItem("token");

  // Add item with retry logic for server errors
  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1, ...rest }) => {
      // Ensure session is established first
      ensureSession();
      console.log("🔐 Session established, ensuring CSRF cookie...");
      
      if (token) {
        return axios.post(`/customer/cart/add/${productId}`, {
          is_buy_now: 0,
          product_id: productId,
          quantity,
          ...rest,
        });
      }
      
      // Simple guest cart request with session-based CSRF
      const requestBody = { product_id: productId, quantity };
      const requestUrl = `${API_CART}/checkout/cart`;
      
      console.log("🛒 Making cart request:", {
        url: requestUrl,
        method: "POST",
        body: requestBody,
        hasSessionCookie: document.cookie.includes('bagisto_session'),
        allCookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
      });
      
      const res = await fetch(requestUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("🛒 Cart response received:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        let errorMessage;
        try {
          const err = await res.json();
          console.error("🛒 Cart error response:", err);
          errorMessage = err?.message || err?.title || `Add failed: ${res.status}`;
        } catch (parseError) {
          console.error("🛒 Failed to parse error response:", parseError);
          errorMessage = `Add failed: ${res.status} ${res.statusText}`;
        }
        
        // If it's a 500 error, try to provide more helpful information
        if (res.status === 500) {
          console.error("🛒 Server Error Details:", {
            productId,
            quantity,
            requestUrl,
            requestBody,
            responseStatus: res.status,
            responseHeaders: Object.fromEntries(res.headers.entries()),
            hasSessionCookie: document.cookie.includes('bagisto_session'),
            userAgent: navigator.userAgent
          });
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log("🛒 Cart success response:", result);
      return result;
    },
    onSettled: () => qc.invalidateQueries(["cart"]),
  });

  // Update quantity
  const updateItemQuantity = useMutation({
    mutationFn: async ({ lineItemId, quantity }) => {
      ensureSession();
      await ensureCsrfCookie();
      if (token) {
        return axios.put("/customer/cart/update", {
          qty: { [lineItemId]: quantity },
        });
      }
      const csrf = getCsrfToken();
      const res = await fetch(`${API_CART}/checkout/cart`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": csrf,
        },
        body: JSON.stringify({ qty: { [lineItemId]: quantity } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Update failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  // Remove item
  const removeItem = useMutation({
    mutationFn: async (lineItemId) => {
      ensureSession();
      await ensureCsrfCookie();
      if (token) {
        return axios.delete(`/customer/cart/remove/${lineItemId}`);
      }
      const csrf = getCsrfToken();
      const res = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": csrf,
        },
        body: JSON.stringify({ _method: "DELETE", cart_item_id: lineItemId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Remove failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  return { addItem, updateItemQuantity, removeItem };
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code) => {
      ensureSession();
      await ensureCsrfCookie();
      const token = getCsrfToken();

      const res = await fetch(`${API_CART}/checkout/cart/coupon`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(`Apply coupon failed (${res.status})`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });
}
