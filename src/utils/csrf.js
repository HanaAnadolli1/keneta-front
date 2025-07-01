// src/utils/csrf.js

/** generate a random alphanumeric string */
export function generateToken(length = 40) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** if no XSRF-TOKEN cookie exists, create one */
export function ensureCsrfCookie() {
  if (!document.cookie.includes("XSRF-TOKEN=")) {
    const token = generateToken();
    // Path=/ and no Secure flag so it works on localhost over http
    document.cookie = `XSRF-TOKEN=${encodeURIComponent(
      token
    )}; Path=/; SameSite=Lax`;
  }
}

/** read the XSRF-TOKEN cookie back out */
export function getCsrfToken() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
