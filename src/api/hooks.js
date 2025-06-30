// src/api/hooks.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { API_V1, API_CART } from "./config";

const PER_PAGE = 12;
const SESSION_COOKIE = "bagisto_session";
const SESSION_LENGTH = 40;

// ─── Session helpers ──────────────────────────────────────────────────────────
function generateSessionValue(len = SESSION_LENGTH) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

function ensureSession() {
  let sess = Cookies.get(SESSION_COOKIE);
  if (!sess) {
    sess = generateSessionValue();
    Cookies.set(SESSION_COOKIE, sess, { expires: 365, sameSite: "Lax" });
  }
  return sess;
}

// ─── Products list ────────────────────────────────────────────────────────────
export function useProducts(searchParams) {
  const key = ["products", searchParams.toString()];
  return useQuery({
    queryKey: key,
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams(searchParams);
      qs.set("limit", PER_PAGE); // ← correct param name
      const res = await fetch(`${API_V1}/products?${qs.toString()}`, {
        signal,
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    select: (json) => ({
      items: json.data || [],
      total: json.meta?.total ?? 0,
    }),
  });
}

// ─── Single product ───────────────────────────────────────────────────────────
export function useProduct(id) {
  return useQuery({
    enabled: !!id,
    queryKey: ["product", id],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_V1}/products/${id}`, { signal });
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    select: (json) => json.data,
  });
}

// ─── Cart contents ───────────────────────────────────────────────────────────
export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async ({ signal }) => {
      ensureSession();
      const res = await fetch(`${API_CART}/checkout/cart`, {
        credentials: "include",
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch cart");
      return res.json();
    },
    select: (json) => json.data,
  });
}

// ─── Prefetch helper ──────────────────────────────────────────────────────────
export function usePrefetchProduct() {
  const qc = useQueryClient();
  return (id) =>
    qc.prefetchQuery({
      queryKey: ["product", id],
      queryFn: () =>
        fetch(`${API_V1}/products/${id}`)
          .then((r) => r.json())
          .then((j) => j.data),
    });
}

// ─── Cart mutations ───────────────────────────────────────────────────────────
export function useCartMutations() {
  const qc = useQueryClient();

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1 }) => {
      ensureSession();
      const res = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Add to cart failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  const removeItem = useMutation({
    mutationFn: async (lineItemId) => {
      ensureSession();
      const res = await fetch(
        `${API_CART}/checkout/cart/remove/${lineItemId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) throw new Error("Remove from cart failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  const updateItemQuantity = useMutation({
    mutationFn: async ({ lineItemId, quantity }) => {
      ensureSession();
      if (quantity === 0) {
        const res = await fetch(
          `${API_CART}/checkout/cart/remove/${lineItemId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok) throw new Error("Remove from cart failed");
        return res.json();
      }
      const res = await fetch(`${API_CART}/checkout/cart/update`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          items: [{ cartItemId: lineItemId, quantity }],
        }),
      });
      if (!res.ok) throw new Error("Update cart failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  return { addItem, removeItem, updateItemQuantity };
}
