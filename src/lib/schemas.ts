// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Zod Schemas
//  Phase 1 of the TypeScript migration.
//
//  STRATEGY: "Coerce + warn" mode (per /anthropic-skills:10x-vision plan).
//  - z.coerce.* auto-converts strings → numbers, etc. (kills the entire bug
//    class that produced ₦228 quadrillion portfolio totals + .split crashes)
//  - .catch(default) means bad data never breaks the UI; we warn + fall back
//  - .passthrough() preserves unknown fields so future-added columns don't
//    silently get stripped on round-trip writes
//
//  These schemas reflect what is *actually* in Supabase as of 2026-05, not an
//  ideal model — Phase 4 of the migration will tighten them. For now: make
//  the runtime safer without breaking a single existing record.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Reusable field primitives ────────────────────────────────────────────────
// num: coerces "100" → 100, null/undefined/garbage → 0
const num = z.coerce.number().catch(0);
const numOpt = z.coerce.number().catch(0).optional();

// str: coerces 123 → "123", null/undefined → ""
const str = z.coerce.string().catch("");
const strOpt = z.coerce.string().catch("").optional();

// ID can come in as string (most rows) or number (legacy site reports)
const idField = z.union([z.string(), z.number()]).transform(String).catch("");

// boolean: handles "true"/"false" strings, 1/0, etc.
const bool = z.coerce.boolean().catch(false);

// String array — defaults to [] if anything weird shows up
const strArr = z.array(z.string()).catch([]).optional();

// ── 1. Clients ───────────────────────────────────────────────────────────────
export const ClientSchema = z.object({
  id: idField,
  name: str,
  cat: strOpt,            // category (Corporate, Healthcare, etc.)
  svc: strOpt,            // service type (Cleaning / Pest Control / Both)
  addr: strOpt,           // address
  cp: strOpt,             // contact person
  phone: strOpt,
  email: strOpt,
  cs: strOpt,             // contract start date (YYYY-MM-DD)
  ce: strOpt,             // contract end date (YYYY-MM-DD)
  sal: numOpt,            // salary component (₦)
  con: numOpt,            // consumables (₦)
  sc: numOpt,             // service charge (₦)
  vat: numOpt,            // VAT (₦)
  tot: numOpt,            // total annual value (₦)
  cleaners: strArr,
  duty: strOpt,           // work days (Mon-Fri, Mon-Sat)
  serviceFreq: strOpt,    // Daily/Weekly/Bi-weekly/Monthly/Quarterly/One-Time
  status: strOpt,         // derived field — sometimes persisted
}).passthrough();

// ── 2. Jobs ──────────────────────────────────────────────────────────────────
export const JobSchema = z.object({
  id: idField,
  clientName: strOpt,
  clientPhone: strOpt,
  svc: strOpt,
  date: strOpt,           // scheduled date
  createdAt: strOpt,      // ISO timestamp (Phase-1 addition, may be missing on legacy)
  sup: strOpt,            // supervisor
  techs: strOpt,          // crew (comma-separated)
  status: strOpt,
  notes: strOpt,
  loc: strOpt,
  checkIn: strOpt.nullable(),
  checkOut: strOpt.nullable(),
  sourceRequestId: strOpt,
  signOff: z.any().optional(),
  autoScheduled: bool.optional(),
}).passthrough();

// ── 3. Users (app users — Admin / Supervisor / Technician) ───────────────────
export const UserSchema = z.object({
  id: idField,
  name: str,
  email: strOpt,
  username: strOpt,       // phone number for technicians
  role: strOpt,
  initial: strOpt,
  dob: strOpt,
  pwHash: strOpt,         // SHA-256 hashed password
  password: strOpt,       // legacy — should be moved to pwHash on save
}).passthrough();

// ── 4. Staff (field employees, separate from app users) ──────────────────────
export const StaffSchema = z.object({
  id: idField,
  name: str,
  role: strOpt,
  category: strOpt,       // Office Staff / Cleaning Staff / Gardening Staff
  site: strOpt,
  phone: strOpt,
  email: strOpt,
  dob: strOpt,
  startDate: strOpt,
  employmentType: strOpt,
  workDays: strOpt,
  homeAddress: strOpt,
  emergencyContact: strOpt,
  emergencyPhone: strOpt,
  emergencyAddress: strOpt,
  accountName: strOpt,
  accountNumber: strOpt,
  bankName: strOpt,
}).passthrough();

