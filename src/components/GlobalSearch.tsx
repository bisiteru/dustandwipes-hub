// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Global ⌘K / Ctrl+K search palette
//  Phase 3 extraction.
//
//  Searches across clients, jobs, staff, inventory, and service requests.
//  Selecting a result navigates to the corresponding module via onNav().
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search } from "lucide-react";

// Permissive typing — pages pass through their existing state shapes.
type Row = Record<string, any>;

interface GlobalSearchProps {
  clients?: Row[];
  jobs?: Row[];
  staff?: Row[];
  inventory?: Row[];
  requests?: Row[];
  onNav: (target: string) => void;
  onClose: () => void;
}

interface Hit {
  type: string;
  icon: string;
  label: string;
  sub: string;
  nav: string;
}

export function GlobalSearch({
  clients = [],
  jobs = [],
  staff = [],
  inventory = [],
  requests = [],
  onNav,
  onClose,
}: GlobalSearchProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo<Hit[]>(() => {
    const s = q.toLowerCase().trim();
    if (s.length < 2) return [];
    const hits: Hit[] = [];

    clients
      .filter(c => [c.name, c.addr, c.cp, c.phone].join(" ").toLowerCase().includes(s))
      .slice(0, 4)
      .forEach(c => hits.push({ type: "Client", icon: "🏢", label: c.name, sub: c.svc || "", nav: "clients" }));

    jobs
      .filter(j => [j.clientName, j.svc, j.loc, j.sup].join(" ").toLowerCase().includes(s))
      .slice(0, 4)
      .forEach(j => hits.push({ type: "Job", icon: "🛠", label: j.clientName, sub: `${j.svc} · ${j.status}`, nav: "jobs" }));

    staff
      .filter(st => [st.name, st.role, st.site, st.phone].join(" ").toLowerCase().includes(s))
      .slice(0, 4)
      .forEach(st => hits.push({ type: "Staff", icon: "👤", label: st.name, sub: `${st.role || ""}${st.site ? ` · ${st.site}` : ""}`, nav: "staff" }));

    inventory
      .filter(i => [i.item, i.cat].join(" ").toLowerCase().includes(s))
      .slice(0, 3)
      .forEach(i => hits.push({ type: "Stock", icon: "📦", label: i.item, sub: `${i.qty} in stock · ${i.cat}`, nav: "inventory" }));

    requests
      .filter(r => [r.clientName, r.svc, r.loc].join(" ").toLowerCase().includes(s))
      .slice(0, 3)
      .forEach(r => hits.push({ type: "Request", icon: "📋", label: r.clientName, sub: `${r.svc} · ${r.status}`, nav: "requests" }));

    return hits;
  }, [q, clients, jobs, staff, inventory, requests]);

  const go = (nav: string) => { onNav(nav); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 flex-shrink-0"/>
          <input ref={inputRef}
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400"
            placeholder="Search clients, jobs, staff, inventory…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Escape" && onClose()}/>
          <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">Esc</kbd>
        </div>
        {q.length < 2 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Type at least 2 characters to search across all modules
          </div>
        )}
        {q.length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No results found for "{q}"
          </div>
        )}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {results.map((r, i) => (
              <button key={i} onClick={() => go(r.nav)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                <span className="text-base">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.label}</p>
                  <p className="text-xs text-gray-400 truncate">{r.sub}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: "#f0fdf4", color: "#16a34a" }}>
                  {r.type}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> open module</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
