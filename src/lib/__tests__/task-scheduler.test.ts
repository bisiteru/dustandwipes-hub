// Tests for the recurring-task materializer in lib/task-scheduler.ts.
//
// Same shape as the job-auto-scheduler tests: pinned clock, helper factories,
// invariants stated as test names so failures point right at the broken rule.

import { computeRecurringTasks } from "../task-scheduler";
import type { Task, TaskTemplate } from "../schemas";

// 2026-05-13 is a Wednesday — Monday of that ISO week is 2026-05-11.
// Use local-Date construction so the test is TZ-independent: mondayOf reads
// local Y/M/D, and a Z-suffixed ISO string would shift the local date for
// users in UTC- offsets.
const FIXED_NOW = new Date(2026, 4, 13, 9, 0, 0); // May 13 2026 09:00 local
const THIS_MONDAY = "2026-05-11";

function tpl(over: Partial<TaskTemplate> = {}): TaskTemplate {
  return {
    id: "tpl-1",
    title: "Weekly site walk",
    description: "Visit Acme HQ + log condition",
    assignee: "Adebayo",
    assigneeRole: "Supervisor",
    priority: "Normal",
    dueDayOfWeek: "Mon",
    startDate: "",
    endDate: "",
    active: true,
    createdBy: "Bola",
    createdAt: "2026-04-01T00:00:00.000Z",
    ...over,
  } as TaskTemplate;
}

describe("computeRecurringTasks", () => {
  it("returns empty when no templates exist", () => {
    expect(computeRecurringTasks({ templates: [], tasks: [], now: FIXED_NOW })).toEqual([]);
  });

  it("emits one Task per active template, anchored to this week's Monday", () => {
    const out = computeRecurringTasks({
      templates: [tpl()],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "task-tmpl-tpl-1-2026-05-11",
      title: "Weekly site walk",
      assignee: "Adebayo",
      weekOf: THIS_MONDAY,
      dueDate: "2026-05-11",      // Mon offset
      status: "Pending",
      templateId: "tpl-1",
      createdBy: "system (recurring)",
    });
  });

  it("dueDayOfWeek shifts the dueDate within the week", () => {
    // Wed offset = 2 → 2026-05-13
    const out = computeRecurringTasks({
      templates: [tpl({ dueDayOfWeek: "Wed" })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out[0].dueDate).toBe("2026-05-13");
  });

  it("Fri offset lands on Friday of the same week", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ dueDayOfWeek: "Fri" })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out[0].dueDate).toBe("2026-05-15");
  });

  it("skips active=false templates", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ active: false })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toEqual([]);
  });

  it("skips templates whose startDate is in the future", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ startDate: "2026-06-01" })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toEqual([]);
  });

  it("skips templates whose endDate has passed", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ endDate: "2026-04-01" })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toEqual([]);
  });

  it("is idempotent — re-running with the prior output already in tasks adds nothing", () => {
    // Critical invariant. The React effect runs on every Dashboard mount;
    // it MUST NOT create duplicates each time the user navigates away and
    // back, or when the page reloads mid-week.
    const first = computeRecurringTasks({ templates: [tpl()], tasks: [], now: FIXED_NOW });
    expect(first).toHaveLength(1);
    const persisted: Task[] = [first[0]];
    const second = computeRecurringTasks({ templates: [tpl()], tasks: persisted, now: FIXED_NOW });
    expect(second).toEqual([]);
  });

  it("materializes a new instance the following week even if last week's exists", () => {
    // Next week's Monday is 2026-05-18.
    const lastWeek: Task = {
      ...computeRecurringTasks({ templates: [tpl()], tasks: [], now: FIXED_NOW })[0],
    };
    const nextWeekDate = new Date(2026, 4, 20, 9, 0, 0); // May 20 2026 09:00 local
    const out = computeRecurringTasks({
      templates: [tpl()],
      tasks: [lastWeek],
      now: nextWeekDate,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("task-tmpl-tpl-1-2026-05-18");
    expect(out[0].weekOf).toBe("2026-05-18");
  });

  it("processes multiple templates independently", () => {
    const out = computeRecurringTasks({
      templates: [
        tpl({ id: "a", title: "A", assignee: "Adebayo" }),
        tpl({ id: "b", title: "B", assignee: "Chinedu", dueDayOfWeek: "Fri" }),
        tpl({ id: "c", title: "C", active: false }), // skipped
      ],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toHaveLength(2);
    expect(out.map(t => t.title).sort()).toEqual(["A", "B"]);
  });

  it("skips templates with no title (can't materialize a nameless task)", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ title: "" as any })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out).toEqual([]);
  });

  it("defaults dueDayOfWeek to Mon when missing", () => {
    const out = computeRecurringTasks({
      templates: [tpl({ dueDayOfWeek: "" })],
      tasks: [],
      now: FIXED_NOW,
    });
    expect(out[0].dueDate).toBe("2026-05-11");
  });
});
