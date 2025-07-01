import React, { useState, useContext } from "react";
import { FiShoppingCart, FiSearch } from "react-icons/fi";
import Menu from "./Menu";
import CartSidebar from "./CartSidebar";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { currentUser } = useContext(AuthContext);

  return (
    <>
      <header className="flex flex-col w-full">
        {/* … top bar & logo & search as before … */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/login"
            className="text-[#1e456c] text-sm md:text-lg font-medium"
          >
            {currentUser?.first_name || currentUser?.name || "Llogaria ime"}
          </Link>
          <div
            onClick={() => setIsCartOpen(true)}
            className="text-[#1d3d62] text-2xl cursor-pointer"
          >
            <FiShoppingCart />
          </div>
        </div>
      </header>

      <Menu />
      <CartSidebar open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
