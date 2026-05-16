// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Birthdays page
//  Phase 4a extraction. Renders this-month celebrants + a full staff DOB
//  table; clicking ✏️ opens a modal to update an individual's date of birth.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Edit2 } from "lucide-react";
import { G, O, TODAY, inp } from "../lib/constants";
import { monthName } from "../lib/format";
import { dbSync } from "../lib/supabase";
import { Card, Fld, KPI } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";

// Permissive — page state is forwarded from App.js
type Row = Record<string, any>;

interface BirthdaysPageProps {
  users: Row[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;       // currently unused; kept for prop-shape compat
  staff: Row[];
  setStaff: React.Dispatch<React.SetStateAction<any[]>>;
}

export function BirthdaysPage({ staff, setStaff }: BirthdaysPageProps) {
  const [modal, setModal] = useState<Row | null>(null);
  const thisM = TODAY.getMonth() + 1;
  const todayD = TODAY.getDate();
  const allPeople: Row[] = staff.map(s => ({ ...s, src: "staff" }));
  const withBdays = allPeople.filter(u => u.dob);
  const sorted = [...withBdays].sort((a, b) => {
    const am = new Date(a.dob).getMonth() + 1, ad = new Date(a.dob).getDate();
    const bm = new Date(b.dob).getMonth() + 1, bd = new Date(b.dob).getDate();
    return am !== bm ? am - bm : ad - bd;
  });
  const thisMonth = sorted.filter(u => new Date(u.dob).getMonth() + 1 === thisM);
  const showList = allPeople;
  const toast = useToast();

  // DOB update — updates staff record only
  const saveDob = (data: Row) => {
    const ns = staff.map(s => s.id === data.id ? { ...s, dob: data.dob } : s);
    setStaff(ns);
    dbSync("staff", ns);
    toast.success(`DOB updated for ${data.name}`);
    setModal(null);
  };

  return (<div className="space-y-5">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI icon="🎂" label="Field Staff" value={allPeople.length} sub="Total staff members" bg="#f0fdf4"/>
      <KPI icon="🎉" label="DOB Recorded" value={withBdays.length} sub={`of ${allPeople.length}`} bg="#fdf4ff"/>
      <KPI icon="🎁" label="This Month" value={thisMonth.length} sub={monthName(thisM - 1) + " celebrants"} bg="#eff6ff"/>
      <KPI icon="⚠️" label="No DOB" value={allPeople.filter(u => !u.dob).length} sub="Update profiles" bg="#fffbeb"/>
    </div>
    {thisMonth.length > 0 && (
      <Card className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: G }}>
          🎂 {monthName(thisM - 1)} Celebrants
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {thisMonth.map(u => {
            const d = new Date(u.dob);
            const isToday = d.getDate() === todayD;
            return (
              <div key={u.id}
                className={`flex items-center justify-between p-3.5 rounded-xl ${isToday ? "border-2" : "border"}`}
                style={isToday ? { borderColor: "#9333ea", background: "#fdf4ff" } : { borderColor: "#e9d5ff", background: "#faf5ff" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: isToday ? "#9333ea" : "#a855f7" }}>
                    {u.initial || u.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.role}{u.site ? ` · ${u.site}` : ""}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${isToday ? "text-purple-600" : "text-gray-500"}`}>
                  {isToday ? "🎉 Today!" : `${d.getDate()} ${monthName(d.getMonth())}`}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    )}
    <div className="flex items-center justify-between">
      <div className="flex gap-2 border border-gray-200 rounded-xl p-1 bg-white">
        <span className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: G }}>
          Field Staff ({allPeople.length})
        </span>
      </div>
      <p className="text-xs text-gray-400">Click ✏️ to add or update a date of birth. Manage staff records in the Staff module.</p>
    </div>
    <Card>
      <div className="divide-y divide-gray-50">
        {showList.map(u => {
          const d = u.dob ? new Date(u.dob) : null;
          const isUser = u.src === "user" || (typeof u.id === "string" && u.id.startsWith("u"));
          return (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: isUser ? O : G }}>
                  {u.initial || u.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400">
                    {u.role}{u.site ? ` · ${u.site}` : ""}
                    {isUser ? <span className="text-blue-500 ml-1">(App User)</span> : null}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {d
                  ? <p className="text-sm font-semibold text-gray-700">{d.getDate()} {monthName(d.getMonth())} {d.getFullYear()}</p>
                  : <p className="text-xs text-amber-500 font-medium">No DOB</p>}
                <button onClick={() => setModal({ ...u })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"
                  title="Update date of birth">
                  <Edit2 size={13}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
    {modal && (
      <ModalWrap title={modal.src === "user" ? "Update User DOB" : "Update Staff DOB"} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-sm text-gray-600" style={{ background: "#f9fafb" }}>
            <span className="font-bold">{modal.name}</span>
            {modal.role ? ` · ${modal.role}` : ""}
            {modal.site ? ` · ${modal.site}` : ""}
          </div>
          <Fld label="Date of Birth">
            <input className={inp} type="date" value={modal.dob || ""}
              onChange={e => setModal((p: Row | null) => ({ ...(p || {}), dob: e.target.value }))}/>
          </Fld>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
          <button onClick={() => saveDob(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>
            Save DOB
          </button>
        </div>
      </ModalWrap>
    )}
  </div>);
}
