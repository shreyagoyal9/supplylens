/**
 * App.jsx
 * -------
 * Root routing component. Defines all pages in the app.
 *
 * Routes:
 *   /                  → Dashboard        (live overview of all shipments)
 *   /shipment/:id      → ShipmentDetail   (full history + stats for one shipment)
 *
 * BrowserRouter + ThemeProvider are provided in main.jsx so this file
 * stays clean and only declares routes.
 */

import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard      from "./components/Dashboard";
import ShipmentDetail from "./pages/ShipmentDetail";

export default function App() {
  return (
    <Routes>
      {/* Main dashboard — all 5 shipments, live chart, live alerts */}
      <Route path="/"             element={<Dashboard />} />

      {/* Detail page — full history, stats grid, export for one shipment */}
      <Route path="/shipment/:id" element={<ShipmentDetail />} />
    </Routes>
  );
}
