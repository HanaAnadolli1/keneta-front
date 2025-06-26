import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "https://keneta.laratest-app.com/api/v1/categories?sort=id&order=asc"
        );
        const data = await response.json();
        const filtered = data.data.filter(
          (cat) => cat.id !== 1 && cat.status === 1
        );
        setCategories(filtered);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    fetchCategories();
  }, []);

  return (
    <nav className="bg-white p-4 shadow">
      <div className="flex items-center space-x-8 max-w-7xl mx-auto relative">
        {/* Kategoritë Dropdown */}
        <div className="relative">
          <button
            className="flex items-center font-bold text-lg text-indigo-900"
            onClick={toggleDropdown}
          >
            <span className="mr-2">&#9776;</span> Kategoritë
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-[700px] rounded-xs bg-white border shadow-lg grid grid-cols-3 gap-4 p-4 z-50">
              {categories.map((cat) => (
                <Link
                  to={`/products?category=${cat.id}`}
                  key={cat.id}
                  className="flex items-center space-x-3 hover:bg-gray-100 p-2 rounded"
                  onClick={() => setDropdownOpen(false)} // close on click
                >
                  {cat.logo_url && (
                    <img
                      src={cat.logo_url}
                      alt={cat.name}
                      className="w-10 h-10 object-contain"
                    />
                  )}
                  <span className="text-sm text-gray-800">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Static Menu Items with Links */}
        <Link
          to="/products"
          className="text-indigo-900 font-bold cursor-pointer"
        >
          Produktet
        </Link>
        <Link to="/brands" className="text-indigo-900 font-bold cursor-pointer">
          Brendet
        </Link>
        <Link to="#" className="text-indigo-900 font-bold cursor-pointer">
          Deals
        </Link>
        <Link to="#" className="text-indigo-900 font-bold cursor-pointer">
          Të rejat
        </Link>
        <Link to="#" className="text-indigo-900 font-bold cursor-pointer">
          Outlet
        </Link>
      </div>
    </nav>
  );
};

export default Menu;
