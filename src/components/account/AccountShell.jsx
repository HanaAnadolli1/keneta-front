import React, { useContext } from "react";
import { Outlet } from "react-router-dom";
import SidebarLink from "./SidebarLink";
import { AuthContext } from "../../context/AuthContext";
import {
  UserRound,
  MapPin,
  ShoppingBag,
  Download,
  Star,
  Heart,
  ShieldCheck,
} from "lucide-react";

export default function AccountShell() {
  const { currentUser } = useContext(AuthContext) || {};
  const firstName =
    currentUser?.first_name || currentUser?.name?.split(" ")[0] || "Hello!";
  const email = currentUser?.email || "";

  return (
    <div className="container max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Greeting card */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <UserRound className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">Hello! {firstName}</p>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          {/* Grouped list (single card, no gaps) */}
          <nav className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-200">
            <SidebarLink grouped to="/account/profile" icon={<UserRound />}>
              Profile
            </SidebarLink>
            <SidebarLink grouped to="/account/address" icon={<MapPin />}>
              Address
            </SidebarLink>
            <SidebarLink grouped to="/account/orders" icon={<ShoppingBag />}>
              Orders
            </SidebarLink>
            <SidebarLink grouped to="/account/downloads" icon={<Download />}>
              Downloadable Products
            </SidebarLink>
            <SidebarLink grouped to="/account/reviews" icon={<Star />}>
              Reviews
            </SidebarLink>
            <SidebarLink grouped to="/account/wishlist" icon={<Heart />}>
              Wishlist
            </SidebarLink>
            <SidebarLink grouped to="/account/gdpr" icon={<ShieldCheck />}>
              GDPR Requests
            </SidebarLink>
          </nav>
        </aside>

        {/* RIGHT */}
        <main className="lg:col-span-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
