import React, { useEffect, useState } from "react";

const BASE_URL = "https://admin.keneta-ks.com/";

/**
 * Simple image carousel with CTA button.
 * Props:
 * - slides: [{ image, title?, subtitle?, link? }]
 * - className: container sizing (heights etc.)
 * - interval: ms between auto-advances (default 8000)
 * - buttonAlign: 'left' | 'center'
 */
export default function Carousel({
  slides = [],
  className = "",
  interval = 8000,
  buttonAlign = "center",
}) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (!total) return;
    const t = setInterval(() => {
      setCurrent((p) => (p + 1) % total);
    }, interval);
    return () => clearInterval(t);
  }, [total, interval]);

  if (!total) return null;

  // Minimum swipe distance (in px) to trigger a slide change
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(0); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - go to next slide
      setCurrent((p) => (p + 1) % total);
    }
    if (isRightSwipe) {
      // Swipe right - go to previous slide
      setCurrent((p) => (p - 1 + total) % total);
    }
  };

  const overlayPos =
    buttonAlign === "left"
      ? "left-6 md:left-10 bottom-8 md:bottom-12 items-start text-left"
      : "left-1/2 -translate-x-1/2 bottom-8 md:bottom-12 items-center text-center";

  return (
    <div
      className={`relative group w-full overflow-hidden rounded-2xl shadow-lg ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, i) => {
        const src = slide?.image ? `${BASE_URL}${slide.image}` : "";
        const hasLink = Boolean(slide?.link);
        const label = slide?.title || slide?.subtitle || "See more";

        const active = i === current;

        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out
              ${
                active
                  ? "opacity-100 z-10"
                  : "opacity-0 pointer-events-none z-0"
              }`}
          >
            {src && (
              <img
                src={src}
                alt={slide?.title || ""}
                className="absolute inset-0 w-full h-full object-cover z-[1]"
                loading={active ? "eager" : "lazy"}
              />
            )}

            {/* Optional decorative gradient; never block clicks */}
            <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-black/25 via-black/5 to-transparent" />

            {/* Content & Button (ALWAYS visible on the active slide) */}
            {(slide?.subtitle || slide?.title || hasLink) && (
              <div
                className={`absolute z-[3] flex flex-col gap-3 text-white ${overlayPos}`}
              >
                {slide?.subtitle && (
                  <p className="max-w-md text-base md:text-lg drop-shadow">
                    {slide.subtitle}
                  </p>
                )}

                {hasLink ? (
                  <a
                    href={slide.link}
                    className="inline-block bg-white/90 text-[var(--primary)] px-5 py-2 text-sm md:text-base font-semibold rounded transition hover:bg-white"
                    aria-label={`Open ${label}`}
                  >
                    {label}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-block bg-white/70 text-[var(--primary)] px-5 py-2 text-sm md:text-base font-semibold rounded"
                    title="No link provided"
                  >
                    {label}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-3 h-3 rounded-full ring-1 ring-white/60 ${
              i === current ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
