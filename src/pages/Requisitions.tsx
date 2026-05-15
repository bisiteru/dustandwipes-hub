// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Requisitions page
//  Phase 4d extraction. Monthly supply requisitions with approval workflow,
//  inventory deduction on forwarding, and item catalogue management.
//
//  Includes RequisitionsPage + ReqFormModal + ReqViewer.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, Info, AlertTriangle, ClipboardCheck } from "lucide-react";
import { G, GL, O, RED, BLUE, AMBER, TODAY, MONTHS, inp } from "../lib/constants";
import { fmt } from "../lib/format";
import { dbSync, dbDelete, saveContact } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, nextMonthKey, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";

export
function RequisitionsPage({requisitions,setRequisitions,supplyItems,setSupplyItems,clients,users,user,inventory,setInventory}){
  const[tab,setTab]=useState("reqs");const[modal,setModal]=useState(null);const[view,setView]=useState(null);const[itemModal,setItemModal]=useState(null);
  const[confirm,confirmEl]=useConfirm();const toast=useToast();
  const canManage=user.role==="Admin"||user.role==="Supervisor";
  const statusColors={Pending:{bg:"#fffbeb",color:AMBER,border:"#fde68a"},Approved:{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},Rejected:{bg:"#fee2e2",color:RED,border:"#fca5a5"},Forwarded:{bg:"#eff6ff",color:BLUE,border:"#bfdbfe"}};
  // ── Monthly grouping ────────────────────────────────────────────────
  const[selMK,setSelMK]=useState(curMonthKey());
  const getMK=r=>`${r.year||new Date().getFullYear()}-${String((r.month??new Date().getMonth())+1).padStart(2,"0")}`;
  useEffect(()=>{if(requisitions.length>0&&!requisitions.some(r=>monthOf(r,getMK)===selMK)){const keys=[...new Set(requisitions.map(r=>monthOf(r,getMK)).filter(Boolean))].sort().reverse();if(keys[0])setSelMK(keys[0] as string);}},[requisitions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthReqs=requisitions.filter(r=>monthOf(r,getMK)===selMK);
  const openNextMonth=()=>{
    const keys=[...new Set(requisitions.map(r=>monthOf(r,getMK)).filter(Boolean)),curMonthKey()].sort().reverse();
    const latest=(keys[0] as string)||curMonthKey();
    const next=nextMonthKey(latest);
    setSelMK(next);
    toast.info(`Now viewing ${mkLabel(next)} — click "New Requisition" to create one for this month.`);
  };
  // ── Print report helpers ────────────────────────────────────────────
  const reqTotal=r=>(r.items||[]).reduce((s,i)=>s+(i.qty*(i.approvedRate||i.rate||i.cost||0)),0);
  const statsOf=list=>{
    const budget=list.reduce((s,r)=>s+(r.budgetCap||0),0);
    const spent=list.reduce((s,r)=>s+reqTotal(r),0);
    const itemCount=list.reduce((s,r)=>s+(r.items||[]).filter(i=>i.qty>0).reduce((ss,i)=>ss+i.qty,0),0);
    const byCat={};list.forEach(r=>(r.items||[]).filter(i=>i.qty>0).forEach(i=>{const k=i.cat||"Other";byCat[k]=(byCat[k]||0)+i.qty*(i.approvedRate||i.rate||i.cost||0);}));
    const byItem={};list.forEach(r=>(r.items||[]).filter(i=>i.qty>0).forEach(i=>{const k=i.name||"Unknown";byItem[k]=(byItem[k]||0)+i.qty*(i.approvedRate||i.rate||i.cost||0);}));
    return{reqs:list.length,budget,spent,itemCount,byCat,byItem};
  };
  const kpisOf=s=>[{label:"Requisitions",value:s.reqs},{label:"Total Budget",value:"₦"+s.budget.toLocaleString(),color:BLUE},{label:"Total Spent",value:"₦"+s.spent.toLocaleString(),color:s.spent>s.budget&&s.budget>0?RED:"#16a34a"},{label:"Items Requested",value:s.itemCount,color:O},{label:"Categories",value:Object.keys(s.byCat).length,color:"#7c3aed"}];
  const reqRow=r=>{const total=reqTotal(r);const budget=r.budgetCap||0;const pct=budget>0?(total/budget*100).toFixed(0)+"%":"--";return`<tr><td>${r.site||"--"}</td><td>${r.submittedBy||"--"}</td><td style="text-align:center">${(r.items||[]).filter(i=>i.qty>0).length}</td><td style="text-align:right">&#x20a6;${budget.toLocaleString()}</td><td style="text-align:right">&#x20a6;${total.toLocaleString()}</td><td style="text-align:center">${pct}</td><td>${r.status||"Pending"}</td></tr>`;};
  const reqTable=list=>list.length===0?`<p style="font-size:10px;color:#9ca3af;margin:4px 0">No requisitions</p>`:`<table><thead><tr><th>Site</th><th>Submitted By</th><th>Items</th><th>Budget</th><th>Total</th><th>Util.</th><th>Status</th></tr></thead><tbody>${list.map(reqRow).join("")}</tbody></table>`;
  const catBreakdown=(s:any)=>{const rows=Object.entries(s.byCat).sort((a:any,b:any)=>b[1]-a[1]);if(!rows.length)return"";return`<table style="margin-top:6px"><thead><tr><th>Category</th><th style="text-align:right">Spend</th><th style="text-align:right">% of total</th></tr></thead><tbody>${rows.map(([n,v]:[string,number])=>`<tr><td>${n}</td><td style="text-align:right">&#x20a6;${v.toLocaleString()}</td><td style="text-align:right">${s.spent>0?(v/s.spent*100).toFixed(1):0}%</td></tr>`).join("")}</tbody></table>`;};
  const topItems=(s:any)=>{const rows=Object.entries(s.byItem).sort((a:any,b:any)=>b[1]-a[1]).slice(0,15);if(!rows.length)return"";return`<table style="margin-top:6px"><thead><tr><th>Item</th><th style="text-align:right">Spend</th></tr></thead><tbody>${rows.map(([n,v]:[string,number])=>`<tr><td>${n}</td><td style="text-align:right">&#x20a6;${v.toLocaleString()}</td></tr>`).join("")}</tbody></table>`;};
  const printMonth=()=>{
    if(monthReqs.length===0){alert(`No requisitions for ${mkLabel(selMK)}`);return;}
    const s=statsOf(monthReqs);
    openPrintWin(buildReportHtml({moduleName:"Requisitions",periodLabel:mkLabel(selMK),summaryKpis:kpisOf(s),sections:[{label:"Requisitions for "+mkLabel(selMK),table:reqTable(monthReqs)},{label:"Spend by Category",table:catBreakdown(s)},{label:"Top Items by Spend",table:topItems(s)}]}));
  };
  const printAll=()=>{
    if(requisitions.length===0){alert("No requisitions recorded yet");return;}
    const s=statsOf(requisitions);
    const byMonth={};requisitions.forEach(r=>{const mk=monthOf(r,getMK);if(!mk)return;(byMonth[mk]=byMonth[mk]||[]).push(r);});
    const months=Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({moduleName:"Requisitions",periodLabel:"All History",summaryKpis:kpisOf(s),sections:[{label:"Overall Spend by Category",table:catBreakdown(s)},...months.map(mk=>{const sub=statsOf(byMonth[mk]);return{label:`${mkLabel(mk)} — ${sub.reqs} requisition(s), ₦${sub.spent.toLocaleString()} spent`,kpis:kpisOf(sub),table:reqTable(byMonth[mk])};})]}));
  };
  const approve=(id,status)=>{
    const newRs=requisitions.map(r=>{
      if(r.id!==id) return r;
      if(status==="Approved"&&r.site){
        const alreadyInContacts=((window as any).__DW_CONTACTS__||[]).some(c=>c.name.toLowerCase()===r.site.toLowerCase());
        const alreadyInClients=clients.some(c=>c.name.toLowerCase()===r.site.toLowerCase());
        if(!alreadyInContacts&&!alreadyInClients){
          saveContact({name:r.site,phone:"",email:"",address:""});
          if((window as any).__DW_CONTACTS__){(window as any).__DW_CONTACTS__.push({name:r.site,phone:"",email:"",address:""});}
        }
      }
      return {...r,status,reviewedBy:user.name,reviewedAt:new Date().toLocaleString("en-GB")};
    });
    setRequisitions(newRs);dbSync("requisitions",newRs);toast.success(`Requisition ${status.toLowerCase()}`);
  };
  const del=id=>confirm("Delete this requisition?",()=>{setRequisitions(rs=>rs.filter(r=>r.id!==id));dbDelete("requisitions",id);toast.success("Requisition deleted");});
  const saveItem=data=>{let ns;if(data.id)ns=supplyItems.map(i=>i.id===data.id?data:i);else ns=[...supplyItems,{...data,id:"s"+Date.now(),active:true}];setSupplyItems(ns);dbSync("supplyitems",ns);toast.success(data.id?"Item updated":"Item added to catalogue");setItemModal(null);};
  const delItem=id=>confirm("Remove item from catalogue?",()=>{setSupplyItems(si=>si.filter(i=>i.id!==id));dbDelete("supplyitems",id);toast.success("Item removed from catalogue");});
  const cats:string[]=["All",...Array.from(new Set<string>(supplyItems.map((i:any)=>String(i.cat||""))))];
  const[catFilter,setCatFilter]=useState("All");
  const[deductModal,setDeductModal]=useState(null);
  return(<div className="space-y-5">{confirmEl}
    {/* Month tabs (with Open Next Month) + Print buttons — only on Requisitions tab */}
    {tab==="reqs"&&<div className="flex items-start justify-between flex-wrap gap-3">
      <MonthTabs records={requisitions} getMK={getMK} selMK={selMK} setSelMK={setSelMK} onOpenNext={openNextMonth}/>
      <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll}/>
    </div>}
    <div className="flex items-center gap-4 border-b border-gray-200">
      {[{id:"reqs",label:"Requisitions",n:monthReqs.filter(r=>r.status==="Pending").length},{id:"catalogue",label:"Item Catalogue",hide:!canManage,n:supplyItems.length}].filter(t=>!t.hide).map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${tab===t.id?"border-b-2":"text-gray-400 hover:text-gray-600"}`} style={tab===t.id?{borderColor:G,color:G}:{}}>{t.label}{t.n>0&&<span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white" style={{background:t.id==="reqs"?AMBER:G}}>{t.n}</span>}</button>)}
    </div>
    {tab==="reqs"&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 flex-wrap"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fffbeb",color:AMBER}}>{monthReqs.filter(r=>r.status==="Pending").length} Pending in {mkLabel(selMK)}</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dcfce7",color:G}}>{monthReqs.filter(r=>r.status==="Approved").length} Approved</div></div><button onClick={()=>setModal({type:"new"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Requisition</button></div>
      {canManage&&<div className="flex items-center gap-2 p-3 rounded-xl text-xs text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><Info size={13}/>Submitted requisitions trigger email notifications to all Supervisors. (Requires Supabase backend.)</div>}
      <Card><div className="divide-y divide-gray-50">{monthReqs.length===0&&<div className="text-center py-12 text-gray-400"><ClipboardCheck size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">No requisitions in {mkLabel(selMK)}</p><p className="text-xs mt-1">Switch months above, or click <strong>New Requisition</strong> to create one</p></div>}{monthReqs.map(r=>{const total=r.items?.reduce((s,i)=>s+(i.qty*(i.approvedRate||i.rate||0)),0)||0;const budget=r.budgetCap||0;const pct=budget>0?total/budget:0;return(<div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.site||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{r.site} -- {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-500">By: {r.submittedBy}  {r.items?.length||0} items</p>{canManage&&budget>0&&<span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{background:pct>1?"#fee2e2":pct>0.85?"#fffbeb":"#dcfce7"}}><span className={pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%)</span></span>}{r.reviewedBy&&<p className="text-xs text-gray-400 mt-0.5">Reviewed: {r.reviewedBy}</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={r.status} custom={statusColors[r.status]}/><button onClick={()=>setView(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Eye size={13}/></button>{canManage&&r.status==="Pending"&&<><button onClick={()=>approve(r.id,"Approved")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:G}}>Approve</button><button onClick={()=>approve(r.id,"Rejected")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:RED}}>Reject</button></>}{canManage&&r.status==="Approved"&&<button onClick={()=>setDeductModal(r)} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:BLUE}}>Forward</button>}<button onClick={()=>del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>);})}</div></Card>
    </>}
    {tab==="catalogue"&&canManage&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${catFilter===c?"text-white border-transparent":"bg-white text-gray-500 border-gray-200"}`} style={catFilter===c?{background:G}:{}}>{c}</button>)}</div><button onClick={()=>setItemModal({cat:"Cleaning",unit:"bottle",active:true})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Item</button></div>
      <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}><AlertTriangle size={13}/>Master price list -- costs visible to <strong>Admin &amp; Supervisor only</strong>. Technicians see items without prices.</div>
      <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Item Name","Category","Unit","Unit Cost ()","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{supplyItems.filter(i=>catFilter==="All"||i.cat===catFilter).map(i=><tr key={i.id} className={`hover:bg-gray-50/70 ${!i.active?"opacity-50":""}`}><td className="px-4 py-3 font-medium text-gray-800">{i.name}</td><td className="px-4 py-3 text-xs text-gray-500">{i.cat}</td><td className="px-4 py-3 text-xs text-gray-500">{i.unit}</td><td className="px-4 py-3 font-bold text-gray-700">{fmt(i.cost)}</td><td className="px-4 py-3"><SBadge s={i.active?"Active":"Inactive"} custom={i.active?{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}:{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"}}/></td><td className="px-4 py-3"><div className="flex gap-1"><button onClick={()=>setItemModal(i)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>delItem(i.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></Card>
    </>}
    {deductModal&&<ModalWrap title="Forward & Deduct Inventory" onClose={()=>setDeductModal(null)} wide>
  <p className="text-sm text-gray-600 mb-4">Review which items to deduct from inventory stock when forwarding <strong>{deductModal.site}</strong>'s requisition.</p>
  <div className="space-y-2 max-h-64 overflow-y-auto">
    {(deductModal.items||[]).filter(i=>i.qty>0).map((item,idx)=>{
      const inv=inventory.find(i=>i.item.toLowerCase()===item.name.toLowerCase());
      return(<div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50"><div><p className="text-sm font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-400">Requested: {item.qty} {item.unit}{inv?<span className="ml-2 font-medium" style={{color:inv.qty>=item.qty?G:RED}}>  Stock: {inv.qty}</span>:<span className="ml-2 text-gray-400">(not in inventory)</span>}</p></div>{inv&&<span className="text-xs font-semibold px-2 py-1 rounded-lg" style={inv.qty>=item.qty?{background:"#dcfce7",color:"#166534"}:{background:"#fee2e2",color:RED}}>{inv.qty>=item.qty?"Sufficient":"Low"}</span>}</div>);
    })}
  </div>
  <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
    <button onClick={()=>{approve(deductModal.id,"Forwarded");setDeductModal(null);}} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Forward Only</button>
    <button onClick={()=>{
      const updated=[...inventory];
      (deductModal.items||[]).filter(i=>i.qty>0).forEach(item=>{
        const idx=updated.findIndex(i=>i.item.toLowerCase()===item.name.toLowerCase());
        if(idx>-1)updated[idx]={...updated[idx],qty:Math.max(0,updated[idx].qty-item.qty)};
      });
      setInventory(updated);dbSync("inventory",updated);
      approve(deductModal.id,"Forwarded");
      setDeductModal(null);
    }} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Forward & Deduct Stock</button>
  </div>
</ModalWrap>}
    {modal?.type==="new"&&<ReqFormModal supplyItems={supplyItems} clients={clients} user={user} canSeeCosts={canManage} onSave={data=>{const nr=[data,...requisitions];setRequisitions(nr);dbSync("requisitions",nr);setModal(null);}} onClose={()=>setModal(null)}/>}
    {view&&<ReqViewer req={view} canSeeCosts={canManage} onClose={()=>setView(null)}/>}
    {itemModal&&<ModalWrap title={itemModal.id?"Edit Item":"Add to Catalogue"} onClose={()=>setItemModal(null)}><div className="space-y-4"><Fld label="Item Name"><input className={inp} value={itemModal.name||""} onChange={e=>setItemModal(p=>({...p,name:e.target.value}))}/></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Category"><select className={inp} value={itemModal.cat||"Cleaning"} onChange={e=>setItemModal(p=>({...p,cat:e.target.value}))}>{["Cleaning","Air Care","Consumables","Hygiene","PPE","Equipment","Pest Control"].map(c=><option key={c}>{c}</option>)}</select></Fld><Fld label="Unit"><select className={inp} value={itemModal.unit||"bottle"} onChange={e=>setItemModal(p=>({...p,unit:e.target.value}))}>{["bottle","can","pack","bag","box","tin","piece","roll","sachet","litre","kg"].map(u=><option key={u}>{u}</option>)}</select></Fld><Fld label="Unit Cost ()"><input className={inp} type="number" min="0" value={itemModal.cost||""} onChange={e=>setItemModal(p=>({...p,cost:Number(e.target.value)}))}/></Fld><Fld label="Status"><select className={inp} value={itemModal.active?"Active":"Inactive"} onChange={e=>setItemModal(p=>({...p,active:e.target.value==="Active"}))}><option>Active</option><option>Inactive</option></select></Fld></div></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setItemModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>saveItem(itemModal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{itemModal.id?"Save Changes":"Add Item"}</button></div></ModalWrap>}
  </div>);}

function ReqFormModal({supplyItems,clients,user,canSeeCosts,onSave,onClose}){
  const[submitted,setSubmitted]=useState(false);
  const activeItems=supplyItems.filter(i=>i.active);
  const[f,setF]=useState({site:"",month:TODAY.getMonth(),year:TODAY.getFullYear(),budgetCap:0,items:activeItems.map(i=>({id:i.id,name:i.name,unit:i.unit,cat:i.cat,cost:i.cost,qty:0,notes:""})),submittedBy:user.name,status:"Pending"});
  const updItem=(idx,k,v)=>setF(p=>({...p,items:p.items.map((it,i)=>i===idx?{...it,[k]:v}:it)}));
  const activeRequested=f.items.filter(i=>i.qty>0);
  const total=activeRequested.reduce((s,i)=>s+i.qty*(i.cost||0),0);
  const budget=f.budgetCap||0,pct=budget>0?total/budget:0;
  if(submitted)return(<ModalWrap title="Requisition Submitted" onClose={onClose}><div className="text-center py-8"><div className="text-5xl mb-4"></div><h3 className="font-bold text-gray-800 text-lg mb-2">Submitted Successfully!</h3><p className="text-sm text-gray-500 mb-4">Requisition for <strong>{f.site}</strong> -- {MONTHS[f.month]} {f.year}</p><div className="p-3 rounded-xl text-sm text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}> Supervisors notified by email.</div><button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Done</button></div></ModalWrap>);
  const cats:string[]=[...Array.from(new Set<string>(activeItems.map((i:any)=>String(i.cat||""))))];
  return(<ModalWrap title="New Monthly Requisition" onClose={onClose} xl>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4"><Fld label="Site / Client"><select className={inp} value={f.site} onChange={e=>setF(p=>({...p,site:e.target.value}))}><option value="">-- Select --</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><Fld label="Month"><select className={inp} value={f.month} onChange={e=>setF(p=>({...p,month:Number(e.target.value)}))}>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></Fld><Fld label="Year"><input className={inp} type="number" value={f.year} onChange={e=>setF(p=>({...p,year:Number(e.target.value)}))}/></Fld></div>
      {canSeeCosts&&<Fld label="Monthly Budget Cap ()"><input className={inp} type="number" value={f.budgetCap} onChange={e=>setF(p=>({...p,budgetCap:Number(e.target.value)}))}/></Fld>}
      <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items -- enter qty needed (0 = skip)</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {cats.map(cat=>{const catItems=f.items.filter(i=>i.cat===cat);return(<div key={cat}><div className="px-4 py-2 text-xs font-black uppercase tracking-wider sticky top-0" style={{background:"#f9fafb",color:G,borderBottom:"1px solid #f3f4f6"}}>{cat}</div><table className="w-full text-sm"><tbody className="divide-y divide-gray-50">{catItems.map(it=>{const idx=f.items.indexOf(it);return(<tr key={it.id} className={it.qty>0?"bg-green-50/40":""}><td className="px-4 py-2.5 font-medium text-gray-800">{it.name}</td><td className="px-4 py-2.5 text-xs text-gray-400">{it.unit}</td>{canSeeCosts&&<td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(it.cost)}/unit</td>}<td className="px-4 py-2.5"><input type="number" min="0" value={it.qty} onChange={e=>updItem(idx,"qty",Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500"/></td>{canSeeCosts&&<td className="px-4 py-2.5">{it.qty>0&&<span className="text-xs font-semibold text-green-700">{fmt(it.qty*it.cost)}</span>}</td>}<td className="px-3 py-2.5"><input value={it.notes} onChange={e=>updItem(idx,"notes",e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Notes..."/></td></tr>);})}</tbody></table></div>);})}
        </div>
      </div>
      {activeRequested.length>0&&<div className="flex items-center justify-between p-3 rounded-xl" style={{background:GL}}><span className="text-xs font-semibold text-green-700">{activeRequested.length} item(s) requested</span>{canSeeCosts&&budget>0&&<span className={`text-xs font-bold ${pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}`}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%) {pct>1?" Over":pct>0.85?" Near":" OK"}</span>}</div>}
      <Fld label="Submitted By"><input className={inp} value={f.submittedBy} onChange={e=>setF(p=>({...p,submittedBy:e.target.value}))}/></Fld>
    </div>
    <div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{const data={...f,id:"req"+Date.now(),items:activeRequested.map(i=>({...i,rate:i.cost,approvedRate:0}))};onSave(data);setSubmitted(true);}} disabled={!f.site||activeRequested.length===0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Submit Requisition</button></div>
  </ModalWrap>);}

function ReqViewer({req:r,canSeeCosts,onClose}){
  const[rates,setRates]=useState(Object.fromEntries((r.items||[]).map(i=>[i.id||i.name,i.approvedRate||i.rate||i.cost||0])));
  const total=r.items?.reduce((s,i)=>s+(i.qty*(rates[i.id||i.name]||0)),0)||0;
  const budget=r.budgetCap||0,pct=budget>0?(total/budget*100).toFixed(1):null;
  const printReq=()=>{const html=`<!DOCTYPE html><html><head><title>Requisition -- ${r.site}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:24px}h1{color:#1B6B2F}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f9fafb;font-size:10px;font-weight:bold}</style></head><body><h1>Dust &amp; Wipes -- Monthly Supply Requisition</h1><p><strong>Site:</strong> ${r.site} &nbsp; <strong>Period:</strong> ${MONTHS[r.month]} ${r.year} &nbsp; <strong>Status:</strong> ${r.status}</p><p><strong>Submitted by:</strong> ${r.submittedBy}${r.reviewedBy?" &nbsp; <strong>Reviewed by:</strong> "+r.reviewedBy:""}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th>${canSeeCosts?"<th>Rate ()</th><th>Total ()</th>":""}<th>Notes</th></tr></thead><tbody>${(r.items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit}</td>${canSeeCosts?`<td>${(rates[i.id||i.name]||0).toLocaleString()}</td><td>${(i.qty*(rates[i.id||i.name]||0)).toLocaleString()}</td>`:""}<td>${i.notes||""}</td></tr>`).join("")}</tbody>${canSeeCosts?`<tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">TOTAL</td><td>${total.toLocaleString()}</td><td></td></tr></tfoot>`:""}</table></body></html>`;const w=window.open("","_blank","width=820,height=900");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}};
  return(<ModalWrap title={`Requisition -- ${r.site}  ${MONTHS[r.month]} ${r.year}`} onClose={onClose} xl>
    <div className="flex justify-between items-center mb-4 pb-4 border-b"><div><p className="font-bold text-gray-800">{r.site} -- {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-400">By {r.submittedBy}  {r.status}{r.reviewedBy?`  Reviewed: ${r.reviewedBy}`:""}</p></div><button onClick={printReq} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:O}}> Print / PDF</button></div>
    {canSeeCosts&&budget>0&&<div className="p-3 rounded-xl mb-4 text-sm font-semibold" style={{background:Number(pct)>100?"#fee2e2":Number(pct)>85?"#fffbeb":"#dcfce7"}}><span className={Number(pct)>100?"text-red-700":Number(pct)>85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({pct}%) {Number(pct)>100?" OVER BUDGET":Number(pct)>85?" Near budget":" Within budget"}</span></div>}
    <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b"><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Item</th><th className="px-4 py-2.5 text-xs font-bold text-gray-400 uppercase text-center">Qty</th><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Unit</th>{canSeeCosts&&<><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Rate ()</th><th className="text-right px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Total</th></>}<th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Notes</th></tr></thead><tbody className="divide-y divide-gray-50">{(r.items||[]).map(i=><tr key={i.id||i.name} className="hover:bg-gray-50"><td className="px-4 py-2.5 font-medium text-gray-800">{i.name}</td><td className="px-4 py-2.5 text-center font-bold text-gray-700">{i.qty}</td><td className="px-4 py-2.5 text-xs text-gray-500">{i.unit}</td>{canSeeCosts&&<><td className="px-4 py-2.5"><input type="number" min="0" value={rates[i.id||i.name]||""} onChange={e=>setRates(prev=>({...prev,[i.id||i.name]:Number(e.target.value)}))} className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Rate"/></td><td className="px-4 py-2.5 text-right font-semibold text-gray-700">{rates[i.id||i.name]?fmt(i.qty*rates[i.id||i.name]):"--"}</td></>}<td className="px-4 py-2.5 text-xs text-gray-400">{i.notes||"--"}</td></tr>)}</tbody>{canSeeCosts&&<tfoot><tr style={{background:"#f0fdf4"}}><td className="px-4 py-2.5 font-black text-gray-800" colSpan={4}>TOTAL</td><td className="px-4 py-2.5 text-right font-black" style={{color:G}}>{fmt(total)}</td><td/></tr></tfoot>}</table></div>
  </ModalWrap>);}



// -- IMPREST -------------------------------------------------------------------
