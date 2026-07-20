// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Automations page (Phase C2)
//  Build and monitor trigger→action rules. The engine itself is pure
//  (lib/workflow-engine.ts); execution happens in App.tsx's effect. This
//  page is config + audit: rule list with active toggles, a builder modal,
//  and the recent run ledger.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Zap, Plus, Edit2, Trash2, Play, Pause } from "lucide-react";
import { G, O, BLUE, inp } from "../lib/constants";
import { fmtDT } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Workflow, WorkflowRun, AppUser, CurrentUser } from "../lib/schemas";

const TRIGGERS = [
  { id: "lead_created",       label: "Lead created",                 hint: "Fires once for every new pipeline lead" },
  { id: "lead_stage_changed", label: "Lead reaches stage…",         hint: "Fires when a lead sits in the chosen stage" },
  { id: "job_completed",      label: "Job completed",               hint: "Fires when a job is Completed or Closed" },
  { id: "contract_expiring",  label: "Contract expiring…",          hint: "Fires when a client contract is within N days of end" },
  { id: "schedule_due",       label: "Pest schedule due…",          hint: "Fires when a recurring treatment is within N days" },
] as const;

const ACTIONS = [
  { id: "create_task",   label: "Create a task",       hint: "Adds a task to someone's plate (templates allowed)" },
  { id: "send_whatsapp", label: "Send WhatsApp message", hint: "Messages the subject's phone via the Inbox (needs a phone)" },
] as const;

const PLACEHOLDER_HELP = "Placeholders: {name} {phone} {svc} {loc} {date} {value} {owner}";

type Draft = Partial<Workflow> & { _new?: boolean };

export interface AutomationsPageProps {
  workflows: Workflow[];
  setWorkflows: Dispatch<SetStateAction<Workflow[]>>;
  workflowRuns: WorkflowRun[];
  users: AppUser[];
  user: CurrentUser;
}

