// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Dashboard
//  Phase 4c extraction. The home screen — alerts, KPIs, today's jobs,
//  birthdays-this-month, jobs-by-status chart, contract + inventory alerts.
//
//  Strict-typed in Phase 5c: removed @ts-nocheck. All inputs are read-only
//  collections from App.tsx; aggregations are typed via explicit useMemo
//  generics; defensive Number() coercion is applied where Zod's coerce.number
//  could in theory leave NaN (legacy rows). Birthday/date arithmetic guards
//  against invalid Date parses by checking isNaN before use.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronRight, AlertTriangle, Briefcase, Clock, Package, Gift, Inbox, UserCheck, CheckCircle2 } from "lucide-react";
import { G, O, RED, BLUE, TODAY, STATUS_COLORS, JOB_STATUSES, inp } from "../lib/constants";
import { monthName, cStatus, dLeft, fmtD, sameName, csvHasName } from "../lib/format";
import { dbSync } from "../lib/supabase";
import { Card, SBadge, KPI } from "../components/ui/primitives";
import type { Client, Job, Request_, Inventory, AppUser, Staff, Task, Imprest, Requisition, Absence, CurrentUser } from "../lib/schemas";

// ── Props ────────────────────────────────────────────────────────────────────
export interface DashboardProps {
  clients: Client[];
  jobs: Job[];
  requests: Request_[];
  /** Phase 6: Admin assigns service requests to supervisors inline. */
  setRequests: Dispatch<SetStateAction<Request_[]>>;
  inventory: Inventory[];
  users: AppUser[];
  staff: Staff[];
  /** Phase 6: personal workspace data for non-Admin views. */
  tasks: Task[];
  imprests: Imprest[];
  requisitions: Requisition[];
  absences: Absence[];
  /** Logged-in user — drives which role-specific surfaces render. */
  user: CurrentUser;
  onNav: (page: string) => void;
}

// Client augmented with the live-derived contract status string.
type ClientWithStatus = Client & { status: string };

// AppUser and Staff share enough fields for the dashboard's birthday list —
// we read only `id`, `name`, `role`, `dob`, and `initial`, all of which exist
// on both schemas (strOpt defaults to "").
type PersonForBdays = {
  id: string;
  name: string;
  role: string;
  dob: string;
  initial: string;
};

// Row shape fed into the recharts BarChart.
interface StatusCount { s: string; count: number; }

/**
 * Merge app users + field staff into a single birthday-people list, deduped
 * so a person who exists in BOTH tables (e.g. a supervisor who logs in AND
 * has a staff payroll record) renders once, not twice. Dedup key is
 * normalized name + dob — same name with different dob = different people.
 * Prefers the entry that actually has a dob, then the AppUser row (richer
 * `initial`).
 */
function mergePeopleForBdays(users: AppUser[], staff: Staff[]): PersonForBdays[] {
  const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
  const byKey = new Map<string, PersonForBdays>();
  for (const p of [...users, ...staff]) {
    const person: PersonForBdays = {
      id: String(p.id),
      name: String(p.name ?? ""),
      role: String((p as any).role ?? ""),
      dob: String(p.dob ?? ""),
      initial: String((p as any).initial ?? ""),
    };
    if (!person.name) continue;
    const key = `${norm(person.name)}|${norm(person.dob)}`;
    const existing = byKey.get(key);
    // Keep the richer record: prefer one with a dob, then one with an initial.
    if (!existing || (!existing.dob && person.dob) || (!existing.initial && person.initial)) {
      byKey.set(key, person);
    }
  }
  return [...byKey.values()];
}

const CHART_COLORS = [G, BLUE, O, "#7c3aed", "#ea580c", "#16a34a"];

/**
 * Stamp `lastSeenDashboard` on the current user's row.
 *
 * Writes a SINGLE-row upsert (`dbSync("users", [me])`) directly rather than
 * going through setUsers — the App-level `debouncedSync("users", users)`
 * effect would otherwise POST the entire users table to Supabase on every
 * dashboard mount (hundreds of row upserts/day at scale for one timestamp).
 * dbSync uses merge-duplicates, so the one-row POST touches only this user.
 *
 * Self-stamp doesn't need to reflect in the stamper's own UI — the Admin
 * Team-Acknowledgement card reads everyone's lastSeenDashboard from the DB
 * load on boot. Throttled to once per 60s via the persisted value.
 */
