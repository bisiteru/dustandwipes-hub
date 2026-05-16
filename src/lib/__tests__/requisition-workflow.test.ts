// Tests for the requisition approval state machine in
// lib/requisition-workflow.ts.
//
// Three concerns covered:
//   1. State-machine transitions (canTransition + applyTransition)
//   2. Auto-contact decision on approval
//   3. Inventory deduction on "Forward & Deduct Stock"

import {
  canTransition,
  applyTransition,
  shouldAutoSaveContact,
  deductInventory,
} from "../requisition-workflow";
import type { Requisition, Inventory } from "../schemas";

// ── Helpers ──────────────────────────────────────────────────────────────────

function req(over: Partial<Requisition> = {}): Requisition {
  return {
    id: "req1",
    site: "Acme Office",
    month: 4, // May (0-indexed)
    year: 2026,
    budgetCap: 100000,
    submittedBy: "Bola",
    status: "Pending",
    items: [],
    reviewedBy: "",
    reviewedAt: "",
    ...over,
  } as Requisition;
}

function inv(item: string, qty: number, over: Partial<Inventory> = {}): Inventory {
  return {
    id: `inv-${item}`,
    item,
    cat: "Cleaning",
    unit: "bottle",
    qty,
    reorder: 0,
    cost: 0,
    ...over,
  } as Inventory;
}

// ── canTransition ────────────────────────────────────────────────────────────

describe("canTransition", () => {
  it("Pending → Approved/Rejected are allowed", () => {
    expect(canTransition("Pending", "Approved")).toBe(true);
    expect(canTransition("Pending", "Rejected")).toBe(true);
  });

  it("Pending → Forwarded is NOT allowed (must approve first)", () => {
    expect(canTransition("Pending", "Forwarded")).toBe(false);
  });

  it("Approved → Forwarded is allowed", () => {
    expect(canTransition("Approved", "Forwarded")).toBe(true);
  });

  it("Approved → Rejected is NOT allowed (no reversal after approval)", () => {
    // Once approved, the supervisor has committed. Rejecting after approval
    // would create accounting ambiguity around inventory deduction state.
    expect(canTransition("Approved", "Rejected")).toBe(false);
  });

  it("Rejected and Forwarded are terminal", () => {
    expect(canTransition("Rejected", "Approved")).toBe(false);
    expect(canTransition("Rejected", "Forwarded")).toBe(false);
    expect(canTransition("Forwarded", "Approved")).toBe(false);
    expect(canTransition("Forwarded", "Rejected")).toBe(false);
  });

  it("self-transitions are rejected (no no-op double-clicks overwrite reviewer)", () => {
    // Without this, double-clicking Approve would re-stamp reviewedBy with
    // a stale value or wrong reviewer in a multi-supervisor scenario.
    expect(canTransition("Pending", "Pending" as any)).toBe(false);
    expect(canTransition("Approved", "Approved" as any)).toBe(false);
  });

  it("falls back to Pending for empty/undefined `from`", () => {
    // Legacy rows from before the status field existed get treated as Pending.
    expect(canTransition(undefined, "Approved")).toBe(true);
    expect(canTransition("", "Approved")).toBe(true);
  });
});

// ── applyTransition ──────────────────────────────────────────────────────────

describe("applyTransition", () => {
  const FIXED_NOW = new Date("2026-05-16T14:30:00.000Z");

  it("returns the SAME reference when the transition is illegal", () => {
    // Identity-equality is the page's "no-op" signal — skips dbSync + toast.
    const r = req({ status: "Forwarded" });
    const result = applyTransition({ req: r, to: "Approved", reviewerName: "Adam", now: FIXED_NOW });
    expect(result).toBe(r);
  });

  it("Pending → Approved stamps reviewedBy and reviewedAt", () => {
    const r = req({ status: "Pending" });
    const result = applyTransition({ req: r, to: "Approved", reviewerName: "Adam", now: FIXED_NOW });
    expect(result).not.toBe(r); // new object
    expect(result.status).toBe("Approved");
    expect(result.reviewedBy).toBe("Adam");
    expect(result.reviewedAt).toMatch(/16\/05\/2026/); // en-GB format day/month/year
  });

  it("preserves every other field unchanged", () => {
    const r = req({ status: "Pending", site: "Acme", budgetCap: 999, submittedBy: "Bola" });
    const result = applyTransition({ req: r, to: "Rejected", reviewerName: "Adam", now: FIXED_NOW });
    expect(result.site).toBe("Acme");
    expect(result.budgetCap).toBe(999);
    expect(result.submittedBy).toBe("Bola");
    expect(result.status).toBe("Rejected");
  });

  it("Approved → Forwarded works", () => {
    const r = req({ status: "Approved", reviewedBy: "Adam" });
    const result = applyTransition({ req: r, to: "Forwarded", reviewerName: "Beth", now: FIXED_NOW });
    expect(result.status).toBe("Forwarded");
    expect(result.reviewedBy).toBe("Beth"); // overwritten to the forwarder
  });
});

