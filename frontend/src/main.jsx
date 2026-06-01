/**
 * main.jsx
 * --------
 * App entry point. Wraps the app in:
 *   - ThemeProvider  → dark/light mode context (manages 'dark' class on <html>)
 *   - BrowserRouter  → enables React Router navigation across pages
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ThemeProvider must wrap everything so all components can access the theme */}
    <ThemeProvider>
      {/* BrowserRouter enables <Route>, <Link>, useNavigate etc. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
