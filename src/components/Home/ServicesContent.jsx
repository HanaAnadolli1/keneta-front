import React, { useEffect, useState } from "react";
import { fixThemeImageUrls, fixThemeCss } from "../../utils/imageUrlFixer";

const ServicesContent = ({ customization }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Add click handler for close button
    const handleCloseClick = (e) => {
      if (
        e.target.id === "closeBar" ||
        e.target.classList.contains("close-btn")
      ) {
        setIsVisible(false);
      }
    };

    // Add event listener
    document.addEventListener("click", handleCloseClick);

    // Cleanup
    return () => {
      document.removeEventListener("click", handleCloseClick);
    };
  }, []);

  if (
    !customization ||
    (customization.type !== "services_content" &&
      customization.type !== "static_content")
  ) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full px-4 py-10">
      {customization.options?.css && (
        <style
          dangerouslySetInnerHTML={{
            __html: fixThemeCss(fixThemeImageUrls(customization.options.css)),
          }}
        />
      )}
      {customization.options?.html && (
        <div
          dangerouslySetInnerHTML={{
            __html: fixThemeImageUrls(customization.options.html),
          }}
        />
      )}
    </div>
  );
};

export default ServicesContent;
