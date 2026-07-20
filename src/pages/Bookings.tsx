// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Bookings calendar (Phase D2)
//  Internal week view of appointments. Confirm a Requested visit → it spawns
//  a Job (delivery handoff, exactly like Won leads and converted requests).
//  Public bookings (source "public") land here as Requested for triage.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Calendar, Plus, ChevronLeft, ChevronRight, Trash2, Check, X, Link2 } from "lucide-react";
import { G, O, BLUE, AMBER, inp } from "../lib/constants";
import { dbSync, dbDelete } from "../lib/supabase";
import { Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Appointment, Job, AppUser, CurrentUser } from "../lib/schemas";

export interface BookingsPageProps {
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  setJobs: Dispatch<SetStateAction<Job[]>>;
  users: AppUser[];
  user: CurrentUser;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function mondayOf(d: Date): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x; }

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Requested: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
  Confirmed: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Completed: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
};

type Draft = Partial<Appointment> & { _new?: boolean };

export function BookingsPage({ appointments, setAppointments, setJobs, users, user }: BookingsPageProps) {
  const toast = useToast();
  const [confirm, confirmEl] = useConfirm();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [modal, setModal] = useState<Draft | null>(null);

  const supervisors = useMemo(
    () => [...new Set(users.filter(u => u.role === "Supervisor" || u.role === "Admin").map(u => String(u.name || "")).filter(Boolean))].sort(),
    [users],
  );

  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);
  const requestedCount = appointments.filter(a => a.status === "Requested").length;

  const persist = (next: Appointment[]) => {
    setAppointments(next);
    dbSync("appointments", next, () => toast.error("Booking change failed to sync"));
  };

  const save = (d: Draft) => {
    if (!d.contactName || !d.date || !d.time) { toast.info("Name, date and time are required"); return; }
    const id = d.id || `ap${Date.now()}`;
    const row: Appointment = {
      ...(d as Appointment), id,
      durationMins: Number(d.durationMins) || 120,
      status: d.status || "Confirmed",
      source: d.source || "internal",
      createdAt: d.createdAt || new Date().toISOString(),
    } as Appointment;
    persist(d.id ? appointments.map(a => (String(a.id) === id ? row : a)) : [row, ...appointments]);
    toast.success(d.id ? "Booking updated" : "Booking added");
    setModal(null);
  };

  const setStatus = (id: string, status: string) => {
    const target = appointments.find(a => String(a.id) === id);
    if (!target) return;

    // Confirm → spawn a Job (delivery handoff), once.
    let spawned: Job | null = null;
    if (status === "Confirmed" && !target.jobId) {
      spawned = {
        id: "j" + Date.now(),
        createdAt: new Date().toISOString(),
        clientName: target.contactName, clientPhone: target.contactPhone || "",
        loc: target.loc || "", svc: target.svc || "Cleaning", date: target.date || "",
        sup: target.assignedTo || "", techs: "", status: "New",
        notes: `Booked visit ${target.time || ""}${target.source === "public" ? " (public booking)" : ""}`,
        sourceRequestId: "", checkIn: null, checkOut: null,
      } as Job;
    }
    const next = appointments.map(a => String(a.id) === id
      ? { ...a, status, ...(spawned ? { jobId: String(spawned.id) } : {}) } as Appointment
      : a);
    persist(next);
    if (spawned) {
      setJobs(prev => { const u = [...prev, spawned as Job]; dbSync("jobs", u); return u; });
      toast.success(`Confirmed — job created${target.assignedTo ? ` for ${target.assignedTo}` : ""}`);
    } else {
      toast.info(`Marked ${status}`);
    }
  };

  const del = (id: string) => confirm("Delete this booking?", () => {
    setAppointments(prev => prev.filter(a => String(a.id) !== id));
    dbDelete("appointments", id).catch(() => {});
    toast.success("Booking deleted");
  });

  const publicUrl = `${window.location.origin}${window.location.pathname}#book`;
  const copyLink = () => { navigator.clipboard?.writeText(publicUrl).then(() => toast.success("Public booking link copied")).catch(() => toast.info(publicUrl)); };

  return (
    <div className="space-y-5">
      {confirmEl}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={16} style={{ color: G }} /> Bookings
            {requestedCount > 0 && <span className="px-2 py-0.5 rounded-full text-white font-bold" style={{ background: O, fontSize: "10px" }}>{requestedCount} new</span>}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Confirm a request to create its job automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: BLUE, color: BLUE }}>
            <Link2 size={13} /> Public link
          </button>
          <button onClick={() => setModal({ _new: true, status: "Confirmed", date: iso(new Date()), time: "10:00" })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
            <Plus size={14} /> New Booking
          </button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><ChevronLeft size={16} /></button>
        <p className="text-sm font-semibold text-gray-700">
          {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {days[5].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><ChevronRight size={16} /></button>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto pb-2">
        <div className="grid gap-3 min-w-max" style={{ gridTemplateColumns: "repeat(6, minmax(150px, 1fr))" }}>
          {days.map(d => {
            const dISO = iso(d);
            const today = dISO === iso(new Date());
            const dayAppts = appointments.filter(a => a.date === dISO && a.status !== "Cancelled").sort((x, y) => (x.time || "").localeCompare(y.time || ""));
            return (
              <div key={dISO} className="flex flex-col">
                <div className={`text-center py-2 rounded-t-xl text-xs font-bold ${today ? "text-white" : "text-gray-600 bg-gray-50"}`} style={today ? { background: G } : {}}>
                  {d.toLocaleDateString("en-GB", { weekday: "short" })} {d.getDate()}
                </div>
                <div className="flex-1 space-y-2 p-2 border border-t-0 border-gray-100 rounded-b-xl bg-white min-h-[120px]">
                  {dayAppts.length === 0 && <p className="text-xs text-gray-300 text-center py-4">—</p>}
                  {dayAppts.map(a => (
                    <button key={String(a.id)} onClick={() => setModal({ ...a })}
                      className="w-full text-left p-2 rounded-lg border hover:shadow-sm transition-shadow"
                      style={{ background: (STATUS_STYLE[a.status || "Confirmed"] || STATUS_STYLE.Confirmed).bg, borderColor: (STATUS_STYLE[a.status || "Confirmed"] || STATUS_STYLE.Confirmed).border }}>
                      <p className="text-xs font-bold text-gray-800 truncate">{a.time} · {a.contactName}</p>
                      <p className="text-xs text-gray-500 truncate">{a.svc}</p>
                      {a.status === "Requested" && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold" style={{ color: O }}>needs confirm</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor modal */}
      {modal && (
        <ModalWrap title={modal._new ? "New Booking" : "Booking"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Contact name" required><input className={inp} value={modal.contactName || ""} onChange={e => setModal(p => p ? { ...p, contactName: e.target.value } : p)} /></Fld>
              <Fld label="Phone"><input className={inp} value={modal.contactPhone || ""} onChange={e => setModal(p => p ? { ...p, contactPhone: e.target.value } : p)} /></Fld>
              <Fld label="Service"><input className={inp} value={modal.svc || ""} onChange={e => setModal(p => p ? { ...p, svc: e.target.value } : p)} /></Fld>
              <Fld label="Assigned to">
                <select className={inp} value={modal.assignedTo || ""} onChange={e => setModal(p => p ? { ...p, assignedTo: e.target.value } : p)}>
                  <option value="">— Unassigned —</option>{supervisors.map(s => <option key={s}>{s}</option>)}
                </select>
              </Fld>
              <Fld label="Date" required><input className={inp} type="date" value={modal.date || ""} onChange={e => setModal(p => p ? { ...p, date: e.target.value } : p)} /></Fld>
              <Fld label="Time" required><input className={inp} type="time" value={modal.time || ""} onChange={e => setModal(p => p ? { ...p, time: e.target.value } : p)} /></Fld>
            </div>
            <Fld label="Site address" col><input className={inp} value={modal.loc || ""} onChange={e => setModal(p => p ? { ...p, loc: e.target.value } : p)} /></Fld>
            {modal.notes ? <p className="text-xs text-gray-500 italic">{modal.notes}</p> : null}
            {!modal._new && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">Status:</span>
                <SBadge s={modal.status || "Confirmed"} custom={STATUS_STYLE[modal.status || "Confirmed"]} />
                {modal.jobId && <span className="text-xs text-gray-400">· job created</span>}
                {modal.source === "public" && <span className="text-xs" style={{ color: O }}>· public booking</span>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t">
            {!modal._new && modal.status === "Requested" && (
              <button onClick={() => { setStatus(String(modal.id), "Confirmed"); setModal(null); }} className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-1.5" style={{ background: BLUE }}><Check size={14} /> Confirm → Job</button>
            )}
            {!modal._new && modal.status === "Confirmed" && (
              <button onClick={() => { setStatus(String(modal.id), "Completed"); setModal(null); }} className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-1.5" style={{ background: G }}><Check size={14} /> Mark done</button>
            )}
            {!modal._new && modal.status !== "Cancelled" && modal.status !== "Completed" && (
              <button onClick={() => { setStatus(String(modal.id), "Cancelled"); setModal(null); }} className="px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5" style={{ borderColor: AMBER, color: AMBER }}><X size={14} /> Cancel visit</button>
            )}
            {!modal._new && (
              <button onClick={() => { del(String(modal.id)); setModal(null); }} className="px-3 py-2 rounded-xl border text-red-500 border-red-100 hover:bg-red-50"><Trash2 size={14} /></button>
            )}
            <button onClick={() => save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>{modal._new ? "Add" : "Save"}</button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
