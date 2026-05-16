// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Imprest fund pure-calc helpers
//
//  Extracted from pages/Imprest.tsx so balance math + carry-forward logic
//  can be unit-tested in isolation. This is the path that produced the
//  ₦228-quadrillion bug — defensive `Number(x) || 0` wrapping is intentional
//  and load-bearing here. Do not "simplify it out."
// ─────────────────────────────────────────────────────────────────────────────

import type { Imprest } from "./schemas";

export interface ImprestExpense { amount?: number | string; [key: string]: any; }
export interface ImprestTopup   { amount?: number | string; [key: string]: any; }

/** Sum expense amounts, coercing each to a number defensively. */
export const sumExpenses = (xs: ImprestExpense[] | undefined): number =>
  (xs || []).reduce((s, e) => s + (Number(e?.amount) || 0), 0);

/** Sum top-up amounts, coercing each to a number defensively. */
export const sumTopups = (xs: ImprestTopup[] | undefined): number =>
  (xs || []).reduce((s, t) => s + (Number(t?.amount) || 0), 0);

/**
 * Compute the closing balance of a single imprest record:
 *   balance = amount - total_spent
 * (`amount` already includes top-ups — the existing UI mutates `amount`
 * directly when a top-up is logged, so we don't double-count them here.)
 */
export const balanceOf = (imp: Imprest | undefined | null): number => {
  if (!imp) return 0;
  return (Number(imp.amount) || 0) - sumExpenses(imp.expenses as ImprestExpense[] | undefined);
};

/**
 * Get the month-key for an imprest record. Prefers the explicit `month`
 * field (YYYY-MM); falls back to the YYYY-MM prefix of `releaseDate`, or
 * the provided default if neither is present.
 */
export const monthKeyOf = (imp: Imprest, fallback: string): string =>
  imp.month || (imp.releaseDate ? imp.releaseDate.slice(0, 7) : fallback);

/**
 * Given the full imprest list, return the closing balance of `holder`'s
 * most-recent account that closed BEFORE `beforeMK` (YYYY-MM). Clamped to
 * zero — negative balances (over-spend) don't carry forward as a credit;
 * those are surfaced as a warning in the UI instead. Returns 0 if the
 * holder has no prior records.
 *
 * This is the value that pre-fills the carry-forward modal when opening
 * a new month: "X has ₦Y unspent from last month."
 */
export const getPrevBal = (
  imprests: Imprest[],
  holder: string,
  beforeMK: string,
  fallbackMK: string = beforeMK,
): number => {
  const prev = imprests
    .filter(i => monthKeyOf(i, fallbackMK) < beforeMK && i.holder === holder)
    .sort((a, b) => monthKeyOf(b, fallbackMK).localeCompare(monthKeyOf(a, fallbackMK)));
  if (!prev.length) return 0;
  return Math.max(0, balanceOf(prev[0]));
};

export interface CarryForwardArgs {
  imprests: Imprest[];
  /** Source month — the one being closed. YYYY-MM. */
  fromMK: string;
  /** Destination month — the new one being opened. YYYY-MM. */
  toMK: string;
  /** Optional ID generator; defaults to timestamp-based. Injected for test determinism. */
  idGen?: (index: number) => string;
}

/**
 * Build the carry-forward Imprest records for opening `toMK`. One new
 * record per unique holder in `fromMK`, pre-filled with the prior closing
 * balance as the starting `amount` (so the field staff can keep operating
 * without re-issuing cash from petty cash). Records carry a metadata flag
 * (`isCarryForward: true`) so the UI can badge them and so reports can
 * exclude them from "new issuance" totals.
 *
 * Returns an empty array if no holders existed in `fromMK`.
 */
export function computeCarryForward({
  imprests,
  fromMK,
  toMK,
  idGen = (idx) => `imp${Date.now()}_${idx}`,
}: CarryForwardArgs): Imprest[] {
  const fromMonthRecs = imprests.filter(i => monthKeyOf(i, fromMK) === fromMK);
  const holders = [...new Set(
    fromMonthRecs.map(i => i.holder).filter((h): h is string => Boolean(h))
  )];
  const toLabel = labelOfMK(toMK);

  return holders.map((holder, idx) => {
    const bal = getPrevBal(imprests, holder, toMK, fromMK);
    const ref = fromMonthRecs.find(i => i.holder === holder) || ({} as Partial<Imprest>);
    return {
      id: idGen(idx),
      month: toMK,
      title: `${holder} — ${toLabel}`,
      holder,
      fundType: ref.fundType || "Petty Cash",
      branch: ref.branch || "",
      amount: bal,
      originalAmount: bal,
      releaseDate: `${toMK}-01`,
      deadline: "",
      purpose: ref.purpose || "",
      status: "Active",
      expenses: [],
      topups: [],
      isCarryForward: true,
      carryForwardAmount: bal,
      carriedFrom: fromMK,
      closedPeriod: "",
    } as Imprest;
  });
}

/**
 * Minimal "May 2026" formatter — duplicated here from monthly.tsx to avoid
 * a circular import (Imprest doesn't import the rest of monthly.tsx).
 */
function labelOfMK(mk: string): string {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  if (!/^\d{4}-\d{2}$/.test(mk)) return "Unknown";
  const [y, m] = mk.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