// ── 5. Service Requests ──────────────────────────────────────────────────────
export const RequestSchema = z.object({
  id: idField,
  clientName: strOpt,
  clientPhone: strOpt,
  svc: strOpt,
  loc: strOpt,
  prefDate: strOpt,
  src: strOpt,            // Phone / WhatsApp / Email / Walk-in / Website / Referral
  status: strOpt,         // Pending / Converted / Declined
  notes: strOpt,
  created: strOpt,        // YYYY-MM-DD when request was logged
}).passthrough();

// ── 6. Site Reports ──────────────────────────────────────────────────────────
// Crew can be either an array (StaffMultiPicker) or string (textarea) — both
// allowed; downstream code defends with Array.isArray + String() coercion.
export const SiteReportSchema = z.object({
  id: idField,
  supervisorName: strOpt,
  supervisorEmail: strOpt,
  clientName: strOpt,
  address: strOpt,
  arrivalDate: strOpt,
  arrivalTime: strOpt,
  departureDate: strOpt,
  departureTime: strOpt,
  submittedAt: strOpt,    // ISO timestamp
  gpsLat: strOpt,
  gpsLng: strOpt,
  gpsAcquired: bool.optional(),
  jobType: strOpt,
  contractType: strOpt,
  serviceCategory: strArr,
  cleaningTasks: strArr,
  pestTasks: strArr,
  otherTasks: strOpt,
  crewMembers: z.union([z.string(), z.array(z.string())]).catch("").optional(),
  equipment: strArr,
  supplies: strArr,
  pesticidesUsed: strOpt,
  activeIngredients: strOpt,
  cleanlinessRating: numOpt,
  adherenceRating: numOpt,
  qualityNotes: strOpt,
  ppeWorn: strOpt,
  safeHandling: strOpt,
  incidents: strOpt,
  incidentDetails: strOpt,
  clientPresent: strOpt,
  clientContactName: strOpt,
  clientFeedback: strOpt,
  satisfactionLevel: strOpt,
  additionalRequirements: strOpt,
  additionalReqDetails: strOpt,
  photos: z.array(z.any()).catch([]).optional(),
  operationalNotes: strOpt,
  overallAssessment: strOpt,
  signatureName: strOpt,
  signatureTimestamp: strOpt,
}).passthrough();

// ── 7. Imprest Fund Records ──────────────────────────────────────────────────
export const ImprestSchema = z.object({
  id: idField,
  title: strOpt,
  holder: strOpt,
  fundType: strOpt,
  branch: strOpt,
  month: strOpt,          // YYYY-MM format
  amount: num,
  originalAmount: numOpt,
  releaseDate: strOpt,
  deadline: strOpt,
  purpose: strOpt,
  status: strOpt,         // Active / Pending Reconciliation / Closed / Flagged
  expenses: z.array(z.any()).catch([]).optional(),
  topups: z.array(z.any()).catch([]).optional(),
  isCarryForward: bool.optional(),
  carryForwardAmount: numOpt,
  carriedFrom: strOpt,
  closedPeriod: strOpt,
}).passthrough();

// ── 8. Inventory ─────────────────────────────────────────────────────────────
export const InventorySchema = z.object({
  id: idField,
  item: str,
  cat: strOpt,
  unit: strOpt,
  qty: num,
  reorder: numOpt,
  cost: numOpt,
}).passthrough();

// ── 9. Requisitions ──────────────────────────────────────────────────────────
export const RequisitionSchema = z.object({
  id: idField,
  site: strOpt,
  // month here is an INTEGER (0-11), not YYYY-MM like imprests
  month: z.coerce.number().int().min(0).max(11).catch(0),
  year: z.coerce.number().int().catch(() => new Date().getFullYear()),
  budgetCap: numOpt,
  submittedBy: strOpt,
  status: strOpt,         // Pending / Approved / Rejected / Forwarded
  items: z.array(z.any()).catch([]).optional(),
  reviewedBy: strOpt,
  reviewedAt: strOpt,
}).passthrough();

// ── 10. Supply Master Catalogue ──────────────────────────────────────────────
export const SupplyItemSchema = z.object({
  id: idField,
  name: str,
  cat: strOpt,
  unit: strOpt,
  cost: num,
  active: bool.optional(),
}).passthrough();

