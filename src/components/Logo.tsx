/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useTheme } from "./ThemeContext";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const { theme } = useTheme();

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  const firstArrowColor = "#FF0000";
  const secondArrowColor = "#FF0000";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} id="arc-otc-logo">
      {/* Dynamic Animated Swap Arrow Logo with Red Metallic Glow */}
      <svg
        className={`${iconSizes[size]} logo-icon-red`}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Arrow (pointing Top-Right) */}
        <path
          d="M8 24H28M28 24L20 16M28 24L20 32"
          stroke={firstArrowColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Arrow (pointing Bottom-Left) */}
        <path
          d="M32 16H12M12 16L20 8M12 16L20 24"
          stroke={secondArrowColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>

      {showText && (
        <span className={`font-heading font-black tracking-tight logo-shiny-text ${textSizes[size]}`}>
          ArcOTC
        </span>
      )}
    </div>
  );
}
