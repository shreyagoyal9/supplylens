/**
 * DemoStoryMode.jsx
 * -----------------
 * Guided 6-step tour that auto-launches for first-time visitors.
 * Can be re-triggered by clicking the "? Tour" button in the header.
 *
 * Each step explains a key feature of SupplyLens in plain English,
 * helping recruiters, interviewers, and new users understand the project
 * before they explore on their own.
 *
 * Behaviour:
 *   - Auto-shows on first visit (checks localStorage "supplylens-tour-done")
 *   - "Skip" closes the tour and marks it as done
 *   - "Finish" on the last step marks it as done
 *   - Can be re-opened from the header "? Tour" button (resets step to 0)
 *
 * Props:
 *   isOpen     {boolean}   — controlled from parent (Dashboard)
 *   onClose    {function}  — called when user closes/finishes the tour
 */

import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft, Zap } from "lucide-react";

// ── Tour steps ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: "🌡️",
    title: "Welcome to SupplyLens",
    subtitle: "Cold Chain Anomaly Detection for Indian Logistics",
    body: "30% of food and 20% of pharmaceutical products in India are lost during transit due to temperature failures. SupplyLens detects these failures before they happen — saving crores in spoilage.",
    highlight: "India has a ₹25,000 crore cold chain logistics market. This system is built for it.",
    tag: "The Problem",
    color: "from-blue-600 to-blue-800",
  },
  {
    emoji: "📡",
    title: "Live IoT Sensor Data",
    subtitle: "5 shipments · 5-second intervals · Real-time WebSocket stream",
    body: "The simulator generates realistic IoT sensor data for 5 shipment types (pharma, seafood, frozen, dairy) with authentic temperature ranges, humidity levels, and random fault injections — mimicking real cold-chain conditions.",
    highlight: "Look at the LIVE indicator top-right. Data streams every 5 seconds via WebSocket — no page refresh needed.",
    tag: "How Data Flows",
    color: "from-green-600 to-green-800",
  },
  {
    emoji: "🤖",
    title: "Isolation Forest ML Model",
    subtitle: "Unsupervised anomaly detection — 96% accuracy",
    body: "Each sensor reading passes through a trained Isolation Forest model. It evaluates 6 features: temperature, humidity, temp_delta, hum_delta, rolling_mean, rolling_std. Readings that are statistically 'isolated' from the normal cluster get flagged.",
    highlight: "This is the same technique used by Flipkart and Amazon supply chain teams. No labelled data required — fully unsupervised.",
    tag: "The ML Engine",
    color: "from-purple-600 to-purple-800",
  },
  {
    emoji: "⚡",
    title: "LSTM Predictive Forecasting",
    subtitle: "Predicts temperature 20 minutes into the future",
    body: "When an anomaly is detected, an LSTM neural network forecasts the next 20 temperature readings. If any predicted value exceeds the threshold — a CRITICAL alert fires with an estimated breach time and recommended action.",
    highlight: "See the dashed orange line on the chart? That's the LSTM forecast. Average early warning: 18 minutes before breach.",
    tag: "Prediction Engine",
    color: "from-orange-600 to-orange-800",
  },
  {
    emoji: "💰",
    title: "Health Score & Cost Impact",
    subtitle: "Quantified business value in Indian Rupees",
    body: "Every shipment has a 0–100 Health Score (computed from breach rate, anomaly rate, and temperature variance). The Cost Impact panel estimates financial loss in ₹ based on real Indian market cargo values and spoilage rates per shipment type.",
    highlight: "Click 'View full details' on any shipment to see the Health Score gauge, Cost Impact analysis (₹), and AI Anomaly Explainer.",
    tag: "Business Value",
    color: "from-yellow-600 to-yellow-800",
  },
  {
    emoji: "🚀",
    title: "You're Ready to Explore",
    subtitle: "Full-stack React + Node.js + Python microservices",
    body: "Built with: React 18 + Recharts (dashboard) · Node.js + Express + WebSocket (API + IoT simulator) · Python + Flask + Isolation Forest (ML service) · Supabase PostgreSQL (DB) · Deployed on Render (free tier).",
    highlight: "Click any shipment card → 'View full details' to see the complete feature set including route map, alert actions, export, and AI explanation.",
    tag: "Tech Stack",
    color: "from-slate-600 to-slate-800",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DemoStoryMode({ isOpen, onClose }) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const current  = STEPS[step];
  const isFirst  = step === 0;
  const isLast   = step === STEPS.length - 1;

  const handleClose = () => {
    localStorage.setItem("supplylens-tour-done", "true");
    setStep(0); // reset for next time
    onClose();
  };

  const handleNext = () => {
    if (isLast) { handleClose(); return; }
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      {/* Tour card */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Gradient header ── */}
        <div className={`bg-gradient-to-r ${current.color} p-6 relative`}>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Step badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
              {current.tag}
            </span>
          </div>

          <div className="text-4xl mb-2">{current.emoji}</div>
          <h2 className="text-white font-bold text-xl leading-tight">{current.title}</h2>
          <p className="text-white/80 text-sm mt-1">{current.subtitle}</p>
        </div>

        {/* ── Body ── */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
            {current.body}
          </p>

          {/* Highlighted callout */}
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <Zap size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
              {current.highlight}
            </p>
          </div>

          {/* ── Progress dots ── */}
          <div className="flex justify-center gap-2 mt-5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? "w-6 h-2 bg-blue-500"
                    : "w-2 h-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>

          {/* ── Navigation buttons ── */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm
                  text-slate-600 dark:text-slate-300
                  bg-gray-100 dark:bg-slate-800
                  hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm
                font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {isLast ? "Start Exploring 🚀" : "Next"}
              {!isLast && <ChevronRight size={16} />}
            </button>

            {!isLast && (
              <button
                onClick={handleClose}
                className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-600
                  dark:hover:text-slate-200 transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