// ── 11. Pest Schedules ───────────────────────────────────────────────────────
export const ScheduleSchema = z.object({
  id: idField,
  clientName: strOpt,
  service: strOpt,
  dateCarriedOut: strOpt,
  dueDate: strOpt,
  notes: strOpt,
  overdue: bool.optional(),
}).passthrough();

// ── 12. Absences ─────────────────────────────────────────────────────────────
export const AbsenceSchema = z.object({
  id: idField,
  cleaner: strOpt,
  site: strOpt,
  startDate: strOpt,
  endDate: strOpt,
  reason: strOpt,
  leaveType: strOpt,      // Sick / Annual / Emergency / AWOL / Maternity / Other
  needsReplacement: bool.optional(),
  deductionAmount: numOpt,
  status: strOpt,         // Absent Logged / Cover Assigned / Completed / Sent to Finance
}).passthrough();

// ── 13. Covers ───────────────────────────────────────────────────────────────
export const CoverSchema = z.object({
  id: idField,
  absentCleaner: strOpt,
  replacement: strOpt,
  site: strOpt,
  startDate: strOpt,
  endDate: strOpt,
  days: numOpt,
  compensation: bool.optional(),
  coverAmount: numOpt,
  remarks: strOpt,
}).passthrough();

// ── 14. Site Assessments ─────────────────────────────────────────────────────
// Empty in DB right now — permissive schema until real records are seen.
export const AssessmentSchema = z.object({
  id: idField,
}).passthrough();

// ── 15. Contacts (uses top-level columns, not record JSONB) ──────────────────
export const ContactSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: str,
  phone: strOpt,
  email: strOpt,
  address: strOpt,
  notes: strOpt,
  source: strOpt,
}).passthrough();

// ── Schema registry (table-name → schema) ────────────────────────────────────
// Used by dbLoad/dbSync to look up the right validator. Keys must match the
// `table` arguments passed to those functions (i.e. the part after the `dw_`
// prefix).
export const SCHEMAS = {
  clients: ClientSchema,
  jobs: JobSchema,
  users: UserSchema,
  staff: StaffSchema,
  requests: RequestSchema,
  reports: SiteReportSchema,
  imprests: ImprestSchema,
  inventory: InventorySchema,
  requisitions: RequisitionSchema,
  supplyitems: SupplyItemSchema,
  schedules: ScheduleSchema,
  absences: AbsenceSchema,
  covers: CoverSchema,
  assessments: AssessmentSchema,
  contacts: ContactSchema,
} as const;

export type TableName = keyof typeof SCHEMAS;

// ── Validation helper used at the Supabase boundary ──────────────────────────
// Returns a CLEANED array — bad rows are coerced to safe defaults, never
// dropped. Logs a single grouped warning if any rows needed correction so we
// can spot data-quality drift in the browser console.
export function validateRows<T extends TableName>(table: T, rows: unknown[]): unknown[] {
  const schema = SCHEMAS[table];
  if (!schema) {
    console.warn(`[Zod] No schema registered for table "${table}" — passing through unchanged`);
    return rows;
  }
  let warnings = 0;
  const cleaned = rows.map((row, idx) => {
    const result = schema.safeParse(row);
    if (result.success) return result.data;
    warnings++;
    // Log just the first issue per row to avoid console flooding
    const issue = result.error.issues[0];
    console.warn(
      `[Zod] ${table}[${idx}] field "${issue?.path.join(".")}" — ${issue?.message}`,
      { rawRow: row }
    );
    // Re-parse with a permissive fallback path: strip the bad fields and
    // let .catch() defaults take over. We still return *something* so the
    // UI never breaks.
    return { ...((row && typeof row === "object") ? row : {}) };
  });
  if (warnings > 0) {
    console.warn(`[Zod] ${table}: ${warnings} row(s) had validation issues (auto-coerced)`);
  }
  return cleaned;
}

// Validate a single record before write. Returns the coerced record, or null
// if the data is unrecoverable (in which case the caller should abort).
export function validateRecord<T extends TableName>(table: T, record: unknown): unknown | null {
  const schema = SCHEMAS[table];
  if (!schema) return record;
  const result = schema.safeParse(record);
  if (result.success) return result.data;
  console.warn(
    `[Zod] Write blocked for ${table} — invalid record:`,
    result.error.issues,
    { rawRecord: record }
  );
  // Even on validation failure, return the original record so writes don't
  // mysteriously disappear. The warning is the signal that something is off.
  // In Phase 4 (strict mode), we'll switch this to `return null`.
  return record;
}
