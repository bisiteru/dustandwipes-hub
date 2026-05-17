// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Clients page + ClientModal
//  Phase 4c extraction. Client roster table + Add/Edit modal with full
//  contract + cleaner-assignment editing.
//
//  Strict-typed in Phase 5c. The previous `@ts-nocheck` header was removed
//  after schemas.ts gave us non-optional numeric defaults (numOpt → number)
//  and string defaults (strOpt → string), making per-line typing tractable.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { G, GL, O, OL, inp, FREQ_DAYS } from "../lib/constants";
import { fmt, fmtD, cStatus } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Client, Staff, Contact } from "../lib/schemas";

// Row shape inside the table after we derive `status` from `ce`
type ClientWithStatus = Client & { status: string };

interface ClientsPageProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  userRole: string;
  staff: Staff[];
  contacts?: Contact[];
}

export function ClientsPage({
  clients,
  setClients,
  userRole,
  staff,
  contacts = [],
}: ClientsPageProps) {
  const [tab, setTab] = useState<"clients" | "contacts">("clients");
  const [contactSearch, setContactSearch] = useState("");
  const [search, setSearch] = useState("");
  const [ft, setFt] = useState<string>("All");
  const [fs, setFs] = useState<string>("All");
  // `modal === null` → closed. `{}` → "Add new". A Client → "Edit existing".
  const [modal, setModal] = useState<Client | Record<string, never> | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();

  const ws: ClientWithStatus[] = useMemo(
    () => clients.map((c) => ({ ...c, status: cStatus(c.ce) })),
    [clients]
  );
  const filtered: ClientWithStatus[] = useMemo(
    () =>
      ws.filter(
        (c) =>
          [c.name, c.addr, (c.cleaners || []).join(" "), c.cp, c.phone]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (ft === "All" || c.svc === ft) &&
          (fs === "All" || c.status === fs)
      ),
    [ws, search, ft, fs]
  );

  const save = (data: Client) => {
    const { status: _status, ...d } = data as Client & { status?: string };
    let nc: Client[];
    if (d.id) {
      nc = clients.map((c) => (c.id === d.id ? (d as Client) : c));
    } else {
      nc = [
        ...clients,
        {
          ...(d as Client),
          id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
        },
      ];
    }
    setClients(nc);
    dbSync("clients", nc);
    toast.success(d.id ? "Client updated" : "Client added");
    setModal(null);
  };

  const del = (id: string) =>
    confirm("Delete this client?", () => {
      setClients((cs) => cs.filter((c) => c.id !== id));
      dbDelete("clients", id);
      toast.success("Client deleted");
    });

  const can = userRole !== "Technician";

  const filteredContacts: Contact[] = useMemo(() => {
    const db: Contact[] =
      ((window as unknown as { __DW_CONTACTS__?: Contact[] }).__DW_CONTACTS__) ||
      contacts ||
      [];
    const q = contactSearch.toLowerCase().trim();
    if (!q) return db.slice(0, 100);
    return db
      .filter((c) =>
        [c.name, c.phone, c.email, c.address]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 100);
  }, [contacts, contactSearch]);

  const allContacts: Contact[] =
    ((window as unknown as { __DW_CONTACTS__?: Contact[] }).__DW_CONTACTS__) ||
    contacts ||
    [];

  return (
    <div className="space-y-5">
      {confirmEl}
      {/* Tab Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border border-gray-200 rounded-xl p-1 bg-white">
          <button
            onClick={() => setTab("clients")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "clients" ? "text-white" : "text-gray-500"
            }`}
            style={tab === "clients" ? { background: G } : {}}
          >
            {" "}
            Contracts ({clients.length})
          </button>
          <button
            onClick={() => setTab("contacts")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "contacts" ? "text-white" : "text-gray-500"
            }`}
            style={tab === "contacts" ? { background: G } : {}}
          >
            {" "}
            All Contacts ({allContacts.length})
          </button>
        </div>
      </div>

      {/* CONTACTS DIRECTORY TAB */}
      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search by name, phone, address…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Showing {filteredContacts.length} of {allContacts.length}
            </span>
          </div>
          <Card>
            <div className="divide-y divide-gray-50">
              {filteredContacts.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No contacts match your search
                </div>
              )}
              {filteredContacts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: G }}
                    >
                      {(c.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {c.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {c.phone && (
                          <span className="text-xs text-gray-500">📞 {c.phone}</span>
                        )}
                        {c.email && (
                          <span className="text-xs text-gray-500">✉ {c.email}</span>
                        )}
                        {c.address && (
                          <span className="text-xs text-gray-400 truncate max-w-xs">
                            📍 {c.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {userRole !== "Technician" && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() =>
                          setClients((cs) => [
                            ...cs,
                            {
                              id:
                                "c" +
                                Date.now() +
                                Math.random().toString(36).slice(2, 6),
                              name: c.name,
                              phone: c.phone || "",
                              addr: c.address || "",
                              cp: c.name,
                              cat: "Corporate",
                              svc: "Cleaning",
                              serviceFreq: "Weekly",
                              cs: "",
                              ce: "",
                              email: "",
                              sal: 0,
                              con: 0,
                              sc: 0,
                              vat: 0,
                              tot: 0,
                              cleaners: [],
                              duty: "Mon-Fri",
                              status: "",
                            } as Client,
                          ])
                        }
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold border"
                        style={{ borderColor: G, color: G }}
                      >
                        {" "}
                        Add as Client
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* CONTRACTS / CLIENTS TAB */}
      {tab === "clients" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                className={inp + " pl-9"}
                placeholder="Name, address, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={inp + " w-auto"}
              value={ft}
              onChange={(e) => setFt(e.target.value)}
            >
              <option value="All">All Services</option>
              <option>Cleaning</option>
              <option>Pest Control</option>
              <option>Both</option>
            </select>
            <select
              className={inp + " w-auto"}
              value={fs}
              onChange={(e) => setFs(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option>Active</option>
              <option>Expiring Soon</option>
              <option>Critical</option>
              <option>Expired</option>
            </select>
            {can && (
              <button
                onClick={() => setModal({})}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: G }}
              >
                <Plus size={14} />
                Add Client
              </button>
            )}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9fafb" }} className="border-b">
                    {[
                      "Client",
                      "Service",
                      "Category",
                      "Contact",
                      "Phone",
                      "Contract End",
                      "Value",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                            style={{ background: c.svc === "Pest Control" ? O : G }}
                          >
                            {(c.name || "?")[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400 max-w-[140px] truncate">
                              {c.addr}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-medium"
                          style={
                            c.svc === "Pest Control"
                              ? { background: OL, color: "#c2410c" }
                              : c.svc === "Both"
                              ? { background: "#f3f4f6", color: "#374151" }
                              : { background: GL, color: G }
                          }
                        >
                          {c.svc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.cat}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.cp}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {c.phone}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtD(c.ce)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700 text-sm whitespace-nowrap">
                        {fmt(c.tot)}
                      </td>
                      <td className="px-4 py-3">
                        <SBadge s={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        {can && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setModal(c)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => del(String(c.id))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No clients match your filters
                </div>
              )}
            </div>
          </Card>
          {modal !== null && (
            <ClientModal
              data={modal && (modal as Client).id ? (modal as Client) : null}
              onSave={save}
              onClose={() => setModal(null)}
              staff={staff}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── ClientModal ─────────────────────────────────────────────────────────────
interface ClientModalProps {
  data: Client | null;
  onSave: (c: Client) => void;
  onClose: () => void;
  staff: Staff[];
}

// Form-internal shape. Mirrors Client but `id` may be missing (new-client case)
// and `cleaners` is guaranteed string[] (Client schema already enforces this,
// but we coerce defensively because legacy DB rows occasionally had a single
// string instead of an array).
type ClientForm = Omit<Client, "id" | "cleaners"> & {
  id?: string;
  cleaners: string[];
};

function ClientModal({ data, onSave, onClose, staff }: ClientModalProps) {
  const blank: ClientForm = {
    name: "",
    cat: "Corporate",
    svc: "Cleaning",
    addr: "",
    cp: "",
    phone: "",
    email: "",
    cleaners: [],
    duty: "Mon-Fri",
    serviceFreq: "Weekly",
    cs: "",
    ce: "",
    sal: 0,
    con: 0,
    sc: 0,
    vat: 0,
    tot: 0,
    status: "",
  };
  const [f, setF] = useState<ClientForm>(
    data
      ? {
          ...data,
          cleaners: Array.isArray(data.cleaners)
            ? data.cleaners
            : data.cleaners
            ? [data.cleaners as unknown as string]
            : [],
        }
      : blank
  );
  const [cleanerSearch, setCleanerSearch] = useState("");

  // String-field updater
  const u =
    (k: keyof ClientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  // Numeric updater — coerces input to Number so DB stores numbers, not strings.
  // (Critical: prevents string concatenation when summing — e.g. "100" + "200" = "100200")
  const uN =
    (k: keyof ClientForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setF((p) => ({
        ...p,
        [k]: e.target.value === "" ? 0 : Number(e.target.value) || 0,
      }));

  const cleaningStaff = staff.filter(
    (s) =>
      s.category === "Cleaning Staff" ||
      s.category === "Gardening Staff" ||
      s.role === "Cleaner" ||
      s.role === "Gardener" ||
      s.role === "Team Lead"
  );
  const filteredStaff = cleanerSearch
    ? cleaningStaff.filter((s) =>
        s.name.toLowerCase().includes(cleanerSearch.toLowerCase())
      )
    : cleaningStaff;
  const toggleCleaner = (name: string) =>
    setF((p) => ({
      ...p,
      cleaners: p.cleaners.includes(name)
        ? p.cleaners.filter((c) => c !== name)
        : [...p.cleaners, name],
    }));

  return (
    <ModalWrap title={data ? "Edit Client" : "Add New Client"} onClose={onClose} xl>
      <div className="grid grid-cols-2 gap-4">
        <Fld label="Client / Company Name" col>
          <input className={inp} value={f.name} onChange={u("name")} />
        </Fld>
        <Fld label="Category">
          <select className={inp} value={f.cat} onChange={u("cat")}>
            <option>Corporate</option>
            <option>NGO</option>
            <option>Healthcare</option>
            <option>Real Estate</option>
            <option>Food & Bev</option>
            <option>Retail</option>
            <option>Residence</option>
            <option>Hospitality</option>
            <option>Education</option>
            <option>Other</option>
          </select>
        </Fld>
        <Fld label="Service Type">
          <select className={inp} value={f.svc} onChange={u("svc")}>
            <option>Cleaning</option>
            <option>Pest Control</option>
            <option>Both</option>
            <option>Training/Consultancy</option>
          </select>
        </Fld>
        <Fld label="Address" col>
          <input className={inp} value={f.addr} onChange={u("addr")} />
        </Fld>
        <Fld label="Contact Person">
          <input className={inp} value={f.cp} onChange={u("cp")} />
        </Fld>
        <Fld label="Phone">
          <input className={inp} value={f.phone} onChange={u("phone")} />
        </Fld>
        <Fld label="Email">
          <input className={inp} type="email" value={f.email} onChange={u("email")} />
        </Fld>
        <Fld label="Duty Days">
          <input className={inp} value={f.duty} onChange={u("duty")} />
        </Fld>
        <Fld label="Service Frequency">
          <select
            className={inp}
            value={f.serviceFreq || "Weekly"}
            onChange={u("serviceFreq")}
          >
            <option value="">-- None --</option>
            {Object.keys(FREQ_DAYS).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Fld>
        <Fld label="Contract Start">
          <input className={inp} type="date" value={f.cs} onChange={u("cs")} />
        </Fld>
        <Fld label="Contract End">
          <input className={inp} type="date" value={f.ce} onChange={u("ce")} />
        </Fld>
        {/* Cleaners Multi-Select */}
        <Fld label="Cleaners Assigned" col>
          <div className="border border-gray-300 rounded-xl overflow-hidden">
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  placeholder="Search cleaning staff..."
                  value={cleanerSearch}
                  onChange={(e) => setCleanerSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-36 overflow-y-auto p-2 space-y-1">
              {filteredStaff.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  No cleaning staff found
                </p>
              )}
              {filteredStaff.map((s) => (
                <label
                  key={String(s.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${
                    f.cleaners.includes(s.name)
                      ? "bg-green-50 border border-green-300 font-semibold text-green-800"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={f.cleaners.includes(s.name)}
                    onChange={() => toggleCleaner(s.name)}
                    className="accent-green-600"
                  />
                  <span>{s.name}</span>
                  {s.site && (
                    <span className="text-gray-400 ml-auto">({s.site})</span>
                  )}
                </label>
              ))}
            </div>
            {f.cleaners.length > 0 && (
              <div className="p-2 border-t border-gray-100 bg-green-50/50">
                <p className="text-xs font-semibold text-green-700 mb-1">
                  {f.cleaners.length} assigned:
                </p>
                <div className="flex flex-wrap gap-1">
                  {f.cleaners.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => toggleCleaner(c)}
                        className="text-green-600 hover:text-red-500 ml-0.5 font-bold"
                      ></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Fld>
        <div className="col-span-2 border-t pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Financials ()
          </p>
        </div>
        <Fld label="Salary">
          <input className={inp} type="number" value={f.sal} onChange={uN("sal")} />
        </Fld>
        <Fld label="Consumables">
          <input className={inp} type="number" value={f.con} onChange={uN("con")} />
        </Fld>
        <Fld label="Service Charge">
          <input className={inp} type="number" value={f.sc} onChange={uN("sc")} />
        </Fld>
        <Fld label="VAT">
          <input className={inp} type="number" value={f.vat} onChange={uN("vat")} />
        </Fld>
        <Fld label="Total Contract Sum" col>
          <input className={inp} type="number" value={f.tot} onChange={uN("tot")} />
        </Fld>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-xl border text-gray-600 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ ...f, cleaners: f.cleaners } as Client)}
          className="px-6 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: G }}
        >
          {data ? "Save Changes" : "Add Client"}
        </button>
      </div>
    </ModalWrap>
  );
}
