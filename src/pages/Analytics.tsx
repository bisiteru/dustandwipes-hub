// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Analytics page
//  Phase 4b extraction. KPI grid + Recharts visualizations + full revenue
//  breakdown table. Now correctly excludes expired contracts from totals.
//
//  Phase 5 strict-typing: `@ts-nocheck` removed. Props now use the shared
//  schema-derived types (Client, SiteReport, Job, Staff, Absence, Request_).
//  Reducers defensively wrap values in `Number(v) || 0` because the Zod
//  schemas use `.catch(0)` but downstream sums must still survive any legacy
//  string that slipped through `.passthrough()`. Recharts tooltip formatters
//  keep `any` args — those signatures are dictated by the library.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { G, GL, O, AMBER, RED, BLUE } from "../lib/constants";
import { fmt, cStatus } from "../lib/format";
import { Card, SBadge } from "../components/ui/primitives";
import type { Client, SiteReport, Job, Staff, Absence, Request_ } from "../lib/schemas";

interface AnalyticsPageProps {
  clients: Client[];
  siteReports: SiteReport[];
  jobs: Job[];
  staff: Staff[];
  absences?: Absence[];
  requests?: Request_[];
}

// Working-client shape: numeric fields coerced + derived status attached.
type WorkingClient = Client & {
  tot: number;
  sal: number;
  con: number;
  sc: number;
  vat: number;
  status: string;
};

const n = (v: unknown): number => Number(v) || 0;

