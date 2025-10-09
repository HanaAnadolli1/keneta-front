import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Menu as MenuIcon,
  ShoppingCart,
  User2,
  Heart,
} from "lucide-react";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../api/hooks";

export default function BottomNav() {
  const { currentUser } = useContext(AuthContext);
  const { wishlistCount } = useWishlist();
  const { data: cart } = useCart();
  const { pathname } = useLocation();

  // Calculate cart total quantity (sum of all item quantities)
  const cartCount = Array.isArray(cart?.items)
    ? cart.items.reduce((total, item) => total + (item.quantity || 0), 0)
    : 0;

  // Ensure body has proper padding for fixed bottom nav
  useEffect(() => {
    const originalPaddingBottom = document.body.style.paddingBottom;
    document.body.style.paddingBottom =
      "calc(64px + env(safe-area-inset-bottom))";

    return () => {
      document.body.style.paddingBottom = originalPaddingBottom;
    };
  }, []);

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
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Mobile bottom navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: "translateZ(0)", // Force hardware acceleration
        WebkitTransform: "translateZ(0)", // Safari fix
        willChange: "transform", // Optimize for animations
      }}
    >
      <div className="grid grid-cols-5" style={{ minHeight: "64px" }}>
        {/* Ballina */}
        <Link
          to="/"
          className="flex items-center justify-center"
          aria-label="Ballina"
        >
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
            <span>Menu</span>
          </Item>
        </button>

        {/* Shporta */}
        <button
          onClick={openCart}
          className="flex items-center justify-center"
          aria-label="Shporta"
        >
          <Item active={false}>
            <div className="relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-blue-600 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-semibold leading-none">
                  {cartCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </Item>
        </button>

        {/* Favoritet (Wishlist) */}
        <Link
          to="/wishlist"
          className="flex items-center justify-center"
          aria-label="Favoritet"
        >
          <Item active={pathname.startsWith("/wishlist")}>
            <div className="relative">
              <Heart size={22} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-semibold leading-none">
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
          <Item
            active={
              pathname.startsWith("/account") || pathname.startsWith("/login")
            }
          >
            <User2 size={22} />
            <span>{currentUser ? "Llogaria" : "Kyçu"}</span>
          </Item>
        </Link>
      </div>
    </nav>
  );
}
