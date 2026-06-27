/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Layers, PlusCircle, Briefcase } from "lucide-react";
import { useTheme } from "./ThemeContext";
import Logo from "./Logo";

interface SidebarProps {
  isDemoMode?: boolean;
  toggleDemoMode?: () => void;
}

export default function Sidebar({ isDemoMode, toggleDemoMode }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();

  const navLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "All Orders", path: "/orders", icon: Layers },
    { name: "Create Order", path: "/create", icon: PlusCircle },
    { name: "My Orders", path: "/my-orders", icon: Briefcase },
  ];

  const isLight = theme === "light";

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 hidden md:flex w-64 flex-col border-r transition-all duration-300 ${
        isLight
          ? "bg-[#E8F5E9] border-slate-200"
          : "bg-[#0B0F19] border-white/5"
      }`}
      id="left-sidebar"
    >
      {/* Sidebar Header: Logo */}
      <div className={`flex h-20 items-center px-6 border-b select-none ${
        isLight ? "border-slate-200" : "border-white/5"
      }`}>
        <Link to="/">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation Links, stacked vertically */}
      <nav className="flex-1 space-y-2.5 px-4 py-6" id="sidebar-nav-container">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const IconComponent = link.icon;

          return (
            <Link
              key={link.path}
              to={link.path}
              id={`sidebar-link-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-heading text-sm font-semibold tracking-wide transition-all ${
                isActive
                  ? isLight
                    ? "bg-[#E0EDE0] text-[#007A33] border-l-4 border-[#007A33]"
                    : "bg-white/5 text-white border-l-4 border-white"
                  : isLight
                  ? "text-[#000000] hover:bg-[#E0EDE0]/50"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <IconComponent className={`h-4.5 w-4.5 transition-colors ${
                isActive
                  ? isLight
                    ? "text-[#007A33]"
                    : "text-white"
                  : isLight
                  ? "text-slate-500"
                  : "text-slate-500"
              }`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer Details */}
      <div className={`p-4 mx-4 mb-6 rounded-xl border select-none ${
        isLight
          ? "bg-[#E0EDE0] border-slate-200 text-slate-700"
          : "bg-white/5 border-white/5 text-slate-400"
      }`}>
        <p className="font-heading font-bold text-xs uppercase mb-1">ArcOTC v2.1</p>
        <p className="text-[10px] leading-relaxed">
          Reading directly from Arc Testnet.
        </p>
      </div>
    </aside>
  );
}
