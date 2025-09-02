// src/pages/account/Orders.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelOrder, getOrders } from "../../api/customer";
import Card from "../../components/account/Card";
import Breadcrumbs from "../../components/Breadcrumbs";

function StatusPill({ children }) {
  const text = String(children || "").toLowerCase();
  const styles =
    text.includes("cancel") || text.includes("void")
      ? "bg-rose-100 text-rose-700"
      : text.includes("complete") ||
        text.includes("paid") ||
        text.includes("delivered")
      ? "bg-emerald-100 text-emerald-700"
      : text.includes("pending") ||
        text.includes("new") ||
        text.includes("processing")
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${styles}`}
    >
      {children}
    </span>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(null);

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "Orders" },
  ];

  const load = async () => {
    try {
      setError("");
      const res = await getOrders();
      setOrders(Array.isArray(res) ? res : res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load orders");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      setCanceling(id);
      await cancelOrder(id);
      await load();
    } catch (e) {
      alert(e?.message || "Cancel failed");
    } finally {
      setCanceling(null);
    }
  };

    if (!orders)
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <p>Loading…</p>
      </div>
    );

  return (
    <div className="space-y-5">
      <Breadcrumbs items={breadcrumbs} />
      <Card title="Orders">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const cancellable =
                    o.cancellable ??
                    (typeof o.status === "string" &&
                      /pending|new|processing/i.test(o.status));
                  return (
                    <tr key={o.id}>
                      <td className="py-3 px-4 font-medium">{o.id}</td>
                      <td className="py-3 px-4">{o.created_at?.slice(0, 10)}</td>
                      <td className="py-3 px-4"><StatusPill>{o.status}</StatusPill></td>
                      <td className="py-3 px-4">{o.grand_total ?? o.total}</td>
                      <td className="py-3 px-4 space-x-2">
                        <Link
                          className="inline-flex items-center px-3 py-1.5 rounded-lg ring-1 ring-slate-300 hover:bg-slate-50"
                          to={`/account/orders/${o.id}`}
                        >
                          View
                        </Link>
                        {cancellable && (
                          <button
                            onClick={() => onCancel(o.id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                            disabled={canceling === o.id}
                          >
                            {canceling === o.id ? "Canceling…" : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
