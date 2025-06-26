import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const Carousel = ({ slides = [] }) => {
  const [current, setCurrent] = useState(0);

  const total = slides.length;

  // Safe auto-play effect
  useEffect(() => {
    if (total === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 8000);
    return () => clearInterval(timer);
  }, [total]);

  const goTo = (i) => setCurrent(i);
  const prev = () => setCurrent((current - 1 + total) % total);
  const next = () => setCurrent((current + 1) % total);

  if (!slides.length) return null;
  return (
    <div className="relative py-2 w-full max-w-7xl mx-auto overflow-hidden shadow-lg h-[450px] sm:h-[550px]">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={`https://keneta.laratest-app.com/${slide.image}`}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" />

          <div className="absolute left-6 md:left-16 top-1/3 transform -translate-y-1/2 text-white space-y-4 z-20 max-w-md">
            <h2 className="text-3xl md:text-5xl font-bold">{slide.title}</h2>
            <p className="text-lg md:text-xl">{slide.subtitle}</p>
            <a
              href={slide.link}
              className="inline-block bg-black text-white px-6 py-3 text-sm font-semibold rounded hover:bg-white hover:text-black transition"
            >
              Shop now
            </a>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 transform text-white -translate-y-1/2 hover:bg-black/60 text-black rounded-full p-2 z-30"
      >
        <FaChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 text-white top-1/2 transform -translate-y-1/2 hover:bg-black/60 text-black rounded-full p-2 z-30"
      >
        <FaChevronRight size={20} />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-3 h-3 rounded-full ${
              current === i ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