function useStampLastSeen(
  user: CurrentUser,
  users: AppUser[],
): void {
  useEffect(() => {
    if (!user.id) return;
    const me = users.find((u) => String(u.id) === String(user.id));
    if (!me) return;
    const last = String((me as any).lastSeenDashboard || "");
    if (last && Date.now() - new Date(last).getTime() < 60_000) return;
    const now = new Date().toISOString();
    // Targeted one-row upsert — no full-table sync.
    dbSync("users", [{ ...me, lastSeenDashboard: now }]).catch(() => {});
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Saturday/Sunday locally — used to gate the end-of-week summary card. */
function isWeekEnd(now: Date = new Date()): boolean {
  const d = now.getDay();
  return d === 0 || d === 6; // Sun or Sat
}

/** Monday YYYY-MM-DD of the week containing `d`. TZ-safe — mirrors mondayOf
 *  in pages/Tasks.tsx (kept inline to avoid a cross-page import cycle). */
function mondayLocal(d: Date): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function Dashboard(props: DashboardProps) {
  // Phase 6: role-based router. Each branch renders its own "My Day" surface
  // so the Dashboard is a workflow tool, not a generic report.
  switch (props.user.role) {
    case "Supervisor":  return <SupervisorDashboard {...props} />;
    case "Finance":     return <FinanceDashboard {...props} />;
    case "Technician":  return <TechnicianDashboard {...props} />;
    case "Admin":
    default:            return <AdminDashboard {...props} />;
  }
}

// ── Admin Dashboard ──────────────────────────────────────────────────────────
// The org-wide view: KPIs, unassigned-requests inbox, contract alerts,
// today's jobs, birthdays, jobs-by-status chart. This is the historical
// Dashboard, post Phase-5c strict-typing + Phase-6 assignment additions.
function AdminDashboard({
  clients,
  jobs,
  requests,
  setRequests,
  inventory,
  users,
  staff,
  user,
  onNav,
}: DashboardProps) {
  const isAdmin = user.role === "Admin";

  // Supervisors available for assignment — pulled from app users.
  // Includes anyone with role "Supervisor" or "Admin" (Admins can self-assign
  // when triaging). Filtered to users with a name set.
  const supervisorPool = useMemo<AppUser[]>(
    () => users.filter(u => (u.role === "Supervisor" || u.role === "Admin") && u.name),
    [users],
  );

  // Unassigned service requests — anything Pending without an assignedTo.
  const unassignedRequests = useMemo<Request_[]>(
    () => requests.filter(r =>
      (r.status || "Pending") === "Pending" && !((r as any).assignedTo)),
    [requests],
  );

  // Inline-assign handler. Stamps assignedTo + assignedAt + assignedBy and
  // persists. Pure state update otherwise — the existing Requests page reads
  // the same fields, so the row shows up there with the right column too.
  const assignRequest = (id: string, supervisorName: string): void => {
    if (!supervisorName) return;
    const now = new Date().toISOString();
    const next = requests.map(r =>
      String(r.id) === id
        ? ({ ...r, assignedTo: supervisorName, assignedAt: now, assignedBy: user.name } as Request_)
        : r,
    );
    setRequests(next);
    dbSync("requests", next).catch(() => {});
  };
  // ── Derived collections ────────────────────────────────────────────────────
  const ws = useMemo<ClientWithStatus[]>(
    () => clients.map((c) => ({ ...c, status: cStatus(c.ce) })),
    [clients],
  );

  // KPI counters — Number()||0 guard against any legacy NaN in inventory numerics
  const critical = ws.filter((c) => c.status === "Critical").length;
  const awaiting = jobs.filter((j) => j.status === "Awaiting Approval").length;
  const lowStock = inventory.filter(
    (i) => (Number(i.qty) || 0) <= (Number(i.reorder) || 0),
  ).length;
  const pending = requests.filter((r) => r.status === "Pending").length;
  const activeJobs = jobs.filter(
    (j) => !["Completed", "Closed"].includes(j.status),
  ).length;

  // Birthdays — merge AppUser + Staff into a common shape and filter by month.
  const allPeople: PersonForBdays[] = mergePeopleForBdays(users, staff);

  const todayM = TODAY.getMonth() + 1;
  const todayD = TODAY.getDate();

  const bdays = allPeople
    .filter((u) => {
      if (!u.dob) return false;
      const d = new Date(u.dob);
      return !isNaN(d.getTime()) && d.getMonth() + 1 === todayM;
    })
    .sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());

  const todayBdays = bdays.filter((u) => new Date(u.dob).getDate() === todayD);

  // Jobs-by-status (drop "Closed" — last entry — and zero-counts)
  const sc: StatusCount[] = JOB_STATUSES.slice(0, -1)
    .map((s) => ({ s, count: jobs.filter((j) => j.status === s).length }))
    .filter((d) => d.count > 0);

  const todayStr = TODAY.toISOString().split("T")[0];
  const todayJobs = useMemo<Job[]>(
    () => jobs.filter((j) => j.date === todayStr),
    [jobs, todayStr],
  );

  return (
    <div className="space-y-6">
      {todayJobs.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={12} style={{ color: G }} />
              Today's Jobs ({todayJobs.length})
            </h3>
            <button
              onClick={() => onNav("jobs")}
              className="text-xs text-green-700 hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {todayJobs.map((j) => {
              const sStyle = STATUS_COLORS[j.status];
              const swatch = sStyle?.color ?? G;
              return (
                <div
                  key={j.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "#fafafa", border: "1px solid #f3f4f6" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: swatch }}
                    >
                      {(j.clientName || "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{j.clientName}</p>
                      <p className="text-xs text-gray-400">
                        {j.svc}
                        {j.sup ? `  Sup: ${j.sup}` : ""}
                        {j.checkIn && !j.checkOut ? " · Checked in" : ""}
                      </p>
                    </div>
                  </div>
                  <SBadge s={j.status} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {todayBdays.length > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "#fdf4ff", border: "1px solid #e9d5ff" }}
        >
          <span className="text-2xl"></span>
          <div>
            <p className="font-bold text-purple-800">Birthday Today!</p>
            <p className="text-purple-600 text-sm">
              {todayBdays.map((u) => u.name).join(", ")} -- Happy Birthday!{" "}
            </p>
          </div>
        </div>
      )}

      {critical + awaiting + lowStock > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {critical > 0 && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl text-sm"
              style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
            >
              <AlertTriangle size={16} style={{ color: RED }} />
              <div>
                <p className="font-bold text-red-800"> {critical} contract(s) critical</p>
                <button onClick={() => onNav("contracts")} className="text-xs text-red-600 underline">
                  View
                </button>
              </div>
            </div>
          )}
          {awaiting > 0 && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl text-sm"
              style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
            >
              <Clock size={16} style={{ color: O }} />
              <div>
                <p className="font-bold text-orange-800"> {awaiting} job(s) awaiting approval</p>
                <button onClick={() => onNav("jobs")} className="text-xs text-orange-600 underline">
                  Review
                </button>
              </div>
            </div>
          )}
          {lowStock > 0 && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl text-sm"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
            >
              <Package size={16} style={{ color: BLUE }} />
              <div>
                <p className="font-bold text-blue-800"> {lowStock} item(s) low stock</p>
                <button onClick={() => onNav("inventory")} className="text-xs text-blue-600 underline">
                  View
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Inbox: Unassigned Service Requests (Admin only) ───────────────
          One-click triage. Each pending request gets a supervisor dropdown;
          selecting stamps assignedTo + assignedAt + assignedBy and the row
          disappears from this list (still visible on the Requests page with
          its "Assigned to" column). The Dashboard is the workflow tool —
          you assign here, you don't navigate to the Requests page first. */}
      {isAdmin && unassignedRequests.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Inbox size={12} style={{ color: O }} />
              Unassigned Service Requests
              <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: O }}>
                {unassignedRequests.length}
              </span>
            </h3>
            <button onClick={() => onNav("requests")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {unassignedRequests.slice(0, 8).map((r) => (
              <div
                key={String(r.id)}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.clientName || "Unknown client"}
                    <span className="ml-2 text-xs text-gray-400 font-normal">{r.svc || "—"}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.loc ? `📍 ${r.loc} · ` : ""}
                    {r.prefDate ? `Preferred: ${fmtD(r.prefDate)} · ` : ""}
                    {r.src ? `via ${r.src}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <UserCheck size={14} style={{ color: G }} />
                  <select
                    className={`${inp} text-xs py-1.5 w-40`}
                    defaultValue=""
                    onChange={(e) => assignRequest(String(r.id), e.target.value)}
                  >
                    <option value="" disabled>
                      — Assign to —
                    </option>
                    {supervisorPool.map((s) => (
                      <option key={String(s.id)} value={String(s.name || "")}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {unassignedRequests.length > 8 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{unassignedRequests.length - 8} more on the Requests page
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Team acknowledgement — has each non-Admin user opened the Dashboard
          this week? "Not yet seen" lights up a row so Admin can nudge. */}
      {isAdmin && <TeamAcknowledgement users={users} />}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI
          icon=""
          label="Active Jobs"
          value={activeJobs}
          sub={`${awaiting} need approval`}
          bg="#fffbeb"
          onClick={() => onNav("jobs")}
        />
        <KPI
          icon=""
          label="Pending Requests"
          value={pending}
          sub="Awaiting conversion"
          bg="#eff6ff"
          onClick={() => onNav("requests")}
        />
        <KPI
          icon=""
          label="Critical Contracts"
          value={critical}
          sub="+expiring soon"
          bg="#fee2e2"
          onClick={() => onNav("contracts")}
        />
        <KPI
          icon=""
          label="Low Stock Items"
          value={lowStock}
          sub="Below reorder level"
          bg="#f0f9ff"
          onClick={() => onNav("inventory")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Jobs by Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sc} barSize={28}>
              <XAxis dataKey="s" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {sc.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Gift size={12} style={{ color: "#9333ea" }} />
            Birthdays This Month
          </h3>
          {bdays.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No birthdays this month</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bdays.map((u) => {
                const d = new Date(u.dob);
                const isToday = d.getDate() === todayD;
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl ${
                      isToday ? "border border-purple-200" : "border border-gray-100"
                    }`}
                    style={isToday ? { background: "#fdf4ff" } : { background: "#fafafa" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: isToday ? "#9333ea" : G }}
                      >
                        {u.initial || (u.name ? u.name[0] : "?")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.role}</p>
                      </div>
                    </div>
                    <p
                      className={`text-xs font-bold ${
                        isToday ? "text-purple-600" : "text-gray-500"
                      }`}
                    >
                      {isToday ? " Today!" : d.getDate() + " " + monthName(d.getMonth())}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contract Alerts</h3>
            <button
              onClick={() => onNav("contracts")}
              className="text-xs text-green-700 hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {ws
              .filter((c) => c.status !== "Active")
              .slice(0, 5)
              .map((c) => {
                const dl = dLeft(c.ce);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: "#fafafa", border: "1px solid #f3f4f6" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">{c.name}</p>
                      <p className="text-xs text-gray-400">{fmtD(c.ce)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {dl !== null && (
                        <span
                          className={`text-xs font-bold ${
                            dl < 0 ? "text-gray-500" : dl <= 30 ? "text-red-500" : "text-amber-500"
                          }`}
                        >
                          {dl < 0 ? `${Math.abs(dl)}d ago` : `${dl}d`}
                        </span>
                      )}
                      <SBadge s={c.status} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inventory Alerts</h3>
            <button
              onClick={() => onNav("inventory")}
              className="text-xs text-green-700 hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {inventory
              .filter((i) => (Number(i.qty) || 0) <= (Number(i.reorder) || 0))
              .map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "#fafafa", border: "1px solid #f3f4f6" }}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">{i.item}</p>
                    <p className="text-xs text-gray-400">{i.cat}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-red-600">{i.qty}</p>
                    <p className="text-xs text-gray-400">min {i.reorder}</p>
                  </div>
                </div>
              ))}
            {inventory.filter((i) => (Number(i.qty) || 0) <= (Number(i.reorder) || 0)).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4"> All stock levels OK</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ── Supervisor Dashboard ─────────────────────────────────────────────────────
// "My Day" view: service requests assigned to me + my open tasks + jobs I'm
// supervising this week. Acknowledgement timestamp commit (6/6) will add
// viewedAt stamping so Admin can tell at a glance who's seen their plate.
function SupervisorDashboard({ requests, jobs, tasks, staff, users, user, onNav }: DashboardProps) {
  const me = user.name;
  const todayStr = TODAY.toISOString().split("T")[0];
  useStampLastSeen(user, users);

  // Filters use sameName() so the user's login name (`me`) matches the
  // assignedTo/assignee/sup strings even when the picker stored a slightly
  // different rendering of the same person ("Bola" ↔ "Bola Adebayo",
  // trailing whitespace, mixed case, etc.). See lib/format.ts.
  const myRequests = useMemo<Request_[]>(
    () => requests.filter(r => sameName((r as any).assignedTo, me) && r.status !== "Converted"),
    [requests, me],
  );

  const myOpenTasks = useMemo<Task[]>(
    () => tasks.filter(t => sameName(t.assignee, me) && t.status !== "Done" && t.status !== "Cancelled")
                .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [tasks, me],
  );

  const myJobsThisWeek = useMemo<Job[]>(() => {
    const today = new Date(todayStr);
    const sunday = new Date(today); sunday.setDate(sunday.getDate() + (7 - today.getDay()) % 7);
    const sundayStr = sunday.toISOString().slice(0, 10);
    return jobs.filter(j => sameName(j.sup, me) && j.date && j.date >= todayStr && j.date <= sundayStr);
  }, [jobs, me, todayStr]);

  const overdueTasks = myOpenTasks.filter(t => t.dueDate && t.dueDate < todayStr);

  // Re-use the AdminDashboard's birthday slice — supervisors still benefit from
  // the "Bola's birthday today" reminder; this is identity-agnostic.
  const allPeople: PersonForBdays[] = mergePeopleForBdays(users, staff);
  const todayM = TODAY.getMonth() + 1;
  const todayD = TODAY.getDate();
  const todayBdays = allPeople.filter(u => {
    if (!u.dob) return false;
    const d = new Date(u.dob);
    return !isNaN(d.getTime()) && d.getMonth() + 1 === todayM && d.getDate() === todayD;
  });

  return (
    <div className="space-y-5">
      {/* Greeting + week summary */}
      <div>
        <h2 className="text-base font-bold text-gray-800">Good day, {me.split(" ")[0] || "there"}.</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {myRequests.length} assigned request{myRequests.length === 1 ? "" : "s"}, {myOpenTasks.length} open task{myOpenTasks.length === 1 ? "" : "s"}
          {overdueTasks.length > 0 && <span className="text-red-600 font-semibold"> · {overdueTasks.length} overdue</span>}
        </p>
      </div>

      {todayBdays.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#fdf4ff", border: "1px solid #e9d5ff" }}>
          <Gift size={18} style={{ color: "#9333ea" }} />
          <p className="text-sm text-purple-700">
            <strong>Birthday today:</strong> {todayBdays.map(u => u.name).join(", ")}
          </p>
        </div>
      )}

      {/* End-of-week summary — visible Sat/Sun. Shows what landed this week. */}
      {isWeekEnd() && <EOWSummary tasks={tasks} jobs={jobs} requests={requests} me={me} />}

      {/* My assigned service requests */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Inbox size={12} style={{ color: O }} /> Service Requests Assigned to Me
            <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: O }}>
              {myRequests.length}
            </span>
          </h3>
          <button onClick={() => onNav("requests")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
            Open Requests <ChevronRight size={12} />
          </button>
        </div>
        {myRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No service requests assigned to you right now.</p>
        ) : (
          <div className="space-y-2">
            {myRequests.slice(0, 6).map(r => (
              <div key={String(r.id)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.clientName || "Unknown"} <span className="ml-2 text-xs text-gray-400 font-normal">{r.svc}</span></p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.loc ? `📍 ${r.loc} · ` : ""}{r.prefDate ? `Preferred: ${fmtD(r.prefDate)}` : ""}
                  </p>
                </div>
                <button onClick={() => onNav("requests")} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: BLUE }}>
                  Convert →
                </button>
              </div>
            ))}
            {myRequests.length > 6 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{myRequests.length - 6} more on the Requests page</p>
            )}
          </div>
        )}
      </Card>

      {/* My open tasks */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={12} style={{ color: G }} /> My Open Tasks
            <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: G }}>
              {myOpenTasks.length}
            </span>
          </h3>
          <button onClick={() => onNav("tasks")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
            All Tasks <ChevronRight size={12} />
          </button>
        </div>
        {myOpenTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nothing on your plate — great work or quiet week.</p>
        ) : (
          <div className="space-y-2">
            {myOpenTasks.slice(0, 8).map(t => {
              const overdue = t.dueDate && t.dueDate < todayStr;
              return (
                <div key={String(t.id)} className={`flex items-center justify-between p-3 rounded-xl border ${overdue ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-gray-50/60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">
                      {t.dueDate ? <span className={overdue ? "text-red-600 font-semibold" : ""}>Due {fmtD(t.dueDate)}</span> : "No due date"}
                      {t.priority && t.priority !== "Normal" ? ` · ${t.priority}` : ""}
                    </p>
                  </div>
                  <SBadge s={t.status || "Pending"} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Jobs I'm supervising this week */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} style={{ color: BLUE }} /> Jobs I'm Supervising This Week
            <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: BLUE }}>
              {myJobsThisWeek.length}
            </span>
          </h3>
          <button onClick={() => onNav("jobs")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
            Open Jobs <ChevronRight size={12} />
          </button>
        </div>
        {myJobsThisWeek.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No jobs under your supervision this week.</p>
        ) : (
          <div className="space-y-2">
            {myJobsThisWeek.slice(0, 8).map(j => (
              <div key={String(j.id)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{j.clientName} <span className="ml-2 text-xs text-gray-400 font-normal">{j.svc}</span></p>
                  <p className="text-xs text-gray-500">{fmtD(j.date)}{j.techs ? ` · Crew: ${j.techs}` : ""}</p>
                </div>
                <SBadge s={j.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Finance Dashboard ────────────────────────────────────────────────────────
// Money-focused: imprest balances, requisitions awaiting approval, absence
// deductions accumulating, inventory value at risk. This is intentionally a
// thin first draft per the user's note ("details can be refined later").
function FinanceDashboard({ imprests, requisitions, absences, inventory, users, user, onNav }: DashboardProps) {
  const me = user.name;
  useStampLastSeen(user, users);

  const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const activeImprests = useMemo(() => imprests.filter(i => (i.status || "Active") === "Active"), [imprests]);
  const imprestBalance = useMemo(() => activeImprests.reduce((sum, i) => {
    const issued = n(i.amount);
    const spent = ((i.expenses as { amount?: unknown }[] | undefined) || []).reduce((s, e) => s + n(e?.amount), 0);
    return sum + (issued - spent);
  }, 0), [activeImprests]);

  const pendingReqs = useMemo(() => requisitions.filter(r => (r.status || "Pending") === "Pending"), [requisitions]);
  const pendingReqsValue = useMemo(() => pendingReqs.reduce((sum, r) => {
    const items = (r.items as { qty?: unknown; cost?: unknown; rate?: unknown; approvedRate?: unknown }[] | undefined) || [];
    return sum + items.reduce((s, it) => s + n(it.qty) * (n(it.approvedRate) || n(it.rate) || n(it.cost)), 0);
  }, 0), [pendingReqs]);

  const deductionsPending = useMemo(() => absences
    .filter(a => a.status !== "Sent to Finance" && n(a.deductionAmount) > 0)
    .reduce((sum, a) => sum + n(a.deductionAmount), 0), [absences]);

  const lowStock = useMemo(() => inventory.filter(i => n(i.qty) <= n(i.reorder)).length, [inventory]);

  const fmt = (v: number): string => "₦" + Math.round(v).toLocaleString();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-800">Finance dashboard — {me.split(" ")[0] || ""}.</h2>
        <p className="text-xs text-gray-400 mt-0.5">Imprest, requisitions, payroll deductions, and stock value at a glance.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI icon="" label="Active Imprests" value={activeImprests.length} sub={`${fmt(imprestBalance)} unspent`} bg="#eff6ff" onClick={() => onNav("imprest")} />
        <KPI icon="" label="Pending Requisitions" value={pendingReqs.length} sub={fmt(pendingReqsValue)} bg="#fff7ed" onClick={() => onNav("requisitions")} />
        <KPI icon="" label="Deductions Pending" value={fmt(deductionsPending)} sub="To send to payroll" bg="#fef3c7" onClick={() => onNav("absencecover")} />
        <KPI icon="" label="Low Stock Items" value={lowStock} sub="Reorder threshold hit" bg="#fee2e2" onClick={() => onNav("inventory")} />
      </div>

      <Card className="p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Open Items by Category</h3>
        <div className="space-y-2 text-sm">
          <button onClick={() => onNav("requisitions")} className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50">
            <span className="font-semibold text-gray-700">Review {pendingReqs.length} pending requisition{pendingReqs.length === 1 ? "" : "s"}</span>
            <span className="text-gray-500 text-xs">{fmt(pendingReqsValue)} total <ChevronRight size={12} className="inline" /></span>
          </button>
          <button onClick={() => onNav("absencecover")} className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50">
            <span className="font-semibold text-gray-700">Process absence deductions</span>
            <span className="text-gray-500 text-xs">{fmt(deductionsPending)} pending <ChevronRight size={12} className="inline" /></span>
          </button>
          <button onClick={() => onNav("imprest")} className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50">
            <span className="font-semibold text-gray-700">Reconcile imprest accounts</span>
            <span className="text-gray-500 text-xs">{activeImprests.length} active · {fmt(imprestBalance)} <ChevronRight size={12} className="inline" /></span>
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Technician Dashboard ─────────────────────────────────────────────────────
// Field-facing: today's jobs assigned to me (with the actual action — Open Job —
// to start check-in) and my open tasks. Designed to be readable on a phone
// after the mobile drawer sweep in Phase 5c.
function TechnicianDashboard({ jobs, tasks, users, user, onNav }: DashboardProps) {
  const me = user.name;
  const todayStr = TODAY.toISOString().split("T")[0];
  useStampLastSeen(user, users);

  // Same name-match leniency as the Supervisor dashboard. j.techs is a
  // comma-separated string of crew names, so we match each comma-part
  // independently via csvHasName.
  const myJobsToday = useMemo<Job[]>(
    () => jobs.filter(j => j.date === todayStr && (csvHasName(j.techs, me) || sameName(j.sup, me))),
    [jobs, me, todayStr],
  );

  const myJobsThisWeek = useMemo<Job[]>(() => {
    const today = new Date(todayStr);
    const sunday = new Date(today); sunday.setDate(sunday.getDate() + (7 - today.getDay()) % 7);
    const sundayStr = sunday.toISOString().slice(0, 10);
    return jobs.filter(j => (csvHasName(j.techs, me) || sameName(j.sup, me)) && j.date && j.date > todayStr && j.date <= sundayStr);
  }, [jobs, me, todayStr]);

  const myOpenTasks = useMemo<Task[]>(
    () => tasks.filter(t => sameName(t.assignee, me) && t.status !== "Done" && t.status !== "Cancelled"),
    [tasks, me],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-800">Good day, {me.split(" ")[0] || "there"}.</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {myJobsToday.length} job{myJobsToday.length === 1 ? "" : "s"} today, {myJobsThisWeek.length} upcoming this week, {myOpenTasks.length} task{myOpenTasks.length === 1 ? "" : "s"}.
        </p>
      </div>

      {isWeekEnd() && <EOWSummary tasks={tasks} jobs={jobs} requests={[]} me={me} />}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={12} style={{ color: G }} /> Today's Jobs
            <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: G }}>
              {myJobsToday.length}
            </span>
          </h3>
          <button onClick={() => onNav("jobs")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
            Open Jobs <ChevronRight size={12} />
          </button>
        </div>
        {myJobsToday.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No jobs assigned to you today.</p>
        ) : (
          <div className="space-y-2">
            {myJobsToday.map(j => (
              <div key={String(j.id)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{j.clientName} <span className="ml-2 text-xs text-gray-400 font-normal">{j.svc}</span></p>
                  <p className="text-xs text-gray-500">{j.loc ? `📍 ${j.loc}` : ""}{j.sup ? ` · Sup: ${j.sup}` : ""}</p>
                </div>
                <button onClick={() => onNav("jobs")} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: G }}>
                  Open →
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {myJobsThisWeek.length > 0 && (
        <Card className="p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock size={12} style={{ color: BLUE }} /> Coming Up This Week
          </h3>
          <div className="space-y-2">
            {myJobsThisWeek.slice(0, 6).map(j => (
              <div key={String(j.id)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{j.clientName}</p>
                  <p className="text-xs text-gray-500">{fmtD(j.date)} · {j.svc}</p>
                </div>
                <SBadge s={j.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={12} style={{ color: O }} /> My Tasks
            <span className="ml-1 px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: O }}>
              {myOpenTasks.length}
            </span>
          </h3>
          <button onClick={() => onNav("tasks")} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}>
            All Tasks <ChevronRight size={12} />
          </button>
        </div>
        {myOpenTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No outstanding tasks.</p>
        ) : (
          <div className="space-y-2">
            {myOpenTasks.slice(0, 6).map(t => (
              <div key={String(t.id)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.dueDate ? `Due ${fmtD(t.dueDate)}` : "No due date"}</p>
                </div>
                <SBadge s={t.status || "Pending"} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── End-of-week summary card ─────────────────────────────────────────────────
// Rendered on Sat/Sun on the Supervisor and Technician dashboards. Tallies
// what landed this week so the assignee gets a clean weekly cadence and any
// drift gets surfaced before it compounds.
interface EOWSummaryProps {
  tasks: Task[];
  jobs: Job[];
  requests: Request_[];
  me: string;
}

function EOWSummary({ tasks, jobs, requests, me }: EOWSummaryProps) {
  const monday = mondayLocal(new Date());

  const myWeekTasks = tasks.filter((t) => sameName(t.assignee, me) && t.weekOf === monday);
  const tasksDone = myWeekTasks.filter((t) => t.status === "Done").length;
  const tasksOpen = myWeekTasks.filter((t) => t.status !== "Done" && t.status !== "Cancelled");

  // Jobs supervised OR worked on this week — Mon..Sun.
  const sunday = (() => {
    const [y, m, d] = monday.split("-").map(Number);
    const dt = new Date(y, m - 1, d + 6);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  })();
  const myWeekJobs = jobs.filter(
    (j) =>
      (sameName(j.sup, me) || csvHasName(j.techs, me)) &&
      j.date && j.date >= monday && j.date <= sunday,
  );
  const jobsCompleted = myWeekJobs.filter((j) => j.status === "Closed" || j.status === "Completed").length;

  const requestsCompleted = requests.filter(
    (r) => sameName((r as any).assignedTo, me) && r.status === "Converted",
  ).length;

  return (
    <div className="p-5 rounded-2xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={16} style={{ color: G }} />
        <h3 className="text-sm font-bold" style={{ color: "#166534" }}>End-of-Week Summary</h3>
      </div>
      <p className="text-sm text-green-900">
        This week you completed <strong>{tasksDone}</strong> of <strong>{myWeekTasks.length}</strong> task{myWeekTasks.length === 1 ? "" : "s"}
        {myWeekJobs.length > 0 && <>, finished <strong>{jobsCompleted}</strong> of <strong>{myWeekJobs.length}</strong> job{myWeekJobs.length === 1 ? "" : "s"}</>}
        {requestsCompleted > 0 && <>, converted <strong>{requestsCompleted}</strong> request{requestsCompleted === 1 ? "" : "s"}</>}.
      </p>
      {tasksOpen.length > 0 && (
        <p className="text-xs text-amber-700 mt-2">
          ⚠ <strong>Outstanding ({tasksOpen.length}):</strong> {tasksOpen.slice(0, 3).map((t) => t.title).join(", ")}
          {tasksOpen.length > 3 ? `, +${tasksOpen.length - 3} more` : ""}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Team Acknowledgement card (Admin) ────────────────────────────────────────
// Lists non-Admin users with a "seen this week" / "not yet seen" indicator,
// using each user's lastSeenDashboard timestamp. Admin uses this to spot a
// supervisor who hasn't acknowledged this week's plate yet.
interface TeamAcknowledgementProps {
  users: AppUser[];
}

function TeamAcknowledgement({ users }: TeamAcknowledgementProps) {
  const monday = mondayLocal(new Date());
  const team = users.filter((u) => u.role !== "Admin" && u.name);
  if (team.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <UserCheck size={12} style={{ color: G }} /> Team Acknowledgement — Week of {monday}
      </h3>
      <div className="space-y-1.5">
        {team.map((u) => {
          const last = String((u as any).lastSeenDashboard || "");
          const seenThisWeek = last && last.slice(0, 10) >= monday;
          return (
            <div key={String(u.id)} className="flex items-center justify-between text-sm py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seenThisWeek ? G : O }} />
                <span className="text-gray-700 truncate">{u.name}</span>
                <span className="text-xs text-gray-400">({u.role})</span>
              </div>
              <span className="text-xs font-medium" style={{ color: seenThisWeek ? G : O }}>
                {seenThisWeek ? `Seen ${last.slice(11, 16)} ${last.slice(0, 10) === new Date().toISOString().slice(0, 10) ? "today" : "this week"}` : "Not yet seen this week"}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
