import React, { useEffect, useRef } from "react";

const LazyImage = ({ src, dataSrc, alt, className, width, height, ...props }) => {
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // If we have dataSrc, use it for lazy loading
    const imageSrc = dataSrc || src;
    if (!imageSrc) return;

    // Create intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load the image
            img.src = imageSrc;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src, dataSrc]);

  return (
    <img
      ref={imgRef}
      src={src || ""}
      data-src={dataSrc}
      alt={alt}
      className={`lazy ${className || ""}`}
      width={width}
      height={height}
      {...props}
    />
  );
};

export default LazyImage;
