import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import Breadcrumbs from "../components/Breadcrumbs";

const ROWS = [
  {
    key: "name",
    label: "Name",
    render: (p) => (
      <Link
        className="text-indigo-600 hover:underline"
        to={`/products/${p.url_key}`}
      >
        {p.name}
      </Link>
    ),
  },
  { key: "sku", label: "SKU", render: (p) => p.sku ?? "—" },
  {
    key: "formatted_price",
    label: "Price",
    render: (p) => p.formatted_price ?? "—",
  },
  {
    key: "in_stock",
    label: "Availability",
    render: (p) => (p.in_stock ? "In stock" : "Out of stock"),
  },
];

export default function ComparePage() {
  const { items, remove, clear } = useCompare();
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);
  const breadcrumbs = [{ label: "Home", path: "/" }, { label: "Compare" }];

  const diffs = useMemo(() => {
    const map = {};
    for (const row of ROWS) {
      const vals = new Set(
        items.map((p) => JSON.stringify((p ?? {})[row.key] ?? null))
      );
      map[row.key] = vals.size > 1;
    }
    return map;
  }, [items]);

  const visibleRows = useMemo(() => {
    if (!showDiffsOnly) return ROWS;
    return ROWS.filter((r) => diffs[r.key]);
  }, [showDiffsOnly, diffs]);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={breadcrumbs} />
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Compare products</h1>
          <p className="text-gray-600 mb-6">
            You haven’t selected any products to compare.
          </p>
          <Link
            to="/products"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
       <Breadcrumbs items={breadcrumbs} />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Compare products
          </h1>
          <p className="text-sm text-gray-600">
            Side-by-side overview of your selected items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Differences only toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-700">Differences only</span>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                ${showDiffsOnly ? "bg-indigo-600" : "bg-gray-200"}`}
              onClick={() => setShowDiffsOnly((v) => !v)}
              role="switch"
              aria-checked={showDiffsOnly}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition
                  ${showDiffsOnly ? "translate-x-5" : "translate-x-1"}`}
              />
            </span>
          </label>

          <button
            onClick={clear}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear all
          </button>
          <Link
            to="/products"
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            + Add more
          </Link>
        </div>
      </div>

      {/* Header cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {items.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 flex flex-col items-center"
          >
            <img
              src={p.image || "https://via.placeholder.com/300x200"}
              alt={p.name}
              className="w-full h-40 object-contain bg-gray-50 rounded-xl"
            />
            <Link
              to={`/products/${p.url_key}`}
              className="mt-3 font-medium text-center line-clamp-2 hover:underline"
            >
              {p.name}
            </Link>
            <div className="mt-1 text-indigo-600 font-bold">
              {p.formatted_price ?? "—"}
            </div>
            <button
              onClick={() => remove(p.id)}
              className="mt-3 text-sm text-gray-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl shadow-sm ring-1 ring-black/5 bg-white">
        <table className="min-w-full border-separate border-spacing-0">
          <colgroup>
            <col className="w-56" />
            {items.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={row.key} className="align-top">
                {/* Sticky left label */}
                <th
                  className={`sticky left-0 z-10 bg-gray-50/95 backdrop-blur px-4 py-3 text-left text-sm font-semibold text-gray-800
                    ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                >
                  {row.label}
                </th>

                {items.map((p) => (
                  <td
                    key={p.id}
                    className={`px-4 py-3 text-sm text-gray-800 align-top
                      ${idx !== 0 ? "border-t border-gray-100" : ""}
                      ${
                        diffs[row.key]
                          ? "bg-amber-50/40"
                          : idx % 2 === 1
                          ? "bg-white"
                          : "bg-white"
                      }`}
                    title={diffs[row.key] ? "Values differ" : ""}
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
