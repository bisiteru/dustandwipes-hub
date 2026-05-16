// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Inventory page
//  Phase 4a extraction. Stock list with category filter + low-stock alerts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { G, RED, inp } from "../lib/constants";
import { fmt } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";

type Row = Record<string, any>;

interface InventoryPageProps {
  inventory: Row[];
  setInventory: React.Dispatch<React.SetStateAction<any[]>>;
  userRole: string;
}

export function InventoryPage({ inventory, setInventory, userRole }: InventoryPageProps) {
  const [modal, setModal] = useState<Row | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [confirm, confirmEl] = useConfirm();
  const toast = useToast();
  const canEdit = userRole !== "Technician";
  const cats = ["All", ...Array.from(new Set(inventory.map(i => i.cat)))];
  const filtered = inventory.filter(i =>
    (filter === "All" || i.cat === filter) &&
    String(i.item || "").toLowerCase().includes(search.toLowerCase())
  );

  const save = (data: Row) => {
    const ni = data.id
      ? inventory.map(i => i.id === data.id ? data : i)
      : [...inventory, { ...data, id: "i" + Date.now() }];
    setInventory(ni);
    dbSync("inventory", ni);
    toast.success(data.id ? "Item updated" : "Item added");
    setModal(null);
  };
  const del = (id: any) => confirm("Remove this item?", () => {
    setInventory(inventory.filter(i => i.id !== id));
    dbDelete("inventory", id);
    toast.success("Item removed");
  });

  return (<div className="space-y-5">{confirmEl}
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
        <input className={inp + " pl-9"} placeholder="Search..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
              filter === c ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200"
            }`}
            style={filter === c ? { background: G } : {}}>
            {c}
          </button>
        ))}
      </div>
      {canEdit && (
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: G }}>
          <Plus size={14}/>Add Item
        </button>
      )}
    </div>
    <Card>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-gray-50">
        {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Nothing here yet</div>}
        {filtered.map(i => {
          const low = i.qty <= i.reorder;
          return (
            <div key={i.id} className={`flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 ${low ? "bg-red-50/30" : ""}`}>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{i.item}</p>
                <p className="text-xs text-gray-500 mt-0.5">{i.cat} · Reorder at {i.reorder} · ₦{fmt(i.cost)}/unit</p>
                <SBadge s={low ? "Low Stock" : "OK"}
                  custom={low
                    ? { bg: "#fee2e2", color: RED, border: "#fca5a5" }
                    : { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" }}/>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <div className="text-right">
                  <p className="font-black text-2xl leading-none" style={{ color: low ? RED : G }}>{i.qty}</p>
                  <p className="text-xs text-gray-400 mt-0.5">in stock</p>
                </div>
                {canEdit && (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setModal(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100">
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => del(i.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9fafb" }} className="border-b">
              {["Item","Category","In Stock","Reorder","Unit Cost","Value","Status",""].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(i => {
              const low = i.qty <= i.reorder;
              return (
                <tr key={i.id} className={`hover:bg-gray-50/70 ${low ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{i.item}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{i.cat}</td>
                  <td className="px-4 py-3 font-black text-lg" style={{ color: low ? RED : G }}>{i.qty}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{i.reorder}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(i.cost)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{fmt(i.qty * i.cost)}</td>
                  <td className="px-4 py-3">
                    <SBadge s={low ? "Low Stock" : "OK"}
                      custom={low
                        ? { bg: "#fee2e2", color: RED, border: "#fca5a5" }
                        : { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" }}/>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => setModal(i)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100">
                          <Edit2 size={13}/>
                        </button>
                        <button onClick={() => del(i.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {modal !== null && (
      <ModalWrap title={modal.id ? "Edit Item" : "Add Item"} onClose={() => setModal(null)}>
        <div className="space-y-4">
          {([
            ["Item Name", "item", "text"],
            ["Category", "cat", "text"],
            ["Qty", "qty", "number"],
            ["Reorder Level", "reorder", "number"],
            ["Unit Cost ()", "cost", "number"],
          ] as const).map(([l, k, t]) => (
            <Fld key={k} label={l}>
              <input className={inp} type={t} value={modal[k] || ""}
                onChange={e => setModal((p: any) => ({ ...p, [k]: t === "number" ? Number(e.target.value) : e.target.value }))}/>
            </Fld>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
          <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
          <button onClick={() => save(modal)}
            className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{ background: G }}>
            {modal.id ? "Save" : "Add"}
          </button>
        </div>
      </ModalWrap>
    )}
  </div>);
}
