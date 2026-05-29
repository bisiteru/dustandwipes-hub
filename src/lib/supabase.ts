// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Supabase REST layer
//  Phase 2 extraction. Direct fetch() against Supabase REST API + Zod
//  validation at every boundary (added in Phase 1).
// ─────────────────────────────────────────────────────────────────────────────

import { SCHEMAS, validateRows, validateRecord, TableName } from "./schemas";

// ── Environment config ──────────────────────────────────────────────────────
// Vercel: Settings → Environment Variables.
// Local:  .env.local at the repo root.
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw — the App.js config-error gate shows a UI banner when this fires.
  console.error(
    "[Config] REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY not set. " +
    "Check .env.local or Vercel environment variables."
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Prefix a logical table name with the `dw_` schema prefix. */
export const T = (name: string): string => `dw_${name}`;

const authHeaders = (): Record<string, string> => ({
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
});

// ── Contacts (uses top-level columns, not the JSONB `record` pattern) ───────
type Setter<T> = (data: T) => void;

/**
 * Load contacts and (if a setter is passed) update React state.
 * Also exposes the contacts globally as window.__DW_CONTACTS__ for the
 * ContactSearchSelect component to consume without prop-drilling.
 */
export const loadContacts = async (setter?: Setter<any[]>): Promise<void> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/dw_contacts?select=id,name,phone,email,address&order=name.asc&limit=1000`;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data)) {
      (window as any).__DW_CONTACTS__ = data;
      if (setter) setter(data);
    }
  } catch (e: any) {
    console.warn("[DB] load contacts:", e.message);
  }
};

/** Insert a new contact (called on requisition approval). Fire-and-forget. */
export const saveContact = async (contact: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}): Promise<void> => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/dw_contacts`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        name: contact.name,
        phone: contact.phone || "",
        email: contact.email || "",
        address: contact.address || "",
        source: "auto_requisition",
      }),
    });
  } catch (e: any) {
    console.warn("[DB] save contact:", e.message);
  }
};

// ── Activity log ────────────────────────────────────────────────────────────
/** Load the 200 most recent activity log entries. */
export const loadActivityLog = async (setter?: Setter<any[]>): Promise<void> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/dw_activity_log?select=*&order=created_at.desc&limit=200`;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data) && setter) setter(data);
  } catch (e: any) {
    console.warn("[DB] load activity log:", e.message);
  }
};

/** Log an activity to dw_activity_log. Fire-and-forget — never blocks UI. */
// eslint-disable-next-line no-unused-vars
export const logActivity = async ({
  userName = "",
  userRole = "",
  action,
  module,
  recordId = "",
  description = "",
}: {
  userName?: string;
  userRole?: string;
  action: string;
  module: string;
  recordId?: string;
  description?: string;
}): Promise<void> => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/dw_activity_log`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_name: userName,
        user_role: userRole,
        action,
        module,
        record_id: recordId,
        description,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e: any) {
    console.warn("[DB] activity log:", e.message);
  }
};

// ── Generic JSONB-record CRUD ───────────────────────────────────────────────
/**
 * Load all records from a `dw_<table>` table and populate React state.
 * Records are validated through the registered Zod schema (Phase 1) so any
 * type drift from the DB is coerced + warned at the boundary.
 */
export const dbLoad = async <T = any>(table: string, setter: Setter<T[]>): Promise<void> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${T(table)}?select=id,record&order=updated_at.desc`;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data) && data.length) {
      const records = data.map((r: any) => r.record).filter(Boolean);
      const validated = (SCHEMAS as any)[table]
        ? validateRows(table as TableName, records)
        : records;
      setter(validated as T[]);
    }
  } catch (e: any) {
    console.warn(`[DB] load ${table}:`, e.message);
  }
};

/** Delete a single record from Supabase by id. */
export const dbDelete = async (table: string, id: string | number): Promise<void> => {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${T(table)}?id=eq.${encodeURIComponent(String(id))}`,
      { method: "DELETE", headers: authHeaders() }
    );
    if (!r.ok) {
      const e = await r.text();
      throw new Error(e);
    }
  } catch (e: any) {
    console.warn(`[DB] delete ${table}:`, e.message);
  }
};

// ── Storage: photo upload to Supabase Storage (assessment-photos bucket) ────
/**
 * Upload a file (typically an assessment photo) to Supabase Storage.
 * Returns the public URL on success, or null on failure (logged).
 */
export const uploadAssessmentPhoto = async (file: File, assessmentId: string): Promise<string | null> => {
  try {
    const ext = file.name.split(".").pop();
    const path = `${assessmentId}/${Date.now()}.${ext}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/assessment-photos/${path}`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type":  file.type,
        "x-upsert":      "true",
      },
      body: file,
    });
    if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
    return `${SUPABASE_URL}/storage/v1/object/public/assessment-photos/${path}`;
  } catch (e: any) {
    console.warn("[Storage] photo upload:", e.message);
    return null;
  }
};

/**
 * Upsert an array of records to Supabase.
 * NEVER deletes — deletion is handled by dbDelete() explicitly.
 * This prevents race-condition data loss when multiple tabs sync simultaneously.
 * All records pass through Zod validation (Phase 1) before write.
 *
 * @param onError  Optional callback invoked with the Error when the sync fails.
 *                 Use this on user-facing saves to show a toast. Fire-and-forget
 *                 callers can omit it — the error is always logged to console.
 */
export const dbSync = async (
  table: string,
  data: any[],
  onError?: (e: Error) => void
): Promise<void> => {
  try {
    if (!data || data.length === 0) return;
    const validated = (SCHEMAS as any)[table]
      ? data.map(r => validateRecord(table as TableName, r)).filter(Boolean)
      : data;
    if (validated.length === 0) return;
    const rows = validated.map((r: any) => ({
      id: String(r.id),
      record: r,
      updated_at: new Date().toISOString(),
    }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${T(table)}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const e = await r.text();
      throw new Error(e);
    }
  } catch (e: any) {
    console.error(`[DB] sync ${table} failed:`, e.message);
    onError?.(e as Error);
  }
};
