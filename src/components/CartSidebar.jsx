import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart } from "../api/hooks";

const API_CART = "https://keneta.laratest-app.com/api";

/* ───────── helpers ───────── */
const getCsrf = () =>
  decodeURIComponent(
    (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || ""
  );

function hdr() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "X-XSRF-TOKEN": getCsrf(),
    "X-Requested-With": "XMLHttpRequest",
  };
}

async function putQty(id, qty, signal) {
  const form = new URLSearchParams();
  form.append(`qty[${id}]`, qty);
  const r = await fetch(`${API_CART}/checkout/cart`, {
    method: "PUT",
    credentials: "include",
    signal,
    headers: hdr(),
    body: form,
  });
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

/* ───────── component ───────── */
export default function CartSidebar({ open, onClose }) {
  const qc = useQueryClient();
  const { data: cart, isLoading } = useCart();
  const [busy, setBusy] = useState(null);
  const [banner, setBanner] = useState(false);

  /* bootstrap guest cart once */
  const ready = useRef(false);
  useEffect(() => {
    if (ready.current) return;
    fetch(`${API_CART}/checkout/cart`, { credentials: "include" });
    ready.current = true;
  }, []);

  /* refetch when sidebar opens */
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ["cart"] });
  }, [open, qc]);

  /* optimistic helper */
  const optimistic = (id, qty) => {
    const prev = qc.getQueryData(["cart"]);
    if (!prev?.items) return prev;
    qc.setQueryData(["cart"], {
      ...prev,
      items: prev.items
        .map((i) => (i.id === id ? { ...i, quantity: qty } : i))
        .filter((i) => i.quantity > 0),
    });
    return prev;
  };

  /* ± qty (0 removes) */
  async function change(row, qty) {
    if (qty < 0) return;
    const rollback = optimistic(row.id, qty);
    setBusy(row.id);
    setBanner(true);
    try {
      await putQty(row.id, qty);
      qc.invalidateQueries({ queryKey: ["cart"] });
    } catch (e) {
      if (rollback) qc.setQueryData(["cart"], rollback);
      console.error(e);
      alert("Could not update cart.");
    } finally {
      setBusy(null);
      setBanner(false);
    }
  }

  /* ───────── UI ───────── */
  return (
    <div
      className={`fixed top-0 right-0 h-full w-[24rem] bg-white shadow-2xl z-50 transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* update banner */}
        {banner && (
          <div className="absolute top-3 right-4 flex items-center gap-2 text-xs text-blue-600 z-10">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            Updating cart…
          </div>
        )}

        {/* header */}
        <div className="p-5 border-b flex justify-between items-center shrink-0">
          <h2 className="text-xl font-extrabold">Shopping Cart</h2>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <p className="px-5 py-3 text-sm text-gray-700 font-medium shrink-0">
          Get Up To <span className="font-semibold">30% OFF</span> on your 1st
          order
        </p>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {isLoading ? (
            <div className="p-6">Loading…</div>
          ) : cart?.items?.length === 0 ? (
            <div className="p-6">No products in the cart!</div>
          ) : !cart?.items ? (
            <div className="p-6 text-red-600">Failed to load cart.</div>
          ) : (
            cart.items.map((row) => (
              <div key={row.id} className="flex gap-4 mb-6 last:mb-0">
                <img
                  src={row.base_image.small_image_url}
                  alt={row.name}
                  className="w-20 h-20 shrink-0 rounded object-cover bg-gray-100"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold leading-tight line-clamp-3 mb-1">
                    {row.name}
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {row.formatted_price}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border rounded-full px-3 py-1 text-sm select-none">
                      <button
                        disabled={busy === row.id}
                        onClick={() => change(row, row.quantity - 1)}
                        className="px-1"
                      >
                        −
                      </button>
                      <span className="mx-2 w-5 text-center">
                        {row.quantity}
                      </span>
                      <button
                        disabled={busy === row.id}
                        onClick={() => change(row, row.quantity + 1)}
                        className="px-1"
                      >
                        +
                      </button>
                    </div>
                    <button
                      disabled={busy === row.id}
                      onClick={() => change(row, 0)}
                      className="text-indigo-700 text-sm font-medium hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* subtotal and actions fixed at bottom */}
        {cart?.items?.length > 0 && (
          <div className="shrink-0 border-t">
            <div className="px-5 py-4 flex justify-between items-center">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="text-lg font-extrabold">
                {cart.formatted_sub_total}
              </span>
            </div>
            <div className="px-5 py-6 space-y-2">
              <button className="w-full bg-[#0b0e29] text-white py-3 rounded-xl text-sm font-semibold shadow">
                Continue to Checkout
              </button>
              <button className="w-full text-center text-sm text-[#0b0e29] underline">
                View Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
