import React, { useState } from "react";
import { useCheckoutSummary, useApplyCoupon } from "../api/checkout";

export default function CartSummary({
  selectedPayment,
  onPlaceOrder,
  placing,
}) {
  const { data: cart, isLoading, error } = useCheckoutSummary();
  const applyCouponM = useApplyCoupon();
  const [code, setCode] = useState("");

  if (isLoading) return <div>Loading summary…</div>;
  if (error) return <div className="text-red-500">{error.message}</div>;
  if (!cart) return null;

  const items = Array.isArray(cart.items) ? cart.items : [cart.items];

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Cart Summary</h2>

      <ul className="divide-y">
        {items.map((item) => {
          const imgSrc = item.additional?.attributes?.image || null;
          return (
            <li key={item.id} className="py-4 flex items-center">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={item.name}
                  className="h-16 w-16 rounded bg-gray-100 mr-4 object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded bg-gray-100 mr-4" />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-gray-600">
                  {item.formatted_price} × {item.quantity}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{cart.formatted_sub_total}</span>
        </div>

        {cart.coupon_code ? (
          <div className="flex justify-between">
            <span>Coupon ({cart.coupon_code})</span>
            <span>-{cart.formatted_discount}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Coupon code"
              className="w-full border-gray-300 rounded px-3 py-2"
            />
            <button
              onClick={() => applyCouponM.mutate(code)}
              disabled={applyCouponM.isLoading || !code}
              className="
                bg-[#0b0c2c] text-white 
                py-2 px-4 rounded-full 
                disabled:opacity-50 disabled:cursor-not-allowed 
                hover:opacity-90 
                transition
              "
            >
              {applyCouponM.isLoading ? "Applying…" : "Apply Coupon"}
            </button>
            {applyCouponM.error && (
              <p className="text-red-500">{applyCouponM.error.message}</p>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{cart.selected_shipping_rate?.formatted_price || "€0.00"}</span>
        </div>

        <div className="flex justify-between">
          <span>Tax</span>
          <span>{cart.formatted_tax_total}</span>
        </div>

        <div className="flex justify-between font-bold text-lg">
          <span>Grand Total</span>
          <span>{cart.formatted_grand_total}</span>
        </div>
      </div>

      <button
        onClick={onPlaceOrder}
        disabled={!selectedPayment || placing}
        className="
          mt-4
          bg-[#0b0c2c] text-white
          py-3 px-6
          rounded-full
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:opacity-90
          transition
          w-full
        "
      >
        {placing ? "Placing Order…" : "Place Order"}
      </button>
    </div>
  );
}
