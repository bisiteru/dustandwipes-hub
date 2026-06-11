// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Formatting & date utilities
//  Phase 2 extraction. Pure functions, no React, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import { MONTHS, TODAY } from "./constants";

/** Format a number as Naira-style integer (₦ prefix is NOT included — caller adds it). */
export const fmt = (n: number | string | null | undefined): string =>
  "" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

/** Format a date string/Date as "12 May 2026" (en-GB) — falls back to "--" when empty. */
export const fmtD = (d: string | Date | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--";

/**
 * Format a time string as "HH:mm".
 * Accepts ISO timestamps (with "T"), full datetime strings (>8 chars), or
 * already-truncated "HH:mm:ss" strings.
 */
export const fmtT = (t: string | null | undefined): string => {
  if (!t) return "--";
  if (t.includes("T") || t.length > 8) {
    return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  const [h, m] = String(t).split(":");
  return `${h}:${m}`;
};

/** Combined date + time formatter — accepts ISO timestamp strings. */
export const fmtDT = (t: string | null | undefined): string =>
  t ? `${fmtD(t.split("T")[0])} ${fmtT(t)}` : "--";

/** Calculate the duration between two ISO/Date strings as "Xh Ym" (e.g. "2h 35m"). */
export const calcDur = (s: string | Date | null, e: string | Date | null): string | null => {
  if (!s || !e) return null;
  const d = new Date(e).getTime() - new Date(s).getTime();
  if (d < 0) return " Invalid";
  return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
};

/** Get the short month name for a 0-based month index (0=Jan, 11=Dec). */
export const monthName = (m: number): string => MONTHS[m];

/**
 * Determine contract health from its end date.
 *
 * Returned values (used throughout the app for status badges + filtering):
 * - "Expired"        — end date is in the past
 * - "Critical"       — ≤30 days remaining
 * - "Expiring Soon"  — ≤60 days remaining
 * - "Active"         — >60 days remaining
 * - "Unknown"        — no end date set (treated as ongoing)
 */
export const cStatus = (end: string | Date | null | undefined): string => {
  if (!end) return "Unknown";
  const d = Math.ceil((new Date(end).getTime() - TODAY.getTime()) / 86400000);
  return d < 0 ? "Expired" : d <= 30 ? "Critical" : d <= 60 ? "Expiring Soon" : "Active";
};

/** Days remaining until a date (negative = overdue). Returns null if no date. */
export const dLeft = (end: string | Date | null | undefined): number | null =>
  end ? Math.ceil((new Date(end).getTime() - TODAY.getTime()) / 86400000) : null;

// ── Name matching ───────────────────────────────────────────────────────────
// AppUser names (used for login) and Staff names (used in pickers) live in
// separate tables and don't always agree on whitespace/case. The Dashboard's
// "my assignments" filters need to be forgiving — otherwise an assignee
// stamped as "Bola" never lights up the row for "Bola " (trailing space) or
// "bola adebayo" (full name they log in as).
//
// Returns true if both arguments are non-empty and either:
//   - normalized strings are exactly equal, OR
//   - one normalized string contains the other (handles "Bola" ↔ "Bola Adebayo")

const normalizeName = (s: unknown): string =>
  String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export const sameName = (a: unknown, b: unknown): boolean => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Word-boundary prefix match: one name is the leading whole-word(s) of the
  // other. "bola" ↔ "bola adebayo" matches; "bola" ↔ "bolanle akin" does NOT
  // (the trailing space anchor prevents matching a partial first token). This
  // kills the false-positive class where a bare first name leaked onto the
  // wrong user via the old bidirectional substring `.includes()`.
  return (na + " ").startsWith(nb + " ") || (nb + " ").startsWith(na + " ");
};

/**
 * Stricter variant — exact match after normalization. Use when the
 * "contains" leniency of `sameName` would cause false positives (e.g.
 * "Bola" matching "Bolanle" via includes).
 */
export const sameNameStrict = (a: unknown, b: unknown): boolean => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return !!na && na === nb;
};

/**
 * True if a comma-separated list `csv` contains `target` as one of its
 * names (each comparison done via sameName). Used to test `j.techs`
 * (crew list as a string) for membership.
 */
export const csvHasName = (csv: unknown, target: unknown): boolean => {
  const s = String(csv ?? "");
  if (!s) return false;
  return s.split(",").some(part => sameName(part, target));
};