export function AnalyticsPage({
  clients,
  siteReports,
  jobs,
  // `staff` is passed by App.tsx for forward-compat; not used in this view yet.
  staff: _staff,
  absences = [],
  requests = [],
}: AnalyticsPageProps) {
  void _staff;
  // Coerce numeric fields once so all downstream sums / sorts are safe against legacy strings
  const ws = useMemo<WorkingClient[]>(
    () =>
      clients.map((c) => ({
        ...c,
        tot: n(c.tot),
        sal: n(c.sal),
        con: n(c.con),
        sc: n(c.sc),
        vat: n(c.vat),
        status: cStatus(c.ce),
      })),
    [clients]
  );
  const top = [...ws].sort((a, b) => b.tot - a.tot).slice(0, 7);
  const svcRev = [
    { name: "Cleaning", value: ws.filter((c) => c.svc === "Cleaning").reduce((s, c) => s + n(c.tot), 0) },
    { name: "Pest Control", value: ws.filter((c) => c.svc === "Pest Control").reduce((s, c) => s + n(c.tot), 0) },
    { name: "Both", value: ws.filter((c) => c.svc === "Both").reduce((s, c) => s + n(c.tot), 0) },
  ];
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "Completed" || j.status === "Closed").length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const avgQuality =
    siteReports.length > 0
      ? Math.round(
          (siteReports.reduce((s, r) => s + n((r as SiteReport & { overallRating?: unknown }).overallRating), 0) /
            siteReports.length) *
            10
        ) / 10
      : 0;
  const techMap: Record<string, number> = {};
  jobs.forEach((j) => {
    (j.techs || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        techMap[t] = (techMap[t] || 0) + 1;
      });
  });
  const techData = Object.entries(techMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  const monthlyJobs = useMemo(() => {
    const m: Record<string, number> = {};
    jobs.forEach((j) => {
      if (j.date) {
        const k = j.date.slice(0, 7);
        m[k] = (m[k] || 0) + 1;
      }
    });
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => ({ month: k.slice(5) + " " + k.slice(0, 4), count: v }));
  }, [jobs]);
  // Revenue trend: monthly contract totals from client start dates
  const revenueTrend = useMemo(() => {
    const m: Record<string, number> = {};
    clients.forEach((c) => {
      if (c.cs) {
        const k = c.cs.slice(0, 7);
        m[k] = (m[k] || 0) + n(c.tot);
      }
    });
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([k, v]) => ({ month: k.slice(5) + "/" + k.slice(2, 4), revenue: v }));
  }, [clients]);
  // Contract health
  const expired = ws.filter((c) => c.status === "Expired").length;
  const expiring = ws.filter((c) => c.status === "Expiring Soon" || c.status === "Critical").length;
  const renewalRate = ws.length > 0 ? Math.round(((ws.length - expired) / ws.length) * 100) : 0;
  // Attendance: absences per month
  const absenceByMonth = useMemo(() => {
    const m: Record<string, number> = {};
    absences.forEach((a) => {
      if (a.startDate) {
        const k = a.startDate.slice(0, 7);
        m[k] = (m[k] || 0) + 1;
      }
    });
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => ({ month: k.slice(5) + "/" + k.slice(2, 4), absences: v }));
  }, [absences]);
  // Request conversion rate
  const converted = requests.filter((r) => r.status === "Converted").length;
  const convRate = requests.length > 0 ? Math.round((converted / requests.length) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total Clients", v: clients.length },
          { l: "Active Contracts", v: ws.filter((c) => c.status === "Active").length },
          { l: "Jobs Completed", v: jobs.filter((j) => j.status === "Completed").length },
          { l: "Site Reports", v: siteReports.length },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <div className="text-2xl font-black text-gray-800">{k.v}</div>
            <div className="text-xs font-bold text-gray-500 mt-1">{k.l}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-2xl font-black" style={{ color: completionRate >= 80 ? G : completionRate >= 50 ? AMBER : RED }}>
            {completionRate}%
          </div>
          <div className="text-xs font-bold text-gray-500 mt-1">Job Completion Rate</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {completedJobs} of {totalJobs} jobs
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black text-gray-800">{avgQuality > 0 ? avgQuality : "--"}</div>
          <div className="text-xs font-bold text-gray-500 mt-1">Avg Quality Score</div>
          <div className="text-xs text-gray-400 mt-0.5">From {siteReports.length} reports</div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black" style={{ color: renewalRate >= 90 ? G : renewalRate >= 70 ? AMBER : RED }}>
            {renewalRate}%
          </div>
          <div className="text-xs font-bold text-gray-500 mt-1">Contract Renewal Rate</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {expired} expired · {expiring} expiring soon
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black" style={{ color: convRate >= 60 ? G : convRate >= 30 ? AMBER : RED }}>
            {convRate}%
          </div>
          <div className="text-xs font-bold text-gray-500 mt-1">Request Conversion</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {converted} of {requests.length} requests
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-2xl font-black text-gray-800">{techData.length}</div>
          <div className="text-xs font-bold text-gray-500 mt-1">Active Technicians</div>
          <div className="text-xs text-gray-400 mt-0.5">With jobs assigned</div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black text-gray-800">
            {monthlyJobs.length > 0 ? monthlyJobs[monthlyJobs.length - 1].count : 0}
          </div>
          <div className="text-xs font-bold text-gray-500 mt-1">Jobs This Month</div>
          <div className="text-xs text-gray-400 mt-0.5">Last 6 months tracked</div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black text-gray-800">{absences.length}</div>
          <div className="text-xs font-bold text-gray-500 mt-1">Total Absences</div>
          <div className="text-xs text-gray-400 mt-0.5">All time</div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-black" style={{ color: G }}>
            {fmt(ws.filter((c) => c.status !== "Expired").reduce((s, c) => s + n(c.tot), 0))}
          </div>
          <div className="text-xs font-bold text-gray-500 mt-1">Total Portfolio (₦)</div>
          <div className="text-xs text-gray-400 mt-0.5">Non-expired contracts only</div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Top Clients by Value</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top} layout="vertical" barSize={14}>
              <XAxis
                type="number"
                tickFormatter={(v: any) => `${(Number(v) / 1000).toFixed(0)}k`}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                width={130}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v: any) => [fmt(v), "Value"]} contentStyle={{ borderRadius: "12px" }} />
              <Bar dataKey="tot" fill={G} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Revenue by Service</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={svcRev} barSize={45}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                tickFormatter={(v: any) => `${(Number(v) / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v: any) => [fmt(v), "Revenue"]} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {svcRev.map((_, i) => (
                  <Cell key={i} fill={[G, O, BLUE][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Monthly Jobs (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyJobs} barSize={28}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px" }} />
              <Bar dataKey="count" fill={BLUE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        {techData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Jobs per Technician</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={techData} layout="vertical" barSize={12}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#6b7280" }}
                />
                <Tooltip contentStyle={{ borderRadius: "12px" }} />
                <Bar dataKey="count" fill={G} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {revenueTrend.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Contract Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={revenueTrend} barSize={22}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
                <YAxis
                  tickFormatter={(v: any) => `₦${(Number(v) / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip formatter={(v: any) => [`₦${fmt(v)}`, "Revenue"]} contentStyle={{ borderRadius: "12px" }} />
                <Bar dataKey="revenue" fill={G} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        {absenceByMonth.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Absences per Month</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={absenceByMonth} barSize={22}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px" }} />
                <Bar dataKey="absences" fill={RED} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
      <Card className="p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Full Revenue Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Client", "Cat", "Service", "Salary", "Consumables", "Svc Charge", "VAT", "Total", "Status"].map((h) => (
                  <th key={h} className="text-right first:text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...ws]
                .sort((a, b) => b.tot - a.tot)
                .map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-700">{c.name}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-500">{c.cat}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-500">{c.svc}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{fmt(c.sal)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{fmt(c.con)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{fmt(c.sc)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{fmt(c.vat)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmt(c.tot)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <SBadge s={c.status} />
                    </td>
                  </tr>
                ))}
              <tr className="border-t-2 font-black" style={{ background: GL }}>
                <td className="px-3 py-2.5 text-gray-800" colSpan={3}>
                  TOTAL
                </td>
                {[
                  ws.reduce((s, c) => s + n(c.sal), 0),
                  ws.reduce((s, c) => s + n(c.con), 0),
                  ws.reduce((s, c) => s + n(c.sc), 0),
                  ws.reduce((s, c) => s + n(c.vat), 0),
                  ws.reduce((s, c) => s + n(c.tot), 0),
                ].map((v, i) => (
                  <td key={i} className="px-3 py-2.5 text-right" style={i === 4 ? { color: G } : {}}>
                    {fmt(v)}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
