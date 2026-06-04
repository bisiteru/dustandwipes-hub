// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Requisitions page
//  Phase 4d extraction. Monthly supply requisitions with approval workflow,
//  inventory deduction on forwarding, and item catalogue management.
//
//  Includes RequisitionsPage + ReqFormModal + ReqViewer.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Plus, Edit2, Trash2, Eye, Info, AlertTriangle, ClipboardCheck } from "lucide-react";
import { G, GL, O, RED, BLUE, AMBER, TODAY, MONTHS, inp } from "../lib/constants";
import { fmt } from "../lib/format";
import { dbSync, dbDelete, saveContact } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, nextMonthKey, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";
import type { Requisition, SupplyItem, Client, AppUser, CurrentUser, Inventory } from "../lib/schemas";

// ── Local type for an embedded requisition line item ────────────────────────
// In the Zod schema, `items` is z.array(z.any()) — so we model the runtime
// shape here. All arithmetic is defensively wrapped in Number(x) || 0.
interface LineItem {
  id?: string;
  name: string;
  unit?: string;
  cat?: string;
  cost?: number;
  qty: number;
  rate?: number;
  approvedRate?: number;
  notes?: string;
}

interface BadgeStyle { bg: string; color: string; border: string; }

type ReqStatus = "Pending" | "Approved" | "Rejected" | "Forwarded";

interface ReqStats {
  reqs: number;
  budget: number;
  spent: number;
  itemCount: number;
  byCat: Record<string, number>;
  byItem: Record<string, number>;
}

interface KpiEntry {
  label: string;
  value: string | number;
  color?: string;
}

interface CatalogueItemDraft {
  id?: string;
  name?: string;
  cat?: string;
  unit?: string;
  cost?: number;
  active?: boolean;
}

type NewReqModalState = { type: "new" };

export interface RequisitionsPageProps {
  requisitions: Requisition[];
  setRequisitions: Dispatch<SetStateAction<Requisition[]>>;
  supplyItems: SupplyItem[];
  setSupplyItems: Dispatch<SetStateAction<SupplyItem[]>>;
  clients: Client[];
  users: AppUser[];
  user: CurrentUser;
  inventory: Inventory[];
  setInventory: Dispatch<SetStateAction<Inventory[]>>;
}

// Defensive number coercion used in every arithmetic reducer below.
const n = (v: unknown): number => Number(v) || 0;

// Pick the effective unit rate for a line item (approved > requested > catalogue).
const rateOf = (i: LineItem): number =>
  n(i.approvedRate) || n(i.rate) || n(i.cost);

// Sum of a requisition: qty * effective rate, per item.
const reqTotal = (r: Requisition): number =>
  ((r.items as LineItem[] | undefined) || []).reduce(
    (s, i) => s + n(i.qty) * rateOf(i),
    0
  );

