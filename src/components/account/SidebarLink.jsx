import React from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function SidebarLink({ to, icon, children, grouped = false }) {
  if (grouped) {
    // Row look for a single grouped list (no outer card per item)
    const row = ({ isActive }) =>
      `flex items-center justify-between px-5 py-4 text-[15px] transition ` +
      (isActive ? "bg-slate-50" : "hover:bg-slate-50");

    return (
      <NavLink to={to} className={row}>
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            {/* icon size normalized */}
            {icon && React.cloneElement(icon, { className: "w-5 h-5" })}
          </span>
          <span className="font-medium text-slate-900">{children}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </NavLink>
    );
  }

  // Standalone pill (kept for other places, not used in the grouped list)
  const base =
    "w-full flex items-center justify-between rounded-2xl bg-white ring-1 ring-slate-200 px-5 py-4 transition";
  const active = ({ isActive }) =>
    isActive ? `${base} bg-slate-100` : `${base} hover:bg-slate-50`;

  return (
    <NavLink to={to} className={active}>
      <span className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          {icon && React.cloneElement(icon, { className: "w-5 h-5" })}
        </span>
        <span className="font-medium text-slate-900">{children}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-slate-400" />
    </NavLink>
  );
}
