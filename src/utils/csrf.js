// src/utils/csrf.js
import Cookies from "js-cookie";
import { API_ROOT } from "../api/config";

/**
 * 1️⃣ Hits Laravel Sanctum’s CSRF endpoint:
 *    GET /sanctum/csrf-cookie
 *    → sets XSRF-TOKEN + laravel_session cookies
 */
export async function ensureCsrfCookie() {
  try {
    console.log("🔐 Fetching CSRF cookie from:", `${API_ROOT}/sanctum/csrf-cookie`);
    const response = await fetch(`${API_ROOT}/sanctum/csrf-cookie`, {
      credentials: "include",
    });
    
    console.log("🔐 CSRF cookie response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      console.error("❌ Failed to fetch CSRF cookie:", response.status, response.statusText);
    }
    
    // Check if XSRF-TOKEN cookie was set
    const token = getCsrfToken();
    console.log("🔐 CSRF token after fetch:", token ? "Present" : "Missing");
    
    return response;
  } catch (error) {
    console.error("❌ Error fetching CSRF cookie:", error);
    throw error;
  }
}

/**
 * 2️⃣ Reads the plaintext XSRF-TOKEN cookie that Laravel issued.
 */
export function getCsrfToken() {
  const token = Cookies.get("XSRF-TOKEN") || "";
  console.log("🔐 Getting CSRF token:", {
    token: token ? "Present" : "Missing",
    tokenLength: token.length,
    allCookies: Object.keys(Cookies.get())
  });
  return token;
}
