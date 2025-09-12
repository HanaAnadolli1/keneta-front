import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { FaCartPlus } from "react-icons/fa";

const Offers = () => {
  const [offerHtml, setOfferHtml] = useState("");
  const [offerCss, setOfferCss] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchOfferAndDeals = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com/api/v2/theme/customizations"
        );
        const json = await res.json();

        // Offer Information block
        const offerSection = json.data.find(
          (item) =>
            item.type === "static_content" && item.name === "Offer Information"
        );
        if (offerSection) {
          const { html, css } = offerSection.options;
          setOfferHtml(html);
          setOfferCss(css);
        }

        // Find Discounts product_carousel
        const discountConfig = json.data.find(
          (item) =>
            item.type === "product_carousel" && item.name === "Discounts"
        );

        if (discountConfig) {
          const { filters } = discountConfig.options;

          // Fetch products using those filters
          const productRes = await fetch(
            `https://keneta.laratest-app.com/api/v2/products?sort=${filters.sort}&limit=${filters.limit}`
          );
          const productJson = await productRes.json();
          setProducts(productJson.data || []);
        }
      } catch (error) {
        console.error("Error fetching offers or products:", error);
      }
    };

    fetchOfferAndDeals();
  }, []);

  return (
    <div className="relative w-full max-w-7xl mx-auto overflow-hidden px-4">
      {/* Inject backend-provided CSS */}
      {offerCss && <style dangerouslySetInnerHTML={{ __html: offerCss }} />}

      {/* Render backend-provided HTML */}
      {offerHtml && <div dangerouslySetInnerHTML={{ __html: offerHtml }} />}

      {/* Deals Section */}
      {products.length > 0 && (
        <div className="mt-10">
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
                <div className="bg-white rounded shadow-sm hover:shadow-lg p-3 flex flex-col h-full">
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
                    <FaCartPlus />
                  </button>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
};

export default Offers;
