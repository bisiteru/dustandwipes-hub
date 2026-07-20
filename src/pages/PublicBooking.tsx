// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Public booking page (Phase D2)
//
//  Reached at #book — NO login. A prospective customer picks a service, date
//  and available time slot and submits; the visit lands as a Requested
//  appointment (source "public") and spawns a New pipeline lead so the office
//  sees it immediately. Fully standalone: talks to Supabase via the messaging
//  client + booking slot engine, owns no App state.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { messagingClient } from "../lib/messaging";
import { computeSlots, type Slot } from "../lib/booking";
import type { Appointment, Staff, Absence } from "../lib/schemas";
import { LOGO, APP_NAME } from "../lib/logo";

const G = "#1B6B2F", O = "#E85D04";
const SERVICES = ["Cleaning", "Pest Control", "Fumigation", "Post-construction cleaning", "Gardening / Landscaping"];

// Next 14 bookable days (skip Sundays — company rests).
function upcomingDates(): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // from tomorrow
  while (out.length < 14) {
    if (d.getDay() !== 0) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ iso, label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function PublicBooking() {
  const dates = useMemo(upcomingDates, []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [svc, setSvc] = useState(SERVICES[0]);
  const [loc, setLoc] = useState("");
  const [date, setDate] = useState(dates[0]?.iso || "");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  // Load availability for the chosen date.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = messagingClient();
      if (!c || !date) { setSlots([]); return; }
      const [{ data: appts }, { data: staffRows }, { data: absRows }] = await Promise.all([
        c.from("dw_appointments").select("record").filter("record->>date", "eq", date),
        c.from("dw_staff").select("record"),
        c.from("dw_absences").select("record"),
      ]);
      if (cancelled) return;
      const appointments = (appts || []).map((r: any) => r.record as Appointment);
      const staff = (staffRows || []).map((r: any) => r.record as Staff);
      const absences = (absRows || []).map((r: any) => r.record as Absence);
      const s = computeSlots(date, appointments, staff, absences);
      setSlots(s);
      setTime(t => (s.some(x => x.time === t && x.available) ? t : ""));
    })();
    return () => { cancelled = true; };
  }, [date]);

  const canSubmit = name.trim() && phone.trim() && loc.trim() && date && time && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setErr("");
    const c = messagingClient();
    if (!c) { setErr("Booking is temporarily unavailable. Please call us."); setSubmitting(false); return; }
    const now = new Date().toISOString();
    const apptId = `ap${Date.now()}`;
    const leadId = `lead${Date.now()}`;
    const appt: Appointment = {
      id: apptId, contactName: name.trim(), contactPhone: phone.trim(), svc, loc: loc.trim(),
      date, time, durationMins: 120, status: "Requested", assignedTo: "", jobId: "",
      leadId, source: "public", notes: "", createdAt: now,
    } as Appointment;
    const lead = {
      id: leadId, contactName: name.trim(), contactPhone: phone.trim(), contactEmail: "",
      source: "Website", svc, loc: loc.trim(), stage: "New", value: 0, ownerName: "",
      nextAction: "Confirm booking", nextActionDate: date,
      notes: `Booked ${svc} for ${date} ${time} via public page`,
      requestId: "", stageHistory: [{ stage: "New", at: now, by: "auto (public booking)" }], createdAt: now,
    };
    const [aRes, lRes] = await Promise.all([
      c.from("dw_appointments").insert({ id: apptId, record: appt }),
      c.from("dw_leads").insert({ id: leadId, record: lead }),
    ]);
    setSubmitting(false);
    if (aRes.error) { setErr("Could not complete your booking. Please try again or call us."); return; }
    void lRes;
    setDone(true);
  };

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(160deg,#0B3518,#1B6B2F)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Segoe UI',system-ui,sans-serif" };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 20, maxWidth: 460, width: "100%", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,.3)" };

  if (done) return (
    <div style={wrap}><div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 46 }}>✅</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "10px 0 6px" }}>Booking received!</h1>
      <p style={{ color: "#555", fontSize: 15, lineHeight: 1.5 }}>
        Thanks {name.split(" ")[0]}. We've got your <b>{svc}</b> request for <b>{new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</b> at <b>{time}</b>.
        Our team will confirm on WhatsApp shortly.
      </p>
      <button onClick={() => { setDone(false); setName(""); setPhone(""); setLoc(""); setTime(""); }}
        style={{ marginTop: 18, background: G, color: "#fff", border: 0, borderRadius: 12, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}>
        Book another
      </button>
    </div></div>
  );

  return (
    <div style={wrap}><div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <img src={LOGO} alt="D&W" style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", padding: 2 }} />
        <div>
          <div style={{ fontWeight: 800, color: "#111", fontSize: 16, lineHeight: 1.1 }}>{APP_NAME}</div>
          <div style={{ color: G, fontSize: 12, fontWeight: 600 }}>Book a service visit</div>
        </div>
      </div>

      {err && <div style={{ background: "#fee2e2", color: "#991b1b", fontSize: 13, padding: "9px 12px", borderRadius: 10, marginBottom: 14 }}>{err}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Your name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputS} />
        </Field>
        <Field label="WhatsApp phone">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08031234567" style={inputS} />
        </Field>
        <Field label="Service">
          <select value={svc} onChange={e => setSvc(e.target.value)} style={inputS}>
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Site address">
          <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Where should we come?" style={inputS} />
        </Field>
        <Field label="Preferred date">
          <select value={date} onChange={e => setDate(e.target.value)} style={inputS}>
            {dates.map(d => <option key={d.iso} value={d.iso}>{d.label}</option>)}
          </select>
        </Field>

        <Field label="Available times">
          {slots.length === 0
            ? <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Loading availability…</p>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map(s => (
                  <button key={s.time} disabled={!s.available} onClick={() => setTime(s.time)}
                    style={{
                      padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: s.available ? "pointer" : "not-allowed",
                      border: time === s.time ? `2px solid ${G}` : "1px solid #ddd",
                      background: time === s.time ? G : s.available ? "#fff" : "#f3f4f6",
                      color: time === s.time ? "#fff" : s.available ? "#111" : "#bbb",
                    }}>
                    {s.time}{!s.available && " ✕"}
                  </button>
                ))}
                {slots.every(s => !s.available) && <p style={{ color: "#b45309", fontSize: 13, width: "100%", margin: 0 }}>Fully booked — try another date.</p>}
              </div>}
        </Field>

        <button onClick={submit} disabled={!canSubmit}
          style={{ marginTop: 6, background: canSubmit ? O : "#f3b98a", color: "#fff", border: 0, borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: 15, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {submitting ? "Booking…" : "Request this visit"}
        </button>
        <p style={{ color: "#999", fontSize: 11, textAlign: "center", margin: 0 }}>No payment now — we confirm on WhatsApp first.</p>
      </div>
    </div></div>
  );
}

const inputS: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box", background: "#fff", color: "#111" };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label style={{ display: "block" }}>
    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
    {children}
  </label>);
}
