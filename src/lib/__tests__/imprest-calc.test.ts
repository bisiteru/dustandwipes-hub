// Tests for the imprest fund pure-calc helpers in lib/imprest-calc.ts.
//
// The imprest path is the origin story of this repo's Zod migration — a
// stringified amount + naive `+` reducer once produced a ₦228-quadrillion
// portfolio total. These tests pin down the defensive coercion AND the
// carry-forward business rules so neither can silently regress.

import {
  sumExpenses,
  sumTopups,
  balanceOf,
  monthKeyOf,
  getPrevBal,
  computeCarryForward,
} from "../imprest-calc";
import type { Imprest } from "../schemas";

// ── Helpers ──────────────────────────────────────────────────────────────────

function imp(over: Partial<Imprest> = {}): Imprest {
  return {
    id: "imp1",
    title: "Default",
    holder: "Adebayo",
    fundType: "Petty Cash",
    branch: "HQ",
    month: "2026-05",
    amount: 100000,
    originalAmount: 100000,
    releaseDate: "2026-05-01",
    deadline: "",
    purpose: "",
    status: "Active",
    expenses: [],
    topups: [],
    isCarryForward: false,
    carryForwardAmount: 0,
    carriedFrom: "",
    closedPeriod: "",
    ...over,
  } as Imprest;
}

// ── sumExpenses / sumTopups ──────────────────────────────────────────────────

describe("sumExpenses / sumTopups", () => {
  it("returns 0 for undefined or empty array", () => {
    expect(sumExpenses(undefined)).toBe(0);
    expect(sumExpenses([])).toBe(0);
    expect(sumTopups(undefined)).toBe(0);
    expect(sumTopups([])).toBe(0);
  });

  it("sums numeric amounts", () => {
    expect(sumExpenses([{ amount: 100 }, { amount: 200 }, { amount: 50 }])).toBe(350);
    expect(sumTopups([{ amount: 1000 }, { amount: 500 }])).toBe(1500);
  });

  it("coerces stringified amounts (the original ₦228Q bug class)", () => {
    // If a legacy or queue-replayed row has "100" instead of 100, the naive
    // `+` reducer in plain JS would coerce to string concatenation:
    //   0 + "100" + "200" + "50" → "0100200" (then NaN on further math)
    // The defensive `Number() || 0` wrap keeps this honest.
    expect(sumExpenses([{ amount: "100" }, { amount: "200" }, { amount: "50" }] as any))
      .toBe(350);
  });

  it("treats malformed entries (null amount, missing, NaN-string) as 0", () => {
    expect(sumExpenses([
      { amount: 100 },
      { amount: null } as any,
      { amount: "not-a-number" } as any,
      {} as any,
      { amount: 50 },
    ])).toBe(150);
  });

  it("does not throw on null entry inside the list", () => {
    // The runtime sees this in offline-queue replays where a malformed row
    // got into the JSON blob. Function should swallow gracefully.
    expect(sumExpenses([{ amount: 100 }, null as any, { amount: 50 }])).toBe(150);
  });
});

// ── balanceOf ────────────────────────────────────────────────────────────────

describe("balanceOf", () => {
  it("amount minus total expenses", () => {
    const i = imp({ amount: 100000, expenses: [{ amount: 30000 }, { amount: 20000 }] });
    expect(balanceOf(i)).toBe(50000);
  });

  it("returns 0 for null/undefined input", () => {
    expect(balanceOf(undefined)).toBe(0);
    expect(balanceOf(null)).toBe(0);
  });

  it("returns negative when over-spent (intentional — surface a warning, don't hide)", () => {
    // Some pages clamp to 0; balanceOf reports the truth so the UI can show
    // "₦ -10,000 over-spent" badges. The clamping happens in getPrevBal.
    const i = imp({ amount: 100000, expenses: [{ amount: 150000 }] });
    expect(balanceOf(i)).toBe(-50000);
  });

  it("handles stringified amount (Zod boundary bypass safety net)", () => {
    const i = imp({ amount: "75000" as any, expenses: [{ amount: "25000" } as any] });
    expect(balanceOf(i)).toBe(50000);
  });
});

// ── monthKeyOf ───────────────────────────────────────────────────────────────

describe("monthKeyOf", () => {
  it("prefers explicit month over releaseDate", () => {
    const i = imp({ month: "2026-05", releaseDate: "2026-03-15" });
    expect(monthKeyOf(i, "2026-01")).toBe("2026-05");
  });

  it("falls back to releaseDate YYYY-MM prefix when month missing", () => {
    const i = imp({ month: "", releaseDate: "2026-03-15" });
    expect(monthKeyOf(i, "2026-01")).toBe("2026-03");
  });

  it("falls back to the provided default when both are missing", () => {
    const i = imp({ month: "", releaseDate: "" });
    expect(monthKeyOf(i, "2026-01")).toBe("2026-01");
  });
});

// ── getPrevBal ───────────────────────────────────────────────────────────────

