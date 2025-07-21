import { useEffect, useState } from "react";

const Categories = () => {
  const [groupedCategories, setGroupedCategories] = useState({});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com/api/v1/categories?sort=id&order=asc"
        );
        const json = await res.json();

        const filtered = (json?.data || []).filter(
          (cat) => cat.id !== 1 && cat.status === 1 && cat.logo_url
        );

        const grouped = {};
        filtered.forEach((cat) => {
          const parentId = cat.parent_id || 0;
          if (!grouped[parentId]) {
            grouped[parentId] = [];
          }
          grouped[parentId].push(cat);
        });

        setGroupedCategories(grouped);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const renderCategoryTree = () => {
    const parents = groupedCategories[0] || [];

    return parents.map((parent) => (
      <div key={parent.id} className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{parent.name}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(groupedCategories[parent.id] || []).map((child) => (
            <a
              key={child.id}
              href={`/categories/${child.slug}`}
              className="bg-gray-100 hover:bg-gray-200 transition rounded-md p-4 flex flex-col items-center shadow-sm"
            >
              <img
                src={child.logo_url}
                alt={child.name}
                className="h-20 object-contain mb-2"
              />
              <span className="text-sm font-semibold text-gray-800 text-center">
                {child.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">
        Choose your category
      </h2>
      {renderCategoryTree()}
    </div>
  );
};

export default Categories;
