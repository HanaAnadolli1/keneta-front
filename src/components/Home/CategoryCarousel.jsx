import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { fixThemeImageUrls, fixThemeCss, initializeLazyLoading } from "../../utils/imageUrlFixer";
import noImage from "../../assets/no_image.jpg";

const CategoryCarousel = ({ customization }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Get filters from customization options
        const filters = customization?.options?.filters || {};
        const parentId = filters.parent_id || 1;
        const sort = filters.sort || "asc";
        const limit = filters.limit || 10;
        
        // Fetch categories from API
        const response = await fetch(
          `https://admin.keneta-ks.com/api/v2/descendant-categories?parent_id=${parentId}&sort=${sort}&limit=${limit}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        const categoryData = data?.data || [];
        
        // Normalize category data
        const normalizedCategories = categoryData.map(cat => ({
          id: Number(cat.id || cat.category_id || 0) || 0,
          name: String(cat.name || cat.label || cat.title || "Category"),
          slug: String(cat.slug || cat.code || cat.name || "").toLowerCase(),
          image_url: cat.image_url || cat.image?.url || cat.thumbnail || null,
          logo_url: cat.logo_url || null,
          status: String(cat.status || "1"),
        })).filter(cat => cat.status === "1");
        
        setCategories(normalizedCategories);
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

  // Get image source with fallback
  const getImageSrc = (category) => {
    const logoUrl = category.logo_url;
    const imageUrl = category.image_url;
    
    if (logoUrl) {
      if (logoUrl.startsWith('http')) {
        return logoUrl;
      } else if (logoUrl.startsWith('storage/')) {
        return `https://admin.keneta-ks.com/${logoUrl}`;
      }
    }
    
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      } else if (imageUrl.startsWith('storage/')) {
        return `https://admin.keneta-ks.com/${imageUrl}`;
      }
    }
    
    return noImage;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>Error loading categories: {error}</p>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Apply custom CSS if provided */}
      {customization?.options?.css && (
        <style dangerouslySetInnerHTML={{ 
          __html: fixThemeCss(fixThemeImageUrls(customization.options.css)) 
        }} />
      )}
      
      {/* Apply custom HTML wrapper if provided */}
      {customization?.options?.html ? (
        <div dangerouslySetInnerHTML={{ 
          __html: fixThemeImageUrls(customization.options.html) 
        }} />
      ) : (
        <div className="relative">
          {/* Navigation buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10 -ml-4">
            <button className="category-carousel-prev bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10 -mr-4">
            <button className="category-carousel-next bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Swiper Carousel */}
          <Swiper
            modules={[Navigation, Autoplay]}
            navigation={{
              nextEl: '.category-carousel-next',
              prevEl: '.category-carousel-prev',
            }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            spaceBetween={20}
            slidesPerView={2}
            breakpoints={{
              640: {
                slidesPerView: 3,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 4,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 5,
                spaceBetween: 24,
              },
              1280: {
                slidesPerView: 6,
                spaceBetween: 24,
              },
            }}
            className="category-carousel-swiper"
          >
            {categories.map((category) => (
              <SwiperSlide key={category.id}>
                <Link
                  to={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="group block"
                  title={category.name}
                >
                  <div className="bg-white  transition-shadow p-4 text-center">
                    {/* Category Image */}
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={getImageSrc(category)}
                        alt={category.name}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = noImage;
                        }}
                      />
                    </div>
                    
                    {/* Category Name */}
                    <h3 className="text-sm font-medium text-gray-800 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
};

export default CategoryCarousel;
