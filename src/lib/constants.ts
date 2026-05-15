// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Shared constants
//  Phase 2 extraction. These were inlined at the top of App.js since v1.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand palette (Tailwind doesn't cover the exact hex values D&W uses) ─────
export const GD = "#0B3518";     // green-darkest (sidebar)
export const G = "#1B6B2F";      // green primary
export const GL = "#E8F5E9";     // green-light (success backgrounds)
export const O = "#E85D04";      // orange accent
export const OL = "#FFF3E0";     // orange-light
export const AMBER = "#D97706";
export const RED = "#DC2626";
export const BLUE = "#2563EB";

// ── Time anchor — always the current date at module load time ────────────────
// Used by cStatus(), dLeft(), and several Dashboard widgets. Recomputed on
// every page reload, which matches CRA's full-reload SPA model.
export const TODAY = new Date();

// ── Month names (short form) ─────────────────────────────────────────────────
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// ── Recurring-contract frequency → days between visits ───────────────────────
export const FREQ_DAYS: Record<string, number | null> = {
  "Daily": 1,
  "Weekly": 7,
  "Bi-weekly": 14,
  "Monthly": 30,
  "Quarterly": 91,
  "One-Time": null,
};

// ── Badge color palettes ─────────────────────────────────────────────────────
interface BadgeStyle { bg: string; color: string; border: string; }

export const STATUS_COLORS: Record<string, BadgeStyle> = {
  "New":               { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
  "Scheduled":         { bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
  "Assigned":          { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "In Progress":       { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "Awaiting Approval": { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "Completed":         { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "Closed":            { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

export const CONTRACT_COLORS: Record<string, BadgeStyle> = {
  "Active":         { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Expiring Soon":  { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  "Critical":       { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "Expired":        { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" },
};

export const IMPREST_CATS = [
  "Transportation",
  "Emergency Supplies",
  "Minor Repairs",
  "Fuel/Logistics",
  "Site Support",
  "Consumables Procurement",
  "Other",
] as const;

// ── Job lifecycle stages (ordered — index drives advance buttons) ────────────
export const JOB_STATUSES = [
  "New",
  "Scheduled",
  "Assigned",
  "In Progress",
  "Awaiting Approval",
  "Completed",
  "Closed",
] as const;

// ── Shared <input>/<select>/<textarea> Tailwind class string ─────────────────
// Single source of truth for form-field styling — every page imports this.
export const inp =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
