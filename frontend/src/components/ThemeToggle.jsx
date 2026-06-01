/**
 * ThemeToggle.jsx
 * ---------------
 * A sun/moon icon button that switches between light and dark mode.
 * Reads and updates theme via ThemeContext.
 *
 * Shows 🌙 (moon) when in light mode  → click to go dark
 * Shows ☀️  (sun)  when in dark mode   → click to go light
 */

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        p-2 rounded-lg transition-colors duration-200
        ${isDark
          ? "text-slate-400 hover:text-white hover:bg-slate-700"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"}
      `}
    >
      {/* Show Sun icon in dark mode, Moon icon in light mode */}
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