export
function RequisitionsPage({requisitions,setRequisitions,supplyItems,setSupplyItems,clients,users,user,inventory,setInventory}: RequisitionsPageProps){
  void users; // currently unused; kept on the prop interface to match App.tsx call site
  const[tab,setTab]=useState<"reqs"|"catalogue">("reqs");
  const[modal,setModal]=useState<NewReqModalState | null>(null);
  const[view,setView]=useState<Requisition | null>(null);
  const[itemModal,setItemModal]=useState<CatalogueItemDraft | null>(null);
  const[confirm,confirmEl]=useConfirm();const toast=useToast();
  const canManage=user.role==="Admin"||user.role==="Supervisor";
  const statusColors: Record<ReqStatus, BadgeStyle> = {
    Pending:{bg:"#fffbeb",color:AMBER,border:"#fde68a"},
    Approved:{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},
    Rejected:{bg:"#fee2e2",color:RED,border:"#fca5a5"},
    Forwarded:{bg:"#eff6ff",color:BLUE,border:"#bfdbfe"},
  };
  // ── Monthly grouping ────────────────────────────────────────────────
  const[selMK,setSelMK]=useState<string>(curMonthKey());
  // `month` is INT 0-11 in the Zod schema; convert to YYYY-MM for grouping.
  const getMK=(r: Requisition): string =>
    `${r.year||new Date().getFullYear()}-${String((r.month ?? new Date().getMonth())+1).padStart(2,"0")}`;
  useEffect(()=>{
    // Never auto-switch away from the current month — the user expects to land
    // on (say) June so a new requisition fills the current period, not the
    // previous one. Auto-jumping was creating a real misfiling risk.
    if(selMK===curMonthKey())return;
    if(requisitions.length>0&&!requisitions.some(r=>monthOf(r,getMK)===selMK)){
      const keys=[...new Set(requisitions.map(r=>monthOf(r,getMK)).filter((k): k is string => Boolean(k)))].sort().reverse();
      if(keys[0])setSelMK(keys[0]);
    }
  },[requisitions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthReqs=requisitions.filter(r=>monthOf(r,getMK)===selMK);
  const openNextMonth=():void=>{
    const keys=[...new Set([...requisitions.map(r=>monthOf(r,getMK)).filter((k): k is string => Boolean(k)),curMonthKey()])].sort().reverse();
    const latest=keys[0]||curMonthKey();
    const next=nextMonthKey(latest);
    setSelMK(next);
    toast.info(`Now viewing ${mkLabel(next)} — click "New Requisition" to create one for this month.`);
  };
  // ── Print report helpers ────────────────────────────────────────────
  const statsOf=(list: Requisition[]): ReqStats=>{
    const budget=list.reduce((s,r)=>s+n(r.budgetCap),0);
    const spent=list.reduce((s,r)=>s+reqTotal(r),0);
    const itemCount=list.reduce((s,r)=>s+((r.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).reduce((ss,i)=>ss+n(i.qty),0),0);
    const byCat: Record<string, number>={};
    list.forEach(r=>((r.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).forEach(i=>{const k=i.cat||"Other";byCat[k]=(byCat[k]||0)+n(i.qty)*rateOf(i);}));
    const byItem: Record<string, number>={};
    list.forEach(r=>((r.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).forEach(i=>{const k=i.name||"Unknown";byItem[k]=(byItem[k]||0)+n(i.qty)*rateOf(i);}));
    return{reqs:list.length,budget,spent,itemCount,byCat,byItem};
  };
  const kpisOf=(s: ReqStats): KpiEntry[]=>[
    {label:"Requisitions",value:s.reqs},
    {label:"Total Budget",value:"₦"+s.budget.toLocaleString(),color:BLUE},
    {label:"Total Spent",value:"₦"+s.spent.toLocaleString(),color:s.spent>s.budget&&s.budget>0?RED:"#16a34a"},
    {label:"Items Requested",value:s.itemCount,color:O},
    {label:"Categories",value:Object.keys(s.byCat).length,color:"#7c3aed"},
  ];
  const reqRow=(r: Requisition): string=>{
    const total=reqTotal(r);const budget=n(r.budgetCap);const pct=budget>0?(total/budget*100).toFixed(0)+"%":"--";
    return`<tr><td>${r.site||"--"}</td><td>${r.submittedBy||"--"}</td><td style="text-align:center">${((r.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).length}</td><td style="text-align:right">&#x20a6;${budget.toLocaleString()}</td><td style="text-align:right">&#x20a6;${total.toLocaleString()}</td><td style="text-align:center">${pct}</td><td>${r.status||"Pending"}</td></tr>`;
  };
  const reqTable=(list: Requisition[]): string=>list.length===0?`<p style="font-size:10px;color:#9ca3af;margin:4px 0">No requisitions</p>`:`<table><thead><tr><th>Site</th><th>Submitted By</th><th>Items</th><th>Budget</th><th>Total</th><th>Util.</th><th>Status</th></tr></thead><tbody>${list.map(reqRow).join("")}</tbody></table>`;
  const catBreakdown=(s: ReqStats): string=>{
    const rows=Object.entries(s.byCat).sort((a,b)=>b[1]-a[1]);
    if(!rows.length)return"";
    return`<table style="margin-top:6px"><thead><tr><th>Category</th><th style="text-align:right">Spend</th><th style="text-align:right">% of total</th></tr></thead><tbody>${rows.map(([nme,v])=>`<tr><td>${nme}</td><td style="text-align:right">&#x20a6;${v.toLocaleString()}</td><td style="text-align:right">${s.spent>0?(v/s.spent*100).toFixed(1):0}%</td></tr>`).join("")}</tbody></table>`;
  };
  const topItems=(s: ReqStats): string=>{
    const rows=Object.entries(s.byItem).sort((a,b)=>b[1]-a[1]).slice(0,15);
    if(!rows.length)return"";
    return`<table style="margin-top:6px"><thead><tr><th>Item</th><th style="text-align:right">Spend</th></tr></thead><tbody>${rows.map(([nme,v])=>`<tr><td>${nme}</td><td style="text-align:right">&#x20a6;${v.toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
  };
  const printMonth=():void=>{
    if(monthReqs.length===0){alert(`No requisitions for ${mkLabel(selMK)}`);return;}
    const s=statsOf(monthReqs);
    openPrintWin(buildReportHtml({moduleName:"Requisitions",periodLabel:mkLabel(selMK),summaryKpis:kpisOf(s),sections:[{label:"Requisitions for "+mkLabel(selMK),table:reqTable(monthReqs)},{label:"Spend by Category",table:catBreakdown(s)},{label:"Top Items by Spend",table:topItems(s)}]}));
  };
  const printAll=():void=>{
    if(requisitions.length===0){alert("No requisitions recorded yet");return;}
    const s=statsOf(requisitions);
    const byMonth: Record<string, Requisition[]>={};
    requisitions.forEach(r=>{const mk=monthOf(r,getMK);if(!mk)return;(byMonth[mk]=byMonth[mk]||[]).push(r);});
    const months=Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({moduleName:"Requisitions",periodLabel:"All History",summaryKpis:kpisOf(s),sections:[{label:"Overall Spend by Category",table:catBreakdown(s)},...months.map(mk=>{const sub=statsOf(byMonth[mk]);return{label:`${mkLabel(mk)} — ${sub.reqs} requisition(s), ₦${sub.spent.toLocaleString()} spent`,kpis:kpisOf(sub),table:reqTable(byMonth[mk])};})]}));
  };
  interface ContactLite { name: string; phone?: string; email?: string; address?: string; }
  const approve=(id: string, status: ReqStatus): void=>{
    const newRs=requisitions.map((r): Requisition=>{
      if(r.id!==id) return r;
      if(status==="Approved"&&r.site){
        const win=window as unknown as { __DW_CONTACTS__?: ContactLite[] };
        const existing=win.__DW_CONTACTS__||[];
        const alreadyInContacts=existing.some(c=>(c.name||"").toLowerCase()===r.site.toLowerCase());
        const alreadyInClients=clients.some(c=>(c.name||"").toLowerCase()===r.site.toLowerCase());
        if(!alreadyInContacts&&!alreadyInClients){
          saveContact({name:r.site,phone:"",email:"",address:""});
          if(win.__DW_CONTACTS__){win.__DW_CONTACTS__.push({name:r.site,phone:"",email:"",address:""});}
        }
      }
      return {...r,status,reviewedBy:user.name,reviewedAt:new Date().toLocaleString("en-GB")};
    });
    setRequisitions(newRs);dbSync("requisitions",newRs);toast.success(`Requisition ${status.toLowerCase()}`);
  };
  const del=(id: string): void=>confirm("Delete this requisition?",()=>{
    setRequisitions(rs=>{
      const next=rs.filter(r=>r.id!==id);
      dbDelete("requisitions",id);
      return next;
    });
    toast.success("Requisition deleted");
  });
  const saveItem=(data: CatalogueItemDraft): void=>{
    let ns: SupplyItem[];
    if(data.id) ns=supplyItems.map(i=>i.id===data.id?({...i,...data} as SupplyItem):i);
    else ns=[...supplyItems,{...data,id:"s"+Date.now(),active:true} as SupplyItem];
    setSupplyItems(ns);dbSync("supplyitems",ns);toast.success(data.id?"Item updated":"Item added to catalogue");setItemModal(null);
  };
  const delItem=(id: string): void=>confirm("Remove item from catalogue?",()=>{
    setSupplyItems(si=>si.filter(i=>i.id!==id));
    dbDelete("supplyitems",id);
    toast.success("Item removed from catalogue");
  });
  const cats: string[]=["All",...Array.from(new Set<string>(supplyItems.map(i=>String(i.cat||""))))];
  const[catFilter,setCatFilter]=useState<string>("All");
  const[deductModal,setDeductModal]=useState<Requisition | null>(null);
  return(<div className="space-y-5">{confirmEl}
    {/* Month tabs (with Open Next Month) + Print buttons — only on Requisitions tab */}
    {tab==="reqs"&&<div className="flex items-start justify-between flex-wrap gap-3">
      <MonthTabs records={requisitions} getMK={getMK} selMK={selMK} setSelMK={setSelMK} onOpenNext={openNextMonth}/>
      <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll}/>
    </div>}
    <div className="flex items-center gap-4 border-b border-gray-200">
      {([{id:"reqs" as const,label:"Requisitions",n:monthReqs.filter(r=>r.status==="Pending").length},{id:"catalogue" as const,label:"Item Catalogue",hide:!canManage,n:supplyItems.length}]).filter(t=>!t.hide).map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${tab===t.id?"border-b-2":"text-gray-400 hover:text-gray-600"}`} style={tab===t.id?{borderColor:G,color:G}:{}}>{t.label}{t.n>0&&<span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white" style={{background:t.id==="reqs"?AMBER:G}}>{t.n}</span>}</button>)}
    </div>
    {tab==="reqs"&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 flex-wrap"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fffbeb",color:AMBER}}>{monthReqs.filter(r=>r.status==="Pending").length} Pending in {mkLabel(selMK)}</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dcfce7",color:G}}>{monthReqs.filter(r=>r.status==="Approved").length} Approved</div></div><button onClick={()=>setModal({type:"new"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Requisition</button></div>
      {canManage&&<div className="flex items-center gap-2 p-3 rounded-xl text-xs text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><Info size={13}/>Submitted requisitions trigger email notifications to all Supervisors. (Requires Supabase backend.)</div>}
      <Card><div className="divide-y divide-gray-50">{monthReqs.length===0&&<div className="text-center py-12 text-gray-400"><ClipboardCheck size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">No requisitions in {mkLabel(selMK)}</p><p className="text-xs mt-1">Switch months above, or click <strong>New Requisition</strong> to create one</p></div>}{monthReqs.map(r=>{const items=(r.items as LineItem[] | undefined)||[];const total=items.reduce((s,i)=>s+(n(i.qty)*(n(i.approvedRate)||n(i.rate))),0);const budget=n(r.budgetCap);const pct=budget>0?total/budget:0;const status=(r.status||"Pending") as ReqStatus;return(<div key={String(r.id)} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.site||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{r.site} -- {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-500">By: {r.submittedBy}  {items.length} items</p>{canManage&&budget>0&&<span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{background:pct>1?"#fee2e2":pct>0.85?"#fffbeb":"#dcfce7"}}><span className={pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%)</span></span>}{r.reviewedBy&&<p className="text-xs text-gray-400 mt-0.5">Reviewed: {r.reviewedBy}</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={status} custom={statusColors[status]}/><button onClick={()=>setView(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Eye size={13}/></button>{canManage&&r.status==="Pending"&&<><button onClick={()=>approve(String(r.id),"Approved")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:G}}>Approve</button><button onClick={()=>approve(String(r.id),"Rejected")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:RED}}>Reject</button></>}{canManage&&r.status==="Approved"&&<button onClick={()=>setDeductModal(r)} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:BLUE}}>Forward</button>}<button onClick={()=>del(String(r.id))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>);})}</div></Card>
    </>}
    {tab==="catalogue"&&canManage&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${catFilter===c?"text-white border-transparent":"bg-white text-gray-500 border-gray-200"}`} style={catFilter===c?{background:G}:{}}>{c}</button>)}</div><button onClick={()=>setItemModal({cat:"Cleaning",unit:"bottle",active:true})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Item</button></div>
      <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}><AlertTriangle size={13}/>Master price list -- costs visible to <strong>Admin &amp; Supervisor only</strong>. Technicians see items without prices.</div>
      <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Item Name","Category","Unit","Unit Cost ()","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{supplyItems.filter(i=>catFilter==="All"||i.cat===catFilter).map(i=><tr key={String(i.id)} className={`hover:bg-gray-50/70 ${!i.active?"opacity-50":""}`}><td className="px-4 py-3 font-medium text-gray-800">{i.name}</td><td className="px-4 py-3 text-xs text-gray-500">{i.cat}</td><td className="px-4 py-3 text-xs text-gray-500">{i.unit}</td><td className="px-4 py-3 font-bold text-gray-700">{fmt(i.cost)}</td><td className="px-4 py-3"><SBadge s={i.active?"Active":"Inactive"} custom={i.active?{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}:{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"}}/></td><td className="px-4 py-3"><div className="flex gap-1"><button onClick={()=>setItemModal(i as CatalogueItemDraft)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>delItem(String(i.id))} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></Card>
    </>}
    {deductModal&&<ModalWrap title="Forward & Deduct Inventory" onClose={()=>setDeductModal(null)} wide>
  <p className="text-sm text-gray-600 mb-4">Review which items to deduct from inventory stock when forwarding <strong>{deductModal.site}</strong>'s requisition.</p>
  <div className="space-y-2 max-h-64 overflow-y-auto">
    {((deductModal.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).map((item,idx)=>{
      const inv=inventory.find(i=>(i.item||"").toLowerCase()===(item.name||"").toLowerCase());
      return(<div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50"><div><p className="text-sm font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-400">Requested: {item.qty} {item.unit}{inv?<span className="ml-2 font-medium" style={{color:n(inv.qty)>=n(item.qty)?G:RED}}>  Stock: {inv.qty}</span>:<span className="ml-2 text-gray-400">(not in inventory)</span>}</p></div>{inv&&<span className="text-xs font-semibold px-2 py-1 rounded-lg" style={n(inv.qty)>=n(item.qty)?{background:"#dcfce7",color:"#166534"}:{background:"#fee2e2",color:RED}}>{n(inv.qty)>=n(item.qty)?"Sufficient":"Low"}</span>}</div>);
    })}
  </div>
  <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
    <button onClick={()=>{approve(String(deductModal.id),"Forwarded");setDeductModal(null);}} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Forward Only</button>
    <button onClick={()=>{
      const updated: Inventory[]=[...inventory];
      ((deductModal.items as LineItem[] | undefined)||[]).filter(i=>n(i.qty)>0).forEach(item=>{
        const idx=updated.findIndex(i=>(i.item||"").toLowerCase()===(item.name||"").toLowerCase());
        if(idx>-1){
          const cur=updated[idx];
          updated[idx]={...cur,qty:Math.max(0,n(cur.qty)-n(item.qty))};
        }
      });
      setInventory(updated);dbSync("inventory",updated);
      approve(String(deductModal.id),"Forwarded");
      setDeductModal(null);
    }} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Forward & Deduct Stock</button>
  </div>
</ModalWrap>}
    {modal?.type==="new"&&<ReqFormModal initialMK={selMK} supplyItems={supplyItems} clients={clients} user={user} canSeeCosts={canManage} onSave={data=>{const nr=[data,...requisitions];setRequisitions(nr);dbSync("requisitions",nr);setModal(null);}} onClose={()=>setModal(null)}/>}
    {view&&<ReqViewer req={view} canSeeCosts={canManage} onClose={()=>setView(null)}/>}
    {itemModal&&<ModalWrap title={itemModal.id?"Edit Item":"Add to Catalogue"} onClose={()=>setItemModal(null)}><div className="space-y-4"><Fld label="Item Name"><input className={inp} value={itemModal.name||""} onChange={e=>setItemModal(p=>({...(p||{}),name:e.target.value}))}/></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Category"><select className={inp} value={itemModal.cat||"Cleaning"} onChange={e=>setItemModal(p=>({...(p||{}),cat:e.target.value}))}>{["Cleaning","Air Care","Consumables","Hygiene","PPE","Equipment","Pest Control"].map(c=><option key={c}>{c}</option>)}</select></Fld><Fld label="Unit"><select className={inp} value={itemModal.unit||"bottle"} onChange={e=>setItemModal(p=>({...(p||{}),unit:e.target.value}))}>{["bottle","can","pack","bag","box","tin","piece","roll","sachet","litre","kg"].map(u=><option key={u}>{u}</option>)}</select></Fld><Fld label="Unit Cost ()"><input className={inp} type="number" min="0" value={itemModal.cost||""} onChange={e=>setItemModal(p=>({...(p||{}),cost:Number(e.target.value)}))}/></Fld><Fld label="Status"><select className={inp} value={itemModal.active?"Active":"Inactive"} onChange={e=>setItemModal(p=>({...(p||{}),active:e.target.value==="Active"}))}><option>Active</option><option>Inactive</option></select></Fld></div></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setItemModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>saveItem(itemModal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{itemModal.id?"Save Changes":"Add Item"}</button></div></ModalWrap>}
  </div>);}

interface ReqFormState {
  site: string;
  month: number;
  year: number;
  budgetCap: number;
  items: LineItem[];
  submittedBy: string;
  status: ReqStatus;
}

interface ReqFormModalProps {
  /** YYYY-MM key of the month tab currently selected on the listing page.
   *  The form defaults its month/year fields to this so a requisition
   *  created while viewing the April tab is filed under April — not under
   *  today's month. Fixes the misfiling bug where data crossed tabs. */
  initialMK: string;
  supplyItems: SupplyItem[];
  clients: Client[];
  user: CurrentUser;
  canSeeCosts: boolean;
  onSave: (data: Requisition) => void;
  onClose: () => void;
}

function ReqFormModal({initialMK,supplyItems,clients,user,canSeeCosts,onSave,onClose}: ReqFormModalProps){
  const[submitted,setSubmitted]=useState(false);
  const activeItems=supplyItems.filter(i=>i.active);
  // Parse the selected-tab key (YYYY-MM) into the form's int-month + year
  // fields. Falls back to today if initialMK is somehow malformed.
  const [initY, initM] = (/^\d{4}-\d{2}$/.test(initialMK)
    ? initialMK.split("-").map(Number)
    : [TODAY.getFullYear(), TODAY.getMonth() + 1]);
  const[f,setF]=useState<ReqFormState>({
    site:"",
    month:(initM ?? 1) - 1, // schema stores 0-11
    year:initY ?? TODAY.getFullYear(),
    budgetCap:0,
    items:activeItems.map((i): LineItem=>({id:String(i.id),name:i.name,unit:i.unit,cat:i.cat,cost:n(i.cost),qty:0,notes:""})),
    submittedBy:user.name,
    status:"Pending",
  });
  const updItem=<K extends keyof LineItem>(idx: number, k: K, v: LineItem[K]): void=>
    setF(p=>({...p,items:p.items.map((it,i)=>i===idx?{...it,[k]:v}:it)}));
  const activeRequested=f.items.filter(i=>n(i.qty)>0);
  const total=activeRequested.reduce((s,i)=>s+n(i.qty)*n(i.cost),0);
  const budget=n(f.budgetCap),pct=budget>0?total/budget:0;
  if(submitted)return(<ModalWrap title="Requisition Submitted" onClose={onClose}><div className="text-center py-8"><div className="text-5xl mb-4"></div><h3 className="font-bold text-gray-800 text-lg mb-2">Submitted Successfully!</h3><p className="text-sm text-gray-500 mb-4">Requisition for <strong>{f.site}</strong> -- {MONTHS[f.month]} {f.year}</p><div className="p-3 rounded-xl text-sm text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}> Supervisors notified by email.</div><button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Done</button></div></ModalWrap>);
  const cats:string[]=[...Array.from(new Set<string>(activeItems.map(i=>String(i.cat||""))))];
  return(<ModalWrap title="New Monthly Requisition" onClose={onClose} xl>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4"><Fld label="Site / Client"><select className={inp} value={f.site} onChange={e=>setF(p=>({...p,site:e.target.value}))}><option value="">-- Select --</option>{clients.map(c=><option key={String(c.id)}>{c.name}</option>)}</select></Fld><Fld label="Month"><select className={inp} value={f.month} onChange={e=>setF(p=>({...p,month:Number(e.target.value)}))}>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></Fld><Fld label="Year"><input className={inp} type="number" value={f.year} onChange={e=>setF(p=>({...p,year:Number(e.target.value)}))}/></Fld></div>
      {canSeeCosts&&<Fld label="Monthly Budget Cap ()"><input className={inp} type="number" value={f.budgetCap} onChange={e=>setF(p=>({...p,budgetCap:Number(e.target.value)}))}/></Fld>}
      <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items -- enter qty needed (0 = skip)</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {cats.map(cat=>{const catItems=f.items.filter(i=>i.cat===cat);return(<div key={cat}><div className="px-4 py-2 text-xs font-black uppercase tracking-wider sticky top-0" style={{background:"#f9fafb",color:G,borderBottom:"1px solid #f3f4f6"}}>{cat}</div><table className="w-full text-sm"><tbody className="divide-y divide-gray-50">{catItems.map(it=>{const idx=f.items.indexOf(it);return(<tr key={String(it.id)} className={n(it.qty)>0?"bg-green-50/40":""}><td className="px-4 py-2.5 font-medium text-gray-800">{it.name}</td><td className="px-4 py-2.5 text-xs text-gray-400">{it.unit}</td>{canSeeCosts&&<td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(n(it.cost))}/unit</td>}<td className="px-4 py-2.5"><input type="number" min="0" value={it.qty} onChange={e=>updItem(idx,"qty",Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500"/></td>{canSeeCosts&&<td className="px-4 py-2.5">{n(it.qty)>0&&<span className="text-xs font-semibold text-green-700">{fmt(n(it.qty)*n(it.cost))}</span>}</td>}<td className="px-3 py-2.5"><input value={it.notes||""} onChange={e=>updItem(idx,"notes",e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Notes..."/></td></tr>);})}</tbody></table></div>);})}
        </div>
      </div>
      {activeRequested.length>0&&<div className="flex items-center justify-between p-3 rounded-xl" style={{background:GL}}><span className="text-xs font-semibold text-green-700">{activeRequested.length} item(s) requested</span>{canSeeCosts&&budget>0&&<span className={`text-xs font-bold ${pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}`}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%) {pct>1?" Over":pct>0.85?" Near":" OK"}</span>}</div>}
      <Fld label="Submitted By"><input className={inp} value={f.submittedBy} onChange={e=>setF(p=>({...p,submittedBy:e.target.value}))}/></Fld>
    </div>
    <div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{const data={...f,id:"req"+Date.now(),items:activeRequested.map((i): LineItem=>({...i,rate:n(i.cost),approvedRate:0}))} as unknown as Requisition;onSave(data);setSubmitted(true);}} disabled={!f.site||activeRequested.length===0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Submit Requisition</button></div>
  </ModalWrap>);}

interface ReqViewerProps {
  req: Requisition;
  canSeeCosts: boolean;
  onClose: () => void;
}

function ReqViewer({req:r,canSeeCosts,onClose}: ReqViewerProps){
  const items=(r.items as LineItem[] | undefined)||[];
  const rateKey=(i: LineItem): string => String(i.id||i.name);
  const[rates,setRates]=useState<Record<string, number>>(
    Object.fromEntries(items.map(i=>[rateKey(i), n(i.approvedRate)||n(i.rate)||n(i.cost)]))
  );
  const total=items.reduce((s,i)=>s+(n(i.qty)*(rates[rateKey(i)]||0)),0);
  const budget=n(r.budgetCap),pct=budget>0?(total/budget*100).toFixed(1):null;
  const printReq=():void=>{const html=`<!DOCTYPE html><html><head><title>Requisition -- ${r.site}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:24px}h1{color:#1B6B2F}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f9fafb;font-size:10px;font-weight:bold}</style></head><body><h1>Dust &amp; Wipes -- Monthly Supply Requisition</h1><p><strong>Site:</strong> ${r.site} &nbsp; <strong>Period:</strong> ${MONTHS[r.month]} ${r.year} &nbsp; <strong>Status:</strong> ${r.status}</p><p><strong>Submitted by:</strong> ${r.submittedBy}${r.reviewedBy?" &nbsp; <strong>Reviewed by:</strong> "+r.reviewedBy:""}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th>${canSeeCosts?"<th>Rate ()</th><th>Total ()</th>":""}<th>Notes</th></tr></thead><tbody>${items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit||""}</td>${canSeeCosts?`<td>${(rates[rateKey(i)]||0).toLocaleString()}</td><td>${(n(i.qty)*(rates[rateKey(i)]||0)).toLocaleString()}</td>`:""}<td>${i.notes||""}</td></tr>`).join("")}</tbody>${canSeeCosts?`<tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">TOTAL</td><td>${total.toLocaleString()}</td><td></td></tr></tfoot>`:""}</table></body></html>`;const w=window.open("","_blank","width=820,height=900");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}};
  return(<ModalWrap title={`Requisition -- ${r.site}  ${MONTHS[r.month]} ${r.year}`} onClose={onClose} xl>
    <div className="flex justify-between items-center mb-4 pb-4 border-b"><div><p className="font-bold text-gray-800">{r.site} -- {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-400">By {r.submittedBy}  {r.status}{r.reviewedBy?`  Reviewed: ${r.reviewedBy}`:""}</p></div><button onClick={printReq} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:O}}> Print / PDF</button></div>
    {canSeeCosts&&budget>0&&pct!==null&&<div className="p-3 rounded-xl mb-4 text-sm font-semibold" style={{background:Number(pct)>100?"#fee2e2":Number(pct)>85?"#fffbeb":"#dcfce7"}}><span className={Number(pct)>100?"text-red-700":Number(pct)>85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({pct}%) {Number(pct)>100?" OVER BUDGET":Number(pct)>85?" Near budget":" Within budget"}</span></div>}
    <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b"><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Item</th><th className="px-4 py-2.5 text-xs font-bold text-gray-400 uppercase text-center">Qty</th><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Unit</th>{canSeeCosts&&<><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Rate ()</th><th className="text-right px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Total</th></>}<th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Notes</th></tr></thead><tbody className="divide-y divide-gray-50">{items.map(i=><tr key={rateKey(i)} className="hover:bg-gray-50"><td className="px-4 py-2.5 font-medium text-gray-800">{i.name}</td><td className="px-4 py-2.5 text-center font-bold text-gray-700">{i.qty}</td><td className="px-4 py-2.5 text-xs text-gray-500">{i.unit}</td>{canSeeCosts&&<><td className="px-4 py-2.5"><input type="number" min="0" value={rates[rateKey(i)]||""} onChange={e=>setRates(prev=>({...prev,[rateKey(i)]:Number(e.target.value)}))} className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Rate"/></td><td className="px-4 py-2.5 text-right font-semibold text-gray-700">{rates[rateKey(i)]?fmt(n(i.qty)*rates[rateKey(i)]):"--"}</td></>}<td className="px-4 py-2.5 text-xs text-gray-400">{i.notes||"--"}</td></tr>)}</tbody>{canSeeCosts&&<tfoot><tr style={{background:"#f0fdf4"}}><td className="px-4 py-2.5 font-black text-gray-800" colSpan={4}>TOTAL</td><td className="px-4 py-2.5 text-right font-black" style={{color:G}}>{fmt(total)}</td><td/></tr></tfoot>}</table></div>
  </ModalWrap>);}



// -- IMPREST -------------------------------------------------------------------
