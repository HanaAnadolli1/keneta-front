import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById } from "../../api/customer";
import Card from "../../components/account/Card";
import FieldRow from "../../components/account/FieldRow";

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

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

  if (!order) return <p>Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order #{order.id}</h2>
        <Link className="text-blue-600 hover:underline" to="/account/orders">Back to orders</Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="Summary">
          <dl className="divide-y divide-slate-100">
            <FieldRow label="Status">{order.status}</FieldRow>
            <FieldRow label="Placed">{order.created_at?.slice(0, 10)}</FieldRow>
            <FieldRow label="Total">{order.grand_total ?? order.total}</FieldRow>
            <FieldRow label="Payment">{order.payment_method}</FieldRow>
            <FieldRow label="Shipping">{order.shipping_method}</FieldRow>
          </dl>
        </Card>

        <Card title="Customer">
          <dl className="divide-y divide-slate-100">
            <FieldRow label="Name">
              {(order.customer_first_name ?? "") + " " + (order.customer_last_name ?? "")}
            </FieldRow>
            <FieldRow label="Email">{order.customer_email}</FieldRow>
            <FieldRow label="Phone">{order.customer_phone}</FieldRow>
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
    </div>
  );
}
