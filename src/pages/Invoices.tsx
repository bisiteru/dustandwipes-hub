// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Invoices (Phase D3)
//  Raise a client bill (from a completed job or blank), edit line items, and
//  request online payment via Paystack. The gateway is env-gated in the edge
//  function, so invoices work as documents (and print) before any key exists.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Receipt, Plus, Trash2, Printer, CreditCard } from "lucide-react";
import { G, O, RED, inp } from "../lib/constants";
import { fmt, fmtD } from "../lib/format";
import { dbSync, dbDelete, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Invoice, Job, CurrentUser } from "../lib/schemas";

interface LineItem { desc: string; qty: number; rate: number; }
type Draft = Partial<Invoice> & { _new?: boolean };

const VAT_RATE = 0.075; // Nigeria VAT 7.5%
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Draft:     { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  Sent:      { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Paid:      { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  Overdue:   { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  Cancelled: { bg: "#f3f4f6", color: "#9ca3af", border: "#e5e7eb" },
};

export interface InvoicesPageProps {
  invoices: Invoice[];
  setInvoices: Dispatch<SetStateAction<Invoice[]>>;
  jobs: Job[];
  user: CurrentUser;
}

export function InvoicesPage({ invoices, setInvoices, jobs, user }: InvoicesPageProps) {
  const toast = useToast();
  const [confirm, confirmEl] = useConfirm();
  const [modal, setModal] = useState<Draft | null>(null);

  const totals = useMemo(() => {
    const outstanding = invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + n(i.total), 0);
    const paid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + n(i.total), 0);
    return { outstanding, paid };
  }, [invoices]);

  const nextNo = (): string => {
    const yr = new Date().getFullYear();
    const seq = invoices.filter(i => String(i.invoiceNo || "").includes(`DW-${yr}`)).length + 1;
    return `DW-${yr}-${String(seq).padStart(4, "0")}`;
  };

  const recalc = (d: Draft): Draft => {
    const items = (d.items as LineItem[] | undefined) || [];
    const subtotal = items.reduce((s, it) => s + n(it.qty) * n(it.rate), 0);
    const vat = Math.round(subtotal * VAT_RATE);
    return { ...d, subtotal, vat, total: subtotal + vat };
  };

  const persist = (next: Invoice[]) => {
    setInvoices(next);
    dbSync("invoices", next, () => toast.error("Invoice change failed to sync"));
  };

  const openNew = (fromJob?: Job) => {
    const items: LineItem[] = fromJob
      ? [{ desc: `${fromJob.svc || "Service"}${fromJob.date ? ` — ${fmtD(fromJob.date)}` : ""}`, qty: 1, rate: 0 }]
      : [{ desc: "", qty: 1, rate: 0 }];
    setModal(recalc({
      _new: true, invoiceNo: nextNo(), status: "Draft",
      clientName: fromJob?.clientName || "", contactPhone: fromJob?.clientPhone || "",
      jobId: fromJob ? String(fromJob.id) : "", items,
      dueDate: "", createdBy: user.name,
    }));
  };

  const save = (d: Draft) => {
    if (!d.clientName) { toast.info("Client name is required"); return; }
    const r = recalc(d);
    const id = d.id || `inv${Date.now()}`;
    const row: Invoice = { ...(r as Invoice), id, createdAt: d.createdAt || new Date().toISOString() } as Invoice;
    persist(d.id ? invoices.map(i => (String(i.id) === id ? row : i)) : [row, ...invoices]);
    toast.success(d.id ? "Invoice updated" : "Invoice created");
    setModal(null);
  };

  const del = (id: string) => confirm("Delete this invoice?", () => {
    setInvoices(prev => prev.filter(i => String(i.id) !== id));
    dbDelete("invoices", id).catch(() => {});
    toast.success("Invoice deleted");
  });

  const markPaid = (inv: Invoice) => {
    persist(invoices.map(i => String(i.id) === String(inv.id) ? { ...i, status: "Paid", paidAt: new Date().toISOString() } as Invoice : i));
    toast.success("Marked paid");
  };

  // Kick off Paystack checkout (opens hosted page in a new tab). 501 → gateway
  // not configured yet; the invoice stays a document.
  const requestPayment = async (inv: Invoice) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/paystack-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ invoiceId: String(inv.id), callbackUrl: window.location.origin }),
      });
      const out = await r.json();
      if (r.status === 501) { toast.info("Online payments not enabled yet — set PAYSTACK_SECRET_KEY to activate."); return; }
      if (!out?.ok || !out.authorization_url) { toast.error("Could not start payment. Check the invoice email/total."); return; }
      persist(invoices.map(i => String(i.id) === String(inv.id) ? { ...i, status: i.status === "Paid" ? "Paid" : "Sent", paystackRef: out.reference } as Invoice : i));
      window.open(out.authorization_url, "_blank");
    } catch { toast.error("Payment request failed — check your connection."); }
  };

  const printInvoice = (inv: Invoice) => {
    const items = (inv.items as LineItem[] | undefined) || [];
    const rows = items.map(it => `<tr><td>${it.desc}</td><td style="text-align:center">${n(it.qty)}</td><td style="text-align:right">${fmt(n(it.rate))}</td><td style="text-align:right">${fmt(n(it.qty) * n(it.rate))}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>${inv.invoiceNo}</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;padding:32px;max-width:720px;margin:auto}
      h1{color:#1B6B2F;margin:0} .muted{color:#6b7280} table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left} th{background:#f9fafb;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
      .tot{text-align:right;margin-top:12px} .tot div{margin:2px 0} .tot .grand{font-size:16px;font-weight:800;color:#1B6B2F}
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Dust &amp; Wipes Limited</h1><p class="muted">Cleaning &amp; Pest Control · Abuja</p></div>
        <div style="text-align:right"><p class="muted">Invoice</p><p style="font-size:18px;font-weight:800">${inv.invoiceNo || ""}</p><p class="muted">${inv.status || "Draft"}</p></div>
      </div>
      <p><strong>Bill to:</strong> ${inv.clientName || ""}${inv.contactPhone ? ` · ${inv.contactPhone}` : ""}</p>
      ${inv.dueDate ? `<p class="muted">Due: ${fmtD(inv.dueDate)}</p>` : ""}
      <table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot">
        <div>Subtotal: ${fmt(n(inv.subtotal))}</div>
        <div>VAT (7.5%): ${fmt(n(inv.vat))}</div>
        <div class="grand">Total: ${fmt(n(inv.total))}</div>
      </div>
      <p class="muted" style="margin-top:24px">Thank you for your business.</p>
    </body></html>`;
    const w = window.open("", "_blank", "width=760,height=900");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
  };

  const completedJobs = jobs.filter(j => j.status === "Completed" || j.status === "Closed");

  return (
    <div className="space-y-5">
      {confirmEl}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Receipt size={16} style={{ color: G }} /> Invoices</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="font-semibold" style={{ color: RED }}>{fmt(totals.outstanding)}</span> outstanding · <span className="font-semibold" style={{ color: G }}>{fmt(totals.paid)}</span> collected
          </p>
        </div>
        <button onClick={() => openNew()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {completedJobs.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Bill a completed job:</p>
          <div className="flex gap-2 flex-wrap">
            {completedJobs.slice(0, 8).map(j => (
              <button key={String(j.id)} onClick={() => openNew(j)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50">
                {j.clientName} · {j.svc}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12"><Receipt size={32} className="mx-auto mb-3 opacity-20" /><p className="text-sm text-gray-500">No invoices yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <div key={String(inv.id)} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{inv.invoiceNo} · {inv.clientName}</p>
                  <p className="text-xs text-gray-400">{fmt(n(inv.total))}{inv.dueDate ? ` · due ${fmtD(inv.dueDate)}` : ""}{inv.paidAt ? ` · paid ${fmtD(inv.paidAt)}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <SBadge s={inv.status || "Draft"} custom={STATUS_STYLE[inv.status || "Draft"]} />
                  {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                    <button onClick={() => requestPayment(inv)} title="Request online payment" className="w-7 h-7 flex items-center justify-center rounded-lg text-white" style={{ background: O }}><CreditCard size={13} /></button>
                  )}
                  {inv.status !== "Paid" && (
                    <button onClick={() => markPaid(inv)} title="Mark paid" className="text-xs px-2 py-1.5 rounded-lg font-semibold text-white" style={{ background: G }}>Paid</button>
                  )}
                  <button onClick={() => printInvoice(inv)} title="Print / PDF" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 border border-gray-200"><Printer size={13} /></button>
                  <button onClick={() => setModal(recalc({ ...inv }))} className="text-xs px-2 py-1.5 rounded-lg border border-blue-100 text-blue-500 hover:bg-blue-50 font-semibold">Edit</button>
                  <button onClick={() => del(String(inv.id))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <ModalWrap title={modal._new ? "New Invoice" : `Invoice ${modal.invoiceNo || ""}`} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Client" required><input className={inp} value={modal.clientName || ""} onChange={e => setModal(p => p ? { ...p, clientName: e.target.value } : p)} /></Fld>
              <Fld label="Phone"><input className={inp} value={modal.contactPhone || ""} onChange={e => setModal(p => p ? { ...p, contactPhone: e.target.value } : p)} /></Fld>
              <Fld label="Email (for Paystack receipt)"><input className={inp} value={modal.contactEmail || ""} onChange={e => setModal(p => p ? { ...p, contactEmail: e.target.value } : p)} /></Fld>
              <Fld label="Due date"><input className={inp} type="date" value={modal.dueDate || ""} onChange={e => setModal(p => p ? { ...p, dueDate: e.target.value } : p)} /></Fld>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line items</span>
                <button onClick={() => setModal(p => p ? recalc({ ...p, items: [...((p.items as LineItem[]) || []), { desc: "", qty: 1, rate: 0 }] }) : p)} className="text-xs font-semibold flex items-center gap-1" style={{ color: G }}><Plus size={12} /> Add line</button>
              </div>
              <div className="space-y-2">
                {((modal.items as LineItem[]) || []).map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input className={`${inp} flex-1`} placeholder="Description" value={it.desc} onChange={e => setModal(p => { if (!p) return p; const items = [...(p.items as LineItem[])]; items[idx] = { ...items[idx], desc: e.target.value }; return recalc({ ...p, items }); })} />
                    <input className={`${inp} w-16`} type="number" min="0" value={it.qty} onChange={e => setModal(p => { if (!p) return p; const items = [...(p.items as LineItem[])]; items[idx] = { ...items[idx], qty: Number(e.target.value) }; return recalc({ ...p, items }); })} />
                    <input className={`${inp} w-28`} type="number" min="0" placeholder="Rate" value={it.rate} onChange={e => setModal(p => { if (!p) return p; const items = [...(p.items as LineItem[])]; items[idx] = { ...items[idx], rate: Number(e.target.value) }; return recalc({ ...p, items }); })} />
                    <span className="w-24 text-right text-sm text-gray-600 tabular-nums">{fmt(n(it.qty) * n(it.rate))}</span>
                    <button onClick={() => setModal(p => p ? recalc({ ...p, items: (p.items as LineItem[]).filter((_, i) => i !== idx) }) : p)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right text-sm space-y-0.5 border-t pt-3">
              <div className="text-gray-500">Subtotal: <span className="tabular-nums">{fmt(n(modal.subtotal))}</span></div>
              <div className="text-gray-500">VAT 7.5%: <span className="tabular-nums">{fmt(n(modal.vat))}</span></div>
              <div className="text-lg font-black" style={{ color: G }}>Total: <span className="tabular-nums">{fmt(n(modal.total))}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={() => save(modal)} disabled={!modal.clientName} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>{modal._new ? "Create" : "Save"}</button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
