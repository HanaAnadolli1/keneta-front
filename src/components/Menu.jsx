import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X as CloseIcon, ChevronDown } from "lucide-react";

const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rootCategories, setRootCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [activeRootId, setActiveRootId] = useState(null);
  const [activeLevel2Id, setActiveLevel2Id] = useState(null);
  const [activeLevel3Id, setActiveLevel3Id] = useState(null);

  useEffect(() => {
    const fetchRootCategories = async () => {
      try {
        const res = await fetch(
          "https://keneta.laratest-app.com/api/v1/descendant-categories?parent_id=1"
        );
        const data = await res.json();
        const filtered = data.data.filter((cat) => cat.status === 1);
        setRootCategories(filtered);
      } catch (err) {
        console.error("Root category fetch failed:", err);
      }
    };
    fetchRootCategories();
  }, []);

  const fetchChildren = async (parentId) => {
    if (subcategories[parentId]) return;
    try {
      const res = await fetch(
        `https://keneta.laratest-app.com/api/v1/descendant-categories?parent_id=${parentId}`
      );
      const data = await res.json();
      const filtered = data.data.filter((cat) => cat.status === 1);
      setSubcategories((prev) => ({ ...prev, [parentId]: filtered }));
    } catch (err) {
      console.error("Child category fetch failed:", err);
    }
  };

  const handleHover = (level, categoryId) => {
    if (level === 1) {
      setActiveRootId(categoryId);
      setActiveLevel2Id(null);
      setActiveLevel3Id(null);
    } else if (level === 2) {
      setActiveLevel2Id(categoryId);
      setActiveLevel3Id(null);
    } else if (level === 3) {
      setActiveLevel3Id(categoryId);
    }
    fetchChildren(categoryId);
  };

  const renderMegaMenu = () => {
    const level2 = subcategories[activeRootId] || [];
    const level3 = subcategories[activeLevel2Id] || [];
    const level4 = subcategories[activeLevel3Id] || [];

    return (
      <div className="absolute top-0 left-full z-50 flex bg-white shadow-xl min-h-[300px] overflow-visible">
        {[level2, level3, level4].map((level, index) =>
          level.length > 0 ? (
            <ul
              key={index}
              className="min-w-[240px] h-full overflow-visible bg-white"
            >
              {level.map((cat) => (
                <li
                  key={cat.id}
                  onMouseEnter={() => handleHover(index + 2, cat.id)}
                  className="px-5 py-2 hover:bg-gray-100 text-[#132232] whitespace-nowrap transition-colors duration-150 cursor-pointer"
                >
                  <Link
                    to={`/products?category=${cat.slug}`}
                    className="block hover:text-[#1a3c5c]"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null
        )}
      </div>
    );
  };

  return (
    <nav className="bg-white py-4 shadow">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Dropdown Root */}
          <div
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => {
              setDropdownOpen(false);
              setActiveRootId(null);
              setActiveLevel2Id(null);
              setActiveLevel3Id(null);
            }}
          >
            <button className="flex items-center font-semibold text-base text-[#132232] hover:text-[#1a3c5c] transition-colors">
              <MenuIcon className="mr-2" size={20} />
              Kategoritë
              <ChevronDown
                size={18}
                className={`ml-1 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-[#1a3c5c]" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 z-50 flex bg-white shadow-xl min-h-[300px] overflow-visible">
                {/* Root Categories */}
                <ul className="min-w-[240px] h-full overflow-visible bg-white">
                  {rootCategories.map((cat) => (
                    <li
                      key={cat.id}
                      onMouseEnter={() => handleHover(1, cat.id)}
                      className="hover:bg-gray-100 whitespace-nowrap"
                    >
                      <Link
                        to={`/products?category=${cat.id}`}
                        className="block px-5 py-2 text-sm font-medium text-[#132232] hover:text-[#1a3c5c] transition-colors"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Submenus */}
                {activeRootId && renderMegaMenu()}
              </div>
            )}
          </div>

          {[
            { label: "Produktet", path: "/products" },
            { label: "Brendet", path: "/brands" },
            { label: "Deals", path: "/deals" },
            { label: "Të rejat", path: "/new-arrivals" },
            { label: "Outlet", path: "/outlet" },
          ].map(({ label, path }, idx) => (
            <Link
              key={idx}
              to={path}
              className="relative text-[#132232] font-semibold text-base hover:text-[#1a3c5c] transition-colors group"
            >
              {label}
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#1a3c5c] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </Link>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="md:hidden text-[#132232]"
        >
          {dropdownOpen ? <CloseIcon size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>
    </nav>
  );
};

export default Menu;
