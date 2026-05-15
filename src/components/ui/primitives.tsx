// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Shared UI primitives
//  Phase 3 extraction. Each component is tiny (≤ 10 lines of body) so they
//  live together in this single file instead of one-per-file overhead.
// ─────────────────────────────────────────────────────────────────────────────

import React, { ReactNode, useState } from "react";
import { G, RED, AMBER, STATUS_COLORS, CONTRACT_COLORS } from "../../lib/constants";

interface BadgeStyle { bg: string; color: string; border: string; }

// ── SBadge — status pill (uses STATUS_COLORS / CONTRACT_COLORS by default) ──
interface SBadgeProps {
  s: string;
  custom?: BadgeStyle;
}
export function SBadge({ s, custom }: SBadgeProps) {
  const st = custom ||
    CONTRACT_COLORS[s] ||
    STATUS_COLORS[s] ||
    { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap border"
      style={{ background: st.bg, color: st.color, borderColor: st.border }}>
      {s}
    </span>
  );
}

// ── Card — generic content container ─────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}
export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

// ── Fld — form field with label ──────────────────────────────────────────────
interface FldProps {
  label: string;
  children: ReactNode;
  col?: boolean;       // span both columns in a 2-col grid
  required?: boolean;
}
export function Fld({ label, children, col = false, required = false }: FldProps) {
  return (
    <div className={col ? "col-span-2" : ""}>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── KPI — big-number stat card with icon, label, sub-text ───────────────────
interface KPIProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  bg?: string;
  onClick?: () => void;
}
export function KPI({ icon, label, value, sub, bg, onClick }: KPIProps) {
  return (
    <Card className={`p-5 overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={onClick}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3" style={{ background: bg }}>{icon}</div>
      <div className="text-2xl font-black text-gray-800">{value}</div>
      <div className="text-xs font-bold text-gray-500 mt-1">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </Card>
  );
}

// ── RadioG — radio button group with pill styling, optional "danger" set ────
interface RadioGProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  /** Options in this array render with red highlight when selected. */
  danger?: string[];
}
export function RadioG({ value, onChange, options, danger = [] }: RadioGProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(o => (
        <label key={o}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
            value === o
              ? (danger.includes(o)
                ? "border-red-500 bg-red-50 font-semibold text-red-800"
                : "border-green-500 bg-green-50 font-semibold text-green-800")
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}>
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-green-600"/>{o}
        </label>
      ))}
    </div>
  );
}

// ── StarRating — 1–5 rating with descriptive label ──────────────────────────
interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
}
export function StarRating({ value, onChange, label }: StarRatingProps) {
  const lbl = ["", "Poor", "Below Average", "Average", "Good", "Excellent"];
  const colorFor = (n: number) => (n <= 2 ? RED : n === 3 ? AMBER : G);
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="w-10 h-10 rounded-xl font-black text-sm transition-all"
            style={value === n ? { background: colorFor(n), color: "#fff" } : { background: "#f3f4f6", color: "#9ca3af" }}>
            {n}
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs font-semibold ml-1" style={{ color: colorFor(value) }}>{lbl[value]}</span>
        )}
      </div>
    </div>
  );
}

// ── SaveBtn — button with built-in async loading state ──────────────────────
// Usage: <SaveBtn onClick={asyncFn} label="Save" savingLabel="Saving…" color={G}/>
interface SaveBtnProps {
  onClick: () => Promise<void> | void;
  label?: string;
  savingLabel?: string;
  disabled?: boolean;
  color?: string;
  className?: string;
}
export function SaveBtn({ onClick, label = "Save", savingLabel, disabled = false, color, className = "" }: SaveBtnProps) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try { await onClick(); } finally { setBusy(false); }
  };
  return (
    <button onClick={go} disabled={busy || disabled}
      className={`px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2 ${className}`}
      style={{ background: color || G }}>
      {busy && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
      {busy ? (savingLabel || label + "…") : label}
    </button>
  );
}
