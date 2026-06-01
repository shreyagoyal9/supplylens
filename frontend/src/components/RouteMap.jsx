/**
 * RouteMap.jsx
 * ------------
 * Schematic map of India showing all 5 active shipment routes.
 *
 * Design notes:
 *   - Uses a simplified SVG schematic (not a geographic projection)
 *     because logistics dashboards commonly use schematic route maps
 *     for clarity over geographic accuracy.
 *   - City positions are approximately geographically correct relative to each other.
 *   - Each route line is color-coded by shipment status (NORMAL/WARNING/BREACH).
 *   - An animated dot travels along each active route to show movement.
 *   - Clicking a route calls onSelectShipment to highlight it in the dashboard.
 *
 * Props:
 *   shipments  {array}   — enriched shipment objects with { id, latest, status, ... }
 *   selected   {string}  — currently selected shipment ID
 *   onSelect   {function} — called with shipment ID when a route is clicked
 */

import React, { useEffect, useRef, useState } from "react";

// ── City coordinates on the 380×440 SVG viewBox ──────────────────────────────
// Positioned to reflect approximate geographic locations within India
const CITIES = {
  Delhi:     { x: 155, y:  80, label: "Delhi"     },
  Mumbai:    { x:  75, y: 240, label: "Mumbai"    },
  Chennai:   { x: 210, y: 350, label: "Chennai"   },
  Bangalore: { x: 170, y: 340, label: "Bangalore" },
  Kolkata:   { x: 295, y: 160, label: "Kolkata"   },
  Hyderabad: { x: 185, y: 265, label: "Hyderabad" },
  Pune:      { x:  88, y: 255, label: "Pune"      },
  Ahmedabad: { x:  68, y: 155, label: "Ahmedabad" },
};

// ── Shipment routes (origin city → destination city) ─────────────────────────
const ROUTES = {
  "SH-001": { from: "Mumbai",    to: "Delhi",     cargo: "💊 Pharma"  },
  "SH-002": { from: "Chennai",   to: "Bangalore", cargo: "🐟 Seafood" },
  "SH-003": { from: "Kolkata",   to: "Hyderabad", cargo: "🧊 Frozen"  },
  "SH-004": { from: "Pune",      to: "Ahmedabad", cargo: "🥛 Dairy"   },
  "SH-005": { from: "Hyderabad", to: "Chennai",   cargo: "💊 Pharma"  },
};

// ── Status colors ─────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  BREACH:  "#ef4444",  // red
  WARNING: "#eab308",  // yellow
  NORMAL:  "#22c55e",  // green
  UNKNOWN: "#64748b",  // slate
};

// ── Simplified India outline (approximate polygon, 380×440 viewBox) ──────────
// Points trace the rough shape clockwise from northwest
const INDIA_PATH = `
  M 68 85
  L 80 55 L 100 45 L 130 40 L 160 35 L 185 38
  L 210 42 L 240 50 L 265 60 L 295 75 L 315 95
  L 330 120 L 340 145 L 330 170 L 310 185
  L 300 205 L 295 230 L 280 255 L 265 275
  L 250 295 L 245 320 L 230 345 L 215 365
  L 200 380 L 185 390 L 170 380
  L 155 360 L 145 340 L 130 320 L 115 300
  L 95 280 L 75 265 L 60 240 L 52 215
  L 48 185 L 50 160 L 55 135 L 60 110
  Z
`;

// ── Animated dot along a line ────────────────────────────────────────────────

function AnimatedDot({ x1, y1, x2, y2, color, duration = 4 }) {
  return (
    <circle r="5" fill={color} opacity="0.9">
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        path={`M ${x1} ${y1} L ${x2} ${y2}`}
      />
    </circle>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RouteMap({ shipments = [], selected, onSelect }) {
  // Build a lookup from shipment ID → latest status
  const statusMap = Object.fromEntries(
    shipments.map((s) => [s.id, s.latest?.status || "UNKNOWN"])
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Live Route Map</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Normal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Warning</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Breach</span>
        </div>
      </div>

      <svg
        viewBox="0 0 380 440"
        className="w-full"
        style={{ maxHeight: 340 }}
      >
        {/* India outline */}
        <path
          d={INDIA_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-200 dark:text-slate-600"
          strokeLinejoin="round"
        />

        {/* Ocean background (subtle) */}
        <rect x="0" y="0" width="380" height="440" fill="transparent" />

        {/* Routes */}
        {Object.entries(ROUTES).map(([shipId, route]) => {
          const from    = CITIES[route.from];
          const to      = CITIES[route.to];
          const status  = statusMap[shipId] || "UNKNOWN";
          const color   = STATUS_COLOR[status];
          const isActive = shipId === selected;
          if (!from || !to) return null;

          return (
            <g
              key={shipId}
              onClick={() => onSelect?.(shipId)}
              className="cursor-pointer"
            >
              {/* Route line */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke={color}
                strokeWidth={isActive ? 3 : 2}
                strokeDasharray={isActive ? "none" : "6 3"}
                opacity={isActive ? 1 : 0.7}
              />

              {/* Animated shipment dot */}
              <AnimatedDot
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                color={color}
                duration={4 + Object.keys(ROUTES).indexOf(shipId)}
              />

              {/* Shipment ID label near midpoint */}
              <text
                x={(from.x + to.x) / 2 + 5}
                y={(from.y + to.y) / 2 - 5}
                fontSize="9"
                fill={color}
                fontWeight={isActive ? "bold" : "normal"}
                className="select-none"
              >
                {shipId}
              </text>
            </g>
          );
        })}

        {/* City nodes */}
        {Object.entries(CITIES).map(([name, pos]) => (
          <g key={name}>
            <circle
              cx={pos.x} cy={pos.y}
              r="5"
              className="fill-white dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500"
              strokeWidth="1.5"
            />
            <text
              x={pos.x + 7} y={pos.y + 4}
              fontSize="9"
              className="fill-slate-600 dark:fill-slate-300 select-none"
              fontWeight="500"
            >
              {name}
            </text>
          </g>
        ))}
      </svg>

      {/* Route legend below map */}
      <div className="mt-3 space-y-1">
        {Object.entries(ROUTES).map(([shipId, route]) => {
          const status = statusMap[shipId] || "UNKNOWN";
          const color  = STATUS_COLOR[status];
          return (
            <button
              key={shipId}
              onClick={() => onSelect?.(shipId)}
              className={`
                w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs
                transition-colors
                ${shipId === selected
                  ? "bg-blue-50 dark:bg-slate-700 font-semibold"
                  : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}
              `}
            >
              <span className="text-slate-700 dark:text-slate-200">
                {shipId} — {route.from} → {route.to}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                <span className="text-slate-500 dark:text-slate-400">{route.cargo}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
