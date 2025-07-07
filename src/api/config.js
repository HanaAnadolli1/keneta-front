const DEV = import.meta.env.DEV;

export const API_ROOT = DEV ? "" : "/api";
export const API_V1 = `${API_ROOT}/v1`; // ✅ correct for Vercel
export const API_CART = `${API_ROOT}`; // ✅
