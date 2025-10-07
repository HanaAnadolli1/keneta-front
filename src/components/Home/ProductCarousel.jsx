import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import ProductCard from "../ProductCard";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { usePrefetchProduct, useCartMutations } from "../../api/hooks";

const ProductCarousel = ({ customization }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { showToast } = useToast();
  const { addToCart } = useCartMutations();
  const { prefetchProduct } = usePrefetchProduct();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!customization || customization.type !== "product_carousel") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { filters, title } = customization.options || {};
        
        if (!filters) {
          setLoading(false);
          return;
        }

        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.new) queryParams.set("new", "1");
        if (filters.featured) queryParams.set("featured", "1");
        if (filters.sort) queryParams.set("sort", filters.sort);
        if (filters.limit) queryParams.set("per_page", filters.limit);
        if (filters.category_id) queryParams.set("category_id", filters.category_id);
        if (filters.brand) queryParams.set("brand", filters.brand);

        // Get bearer token for customer-group pricing
        const token = localStorage.getItem("token");
        const headers = { Accept: "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `https://admin.keneta-ks.com/api/v2/products?${queryParams.toString()}`,
          { headers }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const items = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []) || [];
        
        setProducts(items);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [customization]);

  if (!customization || customization.type !== "product_carousel") {
    return null;
  }

  const { title } = customization.options || {};

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                <div className="h-48 bg-gray-300 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center text-red-500">
          <p>Failed to load products: {error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {title && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[var(--primary)]">{title}</h2>
        </div>
      )}

      <Swiper
        modules={[Navigation]}
        navigation
        spaceBetween={20}
        slidesPerView={4}
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <ProductCard
              product={product}
              onAddToWishlist={() => {
                if (isWishlisted(product.id)) {
                  removeFromWishlist(product.id);
                  showToast("Removed from wishlist", "success");
                } else {
                  addToWishlist(product);
                  showToast("Added to wishlist", "success");
                }
              }}
              onAddToCart={async (quantity = 1) => {
                try {
                  await addToCart(product.id, quantity);
                  showToast("Added to cart", "success");
                } catch (err) {
                  showToast("Failed to add to cart", "error");
                }
              }}
              onPrefetch={() => prefetchProduct(product.id)}
              isInWishlist={isWishlisted(product.id)}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProductCarousel;
