/**
 * CostImpact.jsx
 * --------------
 * Estimates the financial loss caused by temperature breaches.
 *
 * Methodology (Indian cold-chain market rates):
 *   Cargo value per shipment type (rough averages for a full truck):
 *     Pharma:  ₹5,00,000  (vaccines, injectables — high value)
 *     Seafood: ₹1,50,000  (fresh catch, very perishable)
 *     Frozen:  ₹2,00,000  (processed frozen foods)
 *     Dairy:   ₹1,00,000  (milk, yogurt, cheese)
 *
 *   Spoilage rate per type (% of cargo destroyed per 1% breach exposure):
 *     Pharma:  30%  — strict 2–8°C window; any breach destroys batch
 *     Seafood: 80%  — bacterial growth is exponential
 *     Frozen:  50%  — texture/quality degraded permanently
 *     Dairy:   40%  — shelf life reduced significantly
 *
 *   Formula:
 *     cost_at_risk = cargo_value × (breach_pct / 100) × spoilage_rate
 *
 * Props:
 *   readings      {array}   — sensor readings with is_breach flag
 *   shipmentType  {string}  — "pharma" | "seafood" | "frozen" | "dairy"
 */

import React, { useMemo } from "react";
import { IndianRupee, TrendingDown, Info } from "lucide-react";
import Tooltip from "./Tooltip";

// ── Constants ─────────────────────────────────────────────────────────────────

const CARGO_VALUE = {
  pharma:  500000,  // ₹5,00,000
  seafood: 150000,  // ₹1,50,000
  frozen:  200000,  // ₹2,00,000
  dairy:   100000,  // ₹1,00,000
};

const SPOILAGE_RATE = {
  pharma:  0.30,
  seafood: 0.80,
  frozen:  0.50,
  dairy:   0.40,
};

const CARGO_DESC = {
  pharma:  "Vaccines & injectables — any breach may invalidate the entire batch per CDSCO guidelines",
  seafood: "Fresh marine catch — bacterial growth doubles every 20 min above safe temperature",
  frozen:  "Processed frozen foods — freeze-thaw damage is irreversible",
  dairy:   "Milk & dairy products — shelf life reduced significantly by warm exposure",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a number as Indian rupee string: ₹42,500 or ₹1,25,000 */
function formatRupees(amount) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`; // Lakh format
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CostImpact({ readings, shipmentType }) {
  const impact = useMemo(() => {
    if (!readings || !readings.length) return null;

    const type         = shipmentType?.toLowerCase() || "pharma";
    const cargoValue   = CARGO_VALUE[type]  || CARGO_VALUE.pharma;
    const spoilage     = SPOILAGE_RATE[type] || SPOILAGE_RATE.pharma;
    const total        = readings.length;
    const breachCount  = readings.filter((r) => r.is_breach).length;
    const breachPct    = (breachCount / total) * 100;

    // At-risk = portion of cargo exposed to breach conditions × spoilage factor
    const atRisk       = Math.round(cargoValue * (breachPct / 100) * spoilage);
    const safeValue    = cargoValue - atRisk;

    return {
      cargoValue,
      atRisk,
      safeValue,
      breachPct:   +breachPct.toFixed(1),
      breachCount,
      total,
      type,
      description: CARGO_DESC[type],
    };
  }, [readings, shipmentType]);

  if (!impact) return null;

  const riskLevel = impact.atRisk > impact.cargoValue * 0.3
    ? { label: "HIGH RISK",   color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" }
    : impact.atRisk > impact.cargoValue * 0.1
    ? { label: "MEDIUM RISK", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" }
    : { label: "LOW RISK",    color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" };

  return (
    <div className={`rounded-xl border p-5 ${riskLevel.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IndianRupee size={18} className={riskLevel.color} />
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Cost Impact Analysis</h3>
          <Tooltip content="Estimated financial loss based on Indian cold-chain cargo values and spoilage rates for each shipment type.">
            <Info size={13} className="text-slate-400 cursor-help" />
          </Tooltip>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${riskLevel.color} ${riskLevel.bg}`}>
          {riskLevel.label}
        </span>
      </div>

      {/* Main numbers */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Cargo Value</p>
          <p className="text-slate-900 dark:text-white font-bold text-lg">{formatRupees(impact.cargoValue)}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">At Risk 🔴</p>
          <p className={`font-bold text-lg ${riskLevel.color}`}>{formatRupees(impact.atRisk)}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Safe Value 🟢</p>
          <p className="text-green-600 dark:text-green-400 font-bold text-lg">{formatRupees(impact.safeValue)}</p>
        </div>
      </div>

      {/* Progress bar: safe vs at risk */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
        <div className="h-3 rounded-full flex">
          <div
            className="bg-green-500 h-3 transition-all duration-700"
            style={{ width: `${100 - impact.breachPct}%` }}
          />
          <div
            className="bg-red-500 h-3 transition-all duration-700"
            style={{ width: `${impact.breachPct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
        <span>✅ {(100 - impact.breachPct).toFixed(1)}% within safe range</span>
        <span>⚠️ {impact.breachPct}% breached ({impact.breachCount} readings)</span>
      </div>

      {/* Domain context */}
      <div className="flex items-start gap-2 mt-2">
        <TrendingDown size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
          {impact.description}
        </p>
      </div>
    </div>
  );
}
