// src/api/auth.js
import { API_V1 } from "./config";

/**
 * Save token to localStorage (if present) and return the unwrapped payload.
 * If the server wrapped your user in `data`, this returns json.data.
 */
function persistToken(json) {
  if (json?.token) {
    localStorage.setItem("token", json.token);
  }
  return json.data ?? json;
}

/**
 * Register a new customer.
 * Resolves to your user object.
 */
export async function register(data) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  form.append("device_name", "react");

  const res = await fetch(`${API_V1}/customer/register`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || "Registration failed");
  }

  return persistToken(json);
}

/**
 * Log in an existing customer.
 * Resolves to your user object.
 */
export async function login({ email, password, device_name = "react" }) {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("device_name", device_name);

  const res = await fetch(`${API_V1}/customer/login`, {
    method: "POST",
    credentials: "include", // if you’re using cookies
    headers: { Accept: "application/json" },
    body: form,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || "Login failed");
  }

  return persistToken(json);
}

/**
 * Convenience wrapper for authenticated fetches.
 * Adds the Bearer header, unwraps `data`, and throws on errors using `json.message`.
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || "API request failed");
  }

  return json.data ?? json;
}

/**
 * Fetch the currently authenticated user.
 * Your AuthContext can call this on mount to rehydrate state.
 */
export async function fetchCurrentUser() {
  return apiFetch(`${API_V1}/customer/me`);
}
