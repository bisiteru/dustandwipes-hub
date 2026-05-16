// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Auto-scheduler (pure logic)
//
//  Extracted from App.tsx so it can be unit-tested in isolation. Given a list
//  of clients and existing jobs (and a clock), returns the set of auto-jobs
//  that should be added — without touching React state, Supabase, or the DOM.
//
//  The original `useEffect` in App.tsx now just calls `computeAutoJobs(...)`
//  and pipes the result into `setJobs` + `dbSync`. The dedup invariants — no
//  duplicate auto-ID, no ±3-day overlap with any non-Closed job — live here.
// ─────────────────────────────────────────────────────────────────────────────

import type { Client, Job } from "./schemas";
import { FREQ_DAYS } from "./constants";

export interface ComputeAutoJobsArgs {
  clients: Client[];
  jobs: Job[];
  /** Defaults to `new Date()` — injectable so tests can pin the clock. */
  now?: Date;
  /** How many days ahead to schedule. Defaults to 14. */
  lookaheadDays?: number;
  /** ± window in days to consider an existing job as "covering" the slot. Defaults to 3. */
  coverWindowDays?: number;
}

/**
 * Compute the auto-scheduled jobs that should be added given the current
 * clients + jobs state. Pure — no side effects, deterministic for a fixed
 * clock. Caller is responsible for applying the result to React state and
 * persisting to Supabase.
 *
 * Invariants:
 * - Auto-job IDs are deterministic: `auto-{clientId}-{YYYY-MM-DD}` so re-runs
 *   never produce duplicates.
 * - Skip if an identical auto-ID already exists in `jobs`.
 * - Skip if any non-Closed job for the same client already covers a window
 *   `[nextDue - coverWindowDays, nextDue]` — prevents over-scheduling when
 *   the user manually created an upcoming job.
 * - Skip clients whose contract end date (`ce`) has passed.
 * - Skip clients with no `serviceFreq` or with a freq not in FREQ_DAYS
 *   (e.g. "One-Time").
 */
export function computeAutoJobs({
  clients,
  jobs,
  now = new Date(),
  lookaheadDays = 14,
  coverWindowDays = 3,
}: ComputeAutoJobsArgs): Partial<Job>[] {
  const todayStr = now.toISOString().split("T")[0];
  const today = new Date(todayStr);
  const out: Partial<Job>[] = [];
  const seen = new Set<string>(); // dedup within this batch too

  for (const client of clients) {
    const freq = client.serviceFreq;
    if (!freq || !FREQ_DAYS[freq]) continue;
    const expiry = client.ce ? new Date(client.ce) : null;
    if (expiry && expiry < today) continue;
    const freqDays = FREQ_DAYS[freq]!;

    // Last job for this client, most-recent first
    const clientJobs = jobs
      .filter(j => j.clientName === client.name && j.date)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    let nextDue = new Date(today);
    if (clientJobs.length > 0) {
      const lastDate = new Date(clientJobs[0].date!);
      nextDue = new Date(lastDate);
      nextDue.setDate(nextDue.getDate() + freqDays);
    }
    // Overdue → bring forward to today; too far future → skip.
    if (nextDue < today) nextDue = new Date(today);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + lookaheadDays);
    if (nextDue > windowEnd) continue;

    const nextDueStr = nextDue.toISOString().split("T")[0];
    const autoId = `auto-${client.id}-${nextDueStr}`;

    // Already exists OR already queued in this batch
    if (jobs.some(j => j.id === autoId) || seen.has(autoId)) continue;

    // ± window check — skip if a non-Closed job already covers the slot
    const winStart = new Date(nextDue);
    winStart.setDate(winStart.getDate() - coverWindowDays);
    const winStartStr = winStart.toISOString().split("T")[0];
    const covered = jobs.some(
      j => j.clientName === client.name &&
           j.date && j.date >= winStartStr && j.date <= nextDueStr &&
           j.status !== "Closed"
    );
    if (covered) continue;

    seen.add(autoId);
    out.push({
      id: autoId,
      clientName: client.name,
      clientPhone: client.phone || "",
      loc: client.addr || "",
      svc: client.svc || "Cleaning",
      date: nextDueStr,
      sup: "",
      techs: "",
      status: "Scheduled",
      notes: `Auto-scheduled (${freq})`,
      autoScheduled: true,
      checkIn: null,
      checkOut: null,
    });
  }

  return out;
}
