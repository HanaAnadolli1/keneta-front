import React, { useEffect, useState } from "react";

const BASE_URL = "https://keneta.laratest-app.com/";

/**
 * Dots-only carousel.
 * Props:
 * - slides: [{ image, title?, subtitle?, link? }]
 * - className: extra container classes (e.g. heights)
 * - interval: ms between auto-advances (default 8000)
 * - buttonAlign: 'left' | 'center'  // button placement
 */
export default function Carousel({
  slides = [],
  className = "",
  interval = 8000,
  buttonAlign = "center",
}) {
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (!total) return;
    const t = setInterval(() => {
      setCurrent((p) => (p + 1) % total);
    }, interval);
    return () => clearInterval(t);
  }, [total, interval]);

  if (!total) return null;

  // Positioning:
  // - 'left'   => bottom-left (for 2/3 hero)
  // - 'center' => bottom-center (for 1/3 hero)
  const overlayPos =
    buttonAlign === "left"
      ? "left-6 md:left-10 bottom-16 items-start text-left"
      : "left-1/2 -translate-x-1/2 bottom-16 items-center text-center";

  return (
    <div
      className={`relative w-full overflow-hidden shadow-lg h-[360px] sm:h-[480px] md:h-[560px] rounded-2xl mt-2 ${className}`}
    >
      {slides.map((slide, i) => {
        const src = slide?.image ? `${BASE_URL}${slide.image}` : "";
        const hasLink = Boolean(slide?.link);
        const label = slide?.title ?? slide?.subtitle ?? "Explore";

        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === current ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {src ? (
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                loading={i === current ? "eager" : "lazy"}
              />
            ) : null}

            {/* Bottom overlay: optional subtitle + BUTTON (uses title; shows even if link is empty) */}
            {(slide?.subtitle || slide?.title) && (
              <div
                className={`absolute z-20 text-white drop-shadow flex flex-col gap-3 ${overlayPos}`}
              >
                {slide?.subtitle ? (
                  <p className="max-w-md text-base md:text-lg">
                    {slide.subtitle}
                  </p>
                ) : null}

                {hasLink ? (
                  <a
                    href={slide.link}
                    className="inline-block bg-[var(--primary)]/80 backdrop-blur px-5 py-2 text-sm md:text-base font-semibold rounded hover:bg-white hover:text-[var(--primary)] transition"
                    aria-label={`Open ${label}`}
                  >
                    {label}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-block bg-[var(--primary)]/60 backdrop-blur px-5 py-2 text-sm md:text-base font-semibold rounded"
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
