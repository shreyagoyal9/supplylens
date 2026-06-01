/**
 * ExportButton.jsx
 * ----------------
 * Dropdown button with two export options:
 *   1. Export CSV  — downloads a .csv file of all sensor readings
 *   2. Export PDF  — downloads a formatted .pdf report using jsPDF
 *
 * Props:
 *   shipment  {object}  — shipment config (id, type, origin, dest, threshold)
 *   readings  {array}   — array of sensor reading objects
 *   stats     {object}  — aggregated stats (avg, min, max, breach_count, etc.)
 */

import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, Table, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "../context/ThemeContext";

// ── CSV Export ──────────────────────────────────────────────────────────────

/**
 * Converts readings array to a CSV string and triggers a browser download.
 * No external library needed — built with native Blob + URL APIs.
 */
function downloadCSV(shipment, readings) {
  // Column headers
  const headers = [
    "timestamp",
    "temperature_c",
    "humidity_pct",
    "status",
    "is_anomaly",
    "anomaly_type",
    "is_breach",
    "threshold_c",
  ];

  // One row per reading — escape commas just in case
  const rows = readings.map((r) => [
    r.timestamp,
    r.temperature,
    r.humidity,
    r.status,
    r.is_anomaly ? "true" : "false",
    r.anomaly_type || "none",
    r.is_breach ? "true" : "false",
    r.threshold,
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

  // Create a temporary download link, click it, then remove it
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `supplylens-${shipment.id}-readings.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── PDF Export ──────────────────────────────────────────────────────────────

/**
 * Builds a formatted PDF report using jsPDF + jspdf-autotable and
 * triggers a browser download.
 */
function downloadPDF(shipment, readings, stats) {
  const doc = new jsPDF();
  const destination = shipment.dest || shipment.destination || "–";
  const generatedAt = new Date().toLocaleString("en-IN");

  // ── Title block ──
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("SupplyLens — Cold Chain Report", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Shipment: ${shipment.id}  ·  Type: ${shipment.type}`, 14, 30);
  doc.text(`Route: ${shipment.origin} → ${destination}  ·  Max Threshold: ${shipment.threshold}°C`, 14, 37);
  doc.text(`Generated: ${generatedAt}`, 14, 44);

  // ── Summary stats table ──
  if (stats) {
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("Summary Statistics", 14, 57);

    autoTable(doc, {
      startY: 62,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] }, // blue-600
      head: [["Metric", "Value"]],
      body: [
        ["Total Readings",    stats.reading_count],
        ["Avg Temperature",   `${stats.temp_avg}°C`],
        ["Min Temperature",   `${stats.temp_min}°C`],
        ["Max Temperature",   `${stats.temp_max}°C`],
        ["Threshold Breaches",`${stats.breach_count} (${((stats.breach_count / stats.reading_count) * 100).toFixed(1)}%)`],
        ["Anomaly Detections",`${stats.anomaly_count} (${((stats.anomaly_count / stats.reading_count) * 100).toFixed(1)}%)`],
      ],
    });
  }

  // ── Last 100 readings table ──
  const tableStartY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 62;

  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(`Sensor Readings (last ${Math.min(readings.length, 100)})`, 14, tableStartY);

  autoTable(doc, {
    startY: tableStartY + 5,
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    head: [["Time", "Temp (°C)", "Humidity (%)", "Status", "Anomaly"]],
    body: readings.slice(-100).map((r) => [
      new Date(r.timestamp).toLocaleTimeString("en-IN"),
      r.temperature.toFixed(2),
      r.humidity.toFixed(1),
      r.status,
      r.is_anomaly ? "⚠️ YES" : "–",
    ]),
    // Color the Status column based on value
    didParseCell: (data) => {
      if (data.column.index === 3) {
        if (data.cell.raw === "BREACH")  data.cell.styles.textColor = [220, 38, 38];
        if (data.cell.raw === "WARNING") data.cell.styles.textColor = [217, 119, 6];
        if (data.cell.raw === "NORMAL")  data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  doc.save(`supplylens-${shipment.id}-report.pdf`);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ExportButton({ shipment, readings, stats }) {
  const [open, setOpen]       = useState(false);
  const dropdownRef           = useRef(null);
  const { theme }             = useTheme();
  const isDark                = theme === "dark";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleCSV = () => {
    downloadCSV(shipment, readings);
    setOpen(false);
  };

  const handlePDF = () => {
    // Compute stats locally if not passed in
    const computedStats = stats || (() => {
      const temps = readings.map((r) => r.temperature);
      return {
        reading_count: readings.length,
        temp_avg:      (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2),
        temp_min:      Math.min(...temps).toFixed(2),
        temp_max:      Math.max(...temps).toFixed(2),
        breach_count:  readings.filter((r) => r.is_breach).length,
        anomaly_count: readings.filter((r) => r.is_anomaly).length,
      };
    })();
    downloadPDF(shipment, readings, computedStats);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-colors duration-150
          ${isDark
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"}
        `}
      >
        <Download size={15} />
        Export
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className={`
          absolute right-0 mt-2 w-44 rounded-lg shadow-xl border z-50
          ${isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"}
        `}>
          {/* Export CSV option */}
          <button
            onClick={handleCSV}
            disabled={!readings.length}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-sm rounded-t-lg
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${isDark
                ? "text-slate-200 hover:bg-slate-700"
                : "text-slate-700 hover:bg-slate-50"}
            `}
          >
            <Table size={15} className="text-green-500" />
            Export CSV
          </button>

          {/* Divider */}
          <div className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`} />

          {/* Export PDF option */}
          <button
            onClick={handlePDF}
            disabled={!readings.length}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-sm rounded-b-lg
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${isDark
                ? "text-slate-200 hover:bg-slate-700"
                : "text-slate-700 hover:bg-slate-50"}
            `}
          >
            <FileText size={15} className="text-red-500" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
