// src/api/auth.js
import { API_V1 } from "./config";
import axios from "./axios";

// Store token and return the user
function persistToken(json) {
  if (json?.token) {
    localStorage.setItem("token", json.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${json.token}`;
  }
  return json.data ?? json;
}

// Utility: Check if customer is logged in
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// Utility: Log out customer
export function logout() {
  localStorage.removeItem("token");
  delete axios.defaults.headers.common["Authorization"];
}

// --- Helpers ---
async function parseResponse(res) {
  const text = await res.text();
  try {
    return { data: JSON.parse(text), raw: text };
  } catch {
    return { data: null, raw: text };
  }
}

function buildHeaders(baseHeaders = {}, hasFormData) {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    // Only add JSON Content-Type if NOT sending FormData and caller didn't set it
    ...(hasFormData ? {} : baseHeaders["Content-Type"] ? {} : {}),
    ...(baseHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Register a new customer
export async function register(data) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  form.append("device_name", "react");

  const res = await fetch(`${API_V1}/customer/register`, {
    method: "POST",
    headers: { Accept: "application/json" }, // don't set Content-Type for FormData
    body: form,
  });

  const { data: json, raw } = await parseResponse(res);
  if (!res.ok) throw new Error(json?.message || raw || "Registration failed");
  return persistToken(json);
}

// Login an existing customer
export async function login({ email, password, device_name = "react" }) {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("device_name", device_name);

  const res = await fetch(`${API_V1}/customer/login`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body: form,
  });

  const { data: json, raw } = await parseResponse(res);
  if (!res.ok) {
    logout();
    throw new Error(json?.message || raw || "Login failed");
  }
  return persistToken(json);
}

// Authenticated API call wrapper
export async function apiFetch(url, options = {}) {
  const { body, headers = {}, ...rest } = options;
  const isForm = body instanceof FormData;

  const res = await fetch(url, {
    ...rest,
    // Don’t force Content-Type for FormData; leave boundary to the browser
    headers: buildHeaders(headers, isForm),
    // If callers pass a plain object body, they should JSON.stringify it themselves.
    // We keep it simple: pass-through whatever they provide.
    body,
  });

  const { data: json, raw } = await parseResponse(res);

  if (!res.ok) {
    // Prefer API message, then raw text, then status text
    const msg = json?.message || raw || res.statusText || "API request failed";
    throw new Error(msg);
  }

  // Normalize `{ data: ... }` responses
  if (json && typeof json === "object") {
    return json.data ?? json;
  }
  // Non-JSON responses
  return raw;
}

// Fetch current logged-in user
export async function fetchCurrentUser() {
  return apiFetch(`${API_V1}/customer/get`);
}
