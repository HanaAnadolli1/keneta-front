import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(
          "https://keneta.laratest-app.com/api/v1/attributes?sort=id"
        );
        const data = await response.json();

        const brandAttribute = data.data.find((attr) => attr.code === "brand");

        if (brandAttribute && brandAttribute.options) {
          setBrands(brandAttribute.options);
        }
      } catch (error) {
        console.error("Failed to load brands:", error);
      }
    };

    fetchBrands();
  }, []);

  const slugify = (label) =>
    encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", path: "/" }, { label: "Brands" }]} />
      <h1 className="text-2xl font-bold text-indigo-900 mb-6">Brendet</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
        {brands.map((brand) => (
          <div
            key={brand.id}
            onClick={() => navigate(`/products?brand=${slugify(brand.label)}`)}
            className="cursor-pointer bg-gray-100 h-24 flex items-center justify-center text-center rounded shadow-sm text-lg font-semibold text-gray-700 hover:bg-indigo-100 transition"
          >
            {brand.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Brands;
