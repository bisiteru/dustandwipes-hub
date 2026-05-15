// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Notification panel
//  Phase 3 extraction. Renders the bell-icon dropdown with derived alerts
//  (critical/expiring contracts, awaiting-approval jobs, low-stock items).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Bell, X } from "lucide-react";
import { G, RED } from "../lib/constants";
import { cStatus, dLeft, fmtD } from "../lib/format";

// Permissive row shapes — pages pass through their live state.
type Row = Record<string, any>;

interface Notif {
  id: string;
  icon: string;
  title: string;
  body: string;
  read: boolean;
}

/** Build the notification list from current app state. Read-state is layered on top. */
export function buildNotifs(clients: Row[], jobs: Row[], inventory: Row[]): Notif[] {
  const n: Notif[] = [];
  clients.forEach(c => {
    const s = cStatus(c.ce);
    const dl = dLeft(c.ce);
    if (s === "Critical") n.push({ id: `nc-${c.id}`, icon: "", title: `Critical: ${c.name}`, body: `Expires in ${dl}d`, read: false });
    else if (s === "Expiring Soon") n.push({ id: `na-${c.id}`, icon: "", title: `Expiring Soon: ${c.name}`, body: `${dl} days left`, read: false });
    else if (s === "Expired") n.push({ id: `ne-${c.id}`, icon: "", title: `Expired: ${c.name}`, body: `Ended ${fmtD(c.ce)}`, read: false });
  });
  jobs.filter(j => j.status === "Awaiting Approval").forEach(j =>
    n.push({ id: `nj-${j.id}`, icon: "", title: "Awaiting approval", body: `${j.clientName}`, read: false })
  );
  inventory.filter(i => i.qty <= i.reorder).forEach(i =>
    n.push({ id: `ni-${i.id}`, icon: "", title: "Low stock", body: `${i.item}: ${i.qty} left`, read: false })
  );
  return n;
}

interface NotifPanelProps {
  notes: Notif[];
  onRead: (id: string) => void;
  onClose: () => void;
}

export function NotifPanel({ notes, onRead, onClose }: NotifPanelProps) {
  const unread = notes.filter(n => !n.read).length;
  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: G }}/>
          <span className="text-sm font-bold text-gray-800">Notifications</span>
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: RED }}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => notes.forEach(n => onRead(n.id))}
            className="text-xs text-green-700 hover:underline">
            Mark all read
          </button>
          <button onClick={onClose}>
            <X size={14} className="text-gray-400"/>
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">All clear!</div>
        ) : (
          notes.map(n => (
            <div key={n.id} onClick={() => onRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                !n.read ? "bg-green-50/40" : ""
              }`}>
              <span className="text-base flex-shrink-0">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${!n.read ? "font-bold text-gray-800" : "font-medium text-gray-600"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{n.body}</p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: G }}/>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
