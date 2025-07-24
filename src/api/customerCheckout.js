// src/api/customerCheckout.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "./axios";

export function useCustomerCheckoutAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (billing) =>
      axios
        .post("/customer/checkout/save-address", { billing })
        .then((res) => res.data),
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

export function useCustomerCheckoutShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipping_method) =>
      axios
        .post("/customer/checkout/save-shipping", { shipping_method })
        .then((res) => res.data),
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
