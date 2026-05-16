// Tests for the auto-scheduler in lib/scheduler.ts.
//
// The auto-scheduler is the gnarliest piece of logic in the app: it walks
// every active client, projects a "next due" date based on serviceFreq, and
// only emits an auto-job if no existing job already covers a ±3-day window.
// Wrong logic here means either missed services (under-scheduling) or
// duplicate jobs cluttering the calendar (over-scheduling).
//
// Clock is pinned to 2026-05-15 for every test.

import { computeAutoJobs } from "../scheduler";
import type { Client, Job } from "../schemas";

const FIXED_NOW = new Date("2026-05-15T08:00:00.000Z");

// Helpers — accept Partial so each test only specifies what matters.
function makeClient(over: Partial<Client> = {}): Client {
  return {
    id: "c1",
    name: "Acme Office",
    serviceFreq: "Weekly",
    phone: "0801",
    addr: "1 Main St",
    svc: "Cleaning",
    cs: "2025-01-01",
    ce: "2027-01-01",
    cat: "", cp: "", email: "", duty: "", status: "",
    sal: 0, con: 0, sc: 0, vat: 0, tot: 0,
    cleaners: [],
    ...over,
  } as Client;
}

function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: "manual-1",
    clientName: "Acme Office",
    clientPhone: "0801",
    svc: "Cleaning",
    date: "2026-05-10",
    sup: "",
    techs: "",
    status: "Scheduled",
    notes: "",
    loc: "",
    createdAt: "",
    sourceRequestId: "",
    checkIn: null,
    checkOut: null,
    ...over,
  } as Job;
}

