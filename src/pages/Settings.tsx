// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Settings page
//  Phase 4c extraction. App-user CRUD (Admin/Supervisor/Technician) with
//  local-pwHash password handling and recent-activity log viewer.
//
//  Phase 5 typing: `@ts-nocheck` removed. App users use the AppUser schema
//  inferred type; activity log rows stay `any[]` because they are
//  heterogeneous audit-log payloads pulled raw from `dw_activity_log`.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Edit2, Trash2, UserPlus, AlertTriangle } from "lucide-react";
import { G, O, AMBER, inp } from "../lib/constants";
import { hashPwV2 } from "../lib/auth";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useConfirm } from "../components/ui/useConfirm";
import type { AppUser } from "../lib/schemas";

// Modal working-copy: an AppUser-shaped draft that also holds a transient
// plain-text `password` field (never persisted — hashed into pwHash on save).
type UserDraft = Partial<AppUser> & { password?: string };

type RoleStyle = { bg: string; color: string; border: string };

interface SettingsPageProps {
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  // Activity-log rows are heterogeneous audit entries — kept as any[].
  activityLog?: any[];
}

export function SettingsPage({ users, setUsers, activityLog = [] }: SettingsPageProps) {
  const [modal, setModal] = useState<UserDraft | null>(null);
  const [confirm, confirmEl] = useConfirm();

  const rc: Record<string, RoleStyle> = {
    Admin:      { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    Supervisor: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
    Technician: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  };

  const save = async (data: UserDraft): Promise<void> => {
    const pw = data.password;
    const clean: UserDraft = { ...data };
    delete clean.password; // never persist plain text
    const id = clean.id || ("u" + Date.now());
    if (pw) {
      // Phase 5d: new writes use PBKDF2-SHA256 with a per-user random salt.
      // The userId is no longer needed as the salt — hashPwV2 generates one.
      const hash = await hashPwV2(pw);
      if (hash) clean.pwHash = hash;
    }
    const name = clean.name || "?";
    const entry: AppUser = {
      ...(clean as AppUser),
      id: String(id),
      initial: name[0].toUpperCase(),
    };
    const nu: AppUser[] = data.id
      ? users.map(u => (u.id === data.id ? { ...u, ...entry } : u))
      : [...users, entry];
    setUsers(nu);
    dbSync("users", nu);
    setModal(null);
  };

  const del = (id: string): void => {
    confirm("Remove this app user account?", () => {
      setUsers(us => us.filter(u => u.id !== id));
      dbDelete("users", id);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">{confirmEl}
      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-4">Company Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          {([
            ["Company Name", "Dust & Wipes Limited"],
            ["App Name", "Operations Hub"],
            ["Domain", "app.dustandwipes.com"],
            ["Location", "Abuja, Nigeria"],
            ["Currency", "NGN ()"],
            ["Timezone", "WAT (UTC+1)"],
          ] as const).map(([l, v]) => (
            <Fld key={l} label={l}>
              <input className={inp + " bg-gray-50"} defaultValue={v} readOnly />
            </Fld>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800">App User Accounts</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage login credentials for app access. Separate from field staff records.</p>
          </div>
          <button onClick={() => setModal({ role: "Technician" })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: G }}>
            <UserPlus size={14} />Add User
          </button>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl mb-4 text-sm" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
          <div>
            <p className="font-bold text-amber-800">Session Persistence</p>
            <p className="text-amber-700 text-xs mt-0.5">Accounts added here persist in the Supabase database permanently once the DB sync runs. Phone number login for technicians: use number as username (e.g. <code>08031234567</code>).</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center flex-shrink-0 text-sm" style={{ background: O }}>{u.initial}</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email || u.username || "No email/username"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SBadge s={u.role} custom={rc[u.role]} />
                <div className="flex gap-1">
                  <button onClick={() => setModal(u)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13} /></button>
                  <button onClick={() => del(u.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-3">Role Permissions</h3>
        <div className="space-y-2.5">
          {([
            ["Admin", "#166534", "Full access: all modules, staff management, settings, item catalogue"],
            ["Supervisor", "#9a3412", "Jobs, clients, contracts, reports, requisitions (with costs), cover scheduling, imprest, item catalogue"],
            ["Technician", "#1e40af", "Assigned jobs, GPS check-in/out, site reports, submit requisitions (no cost visibility)"],
          ] as const).map(([r, c, d]) => (
            <div key={r} className="flex gap-3 p-3 rounded-xl" style={{ background: "#f9fafb" }}>
              <span className="text-xs font-black w-24 flex-shrink-0 pt-0.5" style={{ color: c }}>{r}</span>
              <span className="text-xs text-gray-600">{d}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-4">Activity Log</h3>
        <p className="text-xs text-gray-400 mb-4">Last 200 actions across all modules. Read-only audit trail.</p>
        {activityLog.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No activity recorded yet</div>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#f9fafb" }} className="border-b">
                  {["Time", "User", "Role", "Action", "Module", "Description"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activityLog.map((log: any, i: number) => {
                  const actionColors: Record<string, string> = {
                    create: "#166534",
                    update: "#1e40af",
                    delete: "#991b1b",
                    login:  "#7c3aed",
                    logout: "#6b7280",
                  };
                  const actionColor = actionColors[log.action as string] || "#374151";
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-700">{log.user_name}</td>
                      <td className="px-3 py-2 text-gray-500">{log.user_role}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full font-bold text-white text-xs" style={{ background: actionColor }}>{log.action}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 capitalize">{log.module}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{log.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-3">Technology Stack</h3>
        <div className="space-y-2.5">
          {([
            ["Database", "Supabase (PostgreSQL) -- 13 tables, row-level security"],
            ["Auth", "Email/password + phone/username login, password reset via email"],
            ["Hosting", "Vercel (frontend) + Supabase (backend)  app.dustandwipes.com"],
            ["Email", "Resend via Supabase Edge Functions  notifications@mail.dustandwipes.com"],
            ["PWA", "Installable on Android & iPhone -- offline cache via Service Worker"],
            ["GPS", "Browser Geolocation API + coordinates captured on site reports"],
          ] as const).map(([l, d]) => (
            <div key={l} className="flex gap-3 p-3 rounded-xl" style={{ background: "#f9fafb" }}>
              <span className="text-xs font-bold text-green-700 w-36 flex-shrink-0">{l}</span>
              <span className="text-xs text-gray-600">{d}</span>
            </div>
          ))}
        </div>
      </Card>

      {modal && (
        <ModalWrap title={modal.id ? "Edit User" : "Add New User"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Fld label="Full Name">
              <input className={inp} value={modal.name || ""} onChange={e => setModal(p => p ? { ...p, name: e.target.value } : p)} />
            </Fld>
            <Fld label="Role">
              <select className={inp} value={modal.role || "Technician"} onChange={e => setModal(p => p ? { ...p, role: e.target.value } : p)}>
                <option>Admin</option><option>Supervisor</option><option>Technician</option>
              </select>
            </Fld>
            <Fld label="Email (leave blank for technicians)">
              <input className={inp} type="email" value={modal.email || ""} onChange={e => setModal(p => p ? { ...p, email: e.target.value } : p)} placeholder="name@dustandwipes.com" />
            </Fld>
            <Fld label="Username / Phone (for technicians without email)">
              <input className={inp} value={modal.username || ""} onChange={e => setModal(p => p ? { ...p, username: e.target.value } : p)} placeholder="e.g. 08031234567" />
            </Fld>
            <Fld label={modal.id ? "Set New Password (leave blank to keep current)" : "Password"}>
              <input className={inp} type="password" value={modal.password || ""} onChange={e => setModal(p => p ? { ...p, password: e.target.value } : p)} placeholder={modal.id ? "Enter new password to change it…" : "Set initial password for this user"} />
            </Fld>
            {modal.id && modal.pwHash && <p className="text-xs text-green-700 -mt-2">✓ Password is set — enter a new one above to change it</p>}
            {modal.id && !modal.pwHash && <p className="text-xs text-amber-600 -mt-2">⚠ No password set — this user cannot log in without one</p>}
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={() => save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>{modal.id ? "Save" : "Add User"}</button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
