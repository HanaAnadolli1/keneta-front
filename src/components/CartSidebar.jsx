// src/components/CartSidebar.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, useCartMutations } from "../api/hooks";

export default function CartSidebar({ open, onClose }) {
  const qc = useQueryClient();
  const { data: cart, isLoading, isError } = useCart();
  const { updateItemQuantity } = useCartMutations();
  const [busyId, setBusyId] = useState(null);

  // refetch when opened
  useEffect(() => {
    if (open) qc.invalidateQueries(["cart"]);
  }, [open, qc]);

  const items = Array.isArray(cart?.items) ? cart.items : [];

  const changeItem = async (item, newQty) => {
    if (newQty < 0) return;
    setBusyId(item.id);
    try {
      await updateItemQuantity.mutateAsync({
        lineItemId: item.id,
        quantity: newQty,
      });
    } catch (err) {
      alert("Could not update cart: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-[#132232] shadow-2xl z-50 transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-5 border-b border-[#1a3c5c] flex justify-between items-center">
        <h2 className="text-white text-xl font-bold">Shopping Cart</h2>
        <button onClick={onClose}>
          <X size={22} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 text-white">
        {isLoading && <p>Loading…</p>}
        {!isLoading && isError && <p>Failed to load cart.</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p>Your cart is empty.</p>
        )}
        {!isLoading &&
          !isError &&
          items.map((item) => (
            <div key={item.id} className="flex gap-4 mb-6">
              <img
                src={item.base_image.small_image_url}
                alt={item.name}
                className="w-20 h-20 rounded bg-gray-100 object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#1e456c] text-right">
                  {item.formatted_price}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    disabled={busyId === item.id}
                    onClick={() => changeItem(item, item.quantity - 1)}
                    className="px-1 text-white"
                  >
                    −
                  </button>
                  <span className="text-white">{item.quantity}</span>
                  <button
                    disabled={busyId === item.id}
                    onClick={() => changeItem(item, item.quantity + 1)}
                    className="px-1 text-white"
                  >
                    +
                  </button>
                  <button
                    disabled={busyId === item.id}
                    onClick={() => changeItem(item, 0)}
                    className="ml-auto underline text-sm text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {!isLoading && items.length > 0 && (
        <div className="border-t border-[#1a3c5c] p-5">
          <div className="flex justify-between text-white mb-4">
            <span>Subtotal</span>
            <span>
              {cart.formatted_grand_total ?? cart.formatted_sub_total}
            </span>
          </div>
          <button className="w-full bg-[#1a3c5c] py-3 text-white rounded mb-2">
            Continue to Checkout
          </button>
          <button className="w-full underline text-sm text-white">
            View Cart
          </button>
        </div>
      )}
    </div>
  );
}
