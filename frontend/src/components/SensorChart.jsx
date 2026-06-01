/**
 * SensorChart.jsx
 * ---------------
 * Recharts time-series chart showing temperature, humidity, anomaly points,
 * and LSTM forecast for one shipment.
 *
 * Chart elements:
 *   Blue line    — live temperature readings
 *   Cyan area    — humidity (right Y-axis, 0–100%)
 *   Dashed amber — LSTM forecast (future predicted temperature)
 *   Red dashes   — threshold reference line (max allowed temp)
 *   Red dots     — individual anomaly detections
 *
 * Props:
 *   readings  {array}  — sensor reading objects from the backend
 *   forecast  {array}  — array of predicted temperature values (from ML service)
 *   threshold {number} — max allowed temperature for this shipment type
 */

import React, { useMemo } from "react";
import {
  ComposedChart, Line, Area, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Scatter,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format an ISO timestamp to "HH:MM" for the X-axis labels */
function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null;

  return (
    <div className={`
      rounded-lg p-3 text-xs shadow-xl border
      ${isDark
        ? "bg-slate-900 border-slate-600 text-slate-200"
        : "bg-white border-gray-200 text-slate-700"}
    `}>
      <p className={`mb-2 font-medium ${isDark ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}:{" "}
          <strong>
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </strong>
          {/* Append unit based on data key */}
          {p.dataKey.includes("temp") || p.dataKey === "anomaly" ? "°C"
           : p.dataKey.includes("hum") ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SensorChart({ readings, forecast, threshold }) {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  // Theme-aware colors for chart chrome (grid, axes)
  const gridColor  = isDark ? "#334155" : "#e2e8f0"; // slate-700 | slate-200
  const tickColor  = isDark ? "#94a3b8" : "#64748b"; // slate-400 | slate-500
  const labelColor = isDark ? "#64748b" : "#94a3b8";

  // ── Build chart data ────────────────────────────────────────────────────────
  const data = useMemo(() => {
    // Historical readings → time, temp, humidity, anomaly (if flagged)
    const historical = readings.map((r) => ({
      time:     fmtTime(r.timestamp),
      temp:     r.temperature,
      humidity: r.humidity,
      anomaly:  r.is_anomaly ? r.temperature : null, // null = no dot on chart
    }));

    // No forecast → return historical only
    if (!forecast?.length) return historical;

    // Append forecast points after the last historical timestamp
    const lastTs = readings.length ? new Date(readings.at(-1).timestamp) : new Date();
    const future = forecast.map((t, i) => ({
      time:         fmtTime(new Date(lastTs.getTime() + (i + 1) * 60_000).toISOString()),
      forecastTemp: t,
    }));

    return [...historical, ...future];
  }, [readings, forecast]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
        Waiting for sensor data…
      </div>
    );
  }

  return (
    <div>
      <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
        {readings.length} historical readings
        {forecast?.length ? ` + ${forecast.length} min forecast` : ""}
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>

          {/* Grid */}
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

          {/* X-axis: timestamps */}
          <XAxis
            dataKey="time"
            tick={{ fill: tickColor, fontSize: 10 }}
            interval="preserveStartEnd"
          />

          {/* Left Y-axis: temperature */}
          <YAxis
            yAxisId="temp"
            tick={{ fill: tickColor, fontSize: 10 }}
            domain={["auto", "auto"]}
            label={{ value: "°C", angle: -90, position: "insideLeft", fill: labelColor, fontSize: 11 }}
          />

          {/* Right Y-axis: humidity */}
          <YAxis
            yAxisId="hum"
            orientation="right"
            tick={{ fill: tickColor, fontSize: 10 }}
            domain={[0, 100]}
            label={{ value: "%RH", angle: 90, position: "insideRight", fill: labelColor, fontSize: 11 }}
          />

          <Tooltip content={<ChartTooltip isDark={isDark} />} />
          <Legend wrapperStyle={{ fontSize: "11px", color: tickColor }} iconType="line" />

          {/* Red dashed threshold line */}
          <ReferenceLine
            yAxisId="temp"
            y={threshold}
            stroke="#ef4444"
            strokeDasharray="6 3"
            label={{ value: `Max ${threshold}°C`, fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
          />

          {/* Humidity area (right axis) */}
          <Area
            yAxisId="hum"
            type="monotone"
            dataKey="humidity"
            name="Humidity"
            fill={isDark ? "#0ea5e940" : "#0ea5e920"}
            stroke="#0ea5e9"
            strokeWidth={1}
            dot={false}
          />

          {/* Live temperature line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            name="Temperature"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* LSTM forecast line (dashed amber) */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="forecastTemp"
            name="Forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />

          {/* Anomaly scatter dots */}
          <Scatter
            yAxisId="temp"
            dataKey="anomaly"
            name="Anomaly"
            fill="#ef4444"
            r={4}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
