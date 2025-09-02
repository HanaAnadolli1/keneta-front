import React from "react";
import { Link } from "react-router-dom";

/**
 * Breadcrumb navigation component.
 * items: Array<{ label: string, path?: string }>
 * The last item is considered the current page and is shown unlinked.
 */
export default function Breadcrumbs({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-gray-600">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {!isLast && item.path ? (
                <Link
                  to={item.path}
                  className="hover:text-indigo-600 hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-gray-900" : undefined}>
                  {item.label}
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
