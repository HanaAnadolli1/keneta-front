import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const DealsCarousel = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com/api/v1/theme/customizations"
        );
        const json = await res.json();

        const dealSection = json.data.find(
          (item) =>
            item.type === "product_carousel" && item.name === "Discounts"
        );

        if (!dealSection) return;

        // You’ll likely want to fetch actual product data based on filters
        // But since this config only contains filter info, you must query the products manually.
        const productRes = await fetch(
          `https://keneta.laratest-app.com/api/v1/products?sort=name-asc&limit=12`
        );
        const productData = await productRes.json();
        setProducts(productData.data || []);
      } catch (error) {
        console.error("Failed to load deals", error);
      }
    };

    fetchDeals();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Deals</h2>
        <a
          href="/products?filter=discounts"
          className="text-sky-600 text-sm font-medium"
        >
          më shumë
        </a>
      </div>

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
            <div className="bg-white border rounded shadow-sm p-3 flex flex-col h-full">
              <div className="bg-gray-100 aspect-square rounded mb-2 overflow-hidden">
                <img
                  src={product.images?.[0]?.url || "/placeholder.png"}
                  alt={product.name}
                  className="object-contain h-full w-full"
                />
              </div>

              <div className="text-xs text-gray-500 font-semibold">
                {product.brand || "Makita"}
              </div>
              <div className="text-sm text-gray-800 font-medium truncate">
                {product.name}
              </div>
              <div className="text-green-600 text-xs my-1">• Në stock</div>

              <div className="mt-auto">
                {product.special_price ? (
                  <>
                    <div className="text-gray-400 text-xs line-through">
                      {product.price}€
                    </div>
                    <div className="text-lg font-bold">
                      {product.special_price}€
                    </div>
                  </>
                ) : (
                  <div className="text-lg font-bold">{product.price}€</div>
                )}
              </div>

              <button className="mt-2 text-sky-500 hover:text-sky-600 text-2xl self-end">
                🛒
              </button>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default DealsCarousel;