describe("computeAutoJobs", () => {
  it("returns no jobs when there are no clients", () => {
    expect(
      computeAutoJobs({ clients: [], jobs: [], now: FIXED_NOW })
    ).toEqual([]);
  });

  it("skips clients with no serviceFreq", () => {
    const c = makeClient({ serviceFreq: "" });
    expect(
      computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW })
    ).toEqual([]);
  });

  it("skips clients on One-Time service", () => {
    const c = makeClient({ serviceFreq: "One-Time" });
    expect(
      computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW })
    ).toEqual([]);
  });

  it("skips clients whose contract has expired", () => {
    const c = makeClient({ ce: "2026-04-01" }); // expired before FIXED_NOW
    expect(
      computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW })
    ).toEqual([]);
  });

  it("schedules a first job for a client with no prior jobs (Weekly → today)", () => {
    const c = makeClient({ serviceFreq: "Weekly" });
    const result = computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "auto-c1-2026-05-15",
      clientName: "Acme Office",
      date: "2026-05-15",
      status: "Scheduled",
      autoScheduled: true,
      notes: "Auto-scheduled (Weekly)",
    });
  });

  it("schedules next due date as last_job_date + freqDays (Weekly = 7)", () => {
    const c = makeClient({ serviceFreq: "Weekly" });
    // Last job was 2026-05-12 → next due is 2026-05-19 → within lookahead
    const j = makeJob({ date: "2026-05-12", status: "Closed" });
    const result = computeAutoJobs({ clients: [c], jobs: [j], now: FIXED_NOW });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-19");
    expect(result[0].id).toBe("auto-c1-2026-05-19");
  });

  it("brings overdue next-due forward to today", () => {
    const c = makeClient({ serviceFreq: "Weekly" });
    // Last job was 2026-04-01 → next due would be 2026-04-08 (long overdue).
    // Scheduler must clamp to today so the job is created at the earliest visible slot.
    const j = makeJob({ date: "2026-04-01", status: "Closed" });
    const result = computeAutoJobs({ clients: [c], jobs: [j], now: FIXED_NOW });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-15"); // today
  });

  it("skips when next-due is beyond the lookahead window", () => {
    const c = makeClient({ serviceFreq: "Quarterly" }); // 91 days
    // Last job 2026-05-10 → next due 2026-08-09 → far outside 14-day lookahead
    const j = makeJob({ date: "2026-05-10", status: "Closed" });
    const result = computeAutoJobs({ clients: [c], jobs: [j], now: FIXED_NOW });
    expect(result).toEqual([]);
  });

  it("is deterministic — same input twice produces the same output", () => {
    // The function is pure: repeating a call with identical inputs (clients,
    // jobs, now) must produce structurally identical output. This is the
    // safety net against the auto-scheduler being non-deterministic.
    const c = makeClient({ serviceFreq: "Weekly" });
    const a = computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW });
    const b = computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW });
    expect(a).toEqual(b);
  });

  it("once an auto-job is persisted, re-running advances to the next slot (one freqDays later)", () => {
    // After the effect ships its output into state, jobs[] gains the auto-row.
    // On the next run, that row is the most-recent job for the client and
    // becomes the anchor for nextDue. This is intentional: the scheduler
    // walks the calendar one slot at a time, not all at once.
    const c = makeClient({ serviceFreq: "Weekly" });
    const first = computeAutoJobs({ clients: [c], jobs: [], now: FIXED_NOW });
    expect(first).toHaveLength(1);
    expect(first[0].date).toBe("2026-05-15");

    const persisted: Job[] = [{ ...makeJob(), ...first[0] } as Job];
    const second = computeAutoJobs({ clients: [c], jobs: persisted, now: FIXED_NOW });
    // New slot 7 days later, within the 14-day lookahead → 1 new auto-job.
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe("auto-c1-2026-05-22");
  });

  it("Daily frequency: ±3-day cover window blocks adjacent non-closed jobs", () => {
    // When freqDays (1) <= coverWindow (3), the window check kicks in to
    // prevent the scheduler from piling auto-jobs daily on top of existing
    // manual work. The user can still keep their manual job; the auto
    // simply doesn't stack on. This is the case where the cover-window
    // dedup is actually load-bearing (for Weekly+ frequencies, clientJobs[0]
    // already places nextDue well outside the window).
    const c = makeClient({ serviceFreq: "Daily" });
    const manual = makeJob({ date: "2026-05-15", status: "Scheduled" });
    const result = computeAutoJobs({ clients: [c], jobs: [manual], now: FIXED_NOW });
    // clientJobs[0] = 2026-05-15 → nextDue = 2026-05-16
    // ±3 window [2026-05-13, 2026-05-16] → existing job 2026-05-15 falls inside → block
    expect(result).toEqual([]);
  });

  it("Daily frequency: a Closed job in the cover window does NOT block (status filter)", () => {
    // The cover check explicitly excludes Closed jobs — a completed service
    // shouldn't prevent the next scheduled one from being generated.
    const c = makeClient({ serviceFreq: "Daily" });
    const closed = makeJob({ date: "2026-05-15", status: "Closed" });
    const result = computeAutoJobs({ clients: [c], jobs: [closed], now: FIXED_NOW });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-16");
  });

  it("a Closed prior job still anchors nextDue (it counts as the most-recent service)", () => {
    // A Closed job is a completed service, so the next recurring slot must
    // count from when it happened — not from today. Without this, finishing
    // a job would push the schedule forward by an unintended amount.
    const c = makeClient({ serviceFreq: "Weekly" });
    const closed = makeJob({ id: "j-closed", date: "2026-05-13", status: "Closed" });
    const result = computeAutoJobs({ clients: [c], jobs: [closed], now: FIXED_NOW });
    // 2026-05-13 + 7 days = 2026-05-20
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-05-20");
  });

  it("processes multiple clients independently", () => {
    const c1 = makeClient({ id: "c1", name: "Acme", serviceFreq: "Weekly" });
    const c2 = makeClient({ id: "c2", name: "Beta", serviceFreq: "Bi-weekly" });
    const c3 = makeClient({ id: "c3", name: "Gamma", serviceFreq: "One-Time" });
    const result = computeAutoJobs({ clients: [c1, c2, c3], jobs: [], now: FIXED_NOW });
    // c1 + c2 both eligible for today; c3 skipped (One-Time)
    expect(result).toHaveLength(2);
    expect(result.map(j => j.clientName).sort()).toEqual(["Acme", "Beta"]);
  });

  it("dedup: same-client same-day duplicates are eliminated within a single run", () => {
    // Edge case: two client records with identical IDs (data-quality bug). The
    // scheduler should still only emit one auto-job for the deterministic ID.
    const c1 = makeClient({ id: "dup", name: "Same", serviceFreq: "Weekly" });
    const c2 = makeClient({ id: "dup", name: "Same", serviceFreq: "Weekly" });
    const result = computeAutoJobs({ clients: [c1, c2], jobs: [], now: FIXED_NOW });
    expect(result).toHaveLength(1);
  });

  it("custom lookaheadDays opens up further-out slots", () => {
    const c = makeClient({ serviceFreq: "Quarterly" });
    const j = makeJob({ date: "2026-05-10", status: "Closed" });
    // 91-day Quarterly → next due 2026-08-09 → outside default 14-day window,
    // but with a 120-day lookahead it should be eligible.
    const result = computeAutoJobs({ clients: [c], jobs: [j], now: FIXED_NOW, lookaheadDays: 120 });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-08-09");
  });
});
