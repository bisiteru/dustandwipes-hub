// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Tasks page (Phase 6 — workflow tooling)
//
//  Internal weekly work assignment system. Distinct from Jobs (client-facing
//  service appointments) and ServiceRequests (inbound). A Task is a piece of
//  internal work — "Inspect Site Acme", "Reconcile imprest fund", "Follow up
//  with Beta Office contact" — assigned to a named user.
//
//  The Dashboard's role-specific views read from the same `tasks` array and
//  filter to `assignee === currentUser.name`, so Monday-morning visibility
//  flows from a single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Edit2, Trash2, Check, ArrowRight, ListChecks, AlertCircle, Repeat } from "lucide-react";
import { G, O, RED, BLUE, AMBER, inp } from "../lib/constants";
import { fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Task, TaskTemplate, AppUser, Staff, CurrentUser } from "../lib/schemas";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Defensive numeric coerce — not used heavily here, but mirrors the
 *  discipline applied on the money pages. */
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
void n; // kept for forward use when priority weights or completion counts land

/**
 * Return the YYYY-MM-DD of the Monday of the week containing `d`.
 * Used to bucket tasks into weeks. ISO weeks (Mon-Sun) so Sat/Sun work
 * counts toward the just-ending week, not the upcoming one.
 *
 * Timezone-safe: operates on local date components throughout and emits
 * the result by formatting local Y/M/D rather than via `toISOString()`,
 * which would round-trip through UTC and silently shift the day by one
 * for users in any UTC+ offset (e.g. Nigeria, UTC+1).
 */
