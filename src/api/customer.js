// src/api/customer.js
import { API_V1 } from "./config";
import { apiFetch } from "./auth";

// Profile
export function getCustomer() {
  return apiFetch(`${API_V1}/customer/get`);
}

/**
 * Update customer profile.
 * Expects a FormData instance (send it directly from your form).
 * Uses real PUT with multipart/form-data (browser sets boundary automatically).
 */
export function updateCustomerProfile(formData) {
  if (!(formData instanceof FormData)) {
    throw new Error("updateCustomerProfile expects FormData");
  }

  // Spoof PUT so Laravel/Symfony parse multipart properly
  formData.append("_method", "PUT");

  return apiFetch(`${API_V1}/customer/profile`, {
    method: "POST",       // <-- POST, not PUT
    body: formData,       // <-- FormData; don't set Content-Type
  });
}


// Password reset (request email link)
export function requestPasswordReset(email) {
  const form = new FormData();
  form.append("email", email);
  return apiFetch(`${API_V1}/customer/forgot-password`, {
    method: "POST",
    body: form,
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
