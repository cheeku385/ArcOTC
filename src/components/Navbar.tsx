/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, Sun, Moon } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "./ThemeContext";

interface NavbarProps {
  isDemoMode?: boolean;
  toggleDemoMode?: () => void;
}

export default function Navbar({ isDemoMode, toggleDemoMode }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "All Orders", path: "/orders" },
    { name: "Create Order", path: "/create" },
    { name: "My Orders", path: "/my-orders" },
  ];

  const isLight = theme === "light";

  return (
    <nav
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-all duration-300 ${
        isLight
          ? "bg-[#E8F5E9] border-slate-350 text-black"
          : "bg-[#0B0F19]/90 border-white/5 text-white"
      }`}
      id="top-navbar"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link to="/" className="md:hidden">
              <Logo size="md" />
            </Link>
            <div className="hidden md:block">
              <Logo size="md" showText={true} />
            </div>
          </div>

          {/* Right Controls: Theme toggle, Wallet */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Theme Toggle (Sun/Moon) */}
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-slate-100 hover:bg-slate-200 text-black"
                  : "border-white/10 bg-[#111827] hover:bg-white/5 text-white"
              }`}
              title={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
              id="theme-toggle-desktop"
            >
              {isLight ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5" />
              )}
            </button>

            {/* HIGH-CONTRAST SOLID CONNECT WALLET BUTTON (RED) */}
            {mounted && !isMobile && (
              <div id="rainbow-connect-container">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted: rkMounted,
                  }) => {
                    const ready = rkMounted && authenticationStatus !== "loading";
                    const connected =
                      ready &&
                      account &&
                      chain &&
                      (!authenticationStatus ||
                        authenticationStatus === "authenticated");

                    return (
                      <div
                        {...(!ready && {
                          "aria-hidden": true,
                          style: {
                            opacity: 0,
                            pointerEvents: "none",
                            userSelect: "none",
                          },
                        })}
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <button
                                onClick={openConnectModal}
                                type="button"
                                className="font-heading font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl border transition-all cursor-pointer btn-connect-red active:scale-95 shadow-sm bg-[#EF4444] border-[#DC2626] text-white"
                                style={{ textShadow: "none", filter: "none" }}
                              >
                                Connect Wallet
                              </button>
                            );
                          }

                          if (chain.unsupported) {
                            return (
                              <button
                                onClick={openChainModal}
                                type="button"
                                className="font-heading font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border bg-red-600 text-white border-black hover:bg-red-700 cursor-pointer"
                                style={{ textShadow: "none", filter: "none" }}
                              >
                                Wrong Network
                              </button>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={openAccountModal}
                                type="button"
                                className="font-heading font-bold text-xs px-4 py-2.5 rounded-xl border transition-all cursor-pointer btn-connected-green"
                                style={{ textShadow: "none", filter: "none" }}
                              >
                                {account.displayName}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}
          </div>

          {/* Mobile Right Element: Toggles + Menu trigger */}
          <div className="flex items-center gap-3.5 md:hidden">
            {/* Sun/Moon Theme Toggler Mobile */}
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-slate-100 text-black"
                  : "border-white/10 bg-[#111827] text-white hover:bg-white/5"
              }`}
              title="Toggle Theme"
              id="theme-toggle-mobile"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Mobile Wallet Connector */}
            {mounted && isMobile && (
              <div id="mobile-wallet-connector" className="scale-90">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openConnectModal,
                    mounted: rkMounted,
                  }) => {
                    if (!rkMounted || !account || !chain) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="font-heading font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg btn-connect-red cursor-pointer bg-[#EF4444] border-[#DC2626] text-white"
                          style={{ textShadow: "none", filter: "none" }}
                        >
                          Connect
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={openAccountModal}
                        type="button"
                        className="font-heading font-bold text-[10px] px-3 py-2 rounded-lg border cursor-pointer btn-connected-green"
                        style={{ textShadow: "none", filter: "none" }}
                      >
                        {account.displayName}
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}

            {/* Hamburger Trigger */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center rounded-lg p-2 transition-all cursor-pointer ${
                isLight ? "text-black hover:bg-slate-100" : "text-white hover:bg-white/5"
              }`}
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className={`md:hidden border-t px-4 py-4 space-y-2 ${
          isLight ? "bg-[#E8F5E9] border-slate-300 text-black" : "bg-[#0B0F19] border-white/5"
        }`}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl font-heading text-base font-semibold transition-colors ${
                  isActive
                    ? isLight
                      ? "bg-[#E0EDE0]/80 text-[#007A33] border-l-4 border-[#007A33]"
                      : "bg-white/5 text-white border-l-4 border-white"
                    : isLight
                    ? "text-[#000000] hover:bg-[#E0EDE0]/50"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
