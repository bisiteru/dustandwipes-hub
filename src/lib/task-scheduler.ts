// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Recurring task materializer
//
//  Pure logic for expanding TaskTemplate definitions into concrete Task rows,
//  one per active template per ISO week. Same shape as `lib/scheduler.ts`
//  (the recurring-job auto-scheduler) — the React effect just calls the pure
//  function and persists the result.
//
//  Idempotent: deterministic IDs (`task-tmpl-{templateId}-{weekOf}`) mean
//  re-running on the same Monday produces no duplicates. Safe to invoke from
//  app boot every load.
// ─────────────────────────────────────────────────────────────────────────────

import type { Task, TaskTemplate } from "./schemas";
import { mondayOf } from "../pages/Tasks";

const DAY_INDEX: Record<string, number> = {
  "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6,
};

/**
 * ISO YYYY-MM-DD of `monday` + `dayOffset` days. Operates on local-time
 * components throughout (mondayOf above is timezone-safe; we keep the same
 * convention here) so the dueDate lines up with what the user sees in their
 * date pickers.
 */
function dateOf(mondayISO: string, dayOffset: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mondayISO)) return mondayISO;
  const [y, m, d] = mondayISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + dayOffset);
  if (isNaN(dt.getTime())) return mondayISO;
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export interface ComputeRecurringTasksArgs {
  templates: TaskTemplate[];
  /** Existing tasks — used for dedup via deterministic id. */
  tasks: Task[];
  /** Defaults to `new Date()`. Injected for test determinism. */
  now?: Date;
}

/**
 * Materialize task instances for the current ISO week. For each active
 * template:
 *  - Compute `weekOf` = Monday of the week containing `now`.
 *  - Skip templates not active (`active === false`).
 *  - Skip templates outside their start/end window.
 *  - Compute `dueDate` from `weekOf + dueDayOfWeek` (defaults to Mon).
 *  - Skip if a task with the deterministic id already exists.
 *  - Emit a Task with the template's title/description/assignee/etc.
 *
 * Returns the array of NEW Tasks to insert. Caller persists them via
 * setTasks + dbSync.
 */
export function computeRecurringTasks({
  templates,
  tasks,
  now = new Date(),
}: ComputeRecurringTasksArgs): Task[] {
  const weekOf = mondayOf(now);
  const todayISO = now.toISOString().slice(0, 10);
  const existingIds = new Set(tasks.map(t => String(t.id)));
  const out: Task[] = [];

  for (const tpl of templates) {
    if (tpl.active === false) continue;
    if (tpl.startDate && tpl.startDate > todayISO) continue;
    if (tpl.endDate && tpl.endDate < todayISO) continue;
    if (!tpl.title) continue; // can't materialize a nameless task

    const dayKey = (tpl.dueDayOfWeek || "Mon").slice(0, 3) as keyof typeof DAY_INDEX;
    const offset = DAY_INDEX[dayKey] ?? 0;
    const dueDate = dateOf(weekOf, offset);

    const id = `task-tmpl-${tpl.id}-${weekOf}`;
    if (existingIds.has(id)) continue;

    out.push({
      id,
      title: tpl.title,
      description: tpl.description || "",
      assignee: tpl.assignee || "",
      assigneeRole: tpl.assigneeRole || "",
      priority: tpl.priority || "Normal",
      status: "Pending",
      dueDate,
      weekOf,
      createdBy: "system (recurring)",
      createdAt: now.toISOString(),
      completedAt: "",
      templateId: String(tpl.id),
    } as Task);
  }

  return out;
}
