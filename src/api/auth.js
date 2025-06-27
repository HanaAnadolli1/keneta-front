import { API_V1 } from "./config";

function persistToken(json) {
  if (json?.token) localStorage.setItem("token", json.token);
  return json;
}

/**
 * Generate a random hexadecimal string (default 60 chars).
 * Mirrors Laravel's default token column size so it fits directly.
 */
function randomToken(len = 60) {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─────────────────────────────────────────────────────────── register ─ */
export async function register(data) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));

  // add the two tokens Laravel expects to persist on the `customers` table
  form.append("api_token", randomToken());
  form.append("token", randomToken());

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
