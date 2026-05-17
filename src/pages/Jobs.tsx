// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Jobs page + GpsModal
//  Phase 4c extraction. Monthly-tabbed job list with GPS check-in/out flow
//  and PDF reports. GpsModal handles the geolocation capture for technicians.
//
//  Strict-typed in Phase 5b: removed `@ts-nocheck`. Job is imported from
//  schemas.ts; signOff is preserved as `unknown`-shaped in the Zod schema, so
//  this file defines a local SignOff interface for the GPS modal write path.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ArrowRight } from "lucide-react";
import { G, GD, O, GL, AMBER, RED, BLUE, inp, JOB_STATUSES, STATUS_COLORS } from "../lib/constants";
import { fmtD, fmtDT, calcDur } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, defaultDateForMK, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge, StarRating } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { StaffSelect, ContactSearchSelect } from "../components/pickers";
import { useToast, Toaster } from "../components/ui/Toaster";
import { queueOfflineAction } from "../lib/offline";
import { useConfirm } from "../components/ui/useConfirm";
import type { Job, Client, Contact, Staff, CurrentUser } from "../lib/schemas";

// ── Local types ─────────────────────────────────────────────────────────────
// signOff is `z.any().optional()` in the Zod schema (flexible nested blob);
// this is the concrete shape this page writes back to it.
interface SignOff {
  rating: number;
  clientName: string;
  remarks: string;
  notPresent: boolean;
  confirmedBy?: string;
  timestamp?: string;
}

interface GpsLoc { lat: string; lng: string; acc: number; }

interface GpsModalState { job: Job; type: "in" | "out"; }

interface JobsPageProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  clients: Client[];
  contacts?: Contact[];
  staff?: Staff[];
  user: CurrentUser;
}

interface JobStats {
  total: number;
  closed: number;
  pending: number;
  overdue: number;
  byClient: Record<string, number>;
}

interface KpiEntry { label: string; value: number; color?: string; }

