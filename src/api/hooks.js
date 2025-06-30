// src/hooks.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";

const API_V1 = "/api/v1";
const API_CART = "/api";
const PER_PAGE = 12;

const SESSION_COOKIE = "bagisto_session";
const SESSION_LENGTH = 40;

// ─── SESSION HELPERS ───────────────────────────────────────────────────────────
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

// ─── QUERY: products list ───────────────────────────────────────────────────────
export function useProducts(searchParams) {
  const key = ["products", searchParams.toString()];
  return useQuery({
    queryKey: key,
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams(searchParams);
      qs.set("per_page", PER_PAGE);
      // optional sort
      const res = await fetch(`${API_V1}/products?sort=id&${qs}`, { signal });
      if (!res.ok) throw new Error("network");
      return res.json();
    },
    select: (json) => ({
      items: json.data || [],
      total:
        json?.meta?.pagination?.total ??
        json?.meta?.pagination?.total_items ??
        json?.meta?.total ??
        0,
    }),
  });
}

// ─── QUERY: single product ─────────────────────────────────────────────────────
export function useProduct(id) {
  return useQuery({
    enabled: !!id,
    queryKey: ["product", id],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_V1}/products/${id}`, { signal });
      if (!res.ok) throw new Error("404");
      return res.json();
    },
    select: (json) => json.data,
  });
}

// ─── QUERY: cart contents ──────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error("network");
      return res.json();
    },
    select: (json) => json.data,
  });
}

// ─── PREFETCH HELPER ───────────────────────────────────────────────────────────
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

// ─── MUTATIONS: add, remove, update cart ──────────────────────────────────────
export function useCartMutations() {
  const qc = useQueryClient();

  const addItem = useMutation(
    async ({ productId, quantity = 1 }) => {
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
        const txt = await res.text();
        throw new Error(`add failed: ${res.status} ${txt}`);
      }
      return res.json();
    },
    { onSuccess: () => qc.invalidateQueries(["cart"]) }
  );

  const removeItem = useMutation(
    async (lineItemId) => {
      ensureSession();
      const res = await fetch(
        `${API_CART}/checkout/cart/remove/${lineItemId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) throw new Error("remove failed");
      return res.json();
    },
    { onSuccess: () => qc.invalidateQueries(["cart"]) }
  );

  const updateItemQuantity = useMutation(
    async ({ lineItemId, quantity }) => {
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
        if (!res.ok) throw new Error("remove failed");
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
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    { onSuccess: () => qc.invalidateQueries(["cart"]) }
  );

  return { addItem, removeItem, updateItemQuantity };
}
