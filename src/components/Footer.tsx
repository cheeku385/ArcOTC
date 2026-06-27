/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowUpRight, Twitter } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "./ThemeContext";

export default function Footer() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <footer
      id="footer-root"
      className={`relative border-t pt-16 pb-8 transition-colors duration-300 select-none ${
        isLight
          ? "bg-slate-100 border-slate-300 text-slate-800"
          : "bg-[#0B0F19] border-white/5 text-slate-400"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          
          {/* Column 1: Logo & Vision */}
          <div className="space-y-4" id="footer-branding">
            <Logo size="md" />
            <p className={`text-sm leading-relaxed font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              First P2P OTC trading platform. Set your own rate.
              Direct wallet-to-wallet decentralized swap with no DEX fees and zero slippage.
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold font-heading">
              <span className="h-2 w-2 rounded-full bg-black dark:bg-white" />
              <span className="text-black dark:text-white">Direct Peer-to-Peer Trades</span>
            </div>
          </div>

          {/* Column 2: Quick Links & Network Information */}
          <div className="space-y-4" id="footer-meta">
            <h4 className={`font-heading text-base font-bold tracking-wider uppercase ${isLight ? "text-black" : "text-white"}`}>
              Official Links
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-2">
                <a
                  href="https://docs.arc.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block transition-colors font-medium text-xs sm:text-sm hover:underline ${isLight ? "text-slate-700" : "text-slate-300"}`}
                >
                  Arc Docs
                </a>
                <a
                  href="https://discord.com/invite/buildonarc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block transition-colors font-medium text-xs sm:text-sm hover:underline ${isLight ? "text-slate-700" : "text-slate-300"}`}
                >
                  Discord
                </a>
                <a
                  href="https://arc.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block transition-colors font-medium text-xs sm:text-sm hover:underline ${isLight ? "text-slate-700" : "text-slate-300"}`}
                >
                  Website
                </a>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>Arc Network</div>
                <div className={isLight ? "text-slate-600" : "text-slate-400"}>Secure Platform</div>
                <a
                  href="https://testnet.arcscan.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-0.5 hover:underline transition-colors font-bold ${isLight ? "text-slate-800" : "text-white"}`}
                >
                  <span>Explorer</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Builder Info */}
          <div className="space-y-4" id="footer-social">
            <h4 className={`font-heading text-base font-bold tracking-wider uppercase ${isLight ? "text-black" : "text-white"}`}>
              Builder & Tech
            </h4>
            <div className="space-y-3">
              <div className="text-sm">
                Built by <span className={`font-bold ${isLight ? "text-slate-800" : "text-white"}`}>Cheeku</span>
              </div>

              {/* Follow Button */}
              <a
                href="https://x.com/Cheeku385"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-heading font-black transition-all ${
                  isLight
                    ? "bg-slate-200 border border-slate-300 text-black hover:bg-slate-300"
                    : "bg-white text-black hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Twitter className="h-4 w-4 fill-current" />
                <span>Follow @Cheeku385</span>
              </a>

              <div className={`text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                First-class P2P Engine
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className={`mt-12 border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-heading ${
          isLight ? "border-slate-300" : "border-white/5"
        }`}>
          <div className={isLight ? "text-slate-700" : "text-slate-400"}>
            © 2025 ArcOTC — P2P Swap Engine. All rights reserved.
          </div>
          <div className="flex gap-4">
            <span className={isLight ? "text-slate-600" : "text-slate-500"}>Security Audited</span>
            <span className={isLight ? "text-slate-400" : "text-slate-600"}>•</span>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline transition-colors font-bold ${isLight ? "text-black" : "text-white"}`}
            >
              Circle Faucet
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
