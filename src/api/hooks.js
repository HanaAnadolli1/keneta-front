// src/api/hooks.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ensureCsrfCookie, getCsrfToken } from "../utils/csrf";
import { API_V1, API_CART } from "./config";

const PER_PAGE = 12;

/** ── Products list ───────────────────────────────────────────────────── */
export function useProducts(searchParams) {
  return useQuery({
    queryKey: ["products", searchParams.toString()],
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams(searchParams);
      qs.set("limit", PER_PAGE);
      const res = await fetch(`${API_V1}/products?${qs}`, {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Fetch products failed: ${res.status} ${err}`);
      }
      const json = await res.json();
      return {
        items: json.data || [],
        total: json.meta?.total ?? 0,
      };
    },
  });
}

/** ── Single product ──────────────────────────────────────────────────── */
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

/** ── Cart contents ───────────────────────────────────────────────────── */
export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      // (optional) you could await ensureCsrfCookie() here if your API requires it on GETs
      const res = await fetch(`${API_CART}/checkout/cart`, {
        credentials: "include",
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

/** ── Prefetch single product ─────────────────────────────────────────── */
export function usePrefetchProduct() {
  const qc = useQueryClient();
  return (id) =>
    qc.prefetchQuery({
      queryKey: ["product", id],
      queryFn: () =>
        fetch(`${API_V1}/products/${id}`)
          .then((r) => {
            if (!r.ok) throw new Error("404");
            return r.json();
          })
          .then((j) => {
            if (!j?.data) throw new Error("Product not found");
            return j.data;
          }),
    });
}

/** ── Cart mutations ──────────────────────────────────────────────────── */
export function useCartMutations() {
  const qc = useQueryClient();

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1 }) => {
      // 1️⃣ ensure we have the real CSRF cookie
      await ensureCsrfCookie();

      // 2️⃣ grab the token
      const token = getCsrfToken();

      // 3️⃣ send the POST
      const res = await fetch(`${API_CART}/checkout/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ product_id: productId, quantity }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Add failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  const updateItemQuantity = useMutation({
    mutationFn: async ({ lineItemId, quantity }) => {
      await ensureCsrfCookie();
      const token = getCsrfToken();

      if (quantity === 0) {
        const r = await fetch(
          `${API_CART}/checkout/cart/remove/${lineItemId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "X-XSRF-TOKEN": token,
            },
          }
        );
        if (!r.ok) throw new Error(`Remove failed: ${r.status}`);
        return r.json();
      }

      const res = await fetch(`${API_CART}/checkout/cart/update`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          items: [{ cartItemId: lineItemId, quantity }],
        }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["cart"]),
  });

  return { addItem, updateItemQuantity };
}
