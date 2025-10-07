import { useQuery } from "@tanstack/react-query";
import { buildApiHeaders } from "../utils/apiHelpers";

// Treat date-only (YYYY-MM-DD) as inclusive end-of-day
const withinRange = (from, to) => {
  const now = new Date();
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if (start && now < start) return false;
  if (end) {
    if (!/\dT\d/.test(String(to))) end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }
  return true;
};

// Try to read special-from/to from details or a variant
const extractDates = (details) => {
  if (!details) return { from: null, to: null };
  let from = details.special_price_from ?? null;
  let to = details.special_price_to ?? null;

  const v = details.variants;
  if (!from && !to && v) {
    if (Array.isArray(v)) {
      const first = v[0];
      from = first?.special_price_from ?? null;
      to = first?.special_price_to ?? null;
    } else if (typeof v === "object") {
      from = v.special_price_from ?? null;
      to = v.special_price_to ?? null;
    }
  }
  return { from, to };
};

/**
 * Frontend-only sale evaluator:
 * - Fetches PDP once per product id
 * - Only shows sale if (regular > price) AND (now within PDP date window)
 * - Returns labels to render on the card safely
 */
export default function useSaleFlag(product, { apiBase } = {}) {
  const id = product?.id ? Number(product.id) : null;
  const base = apiBase || "/api/v2"; // <-- set to your base if different

  const { data } = useQuery({
    queryKey: ["product-detail", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${base}/products/${id}`, { 
        headers: buildApiHeaders() 
      });
      if (!res.ok) throw new Error("Product load failed");
      return res.json();
    },
  });

  const details = data?.data;

  const regular = Number(product?.regular_price ?? 0);
  const special = Number(product?.special_price ?? 0);
  const effective = Number(product?.price ?? 0);
  
  // Check if there's a special price available
  const hasSpecialPrice = product?.formatted_special_price && special > 0;
  const priceSaysSale = regular > 0 && (special > 0 ? special < regular : effective < regular);

  const { from, to } = extractDates(details);
  const haveDates = Boolean(from || to);

  // Show sale if we have special price OR if price is less than regular (with dates)
  const saleActive = hasSpecialPrice || (haveDates ? priceSaysSale && withinRange(from, to) : false);

  const pct =
    saleActive && regular > 0
      ? Math.round(((regular - (special || effective)) / regular) * 100)
      : null;

  // Show strikethrough if we have special price and regular price
  const hasStrike = 
    saleActive && 
    regular > 0 && 
    (special > 0 || (product?.formatted_special_price && effective < regular));

  const priceLabel = saleActive
    ? product?.formatted_special_price || product?.formatted_price
    : product?.formatted_regular_price || product?.formatted_price;

  // Create formatted regular price if it doesn't exist
  const strikeLabel = hasStrike 
    ? product?.formatted_regular_price || `€${regular.toFixed(2)}`
    : null;

  return { saleActive, pct, hasStrike, priceLabel, strikeLabel };
}
