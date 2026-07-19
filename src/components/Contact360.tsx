// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Contact 360° timeline
//  Phase A (4/5). One contact, every touchpoint: leads + stage moves,
//  service requests, jobs (with GPS check-ins), and site reports — merged
//  into a single reverse-chronological timeline. The aggregation spine is
//  sameName() (word-boundary matching, tightened this phase) because the
//  legacy data keys on names, not foreign keys.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from "react";
import { X, Inbox, Briefcase, ClipboardList, Filter, Phone } from "lucide-react";
import { G, O, BLUE, AMBER, RED } from "../lib/constants";
import { fmt, fmtD, sameName } from "../lib/format";
import { SBadge } from "./ui/primitives";
import type { Lead, Request_, Job, SiteReport } from "../lib/schemas";

interface TimelineEvent {
  at: string;            // ISO or YYYY-MM-DD — used for sort
  kind: "lead" | "stage" | "request" | "job" | "report";
  title: string;
  detail: string;
  badge?: string;        // status text rendered as SBadge
  amount?: number;       // ₦ value where relevant
}

export interface Contact360Props {
  contactName: string;
  onClose: () => void;
  leads: Lead[];
  requests: Request_[];
  jobs: Job[];
  reports: SiteReport[];
}

const KIND_META: Record<TimelineEvent["kind"], { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; label: string }> = {
  lead:    { icon: Filter,        color: G,    label: "Lead" },
  stage:   { icon: Filter,        color: BLUE, label: "Stage" },
  request: { icon: Inbox,         color: O,    label: "Request" },
  job:     { icon: Briefcase,     color: BLUE, label: "Job" },
  report:  { icon: ClipboardList, color: AMBER, label: "Site Report" },
};

export function Contact360({ contactName, onClose, leads, requests, jobs, reports }: Contact360Props) {
  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    for (const l of leads) {
      if (!sameName(l.contactName, contactName)) continue;
      out.push({
        at: l.createdAt || "",
        kind: "lead",
        title: `Lead created — ${l.svc || "service TBD"}`,
        detail: [l.source && `via ${l.source}`, l.ownerName && `owner ${l.ownerName}`].filter(Boolean).join(" · "),
        badge: l.stage || "New",
        amount: Number(l.value) || 0,
      });
      for (const h of ((l.stageHistory as { stage?: string; at?: string; by?: string }[]) || [])) {
        if (!h?.stage || h.stage === "New") continue; // creation already shown
        out.push({
          at: h.at || "",
          kind: "stage",
          title: `Moved to ${h.stage}`,
          detail: h.by ? `by ${h.by}` : "",
          badge: h.stage,
        });
      }
    }

    for (const r of requests) {
      if (!sameName(r.clientName, contactName)) continue;
      out.push({
        at: r.created || "",
        kind: "request",
        title: `Service request — ${r.svc || "unspecified"}`,
        detail: [r.src && `via ${r.src}`, r.loc].filter(Boolean).join(" · "),
        badge: r.status || "Pending",
      });
    }

    for (const j of jobs) {
      if (!sameName(j.clientName, contactName)) continue;
      out.push({
        at: j.createdAt || j.date || "",
        kind: "job",
        title: `Job — ${j.svc || "service"}${j.date ? ` on ${fmtD(j.date)}` : ""}`,
        detail: [j.sup && `sup ${j.sup}`, j.checkIn && "checked in", j.checkOut && "checked out"].filter(Boolean).join(" · "),
        badge: j.status || "New",
      });
    }

    for (const r of reports) {
      if (!sameName(r.clientName, contactName)) continue;
      const rating = Number(r.cleanlinessRating) || 0;
      out.push({
        at: r.submittedAt || r.arrivalDate || "",
        kind: "report",
        title: `Site report — ${r.jobType || "visit"}`,
        detail: [r.supervisorName, rating > 0 && `cleanliness ${rating}/5`, (r.photos as unknown[] | undefined)?.length ? `${(r.photos as unknown[]).length} photo(s)` : ""].filter(Boolean).join(" · "),
        badge: r.overallAssessment === "Job Completed Successfully" ? "Completed" : "Issues Noted",
      });
    }

    return out.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }, [contactName, leads, requests, jobs, reports]);

  // Header stats — lifetime relationship at a glance.
  const jobCount = events.filter(e => e.kind === "job").length;
  const wonValue = leads
    .filter(l => sameName(l.contactName, contactName) && l.stage === "Won")
    .reduce((s, l) => s + (Number(l.value) || 0), 0);
  const phone = leads.find(l => sameName(l.contactName, contactName) && l.contactPhone)?.contactPhone
    || requests.find(r => sameName(r.clientName, contactName) && r.clientPhone)?.clientPhone || "";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: G }}>Contact 360°</p>
              <h2 className="text-lg font-bold text-gray-800 truncate">{contactName}</h2>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                {phone && <span className="flex items-center gap-1"><Phone size={11} />{phone}</span>}
                <span>{events.length} touchpoint{events.length === 1 ? "" : "s"}</span>
                <span>{jobCount} job{jobCount === 1 ? "" : "s"}</span>
                {wonValue > 0 && <span className="font-semibold" style={{ color: G }}>{fmt(wonValue)} won</span>}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 flex-shrink-0"><X size={16} /></button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No history for this contact yet.</p>
          ) : (
            <div className="relative pl-6">
              {/* vertical thread */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
              <div className="space-y-4">
                {events.map((e, i) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="relative">
                      <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: meta.color }}>
                        <Icon size={10} style={{ color: meta.color }} />
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                          {e.detail && <p className="text-xs text-gray-500 mt-0.5">{e.detail}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {e.at ? fmtD(e.at) : "undated"}
                            {e.amount ? <span className="ml-2 font-semibold" style={{ color: RED }}>{fmt(e.amount)}</span> : null}
                          </p>
                        </div>
                        {e.badge && <div className="flex-shrink-0"><SBadge s={e.badge} /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
