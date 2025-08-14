// src/components/InfiniteScrollSentinel.jsx
import React, { useEffect, useRef } from "react";

/**
 * Minimal "sentinel" that calls onIntersect when it comes into view.
 * Props:
 *  - onIntersect: () => void
 *  - disabled?: boolean (default false)
 *  - rootMargin?: string (default "1000px 0px") to prefetch before the user reaches the end
 */
export default function InfiniteScrollSentinel({
  onIntersect,
  disabled = false,
  rootMargin = "1000px 0px",
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || disabled) return;
    const el = ref.current;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) onIntersect?.();
      },
      { root: null, rootMargin, threshold: 0 }
    );

    io.observe(el);
    return () => io.unobserve(el);
  }, [onIntersect, disabled, rootMargin]);

  return <div ref={ref} className="h-10 w-full" aria-hidden="true" />;
}
