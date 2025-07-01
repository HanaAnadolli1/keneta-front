// src/components/Header.jsx
import React, { useState, useContext, useRef, useEffect } from "react";
import { FiShoppingCart, FiSearch, FiChevronDown } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import logo from "../assets/logo.png";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
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
              <img src={logo} alt="Keneta Logo" className="w-52" />
            </div>

            {/* Search Bar */}
            <div className="flex flex-1 w-full md:max-w-3xl mx-auto md:mx-10">
              <input
                type="text"
                placeholder="Kërko..."
                className="flex-1 px-4 py-2 border-2 border-transparent rounded-l-2xl bg-white outline-none text-[#152a41] text-sm md:text-base focus:border-[#1d446b]"
              />
              <button className="bg-[#1d446b] text-white flex items-center justify-center px-4 md:px-6 rounded-r-2xl text-sm md:text-base">
                <FiSearch />
              </button>
            </div>

            {/* Account & Cart */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen((open) => !open)}
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

      {/* Cart Sidebar */}
      <CartSidebar open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
