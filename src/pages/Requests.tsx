// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Service Requests page
//  Phase 4b extraction. Inbound service requests with monthly tabs, PDF
//  reports, and Pending→Job conversion.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ArrowRight } from "lucide-react";
import { G, GL, AMBER, BLUE, TODAY, inp } from "../lib/constants";
import { fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";

type Row = any;

interface RequestsPageProps {
  requests: Row[];
  setRequests: (r: any) => void;
  setJobs: (j: any) => void;
  clients: Row[];
  /** Phase A: every new inbound request auto-spawns a pipeline Lead so no
   *  inquiry sits outside the sales funnel. Optional so the page still
   *  renders if the pipeline module is ever disabled. */
  leads?: Row[];
  setLeads?: (updater: (prev: Row[]) => Row[]) => void;
}

export function RequestsPage({ requests, setRequests, setJobs, clients, leads = [], setLeads }: RequestsPageProps) {
  const [modal, setModal] = useState<Row | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const [selMK, setSelMK] = useState(curMonthKey());
  const getMK = (r: Row) => r.created;
  useEffect(() => {
    if (requests.length > 0 && !requests.some(r => monthOf(r, getMK) === selMK)) {
      const keys = [...new Set(requests.map(r => monthOf(r, getMK)).filter(Boolean))].sort().reverse();
      if (keys[0]) setSelMK(keys[0] as string);
    }
  }, [requests.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthRequests = requests.filter(r => monthOf(r, getMK) === selMK);
  const blank: Row = { clientName: "", clientPhone: "", svc: "", loc: "", prefDate: "", src: "Phone", status: "Pending", notes: "" };
  const save = (data: Row) => {
    const isNew = !data.id;
    const reqId = data.id || "sr" + Date.now();
    const nr = data.id
      ? requests.map(r => r.id === data.id ? data : r)
      : [...requests, { ...data, id: reqId, created: TODAY.toISOString().split("T")[0] }];
    setRequests(nr);
    dbSync("requests", nr);
    // Phase A: a brand-new inbound request enters the sales pipeline as a
    // Lead automatically — capture and funnel are one motion, nothing waits
    // outside the board. Dedup by requestId provenance so an edit-resave
    // can never double-spawn.
    if (isNew && setLeads && !leads.some(l => l.requestId === reqId)) {
      const now = new Date().toISOString();
      const lead: Row = {
        id: "lead" + Date.now(),
        contactName: data.clientName || "Unknown",
        contactPhone: data.clientPhone || "",
        contactEmail: "",
        source: data.src || "Phone",
        svc: data.svc || "",
        loc: data.loc || "",
        stage: "New",
        value: 0,
        ownerName: (data as any).assignedTo || "",
        nextAction: "Contact and qualify",
        nextActionDate: data.prefDate || "",
        notes: data.notes || "",
        requestId: reqId,
        stageHistory: [{ stage: "New", at: now, by: "auto (request intake)" }],
        createdAt: now,
      };
      setLeads(prev => {
        const next = [lead, ...prev];
        dbSync("leads", next);
        return next;
      });
    }
    toast.success(data.id ? "Request updated" : isNew && setLeads ? "Request logged — added to Sales Pipeline" : "Request logged");
    setModal(null);
  };
  const convert = (req: Row) => {
    // Phase 6: if the request was already triaged on the Dashboard's
    // Unassigned-Requests inbox, carry that supervisor forward into the
    // job's `sup` field so it shows up on their dashboard immediately —
    // no need to re-assign on the Jobs page.
    const carriedSup = (req as any).assignedTo || "";
    setJobs((js: Row[]) => [...js, {
      id: "j" + Date.now(),
      createdAt: new Date().toISOString(),
      clientName: req.clientName, clientPhone: req.clientPhone || "",
      loc: req.loc || "", svc: req.svc, date: req.prefDate,
      sup: carriedSup, techs: "", status: "New", notes: req.notes,
      sourceRequestId: req.id, checkIn: null, checkOut: null
    }]);
    setRequests((rs: Row[]) => rs.map(r => r.id === req.id ? { ...r, status: "Converted" } : r));
    toast.success(carriedSup
      ? `Request converted to job — assigned to ${carriedSup}`
      : "Request converted to job");
  };
  const del = (id: any) => confirm("Delete this request?", () => {
    setRequests((rs: Row[]) => rs.filter(r => r.id !== id));
    dbDelete("requests", id);
    toast.success("Request deleted");
  });
  const SC: Record<string, any> = {
    Pending:   { bg: "#fffbeb", color: AMBER,    border: "#fde68a" },
    Converted: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    Declined:  { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  };

  const statsOf = (list: Row[]) => {
    const closed = list.filter(r => r.status === "Converted" || r.status === "Declined").length;
    const open = list.filter(r => r.status === "Pending").length;
    const declined = list.filter(r => r.status === "Declined").length;
    const converted = list.filter(r => r.status === "Converted").length;
    const respDays = list.filter(r => r.status === "Converted" && r.created && r.prefDate)
      .map(r => Math.max(0, Math.round(((new Date(r.prefDate) as any) - (new Date(r.created) as any)) / 86400000)));
    const avgResp = respDays.length ? Math.round(respDays.reduce((a, b) => a + b, 0) / respDays.length) : null;
    return { total: list.length, open, closed, declined, converted, avgResp };
  };
  const kpisOf = (s: any) => [
    { label: "Total Requests", value: s.total },
    { label: "Open", value: s.open, color: AMBER },
    { label: "Converted", value: s.converted, color: "#16a34a" },
    { label: "Declined", value: s.declined, color: "#6b7280" },
    { label: "Avg Response", value: s.avgResp === null ? "–" : `${s.avgResp}d`, color: BLUE, sub: "days" },
  ];
  const reqRow = (r: Row) => `<tr><td>${fmtD(r.created)}</td><td>${r.clientName || "--"}${r.clientPhone ? `<br><span style="color:#9ca3af">${r.clientPhone}</span>` : ""}</td><td>${r.svc || "--"}</td><td>${r.loc || "--"}</td><td>${fmtD(r.prefDate) || "--"}</td><td>${r.src || "--"}</td><td>${r.status || "Pending"}</td></tr>`;
  const reqTable = (list: Row[]) => list.length === 0
    ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0">No requests</p>`
    : `<table><thead><tr><th>Submitted</th><th>Client</th><th>Service</th><th>Location</th><th>Preferred Date</th><th>Source</th><th>Status</th></tr></thead><tbody>${list.map(reqRow).join("")}</tbody></table>`;
  const printMonth = () => {
    if (monthRequests.length === 0) { alert(`No requests submitted in ${mkLabel(selMK)}`); return; }
    const s = statsOf(monthRequests);
    openPrintWin(buildReportHtml({ moduleName: "Service Requests", periodLabel: mkLabel(selMK), summaryKpis: kpisOf(s), sections: [{ label: "Requests Submitted in " + mkLabel(selMK), table: reqTable(monthRequests) }] }));
  };
  const printAll = () => {
    if (requests.length === 0) { alert("No requests recorded yet"); return; }
    const s = statsOf(requests);
    const byMonth: Record<string, Row[]> = {};
    requests.forEach(r => { const mk = monthOf(r, getMK); if (!mk) return; (byMonth[mk] = byMonth[mk] || []).push(r); });
    const months = Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({
      moduleName: "Service Requests",
      periodLabel: "All History",
      summaryKpis: kpisOf(s),
      sections: months.map(mk => { const sub = statsOf(byMonth[mk]); return { label: `${mkLabel(mk)} — ${sub.total} request(s)`, kpis: kpisOf(sub), table: reqTable(byMonth[mk]) }; }),
    }));
  };

  return (<div className="space-y-5">{confirmEl}
    <div className="flex items-start justify-between flex-wrap gap-3">
      <MonthTabs records={requests} getMK={getMK} selMK={selMK} setSelMK={setSelMK}/>
      <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll}/>
    </div>
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-3 flex-wrap">
        <div className="p-3 rounded-xl text-sm font-bold" style={{ background: "#fffbeb", color: AMBER }}>
          {monthRequests.filter(r => r.status === "Pending").length} Pending in {mkLabel(selMK)}
        </div>
        <div className="p-3 rounded-xl text-sm font-bold" style={{ background: GL, color: G }}>
          {monthRequests.filter(r => r.status === "Converted").length} Converted
        </div>
      </div>
      <button onClick={() => setModal(blank)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
        <Plus size={14}/>Log Request
      </button>
    </div>
    <Card><div className="divide-y divide-gray-50">
      {monthRequests.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No requests submitted in {mkLabel(selMK)}</div>}
      {monthRequests.map(r => (
        <div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ background: G }}>{(r.clientName || "?")[0]}</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{r.clientName}</p>
              <p className="text-xs text-gray-500">{r.svc}  {fmtD(r.prefDate)}  via {r.src}{r.clientPhone ? <>  <span className="font-medium">{r.clientPhone}</span></> : ""}</p>
              {(r as any).assignedTo && (
                <p className="text-xs font-semibold mt-0.5" style={{ color: G }}>
                  ✓ Assigned to {(r as any).assignedTo}
                  {(r as any).assignedAt ? ` · ${fmtD((r as any).assignedAt)}` : ""}
                </p>
              )}
              {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{r.notes}"</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <SBadge s={r.status} custom={SC[r.status]}/>
            {r.status === "Pending" && (
              <button onClick={() => convert(r)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1" style={{ background: BLUE }}>
                <ArrowRight size={11}/>Convert
              </button>
            )}
            <button onClick={() => setModal(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button>
            <button onClick={() => del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
          </div>
        </div>
      ))}
    </div></Card>
    {modal && (
      <ModalWrap title={modal.id ? "Edit Request" : "Log Service Request"} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Fld label="Client Name"><input className={inp} value={modal.clientName} onChange={e => setModal((p: any) => ({ ...p, clientName: e.target.value }))}/></Fld>
          <Fld label="Client Phone"><input className={inp} type="tel" value={modal.clientPhone || ""} onChange={e => setModal((p: any) => ({ ...p, clientPhone: e.target.value }))} placeholder="e.g. 08031234567"/></Fld>
          <Fld label="Service">
            <select className={inp} value={modal.svc} onChange={e => setModal((p: any) => ({ ...p, svc: e.target.value }))}>
              <option value="">-- Select --</option>
              <option>General Cleaning</option><option>One-Time Cleaning</option><option>Deep Cleaning</option>
              <option>Pest Control</option><option>Fumigation</option><option>Training/Consultancy</option>
            </select>
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Location"><input className={inp} value={modal.loc} onChange={e => setModal((p: any) => ({ ...p, loc: e.target.value }))}/></Fld>
            <Fld label="Preferred Date"><input className={inp} type="date" value={modal.prefDate} onChange={e => setModal((p: any) => ({ ...p, prefDate: e.target.value }))}/></Fld>
            <Fld label="Source">
              <select className={inp} value={modal.src} onChange={e => setModal((p: any) => ({ ...p, src: e.target.value }))}>
                <option>Phone</option><option>WhatsApp</option><option>Email</option><option>Walk-in</option><option>Website</option><option>Referral</option>
              </select>
            </Fld>
          </div>
          <Fld label="Notes" col><textarea className={inp} rows={3} value={modal.notes} onChange={e => setModal((p: any) => ({ ...p, notes: e.target.value }))}/></Fld>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
          <button onClick={() => save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>Save</button>
        </div>
      </ModalWrap>
    )}
  </div>);
}
