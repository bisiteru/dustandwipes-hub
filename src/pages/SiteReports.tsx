// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Site Reports page
//  Phase 4d extraction. The most complex form in the app — a multi-section
//  site inspection report wizard with photo upload, GPS capture, ratings,
//  and client feedback. Plus an HTML viewer for past reports.
//
//  Includes SiteReportsPage + SiteReportModal + SiteReportViewer + local
//  CheckGroup helper + the EQUIPMENT/SUPPLY/CLEANING/PEST task option
//  lists used by the form.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, Dispatch, SetStateAction, ChangeEvent } from "react";
import { Plus, Trash2, Eye, ClipboardList, X } from "lucide-react";
import { G, GL, O, AMBER, RED, BLUE, inp } from "../lib/constants";
import { fmtD } from "../lib/format";
import { dbSync, dbDelete, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { monthOf, mkLabel, curMonthKey, openPrintWin, buildReportHtml, MonthTabs, PrintReportButtons } from "../lib/monthly";
import { Card, Fld, SBadge, StarRating, RadioG } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { ContactSearchSelect, StaffMultiPicker } from "../components/pickers";
import { useConfirm } from "../components/ui/useConfirm";
import type { SiteReport, Client, Staff, Contact, CurrentUser } from "../lib/schemas";

// ── Local types ──────────────────────────────────────────────────────────────
// Photos are stored as base64 data URLs + filename. Stored as `z.array(z.any())`
// in the schema so we narrow them here for the form/viewer code paths.
interface Photo {
  data: string;
  name: string;
}

// Section-by-section form draft. Mirrors the runtime SiteReport shape but
// keeps the in-progress (pre-submit) view: no id/submittedAt yet, ratings
// start at 0, photos always an array.
interface SiteReportForm {
  supervisorName: string;
  supervisorEmail: string;
  clientName: string;
  address: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  gpsLat: string;            // Stored as STRING (toFixed(6)), not number — careful with math
  gpsLng: string;
  gpsAcquired: boolean;
  jobType: string;
  contractType: string;
  serviceCategory: string[];
  cleaningTasks: string[];
  pestTasks: string[];
  otherTasks: string;
  // Union: textarea path stores string; StaffMultiPicker stores string[]
  crewMembers: string | string[];
  equipment: string[];
  supplies: string[];
  pesticidesUsed: string;
  activeIngredients: string;
  cleanlinessRating: number;
  adherenceRating: number;
  qualityNotes: string;
  ppeWorn: string;
  safeHandling: string;
  incidents: string;
  incidentDetails: string;
  clientPresent: string;
  clientContactName: string;
  clientFeedback: string;
  satisfactionLevel: string;
  additionalRequirements: string;
  additionalReqDetails: string;
  photos: Photo[];
  operationalNotes: string;
  overallAssessment: string;
  signatureName: string;
  signatureTimestamp: string;
  staffChallenges: string;
  recurringIssues: string;
  followUpActions: string;
  supervisorFeedback: string;
  equipmentCondition: string;
}

// Keys whose values are string[] — used to type the toggle helper.
type StringArrayKey = {
  [K in keyof SiteReportForm]: SiteReportForm[K] extends string[] ? K : never;
}[keyof SiteReportForm];

// Keys whose values are strings — used to type the change-event helper.
type StringKey = {
  [K in keyof SiteReportForm]: SiteReportForm[K] extends string ? K : never;
}[keyof SiteReportForm];

interface SiteReportsPageProps {
  reports: SiteReport[];
  setReports: Dispatch<SetStateAction<SiteReport[]>>;
  user: CurrentUser;
  clients: Client[];
  contacts?: Contact[];
  staff?: Staff[];
}

interface SiteReportModalProps {
  onSave: (data: SiteReport) => void;
  onClose: () => void;
  user: CurrentUser;
  clients: Client[];
  contacts?: Contact[];
  staff?: Staff[];
}

interface SiteReportViewerProps {
  report: SiteReport;
  onClose: () => void;
}

// ── Form option lists ────────────────────────────────────────────────────────
const EQUIPMENT_OPTS=["Vacuum Cleaner","Industrial Vacuum","Steam Cleaner","Scrubbing Machine","Pressure Washer","Carpet Extractor","Dryer/Blower","Power Extension Box","Spray Pump (Manual)","Spray Pump (Motorised)","Mop & Bucket Set","Ladder","Squeegee","Scrubbing Brushes","Telescopic Pole","Glass Scrubber","Hand Drill Machine","PPE Kit"];
const SUPPLY_OPTS=["Liquid Soap","CH Bleach","Hypo Toilet Cleaner","Disinfectant Concentrate","Glass Cleaner","Morning Fresh","Fabuloso","Mr Sheen","Varnish/Fabric Softener","Air Freshener","Camphor","Scouring Powder","Microfiber Cloths","Trash Bags/Liners"];
const CLEANING_TASK_OPTS=["General Cleaning","Deep Cleaning","Residential Cleaning","Office Cleaning","Carpet/Rug Cleaning","Upholstery Cleaning","Kitchen Cleaning","Bathroom & Toilet Cleaning","Window Cleaning","Floor Scrubbing & Polishing","Post-Construction Cleaning","Ceiling & Wall Cleaning"];
const PEST_TASK_OPTS=["General Fumigation","Termite Treatment","Rodent Control","Cockroach Treatment","Bed Bug Treatment","Mosquito Control","Ant & Crawling Insect Control","Flying Insect Control","Pre-Construction Treatment"];
const SR_SECTIONS=["General Info","Job Details","Quality Control","Safety","Client Feedback","Photos & Notes","Confirmation"];

// ── Local checkbox-group helper ─────────────────────────────────────────────
interface CheckGroupProps {
  options: string[];
  value?: string[];
  onChange: (next: string[]) => void;
}
function CheckGroup({options,value=[],onChange}:CheckGroupProps){
  const tog=(o:string)=>onChange(value.includes(o)?value.filter(v=>v!==o):[...value,o]);
  return <div className="grid grid-cols-2 gap-2 mt-1">{options.map(o=><label key={o} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${value.includes(o)?"border-green-500 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600 hover:border-gray-300"}`}><input type="checkbox" checked={value.includes(o)} onChange={()=>tog(o)} className="accent-green-600 flex-shrink-0"/>{o}</label>)}</div>;
}


interface ReportStats {
  total: number;
  completed: number;
  flagged: number;
  sites: number;
  byInspector: Record<string, number>;
}

export
function SiteReportsPage({reports,setReports,user,clients,contacts=[],staff=[]}:SiteReportsPageProps){
  const[showForm,setShowForm]=useState(false);
  const[view,setView]=useState<SiteReport|null>(null);
  const[confirm,confirmEl]=useConfirm();
  const[selMK,setSelMK]=useState<string>(curMonthKey());
  const getMK=(r:SiteReport):string|null|undefined=>r.submittedAt;
  // Auto-switch to most recent month with data if current month is empty
  useEffect(()=>{if(reports.length>0&&!reports.some(r=>monthOf(r,getMK)===selMK)){const keys=[...new Set(reports.map(r=>monthOf(r,getMK)).filter(Boolean))].sort().reverse();if(keys[0])setSelMK(keys[0] as string);}},[reports]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthReports=reports.filter(r=>monthOf(r,getMK)===selMK);
  const del=(id:SiteReport["id"])=>confirm("Delete this report?",()=>{setReports(rs=>rs.filter(r=>r.id!==id));dbDelete("reports",id);});

  // ── Stats helper for any report subset ────────────────────────────────────
  const statsOf=(list:SiteReport[]):ReportStats=>{
    const completed=list.filter(r=>r.overallAssessment==="Job Completed Successfully").length;
    const flagged=list.length-completed;
    const sites=new Set(list.map(r=>r.clientName).filter(Boolean)).size;
    const byInspector:Record<string,number>={};list.forEach(r=>{const k=r.supervisorName||"Unknown";byInspector[k]=(byInspector[k]||0)+1;});
    return{total:list.length,completed,flagged,sites,byInspector};
  };
  const reportRow=(r:SiteReport):string=>`<tr><td>${fmtD(r.submittedAt||r.arrivalDate)}</td><td>${r.clientName||"--"}</td><td>${r.supervisorName||"--"}</td><td>${r.jobType||"--"}</td><td>${(r.serviceCategory||[]).join(", ")||"--"}</td><td style="text-align:center">${r.cleanlinessRating||"-"}/5</td><td style="text-align:center">${r.adherenceRating||"-"}/5</td><td>${r.overallAssessment==="Job Completed Successfully"?"Completed":"Issues Noted"}</td></tr>`;
  const reportTable=(list:SiteReport[]):string=>`<table><thead><tr><th>Submitted</th><th>Client / Site</th><th>Inspector</th><th>Job Type</th><th>Services</th><th>Cleanliness</th><th>Adherence</th><th>Outcome</th></tr></thead><tbody>${list.map(reportRow).join("")}</tbody></table>`;
  const kpisOf=(s:ReportStats)=>[{label:"Total Visits",value:s.total},{label:"Unique Sites",value:s.sites,color:BLUE},{label:"Completed",value:s.completed,color:"#16a34a"},{label:"Findings Flagged",value:s.flagged,color:s.flagged>0?RED:"#6b7280"}];

  const printMonth=()=>{
    if(monthReports.length===0){alert(`No reports for ${mkLabel(selMK)}`);return;}
    const s=statsOf(monthReports);
    const inspectors=Object.entries(s.byInspector).sort((a,b)=>b[1]-a[1]).map(([n,c])=>`${n} (${c})`).join(", ")||"--";
    openPrintWin(buildReportHtml({moduleName:"Site Reports",periodLabel:mkLabel(selMK),summaryKpis:kpisOf(s),sections:[{label:"Reports for "+mkLabel(selMK),table:reportTable(monthReports),note:"By Inspector: "+inspectors}]}));
  };
  const printAll=()=>{
    if(reports.length===0){alert("No reports yet");return;}
    const s=statsOf(reports);
    const byMonth:Record<string,SiteReport[]>={};
    reports.forEach(r=>{const mk=monthOf(r,getMK);if(!mk)return;(byMonth[mk]=byMonth[mk]||[]).push(r);});
    const months=Object.keys(byMonth).sort().reverse();
    openPrintWin(buildReportHtml({moduleName:"Site Reports",periodLabel:"All History",summaryKpis:kpisOf(s),sections:months.map(mk=>{const sub=statsOf(byMonth[mk]);return{label:mkLabel(mk)+` — ${sub.total} report${sub.total!==1?"s":""}`,kpis:kpisOf(sub),table:reportTable(byMonth[mk])};})}));
  };

  return(<div className="space-y-5">{confirmEl}
    {/* Month tabs + Print buttons */}
    <div className="flex items-start justify-between flex-wrap gap-3">
      <MonthTabs records={reports} getMK={getMK} selMK={selMK} setSelMK={setSelMK}/>
      <PrintReportButtons onPrintMonth={printMonth} onPrintAll={printAll}/>
    </div>
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-3 flex-wrap">
        <div className="p-3 rounded-xl text-sm font-bold" style={{background:GL,color:G}}>{monthReports.length} in {mkLabel(selMK)}</div>
        <div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dcfce7",color:"#166534"}}>{monthReports.filter(r=>r.overallAssessment==="Job Completed Successfully").length} Completed</div>
        <div className="p-3 rounded-xl text-sm font-bold" style={{background:"#f3f4f6",color:"#374151"}}>{reports.length} Total (all months)</div>
      </div>
      <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Report</button>
    </div>
    <Card>{monthReports.length===0?
      <div className="text-center py-16 text-gray-400"><ClipboardList size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm font-semibold">No site reports for {mkLabel(selMK)}</p><p className="text-xs mt-1">Switch months above, or create a new report</p></div>:
      <div className="divide-y divide-gray-50">{monthReports.map(r=>{
        const photos=r.photos||[];
        const done=r.overallAssessment==="Job Completed Successfully";
        const sc=done?{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}:{bg:"#fff7ed",color:AMBER,border:"#fde68a"};
        return(<div key={r.id} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.clientName||"?")[0]}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-gray-800 text-sm">{r.clientName||"Unknown"}</p><span className="text-xs text-gray-400"></span><span className="text-xs text-gray-500">{r.jobType||"--"}</span>{r.serviceCategory?.length>0&&<><span className="text-xs text-gray-400"></span><span className="text-xs text-gray-500">{r.serviceCategory.join(", ")}</span></>}</div>
                <p className="text-xs text-gray-400 mt-0.5">{fmtD(r.arrivalDate)}{r.arrivalTime?` ${r.arrivalTime}`:""}  {r.supervisorName}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {r.cleanlinessRating>0&&<span className="text-xs font-medium text-gray-600">Cleanliness: <span style={{color:"#f59e0b"}}>{"".repeat(r.cleanlinessRating)}</span><span className="text-gray-300">{"".repeat(5-r.cleanlinessRating)}</span></span>}
                  {r.adherenceRating>0&&<span className="text-xs font-medium text-gray-600">Adherence: <span style={{color:"#f59e0b"}}>{"".repeat(r.adherenceRating)}</span><span className="text-gray-300">{"".repeat(5-r.adherenceRating)}</span></span>}
                  {photos.length>0&&<span className="text-xs font-medium text-blue-600"> {photos.length} photo{photos.length!==1?"s":""}</span>}
                  {r.gpsLat&&<span className="text-xs font-medium text-green-600"> GPS</span>}
                  {r.satisfactionLevel&&<span className="text-xs font-medium" style={{color:r.satisfactionLevel==="Very Satisfied"?G:r.satisfactionLevel==="Unsatisfied"?RED:AMBER}}> {r.satisfactionLevel}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SBadge s={done?"Completed":"Issues Noted"} custom={sc}/>
              <button onClick={()=>setView(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Eye size={13}/></button>
              <button onClick={()=>del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
            </div>
          </div>
        </div>);
      })}</div>}
    </Card>
    {showForm&&<SiteReportModal onSave={data=>{const newList=[data,...reports];setReports(newList);dbSync("reports",newList);setShowForm(false);}} onClose={()=>setShowForm(false)} user={user} clients={clients} contacts={contacts} staff={staff}/>}
    {view&&<SiteReportViewer report={view} onClose={()=>setView(null)}/>}
  </div>);}

function SiteReportModal({onSave,onClose,user,clients,contacts=[],staff=[]}:SiteReportModalProps){
  const[sec,setSec]=useState(0);
  const[gpsLoading,setGpsLoading]=useState(false);
  const[f,setF]=useState<SiteReportForm>({
    supervisorName:user.name, supervisorEmail:user.email||"",
    clientName:"",address:"",
    arrivalDate:new Date().toISOString().split("T")[0]||"",arrivalTime:"",
    departureDate:new Date().toISOString().split("T")[0]||"",departureTime:"",
    gpsLat:"",gpsLng:"",gpsAcquired:false,
    jobType:"",contractType:"",serviceCategory:[],
    cleaningTasks:[],pestTasks:[],otherTasks:"",
    crewMembers:"",equipment:[],supplies:[],
    pesticidesUsed:"",activeIngredients:"",
    cleanlinessRating:0,adherenceRating:0,qualityNotes:"",
    ppeWorn:"",safeHandling:"",incidents:"None",incidentDetails:"",
    clientPresent:"",clientContactName:"",clientFeedback:"",
    satisfactionLevel:"",additionalRequirements:"None",additionalReqDetails:"",
    photos:[],operationalNotes:"",
    overallAssessment:"",signatureName:"",signatureTimestamp:"",
    staffChallenges:"",recurringIssues:"",followUpActions:"",supervisorFeedback:"",equipmentCondition:"",
  });
  const u=<K extends StringKey>(k:K)=>(e:ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setF(p=>({...p,[k]:e.target.value}));
  const tog=<K extends StringArrayKey>(k:K)=>(v:string)=>setF(p=>{const arr=p[k] as string[];return{...p,[k]:arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]};});

  const acquireGPS=()=>{
    setGpsLoading(true);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (pos:GeolocationPosition)=>{setF(p=>({...p,gpsLat:pos.coords.latitude.toFixed(6),gpsLng:pos.coords.longitude.toFixed(6),gpsAcquired:true}));setGpsLoading(false);},
        ()=>{setF(p=>({...p,gpsLat:"9.076500",gpsLng:"7.398760",gpsAcquired:true}));setGpsLoading(false);}
      );
    } else {setF(p=>({...p,gpsLat:"9.076500",gpsLng:"7.398760",gpsAcquired:true}));setGpsLoading(false);}
  };

  const addPhotos=(e:ChangeEvent<HTMLInputElement>)=>{
    const fileList=e.target.files;
    if(!fileList)return;
    Array.from(fileList).forEach((file:File)=>{
      if(f.photos.length>=10)return;
      const reader=new FileReader();
      reader.onload=(ev:ProgressEvent<FileReader>)=>{
        const result=ev.target?.result;
        if(typeof result!=="string")return;
        setF(p=>({...p,photos:[...p.photos,{data:result,name:file.name}]}));
      };
      reader.onerror=()=>{console.warn("[SiteReport] Failed to read photo:",file.name);};
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };
  const removePhoto=(i:number)=>setF(p=>({...p,photos:p.photos.filter((_,idx)=>idx!==i)}));

  const hasCleaning=f.serviceCategory.includes("Cleaning");
  const hasPest=f.serviceCategory.includes("Pest Control");
  const hasOther=f.serviceCategory.includes("Other");
  const isOneTime=f.jobType==="One-Time Job";
  const isInspection=f.jobType==="Recurring Contract Inspection";

  const INSP_SECTIONS=["General Info","Site Condition","Staff & Operations","Client Feedback","Photos & Notes","Supervisor Assessment"];
  const activeSections=isInspection?INSP_SECTIONS:SR_SECTIONS;
  const totalSecs=activeSections.length;

  const canNext=[
    f.clientName&&f.arrivalDate&&f.arrivalTime&&f.jobType&&f.serviceCategory.length>0,
    (hasCleaning?f.cleaningTasks.length>0:true)&&(hasPest?f.pestTasks.length>0:true)&&(Array.isArray(f.crewMembers)?f.crewMembers.length>0:String(f.crewMembers||"").trim().length>0),
    f.cleanlinessRating>0&&f.adherenceRating>0,
    f.ppeWorn&&f.safeHandling,
    f.clientPresent&&(f.clientPresent==="Yes"?f.satisfactionLevel:true),
    true,
    f.overallAssessment&&f.signatureName,
  ];
  const canNextInspection=[
    f.clientName&&f.arrivalDate&&f.arrivalTime&&f.jobType&&f.serviceCategory.length>0,
    f.cleanlinessRating>0&&f.adherenceRating>0,
    (Array.isArray(f.crewMembers)?f.crewMembers.length>0:String(f.crewMembers||"").trim().length>0),
    !!f.clientPresent,
    true,
    !!(f.overallAssessment&&f.signatureName),
  ];
  const activeCanNext=isInspection?canNextInspection:canNext;

  const submit=async()=>{
    const reportData:SiteReport={...f,id:String(Date.now()),submittedAt:new Date().toISOString(),
      signatureTimestamp:new Date().toLocaleString("en-GB")};
    onSave(reportData);
    // Fire-and-forget: email full report to admin + supervisors via Edge Function
    try{
      fetch(`${SUPABASE_URL}/functions/v1/send-site-report-pdf`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${SUPABASE_ANON_KEY}`},
        body:JSON.stringify({report:reportData})
      }).then(r=>r.ok?console.log("[App] Report emailed "):console.warn("[App] Email error:",r.status)).catch(err=>console.warn("[App] Email request failed:",err));
    }catch(e){console.warn("[App] Site report email (non-blocking):",e);}
  };

  const SECT_ICONS=["","","","","","",""];

  return(<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col">

      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">Site Visit Report</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
        </div>
        {/* Stepper */}
        <div className="flex items-center gap-1">
          {activeSections.map((s,i)=><div key={i} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i<sec?"text-white":i===sec?"text-white border-2":"bg-gray-100 text-gray-400"}`}
                style={i<sec?{background:G}:i===sec?{background:O,borderColor:O}:{}}>
                {i<sec?"✓":SECT_ICONS[i]}
              </div>
              <span className={`text-xs mt-0.5 font-medium hidden sm:block ${i===sec?"text-orange-600":"text-gray-400"}`} style={{fontSize:"9px"}}>{s}</span>
            </div>
            {i<activeSections.length-1&&<div className={`h-0.5 flex-1 mb-3 rounded ${i<sec?"bg-green-400":"bg-gray-200"}`}/>}
          </div>)}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* SECTION 0 -- General Info */}
        {sec===0&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 1 of 7 -- General Information</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Supervisor Name"><input className={inp} value={f.supervisorName} onChange={u("supervisorName")}/></Fld>
            <Fld label="Supervisor Email"><input className={inp} type="email" value={f.supervisorEmail} onChange={u("supervisorEmail")}/></Fld>
            <Fld label="Client / Site" col required>
            <ContactSearchSelect value={f.clientName} onSelect={name=>{const c=clients.find((c:Client)=>c.name===name);const dbContacts:Contact[]=(window as any).__DW_CONTACTS__||contacts||[];const ct=dbContacts.find((c:Contact)=>c.name===name);setF(p=>({...p,clientName:name,address:c?(c.addr||""):ct?(ct.address||""):""}));}} clients={clients} contacts={contacts}/>
          </Fld>
            <Fld label="Site Address" col><input className={inp} value={f.address} onChange={u("address")} placeholder="Auto-filled from client  edit if different"/></Fld>
            {/* GPS */}
            <Fld label="GPS Location" col>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={acquireGPS} disabled={gpsLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold flex-shrink-0 disabled:opacity-50" style={{background:f.gpsAcquired?G:BLUE}}>
                  {gpsLoading?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<span></span>}
                  {gpsLoading?"Locating...":f.gpsAcquired?"Re-capture":"Capture GPS"}
                </button>
                {f.gpsAcquired&&<div className="text-xs font-mono p-2 rounded-lg flex-1" style={{background:"#f0f9ff",color:"#0369a1"}}>Lat: {f.gpsLat}  Lng: {f.gpsLng}</div>}
              </div>
            </Fld>
            <Fld label="Date of Arrival" required><input className={inp} type="date" value={f.arrivalDate} onChange={u("arrivalDate")}/></Fld>
            <Fld label="Time of Arrival" required><input className={inp} type="time" value={f.arrivalTime} onChange={u("arrivalTime")}/></Fld>
            <Fld label="Date of Departure"><input className={inp} type="date" value={f.departureDate} onChange={u("departureDate")}/></Fld>
            <Fld label="Time of Departure"><input className={inp} type="time" value={f.departureTime} onChange={u("departureTime")}/></Fld>
          </div>
          <Fld label="Job Type" required>
            <RadioG value={f.jobType} onChange={v=>{setSec(0);setF(p=>({...p,jobType:v,contractType:""}));}} options={["Recurring Contract Inspection","One-Time Job"]}/>
          </Fld>
          {isOneTime&&<Fld label="Contract Type"><RadioG value={f.contractType} onChange={v=>setF(p=>({...p,contractType:v}))} options={["One-Time","Monthly","Quarterly","Annual"]}/></Fld>}
          <Fld label="Service Category (select all that apply)" required>
            <div className="flex flex-wrap gap-2 mt-1">{["Cleaning","Pest Control","Other"].map(o=><label key={o} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm transition-all ${f.serviceCategory.includes(o)?"border-green-500 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600"}`}><input type="checkbox" checked={f.serviceCategory.includes(o)} onChange={()=>tog("serviceCategory")(o)} className="accent-green-600"/>{o}</label>)}</div>
          </Fld>
        </div>}

        {/* SECTION 1 -- Inspection: Site Condition */}
        {sec===1&&isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 2 of 6 — Site Condition (Rate 1 = Poor, 5 = Excellent)</div>
          <StarRating value={f.cleanlinessRating} onChange={v=>setF(p=>({...p,cleanlinessRating:v}))} label="Cleanliness of Site *"/>
          <StarRating value={f.adherenceRating} onChange={v=>setF(p=>({...p,adherenceRating:v}))} label="Adherence to Contract Standards *"/>
          {(f.cleanlinessRating>0&&f.adherenceRating>0)&&<div className="p-4 rounded-xl" style={{background:"#f0fdf4",border:"1px solid #bbf7d0"}}><p className="text-xs font-bold text-green-600 mb-1">SITE SCORE</p><p className="text-3xl font-black" style={{color:G}}>{((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}<span className="text-sm font-medium text-gray-400"> / 5.0</span></p></div>}
          <Fld label="Recurring Issues / Problems Observed at Site" col>
            <textarea className={inp} rows={3} value={f.recurringIssues} onChange={u("recurringIssues")} placeholder="Describe any persistent problems, access issues, or areas of concern noticed on this visit..."/>
          </Fld>
          <Fld label="Quality Notes" col>
            <textarea className={inp} rows={3} value={f.qualityNotes} onChange={u("qualityNotes")} placeholder="Additional notes on site condition, missed areas, or items requiring follow-up..."/>
          </Fld>
        </div>}

        {/* SECTION 1 -- Job Details */}
        {sec===1&&!isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 2 of 7 -- Job Details</div>
          {hasCleaning&&<Fld label="Cleaning Tasks Performed (select all)" col><CheckGroup options={CLEANING_TASK_OPTS} value={f.cleaningTasks} onChange={v=>setF(p=>({...p,cleaningTasks:v}))}/></Fld>}
          {hasPest&&<><Fld label="Pest Control Tasks Performed" col><CheckGroup options={PEST_TASK_OPTS} value={f.pestTasks} onChange={v=>setF(p=>({...p,pestTasks:v}))}/></Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Pesticides / Chemicals Used"><textarea className={inp} rows={2} value={f.pesticidesUsed} onChange={u("pesticidesUsed")} placeholder="e.g. Cypermethrin, Deltamethrin..."/></Fld>
              <Fld label="Active Ingredients"><textarea className={inp} rows={2} value={f.activeIngredients} onChange={u("activeIngredients")} placeholder="e.g. Cypermethrin 10% w/v..."/></Fld>
            </div>
          </>}
          {hasOther&&<Fld label="Other Tasks Performed" col><textarea className={inp} rows={2} value={f.otherTasks} onChange={u("otherTasks")}/></Fld>}
          <Fld label={f.jobType==="One-Time Job"?"Crew Members Present (list names, one per line)":"Crew Members Present"} col required>
            {f.jobType==="One-Time Job"
              ?<textarea className={inp} rows={4} value={Array.isArray(f.crewMembers)?f.crewMembers.join("\n"):f.crewMembers||""} onChange={e=>setF(p=>({...p,crewMembers:e.target.value}))} placeholder={"John Doe (Ad-hoc)\nJane Smith\n…"}/>
              :<StaffMultiPicker staff={staff} value={f.crewMembers} onChange={v=>setF(p=>({...p,crewMembers:v as any}))}/>
            }
          </Fld>
          <Fld label="Equipment Used" col><CheckGroup options={EQUIPMENT_OPTS} value={f.equipment} onChange={v=>setF(p=>({...p,equipment:v}))}/></Fld>
          <Fld label="Supplies / Consumables Used" col><CheckGroup options={SUPPLY_OPTS} value={f.supplies} onChange={v=>setF(p=>({...p,supplies:v}))}/></Fld>
        </div>}

        {/* SECTION 2 -- Inspection: Staff & Operations */}
        {sec===2&&isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 3 of 6 — Staff & Operations</div>
          <Fld label="Crew Members Present" col required>
            <StaffMultiPicker staff={staff} value={f.crewMembers} onChange={v=>setF(p=>({...p,crewMembers:v as any}))}/>
          </Fld>
          <Fld label="Challenges Faced by Staff" col>
            <textarea className={inp} rows={3} value={f.staffChallenges} onChange={u("staffChallenges")} placeholder="e.g. access restrictions, inadequate water supply, client interference, understaffing..."/>
          </Fld>
          <Fld label="Equipment & Supplies Condition" col>
            <textarea className={inp} rows={2} value={f.equipmentCondition} onChange={u("equipmentCondition")} placeholder="e.g. All equipment in good condition / Mop heads worn out, vacuum needs servicing..."/>
          </Fld>
          <Fld label="PPE Worn by All Crew Members *">
            <RadioG value={f.ppeWorn} onChange={v=>setF(p=>({...p,ppeWorn:v}))} options={["Yes","No","Partial"]} danger={["No","Partial"]}/>
          </Fld>
          {f.ppeWorn==="No"&&<div className="p-3 rounded-xl text-sm text-red-700 font-medium" style={{background:"#fee2e2",border:"1px solid #fca5a5"}}> PPE non-compliance will be flagged in the report.</div>}
          <Fld label="Incidents or Near-Misses">
            <RadioG value={f.incidents} onChange={v=>setF(p=>({...p,incidents:v,incidentDetails:""}))} options={["None","Yes — Incident Occurred"]} danger={["Yes — Incident Occurred"]}/>
          </Fld>
          {f.incidents.startsWith("Yes")&&<Fld label="Describe Incident / Near-Miss" col><textarea className={inp} rows={3} value={f.incidentDetails} onChange={u("incidentDetails")} placeholder="Describe what happened, who was involved, and any action taken..."/></Fld>}
        </div>}

        {/* SECTION 2 -- Quality Control */}
        {sec===2&&!isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 3 of 7 -- Quality Control (Rate 1 = Poor, 5 = Excellent)</div>
          <StarRating value={f.cleanlinessRating} onChange={v=>setF(p=>({...p,cleanlinessRating:v}))} label="Cleanliness Achieved *"/>
          <StarRating value={f.adherenceRating} onChange={v=>setF(p=>({...p,adherenceRating:v}))} label="Adherence to Client's Requests *"/>
          {(f.cleanlinessRating>0&&f.adherenceRating>0)&&<div className="p-4 rounded-xl" style={{background:"#f0fdf4",border:"1px solid #bbf7d0"}}><p className="text-xs font-bold text-green-600 mb-1">QUALITY SCORE</p><p className="text-3xl font-black" style={{color:G}}>{((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}<span className="text-sm font-medium text-gray-400"> / 5.0</span></p></div>}
          <Fld label="Notes on Quality Issues" col><textarea className={inp} rows={3} value={f.qualityNotes} onChange={u("qualityNotes")} placeholder="e.g. Missed spots, incomplete areas, follow-up needed... (write 'None' if no issues)"/></Fld>
        </div>}

        {/* SECTION 3 -- Inspection: Client Feedback */}
        {sec===3&&isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 4 of 6 — Client Feedback</div>
          <Fld label="Client / Contact Person Present During Visit *">
            <RadioG value={f.clientPresent} onChange={v=>setF(p=>({...p,clientPresent:v,clientContactName:"",clientFeedback:"",satisfactionLevel:""}))} options={["Yes","No"]}/>
          </Fld>
          {f.clientPresent==="Yes"&&<>
            <Fld label="Client Contact Name"><input className={inp} value={f.clientContactName} onChange={u("clientContactName")} placeholder="Name of person present"/></Fld>
            <Fld label="Client Feedback / Comments" col><textarea className={inp} rows={3} value={f.clientFeedback} onChange={u("clientFeedback")} placeholder="Record what the client said about the service quality and team..."/></Fld>
            <Fld label="Satisfaction Level (Observed) *">
              <RadioG value={f.satisfactionLevel} onChange={v=>setF(p=>({...p,satisfactionLevel:v}))}
                options={["Very Satisfied","Satisfied","Neutral","Unsatisfied"]}
                danger={["Unsatisfied"]}/>
            </Fld>
          </>}
          {f.clientPresent==="No"&&<div className="p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}> Satisfaction level will be marked as N/A since client was not present.</div>}
          <Fld label="Additional Requirements from Client">
            <RadioG value={f.additionalRequirements} onChange={v=>setF(p=>({...p,additionalRequirements:v,additionalReqDetails:""}))} options={["None","Yes — Requirements Noted"]}/>
          </Fld>
          {f.additionalRequirements.startsWith("Yes")&&<Fld label="Describe Requirements" col><textarea className={inp} rows={2} value={f.additionalReqDetails} onChange={u("additionalReqDetails")}/></Fld>}
        </div>}

        {/* SECTION 3 -- Safety */}
        {sec===3&&!isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 4 of 7 -- Safety Compliance</div>
          <Fld label="PPE Worn by All Crew Members *">
            <RadioG value={f.ppeWorn} onChange={v=>setF(p=>({...p,ppeWorn:v}))} options={["Yes","No","Partial"]} danger={["No","Partial"]}/>
          </Fld>
          {f.ppeWorn==="No"&&<div className="p-3 rounded-xl text-sm text-red-700 font-medium" style={{background:"#fee2e2",border:"1px solid #fca5a5"}}> PPE non-compliance logged. This will be flagged in the report.</div>}
          <Fld label="Safe Handling of Chemicals / Equipment *">
            <RadioG value={f.safeHandling} onChange={v=>setF(p=>({...p,safeHandling:v}))} options={["Yes","No","N/A -- No Chemicals Used"]} danger={["No"]}/>
          </Fld>
          <Fld label="Incidents or Near-Misses">
            <RadioG value={f.incidents} onChange={v=>setF(p=>({...p,incidents:v,incidentDetails:""}))} options={["None","Yes -- Incident Occurred"]} danger={["Yes -- Incident Occurred"]}/>
          </Fld>
          {f.incidents.startsWith("Yes")&&<Fld label="Describe Incident / Near-Miss" col><textarea className={inp} rows={3} value={f.incidentDetails} onChange={u("incidentDetails")} placeholder="Describe what happened, who was involved, and any action taken..."/></Fld>}
        </div>}

        {/* SECTION 4 -- Inspection: Photos & Notes */}
        {sec===4&&isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 5 of 6 — Photos & Notes</div>
          <Fld label="Site Photos (up to 10 — use camera or file picker)" col>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-green-400" style={{borderColor:G,color:G}}>
                   Take Photo
                  <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="hidden"/>
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-blue-400" style={{borderColor:BLUE,color:BLUE}}>
                   Choose from Gallery
                  <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden"/>
                </label>
              </div>
              {f.photos.length>0&&<div className="grid grid-cols-3 gap-2">{f.photos.map((p,i)=><div key={i} className="relative group">
                <img src={p.data} alt={p.name} className="w-full h-24 object-cover rounded-xl"/>
                <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.name}</p>
              </div>)}</div>}
              {f.photos.length===0&&<p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">No photos added yet — photos help document site condition and issues observed</p>}
              <p className="text-xs text-gray-400">{f.photos.length}/10 photos added</p>
            </div>
          </Fld>
          <Fld label="Supervisor's Operational Notes" col>
            <textarea className={inp} rows={4} value={f.operationalNotes} onChange={u("operationalNotes")} placeholder="Observations about the site, recurring maintenance items, access issues, or anything to flag for the next visit..."/>
          </Fld>
        </div>}

        {/* SECTION 4 -- Client Interaction */}
        {sec===4&&!isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 5 of 7 -- Client Interaction</div>
          <Fld label="Client / Contact Person Present During Visit *">
            <RadioG value={f.clientPresent} onChange={v=>setF(p=>({...p,clientPresent:v,clientContactName:"",clientFeedback:"",satisfactionLevel:""}))} options={["Yes","No"]}/>
          </Fld>
          {f.clientPresent==="Yes"&&<>
            <Fld label="Client Contact Name"><input className={inp} value={f.clientContactName} onChange={u("clientContactName")} placeholder="Name of person present"/></Fld>
            <Fld label="Client Feedback / Comments" col><textarea className={inp} rows={3} value={f.clientFeedback} onChange={u("clientFeedback")} placeholder="Record what the client said about the job..."/></Fld>
            <Fld label="Satisfaction Level (Observed) *">
              <RadioG value={f.satisfactionLevel} onChange={v=>setF(p=>({...p,satisfactionLevel:v}))}
                options={["Very Satisfied","Satisfied","Neutral","Unsatisfied"]}
                danger={["Unsatisfied"]}/>
            </Fld>
          </>}
          {f.clientPresent==="No"&&<div className="p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}> Satisfaction level will be marked as N/A since client was not present.</div>}
          <Fld label="Additional Requirements from Client">
            <RadioG value={f.additionalRequirements} onChange={v=>setF(p=>({...p,additionalRequirements:v,additionalReqDetails:""}))} options={["None","Yes -- Requirements Noted"]}/>
          </Fld>
          {f.additionalRequirements.startsWith("Yes")&&<Fld label="Describe Requirements" col><textarea className={inp} rows={2} value={f.additionalReqDetails} onChange={u("additionalReqDetails")}/></Fld>}
        </div>}

        {/* SECTION 5 -- Inspection: Supervisor Assessment */}
        {sec===5&&isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 6 of 6 — Supervisor Assessment</div>
          <div className="p-4 rounded-2xl space-y-2 text-sm" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Inspection Summary</p>
            {[
              ["Client",f.clientName],
              ["Date",`${fmtD(f.arrivalDate)} ${f.arrivalTime}`],
              ["Service",f.serviceCategory.join(", ")],
              ["Site Score",f.cleanlinessRating>0?`${((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}/5.0`:"Not rated"],
              ["Client Present",f.clientPresent||"Not recorded"],
              ["Satisfaction",f.satisfactionLevel||"N/A"],
              ["Crew",(Array.isArray(f.crewMembers)?f.crewMembers:String(f.crewMembers||"").split("\n")).filter(Boolean).join(", ")],
              ["Photos",`${f.photos.length} attached`],
            ].map(([l,v])=>v&&<div key={l} className="flex gap-2"><span className="text-xs font-bold text-gray-400 w-32 flex-shrink-0">{l}</span><span className="text-xs text-gray-700">{v}</span></div>)}
          </div>
          <Fld label="Supervisor's Feedback & Recommendations" col>
            <textarea className={inp} rows={3} value={f.supervisorFeedback} onChange={u("supervisorFeedback")} placeholder="Overall assessment of the visit, team performance, and key observations for management..."/>
          </Fld>
          <Fld label="Follow-Up Actions Required" col>
            <textarea className={inp} rows={3} value={f.followUpActions} onChange={u("followUpActions")} placeholder="List specific actions — assigned tasks, materials to procure, client requests to address, next inspection items..."/>
          </Fld>
          <Fld label="Overall Assessment *">
            <RadioG value={f.overallAssessment} onChange={v=>setF(p=>({...p,overallAssessment:v}))}
              options={["Inspection Passed — Standards Met","Issues Observed — Follow-up Required"]}
              danger={["Issues Observed — Follow-up Required"]}/>
          </Fld>
          <Fld label="Supervisor Digital Signature (type full name) *">
            <input className={inp} value={f.signatureName} onChange={e=>setF(p=>({...p,signatureName:e.target.value,signatureTimestamp:new Date().toLocaleString("en-GB")}))} placeholder={f.supervisorName}/>
            {f.signatureName&&<p className="text-xs text-gray-400 mt-1">Signed: {f.signatureTimestamp}</p>}
          </Fld>
        </div>}

        {/* SECTION 5 -- Photos & Notes */}
        {sec===5&&!isInspection&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 6 of 7 -- Photos &amp; Operational Notes</div>
          <Fld label="Site Photos (up to 10 -- use camera or file picker)" col>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-green-400" style={{borderColor:G,color:G}}>
                   Take Photo
                  <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="hidden"/>
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-blue-400" style={{borderColor:BLUE,color:BLUE}}>
                   Choose from Gallery
                  <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden"/>
                </label>
              </div>
              {f.photos.length>0&&<div className="grid grid-cols-3 gap-2">{f.photos.map((p,i)=><div key={i} className="relative group">
                <img src={p.data} alt={p.name} className="w-full h-24 object-cover rounded-xl"/>
                <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"></button>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.name}</p>
              </div>)}</div>}
              {f.photos.length===0&&<p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">No photos added yet -- photos help document the job quality and site condition</p>}
              <p className="text-xs text-gray-400">{f.photos.length}/10 photos added</p>
            </div>
          </Fld>
          <Fld label="Operational Notes / Observations" col>
            <textarea className={inp} rows={4} value={f.operationalNotes} onChange={u("operationalNotes")} placeholder="Any other observations about the site, access issues, recurring problems, maintenance items to flag for the client..."/>
          </Fld>
        </div>}

        {/* SECTION 6 -- Supervisor Confirmation */}
        {sec===6&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}> Section 7 of 7 -- Supervisor Confirmation</div>
          {/* Summary */}
          <div className="p-4 rounded-2xl space-y-2 text-sm" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Report Summary</p>
            {[
              ["Client",f.clientName],
              ["Job Type",f.jobType+(f.contractType?`  ${f.contractType}`:"")],
              ["Service",f.serviceCategory.join(", ")],
              ["Arrival",`${fmtD(f.arrivalDate)} ${f.arrivalTime}`],
              ["Departure",`${fmtD(f.departureDate)} ${f.departureTime}`],
              ["GPS",f.gpsAcquired?`${f.gpsLat}N, ${f.gpsLng}E`:"Not captured"],
              ["Crew",(Array.isArray(f.crewMembers)?f.crewMembers:String(f.crewMembers||"").split("\n")).filter(Boolean).join(", ")],
              ["Quality Score",f.cleanlinessRating>0?`${((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}/5.0`:"Not rated"],
              ["Client Satisfaction",f.satisfactionLevel||"N/A"],
              ["Photos",`${f.photos.length} attached`],
            ].map(([l,v])=>v&&<div key={l} className="flex gap-2"><span className="text-xs font-bold text-gray-400 w-32 flex-shrink-0">{l}</span><span className="text-xs text-gray-700">{v}</span></div>)}
          </div>
          <Fld label="Overall Assessment *">
            <RadioG value={f.overallAssessment} onChange={v=>setF(p=>({...p,overallAssessment:v}))}
              options={["Job Completed Successfully","Issues Observed -- Follow-up Required"]}
              danger={["Issues Observed -- Follow-up Required"]}/>
          </Fld>
          <Fld label="Supervisor Digital Signature (type full name) *">
            <input className={inp} value={f.signatureName} onChange={e=>setF(p=>({...p,signatureName:e.target.value,signatureTimestamp:new Date().toLocaleString("en-GB")}))} placeholder={f.supervisorName}/>
            {f.signatureName&&<p className="text-xs text-gray-400 mt-1">Signed: {f.signatureTimestamp}</p>}
          </Fld>
          <div className="p-3 rounded-xl text-xs text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}> This report will be emailed to supervisors and admin once Supabase backend is connected.</div>
        </div>}

      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 bg-gray-50/50">
        <button onClick={sec===0?onClose:()=>setSec(s=>s-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
          {sec===0?"Cancel":" Back"}
        </button>
        <span className="text-xs text-gray-400 font-medium">Step {sec+1} of {totalSecs}</span>
        {sec<totalSecs-1
          ?<button onClick={()=>setSec(s=>s+1)} disabled={!activeCanNext[sec]} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2" style={{background:G}}>Next </button>
          :<button onClick={submit} disabled={!activeCanNext[totalSecs-1]} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2" style={{background:O}}>Submit Report </button>
        }
      </div>
    </div>
  </div>);}

function SiteReportViewer({report:r,onClose}:SiteReportViewerProps){
  const[photoIdx,setPhotoIdx]=useState<number|null>(null);
  const photos:Photo[]=(r.photos as Photo[]|undefined)||[];
  const score=r.cleanlinessRating&&r.adherenceRating?((r.cleanlinessRating+r.adherenceRating)/2).toFixed(1):null;
  const sectionBlock=(title:string,children:React.ReactNode)=><div className="mb-5"><h3 className="text-xs font-black uppercase tracking-widest mb-3 pb-2 border-b" style={{color:G}}>{title}</h3>{children}</div>;
  const row=(l:string,v:React.ReactNode)=>v?<div key={l} className="flex gap-3 mb-2"><span className="text-xs font-bold text-gray-400 w-40 flex-shrink-0 pt-0.5">{l}</span><span className="text-sm text-gray-700">{v}</span></div>:null;
  return(<ModalWrap title={`Report -- ${r.clientName||"Unknown"}`} onClose={onClose} xl>
    <div className="text-sm">
      {sectionBlock("Section 1 -- General Information",<>
        {row("Supervisor",r.supervisorName)}
        {row("Client / Site",r.clientName)}
        {row("Address",r.address)}
        {row("GPS",r.gpsAcquired?`${r.gpsLat}N, ${r.gpsLng}E`:"Not captured")}
        {row("Arrival",`${fmtD(r.arrivalDate)} ${r.arrivalTime||""}`)}
        {row("Departure",`${fmtD(r.departureDate)} ${r.departureTime||""}`)}
        {row("Job Type",r.jobType+(r.contractType?`  ${r.contractType}`:""))}
        {row("Service Category",r.serviceCategory?.join(", "))}
      </>)}
      {sectionBlock("Section 2 -- Job Details",<>
        {r.cleaningTasks?.length>0&&row("Cleaning Tasks",r.cleaningTasks.join(", "))}
        {r.pestTasks?.length>0&&row("Pest Tasks",r.pestTasks.join(", "))}
        {r.pesticidesUsed&&row("Pesticides Used",r.pesticidesUsed)}
        {r.activeIngredients&&row("Active Ingredients",r.activeIngredients)}
        {r.otherTasks&&row("Other Tasks",r.otherTasks)}
        {row("Crew Members",(Array.isArray(r.crewMembers)?r.crewMembers:String(r.crewMembers||"").split("\n")).filter(Boolean).join(", "))}
        {r.equipment?.length>0&&row("Equipment",r.equipment.join(", "))}
        {r.supplies?.length>0&&row("Supplies",r.supplies.join(", "))}
      </>)}
      {sectionBlock("Section 3 -- Quality Control",<>
        <div className="flex gap-6 mb-3">
          <div className="p-3 rounded-xl text-center" style={{background:GL}}><p className="text-xs font-bold text-gray-500">Cleanliness</p><p className="text-2xl font-black" style={{color:G}}>{r.cleanlinessRating||"--"}</p><p style={{color:"#f59e0b"}}>{"".repeat(r.cleanlinessRating||0)}</p></div>
          <div className="p-3 rounded-xl text-center" style={{background:GL}}><p className="text-xs font-bold text-gray-500">Adherence</p><p className="text-2xl font-black" style={{color:G}}>{r.adherenceRating||"--"}</p><p style={{color:"#f59e0b"}}>{"".repeat(r.adherenceRating||0)}</p></div>
          {score&&<div className="p-3 rounded-xl text-center" style={{background:"#f0fdf4",border:`1px solid #bbf7d0`}}><p className="text-xs font-bold text-gray-500">Quality Score</p><p className="text-2xl font-black" style={{color:G}}>{score}</p><p className="text-xs text-gray-400">out of 5.0</p></div>}
        </div>
        {row("Quality Issues",r.qualityNotes||"None")}
      </>)}
      {sectionBlock("Section 4 -- Safety",<>
        {row("PPE Worn",r.ppeWorn)}
        {row("Safe Handling",r.safeHandling)}
        {row("Incidents",r.incidents)}
        {r.incidentDetails&&row("Incident Details",r.incidentDetails)}
      </>)}
      {sectionBlock("Section 5 -- Client Interaction",<>
        {row("Client Present",r.clientPresent)}
        {r.clientContactName&&row("Contact Name",r.clientContactName)}
        {r.clientFeedback&&row("Client Feedback",`"${r.clientFeedback}"`)}
        {row("Satisfaction",r.satisfactionLevel||"N/A")}
        {row("Additional Requirements",r.additionalRequirements)}
        {r.additionalReqDetails&&row("Requirements Detail",r.additionalReqDetails)}
      </>)}
      {photos.length>0&&sectionBlock(`Section 6 -- Photos (${photos.length})`,<div className="grid grid-cols-3 gap-2">{photos.map((p,i)=><div key={i} className="cursor-pointer" onClick={()=>setPhotoIdx(i)}><img src={p.data} alt={p.name} className="w-full h-24 object-cover rounded-xl hover:opacity-90 transition-opacity"/></div>)}</div>)}
      {r.operationalNotes&&sectionBlock("Operational Notes",<p className="text-sm text-gray-700 whitespace-pre-wrap">{r.operationalNotes}</p>)}
      {sectionBlock("Section 7 -- Supervisor Confirmation",<>
        {row("Overall Assessment",r.overallAssessment)}
        {row("Signed by",`${r.signatureName}  ${r.signatureTimestamp}`)}
      </>)}
    </div>
    {/* Lightbox */}
    {photoIdx!==null&&<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]" onClick={()=>setPhotoIdx(null)}>
      <img src={photos[photoIdx].data} alt="" className="max-w-full max-h-full rounded-xl" onClick={e=>e.stopPropagation()}/>
      <button onClick={()=>setPhotoIdx(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-lg"></button>
      {photoIdx>0&&<button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i===null?i:i-1);}} className="absolute left-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl"></button>}
      {photoIdx<photos.length-1&&<button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i===null?i:i+1);}} className="absolute right-16 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl"></button>}
    </div>}
  </ModalWrap>);}




