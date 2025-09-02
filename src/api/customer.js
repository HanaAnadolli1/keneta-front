// src/api/customer.js
import { API_V1 } from "./config";
import { apiFetch } from "./auth";

/**
 * If your backend exposes a stable PDF route, set this env var:
 *   VITE_INVOICE_PDF_PATH_TEMPLATE=/customer/invoices/{id}/pdf
 * or (if full path includes /api/v1)
 *   VITE_INVOICE_PDF_PATH_TEMPLATE=/v1/customer/invoices/{id}/pdf
 *
 * Use {id} where the invoice id goes. Leading slash is optional.
 */
const PDF_PATH_TEMPLATE =
  import.meta?.env?.VITE_INVOICE_PDF_PATH_TEMPLATE || null;

// Helper to join base + path safely
function joinUrl(base, path) {
  if (!base) return path || "";
  if (!path) return base;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

// --- Profile ---
export function getCustomer() {
  return apiFetch(`${API_V1}/customer/get`);
}

/**
 * Update customer profile (multipart PUT via POST+_method).
 */
export function updateCustomerProfile(formData) {
  if (!(formData instanceof FormData)) {
    throw new Error("updateCustomerProfile expects FormData");
  }
  formData.append("_method", "PUT");
  return apiFetch(`${API_V1}/customer/profile`, {
    method: "POST",
    body: formData,
  });
}

// --- Password reset ---
export function requestPasswordReset(email) {
  const form = new FormData();
  form.append("email", email);
  return apiFetch(`${API_V1}/customer/forgot-password`, {
    method: "POST",
    body: form,
  });
}

// --- Invoices (JSON) ---
export function getInvoices(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = v;
      return acc;
    }, {})
  ).toString();
  return apiFetch(`${API_V1}/customer/invoices${qs ? `?${qs}` : ""}`);
}

export function getInvoiceById(id) {
  return apiFetch(`${API_V1}/customer/invoices/${id}`);
}

// If API already returns a direct URL in JSON, this resolves it.
function extractPdfUrlFromDetail(detail) {
  return (
    detail?.pdf_url ||
    detail?.download_url ||
    detail?.data?.pdf_url ||
    detail?.data?.download_url ||
    null
  );
}

/** Build a URL from the env template like /customer/invoices/{id}/pdf */
function buildPdfUrlFromTemplate(id) {
  if (!PDF_PATH_TEMPLATE) return null;
  const templ = PDF_PATH_TEMPLATE.replace("{id}", encodeURIComponent(id));
  // If the template starts with /v1/... we assume it's already API-relative.
  if (templ.startsWith("/v")) {
    return joinUrl(API_V1.replace(/\/v1$/, ""), templ); // handle API_V1 base
  }
  // Otherwise join with API base origin
  return joinUrl(API_V1.replace(/\/v1$/, ""), templ);
}

async function tryFetchPdf(url, { withAcceptHeader = true } = {}) {
  const headers = withAcceptHeader ? { Accept: "application/pdf" } : {};
  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const statusText = `${res.status} ${res.statusText}`;
    let serverMsg = "";
    try {
      const data = await res.clone().json();
      serverMsg = data?.message ? ` – ${data.message}` : "";
    } catch {
      try {
        const t = await res.clone().text();
        if (t) serverMsg = ` – ${t.slice(0, 200)}${t.length > 200 ? "…" : ""}`;
      } catch {}
    }
    throw new Error(`Download failed (${statusText})${serverMsg}`);
  }

  const blob = await res.blob();
  if (!blob || (blob.type && !blob.type.toLowerCase().includes("pdf"))) {
    throw new Error("The server responded, but it wasn't a PDF.");
  }
  return blob;
}

/**
 * Download invoice PDF, in this order:
 * 1) Check invoice JSON for a direct pdf_url/download_url
 * 2) If an env template is provided (VITE_INVOICE_PDF_PATH_TEMPLATE), use it
 * 3) Probe a few common patterns (may still fail on your backend)
 */
export async function downloadInvoicePdf(id) {
  // 1) check JSON for direct URL
  try {
    const detail = await getInvoiceById(id);
    console.debug("[invoice detail]", detail); // <-- helps discover fields
    const direct = extractPdfUrlFromDetail(detail);
    if (direct) return await tryFetchPdf(direct, { withAcceptHeader: false });
  } catch {
    // ignore, we’ll try others
  }

  // 2) env-configured template (recommended)
  const templUrl = buildPdfUrlFromTemplate(id);
  if (templUrl) {
    return await tryFetchPdf(templUrl, { withAcceptHeader: false });
  }

  // 3) last resort: probe common patterns
  const base = `${API_V1}/customer/invoices/${id}`;
  const candidates = [
    `${base}?download=1`,
    `${base}/download`,
    `${API_V1}/customer/invoices/download/${id}`,
    base, // with Accept: pdf
  ];

  const errors = [];
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const useAccept = i === candidates.length - 1;
      return await tryFetchPdf(url, { withAcceptHeader: useAccept });
    } catch (e) {
      errors.push(`${url.replace(API_V1, "/v1")}: ${e?.message || "unknown error"}`);
    }
  }

  throw new Error(
    "Invoice PDF download failed. Tried these endpoints:\n" + errors.join("\n")
  );
}

// --- Orders ---
export function getOrders() {
  return apiFetch(`${API_V1}/customer/orders`);
}

export function getOrderById(id) {
  return apiFetch(`${API_V1}/customer/orders/${id}`);
}

export function cancelOrder(id) {
  return apiFetch(`${API_V1}/customer/orders/${id}/cancel`, { method: "POST" });
}

// --- GDPR ---
export function getGdprRequests() {
  return apiFetch(`${API_V1}/customer/gdpr`);
}

export function createGdprRequest(payload) {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => form.append(k, v ?? ""));
  return apiFetch(`${API_V1}/customer/gdpr`, { method: "POST", body: form });
}

export function getGdprRequestById(id) {
  return apiFetch(`${API_V1}/customer/gdpr/${id}`);
}

export function revokeGdprRequest(id) {
  return apiFetch(`${API_V1}/customer/gdpr/revoke/${id}`, { method: "PUT" });
}

// --- Product reviews (by product) ---
export function getProductReviews(productId) {
  return apiFetch(`${API_V1}/products/${productId}/reviews`);
}
