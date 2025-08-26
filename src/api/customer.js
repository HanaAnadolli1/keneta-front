// src/api/customer.js
import { API_V1 } from "./config";
import { apiFetch } from "./auth";

// Profile
export function getCustomer() {
  return apiFetch(`${API_V1}/customer/get`);
}

export function updateCustomerProfile(payload) {
  // payload can include text fields + image[] (File)
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(f => form.append(`${k}[]`, f));
    else form.append(k, v ?? "");
  });

  return apiFetch(`${API_V1}/customer/profile`, {
    method: "POST",
    body: form
  });
}

// Password reset (request email link)
export function requestPasswordReset(email) {
  const form = new FormData();
  form.append("email", email);
  return apiFetch(`${API_V1}/customer/forgot-password`, {
    method: "POST",
    body: form
  });
}

// Orders
export function getOrders() {
  return apiFetch(`${API_V1}/customer/orders`);
}

export function getOrderById(id) {
  return apiFetch(`${API_V1}/customer/orders/${id}`);
}

export function cancelOrder(id) {
  return apiFetch(`${API_V1}/customer/orders/${id}/cancel`, { method: "POST" });
}
