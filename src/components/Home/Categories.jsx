import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const Categories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com${API_V1}categories?sort=id&order=asc"
        );
        const json = await res.json();

        const filtered = (json?.data || []).filter(
          (cat) => cat.id !== 1 && cat.status === 1 && cat.logo_url
        );

        setCategories(filtered);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">
        Choose your category
      </h2>

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
        {categories.map((cat) => (
          <SwiperSlide key={cat.id}>
            <a
              href={`/categories/${cat.slug}`}
              className="bg-gray-100 hover:bg-gray-200 transition rounded-md p-4 flex flex-col items-center shadow-sm h-full"
            >
              <img
                src={cat.logo_url}
                alt={cat.name}
                className="h-24 object-contain mb-4"
              />
              <span className="text-sm font-semibold text-gray-800 text-center">
                {cat.name}
              </span>
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Categories;
