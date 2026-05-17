// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Absence & Cover page
//  Phase 4b extraction. Monthly-tabbed absences + cover assignments with
//  CSV export and PDF reports.
//
//  Strict-typed: removed @ts-nocheck. Money-adjacent fields (deductionAmount,
//  coverAmount) are coerced through Number(v)||0 on read AND on write so a
//  stray string never sneaks into payroll math.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
import { Plus, Trash2, ArrowRight, FileText } from "lucide-react";
import { G, O, RED, BLUE, inp } from "../lib/constants";
import { fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, defaultDateForMK, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge, RadioG } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { StaffSelect } from "../components/pickers";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Absence, Cover, Client, Staff } from "../lib/schemas";

// ── Local helpers ──────────────────────────────────────────────────────────
// Money-safe numeric coercion: any non-finite input → 0. Mirrors the discipline
// used on the Imprest/Requisition pages so payroll downstream can trust it.
const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

type AbsenceStatus = "Absent Logged" | "Cover Assigned" | "Completed" | "Sent to Finance";

interface AbsenceModalDraft extends Partial<Absence> {
  type: "absence";
}
interface CoverModalDraft extends Partial<Cover> {
  type: "cover";
}
type ModalDraft = AbsenceModalDraft | CoverModalDraft;

interface StatusStyle { bg: string; color: string; border: string; }

interface AbsenceCoverStats {
  absences: number;
  covers: number;
  totalDays: number;
  absentStaff: number;
  uncovered: number;
}

export interface AbsenceCoverPageProps {
  absences: Absence[];
  setAbsences: Dispatch<SetStateAction<Absence[]>>;
  covers: Cover[];
  setCovers: Dispatch<SetStateAction<Cover[]>>;
  clients: Client[];
  staff?: Staff[];
}

