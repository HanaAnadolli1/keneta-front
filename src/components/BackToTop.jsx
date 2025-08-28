import React, { useEffect, useRef, useState } from "react";
import { FaArrowUp } from "react-icons/fa6";

export default function BackToTop({
  showAt = 300,
  scrollDuration = 600, // ms
  className = "",
  title = "Back to top",
}) {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          setVisible(window.scrollY > showAt);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAt]);

  // Easing: easeInOutCubic
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches;

    // Instant if reduced motion
    if (reduceMotion) {
      window.scrollTo(0, 0);
      return;
    }

    const start = document.documentElement.scrollTop || document.body.scrollTop;
    if (start <= 0) return;

    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / Math.max(1, scrollDuration));
      const y = Math.round(start * (1 - ease(t)));
      window.scrollTo(0, y);
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
      className={[
        "fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] md:right-6 md:bottom-[calc(env(safe-area-inset-bottom,0)+1.5rem)] z-50",
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
