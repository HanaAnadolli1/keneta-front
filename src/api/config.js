const DEV = import.meta.env.DEV;

export const API_ROOT = "https://admin.keneta-ks.com/api";
export const API_V2 = `${API_ROOT}/v2`; // ✅ stateless API with bearer tokens
export const API_V1 = API_V2; // Keep backward compatibility
export const API_CART = `${API_ROOT}`; // ✅
