/**
 * StatsBar.jsx
 * ------------
 * Row of 4 KPI summary cards at the top of the Dashboard.
 *
 * Cards: Active Shipments · Active Alerts · Breaches (1h) · Anomaly Rate
 *
 * Props:
 *   stats {object} — { totalShipments, activeAlerts, breachCount, anomalyRate }
 */

import React from "react";
import { Thermometer, AlertTriangle, Package, Activity } from "lucide-react";

function Card({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-gray-200 dark:border-slate-700">
      <div className={`p-3 rounded-lg ${accent} flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">{label}</p>
        <p className="text-slate-900 dark:text-white text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card icon={Package}       label="Active Shipments" value={stats.totalShipments} accent="bg-blue-600" />
      <Card icon={AlertTriangle} label="Active Alerts"    value={stats.activeAlerts}   accent={stats.activeAlerts  > 0 ? "bg-red-600"    : "bg-slate-500"} />
      <Card icon={Thermometer}   label="Breaches (1h)"    value={stats.breachCount}    accent={stats.breachCount   > 0 ? "bg-orange-600" : "bg-slate-500"} />
      <Card icon={Activity}      label="Anomaly Rate"     value={`${stats.anomalyRate}%`} accent={stats.anomalyRate > 10 ? "bg-yellow-600" : "bg-green-600"} />
    </div>
  );
}
