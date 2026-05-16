// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Staff + contact pickers
//  Phase 3 extraction. Three related <select>-style search components.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { inp } from "../lib/constants";

// Minimal interfaces — these match the live data shape but stay permissive.
interface StaffLike {
  id: string | number;
  name: string;
  site?: string;
  role?: string;
  category?: string;
  phone?: string;
  [k: string]: any;
}

interface ClientLike {
  id?: string | number;
  name: string;
  phone?: string;
  addr?: string;
  [k: string]: any;
}

interface ContactLike {
  name: string;
  phone?: string;
  address?: string;
  [k: string]: any;
}

// ── StaffSelect — single-select dropdown of staff (with optional filter) ────
interface StaffSelectProps {
  staff?: StaffLike[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  filter?: (s: StaffLike) => boolean;
}

export function StaffSelect({
  staff = [],
  value,
  onChange,
  placeholder = "-- Select staff --",
  filter,
}: StaffSelectProps) {
  const list = filter ? staff.filter(filter) : staff;
  return (
    <select className={inp} value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {list.map(s => (
        <option key={s.id} value={s.name}>
          {s.name}{s.site ? ` — ${s.site}` : ""}
        </option>
      ))}
    </select>
  );
}

// ── StaffMultiPicker — searchable multi-select for site reports / job crews ─
// Stores its value as a newline-separated string (legacy compat) but accepts
// any string|null|undefined input. The Phase-1 r.split fix made this resilient
// to non-string inputs.
interface StaffMultiPickerProps {
  staff?: StaffLike[];
  value: string | string[] | null | undefined;
  onChange: (selected: string[]) => void;
}

export function StaffMultiPicker({ staff = [], value, onChange }: StaffMultiPickerProps) {
  const names: string[] = Array.isArray(value)
    ? value
    : value
      ? String(value).split("\n").filter(Boolean)
      : [];
  const toggle = (name: string) =>
    onChange(names.includes(name) ? names.filter(n => n !== name) : [...names, name]);
  const [search, setSearch] = useState("");
  const visible = search
    ? staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : staff;
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400"/>
        <input className={inp + " pl-8 py-2"} placeholder="Search crew..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
        {visible.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No staff found</p>}
        {visible.map(s => (
          <label key={s.id}
            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-all ${
              names.includes(s.name) ? "bg-green-50" : "hover:bg-gray-50"
            }`}>
            <input type="checkbox" checked={names.includes(s.name)}
              onChange={() => toggle(s.name)} className="accent-green-600 flex-shrink-0"/>
            <span className={names.includes(s.name) ? "font-semibold text-green-800" : "text-gray-700"}>
              {s.name}
            </span>
            {s.site && <span className="text-gray-400 ml-auto truncate">{s.site}</span>}
          </label>
        ))}
      </div>
      {names.length > 0 && (
        <p className="text-xs text-gray-500 font-medium">
          {names.length} selected: {names.join(", ")}
        </p>
      )}
    </div>
  );
}

// ── ContactSearchSelect — combined clients + contacts autocomplete ──────────
// Merges live contacts (from window.__DW_CONTACTS__ populated by Supabase)
// with the active clients array, deduplicated by name.
interface ContactSearchSelectProps {
  value: string;
  onSelect: (name: string) => void;
  clients: ClientLike[];
  contacts?: ContactLike[];
}

export function ContactSearchSelect({ value, onSelect, clients, contacts = [] }: ContactSearchSelectProps) {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allContacts = useMemo<ContactLike[]>(() => {
    const names = new Set<string>();
    const list: ContactLike[] = [];
    const dbContacts: ContactLike[] = (window as any).__DW_CONTACTS__ || contacts || [];
    [
      ...clients.map(c => ({ name: c.name, phone: c.phone || "", address: c.addr || "" })),
      ...dbContacts,
    ].forEach(c => {
      if (c.name && !names.has(c.name)) {
        names.add(c.name);
        list.push(c);
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, contacts]);

  const filtered = search.trim()
    ? allContacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30)
    : allContacts.slice(0, 30);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (c: ContactLike) => {
    setSearch(c.name);
    onSelect(c.name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-2.5 text-gray-400"/>
        <input className={inp + " pl-9"} value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search or type client name..."/>
        {search && (
          <button type="button" onClick={() => { setSearch(""); onSelect(""); }}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
            <X size={14}/>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.name} type="button" onClick={() => select(c)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0">
              <p className="font-medium text-gray-800">{c.name}</p>
              {(c.phone || c.address) && (
                <p className="text-xs text-gray-400">{[c.phone, c.address].filter(Boolean).join("  ")}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
