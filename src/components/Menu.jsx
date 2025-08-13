// src/components/Menu.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X as CloseIcon, ChevronDown } from "lucide-react";

const API_BASE = "https://keneta.laratest-app.com/api/v1";

// simple in-memory cache to avoid duplicate GETs for the same URL
const jsonCache = new Map();
async function fetchJSON(url, { signal } = {}) {
  if (jsonCache.has(url)) return jsonCache.get(url);
  const p = fetch(url, { signal })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .finally(() => {
      // keep positive results cached, allow errors to retry
    });
  jsonCache.set(url, p);
  return p;
}

export default function Menu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rootCategories, setRootCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [activeRootId, setActiveRootId] = useState(null);
  const [activeLevel2Id, setActiveLevel2Id] = useState(null);
  const [activeLevel3Id, setActiveLevel3Id] = useState(null);

  const wrapRef = useRef(null);

  // root categories (abortable + cached)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const data = await fetchJSON(
          `${API_BASE}/descendant-categories?parent_id=1`,
          { signal: ac.signal }
        );
        const filtered = (data?.data || []).filter((c) => c.status === 1);
        setRootCategories(filtered);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Root category fetch failed:", err);
        }
      }
    })();
    return () => ac.abort();
  }, []);

  // fetch children for a given parent (abortable + cached + memoized by state)
  const fetchChildren = async (parentId, signal) => {
    if (!parentId || subcategories[parentId]) return;
    try {
      const data = await fetchJSON(
        `${API_BASE}/descendant-categories?parent_id=${parentId}`,
        { signal }
      );
      const filtered = (data?.data || []).filter((c) => c.status === 1);
      setSubcategories((prev) => ({ ...prev, [parentId]: filtered }));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Child category fetch failed:", err);
      }
    }
  };

  // open/close helpers
  const closeAll = () => {
    setDropdownOpen(false);
    setActiveRootId(null);
    setActiveLevel2Id(null);
    setActiveLevel3Id(null);
  };

  // ESC / outside-click to close
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeAll();
    };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        closeAll();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [dropdownOpen]);

  const handleHover = (level, categoryId) => {
    // desktop hover path management
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
    // hint children
    const ac = new AbortController();
    fetchChildren(categoryId, ac.signal);
  };

  const renderMegaMenu = () => {
    const level2 = subcategories[activeRootId] || [];
    const level3 = subcategories[activeLevel2Id] || [];
    const level4 = subcategories[activeLevel3Id] || [];

    return (
      <div
        className="absolute top-0 left-full z-50 flex bg-white shadow-xl min-h-[300px] overflow-visible"
        role="menu"
        aria-label="Subcategories"
      >
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
                    to={`/products?category=${encodeURIComponent(cat.slug)}`}
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
    <nav className="bg-white py-4 shadow" ref={wrapRef}>
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Dropdown Root */}
          <div
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={closeAll}
          >
            <button
              className="flex items-center font-semibold text-base text-[#132232] hover:text-[#1a3c5c] transition-colors"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDropdownOpen((v) => !v);
                }
              }}
            >
              <MenuIcon className="mr-2" size={20} />
              Kategoritë
              <ChevronDown
                size={18}
                className={`ml-1 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-[#1a3c5c]" : ""
                }`}
              />
            </button>

            {/* Desktop Dropdown */}
            {dropdownOpen && (
              <div
                className="absolute top-full left-0 z-50 flex bg-white shadow-xl min-h-[300px] overflow-visible"
                role="menu"
                aria-label="Categories"
              >
                {/* Root Categories */}
                <ul className="min-w-[240px] h-full overflow-visible bg-white">
                  {rootCategories.map((cat) => (
                    <li
                      key={cat.id}
                      onMouseEnter={() => handleHover(1, cat.id)}
                      className="hover:bg-gray-100 whitespace-nowrap"
                    >
                      <Link
                        to={`/products?category=${encodeURIComponent(
                          cat.slug
                        )}`}
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
          aria-label={dropdownOpen ? "Close menu" : "Open menu"}
          aria-expanded={dropdownOpen}
        >
          {dropdownOpen ? <CloseIcon size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>

      {/* Mobile Off-canvas */}
      {dropdownOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            aria-hidden="true"
            onClick={closeAll}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[#132232]">Kategoritë</span>
              <button onClick={closeAll} aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <ul className="divide-y">
              {rootCategories.map((root) => {
                const open = activeRootId === root.id;
                const lvl2 = subcategories[root.id] || [];
                return (
                  <li key={root.id} className="py-2">
                    <button
                      className="w-full text-left flex items-center justify-between py-2 px-1"
                      onClick={() => {
                        setActiveRootId(open ? null : root.id);
                        if (!open) fetchChildren(root.id);
                      }}
                      aria-expanded={open}
                    >
                      <span className="font-medium">{root.name}</span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {open && (
                      <ul className="ml-2 mt-1">
                        {lvl2.length === 0 && (
                          <li className="text-sm text-gray-500 py-1">
                            Loading…
                          </li>
                        )}
                        {lvl2.map((c2) => {
                          const open2 = activeLevel2Id === c2.id;
                          const lvl3 = subcategories[c2.id] || [];
                          return (
                            <li key={c2.id} className="py-1">
                              <button
                                className="w-full text-left flex items-center justify-between py-1 px-1 text-sm"
                                onClick={() => {
                                  setActiveLevel2Id(open2 ? null : c2.id);
                                  if (!open2) fetchChildren(c2.id);
                                }}
                                aria-expanded={open2}
                              >
                                <span>{c2.name}</span>
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${
                                    open2 ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {open2 && (
                                <ul className="ml-3 mt-1">
                                  {lvl3.length === 0 && (
                                    <li className="text-sm text-gray-500 py-1">
                                      Loading…
                                    </li>
                                  )}
                                  {lvl3.map((c3) => {
                                    const lvl4 = subcategories[c3.id] || [];
                                    const open3 = activeLevel3Id === c3.id;
                                    return (
                                      <li key={c3.id} className="py-1">
                                        <button
                                          className="w-full text-left flex items-center justify-between py-1 px-1 text-sm"
                                          onClick={() => {
                                            setActiveLevel3Id(
                                              open3 ? null : c3.id
                                            );
                                            if (!open3) fetchChildren(c3.id);
                                          }}
                                          aria-expanded={open3}
                                        >
                                          <span>{c3.name}</span>
                                          <ChevronDown
                                            size={14}
                                            className={`transition-transform ${
                                              open3 ? "rotate-180" : ""
                                            }`}
                                          />
                                        </button>

                                        {open3 && (
                                          <ul className="ml-4 mt-1 space-y-1">
                                            {lvl4.length === 0 && (
                                              <li className="text-sm text-gray-500 py-1">
                                                Loading…
                                              </li>
                                            )}
                                            {lvl4.map((c4) => (
                                              <li key={c4.id}>
                                                <Link
                                                  to={`/products?category=${encodeURIComponent(
                                                    c4.slug
                                                  )}`}
                                                  className="block py-1 px-1 text-sm text-[#132232] hover:text-[#1a3c5c]"
                                                  onClick={closeAll}
                                                >
                                                  {c4.name}
                                                </Link>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
