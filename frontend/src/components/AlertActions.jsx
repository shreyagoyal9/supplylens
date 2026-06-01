/**
 * AlertActions.jsx
 * ----------------
 * Action buttons on each alert: Acknowledge, Escalate, Assign Technician.
 *
 * State is managed locally in React (no backend persistence — this is a demo).
 * In a production system these actions would write to a DB and trigger
 * notifications via email/SMS/PagerDuty.
 *
 * Actions:
 *   Acknowledge    → marks alert as "seen", reduces urgency visually
 *   Escalate       → marks alert as ESCALATED, would ping on-call team
 *   Assign Tech    → shows a dropdown of mock technicians, marks as ASSIGNED
 *
 * Props:
 *   alertId   {string}  — unique ID of the alert
 *   severity  {string}  — "CRITICAL" | "WARNING"
 */

import React, { useState } from "react";
import { Check, ArrowUpCircle, UserCheck, ChevronDown } from "lucide-react";

// ── Mock technicians list ─────────────────────────────────────────────────────
const TECHNICIANS = [
  "Arjun Sharma (Mumbai Hub)",
  "Priya Nair (Chennai Depot)",
  "Vikram Singh (Delhi Warehouse)",
  "Deepa Iyer (Bangalore Cold Store)",
  "Rahul Mehta (Kolkata Facility)",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AlertActions({ alertId, severity }) {
  // Track action state per alert
  const [status,      setStatus]      = useState(null);    // null | "acknowledged" | "escalated" | "assigned"
  const [assignedTo,  setAssignedTo]  = useState(null);
  const [showAssign,  setShowAssign]  = useState(false);

  // Once an action is taken, show the outcome badge instead of buttons
  if (status === "acknowledged") {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-green-600 dark:text-green-400 text-xs font-medium">
        <Check size={13} />
        Acknowledged
      </div>
    );
  }

  if (status === "escalated") {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-red-600 dark:text-red-400 text-xs font-medium">
        <ArrowUpCircle size={13} />
        Escalated to on-call team
      </div>
    );
  }

  if (status === "assigned") {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-blue-600 dark:text-blue-400 text-xs font-medium">
        <UserCheck size={13} />
        Assigned to {assignedTo}
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 relative">

      {/* Acknowledge */}
      <button
        onClick={() => setStatus("acknowledged")}
        title="Mark as seen — no immediate action needed"
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md
          bg-green-100 text-green-700 hover:bg-green-200
          dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60
          transition-colors"
      >
        <Check size={11} />
        Acknowledge
      </button>

      {/* Escalate — only on CRITICAL alerts */}
      {severity === "CRITICAL" && (
        <button
          onClick={() => setStatus("escalated")}
          title="Escalate to on-call team immediately"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md
            bg-red-100 text-red-700 hover:bg-red-200
            dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60
            transition-colors"
        >
          <ArrowUpCircle size={11} />
          Escalate
        </button>
      )}

      {/* Assign Technician */}
      <div className="relative">
        <button
          onClick={() => setShowAssign((s) => !s)}
          title="Assign a field technician to investigate"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md
            bg-blue-100 text-blue-700 hover:bg-blue-200
            dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60
            transition-colors"
        >
          <UserCheck size={11} />
          Assign
          <ChevronDown size={10} className={`transition-transform ${showAssign ? "rotate-180" : ""}`} />
        </button>

        {/* Technician dropdown */}
        {showAssign && (
          <div className="absolute left-0 top-full mt-1 w-52 z-50 rounded-lg shadow-xl border
            bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700">
            {TECHNICIANS.map((tech) => (
              <button
                key={tech}
                onClick={() => { setAssignedTo(tech); setStatus("assigned"); setShowAssign(false); }}
                className="w-full text-left px-3 py-2 text-xs
                  text-slate-700 hover:bg-slate-50
                  dark:text-slate-200 dark:hover:bg-slate-700
                  first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                {tech}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
