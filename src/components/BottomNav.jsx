import { Link, useLocation } from "react-router-dom";
import { Home, Menu as MenuIcon, ShoppingCart, User2, Heart } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

export default function BottomNav() {
  const { currentUser } = useContext(AuthContext);
  const { wishlistCount } = useWishlist();
  const { pathname } = useLocation();

  const openCategories = () => {
    window.dispatchEvent(new CustomEvent("keneta:openMobileCategories"));
  };

  const openCart = () => {
    window.dispatchEvent(new CustomEvent("keneta:openCart"));
  };

  const Item = ({ active, children }) => (
    <div
      className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
        active ? "text-[var(--secondary)]" : "text-[#132232]"
      }`}
    >
      {children}
    </div>
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[70] bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {/* Ballina */}
        <Link to="/" className="flex items-center justify-center" aria-label="Ballina">
          <Item active={pathname === "/"}>
            <Home size={22} />
            <span>Home</span>
          </Item>
        </Link>

        {/* Kategoritë */}
        <button
          onClick={openCategories}
          className="flex items-center justify-center"
          aria-label="Kategoritë"
        >
          <Item active={false}>
            <MenuIcon size={22} />
            <span>Categories</span>
          </Item>
        </button>

        {/* Shporta */}
        <button
          onClick={openCart}
          className="flex items-center justify-center"
          aria-label="Shporta"
        >
          <Item active={false}>
            <ShoppingCart size={22} />
            <span>Cart</span>
          </Item>
        </button>

        {/* Favoritet (Wishlist) */}
        <Link to="/wishlist" className="flex items-center justify-center" aria-label="Favoritet">
          <Item active={pathname.startsWith("/wishlist")}>
            <div className="relative">
              <Heart size={22} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-semibold leading-none">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span>Favorites</span>
          </Item>
        </Link>

        {/* Kyçu / Llogaria */}
        <Link
          to={currentUser ? "/account" : "/login"}
          className="flex items-center justify-center"
          aria-label={currentUser ? "Llogaria" : "Kyçu"}
        >
          <Item active={pathname.startsWith("/account") || pathname.startsWith("/login")}>
            <User2 size={22} />
            <span>{currentUser ? "Llogaria" : "Kyçu"}</span>
          </Item>
        </Link>
      </div>
    </nav>
  );
}
