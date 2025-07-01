// src/api/auth.js
import { API_V1 } from "./config";

/**
 * Save token to localStorage (if present) and return the actual user object.
 */
function persistTokenAndExtractUser(json) {
  if (json?.token) {
    localStorage.setItem("token", json.token);
  }
  // Laravel wraps your user in `data`, so unwrap it.
  return json.data ?? json;
}

/**
 * Generate a random hex token (to mirror Laravel’s api_token length).
 */
function randomToken(len = 60) {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Register a new customer.
 * Returns the user object.
 */
export async function register(data) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));

  // Laravel expects both api_token & token on your customers table:
  form.append("api_token", randomToken());
  form.append("token", randomToken());
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

  return persistTokenAndExtractUser(json);
}

/**
 * Log in an existing customer.
 * Returns the user object.
 */
export async function login({ email, password, device_name = "react" }) {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("device_name", device_name);

  const res = await fetch(`${API_V1}/customer/login`, {
    method: "POST",
    credentials: "include", // if you rely on cookies
    headers: { Accept: "application/json" },
    body: form,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.message || "Login failed");
  }

  return persistTokenAndExtractUser(json);
}

/**
 * A convenience wrapper for authenticated fetches.
 * Automatically adds Authorization header and unwraps { data }.
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
