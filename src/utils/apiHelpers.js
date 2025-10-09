// src/utils/apiHelpers.js
// Utility functions for API calls with bearer token authentication

/**
 * Build headers with bearer token if available
 * @returns {Object} Headers object with Accept and optional Authorization
 */
export function buildApiHeaders() {
  const headers = { Accept: "application/json" };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Make a fetch request with bearer token authentication
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options (will be merged with headers)
 * @returns {Promise<Response>} The fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const headers = buildApiHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

/**
 * Check if user is authenticated (has token)
 * @returns {boolean} True if user has a token
 */
export function isAuthenticated() {
  return !!localStorage.getItem("token");
}
