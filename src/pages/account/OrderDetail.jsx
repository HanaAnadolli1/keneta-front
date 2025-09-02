// src/pages/account/OrderDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById, getInvoices } from "../../api/customer";
import Card from "../../components/account/Card";
import FieldRow from "../../components/account/FieldRow";
import InvoicePanel from "../../components/account/InvoicePanel";
import Breadcrumbs from "../../components/Breadcrumbs";

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.data?.data, // Laravel paginator
    payload?.data, // { data: [...] }
    payload?.invoices, // { invoices: [...] }
    payload?.items, // { items: [...] }
    payload?.result, // { result: [...] }
  ];
  for (const arr of candidates) if (Array.isArray(arr)) return arr;
  return [];
}

function normalizeInvoice(inv) {
  return {
    id: inv.id ?? inv.invoice_id ?? inv.uuid,
    order_id: inv.order_id ?? inv.order?.id ?? inv.orderId,
    created_at: inv.created_at ?? inv.date ?? inv.issued_at ?? null,
    total: inv.grand_total ?? inv.total ?? inv.amount ?? inv.subtotal ?? null,
    pdf_url: inv.pdf_url ?? inv.download_url ?? null,
    raw: inv,
  };
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "Orders", path: "/account/orders" },
    { label: `Order #${id}` },
  ];

  const [invoices, setInvoices] = useState(null);
  const [invError, setInvError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const res = await getOrderById(id);
        setOrder(res);
      } catch (e) {
        setError(e?.message || "Failed to load order");
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setInvError("");
        const res = await getInvoices({ order_id: id });
        const rawList = extractArray(res);
        const list = rawList.map(normalizeInvoice);

        // If backend didn't filter by order_id, filter client-side
        const maybeFiltered = list.some(
          (x) => String(x.order_id) === String(id)
        )
          ? list.filter((x) => String(x.order_id) === String(id))
          : list;

        setInvoices(maybeFiltered);
      } catch (e) {
        setInvError(e?.message || "Failed to load invoices");
        setInvoices([]);
      }
    })();
  }, [id]);

  if (!order)
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <p>Loading…</p>
      </div>
    );

  return (
    <div className="space-y-5">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order #{order.id}</h2>
        <Link className="text-blue-600 hover:underline" to="/account/orders">
          Back to orders
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="Summary">
          <dl className="divide-y divide-slate-100">
            <FieldRow label="Status">{order.status}</FieldRow>
            <FieldRow label="Placed">{order.created_at?.slice(0, 10)}</FieldRow>
            <FieldRow label="Total">
              {order.grand_total ?? order.total}
            </FieldRow>
            <FieldRow label="Payment">{order.payment_method ?? "—"}</FieldRow>
            <FieldRow label="Shipping">{order.shipping_method ?? "—"}</FieldRow>
          </dl>
        </Card>

        <Card title="Customer">
          <dl className="divide-y divide-slate-100">
            <FieldRow label="Name">
              {(order.customer_first_name ?? "") +
                " " +
                (order.customer_last_name ?? "")}
            </FieldRow>
            <FieldRow label="Email">{order.customer_email ?? "—"}</FieldRow>
            <FieldRow label="Phone">{order.customer_phone ?? "—"}</FieldRow>
            <FieldRow label="Address">
              {order.shipping_address?.address1 ||
                order.billing_address?.address1 ||
                "—"}
            </FieldRow>
          </dl>
        </Card>
      </div>

      <Card title="Items">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm rounded-xl overflow-hidden">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.items || []).map((it) => (
                <tr key={it.id}>
                  <td className="py-3 px-4">{it.name}</td>
                  <td className="py-3 px-4">{it.qty_ordered}</td>
                  <td className="py-3 px-4">{it.price}</td>
                  <td className="py-3 px-4">{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoices: render pretty panel w/ Print & Download buttons */}
      <Card title="Invoices">
        {invError && <p className="mb-3 text-sm text-red-600">{invError}</p>}
        {!invoices ? (
          <p>Loading…</p>
        ) : invoices.length === 0 ? (
          <p>No invoices for this order yet.</p>
        ) : (
          <div className="space-y-6">
            {invoices.map((inv) => (
              <InvoicePanel key={inv.id} invoice={inv} order={order} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
