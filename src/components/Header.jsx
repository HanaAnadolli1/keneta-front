import React, { useState } from "react";
import { FiShoppingCart, FiSearch } from "react-icons/fi";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import logo from "../assets/logo.png";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col w-full">
        {/* Top Bar */}
        <div className="bg-[#0b2d39] text-white text-xs md:text-sm flex justify-center">
          <div className="w-full max-w-7xl flex flex-wrap justify-between items-center px-4 md:px-6 py-2 gap-2">
            <div>Lokacioni i depos tonë</div>
            <div className="hidden md:block text-center">
              Pakot standarte transportohen falas për blerjet mbi 50€
            </div>
            <div>B2B</div>
          </div>
        </div>

        {/* Main Header */}
        <div className="flex justify-center">
          <div className="w-full max-w-7xl flex flex-wrap justify-between items-center px-4 md:px-6 py-4 md:py-6 gap-4">
            {/* Logo */}
            <div className="text-2xl md:text-4xl font-bold text-[#0b2d39]">
              <img src={logo} alt="Keneta Logo" className="w-52" />
            </div>

            {/* Search Bar */}
            <div className="flex flex-1 w-full md:max-w-3xl mx-auto md:mx-10">
              <input
                type="text"
                placeholder="Kërko..."
                className="flex-1 px-4 py-2 rounded-l-2xl bg-gray-200 outline-none text-sm md:text-base"
              />
              <button className="bg-[#0b2d39] text-white flex items-center justify-center px-4 md:px-6 rounded-r-2xl text-sm md:text-base">
                <FiSearch />
              </button>
            </div>

            {/* Account & Cart */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-[#0b2d39] text-sm md:text-lg font-medium cursor-pointer">
                Llogaria ime
              </div>
              <div
                onClick={() => setIsCartOpen(true)}
                className="text-sky-500 text-2xl cursor-pointer"
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
