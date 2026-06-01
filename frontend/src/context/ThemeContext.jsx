/**
 * ThemeContext.jsx
 * ----------------
 * Provides dark/light theme state to the entire app.
 *
 * How it works:
 *   - Reads saved preference from localStorage on first load (defaults to "dark")
 *   - Adds/removes the "dark" CSS class on <html> — Tailwind reads this class
 *     to activate all "dark:" variant styles
 *   - Any component can call useTheme() to get { theme, toggleTheme }
 *
 * Usage:
 *   const { theme, toggleTheme } = useTheme();
 */

import React, { createContext, useContext, useState, useEffect } from "react";

// ── Context ────────────────────────────────────────────────────────────────
const ThemeContext = createContext();

// ── Provider ───────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  // Initialize from localStorage; fall back to "dark" (app's default look)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("supplylens-theme") || "dark";
  });

  // Whenever theme changes → update the <html> class AND save to localStorage
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("supplylens-theme", theme);
  }, [theme]);

  // Flip between dark and light
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
