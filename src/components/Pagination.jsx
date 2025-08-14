// src/components/Pagination.jsx
import React, { useMemo } from "react";

// Desktop/full: 1 2 3 … (window around current) … last
function buildFull(totalPages, current) {
  if (!totalPages) return [];
  const candidates = new Set([
    1,
    2,
    3,
    totalPages,
    totalPages - 1,
    totalPages - 2,
    current - 1,
    current,
    current + 1,
  ]);
  const list = [...candidates]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const n of list) {
    if (prev && n - prev > 1) out.push("ellipsis");
    out.push(n);
    prev = n;
  }
  return out;
}

// Mobile/compact: 1 … (current-1,current,current+1) … last
function buildCompact(totalPages, current) {
  if (!totalPages) return [];
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const candidates = new Set([
    1,
    current - 1,
    current,
    current + 1,
    totalPages,
  ]);
  const list = [...candidates]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const n of list) {
    if (prev && n - prev > 1) out.push("ellipsis");
    out.push(n);
    prev = n;
  }
  return out;
}

function PageButton({ disabled, active, children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center h-10 min-w-[2.5rem] px-2 rounded
        ${
          active
            ? "bg-indigo-600 text-white font-semibold"
            : "bg-gray-100 hover:bg-gray-200"
        }
        disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Props:
 * - page: number (current page, 1-based)
 * - totalPages: number|null (if null -> simple pagination; numbers hidden)
 * - onPageChange: (p:number) => void
 * - hasPrev: boolean (used when totalPages is null)
 * - hasNext: boolean (used when totalPages is null)
 */
export default function Pagination({
  page,
  totalPages,
  onPageChange,
  hasPrev = false,
  hasNext = false,
}) {
  const full = useMemo(() => buildFull(totalPages, page), [totalPages, page]);
  const compact = useMemo(
    () => buildCompact(totalPages, page),
    [totalPages, page]
  );
  const isSimple = !totalPages;

  return (
    <nav
      className="mt-10 flex w-full items-center justify-center"
      aria-label="pagination"
    >
      <div className="flex items-center gap-1 max-w-full">
        {/* First */}
        <PageButton
          onClick={() => onPageChange(1)}
          disabled={isSimple || page === 1}
          title="First page"
        >
          {"<<"}
        </PageButton>

        {/* Prev */}
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={isSimple ? !hasPrev : page === 1}
          title="Previous page"
        >
          {"<"}
        </PageButton>

        {/* Numbers (mobile compact) */}
        {totalPages && (
          <div className="flex sm:hidden items-center gap-1 overflow-x-auto no-scrollbar">
            {compact.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`m-ell-${idx}`} className="px-2 select-none">
                  …
                </span>
              ) : (
                <PageButton
                  key={`m-${item}`}
                  onClick={() => onPageChange(item)}
                  active={item === page}
                  title={`Page ${item}`}
                >
                  {item}
                </PageButton>
              )
            )}
          </div>
        )}

        {/* Numbers (desktop/full) */}
        {totalPages && (
          <div className="hidden sm:flex items-center gap-1">
            {full.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`d-ell-${idx}`} className="px-2 select-none">
                  …
                </span>
              ) : (
                <PageButton
                  key={`d-${item}`}
                  onClick={() => onPageChange(item)}
                  active={item === page}
                  title={`Page ${item}`}
                >
                  {item}
                </PageButton>
              )
            )}
          </div>
        )}

        {/* Next */}
        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={
            isSimple ? !hasNext : Boolean(totalPages && page >= totalPages)
          }
          title="Next page"
        >
          {">"}
        </PageButton>

        {/* Last */}
        <PageButton
          onClick={() => totalPages && onPageChange(totalPages)}
          disabled={!totalPages || page === totalPages}
          title="Last page"
        >
          {">>"}
        </PageButton>
      </div>
    </nav>
  );
}
