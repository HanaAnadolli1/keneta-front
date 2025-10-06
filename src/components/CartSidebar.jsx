// src/components/CartSidebar.jsx
import React, { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, useCartMutations } from "../api/hooks";
import { Link } from "react-router-dom";
import noImage from "../assets/no_image.jpg"; // ✅ placeholder used in Products

export default function CartSidebar({ open, onClose }) {
  const qc = useQueryClient();
  const { data: cart, isLoading, isError } = useCart();
  const { updateItemQuantity, removeItem } = useCartMutations();
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (open) qc.invalidateQueries(["cart"]);
  }, [open, qc]);

  const items = Array.isArray(cart?.items) ? cart.items : [];

  const getItemImage = (item) => {
    // Try a bunch of likely fields from Bagisto/Shop API shapes
    return (
      item?.base_image?.small_image_url ||
      item?.base_image?.medium_image_url ||
      item?.base_image?.large_image_url ||
      item?.product?.base_image?.small_image_url ||
      item?.product?.base_image?.medium_image_url ||
      item?.product?.base_image?.large_image_url ||
      item?.thumbnail_url ||
      item?.image_url ||
      item?.product?.thumbnail_url ||
      item?.product?.image_url ||
      // last resort – your local placeholder
      noImage
    );
  };

  const getItemName = (item) =>
    item?.name || item?.product?.name || `#${item?.id ?? ""}`;

  const changeItem = async (item, newQty) => {
    const lineItemId = item.id;

    if (!lineItemId) {
      console.error("❌ Missing lineItemId (cart item id) for:", item);
      alert("Missing cart item ID");
      return;
    }

    setBusyId(item.id);
    try {
      if (newQty === 0) {
        const confirmed = window.confirm(
          `Remove "${getItemName(item)}" from cart?`
        );
        if (!confirmed) return;
        await removeItem.mutateAsync(lineItemId);
      } else {
        await updateItemQuantity.mutateAsync({
          lineItemId, // ✅ cart item ID
          quantity: newQty,
        });
      }
    } catch (err) {
      alert("Could not update cart: " + (err?.message || "Unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  // Subtotal label
  const subtotalLabel = useMemo(
    () => cart?.formatted_grand_total ?? cart?.formatted_sub_total ?? "",
    [cart]
  );

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-[var(--secondary)] shadow-2xl z-50 transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      role="dialog"
      aria-label="Shopping Cart"
    >
      <div className="p-5 border-b border-[#1a3c5c] flex justify-between items-center">
        <h2 className="text-white text-xl font-bold">Shopping Cart</h2>
        <button onClick={onClose} aria-label="Close cart">
          <X size={22} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 text-white">
        {isLoading && <p>Loading…</p>}
        {isError && <p className="text-red-500">Failed to load cart.</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p>Your cart is empty.</p>
        )}

        {items.map((item) => {
          const img = getItemImage(item);
          return (
            <div key={item.id} className="flex gap-4 mb-6">
              <img
                src={img}
                alt={getItemName(item)}
                className="w-20 h-20 rounded bg-gray-100 object-contain"
                onError={(e) => {
                  if (e.currentTarget.src !== noImage) {
                    e.currentTarget.src = noImage; // ✅ fallback if broken URL
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{getItemName(item)}</p>
                <p className="text-sm text-[#a8c1db] text-right">
                  {item?.formatted_price || item?.price_html || ""}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    disabled={busyId === item.id}
                    onClick={() =>
                      changeItem(item, Math.max(0, (item.quantity ?? 1) - 1))
                    }
                    className="px-2 py-1 rounded text-white bg-[#1e456c] disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-white tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    disabled={busyId === item.id}
                    onClick={() => changeItem(item, (item.quantity ?? 1) + 1)}
                    className="px-2 py-1 rounded text-white bg-[#1e456c] disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  <button
                    disabled={busyId === item.id}
                    onClick={() => changeItem(item, 0)}
                    className="ml-auto underline text-sm text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && items.length > 0 && (
        <div className="border-t border-[#1a3c5c] p-5">
          <div className="flex justify-between text-white mb-4">
            <span>Subtotal</span>
            <span>{subtotalLabel}</span>
          </div>
          <Link to="/checkout">
            <button className="w-full bg-[#1a3c5c] py-3 text-white rounded mb-2">
              Continue to Checkout
            </button>
          </Link>
          <Link to="/cart">
            <button className="w-full underline text-sm text-white">
              View Cart
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
