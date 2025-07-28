// src/api/customerCheckout.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "./axios";

export function useCustomerCheckoutAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billing) => {
      const res = await axios.post("/customer/checkout/save-address", {
        billing,
      });

      // Debug log — helpful during development
      console.log("✅ Address Response:", res.data);

      // ✅ Bagisto usually returns shipping methods under data.shippingMethods
      return res.data?.shippingMethods || res.data?.data?.shippingMethods || {};
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

export function useCustomerCheckoutShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipping_method) => {
      const res = await axios.post("/customer/checkout/save-shipping", {
        shipping_method,
      });

      // Debug log
      console.log("✅ Shipping Method Response:", res.data);

      // ✅ Return only payment methods array expected by PaymentOptions.jsx
      return res.data?.payment_methods || res.data?.data?.payment_methods || [];
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

export function useCustomerCheckoutPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payment) => {
      const method = typeof payment === "string" ? payment : payment.method;
      return axios
        .post("/customer/checkout/save-payment", { payment: { method } })
        .then((res) => res.data);
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

export function useCustomerPlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      axios.post("/customer/checkout/save-order").then((res) => res.data),
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}
