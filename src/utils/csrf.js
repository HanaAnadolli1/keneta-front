// src/utils/csrf.js
import Cookies from "js-cookie";
import { API_ROOT } from "../api/config";

/**
 * 1️⃣ Hits /sanctum/csrf-cookie (credentials: include)
 *    → Sets XSRF-TOKEN cookie + laravel_session cookie.
 */
export async function ensureCsrfCookie() {
  await fetch(`${API_ROOT}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
}

/**
 * 2️⃣ Reads the plaintext XSRF-TOKEN cookie that Laravel issued.
 */
export function getCsrfToken() {
  return Cookies.get("XSRF-TOKEN") || "";
}
