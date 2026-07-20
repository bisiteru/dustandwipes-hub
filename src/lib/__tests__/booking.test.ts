// Tests for the booking slot engine (Phase D).

import { computeSlots, capacityOn, isAbsentOn } from "../booking";
import type { Appointment, Absence, Staff } from "../schemas";

const st = (name: string, category = "Cleaning Staff"): Staff =>
  ({ id: name, name, category } as Staff);
const ab = (cleaner: string, startDate: string, endDate = ""): Absence =>
  ({ id: `a-${cleaner}`, cleaner, startDate, endDate } as Absence);
const ap = (time: string, over: Partial<Appointment> = {}): Appointment =>
  ({ id: `ap-${time}-${Math.random()}`, contactName: "X", date: "2026-08-03", time, status: "Confirmed", ...over } as Appointment);

const DATE = "2026-08-03";

describe("isAbsentOn", () => {
  it("date inside range is absent; outside is not", () => {
    const a = ab("Bola", "2026-08-01", "2026-08-05");
    expect(isAbsentOn(a, "2026-08-03")).toBe(true);
    expect(isAbsentOn(a, "2026-08-06")).toBe(false);
  });
  it("single-day absence uses startDate as end", () => {
    const a = ab("Bola", "2026-08-03");
    expect(isAbsentOn(a, "2026-08-03")).toBe(true);
    expect(isAbsentOn(a, "2026-08-04")).toBe(false);
  });
});

describe("capacityOn", () => {
  it("floor(field staff / 2), min 1", () => {
    expect(capacityOn([st("A"), st("B"), st("C"), st("D")], [], DATE)).toBe(2);
    expect(capacityOn([st("A")], [], DATE)).toBe(1);      // floor(0.5) floored to min 1
    expect(capacityOn([], [], DATE)).toBe(1);             // tiny roster still bookable
  });
  it("absent staff reduce capacity; office staff never count", () => {
    const staff = [st("A"), st("B"), st("C"), st("D"), st("Boss", "Office Staff")];
    expect(capacityOn(staff, [ab("A", DATE), ab("B", DATE)], DATE)).toBe(1);
  });
  it("absence name match is case/whitespace insensitive", () => {
    const staff = [st("Bola Adebayo"), st("C"), st("D"), st("E")];
    expect(capacityOn(staff, [ab(" bola adebayo ", DATE)], DATE)).toBe(1); // 3 present → floor 1.5 → 1
  });
});

describe("computeSlots", () => {
  const staff4 = [st("A"), st("B"), st("C"), st("D")]; // capacity 2

  it("generates slots inside working hours only", () => {
    const slots = computeSlots(DATE, [], staff4, []);
    // 08:00..17:00, 120min slots ending by 17:00 → 08:00 10:00 12:00 14:00 (16:00+120=18 > 17 → excluded)
    expect(slots.map(s => s.time)).toEqual(["08:00", "10:00", "12:00", "14:00"]);
    expect(slots.every(s => s.available && s.capacity === 2)).toBe(true);
  });

  it("slot fills when bookings reach capacity", () => {
    const appts = [ap("10:00"), ap("10:00")];
    const slots = computeSlots(DATE, appts, staff4, []);
    const ten = slots.find(s => s.time === "10:00")!;
    expect(ten.booked).toBe(2);
    expect(ten.available).toBe(false);
    expect(slots.find(s => s.time === "08:00")!.available).toBe(true);
  });

  it("cancelled appointments do not occupy slots", () => {
    const appts = [ap("10:00", { status: "Cancelled" }), ap("10:00", { status: "Cancelled" })];
    expect(computeSlots(DATE, appts, staff4, []).find(s => s.time === "10:00")!.available).toBe(true);
  });

  it("other dates' appointments are ignored", () => {
    const appts = [ap("10:00", { date: "2026-08-04" })];
    expect(computeSlots(DATE, appts, staff4, []).find(s => s.time === "10:00")!.booked).toBe(0);
  });

  it("custom hours + slot length respected", () => {
    const slots = computeSlots(DATE, [], staff4, [], { workStartHour: 9, workEndHour: 13, slotMins: 60 });
    expect(slots.map(s => s.time)).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("absences shrink capacity for the day", () => {
    const slots = computeSlots(DATE, [ap("08:00")], staff4, [ab("A", DATE), ab("B", DATE)]);
    const eight = slots.find(s => s.time === "08:00")!;
    expect(eight.capacity).toBe(1);
    expect(eight.available).toBe(false); // 1 booked ≥ capacity 1
  });
});
