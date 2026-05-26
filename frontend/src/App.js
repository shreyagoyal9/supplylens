import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from "recharts";
import axios from "axios";
import "./App.css";

const API = "http://localhost:3001/api";

const STATUS_COLOR = {
  "in-transit": "#1D9E75",
  "at-risk":    "#E24B4A",
  "delivered":  "#378ADD",
};

export default function App() {
  const [shipments,     setShipments]     = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [analysis,      setAnalysis]      = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const selectShipment = useCallback(async (id) => {
    setSelected(id);
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/shipments/${id}/analysis`);
      setAnalysis(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    axios.get(`${API}/shipments`).then(r => {
      setShipments(r.data);
      if (r.data.length) selectShipment(r.data[0].id);
    });
  }, [selectShipment]);

  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => selectShipment(selected), 30000);
    return () => clearInterval(t);
  }, [selected, selectShipment]);

  const chartData = analysis
    ? [
        ...analysis.readings.slice(-40).map((r, i) => ({
          idx:      i,
          time:     r.timestamp.slice(11, 16),
          temp:     r.temperature,
          humidity: r.humidity,
          anomaly:  r.anomaly ? r.temperature : null,
        })),
        ...analysis.forecast.map((t, i) => ({
          idx:      40 + i,
          time:     `+${(i + 1) * 3}m`,
          forecast: t,
        })),
      ]
    : [];

  const criticalAlerts = analysis?.alerts?.filter(a => a.level === "CRITICAL") || [];
  const warnAlerts     = analysis?.alerts?.filter(a => a.level === "WARNING")  || [];

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">❄️ SupplyLens</span>
          <span className="subtitle">Cold Chain Anomaly Detection</span>
        </div>
        <div className="header-right">
          {lastRefreshed && <span className="refresh-time">Last updated: {lastRefreshed}</span>}
          <button className="btn-refresh" onClick={() => selected && selectShipment(selected)}>
            ↻ Refresh
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-title">Shipments</div>
          {shipments.map(s => (
            <div
              key={s.id}
              className={`shipment-card ${selected === s.id ? "active" : ""}`}
              onClick={() => selectShipment(s.id)}
            >
              <div className="ship-id">{s.id}</div>
              <div className="ship-product">{s.product}</div>
              <div className="ship-route">{s.origin} → {s.dest}</div>
              <span className="ship-status" style={{ background: STATUS_COLOR[s.status] }}>
                {s.status}
              </span>
            </div>
          ))}
        </aside>

        <main className="content">
          {loading && <div className="loading">⏳ Analyzing sensor data…</div>}

          {!loading && analysis && (
            <>
              <div className="stats-row">
                <StatCard label="Total Readings"     value={analysis.total_readings}                      color="#378ADD" />
                <StatCard label="Anomalies Found"    value={analysis.anomaly_count}                       color="#E24B4A" />
                <StatCard label="Detection Accuracy" value={`${(analysis.accuracy * 100).toFixed(1)}%`}  color="#1D9E75" />
                <StatCard label="Active Alerts"      value={analysis.alerts.length}                       color="#EF9F27" />
              </div>

              {criticalAlerts.map((a, i) => (
                <div key={i} className="alert alert-critical">🚨 {a.message}</div>
              ))}
              {warnAlerts.map((a, i) => (
                <div key={i} className="alert alert-warn">⚠️ {a.message}</div>
              ))}

              <div className="chart-card">
                <div className="chart-title">Temperature (°C) — real-time + 18-min forecast</div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis domain={[0, 16]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={8} stroke="#E24B4A" strokeDasharray="6 3" label={{ value: "Max 8°C", fill: "#E24B4A", fontSize: 11 }} />
                    <ReferenceLine y={2} stroke="#378ADD" strokeDasharray="6 3" label={{ value: "Min 2°C", fill: "#378ADD", fontSize: 11 }} />
                    <Line dataKey="temp"     name="Temperature"    stroke="#378ADD" dot={false} strokeWidth={2} />
                    <Line dataKey="anomaly"  name="Anomaly spike"  stroke="#E24B4A" dot={{ r: 5, fill: "#E24B4A" }} strokeWidth={0} />
                    <Line dataKey="forecast" name="Forecast"       stroke="#EF9F27" dot={false} strokeWidth={2} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-title">Humidity (%) — last 40 readings</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData.slice(0, 40)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis domain={[40, 90]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine y={75} stroke="#EF9F27" strokeDasharray="6 3" label={{ value: "Max 75%", fill: "#EF9F27", fontSize: 11 }} />
                    <Line dataKey="humidity" name="Humidity" stroke="#1D9E75" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}