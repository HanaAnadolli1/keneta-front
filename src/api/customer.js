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

// --- GDPR ---
export function getGdprRequests() {
  return apiFetch(`${API_V1}/customer/gdpr`);
}

export function createGdprRequest(payload) {
  // Expecting: { type: "update"|"delete", message: "..." }
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => form.append(k, v ?? ""));
  return apiFetch(`${API_V1}/customer/gdpr`, { method: "POST", body: form });
}

export function getGdprRequestById(id) {
  return apiFetch(`${API_V1}/customer/gdpr/${id}`);
}

export function revokeGdprRequest(id) {
  return apiFetch(`${API_V1}/customer/gdpr/revoke/${id}`, { method: "PUT" });
}


// --- Product reviews (by product) ---
export function getProductReviews(productId) {
  return apiFetch(`${API_V1}/products/${productId}/reviews`);
}
