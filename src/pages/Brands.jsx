import React from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { API_V1 } from "../api/config";

/* ---------------------------------------------
   Fetch all filterable attributes (same as FilterSidebar)
---------------------------------------------- */
async function fetchAllAttributes() {
  let page = 1;
  let all = [];
  let lastPage = 1;

  do {
    const res = await fetch(`${API_V1}/attributes?sort=id&page=${page}`);
    if (!res.ok) throw new Error("Failed to load attributes");
    const json = await res.json();

    all.push(...(json?.data || []));
    lastPage = json?.meta?.last_page || 1;
    page += 1;
  } while (page <= lastPage);

  return all;
}

/* ---------------------------------------------
   De-duplicate options by label (same as FilterSidebar)
---------------------------------------------- */
const normLabel = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, " ")
    .trim();

function dedupeOptionsByLabel(options = []) {
  const seen = new Set();
  const out = [];
  for (const o of options) {
    const key = normLabel(o.label || o.admin_name || o.id);
    if (seen.has(key)) continue; // skip duplicates
    seen.add(key);
    out.push(o);
  }
  return out;
}

/* ---------------------------------------------
   Query hook: get brands using same logic as FilterSidebar
---------------------------------------------- */
function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Get all available attributes
      const all = await fetchAllAttributes();

      // Find the brand attribute
      const brandAttribute = all.find((attr) => attr.code === "brand");

      if (brandAttribute && brandAttribute.options) {
        // Return deduplicated options (same as FilterSidebar)
        return dedupeOptionsByLabel(brandAttribute.options);
      }

      return [];
    },
  });
}

const Brands = () => {
  const navigate = useNavigate();
  const { data: brands = [], isLoading, error } = useBrands();

  // Adjust according to where your files are stored
  const getImageUrl = (swatchValue) =>
    swatchValue ? `https://admin.keneta-ks.com/storage/${swatchValue}` : null;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: "Home", path: "/" }, { label: "Brands" }]}
        />
        <h1 className="text-2xl font-bold text-indigo-900 mb-6">Brendet</h1>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: "Home", path: "/" }, { label: "Brands" }]}
        />
        <h1 className="text-2xl font-bold text-indigo-900 mb-6">Brendet</h1>
        <div className="flex items-center justify-center py-12">
          <p className="text-red-600">
            Failed to load brands. Please try again.
          </p>
        </div>
      </div>
    );
  }

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
              // Use the same URL format as FilterSidebar for consistency
              const url = `/products?brand=${encodeURIComponent(brand.label)}`;
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
