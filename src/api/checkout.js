import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_CART } from "./config";
import { ensureSession } from "./hooks";
import { ensureCsrfCookie, getCsrfToken } from "../utils/csrf";
import axios from "./axios";

const BASE = `${API_CART}/checkout/onepage`;

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// --- Address ---
export function useCheckoutAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billing) => {
      if (isLoggedIn()) {
        const res = await axios.post("/customer/checkout/save-address", {
          billing,
        });
        return res.data.shippingMethods;
      } else {
        ensureSession();
        await ensureCsrfCookie();
        const token = getCsrfToken();
        const res = await fetch(`${BASE}/addresses`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-XSRF-TOKEN": token,
          },
          body: JSON.stringify({ billing }),
        });
        if (!res.ok) throw new Error(`Address step failed (${res.status})`);
        const json = await res.json();
        return json.data.shippingMethods;
      }
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

// --- Shipping Method ---
export function useCheckoutShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipping_method) => {
      if (isLoggedIn()) {
        const res = await axios.post("/customer/checkout/save-shipping", {
          shipping_method,
        });
        return res.data.payment_methods;
      } else {
        ensureSession();
        await ensureCsrfCookie();
        const token = getCsrfToken();
        const res = await fetch(`${BASE}/shipping-methods`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-XSRF-TOKEN": token,
          },
          body: JSON.stringify({ shipping_method }),
        });
        if (!res.ok) throw new Error(`Shipping step failed (${res.status})`);
        const json = await res.json();
        return json.payment_methods;
      }
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

// --- Payment Method ---
export function useCheckoutPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment) => {
      const method = typeof payment === "string" ? payment : payment.method;
      if (isLoggedIn()) {
        const res = await axios.post("/customer/checkout/save-payment", {
          payment: { method },
        });
        return res.data;
      } else {
        ensureSession();
        await ensureCsrfCookie();
        const token = getCsrfToken();
        const res = await fetch(`${BASE}/payment-methods`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-XSRF-TOKEN": token,
          },
          body: JSON.stringify({ payment: { method } }),
        });
        if (!res.ok) throw new Error(`Payment step failed (${res.status})`);
        return res.json();
      }
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

// --- Place Order ---
export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isLoggedIn()) {
        const res = await axios.post("/customer/checkout/save-order");
        return res.data;
      } else {
        ensureSession();
        await ensureCsrfCookie();
        const token = getCsrfToken();
        const res = await fetch(`${BASE}/orders`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-XSRF-TOKEN": token,
          },
        });
        if (!res.ok) throw new Error(`Place order failed (${res.status})`);
        return res.json();
      }
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

// --- Get Cart Summary ---
export function useCheckoutSummary() {
  return useQuery({
    queryKey: ["checkoutSummary"],
    queryFn: async () => {
      if (isLoggedIn()) {
        const res = await axios.get("/customer/cart");
        return res.data.data;
      } else {
        ensureSession();
        const res = await fetch(`${BASE}/summary`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Summary failed (${res.status})`);
        const json = await res.json();
        return json.data;
      }
    },
    staleTime: 0,
  });
}

// --- Apply Coupon ---
export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code) => {
      if (isLoggedIn()) {
        const res = await axios.post("/customer/cart/coupon", { code });
        return res.data;
      } else {
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
      }
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}
