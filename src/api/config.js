const DEV = import.meta.env.DEV;

export const API_ROOT = DEV ? "" : "https://keneta.laratest-app.com/api";
export const API_V1 = `${API_ROOT}/v1`; // ✅ correct for production
export const API_CART = `${API_ROOT}`; // ✅
