import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowUp } from "react-icons/fa6";

export default function BackToTop({
  showAt = 300,
  scrollDuration = 600,           // ms
  scrollTarget = null,            // pass a DOM element if your page scrolls inside a container
  className = "",
  title = "Back to top",
}) {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  // Resolve the target we listen to / scroll (window or an element)
  const target = useMemo(() => {
    if (scrollTarget instanceof Element) return scrollTarget;
    return typeof window !== "undefined" ? window : null;
  }, [scrollTarget]);

  const getScrollTop = () => {
    if (!target) return 0;
    if (target === window) {
      // iOS Safari can report via documentElement
      return window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
    }
    return target.scrollTop || 0;
  };

  useEffect(() => {
    if (!target) return;

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          setVisible(getScrollTop() > showAt);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    // set initial state
    onScroll();

    // Add / remove listener
    const el = target === window ? window : target;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [target, showAt]);

  // Easing: easeInOutCubic
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const el = target === window ? document.scrollingElement || document.documentElement : target;

    if (!el) return;
    const start = getScrollTop();
    if (start <= 0) return;

    if (reduceMotion) {
      if (target === window) window.scrollTo(0, 0);
      else el.scrollTop = 0;
      return;
    }

    const startTime = performance.now();
    const dur = Math.max(1, scrollDuration);

    const frame = (now) => {
      const t = Math.min(1, (now - startTime) / dur);
      const y = Math.round(start * (1 - ease(t)));
      if (target === window) window.scrollTo(0, y);
      else el.scrollTop = y;
      if (t < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title={title}
      // Fallback bottom via class; env() version via inline style overrides when supported
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      className={[
        "fixed right-4 bottom-4 md:right-6 md:bottom-6 z-[9999]",
        "inline-grid place-items-center w-12 h-12 rounded-full shadow-lg border",
        "bg-[var(--primary)] text-white border-[var(--primary)]",
        "hover:bg-white hover:text-[var(--primary)]",
        "transition duration-300 ease-out motion-reduce:transition-none",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        className,
      ].join(" ")}
    >
      <FaArrowUp className="text-lg" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}
