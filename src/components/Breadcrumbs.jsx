import React from "react";
import { Link } from "react-router-dom";

/**
 * Breadcrumb navigation.
 * items: Array<{ label: string, path?: string }>
 * The last item is the current page and is unlinked.
 */
export default function Breadcrumbs({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-gray-600">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const label = String(item.label ?? "");
          return (
            <li key={`${label}-${idx}`} className="flex items-center gap-1">
              {!isLast && item.path ? (
                <Link
                  to={item.path}
                  className="hover:text-gray-900 transition-colors"
                >
                  {label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-gray-900" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {label}
                </span>
              )}
              {!isLast && <span className="text-gray-400">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
