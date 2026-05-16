// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Monthly tabs + PDF report helpers
//  Phase 2 extraction. Shared across Site Reports, Absence & Cover, Jobs,
//  Service Requests, and Requisitions.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, Plus, Download, FileText } from "lucide-react";
import { G, GL, BLUE, MONTHS } from "./constants";

// ── Public types ─────────────────────────────────────────────────────────────

/** Function that extracts a month-key value from a record. */
export type MonthAccessor<T = any> = (record: T) => string | null | undefined;

interface KPI { label: string; value: string | number; color?: string; sub?: string; }
interface ReportSection { label?: string; kpis?: KPI[]; table?: string; note?: string; }

// ── Pure utilities (no React) ────────────────────────────────────────────────

/**
 * Extract a YYYY-MM key from a record.
 *
 * The accessor can return YYYY-MM (returned as-is), YYYY-MM-DD (truncated),
 * or an ISO datetime (parsed). Falls back to extracting Date.now() from the
 * record's id field — handles legacy records that pre-date our explicit
 * createdAt fields (job IDs like "j1747032198432").
 */
export const monthOf = <T = any>(r: T, getMK?: MonthAccessor<T>): string | null => {
  try {
    const v = getMK ? getMK(r) : null;
    if (typeof v === "string") {
      if (/^\d{4}-\d{2}$/.test(v)) return v;
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 7);
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    }
  } catch {
    // fall through to id-based fallback below
  }
  const m = String((r as any)?.id || "").match(/\d{10,}/);
  if (m) {
    const d = new Date(Number(m[0]));
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return null;
};

/** Format a YYYY-MM key as "May 2026". Returns "Unknown" for malformed input. */
export const mkLabel = (mk: string | null | undefined): string => {
  if (!mk || !/^\d{4}-\d{2}$/.test(mk)) return "Unknown";
  const [y, m] = mk.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** YYYY-MM key for the current month. */
export const curMonthKey = (): string => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
};

/** Return the YYYY-MM key for the month after the given one. */
export const nextMonthKey = (mk: string): string => {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m, 1); // m is 1-indexed in input → 0-indexed for Date → becomes next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Return the YYYY-MM-DD a new-record form should default to, given the
 * currently-selected month tab. If the user is viewing the current month,
 * default to today (most common case, preserves muscle memory). If they
 * are viewing a past or future month, default to the first day of that
 * month so the new record lands in the tab they were looking at — instead
 * of silently jumping to whatever today's month is.
 *
 * This closes the "I'm on the April tab, I click New Requisition, I save,
 * the row appears under May" misfiling bug.
 */
export const defaultDateForMK = (mk: string): string => {
  if (!/^\d{4}-\d{2}$/.test(mk)) return new Date().toISOString().slice(0, 10);
  if (mk === curMonthKey()) return new Date().toISOString().slice(0, 10);
  return `${mk}-01`;
};

// ── PDF report builder (window.open + window.print → Save as PDF) ────────────

/** Open a new browser window with HTML content and trigger the print dialog. */
export const openPrintWin = (html: string): void => {
  const w = window.open("", "_blank", "width=920,height=1000");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
};

interface BuildReportArgs {
  moduleName: string;
  periodLabel: string;
  summaryKpis?: KPI[];
  sections?: ReportSection[];
}

/**
 * Build a print-ready HTML document with header, summary KPI strip, and a
 * sequence of report sections (newest first). The output is meant to be
 * opened in a new window via openPrintWin().
 */
