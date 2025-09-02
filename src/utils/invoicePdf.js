// src/utils/invoicePdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ----- tiny format helpers -----
const safe = (v, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : v);
const d10 = (v) => (v ? String(v).slice(0, 10) : "—");

export const formatMoney = (amount, currency = "EUR") => {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

// Compute derived totals when backend doesn’t provide them
export function computeTotals(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const subtotal =
    items.reduce((sum, it) => sum + Number(it?.total ?? it?.row_total ?? (Number(it?.price || 0) * Number(it?.qty_ordered || it?.qty || 0))), 0) || 0;

  const shipping = Number(order?.shipping_amount ?? order?.shipping ?? 0);
  const tax = Number(order?.tax_amount ?? order?.tax ?? 0);
  const grand = Number(order?.grand_total ?? order?.total ?? subtotal + shipping + tax);

  return { subtotal, shipping, tax, grand };
}

// Build a jsPDF doc that resembles your screenshot
export function buildInvoicePdf({ invoice, order, shop = {} }) {
  const currency = order?.currency_code || order?.currency || shop?.currency || "EUR";
  const { subtotal, shipping, tax, grand } = computeTotals(order);

  const doc = new jsPDF({ unit: "pt", format: "a4" }); // points, A4
  const margin = 40;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(shop.name || "Invoice", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  y += 22;
  doc.text(`Invoice #${safe(invoice?.id)}`, margin, y); y += 16;
  doc.text(`Order #${safe(order?.id)}`, margin, y); y += 16;
  doc.text(`Date: ${d10(invoice?.created_at || order?.created_at)}`, margin, y);

  // Customer box (top-right)
  const rightX = 320;
  let ry = margin;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", rightX, ry);
  doc.setFont("helvetica", "normal");
  ry += 16;
  const fullName = `${safe(order?.customer_first_name, "")} ${safe(order?.customer_last_name, "")}`.trim() || "—";
  doc.text(fullName, rightX, ry); ry += 14;
  if (order?.customer_email) { doc.text(order.customer_email, rightX, ry); ry += 14; }
  if (order?.customer_phone) { doc.text(order.customer_phone, rightX, ry); ry += 14; }
  const addr = order?.shipping_address?.address1 || order?.billing_address?.address1 || "—";
  doc.text(String(addr), rightX, ry);

  // Items table
  const items = (order?.items || []).map((it) => ([
    safe(it?.sku || it?.product_sku || "—"),
    safe(it?.name || it?.product_name || "—"),
    formatMoney(it?.price, currency),
    String(it?.qty_ordered ?? it?.qty ?? 0),
    formatMoney(it?.total ?? it?.row_total ?? Number(it?.price || 0) * Number(it?.qty_ordered || it?.qty || 0), currency),
  ]));

  autoTable(doc, {
    startY: 200,
    head: [["SKU", "Name", "Price", "Qty", "Subtotal"]],
    body: items,
    styles: { fontSize: 10, cellPadding: 6, lineColor: [230,230,230], lineWidth: 0.6 },
    headStyles: { fillColor: [247, 248, 250], textColor: 20 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 210 },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 50 },
      4: { halign: "right", cellWidth: 90 },
    },
    margin: { left: margin, right: margin },
  });

  // Totals box (right)
  const tY = (doc.lastAutoTable?.finalY || 200) + 16;
  const line = (label, value, bold=false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, 335, (yline += 16));
    doc.text(value, 500, yline, { align: "right" });
  };

  let yline = tY;
  line("Subtotal", formatMoney(subtotal, currency));
  line("Shipping & Handling", formatMoney(shipping, currency));
  line("Tax", formatMoney(tax, currency));
  line("Grand Total", formatMoney(grand, currency), true);

  // Addresses & methods (bottom blocks)
  const bottomStart = yline + 28;
  const blocks = [
    ["Billing Address", order?.billing_address],
    ["Shipping Address", order?.shipping_address],
    ["Shipping Method", order?.shipping_method || "—"],
    ["Payment Method", order?.payment_method || "—"],
  ];
  const blockW = 250;
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = (i / 2) | 0;
    const bx = margin + col * (blockW + 30);
    const by = bottomStart + row * 90;

    doc.setDrawColor(235);
    doc.setLineWidth(1);
    doc.roundedRect(bx, by, blockW, 80, 6, 6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(String(b[0]), bx + 12, by + 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);

    const val = b[1];
    const lines = Array.isArray(val)
      ? val
      : typeof val === "object" && val
      ? [
          `${safe(val.first_name, "")} ${safe(val.last_name, "")}`.trim(),
          safe(val.address1),
          `${safe(val.city, "")} ${safe(val.postcode, "")}`.trim(),
          safe(val.country, ""),
          val.phone ? `Contact: ${val.phone}` : "",
        ].filter(Boolean)
      : [String(val)];

    let ly = by + 40;
    lines.forEach(line => { doc.text(line, bx + 12, ly); ly += 14; });
  });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(safe(shop.footer, "Thank you for your purchase!"), margin, 810);

  return doc;
}

// Open in a new tab for printing
export function openInvoicePdf(params) {
  const doc = buildInvoicePdf(params);
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener");
}

// Save directly
export function saveInvoicePdf(params) {
  const doc = buildInvoicePdf(params);
  const fileName = `invoice-${params?.invoice?.id ?? params?.order?.id ?? "download"}.pdf`;
  doc.save(fileName);
}
