import React, { useEffect } from "react";

export default function ShippingOptions({
  methods,
  selected,
  onSelect,
  onProceed,
  loading,
  error,
}) {
  // Normalize to array
  const shippingGroups = Array.isArray(methods)
    ? methods
    : Object.values(methods || {});

  const rates = shippingGroups.flatMap((group) => {
    return group?.rates || [];
  });

  return (
    <div className="mt-8 bg-white shadow rounded-lg p-8 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Shipping Method</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rates.map((rate) => {
          const group = shippingGroups.find((g) =>
            (g?.rates || []).some((r) => r.method === rate.method)
          );
          const isChecked = selected === rate.method;

          return (
            <label
              key={rate.method}
              className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition ${
                isChecked
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                value={rate.method}
                checked={isChecked}
                onChange={() => onSelect(rate.method)}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="text-lg font-medium text-gray-900">
                  {group?.carrier_title || "Unknown Carrier"}
                </p>
                <p className="text-sm text-gray-600">{rate.method_title}</p>
              </div>
              <div className="mt-4 text-xl font-bold text-gray-900">
                {rate.base_formatted_price ||
                  rate.formatted_price ||
                  (typeof rate.price === "number"
                    ? `€${rate.price.toFixed(2)}`
                    : "—")}
              </div>
              {isChecked && (
                <div className="absolute top-2 right-2 text-blue-600">✓</div>
              )}
            </label>
          );
        })}
      </div>

      {error && <div className="text-red-500">{error.message}</div>}

      <button
        onClick={onProceed}
        disabled={!selected || loading}
        className="mt-6 bg-[#0b0c2c] text-white py-3 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition w-full md:w-auto"
      >
        {loading ? "Saving…" : "Proceed"}
      </button>
    </div>
  );
}
