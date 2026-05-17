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

import React, { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronRight, AlertTriangle, Briefcase, Clock, Package, Gift } from "lucide-react";
import { G, O, RED, BLUE, TODAY, STATUS_COLORS, JOB_STATUSES } from "../lib/constants";
import { monthName, cStatus, dLeft, fmtD } from "../lib/format";
import { Card, SBadge, KPI } from "../components/ui/primitives";
import type { Client, Job, Request_, Inventory, AppUser, Staff } from "../lib/schemas";

// ── Props ────────────────────────────────────────────────────────────────────
export interface DashboardProps {
  clients: Client[];
  jobs: Job[];
  requests: Request_[];
  inventory: Inventory[];
  users: AppUser[];
  staff: Staff[];
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

const CHART_COLORS = [G, BLUE, O, "#7c3aed", "#ea580c", "#16a34a"];

export function Dashboard({
  clients,
  jobs,
  requests,
  inventory,
  users,
  staff,
  onNav,
}: DashboardProps) {
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
  const allPeople: PersonForBdays[] = [...users, ...staff].map((p) => ({
    id: String(p.id),
    name: String(p.name ?? ""),
    role: String(p.role ?? ""),
    dob: String(p.dob ?? ""),
    initial: String(p.initial ?? ""),
  }));

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
