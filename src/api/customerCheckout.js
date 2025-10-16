// src/api/customerCheckout.js
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import axios from "./axios";

export function useCustomerCheckoutAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ billing, shipping }) => {
      // First save the address using the customer API
      const res = await axios.post("/customer/checkout/save-address", {
        billing,
        shipping,
      });

      console.log("Customer checkout address API response:", res.data);

      // The customer save-address API doesn't return shipping methods
      // We'll return empty object and let the main checkout logic handle shipping methods
      console.log(
        "Customer address saved successfully, shipping methods will be handled separately"
      );
      return {};
    },
    onSuccess: () => qc.invalidateQueries(["checkoutSummary"]),
  });
}

// Get available shipping methods for customers
export function useCustomerShippingMethods() {
  return useQuery({
    queryKey: ["customerShippingMethods"],
    queryFn: async () => {
      const res = await axios.get("/customer/cart");
      console.log("CustomerShippingMethods - Cart API response:", res.data);
      console.log(
        "CustomerShippingMethods - Full cart structure:",
        JSON.stringify(res.data, null, 2)
      );

      const cartData = res.data?.data || res.data;

      // Look for shipping methods in various possible locations
      const shippingMethods =
        cartData?.shipping_methods ||
        cartData?.available_shipping_methods ||
        cartData?.shipping_methods_available ||
        cartData?.shipping_options ||
        cartData?.shipping ||
        res.data?.shipping_methods ||
        res.data?.available_shipping_methods ||
        {};

      console.log(
        "CustomerShippingMethods - Extracted shipping methods:",
        shippingMethods
      );

      // If no shipping methods in cart, try dedicated endpoint
      if (Object.keys(shippingMethods).length === 0) {
        try {
          const shippingRes = await axios.get(
            "/customer/checkout/shipping-methods"
          );
          console.log(
            "CustomerShippingMethods - Direct shipping API response:",
            shippingRes.data
          );
          return shippingRes.data?.data || shippingRes.data || {};
        } catch (error) {
          console.error(
            "CustomerShippingMethods - Error fetching direct shipping:",
            error
          );
        }
      }

      return shippingMethods;
    },
    enabled: false, // Only run when manually triggered
    staleTime: 0,
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

// Check minimum order value
export function useCheckMinimumOrder() {
  return useQuery({
    queryKey: ["checkMinimumOrder"],
    queryFn: async () => {
      const res = await axios.post("/customer/checkout/check-minimum-order");
      return res.data;
    },
    enabled: false, // Only run when manually triggered
  });
}

// Get customer profile for autofill
export function useCustomerProfile() {
  return useQuery({
    queryKey: ["customerProfile"],
    queryFn: async () => {
      const { getCustomer } = await import("./customer");
      return await getCustomer();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Get saved addresses
export function useSavedAddresses() {
  return useQuery({
    queryKey: ["savedAddresses"],
    queryFn: async () => {
      const { getAddresses } = await import("./customer");
      return await getAddresses();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Save new address
export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addressData) => {
      // Use the existing createAddress function from customer.js
      const { createAddress } = await import("./customer");
      return await createAddress(addressData);
    },
    onSuccess: () => {
      qc.invalidateQueries(["savedAddresses"]);
    },
  });
}

// Update existing address
export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, addressData }) => {
      const { updateAddress } = await import("./customer");
      return await updateAddress(id, addressData);
    },
    onSuccess: () => {
      qc.invalidateQueries(["savedAddresses"]);
    },
  });
}

// Delete address
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { deleteAddress } = await import("./customer");
      return await deleteAddress(id);
    },
    onSuccess: () => {
      qc.invalidateQueries(["savedAddresses"]);
    },
  });
}