export const buildReportHtml = ({
  moduleName,
  periodLabel,
  summaryKpis,
  sections,
}: BuildReportArgs): string => {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const kpiHtml = (kpis?: KPI[]): string =>
    (kpis || []).map(k =>
      `<div style="text-align:center;min-width:110px"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0;text-transform:uppercase;letter-spacing:.05em">${k.label}</p><p style="font-size:22px;font-weight:bold;color:${k.color || "#1B6B2F"};margin:2px 0">${k.value}</p>${k.sub ? `<p style="font-size:9px;color:#9ca3af;margin:0">${k.sub}</p>` : ""}</div>`
    ).join("");
  const sectionsHtml = (sections || []).map(s =>
    `<div style="margin-bottom:26px;page-break-inside:avoid">${s.label ? `<h3 style="margin:0 0 8px;font-size:13px;color:#1B6B2F;border-bottom:2px solid #1B6B2F;padding-bottom:4px">${s.label}</h3>` : ""}${s.kpis ? `<div style="display:flex;gap:24px;margin-bottom:10px;padding:8px 12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;flex-wrap:wrap">${kpiHtml(s.kpis)}</div>` : ""}${s.table || ""}${s.note ? `<p style="font-size:10px;color:#6b7280;font-style:italic;margin-top:6px">${s.note}</p>` : ""}</div>`
  ).join("");
  return `<!DOCTYPE html><html><head><title>${moduleName} Report — ${periodLabel}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}h1{color:#1B6B2F;margin-bottom:2px}h2{color:#374151;font-size:13px;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px}th{background:#f3f4f6;padding:6px 8px;text-align:left;border:1px solid #e5e7eb;font-weight:bold}td{padding:5px 8px;border:1px solid #e5e7eb;vertical-align:top}@media print{button{display:none}}</style></head><body><h1>Dust &amp; Wipes Limited — ${moduleName} Report</h1><h2>Period: ${periodLabel} &nbsp;&nbsp; Generated: ${today}</h2>${summaryKpis && summaryKpis.length ? `<div style="display:flex;gap:32px;margin-bottom:24px;padding:14px 18px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;flex-wrap:wrap">${kpiHtml(summaryKpis)}</div>` : ""}${sectionsHtml}</body></html>`;
};

// ── React components ─────────────────────────────────────────────────────────

interface MonthTabsProps<T = any> {
  records: T[];
  getMK: MonthAccessor<T>;
  selMK: string;
  setSelMK: (mk: string) => void;
  /** Optional callback — renders the "+ Open Next Month" button (Requisitions/Imprest). */
  onOpenNext?: () => void;
}

/**
 * Monthly tab strip — last 6 months as buttons + "More ▾" dropdown for older.
 * Current month is marked with a "●" indicator.
 */
export function MonthTabs<T = any>({
  records,
  getMK,
  selMK,
  setSelMK,
  onOpenNext,
}: MonthTabsProps<T>) {
  const curMK = curMonthKey();
  const [dropOpen, setDropOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allMonths = useMemo(() => {
    const s = new Set<string>([curMK]);
    (records || []).forEach(r => {
      const mk = monthOf(r, getMK);
      if (mk) s.add(mk);
    });
    return [...s].sort().reverse();
  }, [records, getMK, curMK]);

  const visible = allMonths.slice(0, 6);
  const older = allMonths.slice(6);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visible.map(mk => {
        const active = mk === selMK;
        return (
          <button key={mk} onClick={() => setSelMK(mk)}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={active ? { background: G, color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}>
            {mkLabel(mk)}{mk === curMK ? " ●" : ""}
          </button>
        );
      })}
      {older.length > 0 && (
        <div className="relative" ref={ddRef}>
          <button onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "#f3f4f6", color: "#374151" }}>
            More <ChevronDown size={12}/>
          </button>
          {dropOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px] max-h-72 overflow-y-auto">
              {older.map(mk => (
                <button key={mk} onClick={() => { setSelMK(mk); setDropOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 whitespace-nowrap"
                  style={mk === selMK ? { background: GL, color: G, fontWeight: 700 } : {}}>
                  {mkLabel(mk)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {onOpenNext && (
        <button onClick={onOpenNext}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: BLUE }}>
          <Plus size={13}/>Open Next Month
        </button>
      )}
    </div>
  );
}

interface PrintReportButtonsProps {
  onPrintMonth: () => void;
  onPrintAll: () => void;
}

/** Pair of "Print This Month" + "Print All History" buttons. */
export function PrintReportButtons({ onPrintMonth, onPrintAll }: PrintReportButtonsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={onPrintMonth}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border"
        style={{ color: BLUE, borderColor: "#bfdbfe", background: "#eff6ff" }}>
        <Download size={13}/>Print This Month
      </button>
      <button onClick={onPrintAll}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border"
        style={{ color: G, borderColor: "#bbf7d0", background: "#f0fdf4" }}>
        <FileText size={13}/>Print All History
      </button>
    </div>
  );
}
