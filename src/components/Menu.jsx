import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X as CloseIcon, ChevronDown } from "lucide-react";

/**
 * Responsive navigation bar.
 *
 * Behaviour:
 *  - Desktop (md and up): shows inline menu exactly like the original implementation.
 *  - Mobile (< md): shows a hamburger button that toggles a slide-down panel.
 *    Inside the panel the “Kategoritë” item expands / collapses to reveal the
 *    fetched categories list.
 */
const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false); // desktop categories dropdown
  const [categories, setCategories] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false); // whole menu on mobile
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false); // categories accordion on mobile

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const toggleMobileMenu = () => setMobileOpen(!mobileOpen);
  const toggleMobileCats = () => setMobileCatsOpen(!mobileCatsOpen);

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

  // Reusable categories markup (grid for desktop, list for mobile)
  const renderCategories = (isMobile = false) => (
    <div
      className={
        isMobile
          ? "flex flex-col space-y-1 mt-2 pl-4" // accordion list
          : "absolute left-0 mt-2 w-[700px] rounded-xs bg-white border shadow-lg grid grid-cols-3 gap-4 p-4 z-50"
      }
    >
      {categories.map((cat) => (
        <Link
          to={`/products?category=${cat.id}`}
          key={cat.id}
          className={
            isMobile
              ? "flex items-center space-x-3 hover:bg-gray-100 p-2 rounded"
              : "flex items-center space-x-3 hover:bg-gray-100 p-2 rounded"
          }
          onClick={() => {
            setDropdownOpen(false);
            setMobileOpen(false);
            setMobileCatsOpen(false);
          }}
        >
          {cat.logo_url && (
            <img
              src={cat.logo_url}
              alt={cat.name}
              className="w-8 h-8 object-contain"
            />
          )}
          <span className="text-sm text-gray-800 truncate">{cat.name}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <nav className="bg-white p-4 shadow relative">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* LEFT: desktop menu */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Kategoritë dropdown */}
          <div className="relative">
            <button
              className="flex items-center font-bold text-lg text-indigo-900"
              onClick={toggleDropdown}
            >
              <span className="mr-2">&#9776;</span> Kategoritë
              <ChevronDown
                className={`ml-1 transition-transform ${
                  dropdownOpen ? "rotate-180" : "rotate-0"
                }`}
                size={18}
              />
            </button>
            {dropdownOpen && renderCategories(false)}
          </div>

          {/* Static menu items */}
          <Link
            to="/products"
            className="text-indigo-900 font-bold cursor-pointer"
          >
            Produktet
          </Link>
          <Link
            to="/brands"
            className="text-indigo-900 font-bold cursor-pointer"
          >
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

        {/* RIGHT: Hamburger for mobile */}
        <button
          className="flex items-center md:hidden text-indigo-900"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <CloseIcon size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden absolute left-0 top-full w-full bg-white shadow-lg p-4 flex flex-col space-y-4 z-40">
          {/* Kategoritë accordion */}
          <div>
            <button
              className="flex items-center justify-between w-full font-bold text-indigo-900"
              onClick={toggleMobileCats}
            >
              <span className="flex items-center">
                <span className="mr-2">&#9776;</span> Kategoritë
              </span>
              <ChevronDown
                className={`transition-transform ${
                  mobileCatsOpen ? "rotate-180" : "rotate-0"
                }`}
                size={18}
              />
            </button>
            {mobileCatsOpen && renderCategories(true)}
          </div>

          {/* Static links */}
          <Link
            to="/products"
            className="text-indigo-900 font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Produktet
          </Link>
          <Link
            to="/brands"
            className="text-indigo-900 font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Brendet
          </Link>
          <Link
            to="#"
            className="text-indigo-900 font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Deals
          </Link>
          <Link
            to="#"
            className="text-indigo-900 font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Të rejat
          </Link>
          <Link
            to="#"
            className="text-indigo-900 font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Outlet
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Menu;
