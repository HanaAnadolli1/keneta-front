import React, { useEffect, useState } from "react";

const Brands = () => {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(
          "https://keneta.laratest-app.com/api/v1/attributes?sort=id"
        );
        const data = await response.json();

        // Find attribute with code "brand"
        const brandAttribute = data.data.find((attr) => attr.code === "brand");

        // Set the options of the brand attribute (array of brands)
        if (brandAttribute && brandAttribute.options) {
          setBrands(brandAttribute.options);
        }
      } catch (error) {
        console.error("Failed to load brands:", error);
      }
    };

    fetchBrands();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-indigo-900 mb-6">Brendet</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-gray-100 h-24 flex items-center justify-center text-center rounded shadow-sm text-lg font-semibold text-gray-700"
          >
            {brand.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Brands;
