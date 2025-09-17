const DEV = import.meta.env.DEV;

export const API_ROOT = DEV ? "" : "https://admin.keneta-ks.com/api";
export const API_V1 = `${API_ROOT}/v2`; // ✅ correct for production
export const API_CART = `${API_ROOT}`; // ✅
