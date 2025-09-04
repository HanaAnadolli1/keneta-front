import React, { useEffect, useState } from "react";

const BASE_URL = "https://keneta.laratest-app.com/";

/**
 * Dots-only carousel. No arrows. **No titles rendered**.
 * Props:
 * - slides: [{ image, subtitle?, link? }]  // title is ignored
 * - className: extra container classes (e.g. heights)
 * - interval: ms between auto-advances (default 8000)
 */
export default function Carousel({ slides = [], className = "", interval = 8000 }) {
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

  return (
    <div
      className={`relative w-full overflow-hidden shadow-lg h-[360px] sm:h-[480px] md:h-[560px] ${className}`}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={`${BASE_URL}${slide.image}`}
            alt="" /* decorative image; title intentionally not shown */
            className="w-full h-full object-cover"
            loading={i === current ? "eager" : "lazy"}
          />

          {/* Overlay WITHOUT title */}
          {(slide.subtitle || slide.link) && (
            <div className="absolute left-6 md:left-10 top-1/3 -translate-y-1/2 text-white space-y-3 z-20 max-w-md drop-shadow">
              {slide.subtitle ? (
                <p className="text-base md:text-lg">{slide.subtitle}</p>
              ) : null}
              {slide.link ? (
                <a
                  href={slide.link}
                  className="inline-block bg-black/80 backdrop-blur px-5 py-2 text-sm font-semibold rounded hover:bg-white hover:text-black transition"
                >
                  Shop now
                </a>
              ) : null}
            </div>
          )}
        </div>
      ))}

      {/* Pagination Dots (only) */}
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
