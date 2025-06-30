import React, { useState } from "react";
import { FiShoppingCart, FiSearch } from "react-icons/fi";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);

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
        <div className="flex justify-center bg-[#00000000]">
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
                className="flex-1 px-4 py-2 border-2 border-transparent rounded-l-2xl bg-white outline-none text-[#152a41] text-sm md:text-base focus:border-[#1d446b] focus:outline-none"
              />
              <button className="bg-[#1d446b] text-white flex items-center justify-center px-4 md:px-6 rounded-r-2xl text-sm md:text-base">
                <FiSearch />
              </button>
            </div>

            {/* Account & Cart */}
            <div className="flex items-center gap-4 md:gap-6">
              <Link
                to="/login"
                className="text-[#1e456c] text-sm md:text-lg font-medium"
              >
                Llogaria ime
              </Link>
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
