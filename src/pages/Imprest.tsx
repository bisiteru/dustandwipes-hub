// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Imprest Fund page
//  Phase 4d extraction. Monthly imprest accounts with carry-forward logic,
//  expense logging, top-ups, and Print Report.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Eye, FileText, ClipboardCheck } from "lucide-react";
import { G, O, OL, GL, AMBER, RED, BLUE, TODAY, MONTHS, IMPREST_CATS, inp } from "../lib/constants";
import { fmt, fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, SBadge, KPI } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { StaffSelect } from "../components/pickers";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";

export
function ImprestPage({imprests,setImprests,staff=[]}){
  const[modal,setModal]=useState(null);const[view,setView]=useState(null);const[confirm,confirmEl]=useConfirm();const toast=useToast();
  const today=new Date();
  const curMK=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const[selMK,setSelMK]=useState(curMK);

  // Sync only the changed record — prevents stale-closure overwrites when multiple sessions are active
  const saveOne=(updated,id)=>{setImprests(updated);const rec=updated.find(i=>i.id===id);if(rec)dbSync("imprests",[rec]);};
  const mKey=i=>i.month||(i.releaseDate?i.releaseDate.slice(0,7):curMK);
  const mkLabel=mk=>{const[y,m]=mk.split("-").map(Number);return`${MONTHS[m-1]} ${y}`;};

  // Auto-switch to most recent month with records when current month is empty
  useEffect(()=>{
    if(imprests.length>0&&!imprests.some(i=>mKey(i)===selMK)){
      const keys=[...new Set(imprests.map(i=>mKey(i)))].sort().reverse();
      if(keys[0])setSelMK(keys[0] as string);
    }
  },[imprests]); // eslint-disable-line react-hooks/exhaustive-deps

  const allMonths=useMemo<string[]>(()=>{
    const s=new Set<string>(imprests.map((i:any)=>i.month||(i.releaseDate?i.releaseDate.slice(0,7):curMK)));
    s.add(curMK);return[...s].sort().reverse();
  },[imprests,curMK]);

  const monthRecs=imprests.filter(i=>mKey(i)===selMK);

  const getPrevBal=(holder,beforeMK)=>{
    const prev=imprests.filter(i=>mKey(i)<beforeMK&&i.holder===holder).sort((a,b)=>mKey(b).localeCompare(mKey(a)));
    if(!prev.length)return 0;
    const p=prev[0];const spent=(p.expenses||[]).reduce((s,e)=>s+e.amount,0);
    return Math.max(0,p.amount-spent);
  };

  const addExpense=(id,exp)=>{const u=imprests.map(i=>i.id===id?{...i,expenses:[...(i.expenses||[]),exp]}:i);saveOne(u,id);toast.success("Expense logged");};
  const addTopUp=(id,tu)=>{const u=imprests.map(i=>i.id===id?{...i,amount:i.amount+(tu.amount||0),topups:[...(i.topups||[]),tu]}:i);saveOne(u,id);toast.success(`Top-up of ₦${(tu.amount||0).toLocaleString()} added`);};
  const updStatus=(id,status)=>{const u=imprests.map(i=>i.id===id?{...i,status}:i);saveOne(u,id);toast.info(`Status → ${status}`);};
  const del=id=>confirm("Delete this imprest record?",()=>{setImprests(prev=>prev.filter(i=>i.id!==id));dbDelete("imprests",id);toast.success("Imprest record deleted");});

  const doMonthClose=()=>{
    const active=monthRecs.filter(i=>i.status==="Active");if(!active.length)return;
    confirm(`Close all ${active.length} active account(s) for ${mkLabel(selMK)}? You can open next month to carry forward balances.`,()=>{
      const closed=active.map(i=>({...i,status:"Closed",closedPeriod:mkLabel(selMK)}));
      setImprests(prev=>prev.map(i=>{const c=closed.find(cc=>cc.id===i.id);return c||i;}));
      dbSync("imprests",closed);
    });
  };

  const openNextMonth=()=>{
    const latestMK=allMonths[0] as string;
    const[y,m]=latestMK.split("-").map(Number);
    const nd=new Date(y,m,1);
    const nextMK=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,"0")}`;
    const nextLabel=mkLabel(nextMK);
    if(imprests.some(i=>mKey(i)===nextMK)){setSelMK(nextMK);return;}
    const lastRecs=imprests.filter(i=>mKey(i)===latestMK);
    const holders=[...new Set(lastRecs.map(i=>i.holder).filter(Boolean))];
    if(!holders.length){confirm(`Open ${nextLabel} with no carry-forward records?`,()=>setSelMK(nextMK));return;}
    confirm(`Open ${nextLabel}? Closing balances from ${holders.length} fund manager(s) will be carried forward automatically.`,()=>{
      const ts=Date.now();
      const carries=holders.map((holder,idx)=>{
        const bal=getPrevBal(holder,nextMK);
        const ref=lastRecs.filter(i=>i.holder===holder)[0]||{};
        return{id:`imp${ts}_${idx}`,month:nextMK,title:`${holder} \u2014 ${nextLabel}`,holder,fundType:ref.fundType||"Field Operations",branch:ref.branch||"",amount:bal,originalAmount:bal,releaseDate:nd.toISOString().split("T")[0],deadline:"",purpose:`Carried forward from ${mkLabel(latestMK)}. Previous closing balance: \u20a6${bal.toLocaleString()}`,status:"Active",expenses:[],topups:[],carriedFrom:latestMK,carryForwardAmount:bal,isCarryForward:true};
      });
      setImprests(prev=>[...prev,...carries]);dbSync("imprests",carries);setSelMK(nextMK);
    });
  };

  const printReport=()=>{
    const ml=mkLabel(selMK);
    const tIssued=monthRecs.reduce((s,i)=>s+i.amount,0);
    const tSpent=monthRecs.reduce((s,i)=>s+(i.expenses||[]).reduce((ss,e)=>ss+e.amount,0),0);
    const tBal=tIssued-tSpent;
    const accts=monthRecs.map(imp=>{
      const spent=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0);const bal=imp.amount-spent;
      const expHtml=(imp.expenses||[]).length>0?`<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px"><thead><tr style="background:#f3f4f6"><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Date</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Item</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Category</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Vendor</th><th style="padding:3px 8px;text-align:right;border:1px solid #e5e7eb">Amount (&#x20a6;)</th><th style="padding:3px 8px;text-align:left;border:1px solid #e5e7eb">Notes</th></tr></thead><tbody>${(imp.expenses||[]).map(e=>`<tr><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.date||""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.item||""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.category||""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.vendor||""}</td><td style="border:1px solid #e5e7eb;padding:3px 8px;text-align:right">${e.amount.toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:3px 8px">${e.note||""}</td></tr>`).join("")}</tbody></table>`:`<p style="font-size:10px;color:#9ca3af;margin:4px 0">No expenses recorded</p>`;
      const tuHtml=(imp.topups||[]).length>0?`<p style="font-size:10px;color:#2563EB;margin:4px 0">Top-ups: ${(imp.topups||[]).map(t=>`+&#x20a6;${t.amount.toLocaleString()} on ${t.date||""}${t.note?` (${t.note})`:""}`).join("; ")}</p>`:"";
      return`<div style="margin-bottom:20px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden"><div style="background:#1B6B2F;color:white;padding:8px 12px;display:flex;justify-content:space-between"><span style="font-weight:bold">${imp.title}${imp.isCarryForward?" (Carry-forward)":""}</span><span>Status: ${imp.status}</span></div><div style="background:#f9fafb;padding:6px 12px;display:flex;gap:32px;font-size:11px"><span>Holder: <strong>${imp.holder||"N/A"}</strong></span><span>Issued: <strong style="color:#1B6B2F">&#x20a6;${imp.amount.toLocaleString()}</strong></span><span>Spent: <strong style="color:#E85D04">&#x20a6;${spent.toLocaleString()}</strong></span><span>Balance: <strong style="color:${bal<0?"#DC2626":"#2563EB"}">&#x20a6;${bal.toLocaleString()}</strong></span></div><div style="padding:8px 12px">${tuHtml}${expHtml}</div></div>`;
    });
    const html=`<!DOCTYPE html><html><head><title>Imprest Fund Report &mdash; ${ml}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}h1{color:#1B6B2F;margin-bottom:2px}h2{color:#374151;font-size:13px;margin:0 0 16px}@media print{button{display:none}}</style></head><body><h1>Dust &amp; Wipes Limited &mdash; Imprest Fund Report</h1><h2>Period: ${ml} &nbsp;&nbsp; Generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</h2><div style="display:flex;gap:40px;margin-bottom:20px;padding:12px 16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb"><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">TOTAL ISSUED</p><p style="font-size:22px;font-weight:bold;color:#1B6B2F;margin:2px 0">&#x20a6;${tIssued.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">TOTAL SPENT</p><p style="font-size:22px;font-weight:bold;color:#E85D04;margin:2px 0">&#x20a6;${tSpent.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">NET BALANCE</p><p style="font-size:22px;font-weight:bold;color:${tBal<0?"#DC2626":"#2563EB"};margin:2px 0">&#x20a6;${tBal.toLocaleString()}</p></div><div style="text-align:center"><p style="font-size:9px;color:#6b7280;font-weight:bold;margin:0">ACCOUNTS</p><p style="font-size:22px;font-weight:bold;color:#374151;margin:2px 0">${monthRecs.length}</p></div></div><h2 style="margin-bottom:10px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Account Breakdown</h2>${accts.join("")}</body></html>`;
    const w=window.open("","_blank","width=920,height=1000");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
  };

  const totalIssued=monthRecs.reduce((s,i)=>s+i.amount,0);
  const totalSpent=monthRecs.reduce((s,i)=>s+(i.expenses||[]).reduce((ss,e)=>ss+e.amount,0),0);
  const byManager:Record<string,any>={};
  monthRecs.forEach(imp=>{const k=imp.holder||"Unknown";if(!byManager[k])byManager[k]={name:k,issued:0,spent:0,accounts:0};byManager[k].issued+=imp.amount||0;byManager[k].spent+=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0);byManager[k].accounts++;});
  const SC={"Active":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Pending Reconciliation":{bg:"#fffbeb",color:AMBER,border:"#fde68a"},"Closed":{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"},"Flagged":{bg:"#fee2e2",color:RED,border:"#fca5a5"}};
  const selLabel=mkLabel(selMK);const isCurMonth=selMK===curMK;

  return(<div className="space-y-5">{confirmEl}

    {/* Month Navigator */}
    <div className="flex items-center gap-2 flex-wrap">
      {allMonths.map(mk=>{
        const[y2,m2]=mk.split("-").map(Number);const lbl=`${MONTHS[m2-1].slice(0,3)} ${y2}`;const active=mk===selMK;
        return(<button key={mk} onClick={()=>setSelMK(mk)} className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${active?"text-white":"text-gray-500 hover:text-gray-700"}`} style={active?{background:G}:{background:"#f3f4f6"}}>{lbl}{mk===curMK?" \u25cf":""}</button>);
      })}
      <button onClick={openNextMonth} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white" style={{background:BLUE}}><Plus size={13}/>Open Next Month</button>
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI icon="\u20a6" label="Total Issued" value={fmt(totalIssued)} sub={selLabel} bg={GL}/>
      <KPI icon="" label="Total Spent" value={fmt(totalSpent)} sub="Expenses logged" bg={OL}/>
      <KPI icon="" label="Net Balance" value={fmt(totalIssued-totalSpent)} sub={(totalIssued-totalSpent)<0?"Overspent":"Remaining"} bg={(totalIssued-totalSpent)<0?"#fee2e2":"#f0f9ff"}/>
      <KPI icon="" label="Accounts" value={monthRecs.length} sub={`${monthRecs.filter(i=>i.status==="Active").length} active`} bg="#f9fafb"/>
    </div>

    {/* Per-Manager Summary */}
    {Object.values(byManager).length>0&&<Card className="p-5">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Fund Manager Summary \u2014 {selLabel}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.values(byManager).map(m=>{const bal=m.issued-m.spent;const prevBal=getPrevBal(m.name,selMK);return(
          <div key={m.name} className="p-3.5 rounded-xl" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
            <p className="text-sm font-bold text-gray-800 mb-1">{m.name}</p>
            {prevBal>0&&<p className="text-xs text-blue-600 mb-2">\u21a9 Carried in from last month: <strong>{fmt(prevBal)}</strong></p>}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs font-bold text-gray-400">Issued</p><p className="text-sm font-black" style={{color:G}}>{fmt(m.issued)}</p></div>
              <div><p className="text-xs font-bold text-gray-400">Spent</p><p className="text-sm font-black" style={{color:O}}>{fmt(m.spent)}</p></div>
              <div><p className="text-xs font-bold text-gray-400">Balance</p><p className="text-sm font-black" style={{color:bal<0?RED:BLUE}}>{fmt(bal)}</p></div>
            </div>
          </div>
        );})}
      </div>
    </Card>}

    {/* Action */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button onClick={printReport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border" style={{color:BLUE,borderColor:"#bfdbfe",background:"#eff6ff"}}><FileText size={14}/>Print Report</button>
        {monthRecs.some(i=>i.status==="Active")&&<button onClick={doMonthClose} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{background:AMBER}}><ClipboardCheck size={14}/>Month-End Close</button>}
      </div>
      <button onClick={()=>setModal({type:"new",month:selMK})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Imprest</button>
    </div>

    {/* Records list */}
    <Card><div className="divide-y divide-gray-50">
      {monthRecs.length===0&&<div className="text-center py-12 text-gray-400 text-sm">
        No imprest records for {selLabel}
        {isCurMonth&&<p className="text-xs mt-1">Use \u201c+ New Imprest\u201d to add one, or \u201cOpen Next Month\u201d to carry balances forward from the previous month.</p>}
      </div>}
      {monthRecs.map(imp=>{
        const spent=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0);
        const topupsTotal=(imp.topups||[]).reduce((s,t)=>s+t.amount,0);
        const bal=imp.amount-spent;
        const overdue=imp.deadline&&new Date(imp.deadline)<TODAY&&imp.status==="Active";
        const sts=overdue?"Flagged":imp.status;
        return(<div key={imp.id} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{background:bal<0?RED:G}}>\u20a6</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-semibold text-gray-800 text-sm">{imp.title}</p>
                  {imp.isCarryForward&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"#eff6ff",color:BLUE}}>\u21a9 Carry-fwd</span>}
                  <SBadge s={sts} custom={SC[sts]}/>
                </div>
                <p className="text-xs text-gray-500">Holder: {imp.holder} \u00b7 {imp.fundType||"Field Operations"} \u00b7 {fmtD(imp.releaseDate)}</p>
                {imp.purpose&&<p className="text-xs text-gray-400 truncate max-w-sm mt-0.5">{imp.purpose}</p>}
                {overdue&&<p className="text-xs text-red-600 font-semibold mt-0.5">\u26a0 Reconciliation overdue</p>}
                <div className="flex gap-4 mt-1.5 text-xs flex-wrap">
                  {imp.isCarryForward&&<span>Carry-in: <strong style={{color:BLUE}}>{fmt(imp.carryForwardAmount||0)}</strong></span>}
                  <span>Issued: <strong>{fmt(imp.originalAmount||imp.amount)}</strong></span>
                  {topupsTotal>0&&<span>Top-ups: <strong style={{color:BLUE}}>+{fmt(topupsTotal)}</strong></span>}
                  <span>Spent: <strong style={{color:O}}>{fmt(spent)}</strong></span>
                  <span>Balance: <strong style={{color:bal<0?RED:G}}>{fmt(bal)}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <button onClick={()=>setView(imp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100" title="View Details"><Eye size={13}/></button>
              <button onClick={()=>setModal({type:"expense",impId:imp.id,imp})} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 border border-green-100" title="Log Expense"><Plus size={13}/></button>
              <button onClick={()=>setModal({type:"topup",impId:imp.id,imp})} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-100" title="Top Up Fund">\u2191</button>
              <button onClick={()=>del(imp.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
            </div>
          </div>
        </div>);
      })}
    </div></Card>

    {/* NEW IMPREST MODAL */}
    {modal?.type==="new"&&<ModalWrap title="Create Imprest Account" onClose={()=>setModal(null)} wide>
      <div className="grid grid-cols-2 gap-4">
        <Fld label="Fund Holder (Supervisor)">
          <StaffSelect staff={staff} value={modal.holder||""} filter={s=>s.category==="Office Staff"} placeholder="-- Select supervisor --" onChange={v=>{
            const prev=getPrevBal(v,modal.month||curMK);
            setModal(p=>({...p,holder:v,_prevBal:prev,amount:p._manual!=null?p._manual:(prev||p.amount||0),title:`${v} \u2014 ${mkLabel(modal.month||curMK)}`}));
          }}/>
        </Fld>
        <Fld label="Fund Type">
          <select className={inp} value={modal.fundType||"Field Operations"} onChange={e=>setModal(p=>({...p,fundType:e.target.value}))}><option>Field Operations</option><option>Office Operations / Supplies</option></select>
        </Fld>
        <Fld label="Title" col><input className={inp} value={modal.title||""} onChange={e=>setModal(p=>({...p,title:e.target.value}))} placeholder={`e.g. Site Operations Fund \u2014 ${selLabel}`}/></Fld>
        {modal._prevBal>0&&<div className="col-span-2 flex items-center justify-between p-3 rounded-xl" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
          <span className="text-blue-700 text-xs">\u21a9 <strong>{modal.holder}</strong> has an unspent balance of <strong>{fmt(modal._prevBal)}</strong> from last month \u2014 pre-filled as starting amount.</span>
          <button onClick={()=>setModal(p=>({...p,amount:p._prevBal,_manual:p._prevBal}))} className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-blue-300 text-blue-700 ml-3 flex-shrink-0">Use Balance</button>
        </div>}
        <Fld label="Amount Released (\u20a6)"><input className={inp} type="number" min="0" value={modal.amount||""} onChange={e=>setModal(p=>({...p,amount:Number(e.target.value),_manual:Number(e.target.value)}))}/></Fld>
        <Fld label="Release Date"><input className={inp} type="date" value={modal.releaseDate||today.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,releaseDate:e.target.value}))}/></Fld>
        <Fld label="Branch / Site"><input className={inp} value={modal.branch||""} onChange={e=>setModal(p=>({...p,branch:e.target.value}))}/></Fld>
        <Fld label="Reconciliation Deadline"><input className={inp} type="date" value={modal.deadline||""} onChange={e=>setModal(p=>({...p,deadline:e.target.value}))}/></Fld>
        <Fld label="Purpose" col><textarea className={inp} rows={2} value={modal.purpose||""} onChange={e=>setModal(p=>({...p,purpose:e.target.value}))}/></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{
          if(!modal.holder||!modal.amount)return;
          const prevBal=modal._prevBal||0;const isCarry=prevBal>0;
          const{_prevBal,_manual,type,...rest}=modal;
          const newRec={...rest,id:"imp"+Date.now(),month:modal.month||curMK,originalAmount:modal.amount||0,status:"Active",expenses:[],topups:[],carryForwardAmount:isCarry?prevBal:0,isCarryForward:isCarry};
          setImprests(prev=>[...prev,newRec]);dbSync("imprests",[newRec]);toast.success("Imprest account created");
          setModal(null);
        }} disabled={!modal.holder||!modal.amount} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Create</button>
      </div>
    </ModalWrap>}

    {/* LOG EXPENSE MODAL */}
    {modal?.type==="expense"&&<ModalWrap title={`Log Expense \u2014 ${modal.imp.title}`} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm flex justify-between" style={{background:GL}}>
          <span className="font-bold text-green-700">Available Balance:</span>
          <span className="font-black" style={{color:(modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0))<0?RED:G}}>{fmt(modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0))}</span>
        </div>
        <p className="text-xs text-blue-600 font-medium">\u2139 Negative balance is permitted \u2014 overspend will be flagged.</p>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Date"><input className={inp} type="date" value={modal.expDate||TODAY.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,expDate:e.target.value}))}/></Fld>
          <Fld label="Amount (\u20a6)"><input className={inp} type="number" min="0" value={modal.expAmount||""} onChange={e=>setModal(p=>({...p,expAmount:Number(e.target.value)}))}/></Fld>
        </div>
        <Fld label="Category"><select className={inp} value={modal.expCat||""} onChange={e=>setModal(p=>({...p,expCat:e.target.value}))}><option value="">-- Select --</option>{IMPREST_CATS.map(c=><option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Item / Service" col><input className={inp} value={modal.expItem||""} onChange={e=>setModal(p=>({...p,expItem:e.target.value}))}/></Fld>
        <Fld label="Vendor"><input className={inp} value={modal.expVendor||""} onChange={e=>setModal(p=>({...p,expVendor:e.target.value}))}/></Fld>
        <Fld label="Notes"><textarea className={inp} rows={2} value={modal.expNote||""} onChange={e=>setModal(p=>({...p,expNote:e.target.value}))}/></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{if(!modal.expAmount||!modal.expItem)return;addExpense(modal.impId,{id:"exp"+Date.now(),date:modal.expDate||TODAY.toISOString().split("T")[0],amount:modal.expAmount||0,category:modal.expCat,item:modal.expItem,vendor:modal.expVendor,note:modal.expNote});setModal(null);}} disabled={!modal.expAmount||!modal.expItem} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Log Expense</button>
      </div>
    </ModalWrap>}

    {/* TOP UP MODAL */}
    {modal?.type==="topup"&&<ModalWrap title={`Top Up \u2014 ${modal.imp.title}`} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm" style={{background:GL}}><p className="text-xs font-bold text-green-700 mb-1">Current Fund Total</p><p className="text-lg font-black" style={{color:G}}>{fmt(modal.imp.amount)}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Top-Up Date"><input className={inp} type="date" value={modal.topupDate||TODAY.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,topupDate:e.target.value}))}/></Fld>
          <Fld label="Amount to Add (\u20a6)"><input className={inp} type="number" min="1" value={modal.topupAmount||""} onChange={e=>setModal(p=>({...p,topupAmount:Number(e.target.value)}))}/></Fld>
        </div>
        <Fld label="Reason / Note" col><input className={inp} value={modal.topupNote||""} onChange={e=>setModal(p=>({...p,topupNote:e.target.value}))} placeholder="e.g. Additional site expenses authorised by admin"/></Fld>
        {modal.topupAmount>0&&<div className="p-3 rounded-xl text-sm" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><span className="text-blue-700 font-semibold">New total after top-up: </span><span className="font-black text-blue-800">{fmt((modal.imp.amount||0)+(modal.topupAmount||0))}</span></div>}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{if(!modal.topupAmount||modal.topupAmount<=0)return;addTopUp(modal.impId,{id:"tu"+Date.now(),date:modal.topupDate,amount:modal.topupAmount,note:modal.topupNote});setModal(null);}} disabled={!modal.topupAmount||modal.topupAmount<=0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:BLUE}}>Add Top-Up</button>
      </div>
    </ModalWrap>}

    {/* DETAIL VIEW */}
    {view&&<ModalWrap title={`Imprest \u2014 ${view.title}`} onClose={()=>setView(null)} xl>
      <div className="flex justify-between items-center mb-4 pb-4 border-b flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800">{view.title}</p>
            {view.isCarryForward&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"#eff6ff",color:BLUE}}>\u21a9 Carry-forward</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Holder: {view.holder} \u00b7 {view.fundType||"Field Operations"} \u00b7 Released: {fmtD(view.releaseDate)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{updStatus(view.id,"Pending Reconciliation");setView(v=>({...v,status:"Pending Reconciliation"}));}} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-amber-300 text-amber-700">Reconcile</button>
          <button onClick={()=>{updStatus(view.id,"Closed");setView(v=>({...v,status:"Closed"}));}} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-300 text-gray-600">Close</button>
        </div>
      </div>
      {(()=>{const spent=(view.expenses||[]).reduce((s,e)=>s+e.amount,0);const bal=view.amount-spent;return(<>
        {view.isCarryForward&&<div className="p-3 rounded-xl text-sm mb-4" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
          <span className="text-blue-700 text-xs">\u21a9 Balance carried forward from <strong>{view.carriedFrom?mkLabel(view.carriedFrom):""}</strong>: <strong>{fmt(view.carryForwardAmount||0)}</strong></span>
        </div>}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[["Issued",view.amount,GL,G],["Spent",spent,OL,O],["Balance",bal,bal<0?"#fee2e2":"#f0f9ff",bal<0?RED:BLUE]].map(([l,v,bg,c])=>
            <div key={l} className="p-4 rounded-xl text-center" style={{background:bg}}><p className="text-lg font-black" style={{color:c}}>{fmt(v)}</p><p className="text-xs font-bold text-gray-500 mt-1">{l}</p></div>
          )}
        </div>
      </>);})()}
      {(view.topups||[]).length>0&&<div className="mb-4"><p className="text-xs font-bold text-blue-600 mb-2">TOP-UPS</p><div className="space-y-1">{(view.topups||[]).map(t=><div key={t.id} className="flex justify-between p-2.5 rounded-lg text-xs" style={{background:"#eff6ff"}}><span>{fmtD(t.date)} \u2014 {t.note||"Top-up"}</span><span className="font-bold text-blue-700">+{fmt(t.amount)}</span></div>)}</div></div>}
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Expenses</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Date","Item","Category","Vendor","Amount","Notes"].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-50">{(view.expenses||[]).length===0?<tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No expenses logged</td></tr>:(view.expenses||[]).map(e=><tr key={e.id} className="hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtD(e.date)}</td><td className="px-3 py-2 font-medium text-gray-800">{e.item}</td><td className="px-3 py-2 text-xs text-gray-500">{e.category}</td><td className="px-3 py-2 text-xs text-gray-500">{e.vendor||"--"}</td><td className="px-3 py-2 font-bold text-gray-800">{fmt(e.amount)}</td><td className="px-3 py-2 text-xs text-gray-400">{e.note||"--"}</td></tr>)}
        </tbody>
      </table></div>
    </ModalWrap>}
  </div>);}







