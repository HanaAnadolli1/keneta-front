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
      headers: Object.fromEntries(response.headers.entries()),
      setCookieHeader: response.headers.get('set-cookie')
    });
    
    if (!response.ok) {
      console.error("❌ Failed to fetch CSRF cookie:", response.status, response.statusText);
    }
    
    // Check if XSRF-TOKEN cookie was set
    const token = getCsrfToken();
    console.log("🔐 CSRF token after fetch:", token ? "Present" : "Missing");
    
    // Also try to get the response body to see if there's any error info
    try {
      const responseText = await response.text();
      console.log("🔐 CSRF endpoint response body:", responseText.substring(0, 200));
    } catch (e) {
      console.log("🔐 Could not read CSRF response body:", e.message);
    }
    
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
  // Try multiple possible cookie names
  const possibleNames = ["XSRF-TOKEN", "XSRF_TOKEN", "csrf_token", "laravel_session"];
  let token = "";
  let foundName = "";
  
  for (const name of possibleNames) {
    const value = Cookies.get(name);
    if (value && name === "XSRF-TOKEN") {
      token = value;
      foundName = name;
      break;
    } else if (value && name === "laravel_session") {
      // For laravel_session, we might need to extract token differently
      console.log("🔐 Found laravel_session cookie:", value.substring(0, 20) + "...");
    }
  }
  
  console.log("🔐 Getting CSRF token:", {
    token: token ? "Present" : "Missing",
    tokenLength: token.length,
    foundInCookie: foundName,
    allCookies: Object.keys(Cookies.get()),
    cookieValues: Object.keys(Cookies.get()).reduce((acc, key) => {
      acc[key] = Cookies.get(key).substring(0, 20) + "...";
      return acc;
    }, {})
  });
  
  return token;
}
