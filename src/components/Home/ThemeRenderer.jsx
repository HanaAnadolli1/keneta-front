import React, { useEffect } from "react";
import TopCollections from "./TopCollections";
import BoldCollections from "./BoldCollections";
import GameContainer from "./GameContainer";
import ProductCarousel from "./ProductCarousel";
import CategoryCarousel from "./CategoryCarousel";
import FooterLinks from "./FooterLinks";
import ServicesContent from "./ServicesContent";
import { fixThemeImageUrls, fixThemeCss, initializeLazyLoading } from "../../utils/imageUrlFixer";

const ThemeRenderer = ({ customization }) => {
  useEffect(() => {
    // Initialize lazy loading after component mounts
    const timer = setTimeout(() => {
      initializeLazyLoading();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!customization) return null;

  switch (customization.type) {
    case "static_content":
      // Check the name to determine which component to use
      if (customization.name === "Top Collections") {
        return <TopCollections customization={customization} />;
      } else if (customization.name === "Bold Collections") {
        return <BoldCollections customization={customization} />;
      } else if (customization.name === "Game Container") {
        return <GameContainer customization={customization} />;
      } else {
        // Generic static content renderer
        return (
          <div className="relative w-full max-w-7xl mx-auto overflow-hidden px-4">
            {customization.options?.css && (
              <style dangerouslySetInnerHTML={{ __html: fixThemeCss(fixThemeImageUrls(customization.options.css)) }} />
            )}
            {customization.options?.html && (
              <div dangerouslySetInnerHTML={{ __html: fixThemeImageUrls(customization.options.html) }} />
            )}
          </div>
        );
      }

    case "product_carousel":
      return <ProductCarousel customization={customization} />;

    case "category_carousel":
      return <CategoryCarousel customization={customization} />;

    case "footer_links":
      return <FooterLinks customization={customization} />;

    case "services_content":
      return <ServicesContent customization={customization} />;

    case "image_carousel":
      // Handle image carousel (existing component)
      return null;

    default:
      console.warn(`Unknown customization type: ${customization.type}`);
      return null;
  }
};

export default ThemeRenderer;
