import React, { useState, useContext, useRef, useEffect } from "react";
import {
  FiShoppingCart,
  FiSearch,
  FiChevronDown,
  FiHeart,
} from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import logo from "../assets/logo.png";
import { API_V1 } from "../api/config";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { wishlistCount } = useWishlist(); // ✅ count now reacts for guests & customers

  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Close account dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      const term = searchQuery.trim();
      if (term.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        setLoadingSuggestions(true);
        const res = await fetch(
          `${API_V1}/products?query=${encodeURIComponent(term)}&limit=5`,
          { credentials: "include", headers: { Accept: "application/json" } }
        );
        const json = await res.json();
        const arr = Array.isArray(json?.data)
          ? json.data
          : json?.data?.items || [];
        setSuggestions(arr);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [searchQuery]);

  function handleLogout() {
    logout(); // this fires "auth-changed" which updates WishlistContext
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    const term = searchQuery.trim();
    if (term) {
      navigate(`/products?query=${encodeURIComponent(term)}&page=1`);
      setShowSuggestions(false);
    }
  }

  function handleSelectSuggestion(item) {
    if (item.url_key) navigate(`/products/${item.url_key}`);
    else navigate(`/products?query=${encodeURIComponent(item.name)}&page=1`);
    setShowSuggestions(false);
  }

  return (
    <>
      <header className="flex flex-col w-full">
        {/* Top Bar */}
        <div className="bg-[#1a3c5c] text-white text-xs md:text-sm flex justify-center">
          <div className="w-full max-w-7xl flex flex-wrap justify-between items-center px-4 md:px-6 py-2 gap-2">
            <div>Lokacioni i depos tonë</div>
            <div className="hidden md:block text-center">
              Pakot standarte transportohen falas për blerjet mbi 50€
            </div>
            <div>B2B</div>
          </div>
        </div>

        {/* Main Header */}
        <div className="flex justify-center bg-transparent">
          <div className="w-full max-w-7xl flex flex-wrap justify-between items-center px-4 md:px-6 py-4 md:py-6 gap-4">
            {/* Logo */}
            <div className="text-2xl md:text-4xl font-bold text-[#193653]">
              <Link to="/">
                <img
                  src={logo}
                  alt="Keneta Logo"
                  className="w-52 cursor-pointer"
                />
              </Link>
            </div>

            {/* Search */}
            <div
              ref={searchRef}
              className="relative flex flex-1 w-full md:max-w-3xl mx-auto md:mx-10"
            >
              <form onSubmit={handleSearch} className="flex w-full">
                <input
                  type="text"
                  placeholder="Kërko..."
                  className="flex-1 px-4 py-2 border-2 border-transparent rounded-l-2xl bg-white outline-none text-[#152a41] text-sm md:text-base focus:border-[#1d446b]"
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchQuery(v);
                    setShowSuggestions(v.trim().length >= 2);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2)
                      setShowSuggestions(true);
                  }}
                />
                <button
                  type="submit"
                  className="bg-[#1d446b] text-white flex items-center justify-center px-4 md:px-6 rounded-r-2xl text-sm md:text-base"
                >
                  <FiSearch />
                </button>
              </form>

              {showSuggestions && (
                <ul className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-b-2xl shadow-lg z-50 max-h-60 overflow-auto">
                  {loadingSuggestions ? (
                    <li className="px-4 py-2 text-gray-500">Loading...</li>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm md:text-base"
                      >
                        {item.name} {item.sku ? `(${item.sku})` : ""}
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-gray-500">
                      No suggestions found
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Account & Cart */}
            <div className="flex items-center gap-4 md:gap-6">
              {/* Wishlist with badge from context */}
              <Link to="/wishlist" className="relative text-[#1d3d62] text-2xl">
                <FiHeart />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen((o) => !o)}
                  className="flex items-center text-[#1e456c] text-sm md:text-lg font-medium focus:outline-none"
                >
                  {currentUser?.first_name ||
                    currentUser?.name ||
                    "Llogaria ime"}
                  <FiChevronDown className="ml-1" />
                </button>
                {isDropdownOpen && currentUser && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profilin tim
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Dil
                    </button>
                  </div>
                )}
                {!currentUser && isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Kyçu
                    </Link>
                  </div>
                )}
              </div>

              <div
                onClick={() => setIsCartOpen(true)}
                className="text-[#1d3d62] text-2xl cursor-pointer"
              >
                <FiShoppingCart />
              </div>
            </div>
          </div>
        </div>
      </header>

      <Menu />
      <CartSidebar open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
