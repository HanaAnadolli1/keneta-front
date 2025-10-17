import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getCategoryName } from "../../utils/translations";
import noImage from "../../assets/no_image.jpg";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const themeRes = await fetch(
          "https://admin.keneta-ks.com/api/v2/theme/customizations",
          { headers: { Accept: "application/json" } }
        );

        const themeData = await themeRes.json();
        const block = themeData.data.find(
          (item) => item.type === "category_carousel"
        );

        const sort = block?.options?.filters?.sort || "asc";
        const limit = block?.options?.filters?.limit || "20";

        const categoriesRes = await fetch(
          `https://admin.keneta-ks.com/api/v2/categories?sort=id&order=${sort}&limit=${limit}`,
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
    return <div className="px-4 py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
        Top categories
      </h2>

      {categories.length === 0 ? (
        <div className="text-gray-500 text-center">
          No categories available.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.slug)}`}
              className="group bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 flex items-center justify-center mb-3">
                <img
                  src={cat.logo_url || noImage}
                  alt={getCategoryName(cat, language)}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#00A7E5] group-hover:underline transition-colors duration-200">
                {getCategoryName(cat, language)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
