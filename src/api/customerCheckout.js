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

      const shippingData = res.data?.data;
      const methods =
        shippingData?.rates || shippingData?.shippingMethods || {};

      return methods;
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

export function useCustomerCheckoutShippingMethod() {
  return useMutation({
    mutationFn: async (shippingMethod) => {
      const res = await axios.post("/customer/checkout/save-shipping", {
        shipping_method: shippingMethod,
      });

      const methods = res.data?.data?.methods || [];

      return methods;
    },
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
