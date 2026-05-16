// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Pest Schedule page
//  Phase 4a extraction. Recurring pest-control visit scheduler with overdue
//  detection and auto-next-due-date computation from the recurrence type.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { G, RED, BLUE, TODAY, inp } from "../lib/constants";
import { fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";

type Row = Record<string, any>;

interface SchedulePageProps {
  schedules: Row[];
  setSchedules: React.Dispatch<React.SetStateAction<any[]>>;
  clients: Row[];
  userRole: string;
}

const RECUR_DAYS: Record<string, number> = {
  Monthly: 30,
  Quarterly: 91,
  "Bi-annual": 183,
  Annual: 365,
};

export function SchedulePage({ schedules, setSchedules, clients, userRole }: SchedulePageProps) {
  const [modal, setModal] = useState<Row | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const canEdit = userRole !== "Technician";
  const ws: Row[] = schedules.map(s => ({ ...s, overdue: new Date(s.dueDate) < TODAY }));

  const save = (data: Row) => {
    let saved: Row = { ...data };
    if (saved.dateCarriedOut && saved.recurrence && RECUR_DAYS[saved.recurrence]) {
      const d = new Date(saved.dateCarriedOut);
      d.setDate(d.getDate() + RECUR_DAYS[saved.recurrence]);
      saved.dueDate = d.toISOString().split("T")[0];
    }
    const ns = saved.id
      ? schedules.map(s => s.id === saved.id ? saved : s)
      : [...schedules, { ...saved, id: Date.now() }];
    setSchedules(ns);
    dbSync("schedules", ns);
    toast.success(saved.id ? "Schedule updated" : "Visit scheduled");
    setModal(null);
  };
  const del = (id: any) => confirm("Delete this schedule?", () => {
    setSchedules(schedules.filter(s => s.id !== id));
    dbDelete("schedules", id);
    toast.success("Schedule deleted");
  });

  return (<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between">
      <div className="flex gap-3">
        <div className="p-3 rounded-xl text-sm font-bold" style={{ background: "#fee2e2", color: RED }}>
          {ws.filter(s => s.overdue).length} Overdue
        </div>
        <div className="p-3 rounded-xl text-sm font-bold" style={{ background: "#dbeafe", color: BLUE }}>
          {ws.filter(s => !s.overdue).length} Upcoming
        </div>
      </div>
      {canEdit && (
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: G }}>
          <Plus size={14}/>New Visit
        </button>
      )}
    </div>
    <Card>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-gray-50">
        {ws.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No visits scheduled</div>}
        {ws.map(s => (
          <div key={s.id} className="px-4 py-3.5 hover:bg-gray-50/60">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{s.clientName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.service}{s.recurrence ? ` · ${s.recurrence}` : ""}</p>
                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-400">
                  {s.dateCarriedOut && <span>Done: {fmtD(s.dateCarriedOut)}</span>}
                  <span className={s.overdue ? "text-red-600 font-semibold" : ""}>Due: {fmtD(s.dueDate)}</span>
                  {s.chemical && <span>💊 {s.chemical}{s.chemicalQty ? ` ${s.chemicalQty}${s.chemicalUnit || "L"}` : ""}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <SBadge s={s.overdue ? "Overdue" : "Upcoming"}
                  custom={s.overdue
                    ? { bg: "#fee2e2", color: RED, border: "#fca5a5" }
                    : { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" }}/>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(s)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100">
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => del(s.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9fafb" }} className="border-b">
              {["Client","Service","Recurrence","Date Done","Next Due","Chemical","Status",""].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">{h}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ws.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/70">
                <td className="px-4 py-3.5 font-semibold text-gray-800">{s.clientName}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{s.service}</td>
                <td className="px-4 py-3.5 text-xs text-gray-500">{s.recurrence || "--"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-500">{fmtD(s.dateCarriedOut)}</td>
                <td className="px-4 py-3.5 text-xs text-gray-500">{fmtD(s.dueDate)}</td>
                <td className="px-4 py-3.5 text-xs text-gray-500">
                  {s.chemical ? `${s.chemical}${s.chemicalQty ? ` ${s.chemicalQty}${s.chemicalUnit || "L"}` : ""}` : "-"}
                </td>
                <td className="px-4 py-3.5">
                  <SBadge s={s.overdue ? "Overdue" : "Upcoming"}
                    custom={s.overdue
                      ? { bg: "#fee2e2", color: RED, border: "#fca5a5" }
                      : { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" }}/>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-400">{s.notes || "--"}</td>
                <td className="px-4 py-3.5">
                  {canEdit && (
                    <div className="flex gap-1">
                      <button onClick={() => setModal(s)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100">
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => del(s.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    {modal !== null && (
      <ModalWrap title={modal.id ? "Edit Schedule" : "New Pest Visit"} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Fld label="Client">
            <select className={inp} value={modal.clientName || ""}
              onChange={e => setModal((p: any) => ({ ...p, clientName: e.target.value }))}>
              <option value="">-- Select --</option>
              {clients.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
          </Fld>
          <Fld label="Service">
            <select className={inp} value={modal.service || "Pest Control"}
              onChange={e => setModal((p: any) => ({ ...p, service: e.target.value }))}>
              <option>Pest Control</option>
              <option>Fumigation</option>
              <option>Rodent Control</option>
              <option>Termite Treatment</option>
            </select>
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Date Done">
              <input className={inp} type="date" value={modal.dateCarriedOut || ""}
                onChange={e => setModal((p: any) => ({ ...p, dateCarriedOut: e.target.value }))}/>
            </Fld>
            <Fld label="Next Due">
              <input className={inp} type="date" value={modal.dueDate || ""}
                onChange={e => setModal((p: any) => ({ ...p, dueDate: e.target.value }))}/>
            </Fld>
          </div>
          <Fld label="Recurrence">
            <select className={inp} value={modal.recurrence || ""}
              onChange={e => setModal((p: any) => ({ ...p, recurrence: e.target.value }))}>
              <option value="">-- Select --</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Bi-annual</option>
              <option>Annual</option>
            </select>
          </Fld>
          <Fld label="Chemical / Pesticide">
            <input className={inp} value={modal.chemical || ""}
              onChange={e => setModal((p: any) => ({ ...p, chemical: e.target.value }))}
              placeholder="e.g. Cypermethrin 10%"/>
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Qty Used">
              <input className={inp} type="number" min="0" step="0.1" value={modal.chemicalQty || ""}
                onChange={e => setModal((p: any) => ({ ...p, chemicalQty: e.target.value }))}/>
            </Fld>
            <Fld label="Unit">
              <select className={inp} value={modal.chemicalUnit || "L"}
                onChange={e => setModal((p: any) => ({ ...p, chemicalUnit: e.target.value }))}>
                <option>L</option>
                <option>mL</option>
                <option>kg</option>
                <option>g</option>
              </select>
            </Fld>
          </div>
          <Fld label="Notes" col>
            <textarea className={inp} rows={3} value={modal.notes || ""}
              onChange={e => setModal((p: any) => ({ ...p, notes: e.target.value }))}/>
          </Fld>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
          <button onClick={() => save(modal)}
            className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>
            {modal.id ? "Save" : "Add"}
          </button>
        </div>
      </ModalWrap>
    )}
  </div>);
}