export function mondayOf(d: Date): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Pretty label for a Monday-YYYY-MM-DD: "Week of Mon 12 May". */
function weekLabel(monday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) return monday;
  const d = new Date(monday);
  if (isNaN(d.getTime())) return monday;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Week of Mon ${d.getDate()} ${months[d.getMonth()]}`;
}

type TaskStatus = "Pending" | "In Progress" | "Done" | "Cancelled";
type TaskPriority = "Low" | "Normal" | "High" | "Urgent";

const STATUS_STYLES: Record<TaskStatus, { bg: string; color: string; border: string }> = {
  "Pending":     { bg: "#fffbeb", color: AMBER,    border: "#fde68a" },
  "In Progress": { bg: "#eff6ff", color: BLUE,     border: "#bfdbfe" },
  "Done":        { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Cancelled":   { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
};

const PRIORITY_STYLES: Record<TaskPriority, { bg: string; color: string }> = {
  "Low":    { bg: "#f3f4f6", color: "#6b7280" },
  "Normal": { bg: "#eff6ff", color: BLUE },
  "High":   { bg: "#fff7ed", color: O },
  "Urgent": { bg: "#fee2e2", color: RED },
};

const nextStatus = (cur: TaskStatus): TaskStatus =>
  cur === "Pending" ? "In Progress" : cur === "In Progress" ? "Done" : cur;

// ── Component ────────────────────────────────────────────────────────────────

export interface TasksPageProps {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  /** Recurring-task templates — Phase 6/5. Admin/Supervisor manage these
   *  via the "Templates" tab; the auto-materializer in App.tsx expands
   *  them into concrete Task rows on Monday. */
  taskTemplates: TaskTemplate[];
  setTaskTemplates: Dispatch<SetStateAction<TaskTemplate[]>>;
  user: CurrentUser;
  users: AppUser[];
  staff: Staff[];
}

type TaskDraft = Partial<Task> & { type?: "new" | "edit" };
type TemplateDraft = Partial<TaskTemplate> & { type?: "new" | "edit" };

export function TasksPage({ tasks, setTasks, taskTemplates, setTaskTemplates, user, users, staff }: TasksPageProps) {
  const [modal, setModal] = useState<TaskDraft | null>(null);
  const [tmplModal, setTmplModal] = useState<TemplateDraft | null>(null);
  const [tab, setTab] = useState<"tasks" | "templates">("tasks");
  const [filterAssignee, setFilterAssignee] = useState<string>("All");
  const [filterWeek, setFilterWeek] = useState<string>("This Week");
  const [filterStatus, setFilterStatus] = useState<string>("Open");
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();

  const canManage = user.role === "Admin" || user.role === "Supervisor";
  const thisMonday = mondayOf(new Date());

  // Filtered list driven by the three filter rows above.
  const visible = useMemo<Task[]>(() => {
    return tasks.filter((t) => {
      if (filterAssignee !== "All" && (t.assignee || "") !== filterAssignee) return false;
      if (filterWeek === "This Week" && t.weekOf !== thisMonday) return false;
      if (filterStatus === "Open" && (t.status === "Done" || t.status === "Cancelled")) return false;
      if (filterStatus === "Done" && t.status !== "Done") return false;
      return true;
    });
  }, [tasks, filterAssignee, filterWeek, filterStatus, thisMonday]);

  // Group by assignee for the list rendering.
  const byAssignee = useMemo<Record<string, Task[]>>(() => {
    const out: Record<string, Task[]> = {};
    for (const t of visible) {
      const key = t.assignee || "Unassigned";
      (out[key] = out[key] || []).push(t);
    }
    return out;
  }, [visible]);

  // Pool of people who can be assigned. AppUsers (the people who log in)
  // come FIRST and are tagged with their role — that way the admin sees
  // "Adebayo Smith — Supervisor" in the dropdown and picks the same name
  // the user actually logs in with. Field-only Staff (no login) come after.
  //
  // Storing the name exactly as the AppUser logs in is the load-bearing
  // detail: the Dashboard filters by `sameName(t.assignee, user.name)`, so
  // an exact-name picker eliminates the whole class of "I assigned it but
  // they don't see it" bugs reported in Phase 6 feedback.
  interface AssigneeOption { name: string; label: string; }
  const assigneePool = useMemo<AssigneeOption[]>(() => {
    const seen = new Set<string>();
    const out: AssigneeOption[] = [];
    const norm = (s: string) => s.trim().toLowerCase();
    for (const u of users) {
      const n = String(u.name || "").trim();
      if (!n || seen.has(norm(n))) continue;
      seen.add(norm(n));
      out.push({ name: n, label: `${n} — ${u.role || "User"}` });
    }
    for (const s of staff) {
      const n = String(s.name || "").trim();
      if (!n || seen.has(norm(n))) continue;
      seen.add(norm(n));
      out.push({ name: n, label: `${n} — Staff` });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, staff]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveTask = (draft: TaskDraft): void => {
    if (!draft.title) {
      toast.info("Title is required");
      return;
    }
    const now = new Date().toISOString();
    const id = draft.id || `task${Date.now()}`;
    const monday = draft.weekOf || (draft.dueDate ? mondayOf(new Date(draft.dueDate)) : thisMonday);
    const next: Task = {
      ...(draft as Task),
      id,
      title: draft.title,
      status: draft.status || "Pending",
      priority: draft.priority || "Normal",
      weekOf: monday,
      dueDate: draft.dueDate || "",
      createdBy: draft.createdBy || user.name,
      createdAt: draft.createdAt || now,
    } as Task;
    const updated = draft.id
      ? tasks.map((t) => (t.id === id ? next : t))
      : [next, ...tasks];
    setTasks(updated);
    dbSync("tasks", updated, () => {
      toast.error("Task saved locally but failed to sync — check your connection");
    });
    toast.success(draft.id ? "Task updated" : "Task created");
    setModal(null);
  };

  // Shared onError for task status mutations — a failed sync means the local
  // status change won't survive a reload (dbLoad would return the pre-change
  // data), which is exactly the "tasks aren't saving" bug. Surface it.
  const syncErr = () => toast.error("Status change failed to sync — check your connection and retry");

  const advance = (id: string): void => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id
          ? ({
              ...t,
              status: nextStatus((t.status || "Pending") as TaskStatus),
              completedAt:
                nextStatus((t.status || "Pending") as TaskStatus) === "Done"
                  ? new Date().toISOString()
                  : t.completedAt || "",
            } as Task)
          : t,
      );
      dbSync("tasks", updated, syncErr);
      return updated;
    });
  };

  const completeNow = (id: string): void => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id
          ? ({ ...t, status: "Done", completedAt: new Date().toISOString() } as Task)
          : t,
      );
      dbSync("tasks", updated, syncErr);
      return updated;
    });
    toast.success("Task marked done");
  };

  const del = (id: string): void => {
    confirm("Delete this task?", () => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      dbDelete("tasks", id).catch(() => {});
      toast.success("Task deleted");
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {confirmEl}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <ListChecks size={16} style={{ color: G }} /> Weekly Tasks
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{weekLabel(thisMonday)} — system of record for "what's on people's plates"</p>
        </div>
        {canManage && tab === "tasks" && (
          <button
            onClick={() => setModal({ type: "new", weekOf: thisMonday, dueDate: thisMonday })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: G }}
          >
            <Plus size={14} /> New Task
          </button>
        )}
        {canManage && tab === "templates" && (
          <button
            onClick={() => setTmplModal({ type: "new", active: true, dueDayOfWeek: "Mon" })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: G }}
          >
            <Plus size={14} /> New Template
          </button>
        )}
      </div>

      {/* Tabs — Tasks list vs. recurring Templates */}
      {canManage && (
        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => setTab("tasks")}
            className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${tab === "tasks" ? "" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            style={tab === "tasks" ? { borderColor: G, color: G } : {}}
          >
            <ListChecks size={13} /> Tasks
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${tab === "templates" ? "" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            style={tab === "templates" ? { borderColor: G, color: G } : {}}
          >
            <Repeat size={13} /> Templates ({taskTemplates.length})
          </button>
        </div>
      )}

      {/* Filters (Tasks tab only) */}
      {tab === "tasks" && (<>
      <Card className="p-3">
        <div className="flex gap-3 flex-wrap text-xs">
          <select className={`${inp} py-1.5`} value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="All">All assignees</option>
            {assigneePool.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
              </option>
            ))}
          </select>
          <select className={`${inp} py-1.5`} value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}>
            <option value="This Week">This Week</option>
            <option value="All">All Weeks</option>
          </select>
          <select className={`${inp} py-1.5`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="Open">Open (Pending + In Progress)</option>
            <option value="All">All</option>
            <option value="Done">Done</option>
          </select>
          <span className="ml-auto text-gray-400">{visible.length} task{visible.length === 1 ? "" : "s"}</span>
        </div>
      </Card>

      {/* Groups */}
      {Object.keys(byAssignee).length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm text-gray-500">No tasks match these filters</p>
          {canManage && (
            <p className="text-xs text-gray-400 mt-1">
              Click <strong>New Task</strong> to assign one
            </p>
          )}
        </Card>
      ) : (
        Object.entries(byAssignee).map(([assignee, list]) => {
          const open = list.filter((t) => t.status !== "Done" && t.status !== "Cancelled").length;
          const done = list.filter((t) => t.status === "Done").length;
          return (
            <Card key={assignee} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">{assignee}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-bold text-white" style={{ background: AMBER }}>
                    {open} open
                  </span>
                  {done > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-bold text-white" style={{ background: G }}>
                      {done} done
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {list.map((t) => {
                  const status = (t.status || "Pending") as TaskStatus;
                  const priority = (t.priority || "Normal") as TaskPriority;
                  const isOverdue =
                    !!t.dueDate &&
                    status !== "Done" &&
                    status !== "Cancelled" &&
                    new Date(t.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                  return (
                    <div key={String(t.id)} className="flex items-start justify-between gap-3 py-3 hover:bg-gray-50/60">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${status === "Done" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {t.dueDate && (
                            <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                              {isOverdue && <AlertCircle size={10} className="inline mr-0.5" />}
                              Due {fmtD(t.dueDate)}
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: PRIORITY_STYLES[priority].bg, color: PRIORITY_STYLES[priority].color }}
                          >
                            {priority}
                          </span>
                          {t.weekOf && filterWeek === "All" && (
                            <span className="text-xs text-gray-400">{weekLabel(t.weekOf)}</span>
                          )}
                          {t.assigneeRole && (
                            <span className="text-xs text-gray-400">· {t.assigneeRole}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <SBadge s={status} custom={STATUS_STYLES[status]} />
                        {status !== "Done" && status !== "Cancelled" && (
                          <>
                            <button
                              onClick={() => advance(String(t.id))}
                              className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-0.5"
                              style={{ background: BLUE }}
                              title="Advance status"
                            >
                              <ArrowRight size={10} /> Next
                            </button>
                            <button
                              onClick={() => completeNow(String(t.id))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-white"
                              style={{ background: G }}
                              title="Mark Done"
                            >
                              <Check size={12} />
                            </button>
                          </>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => setModal({ type: "edit", ...t })}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => del(String(t.id))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}

      </>)}

      {/* Templates tab — Admin/Supervisor recurring task definitions */}
      {tab === "templates" && (
        <Card className="p-5">
          {taskTemplates.length === 0 ? (
            <div className="text-center py-10">
              <Repeat size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm text-gray-500">No recurring templates yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Each template materializes into a Task every Monday it's active.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {taskTemplates.map((tpl) => {
                const active = tpl.active !== false;
                return (
                  <div key={String(tpl.id)} className="flex items-start justify-between gap-3 py-3 hover:bg-gray-50/60">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${active ? "text-gray-800" : "text-gray-400 line-through"}`}>
                        {tpl.title}
                      </p>
                      {tpl.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">→ {tpl.assignee || "Unassigned"}</span>
                        <span className="text-xs text-gray-400">· every {tpl.dueDayOfWeek || "Mon"}</span>
                        {tpl.priority && tpl.priority !== "Normal" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fee2e2", color: RED }}>
                            {tpl.priority}
                          </span>
                        )}
                        {!active && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
                            Paused
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setTmplModal({ type: "edit", ...tpl })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          confirm("Delete this template? Existing tasks already created from it will remain.", () => {
                            setTaskTemplates((prev) => prev.filter((x) => x.id !== tpl.id));
                            dbDelete("tasktemplates", String(tpl.id)).catch(() => {});
                            toast.success("Template deleted");
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Template New/Edit modal */}
      {tmplModal && (
        <ModalWrap title={tmplModal.type === "edit" ? "Edit Template" : "New Recurring Template"} onClose={() => setTmplModal(null)}>
          <div className="space-y-4">
            <Fld label="Title" required>
              <input
                className={inp}
                value={tmplModal.title || ""}
                onChange={(e) => setTmplModal((p) => (p ? { ...p, title: e.target.value } : p))}
                placeholder="e.g. Weekly site walk — Acme HQ"
              />
            </Fld>
            <Fld label="Description">
              <textarea
                className={inp}
                rows={2}
                value={tmplModal.description || ""}
                onChange={(e) => setTmplModal((p) => (p ? { ...p, description: e.target.value } : p))}
                placeholder="What should the assignee do?"
              />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Assignee">
                <select
                  className={inp}
                  value={tmplModal.assignee || ""}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, assignee: e.target.value } : p))}
                >
                  <option value="">— Select assignee —</option>
                  {assigneePool.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Fld>
              <Fld label="Assignee Role">
                <select
                  className={inp}
                  value={tmplModal.assigneeRole || ""}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, assigneeRole: e.target.value } : p))}
                >
                  <option value="">— Any —</option>
                  <option>Supervisor</option>
                  <option>Technician</option>
                  <option>Finance</option>
                  <option>Admin</option>
                </select>
              </Fld>
              <Fld label="Priority">
                <select
                  className={inp}
                  value={tmplModal.priority || "Normal"}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, priority: e.target.value } : p))}
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </Fld>
              <Fld label="Due Day of Week">
                <select
                  className={inp}
                  value={tmplModal.dueDayOfWeek || "Mon"}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, dueDayOfWeek: e.target.value } : p))}
                >
                  <option>Mon</option><option>Tue</option><option>Wed</option>
                  <option>Thu</option><option>Fri</option><option>Sat</option>
                </select>
              </Fld>
              <Fld label="Start Date">
                <input
                  className={inp}
                  type="date"
                  value={tmplModal.startDate || ""}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, startDate: e.target.value } : p))}
                />
              </Fld>
              <Fld label="End Date (optional)">
                <input
                  className={inp}
                  type="date"
                  value={tmplModal.endDate || ""}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, endDate: e.target.value } : p))}
                />
              </Fld>
              <Fld label="Active?">
                <select
                  className={inp}
                  value={tmplModal.active === false ? "Paused" : "Active"}
                  onChange={(e) => setTmplModal((p) => (p ? { ...p, active: e.target.value === "Active" } : p))}
                >
                  <option>Active</option>
                  <option>Paused</option>
                </select>
              </Fld>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setTmplModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!tmplModal.title) { toast.info("Title is required"); return; }
                const now = new Date().toISOString();
                const id = tmplModal.id || `tpl${Date.now()}`;
                const next: TaskTemplate = {
                  ...(tmplModal as TaskTemplate),
                  id,
                  active: tmplModal.active !== false,
                  createdBy: tmplModal.createdBy || user.name,
                  createdAt: tmplModal.createdAt || now,
                } as TaskTemplate;
                const updated = tmplModal.id
                  ? taskTemplates.map((t) => (t.id === id ? next : t))
                  : [next, ...taskTemplates];
                setTaskTemplates(updated);
                dbSync("tasktemplates", updated).catch(() => {});
                toast.success(tmplModal.id ? "Template updated" : "Template created — will materialize next Monday");
                setTmplModal(null);
              }}
              disabled={!tmplModal.title}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40"
              style={{ background: G }}
            >
              {tmplModal.type === "edit" ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </ModalWrap>
      )}

      {/* New / Edit modal */}
      {modal && (
        <ModalWrap title={modal.type === "edit" ? "Edit Task" : "New Task"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Fld label="Title" required>
              <input
                className={inp}
                value={modal.title || ""}
                onChange={(e) => setModal((p) => (p ? { ...p, title: e.target.value } : p))}
                placeholder="e.g. Reconcile Acme imprest fund"
              />
            </Fld>
            <Fld label="Description">
              <textarea
                className={inp}
                rows={2}
                value={modal.description || ""}
                onChange={(e) => setModal((p) => (p ? { ...p, description: e.target.value } : p))}
                placeholder="Optional details, context, links"
              />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Assignee">
                <select
                  className={inp}
                  value={modal.assignee || ""}
                  onChange={(e) => setModal((p) => (p ? { ...p, assignee: e.target.value } : p))}
                >
                  <option value="">— Select assignee —</option>
                  {assigneePool.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Fld>
              <Fld label="Assignee Role">
                <select
                  className={inp}
                  value={modal.assigneeRole || ""}
                  onChange={(e) => setModal((p) => (p ? { ...p, assigneeRole: e.target.value } : p))}
                >
                  <option value="">— Any —</option>
                  <option>Supervisor</option>
                  <option>Technician</option>
                  <option>Finance</option>
                  <option>Admin</option>
                </select>
              </Fld>
              <Fld label="Priority">
                <select
                  className={inp}
                  value={modal.priority || "Normal"}
                  onChange={(e) => setModal((p) => (p ? { ...p, priority: e.target.value } : p))}
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </Fld>
              <Fld label="Status">
                <select
                  className={inp}
                  value={modal.status || "Pending"}
                  onChange={(e) => setModal((p) => (p ? { ...p, status: e.target.value } : p))}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Done</option>
                  <option>Cancelled</option>
                </select>
              </Fld>
              <Fld label="Due Date">
                <input
                  className={inp}
                  type="date"
                  value={modal.dueDate || ""}
                  onChange={(e) => {
                    const dd = e.target.value;
                    setModal((p) =>
                      p ? { ...p, dueDate: dd, weekOf: dd ? mondayOf(new Date(dd)) : p.weekOf } : p,
                    );
                  }}
                />
              </Fld>
              <Fld label="Week of (Mon)">
                <input
                  className={inp}
                  type="date"
                  value={modal.weekOf || thisMonday}
                  onChange={(e) =>
                    setModal((p) => (p ? { ...p, weekOf: mondayOf(new Date(e.target.value)) } : p))
                  }
                />
              </Fld>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">
              Cancel
            </button>
            <button
              onClick={() => saveTask(modal)}
              disabled={!modal.title}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40"
              style={{ background: G }}
            >
              {modal.type === "edit" ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
