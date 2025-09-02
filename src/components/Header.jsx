import React, { useState, useContext, useRef, useEffect } from "react";
import { FiShoppingCart, FiChevronDown, FiHeart } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import BottomNav from "./BottomNav";
import logo from "../assets/logo.png";
import Search from "./Search";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { wishlistCount } = useWishlist();
  const { currentUser, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

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

  // Open cart when bottom nav fires an event
  useEffect(() => {
    const onOpenCart = () => setIsCartOpen(true);
    window.addEventListener("keneta:openCart", onOpenCart);
    return () => window.removeEventListener("keneta:openCart", onOpenCart);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="flex flex-col w-full">
        {/* Top Bar */}
        <div className="bg-[var(--primary)] text-white text-xs md:text-sm flex justify-center">
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
            <div className="text-2xl md:text-4xl font-bold text-[var(--secondary)]">
              <Link to="/">
                <img
                  src={logo}
                  alt="Keneta Logo"
                  className="w-52 cursor-pointer"
                />
              </Link>
            </div>

            {/* Search */}
            <Search />

            {/* Account & Cart (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-4 md:gap-6">
              {/* Wishlist with badge */}
              <Link to="/wishlist" className="relative text-[var(--secondary)] text-2xl">
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
                  className="flex items-center text-[var(--secondary)] text-sm md:text-lg font-medium focus:outline-none"
                >
                  {currentUser?.first_name || currentUser?.name || "Llogaria ime"}
                  <FiChevronDown className="ml-1" />
                </button>
                {isDropdownOpen && currentUser && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <Link
                      to="/account"
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

              {/* Cart Icon */}
              <div
                onClick={() => setIsCartOpen(true)}
                className="text-[var(--secondary)] text-2xl cursor-pointer"
              >
                <FiShoppingCart />
              </div>
            </div>
          </div>
        </div>
      </header>

      <Menu />
      <CartSidebar open={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Mobile bottom navigation */}
      <BottomNav />
    </>
  );
}
