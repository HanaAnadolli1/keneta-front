import React from "react";
import { Link } from "react-router-dom";
import { useCompare } from "../context/CompareContext";

export default function CompareTray() {
  const { items, remove, clear, count, max } = useCompare();
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto">
      <div className="mx-auto flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-black/5 shadow-lg px-3 sm:px-4 py-3">
        {/* Thumbs */}
        <div className="flex -space-x-2">
          {items.map((it) => (
            <div key={it.id} className="relative">
              <img
                src={it.image || "https://via.placeholder.com/48x48"}
                alt={it.name}
                className="h-10 w-10 rounded-xl object-contain bg-gray-50 ring-1 ring-black/5 shadow-sm"
              />
              <button
                onClick={() => remove(it.id)}
                title="Remove"
                aria-label={`Remove ${it.name}`}
                className="absolute -top-2 -right-2 grid place-items-center h-5 w-5 rounded-full bg-white text-gray-700 ring-1 ring-black/10 shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Count + progress */}
        <div className="hidden sm:flex flex-col min-w-[110px]">
          <span className="text-sm font-medium text-gray-800">
            {count} selected
          </span>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/compare"
          className="ml-auto inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
        >
          Compare ({count}/{max})
        </Link>

        <button
          onClick={clear}
          className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
