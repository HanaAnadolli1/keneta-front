// src/api/config.js
const DEV = import.meta.env.DEV;

export const API_ROOT = DEV
  ? "" // Vite proxy handles API in dev
  : "/api"; // Vercel rewrites /api to real API in prod

export const API_V1 = `${API_ROOT}/api/v1`;
export const API_CART = `${API_ROOT}/api`;
