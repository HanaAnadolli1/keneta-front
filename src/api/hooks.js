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
      
      // For guest cart, ensure CSRF cookie is available
      try {
        await ensureCsrfCookie();
      } catch (error) {
        console.error("❌ Failed to ensure CSRF cookie:", error);
        throw new Error("Failed to establish secure session for cart operations");
      }
      
      // Retry logic for guest cart (max 2 retries for 500 errors)
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          let csrf = getCsrfToken();
          
          // Fetch CSRF token if missing or on retry attempts
          if (!csrf || attempt > 1) {
            console.log(`🔄 ${!csrf ? 'Fetching' : 'Refreshing'} CSRF token (attempt ${attempt}/3)...`);
            try {
              await ensureCsrfCookie();
              const newCsrf = getCsrfToken();
              if (newCsrf) {
                csrf = newCsrf;
                console.log("✅ CSRF token obtained successfully");
              } else {
                console.error("❌ CSRF token still missing after fetch attempt");
                throw new Error("Unable to obtain CSRF token");
              }
            } catch (csrfError) {
              console.error("❌ Failed to fetch CSRF token:", csrfError);
              throw new Error("CSRF token is required for cart operations");
            }
          }
          
          // Final validation
          if (!csrf) {
            console.error("❌ No CSRF token available after all attempts");
            throw new Error("CSRF token is required for cart operations");
          }
          
          const res = await fetch(`${API_CART}/checkout/cart`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "X-XSRF-TOKEN": csrf,
            },
            body: JSON.stringify({ product_id: productId, quantity }),
          });
          
          console.log("🛒 Guest Cart API Response:", {
            status: res.status,
            statusText: res.statusText,
            url: `${API_CART}/checkout/cart`,
            headers: Object.fromEntries(res.headers.entries()),
            productId,
            quantity,
            attempt
          });
          
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            console.error("❌ Guest Cart API Error:", {
              status: res.status,
              statusText: res.statusText,
              error: err,
              productId,
              quantity,
              attempt,
              csrfToken: csrf ? "Present" : "Missing",
              sessionCookie: document.cookie.includes('bagisto_session') ? "Present" : "Missing"
            });
            
            // If it's a 500 error and we have retries left, continue the loop
            if (res.status === 500 && attempt < 3) {
              lastError = new Error(`Server error (attempt ${attempt}/3)`);
              // Wait 1 second before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            // Provide more specific error messages based on status code
            let errorMessage = err?.message || `Add failed: ${res.status}`;
            if (res.status === 500) {
              errorMessage = "Server error occurred while adding item to cart. Please try again later.";
            } else if (res.status === 404) {
              errorMessage = "Product not found or no longer available.";
            } else if (res.status === 422) {
              errorMessage = "Invalid product data. Please refresh and try again.";
            } else if (res.status === 401 || res.status === 403) {
              errorMessage = "Session expired. Please refresh the page and try again.";
            }
            
            throw new Error(errorMessage);
          }
          
          // Success! Return the response
          return res.json();
          
        } catch (error) {
          lastError = error;
          // If it's not a 500 error or we've exhausted retries, throw immediately
          if (!error.message.includes('500') || attempt >= 3) {
            throw error;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error("Failed to add item to cart after multiple attempts");
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