describe("getPrevBal", () => {
  it("returns 0 when the holder has no prior records", () => {
    expect(getPrevBal([], "Adebayo", "2026-05")).toBe(0);
    const records = [imp({ holder: "Chinedu", month: "2026-04", amount: 50000 })];
    expect(getPrevBal(records, "Adebayo", "2026-05")).toBe(0);
  });

  it("uses the most-recent prior month, not the deepest in history", () => {
    const records = [
      imp({ id: "old", holder: "Adebayo", month: "2026-02", amount: 100000, expenses: [{ amount: 10000 }] }), // bal 90k
      imp({ id: "mid", holder: "Adebayo", month: "2026-03", amount: 100000, expenses: [{ amount: 30000 }] }), // bal 70k
      imp({ id: "lat", holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 60000 }] }), // bal 40k ← this one
    ];
    expect(getPrevBal(records, "Adebayo", "2026-05")).toBe(40000);
  });

  it("excludes records from the same target month (strictly less than)", () => {
    // Otherwise opening May would carry forward May itself — infinite loop on
    // the carry-forward modal pre-fill.
    const records = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 60000 }] }),
      imp({ holder: "Adebayo", month: "2026-05", amount: 50000, expenses: [{ amount: 10000 }] }),
    ];
    expect(getPrevBal(records, "Adebayo", "2026-05")).toBe(40000); // from April, not May
  });

  it("clamps over-spend to zero (no negative carry-forward as 'credit')", () => {
    // The UI shows over-spend warnings on the prior month; the next month
    // starts fresh at 0. Carrying a negative balance forward would let a
    // supervisor "owe" the system money via the imprest mechanism — wrong.
    const records = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 150000 }] }),
    ];
    expect(getPrevBal(records, "Adebayo", "2026-05")).toBe(0);
  });

  it("filters by holder name strictly", () => {
    const records = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 20000 }] }),
      imp({ holder: "Chinedu", month: "2026-04", amount: 200000, expenses: [{ amount: 50000 }] }),
    ];
    expect(getPrevBal(records, "Adebayo", "2026-05")).toBe(80000);
    expect(getPrevBal(records, "Chinedu", "2026-05")).toBe(150000);
  });
});

// ── computeCarryForward ──────────────────────────────────────────────────────

describe("computeCarryForward", () => {
  const fixedId = (idx: number) => `cf-${idx}`;

  it("returns empty array when no records exist in the source month", () => {
    expect(
      computeCarryForward({ imprests: [], fromMK: "2026-04", toMK: "2026-05", idGen: fixedId })
    ).toEqual([]);
  });

  it("emits one new record per unique holder from the source month", () => {
    const imprests = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 30000 }] }),
      imp({ holder: "Chinedu", month: "2026-04", amount: 200000, expenses: [{ amount: 50000 }] }),
      imp({ holder: "Adebayo", month: "2026-04", amount: 50000,  expenses: [{ amount: 10000 }] }), // 2nd account, same holder
    ];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out).toHaveLength(2);
    expect(out.map(o => o.holder).sort()).toEqual(["Adebayo", "Chinedu"]);
  });

  it("pre-fills carry-forward amount as the holder's prior closing balance", () => {
    const imprests = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 30000 }] }), // bal 70k
    ];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].amount).toBe(70000);
    expect(out[0].originalAmount).toBe(70000);
    expect(out[0].carryForwardAmount).toBe(70000);
    expect(out[0].isCarryForward).toBe(true);
    expect(out[0].carriedFrom).toBe("2026-04");
  });

  it("over-spent holders get a zero carry-forward, not a negative one", () => {
    // Pairs with the getPrevBal clamp test. The new month should start clean.
    const imprests = [
      imp({ holder: "Adebayo", month: "2026-04", amount: 100000, expenses: [{ amount: 150000 }] }),
    ];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].amount).toBe(0);
    expect(out[0].carryForwardAmount).toBe(0);
  });

  it("title is rendered as 'Holder — Month YYYY'", () => {
    const imprests = [imp({ holder: "Adebayo", month: "2026-04", amount: 50000 })];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].title).toBe("Adebayo — May 2026");
  });

  it("uses the injected idGen for deterministic IDs", () => {
    const imprests = [
      imp({ holder: "Adebayo", month: "2026-04" }),
      imp({ holder: "Chinedu", month: "2026-04" }),
    ];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    // Order depends on Set insertion order which depends on the filter pass —
    // we just verify the IDs come from idGen, not Date.now().
    expect(out.map(o => o.id).sort()).toEqual(["cf-0", "cf-1"]);
  });

  it("releaseDate is the first of the destination month", () => {
    const imprests = [imp({ holder: "Adebayo", month: "2026-04" })];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].releaseDate).toBe("2026-05-01");
  });

  it("inherits fundType and branch from the holder's source-month record", () => {
    const imprests = [imp({ holder: "Adebayo", month: "2026-04", fundType: "Special", branch: "Ikoyi" })];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].fundType).toBe("Special");
    expect(out[0].branch).toBe("Ikoyi");
  });

  it("resets expenses and topups for the carry-forward record", () => {
    // Prior period's transactions stay on the prior record; the new month
    // starts with a clean ledger. Without this reset, the UI would show
    // prior-month spending against the carry-forward amount, doubling history.
    const imprests = [imp({
      holder: "Adebayo", month: "2026-04",
      expenses: [{ amount: 1000 }, { amount: 2000 }],
      topups: [{ amount: 5000 }],
    })];
    const out = computeCarryForward({ imprests, fromMK: "2026-04", toMK: "2026-05", idGen: fixedId });
    expect(out[0].expenses).toEqual([]);
    expect(out[0].topups).toEqual([]);
  });
});
