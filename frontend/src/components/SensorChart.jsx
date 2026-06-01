import React, { useMemo } from "react";
import {
  ComposedChart, Line, Area, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Scatter,
} from "recharts";

const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
          {p.dataKey.includes("temp") || p.dataKey === "anomaly" ? "°C" : p.dataKey.includes("hum") ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

export default function SensorChart({ readings, forecast, threshold }) {
  const data = useMemo(() => {
    const historical = readings.map((r) => ({
      time:     fmtTime(r.timestamp),
      temp:     r.temperature,
      humidity: r.humidity,
      anomaly:  r.is_anomaly ? r.temperature : null,
    }));

    if (!forecast?.length) return historical;

    const lastTs = readings.length ? new Date(readings.at(-1).timestamp) : new Date();
    const future = forecast.map((t, i) => ({
      time:        fmtTime(new Date(lastTs.getTime() + (i + 1) * 60_000).toISOString()),
      forecastTemp: t,
    }));

    return [...historical, ...future];
  }, [readings, forecast]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Waiting for sensor data…
      </div>
    );
  }

  return (
    <div>
      <p className="text-slate-400 text-xs mb-3">
        {readings.length} historical readings
        {forecast?.length ? ` + ${forecast.length} min forecast` : ""}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis yAxisId="temp" tick={{ fill: "#94a3b8", fontSize: 10 }} domain={["auto", "auto"]}
            label={{ value: "°C", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }} />
          <YAxis yAxisId="hum" orientation="right" tick={{ fill: "#94a3b8", fontSize: 10 }} domain={[0, 100]}
            label={{ value: "%RH", angle: 90, position: "insideRight", fill: "#64748b", fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} iconType="line" />
          <ReferenceLine yAxisId="temp" y={threshold} stroke="#ef4444" strokeDasharray="6 3"
            label={{ value: `Max ${threshold}°C`, fill: "#ef4444", fontSize: 10, position: "insideTopRight" }} />
          <Area yAxisId="hum" type="monotone" dataKey="humidity" name="Humidity"
            fill="#0ea5e940" stroke="#0ea5e9" strokeWidth={1} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temperature"
            stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="temp" type="monotone" dataKey="forecastTemp" name="Forecast"
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          <Scatter yAxisId="temp" dataKey="anomaly" name="Anomaly" fill="#ef4444" r={4} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
