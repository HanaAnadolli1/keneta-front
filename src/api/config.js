const DEV = import.meta.env.DEV;

export const API_ROOT = DEV ? "" : "https://keneta.laratest-app.com";
export const API_V1 = `${API_ROOT}/api/v1`;
export const API_CART = `${API_ROOT}/api`;
