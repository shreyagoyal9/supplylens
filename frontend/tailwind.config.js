/** @type {import('tailwindcss').Config} */
export default {
  // 'class' strategy: dark mode is enabled by adding the 'dark' class to <html>
  // ThemeContext.jsx manages this class — default is dark
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
