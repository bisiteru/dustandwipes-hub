// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Contracts page
//  Phase 4a extraction. Status-filtered contract list + Renew modal.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { G, GL, AMBER, RED, inp } from "../lib/constants";
import { fmt, fmtD, cStatus, dLeft } from "../lib/format";
import { dbSync } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";

type Client = Record<string, any>;

interface ContractsPageProps {
  clients: Client[];
  // Accept React.Dispatch<SetStateAction<...>> from parent (supports both value and updater forms)
  setClients: React.Dispatch<React.SetStateAction<any[]>>;
}

export function ContractsPage({ clients, setClients }: ContractsPageProps) {
  const [filter, setFilter] = useState("All");
  const ws: Client[] = useMemo(() => clients.map(c => ({ ...c, status: cStatus(c.ce) })), [clients]);
  const sorted = useMemo(
    () => (filter === "All" ? ws : ws.filter(c => c.status === filter))
      .sort((a, b) => (dLeft(a.ce) || 0) - (dLeft(b.ce) || 0)),
    [ws, filter]
  );
  const stats = [
    { l: "Active",        v: ws.filter(c => c.status === "Active").length,        c: "#22c55e", bg: "#dcfce7" },
    { l: "Expiring Soon", v: ws.filter(c => c.status === "Expiring Soon").length, c: AMBER,     bg: "#fffbeb" },
    { l: "Critical",      v: ws.filter(c => c.status === "Critical").length,      c: RED,       bg: "#fee2e2" },
    { l: "Expired",       v: ws.filter(c => c.status === "Expired").length,       c: "#6b7280", bg: "#f3f4f6" },
  ];
  const [renewModal, setRenewModal] = useState<Client | null>(null);

  return (<div className="space-y-5">
    <div className="p-3 rounded-xl text-xs text-gray-600" style={{ background: GL, border: `1px solid ${G}30` }}>
      <strong>Alert Policy:</strong> <span className="font-bold text-amber-600">Amber</span> 60d
      <span className="font-bold text-red-600 ml-2">Red/Critical</span> 30d
      <span className="ml-2">SMS &amp; Email to Admin &amp; Supervisor.</span>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <button key={s.l} onClick={() => setFilter(filter === s.l ? "All" : s.l)}
          className="p-5 rounded-2xl border-2 text-center transition-all bg-white border-gray-100 hover:shadow"
          style={filter === s.l ? { borderColor: s.c, background: s.bg } : {}}>
          <div className="text-3xl font-black" style={{ color: s.c }}>{s.v}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1">{s.l}</div>
        </button>
      ))}
    </div>
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9fafb" }} className="border-b">
              {["Client","Service","Phone","Start","End","Days Left","Value","Status"].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(c => {
              const dl = dLeft(c.ce);
              return (
                <tr key={c.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.cp}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{c.svc}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.cs)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.ce)}</td>
                  <td className="px-4 py-3.5">
                    {dl !== null && (
                      <span className={`text-xs font-bold ${
                        dl < 0 ? "text-gray-500" :
                        dl <= 30 ? "text-red-600" :
                        dl <= 60 ? "text-amber-600" :
                        "text-green-600"
                      }`}>
                        {dl < 0 ? `${Math.abs(dl)}d ago` : `${dl}d`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-gray-700 whitespace-nowrap">{fmt(c.tot)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <SBadge s={c.status}/>
                      {c.status !== "Active" && (
                        <button onClick={() => setRenewModal({ ...c })}
                          className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                          style={{ background: G }}>
                          Renew
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {renewModal && (
      <ModalWrap title={`Renew: ${renewModal.name}`} onClose={() => setRenewModal(null)}>
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-xs text-gray-600" style={{ background: GL, border: `1px solid ${G}30` }}>
            Current end: <strong>{fmtD(renewModal.ce)}</strong>
            <span className="ml-3">Value: <strong>{fmt(renewModal.tot)}</strong></span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="New End Date" required>
              <input className={inp} type="date" value={renewModal.newCe || ""}
                onChange={e => setRenewModal((p: any) => ({ ...p, newCe: e.target.value }))}/>
            </Fld>
            <Fld label="New Annual Value (₦)">
              <input className={inp} type="number" min="0"
                value={renewModal.newTot || renewModal.tot || ""}
                onChange={e => setRenewModal((p: any) => ({ ...p, newTot: Number(e.target.value) }))}/>
            </Fld>
          </div>
          <Fld label="Notes">
            <input className={inp} value={renewModal.renewNotes || ""}
              onChange={e => setRenewModal((p: any) => ({ ...p, renewNotes: e.target.value }))}
              placeholder="e.g. Renewed via letter dated..."/>
          </Fld>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setRenewModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
          <button disabled={!renewModal.newCe}
            onClick={() => {
              const nc = clients.map(c => c.id === renewModal.id
                ? { ...c, ce: renewModal.newCe, tot: renewModal.newTot || c.tot, cs: c.ce }
                : c);
              setClients(nc);
              dbSync("clients", nc);
              setRenewModal(null);
            }}
            className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40"
            style={{ background: G }}>
            Confirm Renewal
          </button>
        </div>
      </ModalWrap>
    )}
  </div>);
}
