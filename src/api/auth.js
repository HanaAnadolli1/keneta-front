// src/api/auth.js
import { API_V1 } from "../config";

/* ─────────────────────────────────────────────────────────── helpers ── */
function persistToken(json) {
  if (json?.token) localStorage.setItem("token", json.token);
  return json;
}

/* ─────────────────────────────────────────────────────────── register ─ */
export async function register(data) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  form.append("device_name", "react"); // device tag for the token

  const res = await fetch(`${API_V1}/customer/register`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(json.message || "Registration failed");
  return persistToken(json); // saves token → passes payload on
}

/* ─────────────────────────────────────────────────────────── login ──── */
export async function login({ email, password, device_name = "react" }) {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("device_name", device_name);

  const res = await fetch(`${API_V1}/customer/login`, {
    method: "POST",
    credentials: "include",
    body: form,
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(json.message || "Login failed");
  return persistToken(json);
}

/* ────────────────────────── convenience wrapper for authed fetch ───── */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error("API request failed");
  return res.json();
}
