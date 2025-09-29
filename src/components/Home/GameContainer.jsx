import React, { useEffect } from "react";
import { fixThemeImageUrls, fixThemeCss, initializeLazyLoading } from "../../utils/imageUrlFixer";

const GameContainer = ({ customization }) => {
  useEffect(() => {
    // Initialize lazy loading after component mounts
    const timer = setTimeout(() => {
      initializeLazyLoading();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!customization || customization.type !== "static_content") {
    return null;
  }

  const { html, css } = customization.options || {};

  return (
    <div className="relative w-full max-w-7xl mx-auto overflow-hidden px-4">
      {/* Inject backend-provided CSS with fixed image URLs and CSS issues */}
      {css && <style dangerouslySetInnerHTML={{ __html: fixThemeCss(fixThemeImageUrls(css)) }} />}
      
      {/* Render backend-provided HTML with fixed image URLs */}
      {html && <div dangerouslySetInnerHTML={{ __html: fixThemeImageUrls(html) }} />}
    </div>
  );
};

export default GameContainer;