export function AbsenceCoverPage({
  absences,
  setAbsences,
  covers,
  setCovers,
  clients,
  staff = [],
}: AbsenceCoverPageProps) {
  const [tab, setTab] = useState<"absences" | "covers">("absences");
  const [modal, setModal] = useState<ModalDraft | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const [selMK, setSelMK] = useState<string>(curMonthKey());

  const getMK = (r: Absence | Cover): string | null | undefined => r.startDate;

  // Both absences AND covers feed the month list (linked together per user spec)
  const combined = useMemo<Array<Absence | Cover>>(
    () => [...absences, ...covers],
    [absences, covers],
  );

  useEffect(() => {
    if (combined.length > 0 && !combined.some(r => monthOf(r, getMK) === selMK)) {
      const keys = [...new Set(combined.map(r => monthOf(r, getMK)).filter(Boolean))].sort().reverse();
      if (keys[0]) setSelMK(keys[0] as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined.length]);

  const monthAbsences = absences.filter(a => monthOf(a, getMK) === selMK);
  const monthCovers = covers.filter(c => monthOf(c, getMK) === selMK);

  const delA = (id: string): void =>
    confirm("Delete this absence?", () => {
      setAbsences(as => as.filter(a => a.id !== id));
      dbDelete("absences", id);
      toast.success("Absence deleted");
    });
  const delC = (id: string): void =>
    confirm("Delete this cover?", () => {
      setCovers(cs => cs.filter(c => c.id !== id));
      dbDelete("covers", id);
      toast.success("Cover deleted");
    });

  const SC: Record<AbsenceStatus, StatusStyle> = {
    "Absent Logged":    { bg: "#fff7ed", color: O,        border: "#fed7aa" },
    "Cover Assigned":   { bg: "#eff6ff", color: BLUE,     border: "#bfdbfe" },
    "Completed":        { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    "Sent to Finance":  { bg: "#fdf4ff", color: "#7c3aed", border: "#ddd6fe" },
  };
  const nextStatus = (cur: string): AbsenceStatus =>
    cur === "Absent Logged" ? "Cover Assigned"
    : cur === "Cover Assigned" ? "Completed"
    : "Sent to Finance";
  const advanceAbs = (id: string, cur: string): void =>
    setAbsences(as => as.map(a => a.id === id ? { ...a, status: nextStatus(cur) } : a));

  // ── Print report helpers ───────────────────────────────────────────────
  const daysOfAbsence = (a: Absence): number => {
    const s = new Date(a.startDate).getTime();
    const e = new Date(a.endDate || a.startDate).getTime();
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  };
  const statsOf = (ab: Absence[], cv: Cover[]): AbsenceCoverStats => {
    const totalDays = ab.reduce((s, a) => s + daysOfAbsence(a), 0);
    const absentStaff = new Set(ab.map(a => a.cleaner).filter(Boolean)).size;
    const uncovered = ab.filter(
      a => a.needsReplacement && !cv.some(c => c.absentCleaner === a.cleaner && c.startDate === a.startDate),
    ).length;
    return { absences: ab.length, covers: cv.length, totalDays, absentStaff, uncovered };
  };
  const kpisOf = (s: AbsenceCoverStats) => [
    { label: "Total Absences", value: s.absences,    color: O },
    { label: "Absence Days",   value: s.totalDays,   color: RED },
    { label: "Staff Affected", value: s.absentStaff, color: BLUE },
    { label: "Covers Assigned",value: s.covers,      color: "#16a34a" },
    { label: "Uncovered",      value: s.uncovered,   color: s.uncovered > 0 ? RED : "#6b7280" },
  ];
  const absRow = (a: Absence): string => {
    const ded = n(a.deductionAmount);
    return `<tr><td>${a.cleaner || "--"}</td><td>${a.site || "--"}</td><td>${fmtD(a.startDate)}</td><td>${fmtD(a.endDate || a.startDate)}</td><td style="text-align:center">${daysOfAbsence(a)}</td><td>${a.leaveType || "Sick"}</td><td style="text-align:right">${ded ? "&#x20a6;" + ded.toLocaleString() : "-"}</td><td>${a.status || "Absent Logged"}</td></tr>`;
  };
  const covRow = (c: Cover): string => {
    const amt = n(c.coverAmount);
    return `<tr><td>${c.replacement || "--"}</td><td>${c.absentCleaner || "--"}</td><td>${c.site || "--"}</td><td>${fmtD(c.startDate)}</td><td>${fmtD(c.endDate || c.startDate)}</td><td style="text-align:center">${n(c.days) || 1}</td><td style="text-align:right">${c.compensation ? (amt ? "&#x20a6;" + amt.toLocaleString() : "Yes") : "No"}</td></tr>`;
  };
  const absTable = (list: Absence[]): string =>
    list.length === 0
      ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0">No absences</p>`
      : `<table><thead><tr><th>Staff</th><th>Site</th><th>From</th><th>To</th><th>Days</th><th>Type</th><th>Deduction</th><th>Status</th></tr></thead><tbody>${list.map(absRow).join("")}</tbody></table>`;
  const covTable = (list: Cover[]): string =>
    list.length === 0
      ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0">No covers</p>`
      : `<table><thead><tr><th>Replacement</th><th>Covering For</th><th>Site</th><th>From</th><th>To</th><th>Days</th><th>Compensation</th></tr></thead><tbody>${list.map(covRow).join("")}</tbody></table>`;

  const printMonth = (): void => {
    if (monthAbsences.length === 0 && monthCovers.length === 0) {
      alert(`No absences or covers for ${mkLabel(selMK)}`);
      return;
    }
    const s = statsOf(monthAbsences, monthCovers);
    openPrintWin(buildReportHtml({
      moduleName: "Absence & Cover",
      periodLabel: mkLabel(selMK),
      summaryKpis: kpisOf(s),
      sections: [
        { label: "Absences",          table: absTable(monthAbsences) },
        { label: "Cover Assignments", table: covTable(monthCovers) },
      ],
    }));
  };
  const printAll = (): void => {
    if (combined.length === 0) {
      alert("No absences or covers recorded yet");
      return;
    }
    const s = statsOf(absences, covers);
    const byMonth: Record<string, { abs: Absence[]; cov: Cover[] }> = {};
    combined.forEach(r => {
      const mk = monthOf(r, getMK);
      if (!mk) return;
      if (!byMonth[mk]) byMonth[mk] = { abs: [], cov: [] };
      // Covers have absentCleaner; absences don't.
      if ((r as Cover).absentCleaner !== undefined && (r as Cover).absentCleaner !== "") {
        byMonth[mk].cov.push(r as Cover);
      } else {
        byMonth[mk].abs.push(r as Absence);
      }
    });
    const months = Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({
      moduleName: "Absence & Cover",
      periodLabel: "All History",
      summaryKpis: kpisOf(s),
      sections: months.map(mk => {
        const sub = statsOf(byMonth[mk].abs, byMonth[mk].cov);
        return {
          label: `${mkLabel(mk)} — ${sub.absences} absence(s), ${sub.covers} cover(s)`,
          kpis: kpisOf(sub),
          table: absTable(byMonth[mk].abs) + covTable(byMonth[mk].cov),
        };
      }),
    }));
  };

  const exportCsv = (): void => {
    const rows: Array<Array<string | number>> = [
      ["Staff", "Site", "Start", "End", "Leave Type", "Deduction (₦)", "Status"],
      ...monthAbsences.map(a => [
        a.cleaner || "",
        a.site || "",
        a.startDate || "",
        a.endDate || a.startDate || "",
        a.leaveType || "Sick",
        n(a.deductionAmount),
        a.status || "Absent Logged",
      ] as Array<string | number>),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `absences-${selMK}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  };

  // Narrow the modal for the absence form. Caller guarantees type === "absence".
  const absDraft = modal && modal.type === "absence" ? modal : null;
  const covDraft = modal && modal.type === "cover"   ? modal : null;

  const updateAbs = (patch: Partial<Absence>): void =>
    setModal(prev => (prev && prev.type === "absence" ? { ...prev, ...patch } : prev));
  const updateCov = (patch: Partial<Cover>): void =>
    setModal(prev => (prev && prev.type === "cover" ? { ...prev, ...patch } : prev));

  return (
    <div className="space-y-5">
      {confirmEl}
      {/* Month tabs + Print buttons */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <MonthTabs records={combined} getMK={getMK} selMK={selMK} setSelMK={setSelMK} />
        <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll} />
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 border border-gray-200 rounded-xl p-1 bg-white">
          <button
            onClick={() => setTab("absences")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "absences" ? "text-white" : "text-gray-500"}`}
            style={tab === "absences" ? { background: G } : {}}
          >
            Absences ({monthAbsences.length})
          </button>
          <button
            onClick={() => setTab("covers")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "covers" ? "text-white" : "text-gray-500"}`}
            style={tab === "covers" ? { background: G } : {}}
          >
            Cover ({monthCovers.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {tab === "absences" && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
              style={{ color: BLUE, borderColor: "#bfdbfe", background: "#eff6ff" }}
            >
              <FileText size={14} />Export CSV
            </button>
          )}
          <button
            onClick={() => setModal({
              type: tab === "absences" ? "absence" : "cover",
              startDate: defaultDateForMK(selMK),
            } as ModalDraft)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: G }}
          >
            <Plus size={14} />{tab === "absences" ? "Log Absence" : "Assign Cover"}
          </button>
        </div>
      </div>

      {tab === "absences" && (
        <Card>
          <div className="divide-y divide-gray-50">
            {monthAbsences.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No absences in {mkLabel(selMK)}</div>
            )}
            {monthAbsences.map(a => {
              const ded = n(a.deductionAmount);
              const status = (a.status || "Absent Logged") as AbsenceStatus;
              return (
                <div key={a.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: RED }}
                    >
                      {(a.cleaner || "?")[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{a.cleaner}</p>
                      <p className="text-xs text-gray-500">
                        Site: {a.site}  {fmtD(a.startDate)}
                        {a.endDate && a.endDate !== a.startDate ? ` - ${fmtD(a.endDate)}` : ""}
                      </p>
                      {a.reason && <p className="text-xs text-gray-400 italic">Reason: {a.reason}</p>}
                      <p className="text-xs text-gray-400">
                        Type: {a.leaveType || "Sick"}  Replacement: {a.needsReplacement ? "Needed" : "Not required"}
                        {ded > 0 && (
                          <span className="text-red-500 font-medium ml-1">
                              Deduction: ₦{ded.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <SBadge s={status} custom={SC[status]} />
                    {a.status !== "Sent to Finance" && (
                      <button
                        onClick={() => advanceAbs(a.id, a.status || "Absent Logged")}
                        className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-0.5"
                        style={{ background: BLUE }}
                      >
                        <ArrowRight size={9} />Next
                      </button>
                    )}
                    <button
                      onClick={() => delA(a.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === "covers" && (
        <Card>
          <div className="divide-y divide-gray-50">
            {monthCovers.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No cover assignments in {mkLabel(selMK)}</div>
            )}
            {monthCovers.map(c => (
              <div key={c.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: G }}
                  >
                    {(c.replacement || "?")[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {c.replacement} <span className="font-normal text-gray-400">covered for</span> {c.absentCleaner}
                    </p>
                    <p className="text-xs text-gray-500">
                      Site: {c.site}  {fmtD(c.startDate)}
                      {c.endDate && c.endDate !== c.startDate ? ` - ${fmtD(c.endDate)}` : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {n(c.days) || 1} day(s)  Compensation: {c.compensation ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => delC(c.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {absDraft && (
        <ModalWrap title="Log Staff Absence" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Fld label="Absent Staff">
              <StaffSelect
                staff={staff}
                value={absDraft.cleaner || ""}
                onChange={v => updateAbs({ cleaner: v })}
                placeholder="-- Select staff --"
              />
            </Fld>
            <Fld label="Site">
              <select
                className={inp}
                value={absDraft.site || ""}
                onChange={e => updateAbs({ site: e.target.value })}
              >
                <option value="">-- Select --</option>
                {clients.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Start Date">
                <input
                  className={inp}
                  type="date"
                  value={absDraft.startDate || ""}
                  onChange={e => updateAbs({ startDate: e.target.value })}
                />
              </Fld>
              <Fld label="End Date">
                <input
                  className={inp}
                  type="date"
                  value={absDraft.endDate || ""}
                  onChange={e => updateAbs({ endDate: e.target.value })}
                />
              </Fld>
            </div>
            <Fld label="Reason">
              <input
                className={inp}
                value={absDraft.reason || ""}
                onChange={e => updateAbs({ reason: e.target.value })}
              />
            </Fld>
            <Fld label="Replacement Needed?">
              <RadioG
                value={absDraft.needsReplacement ? "Yes" : "No"}
                onChange={v => updateAbs({ needsReplacement: v === "Yes" })}
                options={["Yes", "No"]}
              />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Leave Type">
                <select
                  className={inp}
                  value={absDraft.leaveType || "Sick"}
                  onChange={e => updateAbs({ leaveType: e.target.value })}
                >
                  <option>Sick</option>
                  <option>Annual</option>
                  <option>Emergency</option>
                  <option>AWOL</option>
                  <option>Maternity</option>
                  <option>Other</option>
                </select>
              </Fld>
              <Fld label="Deduction (₦)">
                <input
                  className={inp}
                  type="number"
                  min="0"
                  value={absDraft.deductionAmount ?? ""}
                  onChange={e => updateAbs({ deductionAmount: n(e.target.value) })}
                  placeholder="0 if none"
                />
              </Fld>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button
              onClick={() => setModal(null)}
              className="px-5 py-2 rounded-xl border text-gray-600 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Strip the discriminant `type` field; coerce the money field one more time on write.
                const { type: _t, ...rest } = absDraft;
                const newAbs: Absence = {
                  ...(rest as Absence),
                  id: "abs" + Date.now(),
                  status: "Absent Logged",
                  deductionAmount: n(absDraft.deductionAmount),
                };
                const nl = [...absences, newAbs];
                setAbsences(nl);
                dbSync("absences", nl);
                toast.success("Absence logged");
                setModal(null);
              }}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: G }}
            >
              Log Absence
            </button>
          </div>
        </ModalWrap>
      )}

      {covDraft && (
        <ModalWrap title="Assign Cover" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Fld label="Absent Cleaner">
              <StaffSelect
                staff={staff}
                value={covDraft.absentCleaner || ""}
                onChange={v => updateCov({ absentCleaner: v })}
                placeholder="-- Select absent staff --"
              />
            </Fld>
            <Fld label="Replacement Cleaner">
              <StaffSelect
                staff={staff}
                value={covDraft.replacement || ""}
                onChange={v => updateCov({ replacement: v })}
                placeholder="-- Select replacement --"
              />
            </Fld>
            <Fld label="Site">
              <select
                className={inp}
                value={covDraft.site || ""}
                onChange={e => updateCov({ site: e.target.value })}
              >
                <option value="">-- Select --</option>
                {clients.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </Fld>
            <div className="grid grid-cols-3 gap-4">
              <Fld label="Start Date">
                <input
                  className={inp}
                  type="date"
                  value={covDraft.startDate || ""}
                  onChange={e => updateCov({ startDate: e.target.value })}
                />
              </Fld>
              <Fld label="End Date">
                <input
                  className={inp}
                  type="date"
                  value={covDraft.endDate || ""}
                  onChange={e => updateCov({ endDate: e.target.value })}
                />
              </Fld>
              <Fld label="Days Covered">
                <input
                  className={inp}
                  type="number"
                  min="1"
                  value={covDraft.days ?? 1}
                  onChange={e => updateCov({ days: n(e.target.value) })}
                />
              </Fld>
            </div>
            <Fld label="Compensation?">
              <RadioG
                value={covDraft.compensation ? "Yes" : "No"}
                onChange={v => updateCov({ compensation: v === "Yes" })}
                options={["Yes", "No"]}
              />
            </Fld>
            {covDraft.compensation && (
              <Fld label="Cover Amount (₦)">
                <input
                  className={inp}
                  type="number"
                  min="0"
                  value={covDraft.coverAmount ?? ""}
                  onChange={e => updateCov({ coverAmount: n(e.target.value) })}
                  placeholder="Amount to pay cover staff"
                />
              </Fld>
            )}
            <Fld label="Remarks">
              <textarea
                className={inp}
                rows={2}
                value={covDraft.remarks || ""}
                onChange={e => updateCov({ remarks: e.target.value })}
              />
            </Fld>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button
              onClick={() => setModal(null)}
              className="px-5 py-2 rounded-xl border text-gray-600 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const { type: _t, ...rest } = covDraft;
                const newCov: Cover = {
                  ...(rest as Cover),
                  id: "cov" + Date.now(),
                  days: n(covDraft.days) || 1,
                  coverAmount: covDraft.compensation ? n(covDraft.coverAmount) : 0,
                };
                const nl = [...covers, newCov];
                setCovers(nl);
                dbSync("covers", nl);
                toast.success("Cover assigned");
                setModal(null);
              }}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: G }}
            >
              Assign
            </button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
