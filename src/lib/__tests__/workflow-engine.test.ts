// Tests for the workflow automation engine (Phase C). Same style as the
// scheduler suites: pinned clock, minimal factories, invariants as names.

import { computeWorkflowFirings, fillTemplate } from "../workflow-engine";
import type { Workflow, WorkflowRun, Lead, Job, Client, Schedule } from "../schemas";

const NOW = new Date(2026, 6, 15, 9, 0, 0); // 15 Jul 2026 local

const wf = (over: Partial<Workflow> = {}): Workflow => ({
  id: "wf1", name: "Test rule", active: true,
  trigger: "lead_created", triggerConfig: {},
  action: "create_task", actionConfig: { title: "Follow up {name}" },
  createdBy: "Admin", createdAt: "",
  ...over,
} as Workflow);

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: "l1", contactName: "Acme Office", contactPhone: "0801", contactEmail: "",
  source: "WhatsApp", svc: "Cleaning", loc: "Abuja", stage: "New", value: 50000,
  ownerName: "James", nextAction: "", nextActionDate: "2026-07-20", notes: "",
  clientId: "", requestId: "", jobId: "", lostReason: "", stageHistory: [],
  createdAt: "2026-07-14T10:00:00.000Z", updatedAt: "", wonAt: "",
  ...over,
} as Lead);

const job = (over: Partial<Job> = {}): Job => ({
  id: "j1", clientName: "Acme Office", clientPhone: "0801", svc: "Cleaning",
  date: "2026-07-10", createdAt: "", sup: "James", techs: "", status: "Completed",
  notes: "", loc: "", checkIn: null, checkOut: null, sourceRequestId: "",
  ...over,
} as Job);

const client = (over: Partial<Client> = {}): Client => ({
  id: "c1", name: "Acme Office", cat: "", svc: "Cleaning", addr: "Abuja",
  cp: "", phone: "0801", email: "", cs: "", ce: "2026-07-30",
  sal: 0, con: 0, sc: 0, vat: 0, tot: 1200000, cleaners: [], duty: "",
  serviceFreq: "", status: "",
  ...over,
} as Client);

const sched = (over: Partial<Schedule> = {}): Schedule => ({
  id: "s1", clientName: "Acme Office", service: "Fumigation",
  dateCarriedOut: "", dueDate: "2026-07-18", notes: "",
  ...over,
} as Schedule);

const base = { workflows: [wf()], runs: [] as WorkflowRun[], leads: [] as Lead[], jobs: [] as Job[], clients: [] as Client[], schedules: [] as Schedule[], now: NOW };

describe("fillTemplate", () => {
  it("substitutes known placeholders", () => {
    expect(fillTemplate("Hi {name}, {svc} at {loc}", { name: "Acme", phone: "", svc: "Cleaning", loc: "Abuja", date: "", value: 0, owner: "" }))
      .toBe("Hi Acme, Cleaning at Abuja");
  });
  it("leaves unknown placeholders literal", () => {
    expect(fillTemplate("Hi {name} {unknown}", { name: "A", phone: "", svc: "", loc: "", date: "", value: 0, owner: "" }))
      .toBe("Hi A {unknown}");
  });
});

describe("computeWorkflowFirings", () => {
  it("fires lead_created once per lead", () => {
    const out = computeWorkflowFirings({ ...base, leads: [lead()] });
    expect(out).toHaveLength(1);
    expect(out[0].run.dedupKey).toBe("wf-wf1-leadcreated-l1");
    expect(out[0].vars.name).toBe("Acme Office");
    expect(out[0].action).toBe("create_task");
  });

  it("is idempotent — a run with the same dedupKey suppresses re-fire", () => {
    const first = computeWorkflowFirings({ ...base, leads: [lead()] });
    const ledger = [first[0].run];
    const second = computeWorkflowFirings({ ...base, leads: [lead()], runs: ledger });
    expect(second).toEqual([]);
  });

  it("skips inactive workflows", () => {
    const out = computeWorkflowFirings({ ...base, workflows: [wf({ active: false })], leads: [lead()] });
    expect(out).toEqual([]);
  });

  it("lead_stage_changed fires only for the configured stage, deduped per lead+stage", () => {
    const w = wf({ id: "wf2", trigger: "lead_stage_changed", triggerConfig: { stage: "Won" } });
    const notYet = computeWorkflowFirings({ ...base, workflows: [w], leads: [lead({ stage: "Quoted" })] });
    expect(notYet).toEqual([]);
    const won = computeWorkflowFirings({ ...base, workflows: [w], leads: [lead({ stage: "Won" })] });
    expect(won).toHaveLength(1);
    expect(won[0].run.dedupKey).toBe("wf-wf2-stage-l1-Won");
  });

  it("job_completed fires for Completed and Closed, not for open statuses", () => {
    const w = wf({ id: "wf3", trigger: "job_completed" });
    const out = computeWorkflowFirings({
      ...base, workflows: [w],
      jobs: [job({ id: "j1", status: "Completed" }), job({ id: "j2", status: "Closed" }), job({ id: "j3", status: "In Progress" })],
    });
    expect(out).toHaveLength(2);
    expect(out.map(f => f.run.subjectId).sort()).toEqual(["j1", "j2"]);
  });

  it("contract_expiring respects the daysBefore window and skips already-expired", () => {
    const w = wf({ id: "wf4", trigger: "contract_expiring", triggerConfig: { daysBefore: 30 } });
    const out = computeWorkflowFirings({
      ...base, workflows: [w],
      clients: [
        client({ id: "c1", ce: "2026-07-30" }),  // 15 days out — fires
        client({ id: "c2", ce: "2026-09-30" }),  // 77 days — outside window
        client({ id: "c3", ce: "2026-07-01" }),  // expired — no fire
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].run.subjectId).toBe("c1");
    expect(out[0].vars.date).toBe("2026-07-30");
  });

  it("schedule_due fires within window; dedup includes dueDate so the NEXT cycle fires again", () => {
    const w = wf({ id: "wf5", trigger: "schedule_due", triggerConfig: { daysBefore: 7 } });
    const first = computeWorkflowFirings({ ...base, workflows: [w], schedules: [sched({ dueDate: "2026-07-18" })] });
    expect(first).toHaveLength(1);
    // Same schedule row, next quarter's dueDate → new dedup key → fires again.
    const nextCycle = computeWorkflowFirings({
      ...base, workflows: [w],
      schedules: [sched({ dueDate: "2026-07-20" })],
      runs: [first[0].run],
      now: new Date(2026, 6, 16),
    });
    expect(nextCycle).toHaveLength(1);
    expect(nextCycle[0].run.dedupKey).not.toBe(first[0].run.dedupKey);
  });

  it("multiple workflows evaluate independently over the same data", () => {
    const out = computeWorkflowFirings({
      ...base,
      workflows: [wf({ id: "a" }), wf({ id: "b", action: "send_whatsapp", actionConfig: { message: "Hi {name}" } })],
      leads: [lead()],
    });
    expect(out).toHaveLength(2);
    expect(out.map(f => f.action).sort()).toEqual(["create_task", "send_whatsapp"]);
  });

  it("run rows carry workflow + subject metadata for the audit log", () => {
    const out = computeWorkflowFirings({ ...base, leads: [lead()] });
    expect(out[0].run).toMatchObject({
      workflowId: "wf1",
      workflowName: "Test rule",
      subjectType: "lead",
      subjectId: "l1",
      subjectLabel: "Acme Office",
      result: "pending",
    });
  });
});
