/**
 * HealthScore.jsx
 * ---------------
 * Displays a 0–100 shipment health score as a circular SVG gauge.
 *
 * Score formula (penalise breaches most, then anomalies, then temp variance):
 *   score = 100
 *         − (breach_pct × 0.5)       ← breaches are most critical
 *         − (anomaly_pct × 0.3)       ← anomalies hurt moderately
 *         − (temp_excess_pct × 0.2)   ← running close to threshold hurts a bit
 *   clamped to [0, 100]
 *
 * Color bands:
 *   75–100 → green  (healthy)
 *   50–74  → yellow (caution)
 *   25–49  → orange (warning)
 *   0–24   → red    (critical)
 *
 * Props:
 *   readings  {array}   — sensor readings for this shipment
 *   threshold {number}  — max allowed temperature
 *   size      {string}  — "sm" | "md" | "lg" (default: "md")
 */

import React, { useMemo } from "react";
import { Info } from "lucide-react";
import Tooltip from "./Tooltip";

// ── Score computation ─────────────────────────────────────────────────────────

export function computeHealthScore(readings, threshold) {
  if (!readings || readings.length === 0) return null;

  const total        = readings.length;
  const breachCount  = readings.filter((r) => r.is_breach).length;
  const anomalyCount = readings.filter((r) => r.is_anomaly).length;
  const temps        = readings.map((r) => r.temperature);
  const avgTemp      = temps.reduce((a, b) => a + b, 0) / total;

  // How much is avg temp exceeding threshold, as a percentage of threshold
  const tempExcessPct = Math.max(0, (avgTemp - threshold) / Math.abs(threshold)) * 100;

  const breachPct  = (breachCount  / total) * 100;
  const anomalyPct = (anomalyCount / total) * 100;

  const score = Math.max(0, Math.min(100, Math.round(
    100 - (breachPct * 0.5) - (anomalyPct * 0.3) - (tempExcessPct * 0.2)
  )));

  return {
    score,
    breachPct:  +breachPct.toFixed(1),
    anomalyPct: +anomalyPct.toFixed(1),
    label:      score >= 75 ? "Healthy" : score >= 50 ? "Caution" : score >= 25 ? "Warning" : "Critical",
  };
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function getColor(score) {
  if (score >= 75) return { stroke: "#22c55e", text: "text-green-500",  bg: "bg-green-100  dark:bg-green-900/30"  };
  if (score >= 50) return { stroke: "#eab308", text: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30" };
  if (score >= 25) return { stroke: "#f97316", text: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" };
  return              { stroke: "#ef4444", text: "text-red-500",    bg: "bg-red-100    dark:bg-red-900/30"    };
}

// ── Circular SVG gauge ────────────────────────────────────────────────────────

function CircleGauge({ score, size = "md" }) {
  const dim = size === "sm" ? 56 : size === "lg" ? 96 : 72;
  const cx  = dim / 2;
  const cy  = dim / 2;
  const r   = (dim - 10) / 2;  // radius with some padding

  // Arc length maths: circumference = 2πr, fill = score/100 of circumference
  const circumference  = 2 * Math.PI * r;
  const strokeDasharray  = circumference;
  const strokeDashoffset = circumference * (1 - score / 100);

  const { stroke, text } = getColor(score);
  const fontSize = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm";

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-gray-200 dark:text-slate-700"
        />
        {/* Score arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      {/* Score number in the center */}
      <span className={`absolute font-bold ${fontSize} ${text}`}>{score}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HealthScore({ readings, threshold, size = "md" }) {
  const data = useMemo(() => computeHealthScore(readings, threshold), [readings, threshold]);

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <span>Health: –</span>
      </div>
    );
  }

  const { score, breachPct, anomalyPct, label } = data;
  const { text, bg } = getColor(score);

  const tooltipText =
    `Score = 100 − breach% × 0.5 − anomaly% × 0.3 − temp_excess% × 0.2\n` +
    `Breach rate: ${breachPct}% | Anomaly rate: ${anomalyPct}%`;

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${bg}`}>
      <CircleGauge score={score} size={size} />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Health Score</p>
          <Tooltip content={tooltipText}>
            <Info size={11} className="text-slate-400 cursor-help" />
          </Tooltip>
        </div>
        <p className={`font-bold text-lg leading-tight ${text}`}>{score} / 100</p>
        <p className={`text-xs font-medium ${text}`}>{label}</p>
      </div>
    </div>
  );
}
