// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Booking slot engine (Phase D)
//
//  Pure availability computation. Capacity model: number of active field
//  staff minus staff absent that date = concurrent visits the company can
//  run. A slot is offered while its booked count is below capacity.
//  Same discipline as the other lib engines: deterministic, clock-free
//  (date passed in), zero side effects, unit-tested.
// ─────────────────────────────────────────────────────────────────────────────

import type { Appointment, Absence, Staff } from "./schemas";

export interface SlotOptions {
  workStartHour?: number;  // default 8  (08:00 first slot)
  workEndHour?: number;    // default 17 (last slot must END by this hour)
  slotMins?: number;       // default 120
}

export interface Slot {
  time: string;            // "HH:mm"
  available: boolean;
  booked: number;
  capacity: number;
}

const FIELD_CATEGORIES = ["Cleaning Staff", "Gardening Staff"];

/** Staff absent if the date falls inside [startDate, endDate||startDate]. */
export function isAbsentOn(a: Absence, dateISO: string): boolean {
  if (!a.startDate) return false;
  const end = a.endDate || a.startDate;
  return a.startDate <= dateISO && dateISO <= end;
}

/** Concurrent-visit capacity for a date: active field staff − absentees. */
export function capacityOn(staff: Staff[], absences: Absence[], dateISO: string): number {
  const field = staff.filter(s => FIELD_CATEGORIES.includes(s.category || ""));
  const absentNames = new Set(
    absences.filter(a => isAbsentOn(a, dateISO)).map(a => (a.cleaner || "").trim().toLowerCase()).filter(Boolean),
  );
  const present = field.filter(s => !absentNames.has((s.name || "").trim().toLowerCase()));
  // Crew of ~2 per visit; floor at 1 so a small roster still takes bookings.
  return Math.max(1, Math.floor(present.length / 2));
}

/**
 * Slots for one date. An appointment occupies its start slot (simple model —
 * duration overlap can come later). Cancelled appointments don't count.
 */
export function computeSlots(
  dateISO: string,
  appointments: Appointment[],
  staff: Staff[],
  absences: Absence[],
  opts: SlotOptions = {},
): Slot[] {
  const { workStartHour = 8, workEndHour = 17, slotMins = 120 } = opts;
  const capacity = capacityOn(staff, absences, dateISO);
  const dayAppts = appointments.filter(a => a.date === dateISO && a.status !== "Cancelled");
  const out: Slot[] = [];
  for (let mins = workStartHour * 60; mins + slotMins <= workEndHour * 60; mins += slotMins) {
    const time = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    const booked = dayAppts.filter(a => a.time === time).length;
    out.push({ time, booked, capacity, available: booked < capacity });
  }
  return out;
}
