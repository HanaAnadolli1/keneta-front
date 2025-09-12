import React, { useState } from "react";
import { useCheckoutSummary, useApplyCoupon } from "../api/checkout";
import noImage from "../assets/no_image.jpg";

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

  // Function to get product image with fallback, similar to CartSidebar
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
      item?.additional?.attributes?.image ||
      // last resort – your local placeholder
      noImage
    );
  };

  const getItemName = (item) =>
    item?.name || item?.product?.name || `#${item?.id ?? ""}`;

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Cart Summary</h2>
          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const imgSrc = getItemImage(item);
          return (
            <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <img
                  src={imgSrc}
                  alt={getItemName(item)}
                  className="h-16 w-16 rounded-lg bg-white object-cover border border-gray-200"
                  onError={(e) => {
                    if (e.currentTarget.src !== noImage) {
                      e.currentTarget.src = noImage; // fallback if broken URL
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{getItemName(item)}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600">
                    {item.formatted_price} × {item.quantity}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.formatted_total || item.formatted_price}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{cart.formatted_sub_total}</span>
          </div>

          {cart.coupon_code ? (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Coupon ({cart.coupon_code})</span>
              <span className="font-medium text-green-600">-{cart.formatted_discount}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => applyCouponM.mutate(code)}
                  disabled={applyCouponM.isLoading || !code}
                  className="
                    bg-[#0b0c2c] text-white 
                    py-2 px-4 rounded-lg 
                    disabled:opacity-50 disabled:cursor-not-allowed 
                    hover:opacity-90 
                    transition text-sm font-medium
                  "
                >
                  {applyCouponM.isLoading ? "Applying…" : "Apply"}
                </button>
              </div>
              {applyCouponM.error && (
                <p className="text-red-500 text-sm">{applyCouponM.error.message}</p>
              )}
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery</span>
            <span className="font-medium">{cart.selected_shipping_rate?.formatted_price || "€0.00"}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{cart.formatted_tax_total}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Grand Total</span>
            <span className="text-[#0b0c2c]">{cart.formatted_grand_total}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onPlaceOrder}
        disabled={!selectedPayment || placing}
        className="
          w-full
          bg-[#0b0c2c] text-white
          py-4 px-6
          rounded-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:opacity-90
          transition-all
          font-semibold
          text-lg
          shadow-lg
          hover:shadow-xl
        "
      >
        {placing ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Placing Order…
          </div>
        ) : (
          "Place Order"
        )}
      </button>
    </div>
  );
}
