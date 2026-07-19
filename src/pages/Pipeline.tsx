// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Sales Pipeline (Phase A)
//
//  The CRM front half: a kanban board of Leads moving through sales stages.
//  Spawned from inbound Service Requests (commit 3), handed off to Jobs on Won
//  (commit 5). Dependency-free drag: native HTML5 draggable on desktop PLUS
//  prev/next stage buttons on every card so it works on a phone in the field.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, type Dispatch, type SetStateAction, type DragEvent } from "react";
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Phone, MapPin, User as UserIcon, ArrowDownToLine } from "lucide-react";
import { G, O, RED, BLUE, AMBER, inp } from "../lib/constants";
import { fmt, fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Lead, AppUser, Client, CurrentUser, Request_, Job, SiteReport } from "../lib/schemas";
import { Contact360 } from "../components/Contact360";

// ── Stage model ──────────────────────────────────────────────────────────────
// The five sales stages. Won/Lost are terminal; Won triggers the Jobs handoff
// (commit 5). Order matters — it drives the prev/next buttons and column layout.
export const STAGES = ["New", "Contacted", "Quoted", "Won", "Lost"] as const;
export type Stage = typeof STAGES[number];

const STAGE_STYLE: Record<Stage, { bg: string; color: string; dot: string }> = {
  "New":       { bg: "#eff6ff", color: "#1e40af", dot: BLUE },
  "Contacted": { bg: "#fff7ed", color: "#9a3412", dot: O },
  "Quoted":    { bg: "#fefce8", color: "#854d0e", dot: AMBER },
  "Won":       { bg: "#dcfce7", color: "#166534", dot: G },
  "Lost":      { bg: "#fef2f2", color: "#991b1b", dot: RED },
};

const SOURCES = ["WhatsApp", "Phone", "Referral", "Website", "Walk-in", "Email"];

const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const stageOf = (l: Lead): Stage => (STAGES.includes((l.stage as Stage)) ? (l.stage as Stage) : "New");

type LeadDraft = Partial<Lead> & { _isNew?: boolean };

export interface PipelinePageProps {
  leads: Lead[];
  setLeads: Dispatch<SetStateAction<Lead[]>>;
  users: AppUser[];
  clients: Client[];
  user: CurrentUser;
  /** Phase A 3/5: pending Service Requests logged before the pipeline
   *  existed can be pulled onto the board in bulk. Dedup by requestId. */
  requests?: Request_[];
  /** Phase A 4/5: feed the Contact-360 timeline opened from a lead card. */
  jobs?: Job[];
  reports?: SiteReport[];
  /** Phase A 5/5: Won → hand off to the Jobs module. */
  setJobs?: Dispatch<SetStateAction<Job[]>>;
}

