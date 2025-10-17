import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fixThemeImageUrls,
  fixThemeCss,
  initializeLazyLoading,
} from "../../utils/imageUrlFixer";
import { useLanguage } from "../../context/LanguageContext";
import noImage from "../../assets/no_image.jpg";

const CategoryCarousel = ({ customization }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);

        // Get filters from customization options
        const filters = customization?.options?.filters || {};
        const sort = filters.sort || "desc";
        const limit = filters.limit || 25;

        console.log("CategoryCarousel filters:", filters);
        console.log("CategoryCarousel sort:", sort);
        console.log("CategoryCarousel limit:", limit);

        // Fetch categories from API - use the same endpoint as Categories component
        const response = await fetch(
          `https://admin.keneta-ks.com/api/v2/categories?sort=id&order=${sort}&limit=${limit}`,
          { headers: { Accept: "application/json" } }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data = await response.json();
        console.log("CategoryCarousel API response:", data);

        // Process categories the same way as Categories component
        const filtered = (data?.data || []).filter(
          (cat) => cat.id !== 1 && String(cat.status) === "1"
        );

        // Limit to first 10 categories for mobile-friendly display
        const limitedCategories = filtered.slice(0, 10);

        console.log("CategoryCarousel filtered categories:", filtered);
        console.log("CategoryCarousel limited to 10:", limitedCategories);
        setCategories(limitedCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (customization?.options?.filters) {
      fetchCategories();
    } else {
      setLoading(false);
    }
  }, [customization]);

  useEffect(() => {
    // Initialize lazy loading after component mounts
    const timer = setTimeout(() => {
      initializeLazyLoading();
    }, 100);

    return () => clearTimeout(timer);
  }, [categories]);

  // Get image source with fallback - same as Categories component
  const getImageSrc = (category) => {
    return category.logo_url || noImage;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
        <div className="text-center mt-4 text-gray-600">
          {t("categoryCarousel.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{t("categoryCarousel.error", { error })}</p>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return null;
  }

  return (
    <div className="w-full px-4 py-8">
      {/* Apply custom CSS if provided */}
      {customization?.options?.css && (
        <style
          dangerouslySetInnerHTML={{
            __html: fixThemeCss(fixThemeImageUrls(customization.options.css)),
          }}
        />
      )}

      {/* Apply custom HTML wrapper if provided */}
      {customization?.options?.html ? (
        <div
          dangerouslySetInnerHTML={{
            __html: fixThemeImageUrls(customization.options.html),
          }}
        />
      ) : (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {t("categoryCarousel.title")}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.slug)}`}
                className="group bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 hover:shadow-md transition-all duration-200"
                title={category.name}
              >
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <img
                    src={getImageSrc(category)}
                    alt={category.name}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = noImage;
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-[#00A7E5] group-hover:underline transition-colors duration-200 truncate">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryCarousel;
