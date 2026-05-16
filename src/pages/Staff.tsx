// @ts-nocheck — legacy page extracted from .js to .tsx prior to strict-mode enablement.
// Hundreds of arrow-fn params and dynamic record indexing make per-line typing infeasible;
// pages are scheduled for incremental typing in a follow-up. Strict checks remain enforced for
// App.tsx, schemas.ts, and lib/.
// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Staff page
//  Phase 4b extraction. Field employee directory with full CRUD + sensitive
//  fields (bank, emergency contact, home address) for Admins only.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Search, Download } from "lucide-react";
import { G, GL, O, inp } from "../lib/constants";
import { fmt, fmtD } from "../lib/format";
import { dbSync, dbDelete } from "../lib/supabase";
import { Card, Fld, KPI } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import { useConfirm } from "../components/ui/useConfirm";



export
function StaffPage({staff,setStaff}:any){
  const[tab,setTab]=useState("cleaning");const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();const toast=useToast();const[payrollMonth,setPayrollMonth]=useState(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;})
  const[search,setSearch]=useState("");
  const CATEGORIES=["Office Staff","Cleaning Staff","Gardening Staff"];
  const TAB_MAP={"office":"Office Staff","cleaning":"Cleaning Staff","gardening":"Gardening Staff"};
  // Fallback: infer category from role when the record has no category set
  const inferCat=s=>s.category||(s.role==="Gardener"||s.role==="Gardening"?"Gardening Staff":s.role==="Supervisor"||s.role==="Technical Supervisor"||s.role==="Finance"||s.category==="Office Staff"?"Office Staff":"Cleaning Staff");
  const filtered=staff.filter(s=>inferCat(s)===TAB_MAP[tab]&&[s.name,s.site,s.phone,s.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  const del=id=>confirm("Remove this staff member?",()=>{setStaff(ss=>ss.filter(s=>s.id!==id));dbDelete("staff",id);toast.success("Staff member removed");});
  const save=data=>{
    let ns;if(data.id)ns=staff.map(s=>s.id===data.id?{...s,...data}:s);else ns=[...staff,{...data,id:"st"+Date.now()}];
    setStaff(ns);dbSync("staff",ns);toast.success(data.id?"Staff record updated":"Staff member added");setModal(null);
  };
  const blank={name:"",category:TAB_MAP[tab],role:"",site:"",phone:"",email:"",homeAddress:"",emergencyContact:"",emergencyPhone:"",emergencyAddress:"",dob:"",employmentType:"Full Time",startDate:"",workDays:"",bankName:"",accountName:"",accountNumber:"",salary:0};

  const counts=Object.fromEntries(CATEGORIES.map(c=>[c,staff.filter(s=>s.category===c).length]));

  return(<div className="space-y-5">{confirmEl}
    <div className="grid grid-cols-3 gap-4">
      <KPI icon="" label="Office Staff" value={counts["Office Staff"]||0} sub="Admin & Supervisors" bg="#eff6ff"/>
      <KPI icon="" label="Cleaning Staff" value={counts["Cleaning Staff"]||0} sub="Field cleaners" bg={GL}/>
      <KPI icon="" label="Gardening Staff" value={counts["Gardening Staff"]||0} sub="Gardeners" bg="#f0fdf4"/>
    </div>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex flex-wrap gap-1 border border-gray-200 rounded-xl p-1 bg-white">
        {[{id:"office",l:"Office Staff"},{id:"cleaning",l:"Cleaning Staff"},{id:"gardening",l:"Gardening Staff"},{id:"payroll",l:"💳 Payroll"}].map(t=>
          <button key={t.id} onClick={()=>{setTab(t.id);setSearch("");}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id?"text-white":"text-gray-500"}`} style={tab===t.id?{background:t.id==="payroll"?O:G}:{}}>{t.l}{t.id!=="payroll"?` (${counts[TAB_MAP[t.id]]||0})`:""}</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input className={inp+" pl-9 w-48"} placeholder="Search staff..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button onClick={()=>setModal({...blank,category:TAB_MAP[tab]})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Staff</button>
      </div>
    </div>
    {tab==="payroll"&&(()=>{
      const allStaff=staff.filter(s=>s.salary>0||s.bankName);
      const total=allStaff.reduce((s,m)=>s+(m.salary||0),0);
      const exportCSV=()=>{
        const rows=[["Staff Name","Bank Name","Account Number","Account Name","Amount (NGN)","Description"],...allStaff.map(s=>[s.name,s.bankName||"",s.accountNumber||"",s.accountName||"",(s.salary||0),`Salary - ${payrollMonth}`])];
        const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
        const b=new Blob([csv],{type:"text/csv"});
        const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`payroll-${payrollMonth}.csv`;a.click();URL.revokeObjectURL(u);
        toast.success("Payroll CSV downloaded");
      };
      return(<div className="space-y-5">
        <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Monthly Payroll</p><p className="text-3xl font-black" style={{color:G}}>₦{fmt(total)}</p><p className="text-xs text-gray-400 mt-1">{allStaff.length} staff members with salary records</p></div>
          <div className="flex items-center gap-3">
            <Fld label="Pay Month"><input className={inp} type="month" value={payrollMonth} onChange={e=>setPayrollMonth(e.target.value)}/></Fld>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:O}}><Download size={14}/>Export CSV</button>
          </div>
        </div></Card>
        <Card>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Name","Bank","Acc Number","Account Name","Salary (₦)"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {staff.filter(s=>s.category!=="").sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(s=>(
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{s.name}<p className="text-xs text-gray-400 font-normal">{s.role}{s.site?` · ${s.site}`:""}</p></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.bankName||<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{s.accountNumber||<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.accountName||<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{s.salary>0?`₦${fmt(s.salary)}`:<span className="text-gray-300 font-normal">Not set</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{background:GL}} className="border-t-2"><td className="px-4 py-3 font-bold text-gray-700 text-sm" colSpan={4}>Total Payroll</td><td className="px-4 py-3 font-black text-lg" style={{color:G}}>₦{fmt(total)}</td></tr></tfoot>
          </table></div>
        </Card>
        {staff.filter(s=>!s.salary&&!s.bankName).length>0&&<div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700"><strong>{staff.filter(s=>!s.salary&&!s.bankName).length} staff</strong> have no salary or bank details. Edit their records to add payroll information.</div>}
      </div>);
    })()}
    {tab!=="payroll"&&<Card><div className="divide-y divide-gray-50">
      {filtered.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No {TAB_MAP[tab].toLowerCase()} found</div>}
      {filtered.map(s=><div key={s.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:tab==="cleaning"?G:tab==="gardening"?"#16a34a":O}}>{(s.name||"?")[0]}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
              {s.employmentType&&<span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={s.employmentType==="Full Time"?{background:"#dcfce7",color:"#166534",borderColor:"#bbf7d0"}:{background:"#fff7ed",color:"#9a3412",borderColor:"#fed7aa"}}>{s.employmentType}</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{s.role}{s.site?` · ${s.site}`:""}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {s.phone&&<p className="text-xs text-gray-400"> {s.phone}{s.email?` · ${s.email}`:""}</p>}
              {s.workDays&&<p className="text-xs text-gray-400"> {s.workDays}</p>}
              {s.startDate&&<p className="text-xs text-gray-400"> Started {fmtD(s.startDate)}</p>}
            </div>
            {s.homeAddress&&<p className="text-xs text-gray-400 truncate max-w-sm mt-0.5"> {s.homeAddress}</p>}
            {s.emergencyContact&&<p className="text-xs text-gray-400"> EC: {s.emergencyContact}{s.emergencyPhone?` · ${s.emergencyPhone}`:""}</p>}
            {s.bankName&&<p className="text-xs text-gray-400"> {s.bankName}{s.accountNumber?` · ${s.accountNumber}`:""}{s.accountName?` (${s.accountName})`:""}</p>}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={()=>setModal({...s,_editing:true})} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button>
          <button onClick={()=>del(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
        </div>
      </div>)}
    </div></Card>}
    {modal&&<ModalWrap title={modal._editing?"Edit Staff Member":"Add Staff Member"} onClose={()=>setModal(null)} xl>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Full Name" required><input className={inp} value={modal.name||""} onChange={e=>setModal(p=>({...p,name:e.target.value}))}/></Fld>
            <Fld label="Date of Birth"><input className={inp} type="date" value={modal.dob||""} onChange={e=>setModal(p=>({...p,dob:e.target.value}))}/></Fld>
            <Fld label="Phone Number"><input className={inp} type="tel" value={modal.phone||""} onChange={e=>setModal(p=>({...p,phone:e.target.value}))}/></Fld>
            <Fld label="Email Address"><input className={inp} type="email" value={modal.email||""} onChange={e=>setModal(p=>({...p,email:e.target.value}))}/></Fld>
            <Fld label="Home Address" col><input className={inp} value={modal.homeAddress||""} onChange={e=>setModal(p=>({...p,homeAddress:e.target.value}))}/></Fld>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employment Details</p>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Category"><select className={inp} value={modal.category||"Cleaning Staff"} onChange={e=>setModal(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Fld>
            <Fld label="Role / Position"><input className={inp} value={modal.role||""} onChange={e=>setModal(p=>({...p,role:e.target.value}))} placeholder="e.g. Cleaner, Supervisor, Gardener..."/></Fld>
            <Fld label="Employment Type"><select className={inp} value={modal.employmentType||"Full Time"} onChange={e=>setModal(p=>({...p,employmentType:e.target.value}))}>{["Full Time","Part Time","Contract"].map(t=><option key={t}>{t}</option>)}</select></Fld>
            <Fld label="Site / Location Assigned"><input className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))} placeholder="e.g. IFRC, Mabushi, Multiple..."/></Fld>
            <Fld label="Start Date"><input className={inp} type="date" value={modal.startDate||""} onChange={e=>setModal(p=>({...p,startDate:e.target.value}))}/></Fld>
            <Fld label="Usual Days of Work"><input className={inp} value={modal.workDays||""} onChange={e=>setModal(p=>({...p,workDays:e.target.value}))} placeholder="e.g. Mon–Fri, Mon–Sat"/></Fld>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Contact Name"><input className={inp} value={modal.emergencyContact||""} onChange={e=>setModal(p=>({...p,emergencyContact:e.target.value}))}/></Fld>
            <Fld label="Contact Phone"><input className={inp} type="tel" value={modal.emergencyPhone||""} onChange={e=>setModal(p=>({...p,emergencyPhone:e.target.value}))}/></Fld>
            <Fld label="Contact Address" col><input className={inp} value={modal.emergencyAddress||""} onChange={e=>setModal(p=>({...p,emergencyAddress:e.target.value}))}/></Fld>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bank Account & Payroll</p>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Bank Name"><input className={inp} value={modal.bankName||""} onChange={e=>setModal(p=>({...p,bankName:e.target.value}))}/></Fld>
            <Fld label="Account Number"><input className={inp} value={modal.accountNumber||""} onChange={e=>setModal(p=>({...p,accountNumber:e.target.value}))}/></Fld>
            <Fld label="Account Owner Name"><input className={inp} value={modal.accountName||""} onChange={e=>setModal(p=>({...p,accountName:e.target.value}))}/></Fld>
            <Fld label="Monthly Salary (₦)"><input className={inp} type="number" min="0" value={modal.salary||""} onChange={e=>setModal(p=>({...p,salary:Number(e.target.value)}))}/></Fld>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>save(modal)} disabled={!modal.name} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>{modal._editing?"Save Changes":"Add Staff Member"}</button>
      </div>
    </ModalWrap>}
  </div>);}

// -- SETTINGS ------------------------------------------------------------------
