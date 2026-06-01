import React, { useState, useReducer, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";
import StatsBar     from "./StatsBar";
import ShipmentCard from "./ShipmentCard";
import SensorChart  from "./SensorChart";
import AlertFeed    from "./AlertFeed";

const API = import.meta.env.VITE_API_URL || "/api";
const MAX_READINGS = 60;

function readingsReducer(state, action) {
  if (action.type === "ADD") {
    const id   = action.payload.shipment_id;
    const prev = state[id] || [];
    return { ...state, [id]: [...prev, action.payload].slice(-MAX_READINGS) };
  }
  if (action.type === "INIT") return { ...state, ...action.payload };
  return state;
}

export default function Dashboard() {
  const [shipments,  setShipments]  = useState([]);
  const [latest,     setLatest]     = useState({});
  const [readings,   dispatch]      = useReducer(readingsReducer, {});
  const [alerts,     setAlerts]     = useState([]);
  const [forecasts,  setForecasts]  = useState({});
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  const onMessage = useCallback((msg) => {
    if (msg.type === "SENSOR_READING") {
      dispatch({ type: "ADD", payload: msg.payload });
      setLatest((prev) => ({ ...prev, [msg.payload.shipment_id]: msg.payload }));
    } else if (msg.type === "ALERT") {
      setAlerts((prev) => [msg.payload, ...prev].slice(0, 50));
      if (msg.payload.forecast)
        setForecasts((prev) => ({ ...prev, [msg.payload.shipment_id]: msg.payload.forecast }));
    }
  }, []);

  const { connected } = useWebSocket(onMessage);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/shipments`),
      axios.get(`${API}/alerts?limit=30`),
    ]).then(async ([shipmentsRes, alertsRes]) => {
      const configs = shipmentsRes.data.shipments;
      setShipments(configs);
      setSelected(configs[0]?.id || null);
      setAlerts(alertsRes.data.alerts || []);

      const latestMap = {};
      configs.forEach((s) => { if (s.latest) latestMap[s.id] = s.latest; });
      setLatest(latestMap);

      const history = await Promise.all(
        configs.map((s) =>
          axios.get(`${API}/sensors/${s.id}?limit=60`)
            .then((r) => ({ id: s.id, readings: r.data.readings }))
            .catch(() => ({ id: s.id, readings: [] }))
        )
      );
      dispatch({
        type:    "INIT",
        payload: Object.fromEntries(history.map(({ id, readings }) => [id, readings])),
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const all = Object.values(latest);
    return {
      totalShipments: shipments.length,
      activeAlerts:   alerts.filter((a) => a.severity === "CRITICAL").length,
      breachCount:    all.filter((r) => r.is_breach).length,
      anomalyRate:    all.length
        ? +((all.filter((r) => r.is_anomaly).length / all.length) * 100).toFixed(1)
        : 0,
    };
  }, [shipments, latest, alerts]);

  const enriched    = shipments.map((s) => ({ ...s, latest: latest[s.id] || s.latest }));
  const activeShip  = enriched.find((s) => s.id === selected);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌡️</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">SupplyLens</h1>
              <p className="text-slate-400 text-xs">Cold Chain Anomaly Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <div className="flex items-center gap-1.5">
                <span className="live-dot w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span className="text-green-400 text-xs font-medium">LIVE</span>
                <Wifi size={14} className="text-green-400" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="text-red-400 text-xs font-medium">OFFLINE</span>
                <WifiOff size={14} className="text-red-400" />
              </div>
            )}
            <span className="text-slate-600 text-xs">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
            <RefreshCw size={20} className="animate-spin" />
            <span>Loading shipment data…</span>
          </div>
        ) : (
          <>
            <StatsBar stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wide mb-2">
                  Active Shipments
                </h2>
                {enriched.map((s) => (
                  <ShipmentCard
                    key={s.id}
                    shipment={s}
                    isSelected={s.id === selected}
                    onClick={() => setSelected(s.id)}
                  />
                ))}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-white font-semibold">
                        {activeShip ? `${activeShip.id} — ${activeShip.type}` : "Select a shipment"}
                      </h2>
                      {activeShip && (
                        <p className="text-slate-400 text-xs">
                          {activeShip.origin} → {activeShip.destination} · Max {activeShip.threshold}°C
                        </p>
                      )}
                    </div>
                    {activeShip?.latest && (() => {
                      const s = activeShip.latest.status;
                      const cls = s === "BREACH" ? "bg-red-900 text-red-300 border-red-700"
                        : s === "WARNING" ? "bg-yellow-900 text-yellow-300 border-yellow-700"
                        : "bg-green-900 text-green-300 border-green-700";
                      return (
                        <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${cls}`}>
                          {s}
                        </span>
                      );
                    })()}
                  </div>
                  <SensorChart
                    readings={readings[selected] || []}
                    forecast={forecasts[selected] || []}
                    threshold={activeShip?.threshold ?? 8}
                  />
                </div>
                <AlertFeed alerts={alerts} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
