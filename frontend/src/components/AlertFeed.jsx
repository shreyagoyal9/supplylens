/**
 * AlertFeed.jsx
 * -------------
 * Scrollable list of ML-generated alerts, newest first.
 * Used in both the Dashboard and the ShipmentDetail page.
 *
 * Each alert card shows:
 *   - Severity badge (CRITICAL = red, WARNING = yellow)
 *   - Shipment ID + time ago
 *   - Natural-language alert message from the ML service
 *   - "Breach in ~N min" countdown if breach is predicted
 *
 * Props:
 *   alerts {array} — array of alert objects from the backend
 */

import React from "react";
import { AlertTriangle, AlertCircle, Clock } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert an ISO timestamp to a human-readable "Xs ago / Xm ago / Xh ago" string */
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert }) {
  const isCritical = alert.severity === "CRITICAL";

  return (
    <div className={`
      p-3 rounded-lg border mb-2
      ${isCritical
        ? "bg-red-50   border-red-200   dark:bg-red-950   dark:border-red-800"
        : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"}
    `}>
      {/* Top row: icon + severity + shipment ID + time */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {isCritical
            ? <AlertTriangle size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />
            : <AlertCircle   size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" />}
          <span className={`text-xs font-bold ${isCritical ? "text-red-600 dark:text-red-300" : "text-yellow-600 dark:text-yellow-300"}`}>
            {alert.severity}
          </span>
          <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">
            {alert.shipment_id}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
          <Clock size={10} />
          <span>{timeAgo(alert.timestamp)}</span>
        </div>
      </div>

      {/* ML-generated alert message */}
      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
        {alert.alert_message}
      </p>

      {/* Breach countdown */}
      {alert.breach_in_min && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-1 font-medium">
          Breach in ~{alert.breach_in_min} min
        </p>
      )}
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export default function AlertFeed({ alerts }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Live Alerts</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{alerts.length} active</span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-sm gap-2">
          <span className="text-2xl">✅</span>
          <p>All shipments nominal</p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-80 scrollbar-thin pr-1">
          {alerts.map((a) => (
            <AlertCard key={a.id || a.timestamp} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}
