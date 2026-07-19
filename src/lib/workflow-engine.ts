// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Workflow automation engine (Phase C)
//
//  Pure trigger→action evaluation, same discipline as lib/scheduler.ts and
//  lib/task-scheduler.ts: deterministic, idempotent via dedup keys, clock
//  injectable, zero side effects. The React layer executes the returned
//  firings (create task / send WhatsApp) and persists the run ledger.
//
//  Triggers                     Config                 Subject
//  lead_created                 —                      lead
//  lead_stage_changed           { stage }              lead
//  job_completed                —                      job (Completed|Closed)
//  contract_expiring            { daysBefore }         client (ce within window)
//  schedule_due                 { daysBefore }         pest schedule (dueDate)
//
//  Actions (executed by caller)
//  create_task                  { title, assignee, assigneeRole, priority }
//  send_whatsapp                { message }            needs subject phone
//
//  Templates: {name} {phone} {svc} {loc} {date} {value} {owner} placeholders.
// ─────────────────────────────────────────────────────────────────────────────

import type { Workflow, WorkflowRun, Lead, Job, Client, Schedule } from "./schemas";

export interface SubjectVars {
  name: string;
  phone: string;
  svc: string;
  loc: string;
  date: string;
  value: number;
  owner: string;
}

export interface Firing {
  run: WorkflowRun;
  action: "create_task" | "send_whatsapp";
  actionConfig: Record<string, unknown>;
  vars: SubjectVars;
}

/** Replace {placeholders} with subject values. Unknown keys stay literal. */
export function fillTemplate(tpl: string, vars: SubjectVars): string {
  return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => {
    const v = (vars as unknown as Record<string, unknown>)[k];
    return v === undefined || v === null ? m : String(v);
  });
}

const daysUntil = (dateStr: string, today: Date): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr || "")) return null;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - t0.getTime()) / 86400000);
};

export interface ComputeFiringsArgs {
  workflows: Workflow[];
  /** Existing run ledger — dedup store. */
  runs: WorkflowRun[];
  leads: Lead[];
  jobs: Job[];
  clients: Client[];
  schedules: Schedule[];
  now?: Date;
}

export function computeWorkflowFirings({
  workflows, runs, leads, jobs, clients, schedules, now = new Date(),
}: ComputeFiringsArgs): Firing[] {
  const fired = new Set(runs.map(r => r.dedupKey));
  const out: Firing[] = [];
  const nowISO = now.toISOString();
  const seq = { n: 0 }; // unique run ids within one evaluation

  const emit = (
    wf: Workflow, dedupKey: string,
    subjectType: string, subjectId: string, subjectLabel: string,
    vars: SubjectVars,
  ): void => {
    if (fired.has(dedupKey)) return;
    fired.add(dedupKey); // also dedups within this evaluation pass
    out.push({
      run: {
        id: `wr${now.getTime()}_${seq.n++}`,
        workflowId: String(wf.id),
        workflowName: wf.name,
        dedupKey,
        firedAt: nowISO,
        subjectType,
        subjectId,
        subjectLabel,
        result: "pending",
      } as WorkflowRun,
      action: (wf.action === "send_whatsapp" ? "send_whatsapp" : "create_task"),
      actionConfig: (wf.actionConfig as Record<string, unknown>) || {},
      vars,
    });
  };

  for (const wf of workflows) {
    if (wf.active === false || !wf.trigger || !wf.action) continue;
    const cfg = (wf.triggerConfig as Record<string, unknown>) || {};

    switch (wf.trigger) {
      case "lead_created": {
        for (const l of leads) {
          emit(wf, `wf-${wf.id}-leadcreated-${l.id}`, "lead", String(l.id), l.contactName || "Lead", {
            name: l.contactName || "", phone: l.contactPhone || "", svc: l.svc || "",
            loc: l.loc || "", date: l.nextActionDate || "", value: Number(l.value) || 0,
            owner: l.ownerName || "",
          });
        }
        break;
      }
      case "lead_stage_changed": {
        const wanted = String(cfg.stage || "");
        if (!wanted) break;
        for (const l of leads) {
          if ((l.stage || "New") !== wanted) continue;
          emit(wf, `wf-${wf.id}-stage-${l.id}-${wanted}`, "lead", String(l.id), l.contactName || "Lead", {
            name: l.contactName || "", phone: l.contactPhone || "", svc: l.svc || "",
            loc: l.loc || "", date: l.nextActionDate || "", value: Number(l.value) || 0,
            owner: l.ownerName || "",
          });
        }
        break;
      }
      case "job_completed": {
        for (const j of jobs) {
          if (j.status !== "Completed" && j.status !== "Closed") continue;
          emit(wf, `wf-${wf.id}-job-${j.id}`, "job", String(j.id), j.clientName || "Job", {
            name: j.clientName || "", phone: j.clientPhone || "", svc: j.svc || "",
            loc: j.loc || "", date: j.date || "", value: 0, owner: j.sup || "",
          });
        }
        break;
      }
      case "contract_expiring": {
        const win = Number(cfg.daysBefore) || 30;
        for (const c of clients) {
          if (!c.ce) continue;
          const d = daysUntil(c.ce, now);
          if (d === null || d < 0 || d > win) continue;
          emit(wf, `wf-${wf.id}-contract-${c.id}-${c.ce}`, "client", String(c.id), c.name || "Client", {
            name: c.name || "", phone: c.phone || "", svc: c.svc || "",
            loc: c.addr || "", date: c.ce, value: Number(c.tot) || 0, owner: "",
          });
        }
        break;
      }
      case "schedule_due": {
        const win = Number(cfg.daysBefore) || 7;
        for (const s of schedules) {
          if (!s.dueDate) continue;
          const d = daysUntil(s.dueDate, now);
          if (d === null || d < 0 || d > win) continue;
          emit(wf, `wf-${wf.id}-sched-${s.id}-${s.dueDate}`, "schedule", String(s.id), s.clientName || "Schedule", {
            name: s.clientName || "", phone: "", svc: s.service || "",
            loc: "", date: s.dueDate, value: 0, owner: "",
          });
        }
        break;
      }
      default: break;
    }
  }

  return out;
}
