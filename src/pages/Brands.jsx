import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { API_V1 } from "../api/config";

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_V1}/attributes?sort=id`);
        const data = await response.json();

        const brandAttribute = data.data.find((attr) => attr.code === "brand");

        if (brandAttribute && brandAttribute.options) {
          console.log("🏷️ Brands Loaded:", {
            totalBrands: brandAttribute.options.length,
            sampleBrands: brandAttribute.options.slice(0, 5).map(b => ({ id: b.id, label: b.label }))
          });
          setBrands(brandAttribute.options);
        }
      } catch (error) {
        console.error("Failed to load brands:", error);
      }
    };

    fetchBrands();
  }, []);

  // Adjust according to where your files are stored
  const getImageUrl = (swatchValue) =>
    swatchValue ? `https://admin.keneta-ks.com/storage/${swatchValue}` : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[{ label: "Home", path: "/" }, { label: "Brands" }]}
      />
      <h1 className="text-2xl font-bold text-indigo-900 mb-6">Brendet</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
        {brands.map((brand) => (
          <div
            key={brand.id}
            onClick={() => {
              const url = `/products?brand=${encodeURIComponent(brand.label)}`;
              console.log("🏷️ Brand Click Debug:", {
                brandId: brand.id,
                brandLabel: brand.label,
                navigationUrl: url
              });
              navigate(url);
            }}
            className="cursor-pointer bg-gray-100 h-24 flex items-center justify-center text-center rounded shadow-sm text-lg font-semibold text-gray-700 hover:bg-indigo-100 transition p-2"
          >
            {brand.swatch_value ? (
              <img
                src={getImageUrl(brand.swatch_value)}
                alt={brand.label}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span>{brand.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Brands;
// test
