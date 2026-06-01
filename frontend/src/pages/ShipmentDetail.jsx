/**
 * ShipmentDetail.jsx
 * ------------------
 * Full detail page for a single shipment. Route: /shipment/:id
 *
 * Sections:
 *   1. Header          — back button, shipment info, export button, theme toggle
 *   2. Stats Grid      — avg/min/max temp, total readings, breaches, anomalies
 *   3. Health Score    — 0–100 circular gauge with scoring explanation
 *   4. Cost Impact     — estimated ₹ loss from temperature breaches
 *   5. Sensor Chart    — full 200-reading history + LSTM forecast
 *   6. AI Explainer    — why anomalies were detected, trust indicators
 *   7. Alert History   — all alerts for this shipment with action buttons
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Thermometer, TrendingDown, TrendingUp,
  AlertTriangle, Activity, BarChart2, RefreshCw,
} from "lucide-react";
import SensorChart      from "../components/SensorChart";
import AlertFeed        from "../components/AlertFeed";
import ExportButton     from "../components/ExportButton";
import ThemeToggle      from "../components/ThemeToggle";
import HealthScore      from "../components/HealthScore";
import CostImpact       from "../components/CostImpact";
import AnomalyExplainer from "../components/AnomalyExplainer";

const API = import.meta.env.VITE_API_URL || "/api";

const CARGO_ICON = { pharma: "💊", seafood: "🐟", frozen: "🧊", dairy: "🥛" };

const STATUS_BADGE = {
  BREACH:  "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  WARNING: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700",
  NORMAL:  "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
};

// ── Stats Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${accent} flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">{label}</p>
        <p className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Stats Grid ────────────────────────────────────────────────────────────────
function StatsGrid({ readings, threshold }) {
  const stats = useMemo(() => {
    if (!readings.length) return null;
    const temps        = readings.map((r) => r.temperature);
    const avg          = temps.reduce((a, b) => a + b, 0) / temps.length;
    const breachCount  = readings.filter((r) => r.is_breach).length;
    const anomalyCount = readings.filter((r) => r.is_anomaly).length;
    return {
      total:        readings.length,
      avg:          avg.toFixed(2),
      min:          Math.min(...temps).toFixed(2),
      max:          Math.max(...temps).toFixed(2),
      breachCount,
      breachPct:    ((breachCount  / readings.length) * 100).toFixed(1),
      anomalyCount,
      anomalyPct:   ((anomalyCount / readings.length) * 100).toFixed(1),
    };
  }, [readings]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Avg Temperature" value={`${stats.avg}°C`}   sub={`Threshold: ${threshold}°C`}    icon={Thermometer}   accent={parseFloat(stats.avg) > threshold ? "bg-red-600"    : "bg-blue-600"}    />
      <StatCard label="Min Temperature" value={`${stats.min}°C`}   sub="Lowest recorded"                icon={TrendingDown}  accent="bg-cyan-600"   />
      <StatCard label="Max Temperature" value={`${stats.max}°C`}   sub="Highest recorded"               icon={TrendingUp}    accent={parseFloat(stats.max) > threshold ? "bg-red-600"    : "bg-slate-500"}   />
      <StatCard label="Total Readings"  value={stats.total}         sub="Sensor data points"             icon={BarChart2}     accent="bg-indigo-600" />
      <StatCard label="Breaches"        value={stats.breachCount}   sub={`${stats.breachPct}% of readings`} icon={AlertTriangle} accent={stats.breachCount  > 0 ? "bg-red-600"    : "bg-slate-500"}   />
      <StatCard label="Anomalies"       value={stats.anomalyCount}  sub={`${stats.anomalyPct}% anomaly rate`} icon={Activity}  accent={parseFloat(stats.anomalyPct) > 10 ? "bg-yellow-600" : "bg-green-600"} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ShipmentDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [shipment, setShipment] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/shipments/${id}`),
      axios.get(`${API}/alerts/${id}?limit=50`),
      axios.get(`${API}/sensors/${id}?limit=200`),
    ])
      .then(([shipmentRes, alertsRes, readingsRes]) => {
        setShipment(shipmentRes.data.shipment);
        setAlerts(alertsRes.data.alerts   || []);
        setReadings(readingsRes.data.readings || []);
      })
      .catch((err) => { console.error(err); setError("Failed to load shipment data."); })
      .finally(() => setLoading(false));
  }, [id]);

  const latest      = readings.at(-1);
  const status      = latest?.status || "NORMAL";
  const destination = shipment?.dest || shipment?.destination || "–";

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 gap-3">
      <RefreshCw size={20} className="animate-spin" /><span>Loading…</span>
    </div>
  );

  if (error || !shipment) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4">
      <p className="text-red-500">{error || "Shipment not found."}</p>
      <button onClick={() => navigate("/")} className="text-blue-500 underline text-sm">← Back to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft size={18} /><span className="text-sm hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 flex-shrink-0" />
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{CARGO_ICON[shipment.type] || "📦"}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-lg leading-tight">{id}</h1>
                  <span className="text-slate-500 dark:text-slate-400 text-sm capitalize">{shipment.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[status] || STATUS_BADGE.NORMAL}`}>{status}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
                  {shipment.origin} → {destination} · Max {shipment.threshold}°C
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <ExportButton shipment={shipment} readings={readings} />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Stats Grid */}
        <StatsGrid readings={readings} threshold={shipment.threshold} />

        {/* Health Score + Cost Impact — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthScore readings={readings} threshold={shipment.threshold} size="lg" />
          <CostImpact  readings={readings} shipmentType={shipment.type} />
        </div>

        {/* Sensor Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <div className="mb-4">
            <h2 className="text-slate-900 dark:text-white font-semibold">Temperature & Humidity History</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {readings.length} readings · anomaly dots mark ML-detected events
            </p>
          </div>
          <SensorChart readings={readings} forecast={[]} threshold={shipment.threshold} />
        </div>

        {/* AI Anomaly Explainer */}
        <AnomalyExplainer readings={readings} threshold={shipment.threshold} />

        {/* Alert History with action buttons */}
        <div>
          <h2 className="text-slate-900 dark:text-white font-semibold mb-3">
            Alert History
            <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal text-sm">({alerts.length} alerts)</span>
          </h2>
          <AlertFeed alerts={alerts} />
        </div>
      </main>
    </div>
  );
}
