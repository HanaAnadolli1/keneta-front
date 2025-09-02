import React from "react";
import Card from "./Card";
import { openInvoicePdf, saveInvoicePdf, formatMoney, computeTotals } from "../../utils/invoicePdf";

export default function InvoicePanel({ invoice, order }) {
  const currency = order?.currency_code || order?.currency || "EUR";
  const items = Array.isArray(order?.items) ? order.items : [];
  const { subtotal, shipping, tax, grand } = computeTotals(order);

  return (
    <Card title={`Invoice #${invoice?.id ?? "—"}`}>
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={() => openInvoicePdf({ invoice, order, shop: { name: "Keneta" } })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1 ring-slate-300 hover:bg-slate-50"
            title="Open PDF to print"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 9V2h12v7H6Zm1-1h10V4H7v4Zm13 3a3 3 0 0 1 3 3v5h-4v4H5v-4H1v-5a3 3 0 0 1 3-3h16Zm-3 9v-5H7v5h10Zm-14-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
            Print / Open PDF
          </button>
          <button
            onClick={() => saveInvoicePdf({ invoice, order, shop: { name: "Keneta" } })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black"
            title="Download PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.086l3.293-3.293 1.414 1.414L12 16.914l-4.707-4.707 1.414-1.414L11 13.086V3h2Zm-9 14h18v2H3v-2Z"/></svg>
            Download
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm rounded-xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Qty</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="py-3 px-4">{it.sku || it.product_sku || "—"}</td>
                <td className="py-3 px-4">{it.name || it.product_name || "—"}</td>
                <td className="py-3 px-4 text-right">{formatMoney(it.price, currency)}</td>
                <td className="py-3 px-4 text-right">{it.qty_ordered ?? it.qty ?? 0}</td>
                <td className="py-3 px-4 text-right">
                  {formatMoney(it.total ?? it.row_total ?? (Number(it.price || 0) * Number(it.qty_ordered || it.qty || 0)), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid md:grid-cols-12 mt-6">
        <div className="md:col-span-7"></div>
        <div className="md:col-span-5 md:pl-8">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Shipping &amp; Handling</dt>
              <dd>{formatMoney(shipping, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tax</dt>
              <dd>{formatMoney(tax, currency)}</dd>
            </div>
            <div className="flex justify-between font-medium text-slate-900 pt-2 border-t border-slate-100">
              <dt>Grand Total</dt>
              <dd>{formatMoney(grand, currency)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Address & methods blocks */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-medium mb-2">Billing Address</h4>
          <AddressBlock addr={order?.billing_address} />
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-medium mb-2">Shipping Address</h4>
          <AddressBlock addr={order?.shipping_address} />
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-medium mb-2">Shipping Method</h4>
          <p className="text-sm text-slate-700">{order?.shipping_method ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-medium mb-2">Payment Method</h4>
          <p className="text-sm text-slate-700">{order?.payment_method ?? "—"}</p>
        </div>
      </div>
    </Card>
  );
}

function AddressBlock({ addr }) {
  if (!addr) return <p className="text-sm text-slate-700">—</p>;
  const full = `${addr.first_name ?? ""} ${addr.last_name ?? ""}`.trim();
  return (
    <div className="text-sm text-slate-700 space-y-1">
      {full && <p>{full}</p>}
      {addr.address1 && <p>{addr.address1}</p>}
      {(addr.city || addr.postcode) && <p>{addr.city} {addr.postcode}</p>}
      {addr.country && <p>{addr.country}</p>}
      {addr.phone && <p>Contact : {addr.phone}</p>}
    </div>
  );
}
