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

// Register a new customer
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
  if (!res.ok) throw new Error(json.message || "Registration failed");
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

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logout(); // Clear any existing tokens
    throw new Error(json.message || "Login failed");
  }

  return persistToken(json);
}

// Authenticated API call wrapper
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || "API request failed");
  return json.data ?? json;
}

// Fetch current logged-in user
export async function fetchCurrentUser() {
  return apiFetch(`${API_V1}/customer/get`);
}