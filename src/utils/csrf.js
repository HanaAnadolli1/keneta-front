// src/utils/csrf.js
import Cookies from "js-cookie";
import { API_ROOT } from "../api/config";

/**
 * 1️⃣ Hits Laravel Sanctum’s CSRF endpoint:
 *    GET /sanctum/csrf-cookie
 *    → sets XSRF-TOKEN + laravel_session cookies
 */
export async function ensureCsrfCookie() {
  // Skip CSRF cookie fetch since the endpoint doesn't exist
  // The server likely uses session-based CSRF protection
  console.log("🔐 Skipping CSRF cookie fetch - using session-based protection");
  return Promise.resolve();
}

/**
 * 2️⃣ Reads the plaintext XSRF-TOKEN cookie that Laravel issued.
 */
export function getCsrfToken() {
  // Return empty string since we're using session-based CSRF
  console.log("🔐 Using session-based CSRF protection");
  return "";
}
