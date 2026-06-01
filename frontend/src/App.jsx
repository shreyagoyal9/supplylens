/**
 * App.jsx
 * -------
 * Root component. Currently a single-page app — just renders the Dashboard.
 * Add a router here later if you want multiple pages (e.g. /shipments/:id detail view).
 */

import React from "react";
import Dashboard from "./components/Dashboard";

export default function App() {
  return <Dashboard />;
}
