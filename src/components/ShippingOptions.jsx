// src/components/ShippingOptions.jsx
import React from "react";

export default function ShippingOptions({
  methods,
  selected,
  onSelect,
  onProceed,
  loading,
}) {
  return (
    <div className="mt-8 bg-white shadow rounded-lg p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Shipping Method
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(methods).flatMap(([_, group]) =>
          group.rates.map((rate) => {
            const isChecked = selected === rate.method;
            return (
              <label
                key={rate.method}
                className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition
                  ${
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
                    {group.carrier_title}
                  </p>
                  <p className="text-sm text-gray-600">{rate.method_title}</p>
                </div>
                <div className="mt-4 text-xl font-bold text-gray-900">
                  {rate.base_formatted_price}
                </div>
                {isChecked && (
                  <div className="absolute top-2 right-2 text-blue-600">✓</div>
                )}
              </label>
            );
          })
        )}
      </div>
      <button
        onClick={onProceed}
        disabled={!selected || loading}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded disabled:opacity-50"
      >
        {loading ? "Saving…" : "Proceed"}
      </button>
    </div>
  );
}
