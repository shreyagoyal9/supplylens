import React from "react";
import { AlertTriangle, AlertCircle, Clock } from "lucide-react";

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

function AlertCard({ alert }) {
  const critical = alert.severity === "CRITICAL";
  return (
    <div className={`p-3 rounded-lg border mb-2 ${critical
      ? "bg-red-950 border-red-800"
      : "bg-yellow-950 border-yellow-800"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {critical
            ? <AlertTriangle size={14} className="text-red-400" />
            : <AlertCircle   size={14} className="text-yellow-400" />}
          <span className={`text-xs font-bold ${critical ? "text-red-300" : "text-yellow-300"}`}>
            {alert.severity}
          </span>
          <span className="text-slate-300 text-xs font-medium">{alert.shipment_id}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Clock size={10} />
          <span>{timeAgo(alert.timestamp)}</span>
        </div>
      </div>
      <p className="text-slate-300 text-xs leading-relaxed">{alert.alert_message}</p>
      {alert.breach_in_min && (
        <p className="text-red-400 text-xs mt-1 font-medium">
          Breach in ~{alert.breach_in_min} min
        </p>
      )}
    </div>
  );
}

export default function AlertFeed({ alerts }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Live Alerts</h3>
        <span className="text-xs text-slate-400">{alerts.length} active</span>
      </div>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 text-slate-500 text-sm gap-2">
          <span className="text-2xl">✅</span>
          <p>All shipments nominal</p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-80 scrollbar-thin pr-1">
          {alerts.map((a) => <AlertCard key={a.id || a.timestamp} alert={a} />)}
        </div>
      )}
    </div>
  );
}