export function PipelinePage({ leads, setLeads, users, clients, user, requests = [], jobs = [], reports = [], setJobs }: PipelinePageProps) {
  const toast = useToast();
  const [confirm, confirmEl] = useConfirm();
  const [modal, setModal] = useState<LeadDraft | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>("All");
  const [filterSource, setFilterSource] = useState<string>("All");
  const [dragId, setDragId] = useState<string | null>(null);
  // Contact whose 360° timeline is open; null = closed.
  const [contact360, setContact360] = useState<string | null>(null);

  const ownerPool = useMemo<string[]>(
    () => [...new Set(users.filter(u => u.role === "Supervisor" || u.role === "Admin").map(u => String(u.name || "")).filter(Boolean))].sort(),
    [users],
  );

  const visible = useMemo<Lead[]>(
    () => leads.filter(l =>
      (filterOwner === "All" || (l.ownerName || "") === filterOwner) &&
      (filterSource === "All" || (l.source || "") === filterSource)),
    [leads, filterOwner, filterSource],
  );

  const byStage = (s: Stage): Lead[] => visible.filter(l => stageOf(l) === s);
  const stageValue = (s: Stage): number => byStage(s).reduce((sum, l) => sum + n(l.value), 0);
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const persist = (next: Lead[]) => {
    setLeads(next);
    dbSync("leads", next, () => toast.error("Lead change failed to sync — check your connection"));
  };

  // Shared transition entry point for every stage-change surface (arrow
  // buttons, drag-drop, modal select). Terminal stages carry side effects:
  //   Lost → prompt for a reason (win/loss analysis; skippable)
  //   Won  → hand off to the Jobs module: create a Job seeded from the lead
  //          and link it back via jobId (dedup — a lead only ever spawns one)
  const transition = (id: string, newStage: Stage): void => {
    const target = leads.find(l => String(l.id) === id);
    if (!target || stageOf(target) === newStage) return;

    let lostReason = "";
    if (newStage === "Lost") {
      lostReason = window.prompt("Why was this lead lost? (optional — feeds win/loss analysis)") || "";
    }

    let spawnedJob: Job | null = null;
    if (newStage === "Won" && setJobs && !target.jobId) {
      spawnedJob = {
        id: "j" + Date.now(),
        createdAt: new Date().toISOString(),
        clientName: target.contactName, clientPhone: target.contactPhone || "",
        loc: target.loc || "", svc: target.svc || "Cleaning",
        date: target.nextActionDate || "",
        sup: target.ownerName || "", techs: "", status: "New",
        notes: target.notes ? `From pipeline: ${target.notes}` : "Won from Sales Pipeline",
        sourceRequestId: target.requestId || "", checkIn: null, checkOut: null,
      } as Job;
    }

    const next = leads.map(l => {
      if (String(l.id) !== id) return l;
      const stamped = stampStage(l, newStage);
      return {
        ...stamped,
        ...(lostReason ? { lostReason } : {}),
        ...(spawnedJob ? { jobId: String(spawnedJob.id) } : {}),
      } as Lead;
    });
    persist(next);

    if (spawnedJob && setJobs) {
      setJobs(prev => {
        const updated = [...prev, spawnedJob as Job];
        dbSync("jobs", updated, () => toast.error("Job creation failed to sync — check your connection"));
        return updated;
      });
      toast.success(`Won 🎉 — job created${target.ownerName ? ` and assigned to ${target.ownerName}` : ""}`);
    }
  };

  const moveStage = (id: string, dir: -1 | 1): void => {
    const l = leads.find(x => String(x.id) === id);
    if (!l) return;
    const idx = STAGES.indexOf(stageOf(l));
    const ni = Math.max(0, Math.min(STAGES.length - 1, idx + dir));
    transition(id, STAGES[ni]);
  };

  const setStageDirect = (id: string, newStage: Stage): void => transition(id, newStage);

  // Append a stage transition to history + stamp derived fields.
  const stampStage = (l: Lead, newStage: Stage): Lead => {
    const now = new Date().toISOString();
    const history = [...(((l.stageHistory as any[]) || [])), { stage: newStage, at: now, by: user.name }];
    return {
      ...l, stage: newStage, updatedAt: now, stageHistory: history,
      ...(newStage === "Won" ? { wonAt: now } : {}),
    } as Lead;
  };

  const saveLead = (draft: LeadDraft): void => {
    if (!draft.contactName) { toast.info("Contact name is required"); return; }
    const now = new Date().toISOString();
    const id = draft.id || `lead${Date.now()}`;
    const next: Lead = {
      ...(draft as Lead), id,
      stage: draft.stage || "New",
      ownerName: draft.ownerName || user.name,
      createdAt: draft.createdAt || now, updatedAt: now,
    } as Lead;
    const updated = draft.id ? leads.map(l => (String(l.id) === id ? next : l)) : [next, ...leads];
    persist(updated);
    toast.success(draft.id ? "Lead updated" : "Lead added");
    setModal(null);
  };

  const del = (id: string): void => confirm("Delete this lead?", () => {
    setLeads(prev => prev.filter(l => String(l.id) !== id));
    dbDelete("leads", id).catch(() => {});
    toast.success("Lead deleted");
  });

  // Pending requests that never got a lead (logged before the pipeline
  // shipped, or via a path that bypassed the auto-spawn). Dedup by requestId.
  const importable = useMemo<Request_[]>(() => {
    const linked = new Set(leads.map(l => String(l.requestId || "")).filter(Boolean));
    return requests.filter(r => (r.status || "Pending") === "Pending" && !linked.has(String(r.id)));
  }, [requests, leads]);

  const importPending = (): void => {
    if (importable.length === 0) return;
    confirm(`Add ${importable.length} pending request${importable.length > 1 ? "s" : ""} to the pipeline as New leads?`, () => {
      const now = new Date().toISOString();
      const ts = Date.now();
      const newLeads: Lead[] = importable.map((r, i) => ({
        id: `lead${ts}_${i}`,
        contactName: r.clientName || "Unknown",
        contactPhone: r.clientPhone || "",
        contactEmail: "",
        source: r.src || "Phone",
        svc: r.svc || "",
        loc: r.loc || "",
        stage: "New",
        value: 0,
        ownerName: (r as any).assignedTo || "",
        nextAction: "Contact and qualify",
        nextActionDate: r.prefDate || "",
        notes: r.notes || "",
        requestId: String(r.id),
        stageHistory: [{ stage: "New", at: now, by: `bulk import (${user.name})` }],
        createdAt: now,
      } as Lead));
      persist([...newLeads, ...leads]);
      toast.success(`${newLeads.length} lead${newLeads.length > 1 ? "s" : ""} imported from Service Requests`);
    });
  };

  // ── Drag & drop (native, no dep) ───────────────────────────────────────────
  const onDrop = (e: DragEvent, s: Stage): void => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) setStageDirect(id, s);
    setDragId(null);
  };

  const totalOpen = visible.filter(l => stageOf(l) !== "Won" && stageOf(l) !== "Lost").length;
  const pipelineValue = visible.filter(l => stageOf(l) !== "Lost").reduce((s, l) => s + n(l.value), 0);

  return (
    <div className="space-y-5">
      {confirmEl}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Sales Pipeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalOpen} open lead{totalOpen === 1 ? "" : "s"} · {fmt(pipelineValue)} in pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {importable.length > 0 && (
            <button onClick={importPending}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: BLUE, color: BLUE }}>
              <ArrowDownToLine size={14} /> Import {importable.length} pending request{importable.length > 1 ? "s" : ""}
            </button>
          )}
          <button onClick={() => setModal({ _isNew: true, stage: "New" })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
            <Plus size={14} /> New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Owner</span>
            <select className={`${inp} py-1.5 text-sm w-40`} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
              <option>All</option>{ownerPool.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Source</span>
            <select className={`${inp} py-1.5 text-sm w-36`} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
              <option>All</option>{SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Board — horizontal scroll on small screens */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(s => {
            const list = byStage(s);
            const st = STAGE_STYLE[s];
            return (
              <div key={s} className="w-72 flex-shrink-0"
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => onDrop(e, s)}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-t-xl" style={{ background: st.bg }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: st.dot }} />
                    <span className="text-sm font-bold" style={{ color: st.color }}>{s}</span>
                    <span className="text-xs font-semibold px-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: st.color }}>{list.length}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: st.color }}>{fmt(stageValue(s))}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 p-2 rounded-b-xl min-h-[120px]" style={{ background: "rgba(0,0,0,0.02)" }}>
                  {list.length === 0 && <p className="text-xs text-gray-300 text-center py-6">Drop leads here</p>}
                  {list.map(l => {
                    const idx = STAGES.indexOf(stageOf(l));
                    const overdue = l.nextActionDate && l.nextActionDate < todayStr && stageOf(l) !== "Won" && stageOf(l) !== "Lost";
                    return (
                      <div key={String(l.id)} draggable
                        onDragStart={e => { e.dataTransfer.setData("text/plain", String(l.id)); setDragId(String(l.id)); }}
                        className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-200 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <button onClick={() => setContact360(String(l.contactName || ""))} className="text-sm font-bold text-gray-800 leading-tight hover:underline text-left" title="Open Contact 360°">{l.contactName}</button>
                          {n(l.value) > 0 && <span className="text-xs font-bold flex-shrink-0" style={{ color: G }}>{fmt(n(l.value))}</span>}
                        </div>
                        {l.svc && <p className="text-xs text-gray-500 mt-0.5">{l.svc}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                          {l.contactPhone && <span className="flex items-center gap-1"><Phone size={10} />{l.contactPhone}</span>}
                          {l.loc && <span className="flex items-center gap-1"><MapPin size={10} />{l.loc}</span>}
                          {l.source && <span>· {l.source}</span>}
                        </div>
                        {l.ownerName && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><UserIcon size={10} />{l.ownerName}</p>}
                        {l.nextAction && (
                          <p className={`text-xs mt-1 ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                            → {l.nextAction}{l.nextActionDate ? ` (${fmtD(l.nextActionDate)})` : ""}
                          </p>
                        )}
                        {l.lostReason && stageOf(l) === "Lost" && <p className="text-xs text-red-500 mt-1 italic">Lost: {l.lostReason}</p>}
                        {/* Card actions */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveStage(String(l.id), -1)} disabled={idx === 0}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30" title="Move back a stage"><ChevronLeft size={13} /></button>
                            <button onClick={() => moveStage(String(l.id), 1)} disabled={idx === STAGES.length - 1}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30" title="Advance a stage"><ChevronRight size={13} /></button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal({ ...l })} className="w-6 h-6 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50" title="Edit"><Edit2 size={12} /></button>
                            <button onClick={() => del(String(l.id))} className="w-6 h-6 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New / Edit modal */}
      {modal && (
        <ModalWrap title={modal.id ? "Edit Lead" : "New Lead"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Contact Name" required>
                <input className={inp} value={modal.contactName || ""} onChange={e => setModal(p => p ? { ...p, contactName: e.target.value } : p)} placeholder="Client or company" />
              </Fld>
              <Fld label="Phone"><input className={inp} value={modal.contactPhone || ""} onChange={e => setModal(p => p ? { ...p, contactPhone: e.target.value } : p)} placeholder="080…" /></Fld>
              <Fld label="Email"><input className={inp} type="email" value={modal.contactEmail || ""} onChange={e => setModal(p => p ? { ...p, contactEmail: e.target.value } : p)} /></Fld>
              <Fld label="Service"><select className={inp} value={modal.svc || ""} onChange={e => setModal(p => p ? { ...p, svc: e.target.value } : p)}><option value="">— Select —</option><option>Cleaning</option><option>Pest Control</option><option>Both</option><option>Deep Cleaning</option><option>Fumigation</option></select></Fld>
              <Fld label="Location"><input className={inp} value={modal.loc || ""} onChange={e => setModal(p => p ? { ...p, loc: e.target.value } : p)} placeholder="Site / address" /></Fld>
              <Fld label="Source"><select className={inp} value={modal.source || ""} onChange={e => setModal(p => p ? { ...p, source: e.target.value } : p)}><option value="">— Select —</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></Fld>
              <Fld label="Estimated Value (₦)"><input className={inp} type="number" min="0" value={modal.value ?? ""} onChange={e => setModal(p => p ? { ...p, value: Number(e.target.value) } : p)} /></Fld>
              <Fld label="Stage"><select className={inp} value={modal.stage || "New"} onChange={e => setModal(p => p ? { ...p, stage: e.target.value } : p)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></Fld>
              <Fld label="Owner"><select className={inp} value={modal.ownerName || ""} onChange={e => setModal(p => p ? { ...p, ownerName: e.target.value } : p)}><option value="">— Unassigned —</option>{ownerPool.map(o => <option key={o}>{o}</option>)}</select></Fld>
              <Fld label="Next Action Date"><input className={inp} type="date" value={modal.nextActionDate || ""} onChange={e => setModal(p => p ? { ...p, nextActionDate: e.target.value } : p)} /></Fld>
            </div>
            <Fld label="Next Action"><input className={inp} value={modal.nextAction || ""} onChange={e => setModal(p => p ? { ...p, nextAction: e.target.value } : p)} placeholder="e.g. Send quote, call back Monday" /></Fld>
            {modal.stage === "Lost" && <Fld label="Lost Reason"><input className={inp} value={modal.lostReason || ""} onChange={e => setModal(p => p ? { ...p, lostReason: e.target.value } : p)} placeholder="Why did this fall through?" /></Fld>}
            <Fld label="Notes"><textarea className={inp} rows={2} value={modal.notes || ""} onChange={e => setModal(p => p ? { ...p, notes: e.target.value } : p)} /></Fld>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={() => saveLead(modal)} disabled={!modal.contactName} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>{modal.id ? "Save Changes" : "Add Lead"}</button>
          </div>
        </ModalWrap>
      )}

      {/* Contact 360° — full relationship timeline for the clicked contact */}
      {contact360 && (
        <Contact360
          contactName={contact360}
          onClose={() => setContact360(null)}
          leads={leads}
          requests={requests}
          jobs={jobs}
          reports={reports}
        />
      )}
    </div>
  );
}
