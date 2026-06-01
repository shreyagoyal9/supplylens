/**
 * Tooltip.jsx
 * -----------
 * Reusable hover tooltip component.
 * Wrap any element with <Tooltip content="..."> to show an info box on hover.
 *
 * Used throughout the app to explain ML terms, metrics, and actions
 * to recruiters and users who may not be familiar with the terminology.
 *
 * Props:
 *   content  {string}   — Text to show inside the tooltip
 *   children {element}  — The element that triggers the tooltip on hover
 *   position {string}   — "top" | "bottom" | "left" | "right" (default: "top")
 */

import React, { useState } from "react";

export default function Tooltip({ content, children, position = "top" }) {
  const [visible, setVisible] = useState(false);

  // Position classes for the tooltip box
  const posClass = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full  left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full  top-1/2 -translate-y-1/2 ml-2",
  }[position] || "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <span
          className={`
            absolute z-50 w-56 px-3 py-2 text-xs rounded-lg shadow-lg pointer-events-none
            bg-slate-900 text-slate-100 border border-slate-700
            dark:bg-slate-950 dark:border-slate-600
            ${posClass}
          `}
        >
          {content}
        </span>
      )}
    </span>
  );
}