export function JobsPage({ jobs, setJobs, clients, contacts = [], staff = [], user }: JobsPageProps) {
  const [modal, setModal] = useState<Partial<Job> | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [gpsModal, setGpsModal] = useState<GpsModalState | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const [selMK, setSelMK] = useState<string>(curMonthKey());

  // Group by job CREATION date — uses createdAt if present, falls back to parsing timestamp from id
  const getMK = (j: Job): string | undefined => j.createdAt || undefined;

  useEffect(() => {
    if (jobs.length > 0 && !jobs.some(j => monthOf(j, getMK) === selMK)) {
      const keys = [...new Set(jobs.map(j => monthOf(j, getMK)).filter(Boolean))].sort().reverse();
      if (keys[0]) setSelMK(keys[0] as string);
    }
  }, [jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthJobs = jobs.filter(j => monthOf(j, getMK) === selMK);
  const filtered = filter === "All" ? monthJobs : monthJobs.filter(j => j.status === filter);

  const save = (data: Partial<Job>): void => {
    let nj: Job[];
    if (data.id) {
      nj = jobs.map(j => (j.id === data.id ? ({ ...j, ...data } as Job) : j));
    } else {
      const fresh: Job = {
        ...(data as Job),
        id: "j" + Date.now(),
        createdAt: new Date().toISOString(),
        checkIn: null,
        checkOut: null,
      };
      nj = [...jobs, fresh];
    }
    setJobs(nj);
    dbSync("jobs", nj);
    toast.success(data.id ? "Job updated" : "Job created");
    setModal(null);
  };

  const advance = (id: string, ns: string): void => {
    setJobs(js => js.map(j => (j.id === id ? { ...j, status: ns } : j)));
    toast.info(`Job moved to ${ns}`);
  };

  const del = (id: string): void => {
    confirm("Delete this job?", () => {
      setJobs(js => js.filter(j => j.id !== id));
      dbDelete("jobs", id);
      toast.success("Job deleted");
    });
  };

  const canEdit = user.role !== "Technician";
  const isTech = user.role === "Technician";

  // ── Print report helpers ───────────────────────────────────────────────
  const statsOf = (list: Job[]): JobStats => {
    const closed = list.filter(j => j.status === "Closed" || j.status === "Completed").length;
    const pending = list.filter(j => !["Closed", "Completed"].includes(j.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = list.filter(j => j.date && j.date < today && !["Closed", "Completed"].includes(j.status)).length;
    const byClient: Record<string, number> = {};
    list.forEach(j => {
      const k = j.clientName || "Unknown";
      byClient[k] = (byClient[k] || 0) + 1;
    });
    return { total: list.length, closed, pending, overdue, byClient };
  };

  const kpisOf = (s: JobStats): KpiEntry[] => [
    { label: "Total Jobs", value: s.total },
    { label: "Closed", value: s.closed, color: "#16a34a" },
    { label: "Pending", value: s.pending, color: AMBER },
    { label: "Overdue", value: s.overdue, color: s.overdue > 0 ? RED : "#6b7280" },
  ];

  const jobRow = (j: Job): string =>
    `<tr><td>${fmtD(j.createdAt || j.date)}</td><td>${j.clientName || "--"}</td><td>${j.svc || "--"}</td><td>${fmtD(j.date)||"--"}</td><td>${j.sup||"--"}</td><td>${j.techs||"--"}</td><td>${j.status||"--"}</td></tr>`;

  const jobTable = (list: Job[]): string =>
    list.length === 0
      ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0">No jobs</p>`
      : `<table><thead><tr><th>Created</th><th>Client</th><th>Service</th><th>Scheduled</th><th>Supervisor</th><th>Crew</th><th>Status</th></tr></thead><tbody>${list.map(jobRow).join("")}</tbody></table>`;

  const clientBreakdown = (s: JobStats): string => {
    const rows = Object.entries(s.byClient).sort((a, b) => b[1] - a[1]).slice(0, 15);
    if (!rows.length) return "";
    return `<table style="margin-top:6px"><thead><tr><th>Client</th><th style="text-align:right">Jobs</th></tr></thead><tbody>${rows.map(([n, c]) => `<tr><td>${n}</td><td style="text-align:right">${c}</td></tr>`).join("")}</tbody></table>`;
  };

  const printMonth = (): void => {
    if (monthJobs.length === 0) { alert(`No jobs created in ${mkLabel(selMK)}`); return; }
    const s = statsOf(monthJobs);
    openPrintWin(buildReportHtml({
      moduleName: "Jobs",
      periodLabel: mkLabel(selMK),
      summaryKpis: kpisOf(s),
      sections: [
        { label: "Jobs Created in " + mkLabel(selMK), table: jobTable(monthJobs) },
        { label: "By Client", table: clientBreakdown(s) },
      ],
    }));
  };

  const printAll = (): void => {
    if (jobs.length === 0) { alert("No jobs recorded yet"); return; }
    const s = statsOf(jobs);
    const byMonth: Record<string, Job[]> = {};
    jobs.forEach(j => {
      const mk = monthOf(j, getMK);
      if (!mk) return;
      (byMonth[mk] = byMonth[mk] || []).push(j);
    });
    const months = Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({
      moduleName: "Jobs",
      periodLabel: "All History",
      summaryKpis: [...kpisOf(s), { label: "Unique Clients", value: Object.keys(s.byClient).length, color: BLUE }],
      sections: months.map(mk => {
        const sub = statsOf(byMonth[mk]);
        return { label: `${mkLabel(mk)} — ${sub.total} job(s)`, kpis: kpisOf(sub), table: jobTable(byMonth[mk]) };
      }),
    }));
  };

  return (
    <div className="space-y-5">{confirmEl}
      {/* Month tabs + Print buttons */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <MonthTabs records={jobs} getMK={getMK} selMK={selMK} setSelMK={setSelMK} />
        <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["All", ...JOB_STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border ${filter === s ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200"}`}
              style={filter === s ? { background: s === "All" ? GD : (STATUS_COLORS[s]?.color || G) } : {}}>
              {s} ({s === "All" ? monthJobs.length : monthJobs.filter(j => j.status === s).length})
            </button>
          ))}
        </div>
        {canEdit && (
          <button onClick={() => setModal({ date: defaultDateForMK(selMK) })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
            <Plus size={14} />New Job
          </button>
        )}
      </div>
      <Card>
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {monthJobs.length === 0 ? `No jobs created in ${mkLabel(selMK)}` : "No jobs match this filter"}
            </div>
          )}
          {filtered.map(j => {
            const sc = STATUS_COLORS[j.status] || ({} as { color?: string });
            const ns = JOB_STATUSES[JOB_STATUSES.indexOf(j.status as typeof JOB_STATUSES[number]) + 1];
            const canCI = isTech && j.status === "Assigned" && !j.checkIn;
            const canCO = isTech && j.status === "In Progress" && !!j.checkIn && !j.checkOut;
            const so = j.signOff as SignOff | undefined;
            return (
              <div key={j.id} className="px-5 py-4 hover:bg-gray-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: sc.color || G }}>{(j.clientName || "?")[0]}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{j.clientName}</p>
                        <span className="text-xs text-gray-400"></span>
                        <span className="text-xs text-gray-500">{j.svc}</span>
                        <span className="text-xs text-gray-400"></span>
                        <span className="text-xs text-gray-500">{fmtD(j.date)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sup: {j.sup || "--"}  Crew: {j.techs || "--"}{j.loc ? `  📍 ${j.loc}` : ""}
                        {j.sourceRequestId ? <span className="ml-1 text-blue-400 font-medium">· From Request</span> : null}
                      </p>
                      {j.checkIn && (
                        <p className="text-xs text-green-600 mt-0.5">
                          In: {fmtDT(j.checkIn)}{j.checkOut ? `  Out: ${fmtDT(j.checkOut)}  ${calcDur(j.checkIn, j.checkOut)}` : ""}
                        </p>
                      )}
                      {so && (
                        <p className="text-xs mt-0.5">
                          {so.notPresent
                            ? <span style={{ color: AMBER }}>⚠ Client not present at checkout</span>
                            : <span style={{ color: G }}>★ {so.rating}/5 — {so.clientName}{so.remarks ? ` · "${so.remarks}"` : ""}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SBadge s={j.status} />
                    <div className="flex gap-1">
                      {canCI && <button onClick={() => setGpsModal({ job: j, type: "in" })} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{ background: G }}>Check In</button>}
                      {canCO && <button onClick={() => setGpsModal({ job: j, type: "out" })} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{ background: O }}>Check Out</button>}
                      {canEdit && ns && !["Closed"].includes(j.status) && (
                        <button onClick={() => advance(j.id, ns)} className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-0.5" style={{ background: BLUE }}>
                          <ArrowRight size={9} />{ns}
                        </button>
                      )}
                      {canEdit && <button onClick={() => setModal(j)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={12} /></button>}
                      {canEdit && <button onClick={() => del(j.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={12} /></button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {modal !== null && (
        <ModalWrap title={modal.id ? "Edit Job" : "Create Job"} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Client" col>
              <ContactSearchSelect value={modal.clientName || ""} onSelect={name => setModal(p => ({ ...(p || {}), clientName: name }))} clients={clients} contacts={contacts} />
            </Fld>
            <Fld label="Service">
              <select className={inp} value={modal.svc || "Cleaning"} onChange={e => setModal(p => ({ ...(p || {}), svc: e.target.value }))}>
                <option>Cleaning</option><option>Pest Control</option><option>Both</option><option>Deep Cleaning</option>
              </select>
            </Fld>
            <Fld label="Scheduled Date">
              <input className={inp} type="date" value={modal.date || ""} onChange={e => setModal(p => ({ ...(p || {}), date: e.target.value }))} />
            </Fld>
            <Fld label="Status">
              <select className={inp} value={modal.status || "New"} onChange={e => setModal(p => ({ ...(p || {}), status: e.target.value }))}>
                {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Fld>
            <Fld label="Supervisor">
              <StaffSelect staff={staff} value={modal.sup || ""} onChange={v => setModal(p => ({ ...(p || {}), sup: v }))} placeholder="-- Select supervisor --"
                filter={(s: Staff) => s.category === "Office Staff" || s.role === "Team Lead" || s.role === "Supervisor"} />
            </Fld>
            <Fld label="Lead Technician">
              <StaffSelect staff={staff} value={modal.techs || ""} onChange={v => setModal(p => ({ ...(p || {}), techs: v }))} placeholder="-- Select technician --"
                filter={(s: Staff) => s.category === "Cleaning Staff" || s.category === "Gardening Staff"} />
            </Fld>
            <Fld label="Location">
              <input className={inp} value={modal.loc || ""} onChange={e => setModal(p => ({ ...(p || {}), loc: e.target.value }))} placeholder="Site address or description" />
            </Fld>
            <Fld label="Notes" col>
              <textarea className={inp} rows={3} value={modal.notes || ""} onChange={e => setModal(p => ({ ...(p || {}), notes: e.target.value }))} />
            </Fld>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={() => save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>{modal.id ? "Save" : "Create"}</button>
          </div>
        </ModalWrap>
      )}
      {gpsModal && (
        <GpsModal job={gpsModal.job} type={gpsModal.type}
          onSave={(data: Job) => { setJobs(js => js.map(j => (j.id === data.id ? data : j))); setGpsModal(null); }}
          onClose={() => setGpsModal(null)} />
      )}
    </div>
  );
}

// ── GpsModal ────────────────────────────────────────────────────────────────
interface GpsModalProps {
  job: Job;
  type: "in" | "out";
  onSave: (updated: Job) => void;
  onClose: () => void;
}

function GpsModal({ job, type, onSave, onClose }: GpsModalProps) {
  // gpsError = true means GPS is unavailable; loc = null means still loading
  const [loc, setLoc] = useState<GpsLoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<boolean>(false); // hard block — no fake coords
  const [step, setStep] = useState<1 | 2>(1);
  const [signOff, setSignOff] = useState<SignOff>({ rating: 0, clientName: "", remarks: "", notPresent: false });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        setLoc({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          acc: Math.round(pos.coords.accuracy),
        });
        setLoading(false);
      },
      (_err: GeolocationPositionError) => {
        setGpsError(true);
        setLoading(false);
      },
      { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
    );
  }, []);

  const doSave = (): void => {
    const now = new Date().toISOString().slice(0, 16);
    const gs = loc ? `${loc.lat}N, ${loc.lng}E (±${loc.acc}m)` : "Unavailable";
    let updated: Job;
    if (type === "in") {
      updated = { ...job, status: "In Progress", checkIn: now, gpsIn: gs } as Job;
    } else {
      const finalSignOff: SignOff = {
        rating: signOff.notPresent ? 0 : signOff.rating,
        clientName: signOff.notPresent ? "Not present" : signOff.clientName,
        remarks: signOff.remarks,
        notPresent: signOff.notPresent,
        confirmedBy: "technician",
        timestamp: now,
      };
      updated = { ...job, status: "Awaiting Approval", checkOut: now, gpsOut: gs, signOff: finalSignOff } as Job;
    }
    onSave(updated);
    // When offline: persist to queue so data isn't lost on page reload
    if (!navigator.onLine) {
      queueOfflineAction("job_update", updated);
      Toaster._add?.(`Check-${type === "in" ? "in" : "out"} saved — will sync when reconnected`, "info");
    }
  };

  // GPS hard-block screen — shown instead of fake coords
  if (gpsError) {
    return (
      <ModalWrap title={type === "in" ? "📍 GPS Check-In" : "📍 GPS Check-Out"} onClose={onClose}>
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl" style={{ background: "#fee2e2" }}>📵</div>
          <div>
            <p className="font-bold text-gray-800 text-base">GPS Location Unavailable</p>
            <p className="text-sm text-gray-500 mt-2">Your device could not get a GPS fix.<br />This can happen indoors or when location permission is denied.</p>
          </div>
          <div className="p-4 rounded-xl text-sm text-left space-y-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <p className="font-bold text-amber-800">What to do:</p>
            <ul className="text-amber-700 space-y-1 list-disc list-inside text-xs">
              <li>Step outside or move to an open area</li>
              <li>Check that location permission is allowed for this app in your phone settings</li>
              <li>Ask your supervisor to manually verify and log your check-{type === "in" ? "in" : "out"}</li>
            </ul>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Close</button>
        </div>
      </ModalWrap>
    );
  }

  if (type === "out" && step === 2) {
    return (
      <ModalWrap title="✅ Client Sign-Off" onClose={onClose}>
        <div className="space-y-5">
          <div className="p-3 rounded-xl text-center text-sm font-semibold text-green-800" style={{ background: GL }}>{job.clientName} — checkout complete</div>
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${signOff.notPresent ? "border-amber-400 bg-amber-50" : "border-gray-200"}`}>
            <input type="checkbox" checked={signOff.notPresent}
              onChange={e => setSignOff(p => ({ ...p, notPresent: e.target.checked, rating: 0, clientName: "" }))}
              className="w-4 h-4 accent-amber-500" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Client not present at checkout</p>
              <p className="text-xs text-gray-400">Job will be flagged for supervisor follow-up</p>
            </div>
          </label>
          {!signOff.notPresent && (
            <>
              <StarRating label="Client Satisfaction" value={signOff.rating} onChange={v => setSignOff(p => ({ ...p, rating: v }))} />
              <Fld label="Client Name / Contact">
                <input className={inp} value={signOff.clientName} onChange={e => setSignOff(p => ({ ...p, clientName: e.target.value }))} placeholder="Name of person who confirmed the work" />
              </Fld>
              <Fld label="Remarks (optional)">
                <textarea className={inp} rows={2} value={signOff.remarks} onChange={e => setSignOff(p => ({ ...p, remarks: e.target.value }))} placeholder="Any feedback from client…" />
              </Fld>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setStep(1)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Back</button>
          <button onClick={doSave} disabled={!signOff.notPresent && signOff.rating === 0}
            className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: O }}>
            Submit Check-Out
          </button>
        </div>
      </ModalWrap>
    );
  }

  return (
    <ModalWrap title={type === "in" ? "📍 GPS Check-In" : "📍 GPS Check-Out"} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 rounded-2xl text-center" style={{ background: GL }}><p className="font-bold text-green-800">{job.clientName}</p></div>
        {loading
          ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500">Acquiring GPS signal… (up to 15s)</p>
              <p className="text-xs text-gray-400">Move to an open area if this takes too long</p>
            </div>
          )
          : (
            <div className="p-4 rounded-xl" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
              <p className="text-xs font-bold text-blue-700 mb-2">✅ Location Captured</p>
              {loc && (
                <>
                  <p className="text-sm text-blue-800 font-mono">Lat: {loc.lat}°N</p>
                  <p className="text-sm text-blue-800 font-mono">Lng: {loc.lng}°E</p>
                  <p className="text-xs text-blue-500 mt-1">Accuracy: ±{loc.acc}m</p>
                </>
              )}
              <p className="text-xs text-blue-400 mt-2">{new Date().toLocaleString("en-GB")}</p>
            </div>
          )}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={type === "in" ? doSave : () => setStep(2)} disabled={loading || !loc}
          className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
          style={{ background: type === "in" ? G : O }}>
          {loading ? "Locating…" : type === "in" ? "Confirm Check-In ✓" : "Next: Sign-Off →"}
        </button>
      </div>
    </ModalWrap>
  );
}
