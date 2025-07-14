// src/api/checkout.js
import { useMutation } from "@tanstack/react-query";
import { API_CART } from "./config";
import { ensureSession } from "./hooks";
import { ensureCsrfCookie, getCsrfToken } from "../utils/csrf";

const BASE = `${API_CART}/checkout/onepage`;

export function useCheckoutAddress() {
  return useMutation({
    mutationFn: async (billing) => {
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
      const { data } = await res.json();
      return data.shippingMethods; // { flatrate: { rates: [...] }, free: {...} }
    },
  });
}

export function useCheckoutShippingMethod() {
  return useMutation({
    mutationFn: async (shipping_method) => {
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
      return json.payment_methods; // [ { method, method_title, … }, … ]
    },
  });
}

export function useCheckoutPaymentMethod() {
  return useMutation({
    mutationFn: async (payment) => {
      ensureSession();
      await ensureCsrfCookie();
      const token = getCsrfToken();
      const method = typeof payment === "string" ? payment : payment.method;
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
      return res.json(); // you usually don't need the body here
    },
  });
}

export function usePlaceOrder() {
  return useMutation({
    mutationFn: async () => {
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
    },
  });
}
