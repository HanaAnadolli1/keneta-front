import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X as CloseIcon, ChevronDown } from "lucide-react";

/**
 * Responsive navigation bar with custom palette and left-origin underline animation.
 */
const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);

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

  const renderCategories = (isMobile = false) => (
    <div
      className={
        isMobile
          ? "flex flex-col space-y-1 mt-2 pl-4"
          : "absolute left-0 mt-2 w-[700px] bg-white border shadow-lg grid grid-cols-3 gap-4 p-4 z-50"
      }
    >
      {categories.map((cat) => (
        <Link
          to={`/products?category=${cat.id}`}
          key={cat.id}
          className={`flex items-center space-x-3 p-2
            text-sm text-[#132232]
            border-b-2 border-transparent
            hover:border-[#1a3c5c]
            transition-all duration-200`}
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
          <span className="truncate">{cat.name}</span>
        </Link>
      ))}
    </div>
  );

  const labels = [
    { label: "Produktet", to: "/products" },
    { label: "Brendet", to: "/brands" },
    { label: "Deals", to: "#" },
    { label: "Të rejat", to: "#" },
    { label: "Outlet", to: "#" },
  ];

  return (
    <nav className="bg-white p-4 shadow relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center font-bold text-lg text-[#132232] hover:text-[#1a3c5c]"
            >
              <span className="mr-2">☰</span>
              Kategoritë
              <ChevronDown
                size={18}
                className={`ml-1 transition-transform ${
                  dropdownOpen ? "rotate-180 text-[#1d446b]" : "rotate-0"
                }`}
              />
            </button>
            {dropdownOpen && renderCategories(false)}
          </div>

          {labels.map(({ label, to }, idx) => (
            <Link
              to={to}
              key={idx}
              className="group relative text-[#132232] font-bold"
            >
              {label}
              <span className="absolute left-0 bottom-0 h-0.5 w-full bg-[#1a3c5c] transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-[#132232] hover:text-[#1a3c5c]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <CloseIcon size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden absolute left-0 top-full w-full bg-white shadow-lg p-4 flex flex-col space-y-4 z-40">
          <div>
            <button
              onClick={() => setMobileCatsOpen((o) => !o)}
              className="flex items-center justify-between w-full font-bold text-[#132232] hover:text-[#1a3c5c]"
            >
              <span className="flex items-center">
                <span className="mr-2">☰</span>
                Kategoritë
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  mobileCatsOpen ? "rotate-180 text-[#1d446b]" : "rotate-0"
                }`}
              />
            </button>
            {mobileCatsOpen && renderCategories(true)}
          </div>

          {labels.map(({ label, to }, idx) => (
            <Link
              to={to}
              key={idx}
              onClick={() => setMobileOpen(false)}
              className="group relative text-[#132232] font-bold"
            >
              {label}
              <span className="absolute left-0 bottom-0 h-0.5 w-full bg-[#1a3c5c] transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Menu;
