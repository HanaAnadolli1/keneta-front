// src/components/Spinner.jsx
import React from "react";

/**
 * Simple spinner (CSS-based, no image).
 * Drop a GIF at /public/spinner.gif and swap the <div> for:
 *   <img src="/spinner.gif" alt={label || "Loading…"} className="h-10 w-10" />
 */
export default function Spinner({ size = "md", label }) {
  const sizeMap = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-10 w-10 border-4",
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <div
        className={`inline-block rounded-full border-gray-300 border-t-indigo-600 animate-spin ${s}`}
        style={{ borderTopColor: "rgb(79 70 229)" }} // ensures indigo top ring
        aria-hidden="true"
      />
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}
