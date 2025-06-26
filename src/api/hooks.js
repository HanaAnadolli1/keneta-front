import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_V1, API_CART } from "./config";

const PER_PAGE = 12;

/* ───── products list ─────────────────────────────────────────── */
export function useProducts(searchParams) {
  const key = ["products", searchParams.toString()];

  return useQuery({
    queryKey: key,
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams(searchParams);
      qs.set("per_page", PER_PAGE);
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

/* ───── single product ────────────────────────────────────────── */
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

/* ───── cart contents ─────────────────────────────────────────── */
export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async ({ signal }) => {
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

/* ───── tiny helper for link / hover prefetch ─────────────────── */
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
