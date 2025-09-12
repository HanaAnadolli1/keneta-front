// src/api/customerCheckout.js
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
      const res = await axios.get("/customer/get");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Get saved addresses
export function useSavedAddresses() {
  return useQuery({
    queryKey: ["savedAddresses"],
    queryFn: async () => {
      const res = await axios.get("/customer/addresses");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Save new address
export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addressData) => {
      console.log("Attempting to save address with data:", addressData);
      
      // Try different API endpoints and formats
      const endpoints = [
        "/customer/addresses",
        "/customer/address",
        "/customer/checkout/save-address"
      ];
      
      const formats = [
        addressData, // Direct data
        { address: addressData }, // Wrapped in address
        { billing: addressData }, // Wrapped in billing (like checkout)
        { data: addressData } // Wrapped in data
      ];
      
      // Also try FormData format
      const formData = new FormData();
      Object.entries(addressData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      
      for (const endpoint of endpoints) {
        for (const format of formats) {
          try {
            console.log(`Trying ${endpoint} with JSON format:`, format);
            const res = await axios.post(endpoint, format);
            console.log("Success with:", endpoint, format);
            return res.data;
          } catch (error) {
            console.log(`Failed ${endpoint} with JSON format:`, error.response?.status, error.response?.data);
            if (error.response?.status !== 422) {
              // If it's not a validation error, don't try other formats
              break;
            }
          }
        }
        
        // Try FormData for this endpoint
        try {
          console.log(`Trying ${endpoint} with FormData format`);
          const res = await axios.post(endpoint, formData);
          console.log("Success with FormData:", endpoint);
          return res.data;
        } catch (error) {
          console.log(`Failed ${endpoint} with FormData:`, error.response?.status, error.response?.data);
        }
      }
      
      throw new Error("All address saving attempts failed. Check console for details.");
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
      const res = await axios.put(`/customer/addresses/${id}`, addressData);
      return res.data;
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
      const res = await axios.delete(`/customer/addresses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["savedAddresses"]);
    },
  });
}
