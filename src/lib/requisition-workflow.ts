// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Requisition approval state machine
//
//  Extracted from pages/Requisitions.tsx so the workflow rules are unit-
//  testable in isolation. The page glues these pure functions into React
//  state + Supabase + toasts; the rules themselves live here.
//
//  States: Pending → Approved → Forwarded
//          Pending → Rejected
//  No other transitions are legal. Once a row is Forwarded or Rejected it
//  is terminal — the UI hides further transition buttons.
// ─────────────────────────────────────────────────────────────────────────────

import type { Requisition, Inventory } from "./schemas";

export type ReqStatus = "Pending" | "Approved" | "Rejected" | "Forwarded";

/** Defensive numeric coerce used across line-item arithmetic. */
const n = (v: unknown): number => Number(v) || 0;

/**
 * Allowed transitions in the approval state machine. A reviewer can move
 * Pending → Approved/Rejected, and Approved → Forwarded. Anything else is
 * rejected by `canTransition`, including no-op self-transitions (which
 * would otherwise overwrite reviewedBy with a fresh timestamp).
 */
const ALLOWED_TRANSITIONS: Record<ReqStatus, ReqStatus[]> = {
  Pending:   ["Approved", "Rejected"],
  Approved:  ["Forwarded"],
  Rejected:  [],
  Forwarded: [],
};

export function canTransition(from: ReqStatus | string | undefined, to: ReqStatus): boolean {
  const cur = (from || "Pending") as ReqStatus;
  return ALLOWED_TRANSITIONS[cur]?.includes(to) ?? false;
}

export interface ApplyTransitionArgs {
  /** The requisition being moved. Returned untouched if the transition is illegal. */
  req: Requisition;
  to: ReqStatus;
  /** The user performing the review — stamped as `reviewedBy`. */
  reviewerName: string;
  /** Pinned clock for tests. Defaults to Date.now. Result is en-GB formatted. */
  now?: Date;
}

/**
 * Apply an approval transition to a requisition. Pure: returns a NEW record
 * if the transition is allowed, or the original (===) if not. Caller checks
 * `result === req` for "no-op" semantics rather than throwing — keeps the
 * UI resilient if a user double-clicks Approve.
 *
 * Side effects (auto-contact, inventory deduction, toasts) are NOT done
 * here; they're separate helpers below or stay in the React layer.
 */
export function applyTransition({ req, to, reviewerName, now = new Date() }: ApplyTransitionArgs): Requisition {
  if (!canTransition(req.status, to)) return req;
  return {
    ...req,
    status: to,
    reviewedBy: reviewerName,
    reviewedAt: now.toLocaleString("en-GB"),
  } as Requisition;
}

// ── Auto-contact decision ────────────────────────────────────────────────────

export interface ShouldAutoSaveContactArgs {
  siteName: string;
  /** Existing clients (case-insensitive name match). */
  clients: { name?: string }[];
  /** Existing contacts (case-insensitive name match). */
  contacts: { name?: string }[];
}

/**
 * On Approval, the page silently creates a Contact for the requisition's
 * site if it isn't already known. Returns true if a new contact should be
 * created. Case-insensitive name comparison, trimmed of whitespace, to avoid
 * "Acme Office  " vs "Acme Office" duplicates.
 */
export function shouldAutoSaveContact({ siteName, clients, contacts }: ShouldAutoSaveContactArgs): boolean {
  const norm = (s: string | undefined) => (s || "").trim().toLowerCase();
  const key = norm(siteName);
  if (!key) return false;
  if (clients.some(c => norm(c.name) === key)) return false;
  if (contacts.some(c => norm(c.name) === key)) return false;
  return true;
}

// ── Inventory deduction ──────────────────────────────────────────────────────

export interface DeductInventoryArgs {
  inventory: Inventory[];
  /** Line items from the requisition (z.array(z.any()) — minimal duck-typing). */
  items: { name?: string; qty?: number | string }[];
}

export interface InventoryDeductionResult {
  inventory: Inventory[];
  /** Per-item outcome — useful for surfacing "out of stock" warnings post-deduct. */
  shortfalls: { item: string; requested: number; available: number; deducted: number }[];
}

/**
 * Apply a requisition's quantities against inventory, clamping each line at
 * 0 (the system doesn't go negative — over-pull is recorded as a shortfall
 * so the UI can warn but the deduction still proceeds). Item matching is
 * case-insensitive on `item` ↔ `name`. Items not in inventory are silently
 * skipped (not all line items are stocked centrally).
 *
 * Pure — caller is responsible for persisting `inventory` to state +
 * Supabase and for handling shortfalls (e.g. emitting a warning toast).
 */
export function deductInventory({ inventory, items }: DeductInventoryArgs): InventoryDeductionResult {
  const updated: Inventory[] = inventory.map(i => ({ ...i }));
  const shortfalls: InventoryDeductionResult["shortfalls"] = [];
  const norm = (s: string | undefined) => (s || "").toLowerCase();

  for (const item of items) {
    const qty = n(item.qty);
    if (qty <= 0) continue;
    const idx = updated.findIndex(i => norm(i.item) === norm(item.name));
    if (idx < 0) continue; // not stocked centrally — skip
    const available = n(updated[idx].qty);
    const deducted = Math.min(available, qty);
    updated[idx] = { ...updated[idx], qty: Math.max(0, available - qty) } as Inventory;
    if (qty > available) {
      shortfalls.push({
        item: item.name || "",
        requested: qty,
        available,
        deducted,
      });
    }
  }

  return { inventory: updated, shortfalls };
}
