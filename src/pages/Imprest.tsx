// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Imprest Fund page
//  Phase 4d extraction. Monthly imprest accounts with carry-forward logic,
//  expense logging, top-ups, and Print Report.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
import { Plus, Trash2, Eye, FileText, ClipboardCheck } from "lucide-react";
import { G, O, OL, GL, AMBER, RED, BLUE, TODAY, MONTHS, IMPREST_CATS, inp } from "../lib/constants";
import { fmt, fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge, KPI } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { StaffSelect } from "../components/pickers";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Imprest, Staff } from "../lib/schemas";
// Money math lives in lib/imprest-calc.ts so it's unit-tested without React.
import { sumExpenses, sumTopups, getPrevBal as libGetPrevBal } from "../lib/imprest-calc";
// Defensive YYYY-MM label formatter — already validates input format and
// returns "Unknown" for malformed keys instead of crashing on MONTHS[NaN].
import { mkLabel as safeMkLabel } from "../lib/monthly";

// ── Local types for embedded sub-records ─────────────────────────────────────
// expenses[] and topups[] are typed as z.array(z.any()) in the Zod schema.
interface Expense {
  id: string;
  date: string;
  amount: number;
  category?: string;
  item?: string;
  vendor?: string;
  note?: string;
}

interface Topup {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

interface BadgeStyle { bg: string; color: string; border: string; }

interface ImprestPageProps {
  imprests: Imprest[];
  setImprests: Dispatch<SetStateAction<Imprest[]>>;
  staff?: Staff[];
}

// Modal state is heterogeneous (different shape per modal type) — typed as a
// partial bag with a `type` discriminator. Field access is guarded by `type`.
type ModalType = "new" | "expense" | "topup";
interface ModalState {
  type: ModalType;
  // Common
  month?: string;
  // New imprest
  holder?: string;
  fundType?: string;
  title?: string;
  amount?: number;
  releaseDate?: string;
  branch?: string;
  deadline?: string;
  purpose?: string;
  _prevBal?: number;
  _manual?: number;
  // Expense / Topup
  impId?: string;
  imp?: Imprest;
  expDate?: string;
  expAmount?: number;
  expCat?: string;
  expItem?: string;
  expVendor?: string;
  expNote?: string;
  topupDate?: string;
  topupAmount?: number;
  topupNote?: string;
}

interface ManagerSummary {
  name: string;
  issued: number;
  spent: number;
  accounts: number;
}


export function ImprestPage({ imprests, setImprests, staff = [] }: ImprestPageProps) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [view, setView] = useState<Imprest | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const today = new Date();
  const curMK = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selMK, setSelMK] = useState<string>(curMK);

  // Sync only the changed record — prevents stale-closure overwrites when multiple sessions are active
  const saveOne = (updated: Imprest[], id: string): void => {
    setImprests(updated);
    const rec = updated.find(i => String(i.id) === id);
    if (rec) dbSync("imprests", [rec]);
  };
  // mKey: returns a YYYY-MM string. Validates the format defensively — a
  // malformed `month` field (e.g. "2026" only, or "" with a likewise malformed
  // releaseDate) used to fall through to .slice() and crash the page.
  const YYYY_MM = /^\d{4}-\d{2}$/;
  const mKey = (i: Imprest): string => {
    if (i.month && YYYY_MM.test(i.month)) return i.month;
    if (i.releaseDate && i.releaseDate.length >= 7) {
      const candidate = i.releaseDate.slice(0, 7);
      if (YYYY_MM.test(candidate)) return candidate;
    }
    return curMK;
  };
  const mkLabel = safeMkLabel; // already defensive — returns "Unknown" on bad input

  // Auto-switch to most recent month with records when current month is empty
  useEffect(() => {
    if (imprests.length > 0 && !imprests.some(i => mKey(i) === selMK)) {
      const keys = [...new Set(imprests.map(i => mKey(i)))].sort().reverse();
      if (keys[0]) setSelMK(keys[0]);
    }
  }, [imprests]); // eslint-disable-line react-hooks/exhaustive-deps

  const allMonths = useMemo<string[]>(() => {
    // Use the same defensive mKey so malformed records can't inject a bad
    // YYYY-MM into the tabs/buttons. curMK is always valid.
    const s = new Set<string>(imprests.map(mKey));
    s.add(curMK);
    return [...s].sort().reverse();
  }, [imprests, curMK]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthRecs: Imprest[] = imprests.filter(i => mKey(i) === selMK);

  const getPrevBal = (holder: string, beforeMK: string): number =>
    libGetPrevBal(imprests, holder, beforeMK, curMK);

  const addExpense = (id: string, exp: Expense): void => {
    const u = imprests.map(i => String(i.id) === id ? { ...i, expenses: [...((i.expenses as Expense[]) || []), exp] } : i);
    saveOne(u, id);
    toast.success("Expense logged");
  };
  const addTopUp = (id: string, tu: Topup): void => {
    const u = imprests.map(i => String(i.id) === id
      ? { ...i, amount: (Number(i.amount) || 0) + (Number(tu.amount) || 0), topups: [...((i.topups as Topup[]) || []), tu] }
      : i);
    saveOne(u, id);
    toast.success(`Top-up of ₦${(Number(tu.amount) || 0).toLocaleString()} added`);
  };
  const updStatus = (id: string, status: string): void => {
    const u = imprests.map(i => String(i.id) === id ? { ...i, status } : i);
    saveOne(u, id);
    toast.info(`Status → ${status}`);
  };
  const del = (id: string): void => {
    confirm("Delete this imprest record?", () => {
      setImprests(prev => prev.filter(i => String(i.id) !== id));
      dbDelete("imprests", id);
      toast.success("Imprest record deleted");
    });
  };

  const doMonthClose = (): void => {
    const active = monthRecs.filter(i => i.status === "Active");
    if (!active.length) return;
    confirm(`Close all ${active.length} active account(s) for ${mkLabel(selMK)}? You can open next month to carry forward balances.`, () => {
      const closed: Imprest[] = active.map(i => ({ ...i, status: "Closed", closedPeriod: mkLabel(selMK) }));
      setImprests(prev => prev.map(i => {
        const c = closed.find(cc => String(cc.id) === String(i.id));
        return c || i;
      }));
      dbSync("imprests", closed);
    });
  };

  const openNextMonth = (): void => {
    const latestMK = allMonths[0];
    if (!latestMK) return;
    const [y, m] = latestMK.split("-").map(Number);
    const nd = new Date(y, m, 1);
    const nextMK = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`;
    const nextLabel = mkLabel(nextMK);
    if (imprests.some(i => mKey(i) === nextMK)) { setSelMK(nextMK); return; }
    const lastRecs = imprests.filter(i => mKey(i) === latestMK);
    const holders: string[] = [...new Set(lastRecs.map(i => i.holder).filter((h): h is string => Boolean(h)))];
    if (!holders.length) { confirm(`Open ${nextLabel} with no carry-forward records?`, () => setSelMK(nextMK)); return; }
    confirm(`Open ${nextLabel}? Closing balances from ${holders.length} fund manager(s) will be carried forward automatically.`, () => {
      const ts = Date.now();
      const carries: Imprest[] = holders.map((holder, idx) => {
        const bal = getPrevBal(holder, nextMK);
        const ref = lastRecs.filter(i => i.holder === holder)[0] || ({} as Partial<Imprest>);
        return {
          id: `imp${ts}_${idx}`,
          month: nextMK,
          title: `${holder} — ${nextLabel}`,
          holder,
          fundType: ref.fundType || "Field Operations",
          branch: ref.branch || "",
          amount: bal,
          originalAmount: bal,
          releaseDate: nd.toISOString().split("T")[0],
          deadline: "",
          purpose: `Carried forward from ${mkLabel(latestMK)}. Previous closing balance: ₦${bal.toLocaleString()}`,
          status: "Active",
          expenses: [],
          topups: [],
          carriedFrom: latestMK,
          carryForwardAmount: bal,
          isCarryForward: true,
          closedPeriod: "",
        } as Imprest;
      });
      setImprests(prev => [...prev, ...carries]);
      dbSync("imprests", carries);
      setSelMK(nextMK);
    });
  };

  const printReport = (): void => {
    const ml = mkLabel(selMK);
    const tIssued = monthRecs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const tSpent = monthRecs.reduce((s, i) => s + sumExpenses(i.expenses as Expense[] | undefined), 0);
    const tBal = tIssued - tSpent;
    const accts = monthRecs.map(imp => {
      const expenses = (imp.expenses as Expense[] | undefined) || [];
      const topups = (imp.topups as Topup[] | undefined) || [];
      const spent = sumExpenses(expenses);
      const bal = (Number(imp.amount) || 0) - spent;
      const expHtml = expenses.length > 0
        ? `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px"><thead><tr style="background:#f3f4f6"><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Date</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Item</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Category</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Vendor</th><th style="padding:3px 8px;text-align:right;border:1px solid #e5e7eb">Amount (&#x20a6;)</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Notes</th></tr></thead><tbody>${expenses.map(e => `<tr><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.date || ""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.item || ""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.category || ""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.vendor || ""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px;text-align:right">${(Number(e.amount) || 0).toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.note || ""}</td></tr>`).join("")}</tbody></table>`
        : `<p style="font-size:10px;color:#9ca3af;margin:4px 0">No expenses recorded</p>`;
      const tuHtml = topups.length > 0
        ? `<p style="font-size:10px;color:#2563EB;margin:4px 0">Top-ups: ${topups.map(t => `+&#x20a6;${(Number(t.amount) || 0).toLocaleString()} on ${t.date || ""}${t.note ? ` (${t.note})` : ""}`).join("; ")}</p>`
        : "";
      return `<div style="margin-bottom:20px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden"><div style="background:#1B6B2F;color:white;padding:8px 12px;display:flex;justify-content:space-between"><span style="font-weight:bold">${imp.title}${imp.isCarryForward ? " (Carry-forward)" : ""}</span><span>Status: ${imp.status}</span></div><div style="background:#f9fafb;padding:6px 12px;display:flex;gap:32px;font-size:11px"><span>Holder: <strong>${imp.holder || "N/A"}</strong></span><span>Issued: <strong style="color:#1B6B2F">&#x20a6;${(Number(imp.amount) || 0).toLocaleString()}</strong></span><span>Spent: <strong style="color:#E85D04">&#x20a6;${spent.toLocaleString()}</strong></span><span>Balance: <strong style="color:${bal < 0 ? "#DC2626" : "#2563EB"}">&#x20a6;${bal.toLocaleString()}</strong></span></div><div style="padding:8px 12px">${tuHtml}${expHtml}</div></div>`;
    });
    const html = `<!DOCTYPE html><html><head><title>Imprest Fund Report &mdash; ${ml}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}h1{color:#1B6B2F;margin-bottom:2px}h2{color:#374151;font-size:13px;margin:0 0 16px}@media print{button{display:none}}</style></head><body><h1>Dust &amp; Wipes Limited &mdash; Imprest Fund Report</h1><h2>Period: ${ml} &nbsp;&nbsp; Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</h2><div style="display:flex;gap:40px;margin-bottom:20px;padding:12px 16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">TOTAL ISSUED</p><p style="font-size:22px;font-weight:bold;color:#1B6B2F;margin:2px 0">&#x20a6;${tIssued.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">TOTAL SPENT</p><p style="font-size:22px;font-weight:bold;color:#E85D04;margin:2px 0">&#x20a6;${tSpent.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">NET BALANCE</p><p style="font-size:22px;font-weight:bold;color:${tBal < 0 ? "#DC2626" : "#2563EB"};margin:2px 0">&#x20a6;${tBal.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">ACCOUNTS</p><p style="font-size:22px;font-weight:bold;color:#374151;margin:2px 0">${monthRecs.length}</p></div></div><h2 style="margin-bottom:10px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Account Breakdown</h2>${accts.join("")}</body></html>`;
    const w = window.open("", "_blank", "width=920,height=1000");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const totalIssued = monthRecs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalSpent = monthRecs.reduce((s, i) => s + sumExpenses(i.expenses as Expense[] | undefined), 0);
  const byManager: Record<string, ManagerSummary> = {};
  monthRecs.forEach(imp => {
    const k = imp.holder || "Unknown";
    if (!byManager[k]) byManager[k] = { name: k, issued: 0, spent: 0, accounts: 0 };
    byManager[k].issued += Number(imp.amount) || 0;
    byManager[k].spent += sumExpenses(imp.expenses as Expense[] | undefined);
    byManager[k].accounts++;
  });
  const SC: Record<string, BadgeStyle> = {
    "Active": { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    "Pending Reconciliation": { bg: "#fffbeb", color: AMBER, border: "#fde68a" },
    "Closed": { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
    "Flagged": { bg: "#fee2e2", color: RED, border: "#fca5a5" },
  };
  const selLabel = mkLabel(selMK);
  const isCurMonth = selMK === curMK;

  return (<div className="space-y-5">{confirmEl}

    {/* Month Navigator */}
    <div className="flex items-center gap-2 flex-wrap">
      {allMonths.map(mk => {
        // Belt-and-suspenders: mKey already guarantees valid YYYY-MM, but the
        // button label still computes its short form independently. If
        // anything ever bypasses mKey (e.g. a future migration writes a raw
        // mk), the `?.slice(0,3) ?? "?"` fallback prevents a page crash.
        const [y2, m2] = mk.split("-").map(Number);
        const monthName = MONTHS[(m2 || 0) - 1];
        const lbl = `${monthName ? monthName.slice(0, 3) : "?"} ${y2 || ""}`;
        const active = mk === selMK;
        return (<button key={mk} onClick={() => setSelMK(mk)} className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${active ? "text-white" : "text-gray-500 hover:text-gray-700"}`} style={active ? { background: G } : { background: "#f3f4f6" }}>{lbl}{mk === curMK ? " ●" : ""}</button>);
      })}
      <button onClick={openNextMonth} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: BLUE }}><Plus size={13} />Open Next Month</button>
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI icon="₦" label="Total Issued" value={fmt(totalIssued)} sub={selLabel} bg={GL} />
      <KPI icon="" label="Total Spent" value={fmt(totalSpent)} sub="Expenses logged" bg={OL} />
      <KPI icon="" label="Net Balance" value={fmt(totalIssued - totalSpent)} sub={(totalIssued - totalSpent) < 0 ? "Overspent" : "Remaining"} bg={(totalIssued - totalSpent) < 0 ? "#fee2e2" : "#f0f9ff"} />
      <KPI icon="" label="Accounts" value={monthRecs.length} sub={`${monthRecs.filter(i => i.status === "Active").length} active`} bg="#f9fafb" />
    </div>

    {/* Per-Manager Summary */}
    {Object.values(byManager).length > 0 && <Card className="p-5">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Fund Manager Summary — {selLabel}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.values(byManager).map(m => {
          const bal = m.issued - m.spent;
          const prevBal = getPrevBal(m.name, selMK);
          return (
            <div key={m.name} className="p-3.5 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
              <p className="text-sm font-bold text-gray-800 mb-1">{m.name}</p>
              {prevBal > 0 && <p className="text-xs text-blue-600 mb-2">↩ Carried in from last month: <strong>{fmt(prevBal)}</strong></p>}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs font-bold text-gray-400">Issued</p><p className="text-sm font-black" style={{ color: G }}>{fmt(m.issued)}</p></div>
                <div><p className="text-xs font-bold text-gray-400">Spent</p><p className="text-sm font-black" style={{ color: O }}>{fmt(m.spent)}</p></div>
                <div><p className="text-xs font-bold text-gray-400">Balance</p><p className="text-sm font-black" style={{ color: bal < 0 ? RED : BLUE }}>{fmt(bal)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>}

    {/* Action */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button onClick={printReport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border" style={{ color: BLUE, borderColor: "#bfdbfe", background: "#eff6ff" }}><FileText size={14} />Print Report</button>
        {monthRecs.some(i => i.status === "Active") && <button onClick={doMonthClose} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: AMBER }}><ClipboardCheck size={14} />Month-End Close</button>}
      </div>
      <button onClick={() => setModal({ type: "new", month: selMK })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}><Plus size={14} />New Imprest</button>
    </div>

    {/* Records list */}
    <Card><div className="divide-y divide-gray-50">
      {monthRecs.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">
        No imprest records for {selLabel}
        {isCurMonth && <p className="text-xs mt-1">Use “+ New Imprest” to add one, or “Open Next Month” to carry balances forward from the previous month.</p>}
      </div>}
      {monthRecs.map(imp => {
        const expenses = (imp.expenses as Expense[] | undefined) || [];
        const topups = (imp.topups as Topup[] | undefined) || [];
        const spent = sumExpenses(expenses);
        const topupsTotal = sumTopups(topups);
        const bal = (Number(imp.amount) || 0) - spent;
        const overdue = !!imp.deadline && new Date(imp.deadline) < TODAY && imp.status === "Active";
        const sts = overdue ? "Flagged" : (imp.status || "");
        return (<div key={String(imp.id)} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ background: bal < 0 ? RED : G }}>₦</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-semibold text-gray-800 text-sm">{imp.title}</p>
                  {imp.isCarryForward && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#eff6ff", color: BLUE }}>↩ Carry-fwd</span>}
                  <SBadge s={sts} custom={SC[sts]} />
                </div>
                <p className="text-xs text-gray-500">Holder: {imp.holder} · {imp.fundType || "Field Operations"} · {fmtD(imp.releaseDate)}</p>
                {imp.purpose && <p className="text-xs text-gray-400 truncate max-w-sm mt-0.5">{imp.purpose}</p>}
                {overdue && <p className="text-xs text-red-600 font-semibold mt-0.5">⚠ Reconciliation overdue</p>}
                <div className="flex gap-4 mt-1.5 text-xs flex-wrap">
                  {imp.isCarryForward && <span>Carry-in: <strong style={{ color: BLUE }}>{fmt(imp.carryForwardAmount || 0)}</strong></span>}
                  <span>Issued: <strong>{fmt(imp.originalAmount || imp.amount)}</strong></span>
                  {topupsTotal > 0 && <span>Top-ups: <strong style={{ color: BLUE }}>+{fmt(topupsTotal)}</strong></span>}
                  <span>Spent: <strong style={{ color: O }}>{fmt(spent)}</strong></span>
                  <span>Balance: <strong style={{ color: bal < 0 ? RED : G }}>{fmt(bal)}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <button onClick={() => setView(imp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100" title="View Details"><Eye size={13} /></button>
              <button onClick={() => setModal({ type: "expense", impId: String(imp.id), imp })} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 border border-green-100" title="Log Expense"><Plus size={13} /></button>
              <button onClick={() => setModal({ type: "topup", impId: String(imp.id), imp })} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-100" title="Top Up Fund">↑</button>
              <button onClick={() => del(String(imp.id))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13} /></button>
            </div>
          </div>
        </div>);
      })}
    </div></Card>

    {/* NEW IMPREST MODAL */}
    {modal?.type === "new" && <ModalWrap title="Create Imprest Account" onClose={() => setModal(null)} wide>
      <div className="grid grid-cols-2 gap-4">
        <Fld label="Fund Holder (Supervisor)">
          <StaffSelect staff={staff} value={modal.holder || ""} filter={s => s.category === "Office Staff"} placeholder="-- Select supervisor --" onChange={v => {
            const prev = getPrevBal(v, modal.month || curMK);
            setModal(p => p ? ({ ...p, holder: v, _prevBal: prev, amount: p._manual != null ? p._manual : (prev || p.amount || 0), title: `${v} — ${mkLabel(modal.month || curMK)}` }) : p);
          }} />
        </Fld>
        <Fld label="Fund Type">
          <select className={inp} value={modal.fundType || "Field Operations"} onChange={e => setModal(p => p ? ({ ...p, fundType: e.target.value }) : p)}><option>Field Operations</option><option>Office Operations / Supplies</option></select>
        </Fld>
        <Fld label="Title" col><input className={inp} value={modal.title || ""} onChange={e => setModal(p => p ? ({ ...p, title: e.target.value }) : p)} placeholder={`e.g. Site Operations Fund — ${selLabel}`} /></Fld>
        {(modal._prevBal || 0) > 0 && <div className="col-span-2 flex items-center justify-between p-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <span className="text-blue-700 text-xs">↩ <strong>{modal.holder}</strong> has an unspent balance of <strong>{fmt(modal._prevBal || 0)}</strong> from last month — pre-filled as starting amount.</span>
          <button onClick={() => setModal(p => p ? ({ ...p, amount: p._prevBal, _manual: p._prevBal }) : p)} className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-blue-300 text-blue-700 ml-3 flex-shrink-0">Use Balance</button>
        </div>}
        <Fld label="Amount Released (₦)"><input className={inp} type="number" min="0" value={modal.amount || ""} onChange={e => setModal(p => p ? ({ ...p, amount: Number(e.target.value), _manual: Number(e.target.value) }) : p)} /></Fld>
        <Fld label="Release Date"><input className={inp} type="date" value={modal.releaseDate || today.toISOString().split("T")[0]} onChange={e => setModal(p => p ? ({ ...p, releaseDate: e.target.value }) : p)} /></Fld>
        <Fld label="Branch / Site"><input className={inp} value={modal.branch || ""} onChange={e => setModal(p => p ? ({ ...p, branch: e.target.value }) : p)} /></Fld>
        <Fld label="Reconciliation Deadline"><input className={inp} type="date" value={modal.deadline || ""} onChange={e => setModal(p => p ? ({ ...p, deadline: e.target.value }) : p)} /></Fld>
        <Fld label="Purpose" col><textarea className={inp} rows={2} value={modal.purpose || ""} onChange={e => setModal(p => p ? ({ ...p, purpose: e.target.value }) : p)} /></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={() => {
          if (!modal.holder || !modal.amount) return;
          const prevBal = modal._prevBal || 0;
          const isCarry = prevBal > 0;
          const { _prevBal, _manual, type, ...rest } = modal;
          void _prevBal; void _manual; void type;
          const newRec: Imprest = {
            ...rest,
            id: "imp" + Date.now(),
            month: modal.month || curMK,
            amount: modal.amount || 0,
            originalAmount: modal.amount || 0,
            status: "Active",
            expenses: [],
            topups: [],
            carryForwardAmount: isCarry ? prevBal : 0,
            isCarryForward: isCarry,
          } as unknown as Imprest;
          setImprests(prev => [...prev, newRec]);
          dbSync("imprests", [newRec]);
          toast.success("Imprest account created");
          setModal(null);
        }} disabled={!modal.holder || !modal.amount} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>Create</button>
      </div>
    </ModalWrap>}

    {/* LOG EXPENSE MODAL */}
    {modal?.type === "expense" && modal.imp && <ModalWrap title={`Log Expense — ${modal.imp.title}`} onClose={() => setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm flex justify-between" style={{ background: GL }}>
          <span className="font-bold text-green-700">Available Balance:</span>
          <span className="font-black" style={{ color: ((Number(modal.imp.amount) || 0) - sumExpenses(modal.imp.expenses as Expense[] | undefined)) < 0 ? RED : G }}>{fmt((Number(modal.imp.amount) || 0) - sumExpenses(modal.imp.expenses as Expense[] | undefined))}</span>
        </div>
        <p className="text-xs text-blue-600 font-medium">ℹ Negative balance is permitted — overspend will be flagged.</p>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Date"><input className={inp} type="date" value={modal.expDate || TODAY.toISOString().split("T")[0]} onChange={e => setModal(p => p ? ({ ...p, expDate: e.target.value }) : p)} /></Fld>
          <Fld label="Amount (₦)"><input className={inp} type="number" min="0" value={modal.expAmount || ""} onChange={e => setModal(p => p ? ({ ...p, expAmount: Number(e.target.value) }) : p)} /></Fld>
        </div>
        <Fld label="Category"><select className={inp} value={modal.expCat || ""} onChange={e => setModal(p => p ? ({ ...p, expCat: e.target.value }) : p)}><option value="">-- Select --</option>{IMPREST_CATS.map((c: string) => <option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Item / Service" col><input className={inp} value={modal.expItem || ""} onChange={e => setModal(p => p ? ({ ...p, expItem: e.target.value }) : p)} /></Fld>
        <Fld label="Vendor"><input className={inp} value={modal.expVendor || ""} onChange={e => setModal(p => p ? ({ ...p, expVendor: e.target.value }) : p)} /></Fld>
        <Fld label="Notes"><textarea className={inp} rows={2} value={modal.expNote || ""} onChange={e => setModal(p => p ? ({ ...p, expNote: e.target.value }) : p)} /></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={() => {
          if (!modal.expAmount || !modal.expItem || !modal.impId) return;
          addExpense(modal.impId, {
            id: "exp" + Date.now(),
            date: modal.expDate || TODAY.toISOString().split("T")[0],
            amount: modal.expAmount || 0,
            category: modal.expCat,
            item: modal.expItem,
            vendor: modal.expVendor,
            note: modal.expNote,
          });
          setModal(null);
        }} disabled={!modal.expAmount || !modal.expItem} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>Log Expense</button>
      </div>
    </ModalWrap>}

    {/* TOP UP MODAL */}
    {modal?.type === "topup" && modal.imp && <ModalWrap title={`Top Up — ${modal.imp.title}`} onClose={() => setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm" style={{ background: GL }}><p className="text-xs font-bold text-green-700 mb-1">Current Fund Total</p><p className="text-lg font-black" style={{ color: G }}>{fmt(modal.imp.amount)}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Top-Up Date"><input className={inp} type="date" value={modal.topupDate || TODAY.toISOString().split("T")[0]} onChange={e => setModal(p => p ? ({ ...p, topupDate: e.target.value }) : p)} /></Fld>
          <Fld label="Amount to Add (₦)"><input className={inp} type="number" min="1" value={modal.topupAmount || ""} onChange={e => setModal(p => p ? ({ ...p, topupAmount: Number(e.target.value) }) : p)} /></Fld>
        </div>
        <Fld label="Reason / Note" col><input className={inp} value={modal.topupNote || ""} onChange={e => setModal(p => p ? ({ ...p, topupNote: e.target.value }) : p)} placeholder="e.g. Additional site expenses authorised by admin" /></Fld>
        {(modal.topupAmount || 0) > 0 && <div className="p-3 rounded-xl text-sm" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}><span className="text-blue-700 font-semibold">New total after top-up: </span><span className="font-black text-blue-800">{fmt((Number(modal.imp.amount) || 0) + (modal.topupAmount || 0))}</span></div>}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={() => {
          if (!modal.topupAmount || modal.topupAmount <= 0 || !modal.impId) return;
          addTopUp(modal.impId, {
            id: "tu" + Date.now(),
            date: modal.topupDate || TODAY.toISOString().split("T")[0],
            amount: modal.topupAmount,
            note: modal.topupNote,
          });
          setModal(null);
        }} disabled={!modal.topupAmount || modal.topupAmount <= 0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: BLUE }}>Add Top-Up</button>
      </div>
    </ModalWrap>}

    {/* DETAIL VIEW */}
    {view && <ModalWrap title={`Imprest — ${view.title}`} onClose={() => setView(null)} xl>
      <div className="flex justify-between items-center mb-4 pb-4 border-b flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800">{view.title}</p>
            {view.isCarryForward && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#eff6ff", color: BLUE }}>↩ Carry-forward</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Holder: {view.holder} · {view.fundType || "Field Operations"} · Released: {fmtD(view.releaseDate)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { updStatus(String(view.id), "Pending Reconciliation"); setView(v => v ? ({ ...v, status: "Pending Reconciliation" }) : v); }} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-amber-300 text-amber-700">Reconcile</button>
          <button onClick={() => { updStatus(String(view.id), "Closed"); setView(v => v ? ({ ...v, status: "Closed" }) : v); }} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-300 text-gray-600">Close</button>
        </div>
      </div>
      {(() => {
        const expenses = (view.expenses as Expense[] | undefined) || [];
        const spent = sumExpenses(expenses);
        const bal = (Number(view.amount) || 0) - spent;
        const cells: Array<[string, number, string, string]> = [
          ["Issued", Number(view.amount) || 0, GL, G],
          ["Spent", spent, OL, O],
          ["Balance", bal, bal < 0 ? "#fee2e2" : "#f0f9ff", bal < 0 ? RED : BLUE],
        ];
        return (<>
          {view.isCarryForward && <div className="p-3 rounded-xl text-sm mb-4" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <span className="text-blue-700 text-xs">↩ Balance carried forward from <strong>{view.carriedFrom ? mkLabel(view.carriedFrom) : ""}</strong>: <strong>{fmt(view.carryForwardAmount || 0)}</strong></span>
          </div>}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cells.map(([l, v, bg, c]) =>
              <div key={l} className="p-4 rounded-xl text-center" style={{ background: bg }}><p className="text-lg font-black" style={{ color: c }}>{fmt(v)}</p><p className="text-xs font-bold text-gray-500 mt-1">{l}</p></div>
            )}
          </div>
        </>);
      })()}
      {((view.topups as Topup[] | undefined) || []).length > 0 && <div className="mb-4"><p className="text-xs font-bold text-blue-600 mb-2">TOP-UPS</p><div className="space-y-1">{((view.topups as Topup[] | undefined) || []).map(t => <div key={t.id} className="flex justify-between p-2.5 rounded-lg text-xs" style={{ background: "#eff6ff" }}><span>{fmtD(t.date)} — {t.note || "Top-up"}</span><span className="font-bold text-blue-700">+{fmt(t.amount)}</span></div>)}</div></div>}
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Expenses</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{ background: "#f9fafb" }} className="border-b">{["Date", "Item", "Category", "Vendor", "Amount", "Notes"].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-50">{((view.expenses as Expense[] | undefined) || []).length === 0
          ? <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No expenses logged</td></tr>
          : ((view.expenses as Expense[] | undefined) || []).map(e => <tr key={e.id} className="hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtD(e.date)}</td><td className="px-3 py-2 font-medium text-gray-800">{e.item}</td><td className="px-3 py-2 text-xs text-gray-500">{e.category}</td><td className="px-3 py-2 text-xs text-gray-500">{e.vendor || "--"}</td><td className="px-3 py-2 font-bold text-gray-800">{fmt(e.amount)}</td><td className="px-3 py-2 text-xs text-gray-400">{e.note || "--"}</td></tr>)}
        </tbody>
      </table></div>
    </ModalWrap>}
  </div>);
}
