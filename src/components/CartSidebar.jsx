// src/components/CartSidebar.jsx
import React from "react";
import { useCart, useCartMutations } from "../api/hooks";

export default function CartSidebar({ open, onClose }) {
  const { data: cart, isLoading } = useCart();
  const { updateItemQuantity } = useCartMutations();

  if (isLoading) return <div>Loading…</div>;

  return (
    <div className={open ? "translate-x-0" : "translate-x-full"}>
      <button onClick={onClose}>Close</button>
      {cart.items.map((it) => (
        <div key={it.id}>
          <span>{it.name}</span>
          <button
            onClick={() =>
              updateItemQuantity.mutate({
                lineItemId: it.id,
                quantity: it.quantity - 1,
              })
            }
          >
            −
          </button>
          <span>{it.quantity}</span>
          <button
            onClick={() =>
              updateItemQuantity.mutate({
                lineItemId: it.id,
                quantity: it.quantity + 1,
              })
            }
          >
            +
          </button>
        </div>
      ))}
    </div>
  );
}
