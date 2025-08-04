import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import noImage from "../../assets/no_image.jpg";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const themeRes = await fetch(
          "https://keneta.laratest-app.com/api/v1/theme/customizations",
          { headers: { Accept: "application/json" } }
        );

        const themeData = await themeRes.json();
        const block = themeData.data.find(
          (item) => item.type === "category_carousel"
        );

        const sort = block?.options?.filters?.sort || "asc";
        const limit = block?.options?.filters?.limit || "25";

        const categoriesRes = await fetch(
          `https://keneta.laratest-app.com/api/v1/categories?sort=id&order=${sort}&limit=${limit}`,
          { headers: { Accept: "application/json" } }
        );

        const data = await categoriesRes.json();

        const filtered = (data?.data || []).filter(
          (cat) => cat.id !== 1 && String(cat.status) === "1"
        );

        setCategories(filtered);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Failed to load categories");
      }
    };

    fetchCategories();
  }, []);

  if (error) {
    return (
      <div className="px-4 py-8 max-w-7xl mx-auto text-red-600">{error}</div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">
        Choose your category
      </h2>

      {categories.length === 0 ? (
        <div className="text-gray-500">No categories available.</div>
      ) : (
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={12} // 👈 tighter spacing between slides
          slidesPerView={4}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id}>
              <a
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="group bg-white transition px-4 py-6 flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <img
                    src={cat.logo_url || noImage}
                    alt={cat.name}
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-800 transition-all duration-200 group-hover:scale-105 group-hover:text-base">
                  {cat.name}
                </span>
              </a>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};

export default Categories;
