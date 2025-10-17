import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Menu as MenuIcon,
  ShoppingCart,
  User2,
  Heart,
  Globe,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../api/hooks";
import { useLanguage } from "../context/LanguageContext";

export default function BottomNav() {
  const { currentUser } = useContext(AuthContext);
  const { wishlistCount } = useWishlist();
  const { data: cart } = useCart();
  const { pathname } = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

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

  const toggleLanguageMenu = () => {
    setShowLanguageMenu(!showLanguageMenu);
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setShowLanguageMenu(false);
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
        {/* Home */}
        <Link
          to="/"
          className="flex items-center justify-center"
          aria-label={t("common.home")}
        >
          <Item active={pathname === "/"}>
            <Home size={22} />
            <span>{t("common.home")}</span>
          </Item>
        </Link>

        {/* Categories */}
        <button
          onClick={openCategories}
          className="flex items-center justify-center"
          aria-label={t("common.categories")}
        >
          <Item active={false}>
            <MenuIcon size={22} />
            <span>{t("common.categories")}</span>
          </Item>
        </button>

        {/* Cart */}
        <button
          onClick={openCart}
          className="flex items-center justify-center"
          aria-label={t("common.cart")}
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
            <span>{t("common.cart")}</span>
          </Item>
        </button>

        {/* Wishlist */}
        <Link
          to="/wishlist"
          className="flex items-center justify-center"
          aria-label={t("common.wishlist")}
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
            <span>{t("common.wishlist")}</span>
          </Item>
        </Link>

        {/* Language / Account */}
        <div className="relative flex items-center justify-center">
          {showLanguageMenu ? (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
              <button
                onClick={() => handleLanguageChange("sq")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  language === "sq"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <span>🇦🇱</span>
                <span>Shqip</span>
                {language === "sq" && <span className="ml-auto">✓</span>}
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  language === "en"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <span>🇺🇸</span>
                <span>English</span>
                {language === "en" && <span className="ml-auto">✓</span>}
              </button>
            </div>
          ) : (
            <Link
              to={currentUser ? "/account" : "/login"}
              className="flex items-center justify-center"
              aria-label={currentUser ? t("common.account") : t("common.login")}
            >
              <Item
                active={
                  pathname.startsWith("/account") ||
                  pathname.startsWith("/login")
                }
              >
                <User2 size={22} />
                <span>
                  {currentUser ? t("common.account") : t("common.login")}
                </span>
              </Item>
            </Link>
          )}

          {/* Language toggle button */}
          <button
            onClick={toggleLanguageMenu}
            className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
            aria-label="Change language"
          >
            <Globe size={12} />
          </button>
        </div>
      </div>
    </nav>
  );
}
