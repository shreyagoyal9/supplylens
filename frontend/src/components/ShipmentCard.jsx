/**
 * ShipmentCard.jsx
 * ----------------
 * Clickable card for one shipment in the Dashboard left column.
 *
 * Shows: cargo icon, ID, status badge, route, live temp/humidity,
 *        temperature progress bar, and a "View full details" link.
 *
 * Props:
 *   shipment      {object}    shipment config + latest reading
 *   isSelected    {boolean}   highlights card blue when true
 *   onClick       {function}  selects this shipment's chart in dashboard
 *   onViewDetails {function}  navigates to /shipment/:id detail page
 */

import React from "react";
import { MapPin, Thermometer, Droplets, ChevronRight, ExternalLink } from "lucide-react";

const CARGO_ICON = { pharma: "💊", seafood: "🐟", frozen: "🧊", dairy: "🥛" };

const STATUS_BADGE = {
  NORMAL:  "bg-green-100  text-green-700  border-green-300  dark:bg-green-900  dark:text-green-300  dark:border-green-700",
  WARNING: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700",
  BREACH:  "bg-red-100    text-red-700    border-red-300    dark:bg-red-900    dark:text-red-300    dark:border-red-700",
  UNKNOWN: "bg-gray-100   text-gray-600   border-gray-300   dark:bg-slate-700  dark:text-slate-300  dark:border-slate-600",
};

const BAR_COLOR = { BREACH: "bg-red-500", WARNING: "bg-yellow-500", NORMAL: "bg-green-500" };

export default function ShipmentCard({ shipment, isSelected, onClick, onViewDetails }) {
  const { id, type, origin, destination, threshold, latest } = shipment;
  const status   = latest?.status || "UNKNOWN";
  const temp     = latest?.temperature?.toFixed(1) ?? "–";
  const humidity = latest?.humidity?.toFixed(0)    ?? "–";
  const progress = latest
    ? Math.min(100, (Math.abs(latest.temperature) / Math.abs(threshold)) * 100)
    : 0;

  return (
    <div className={`
      rounded-xl border transition-all duration-200
      ${isSelected
        ? "bg-blue-50 border-blue-400 shadow-md dark:bg-slate-700 dark:border-blue-500"
        : "bg-white border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-500"}
    `}>
      {/* Card body — click to select chart */}
      <button onClick={onClick} className="w-full text-left p-4">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CARGO_ICON[type] || "📦"}</span>
            <div>
              <p className="text-slate-900 dark:text-white font-semibold text-sm">{id}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs capitalize">{type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_BADGE[status]}`}>
              {status}
            </span>
            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mb-3">
          <MapPin size={12} />
          <span>{origin} → {destination}</span>
        </div>

        {/* Temp + humidity */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 text-sm font-medium">
            <Thermometer size={14} className="text-blue-500" />
            <span>{temp}°C</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">/ {threshold}°C max</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-xs">
            <Droplets size={12} className="text-cyan-500" />
            <span>{humidity}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${BAR_COLOR[status] || "bg-green-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {/* View details link */}
      <div className="px-4 pb-3">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <ExternalLink size={11} />
          View full details
        </button>
      </div>
    </div>
  );
}
