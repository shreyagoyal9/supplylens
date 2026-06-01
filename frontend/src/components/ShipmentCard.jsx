import React from "react";
import { MapPin, Thermometer, Droplets, ChevronRight } from "lucide-react";

const CARGO_ICON = { pharma: "💊", seafood: "🐟", frozen: "🧊", dairy: "🥛" };

const STATUS_STYLE = {
  NORMAL:  "bg-green-900 text-green-300 border-green-700",
  WARNING: "bg-yellow-900 text-yellow-300 border-yellow-700",
  BREACH:  "bg-red-900 text-red-300 border-red-700",
  UNKNOWN: "bg-slate-700 text-slate-300 border-slate-600",
};

const BAR_COLOR = { BREACH: "bg-red-500", WARNING: "bg-yellow-500", NORMAL: "bg-green-500" };

export default function ShipmentCard({ shipment, isSelected, onClick }) {
  const { id, type, origin, destination, threshold, latest } = shipment;
  const status   = latest?.status || "UNKNOWN";
  const temp     = latest?.temperature?.toFixed(1) ?? "–";
  const humidity = latest?.humidity?.toFixed(0) ?? "–";
  const progress = latest ? Math.min(100, Math.abs(latest.temperature / threshold) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200
        ${isSelected
          ? "bg-slate-700 border-blue-500 shadow-lg shadow-blue-900/30"
          : "bg-slate-800 border-slate-700 hover:border-slate-500"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CARGO_ICON[type] || "📦"}</span>
          <div>
            <p className="text-white font-semibold text-sm">{id}</p>
            <p className="text-slate-400 text-xs capitalize">{type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_STYLE[status]}`}>
            {status}
          </span>
          <ChevronRight size={14} className={`text-slate-500 transition-transform ${isSelected ? "rotate-90" : ""}`} />
        </div>
      </div>

      <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
        <MapPin size={12} />
        <span>{origin} → {destination}</span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-slate-200 text-sm font-medium">
          <Thermometer size={14} className="text-blue-400" />
          <span>{temp}°C</span>
          <span className="text-slate-500 text-xs ml-1">/ {threshold}°C max</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300 text-xs">
          <Droplets size={12} className="text-cyan-400" />
          <span>{humidity}%</span>
        </div>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${BAR_COLOR[status] || "bg-green-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