// ── shouldAutoSaveContact ────────────────────────────────────────────────────

describe("shouldAutoSaveContact", () => {
  it("returns true when the site is not in clients or contacts", () => {
    expect(shouldAutoSaveContact({
      siteName: "New Acme",
      clients: [{ name: "Beta" }],
      contacts: [{ name: "Gamma" }],
    })).toBe(true);
  });

  it("returns false when the site matches an existing client (case-insensitive)", () => {
    expect(shouldAutoSaveContact({
      siteName: "ACME OFFICE",
      clients: [{ name: "Acme Office" }],
      contacts: [],
    })).toBe(false);
  });

  it("returns false when the site matches an existing contact", () => {
    expect(shouldAutoSaveContact({
      siteName: "Acme Office",
      clients: [],
      contacts: [{ name: "acme office" }],
    })).toBe(false);
  });

  it("returns false for empty site name", () => {
    expect(shouldAutoSaveContact({ siteName: "", clients: [], contacts: [] })).toBe(false);
    expect(shouldAutoSaveContact({ siteName: "   ", clients: [], contacts: [] })).toBe(false);
  });

  it("trims whitespace before comparing (avoids duplicate-with-trailing-space)", () => {
    expect(shouldAutoSaveContact({
      siteName: "Acme Office  ",
      clients: [{ name: "Acme Office" }],
      contacts: [],
    })).toBe(false);
  });
});

// ── deductInventory ──────────────────────────────────────────────────────────

describe("deductInventory", () => {
  it("subtracts requested qty from matching inventory items", () => {
    const inventory = [inv("Bleach", 100), inv("Mop", 20)];
    const result = deductInventory({
      inventory,
      items: [
        { name: "Bleach", qty: 30 },
        { name: "Mop", qty: 5 },
      ],
    });
    expect(result.inventory.find(i => i.item === "Bleach")!.qty).toBe(70);
    expect(result.inventory.find(i => i.item === "Mop")!.qty).toBe(15);
    expect(result.shortfalls).toEqual([]);
  });

  it("does not mutate the input inventory array", () => {
    // Pure-function contract: caller can keep referencing the old array.
    const inventory = [inv("Bleach", 100)];
    const before = inventory[0].qty;
    deductInventory({ inventory, items: [{ name: "Bleach", qty: 30 }] });
    expect(inventory[0].qty).toBe(before);
  });

  it("matches item names case-insensitively", () => {
    const inventory = [inv("Bleach", 100)];
    const result = deductInventory({
      inventory,
      items: [{ name: "BLEACH", qty: 25 }],
    });
    expect(result.inventory[0].qty).toBe(75);
  });

  it("clamps to 0 when requested exceeds available, and records the shortfall", () => {
    // The UI deducts and warns; it doesn't go negative because inventory.qty
    // is the source of truth for "what's on the shelf right now."
    const inventory = [inv("Bleach", 10)];
    const result = deductInventory({
      inventory,
      items: [{ name: "Bleach", qty: 25 }],
    });
    expect(result.inventory[0].qty).toBe(0);
    expect(result.shortfalls).toEqual([
      { item: "Bleach", requested: 25, available: 10, deducted: 10 },
    ]);
  });

  it("silently skips items not present in inventory (not centrally stocked)", () => {
    const inventory = [inv("Bleach", 100)];
    const result = deductInventory({
      inventory,
      items: [
        { name: "Bleach", qty: 10 },
        { name: "Specialty Solvent", qty: 5 }, // not stocked
      ],
    });
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0].qty).toBe(90);
    expect(result.shortfalls).toEqual([]); // not a shortfall — just unknown
  });

  it("ignores zero-qty and negative-qty line items", () => {
    // Items present in a requisition draft but with qty=0 shouldn't touch
    // inventory. Negative-qty is malformed data; treat same as zero.
    const inventory = [inv("Bleach", 100)];
    const result = deductInventory({
      inventory,
      items: [
        { name: "Bleach", qty: 0 },
        { name: "Bleach", qty: -5 } as any,
      ],
    });
    expect(result.inventory[0].qty).toBe(100);
  });

  it("coerces stringified qty defensively", () => {
    // Same money-bug class as Imprest: a stringified qty from a legacy row
    // would coerce to NaN under naive math. `n(v) = Number(v) || 0` keeps it
    // numeric end-to-end.
    const inventory = [inv("Bleach", 100)];
    const result = deductInventory({
      inventory,
      items: [{ name: "Bleach", qty: "30" as any }],
    });
    expect(result.inventory[0].qty).toBe(70);
  });

  it("processes multiple draws against the same item", () => {
    // Two line items for the same product (rare but possible) — both deduct.
    const inventory = [inv("Bleach", 100)];
    const result = deductInventory({
      inventory,
      items: [
        { name: "Bleach", qty: 30 },
        { name: "Bleach", qty: 20 },
      ],
    });
    expect(result.inventory[0].qty).toBe(50);
  });
});
