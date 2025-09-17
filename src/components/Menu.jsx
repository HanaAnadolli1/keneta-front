import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon, X as CloseIcon, ChevronDown } from "lucide-react";

const API_BASE = "https://admin.keneta-ks.com/api/v2";

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

// pick an icon URL from the category object
function getCatIconUrl(cat) {
  return (
    cat?.logo_url ||
    cat?.image_url ||
    cat?.image?.url ||
    cat?.thumbnail ||
    cat?.icon ||
    null
  );
}

export default function Menu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("categories"); // "categories" | "pages"

  const [rootCategories, setRootCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [activeRootId, setActiveRootId] = useState(null);
  const [activeLevel2Id, setActiveLevel2Id] = useState(null);
  const [activeLevel3Id, setActiveLevel3Id] = useState(null);

  const wrapRef = useRef(null);

  // desktop top nav "pages"
  const pages = [
    // { label: "Produktet", path: "/products" },
    { label: "Brendet", path: "/brands" },
    { label: "Deals", path: "/deals" },
    { label: "Të rejat", path: "/new-arrivals" },
    { label: "Outlet", path: "/outlet" },
  ];

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

  // ESC / outside-click to close (desktop only so it doesn't kill the mobile drawer)
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeAll();
    };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        if (window.innerWidth >= 768) closeAll();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [dropdownOpen]);

  // Listen for BottomNav trigger to open categories on mobile
  useEffect(() => {
    const onOpen = () => {
      setActiveMobileTab("categories");
      setDropdownOpen(true);
    };
    window.addEventListener("keneta:openMobileCategories", onOpen);
    return () =>
      window.removeEventListener("keneta:openMobileCategories", onOpen);
  }, []);

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
        {[level2, level3, level4].map((level, colIndex) =>
          level.length > 0 ? (
            <ul
              key={colIndex}
              className="min-w-[240px] h-full overflow-visible bg-white"
            >
              {level.map((cat, itemIndex) => {
                // show icons ONLY for the first two items of the first column (level-2)
                const showIcon =
                  colIndex === 0 && itemIndex < 2 && getCatIconUrl(cat);
                return (
                  <li
                    key={cat.id}
                    onMouseEnter={() => handleHover(colIndex + 2, cat.id)}
                    className="px-5 py-2 hover:bg-gray-100 text-[#132232] whitespace-nowrap transition-colors duration-150 cursor-pointer"
                  >
                    <Link
                      to={`/products?category=${encodeURIComponent(cat.slug)}`}
                      className="block hover:text-[#1a3c5c]"
                    >
                      <span className="inline-flex items-center gap-2">
                        {showIcon && (
                          <img
                            src={getCatIconUrl(cat)}
                            alt=""
                            className="w-5 h-5 object-contain"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {cat.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null
        )}
      </div>
    );
  };

  return (
    // 👇 No white strip on mobile: styles only apply from md: and up
    <nav className="md:bg-white md:py-4 md:shadow" ref={wrapRef}>
      <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-4">
        {/* Desktop Menu */}
        <div className="flex items-center space-x-8">
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
                  {rootCategories.map((cat, idx) => (
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
                        <span className="inline-flex items-center gap-2">
                          {/* Only show icon for first and second root categories */}
                          {idx < 2 && getCatIconUrl(cat) && (
                            <img
                              src={getCatIconUrl(cat)}
                              alt=""
                              className="w-5 h-5 object-contain"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {cat.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Submenus */}
                {activeRootId && renderMegaMenu()}
              </div>
            )}
          </div>

          {pages.map(({ label, path }, idx) => (
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
      </div>

      {/* ===================== Mobile Off-canvas (opens via BottomNav event) ===================== */}
      {dropdownOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-hidden="true"
            onClick={closeAll}
          />

          {/* Panel */}
          <div
            className="
              absolute left-0 top-0 bottom-0
              w-[92vw] max-w-[420px]
              bg-white rounded-r-2xl shadow-2xl
              overflow-hidden
              flex flex-col
              pt-[env(safe-area-inset-top)]
              pb-[env(safe-area-inset-bottom)]
            "
            role="dialog"
            aria-label="Menu mobil"
          >
            {/* Header with tabs */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="flex items-center justify-between px-3 py-3">
                <span className="font-semibold text-[#132232] text-[16px]">
                  Menu
                </span>
                <button
                  onClick={closeAll}
                  aria-label="Mbyll"
                  className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
              {/* Segmented control */}
              <div className="px-3 pb-2">
                <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
                  {[
                    { key: "categories", label: "Kategoritë" },
                    { key: "pages", label: "Faqet" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveMobileTab(tab.key)}
                      className={`py-2 rounded-lg text-sm font-medium transition ${
                        activeMobileTab === tab.key
                          ? "bg-white shadow text-[#1a3c5c]"
                          : "text-[#132232]/70 hover:text-[#132232]"
                      }`}
                      aria-pressed={activeMobileTab === tab.key}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {activeMobileTab === "pages" ? (
                // ----------------------- PAGES LIST -----------------------
                <ul className="space-y-1">
                  {pages.map(({ label, path }) => (
                    <li key={path}>
                      <Link
                        to={path}
                        className="block px-3 py-3 rounded-xl text-[15px] text-[#132232] hover:bg-gray-50 active:bg-gray-100 transition"
                        onClick={closeAll}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                // -------------------- CATEGORIES DRILLDOWN --------------------
                <ul className="divide-y divide-gray-100">
                  {rootCategories.map((root, idx) => {
                    const open = activeRootId === root.id;
                    const lvl2 = subcategories[root.id] || [];
                    return (
                      <li key={root.id} className="py-1">
                        {/* Row: root */}
                        <button
                          className="
                            w-full text-left flex items-center justify-between
                            py-3 px-2 rounded-xl
                            hover:bg-gray-50 active:bg-gray-100
                            transition
                          "
                          onClick={() => {
                            setActiveRootId(open ? null : root.id);
                            if (!open) fetchChildren(root.id);
                          }}
                          aria-expanded={open}
                          aria-controls={`root-${root.id}`}
                        >
                          <span className="font-medium text-[15px] text-[#132232] inline-flex items-center gap-2">
                            {idx < 2 && getCatIconUrl(root) && (
                              <img
                                src={getCatIconUrl(root)}
                                alt=""
                                className="w-5 h-5 object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {root.name}
                          </span>
                          <div className="flex items-center gap-3">
                            {/* Quick "view all" */}
                            <Link
                              to={`/products?category=${encodeURIComponent(
                                root.slug
                              )}`}
                              className="text-xs font-medium text-[#1a3c5c] hover:underline"
                              onClick={closeAll}
                            >
                              Shiko të gjitha
                            </Link>
                            <ChevronDown
                              size={18}
                              className={`transition-transform duration-200 ${
                                open
                                  ? "rotate-180 text-[#1a3c5c]"
                                  : "text-[#132232]"
                              }`}
                            />
                          </div>
                        </button>

                        {/* Level 2 */}
                        {open && (
                          <ul
                            id={`root-${root.id}`}
                            className="ml-1 mt-1 pl-2 border-l border-gray-100"
                          >
                            {lvl2.length === 0 && (
                              <li className="text-sm text-gray-500 py-2 px-1">
                                Po ngarkohet…
                              </li>
                            )}
                            {lvl2.map((c2, i2) => {
                              const open2 = activeLevel2Id === c2.id;
                              const lvl3 = subcategories[c2.id] || [];
                              return (
                                <li key={c2.id} className="py-1">
                                  <div className="flex items-center justify-between">
                                    <button
                                      className="
                                        text-left flex-1 py-2 px-2 rounded-lg
                                        hover:bg-gray-50 active:bg-gray-100
                                        text-[14px]
                                      "
                                      onClick={() => {
                                        setActiveLevel2Id(open2 ? null : c2.id);
                                        if (!open2) fetchChildren(c2.id);
                                      }}
                                      aria-expanded={open2}
                                      aria-controls={`lvl2-${c2.id}`}
                                    >
                                      {i2 < 2 && getCatIconUrl(c2) && (
                                        <img
                                          src={getCatIconUrl(c2)}
                                          alt=""
                                          className="w-5 h-5 object-contain"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      {c2.name}
                                    </button>
                                    <div className="flex items-center gap-2 pr-1">
                                      <Link
                                        to={`/products?category=${encodeURIComponent(
                                          c2.slug
                                        )}`}
                                        className="text-xs text-[#1a3c5c] hover:underline"
                                        onClick={closeAll}
                                      >
                                        Shiko
                                      </Link>
                                      <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${
                                          open2
                                            ? "rotate-180 text-[#1a3c5c]"
                                            : "text-[#132232]"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  {/* Level 3 */}
                                  {open2 && (
                                    <ul
                                      id={`lvl2-${c2.id}`}
                                      className="ml-3 mt-1 pl-2 border-l border-gray-100"
                                    >
                                      {lvl3.length === 0 && (
                                        <li className="text-sm text-gray-500 py-2 px-1">
                                          Po ngarkohet…
                                        </li>
                                      )}
                                      {lvl3.map((c3) => {
                                        const lvl4 = subcategories[c3.id] || [];
                                        const open3 = activeLevel3Id === c3.id;
                                        return (
                                          <li key={c3.id} className="py-1">
                                            <div className="flex items-center justify-between">
                                              <button
                                                className="
                                                  text-left flex-1 py-2 px-2 rounded-lg
                                                  hover:bg-gray-50 active:bg-gray-100
                                                  text-[14px]
                                                "
                                                onClick={() => {
                                                  setActiveLevel3Id(
                                                    open3 ? null : c3.id
                                                  );
                                                  if (!open3)
                                                    fetchChildren(c3.id);
                                                }}
                                                aria-expanded={open3}
                                                aria-controls={`lvl3-${c3.id}`}
                                              >
                                                {c3.name}
                                              </button>
                                              <div className="flex items-center gap-2 pr-1">
                                                <Link
                                                  to={`/products?category=${encodeURIComponent(
                                                    c3.slug
                                                  )}`}
                                                  className="text-xs text-[#1a3c5c] hover:underline"
                                                  onClick={closeAll}
                                                >
                                                  Shiko
                                                </Link>
                                                <ChevronDown
                                                  size={16}
                                                  className={`transition-transform duration-200 ${
                                                    open3
                                                      ? "rotate-180 text-[#1a3c5c]"
                                                      : "text-[#132232]"
                                                  }`}
                                                />
                                              </div>
                                            </div>

                                            {/* Level 4 */}
                                            {open3 && (
                                              <ul
                                                id={`lvl3-${c3.id}`}
                                                className="ml-4 mt-1 space-y-1"
                                              >
                                                {lvl4.length === 0 && (
                                                  <li className="text-sm text-gray-500 py-2 px-1">
                                                    Po ngarkohet…
                                                  </li>
                                                )}
                                                {lvl4.map((c4) => (
                                                  <li key={c4.id}>
                                                    <Link
                                                      to={`/products?category=${encodeURIComponent(
                                                        c4.slug
                                                      )}`}
                                                      className="block py-2 px-2 rounded-md text-[14px] text-[#132232] hover:text-[#1a3c5c] hover:bg-gray-50 transition-colors"
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
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
