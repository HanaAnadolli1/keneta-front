// src/components/PaymentOptions.jsx
import React from "react";

export default function PaymentOptions({
  methods,
  selected,
  onSelect,
  onProceed,
  loading,
}) {
  return (
    <div className="mt-8 bg-white shadow rounded-lg p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Payment Method
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {methods.map((pm) => {
          const isChecked = selected === pm.method;
          return (
            <label
              key={pm.method}
              className={`relative flex flex-col items-center p-4 border rounded-lg cursor-pointer transition
                ${
                  isChecked
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-300 hover:border-blue-400"
                }`}
            >
              <input
                type="radio"
                name="payment"
                value={pm.method}
                checked={isChecked}
                onChange={() => onSelect(pm.method)}
                className="sr-only"
              />
              <img
                src={pm.image}
                alt={pm.method_title}
                className="h-12 w-auto mb-4"
              />
              <p className="text-lg font-medium text-gray-900">
                {pm.method_title}
              </p>
              {isChecked && (
                <div className="absolute top-2 right-2 text-blue-600">✓</div>
              )}
            </label>
          );
        })}
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