export function AutomationsPage({ workflows, setWorkflows, workflowRuns, users, user }: AutomationsPageProps) {
  const toast = useToast();
  const [confirm, confirmEl] = useConfirm();
  const [modal, setModal] = useState<Draft | null>(null);

  const assigneePool = useMemo(
    () => [...new Set(users.map(u => String(u.name || "")).filter(Boolean))].sort(),
    [users],
  );

  const recentRuns = useMemo(
    () => [...workflowRuns].sort((a, b) => (b.firedAt || "").localeCompare(a.firedAt || "")).slice(0, 30),
    [workflowRuns],
  );

  const persist = (next: Workflow[]): void => {
    setWorkflows(next);
    dbSync("workflows", next, () => toast.error("Workflow change failed to sync"));
  };

  const save = (d: Draft): void => {
    if (!d.name || !d.trigger || !d.action) { toast.info("Name, trigger and action are required"); return; }
    const id = d.id || `wf${Date.now()}`;
    const row: Workflow = {
      ...(d as Workflow), id,
      active: d.active !== false,
      createdBy: d.createdBy || user.name,
      createdAt: d.createdAt || new Date().toISOString(),
    } as Workflow;
    persist(d.id ? workflows.map(w => (String(w.id) === id ? row : w)) : [row, ...workflows]);
    toast.success(d.id ? "Automation updated" : "Automation created — it evaluates on next data load");
    setModal(null);
  };

  const toggle = (id: string): void =>
    persist(workflows.map(w => (String(w.id) === id ? { ...w, active: w.active === false } as Workflow : w)));

  const del = (id: string): void => confirm("Delete this automation? Its run history stays in the log.", () => {
    setWorkflows(prev => prev.filter(w => String(w.id) !== id));
    dbDelete("workflows", id).catch(() => {});
    toast.success("Automation deleted");
  });

  const trigLabel = (w: Workflow): string => {
    const t = TRIGGERS.find(x => x.id === w.trigger);
    const cfg = (w.triggerConfig as Record<string, unknown>) || {};
    if (w.trigger === "lead_stage_changed") return `Lead reaches ${cfg.stage || "?"}`;
    if (w.trigger === "contract_expiring") return `Contract expiring in ${cfg.daysBefore || 30}d`;
    if (w.trigger === "schedule_due") return `Schedule due in ${cfg.daysBefore || 7}d`;
    return t?.label || String(w.trigger);
  };
  const actLabel = (w: Workflow): string => {
    const cfg = (w.actionConfig as Record<string, unknown>) || {};
    if (w.action === "create_task") return `Task: "${String(cfg.title || "").slice(0, 40)}"${cfg.assignee ? ` → ${cfg.assignee}` : ""}`;
    if (w.action === "send_whatsapp") return `WhatsApp: "${String(cfg.message || "").slice(0, 40)}…"`;
    return String(w.action);
  };

  const resultBadge = (r: string): { s: string; custom: { bg: string; color: string; border: string } } => {
    if (r === "task_created")   return { s: "Task created",  custom: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" } };
    if (r === "whatsapp_sent")  return { s: "WhatsApp sent", custom: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" } };
    if (r === "skipped_no_phone") return { s: "No phone",    custom: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" } };
    if (r === "pending")        return { s: "Pending",       custom: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" } };
    return { s: r || "Error",   custom: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" } };
  };

  return (
    <div className="space-y-5">
      {confirmEl}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Zap size={16} style={{ color: O }} /> Automations</h2>
          <p className="text-xs text-gray-400 mt-0.5">When something happens, do something — without anyone remembering to.</p>
        </div>
        <button onClick={() => setModal({ _new: true, active: true, trigger: "lead_created", action: "create_task", triggerConfig: {}, actionConfig: {} })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
          <Plus size={14} /> New Automation
        </button>
      </div>

      {/* Rules */}
      <Card className="p-0 overflow-hidden">
        {workflows.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Zap size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm text-gray-500">No automations yet.</p>
            <p className="text-xs text-gray-400 mt-1">Try: "Job completed → WhatsApp a review request" or "Contract expiring in 30d → task for renewal call".</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {workflows.map(w => {
              const active = w.active !== false;
              return (
                <div key={String(w.id)} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/60">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${active ? "text-gray-800" : "text-gray-400"}`}>{w.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium" style={{ color: BLUE }}>{trigLabel(w)}</span>
                      <span className="mx-1.5 text-gray-300">→</span>
                      <span className="font-medium" style={{ color: G }}>{actLabel(w)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggle(String(w.id))} title={active ? "Pause" : "Activate"}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold border"
                      style={active ? { color: G, borderColor: G, background: "#f0fdf4" } : { color: "#9ca3af", borderColor: "#e5e7eb" }}>
                      {active ? <><Pause size={11} /> Active</> : <><Play size={11} /> Paused</>}
                    </button>
                    <button onClick={() => setModal({ ...w })} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={12} /></button>
                    <button onClick={() => del(String(w.id))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Run ledger */}
      <Card className="p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Runs</h3>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nothing has fired yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentRuns.map(r => {
              const b = resultBadge(r.result || "");
              return (
                <div key={String(r.id)} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-semibold">{r.workflowName || r.workflowId}</span>
                      <span className="text-gray-400"> · {r.subjectLabel || r.subjectId}</span>
                    </p>
                    <p className="text-xs text-gray-400">{r.firedAt ? fmtDT(r.firedAt) : ""}</p>
                  </div>
                  <SBadge s={b.s} custom={b.custom} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Builder modal */}
      {modal && (
        <ModalWrap title={modal._new ? "New Automation" : "Edit Automation"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Fld label="Name" required>
              <input className={inp} value={modal.name || ""} onChange={e => setModal(p => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Review request after every job" />
            </Fld>

            <Fld label="When (trigger)">
              <select className={inp} value={modal.trigger || "lead_created"} onChange={e => setModal(p => p ? { ...p, trigger: e.target.value, triggerConfig: {} } : p)}>
                {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">{TRIGGERS.find(t => t.id === modal.trigger)?.hint}</p>
            </Fld>

            {modal.trigger === "lead_stage_changed" && (
              <Fld label="Stage">
                <select className={inp} value={String((modal.triggerConfig as any)?.stage || "Won")}
                  onChange={e => setModal(p => p ? { ...p, triggerConfig: { ...(p.triggerConfig as object), stage: e.target.value } } : p)}>
                  {["New", "Contacted", "Quoted", "Won", "Lost"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Fld>
            )}
            {(modal.trigger === "contract_expiring" || modal.trigger === "schedule_due") && (
              <Fld label="Days before">
                <input className={inp} type="number" min="1"
                  value={Number((modal.triggerConfig as any)?.daysBefore) || (modal.trigger === "contract_expiring" ? 30 : 7)}
                  onChange={e => setModal(p => p ? { ...p, triggerConfig: { ...(p.triggerConfig as object), daysBefore: Number(e.target.value) } } : p)} />
              </Fld>
            )}

            <Fld label="Then (action)">
              <select className={inp} value={modal.action || "create_task"} onChange={e => setModal(p => p ? { ...p, action: e.target.value, actionConfig: {} } : p)}>
                {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">{ACTIONS.find(a => a.id === modal.action)?.hint}</p>
            </Fld>

            {modal.action === "create_task" && (<>
              <Fld label="Task title" required>
                <input className={inp} value={String((modal.actionConfig as any)?.title || "")}
                  onChange={e => setModal(p => p ? { ...p, actionConfig: { ...(p.actionConfig as object), title: e.target.value } } : p)}
                  placeholder="e.g. Call {name} about contract renewal" />
              </Fld>
              <Fld label="Assign to">
                <select className={inp} value={String((modal.actionConfig as any)?.assignee || "")}
                  onChange={e => setModal(p => p ? { ...p, actionConfig: { ...(p.actionConfig as object), assignee: e.target.value } } : p)}>
                  <option value="">— Subject's owner (or unassigned) —</option>
                  {assigneePool.map(a => <option key={a}>{a}</option>)}
                </select>
              </Fld>
            </>)}
            {modal.action === "send_whatsapp" && (
              <Fld label="Message" required>
                <textarea className={inp} rows={3} value={String((modal.actionConfig as any)?.message || "")}
                  onChange={e => setModal(p => p ? { ...p, actionConfig: { ...(p.actionConfig as object), message: e.target.value } } : p)}
                  placeholder="e.g. Hello {name}! Thanks for having us today — we'd love a quick rating of the {svc} service." />
              </Fld>
            )}
            <p className="text-xs text-gray-400">{PLACEHOLDER_HELP}</p>
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={() => save(modal)} disabled={!modal.name}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>
              {modal._new ? "Create" : "Save Changes"}
            </button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
