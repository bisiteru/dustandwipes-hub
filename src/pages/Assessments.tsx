// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Site Assessments page
//  Phase 4d extraction. Pre-job site assessment wizard with photos + GPS,
//  separate from Site Reports (post-job inspections).
//
//  Includes AssessmentsPage + AssessmentViewer + SA_* form options.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Eye, Search, ClipboardList, X, ChevronRight } from "lucide-react";
import { G, GL, O, OL, AMBER, RED, BLUE, inp } from "../lib/constants";
// fmt/fmtD not used in this file
// from "../lib/format";
import { dbSync, dbDelete, uploadAssessmentPhoto } from "../lib/supabase";
import { Card, Fld, SBadge, KPI } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { ContactSearchSelect } from "../components/pickers";
import { useConfirm } from "../components/ui/useConfirm";

// ── Site Assessment form options ─────────────────────────────────────────────
const SA_SERVICES=[
  "Post-construction cleaning","Deep cleaning","Routine janitorial service",
  "Pest control","Fumigation","Rodent control","Termite treatment",
  "Bed bug treatment","Snake control","Gardening/landscaping",
  "Facade cleaning","Carpet/upholstery cleaning","Pressure washing",
  "Swimming pool cleaning","Move-in/move-out cleaning","Other"
];
const SA_CLEAN_SVCS=["Post-construction cleaning","Deep cleaning","Routine janitorial service","Carpet/upholstery cleaning","Move-in/move-out cleaning","Swimming pool cleaning","Other"];
const SA_PEST_SVCS=["Pest control","Fumigation","Rodent control","Termite treatment","Bed bug treatment","Snake control"];
const SA_OUTDOOR_SVCS=["Facade cleaning","Pressure washing","Gardening/landscaping"];
const SA_JANITORIAL=["Routine janitorial service"];
const SA_EQUIP_OPTS=["Vacuum cleaner","Industrial vacuum","Scrubbing machine","Pressure washer","Steam cleaner","Ladder","Scaffolding","Mop sets","Squeegee","Extension poles","Buckets","PPE kit","Generator","Cleaning Towels","Soft Iron Sponge"];
const SA_CHEM_OPTS=["Liquid Soap","Bleach","Disinfectant","Glass Cleaner","Floor Polish","Degreaser","Air Freshener","Dr. Floor","Formula X","Wood Polish","Multi-Surface Cleaner","Scouring Powder","Scented Camphor","Cypress"];
const SA_PEST_TYPES=["Cockroaches","Ants","Mosquitoes","Flies","Rodents","Termites","Bed bugs","Snakes","Wall geckos","Spiders","Fleas","Ticks","Other"];
const SA_TREATMENT=["Spraying","Gel baiting","Fogging","Rodent baiting","Termite drilling/injection","Dusting","Fumigation","Trapping","Exclusion/sealing"];
const SA_SECTIONS=["Client Info","Service Type","Scope","Site & Risk","Photos","Costing","Recommendation"];

// ── Local checkbox-group helper (also used by SiteReports) ──────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CheckGroup({options,value=[],onChange}){
  const tog=o=>onChange(value.includes(o)?value.filter(v=>v!==o):[...value,o]);
  return <div className="grid grid-cols-2 gap-2 mt-1">{options.map(o=><label key={o} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${value.includes(o)?"border-green-500 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600 hover:border-gray-300"}`}><input type="checkbox" checked={value.includes(o)} onChange={()=>tog(o)} className="accent-green-600 flex-shrink-0"/>{o}</label>)}</div>;
}


export
function AssessmentsPage({assessments,setAssessments,user,clients,contacts,requests,setRequests}){
  const[view,setView]=useState(null);
  const[showForm,setShowForm]=useState(false);
  const[editData,setEditData]=useState(null);
  const[search,setSearch]=useState("");
  const[filterStatus,setFilterStatus]=useState("All");
  const[filterSvc,setFilterSvc]=useState("All");
  const[confirm,confirmEl]=useConfirm();

  const del=id=>confirm("Delete this assessment?",()=>{setAssessments(as=>as.filter(a=>a.id!==id));dbDelete("assessments",id);});

  const convertToRequest=(a)=>{
    const newReq={
      id:"req"+Date.now(),
      clientName:a.clientName,
      clientPhone:a.clientPhone||"",
      svc:a.services[0]||"Other",
      loc:a.siteAddress||"",
      prefDate:a.proposedDate||"",
      src:"Assessment",
      status:"Pending",
      notes:`Converted from Site Assessment ${a.assessmentId}. ${a.recommendedPlan||""}`.trim(),
      created:new Date().toISOString(),
    };
    setRequests(rs=>[newReq,...rs]);
    setAssessments(as=>as.map(a2=>a2.id===a.id?{...a2,status:"Converted to Job",convertedReqId:newReq.id}:a2));
    alert(`✅ Converted to Service Request #${newReq.id}`);
  };

  const filtered=assessments.filter(a=>{
    const q=search.toLowerCase();
    const matchQ=!q||[a.clientName,a.assessmentOfficer,a.siteAddress,a.assessmentId].join(" ").toLowerCase().includes(q);
    const matchS=filterStatus==="All"||a.status===filterStatus;
    const matchV=filterSvc==="All"||(a.services||[]).some(s=>s===filterSvc);
    return matchQ&&matchS&&matchV;
  });

  const statusBadge=(s)=>{
    const m={"Draft":{bg:"#f3f4f6",color:"#6b7280"},"Submitted":{bg:"#dbeafe",color:"#1e40af"},"Reviewed":{bg:"#fef3c7",color:"#92400e"},"Quoted":{bg:"#ede9fe",color:"#5b21b6"},"Converted to Job":{bg:"#dcfce7",color:"#166534"},"Closed":{bg:"#f1f5f9",color:"#475569"},"Lost":{bg:"#fee2e2",color:"#991b1b"}};
    return m[s]||{bg:"#f3f4f6",color:"#6b7280"};
  };

  return(<div className="space-y-5">{confirmEl}
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI icon="📋" label="Total" value={assessments.length} sub="All assessments" bg={GL}/>
      <KPI icon="📝" label="Draft" value={assessments.filter(a=>a.status==="Draft").length} sub="In progress" bg="#eff6ff"/>
      <KPI icon="✅" label="Submitted" value={assessments.filter(a=>a.status==="Submitted").length} sub="Awaiting review" bg={OL}/>
      <KPI icon="🔄" label="Converted" value={assessments.filter(a=>a.status==="Converted to Job").length} sub="To service request" bg="#f0fdf4"/>
    </div>

    {/* Filters + New button */}
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-52">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
        <input className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" placeholder="Search client, officer, ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
        <option>All</option>{["Draft","Submitted","Reviewed","Quoted","Converted to Job","Closed","Lost"].map(s=><option key={s}>{s}</option>)}
      </select>
      <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" value={filterSvc} onChange={e=>setFilterSvc(e.target.value)}>
        <option>All</option>{SA_SERVICES.map(s=><option key={s}>{s}</option>)}
      </select>
      <button onClick={()=>{setEditData(null);setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold whitespace-nowrap" style={{background:G}}>
        <Plus size={14}/>New Assessment
      </button>
    </div>

    {/* List */}
    <Card>
      {filtered.length===0
        ?<div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-20"/>
          <p className="font-semibold text-sm">No assessments yet</p>
          <p className="text-xs mt-1">Create a site assessment before preparing quotations or assigning teams</p>
        </div>
        :<div className="divide-y divide-gray-50">
          {filtered.map(a=>{
            const sc=statusBadge(a.status);
            const isHigh=a.riskLevel==="High";
            return(<div key={a.id} className="px-5 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:isHigh?RED:G}}>
                    {isHigh?"⚠":"📋"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{a.clientName||"Unknown Client"}</p>
                      <span className="text-xs text-gray-400 font-mono">{a.assessmentId}</span>
                      {isHigh&&<span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:"#fee2e2",color:RED}}>High Risk</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{(a.services||[]).slice(0,3).join(", ")}{(a.services||[]).length>3?` +${a.services.length-3} more`:""}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {a.siteAddress&&<span>📍 {a.siteAddress}</span>}
                      <span>👤 {a.assessmentOfficer}</span>
                      <span>📅 {a.assessmentDate}</span>
                      {(a.photos||[]).length>0&&<span>📷 {a.photos.length} photo{a.photos.length!==1?"s":""}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <SBadge s={a.status} custom={sc}/>
                  <button onClick={()=>setView(a)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100" title="View Report"><Eye size={13}/></button>
                  <button onClick={()=>{setEditData(a);setShowForm(true);}} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 border border-green-100" title="Edit"><Edit2 size={13}/></button>
                  {a.status!=="Converted to Job"&&<button onClick={()=>convertToRequest(a)} className="text-xs px-2.5 py-1 rounded-lg font-semibold border whitespace-nowrap" style={{borderColor:O,color:O}} title="Convert to Service Request">→ Request</button>}
                  <button onClick={()=>del(a.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
                </div>
              </div>
            </div>);
          })}
        </div>
      }
    </Card>

    {showForm&&<AssessmentForm
      data={editData}
      onSave={data=>{
        const exists=assessments.some(a=>a.id===data.id);
        const na=exists?assessments.map(a=>a.id===data.id?data:a):[data,...assessments];
        setAssessments(na);dbSync("assessments",na);
        setShowForm(false);setEditData(null);
      }}
      onClose={()=>{setShowForm(false);setEditData(null);}}
      user={user} clients={clients} contacts={contacts}
    />}
    {view&&<AssessmentViewer assessment={view} onClose={()=>setView(null)} userRole={user.role}/>}
  </div>);}

function AssessmentForm({data,onSave,onClose,user,clients,contacts}){
  const isEdit=!!data?.id;
  const genId=()=>`SA-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const[sec,setSec]=useState(0);
  const[uploading,setUploading]=useState(false);

  const blank={
    id:"",assessmentId:genId(),status:"Draft",
    // S1 - Client
    clientName:"",contactPerson:"",clientPhone:"",clientEmail:"",
    siteAddress:"",cityState:"",assessmentDate:new Date().toISOString().split("T")[0],
    assessmentOfficer:user?.name||"",sourceOfRequest:"Phone call",clientType:"Commercial",
    // S2 - Services
    services:[],
    // S3 - Cleaning scope
    propertyType:"",numFloors:"",numRooms:"",numToilets:"",numKitchens:"",numStaircases:"",
    floorType:[],wallCondition:"",windowQty:"Low",ceilingCondition:"",
    paintStains:false,cementStains:false,glueStains:false,heavyDust:false,wasteEvacuation:"No",
    externalAreas:[],equipment:[],chemicals:[],estimatedWorkers:"",estimatedDuration:"",
    accessRequirements:"",preferredDate:"",urgency:"Normal",
    // S3 - Pest scope
    pestTypes:[],severityLevel:"Mild",affectedAreas:[],pestActivity:[],
    previousTreatment:"No",prevTreatmentDate:"",prevChemicals:"",
    occupancyStatus:"Occupied",sensitivities:"",treatmentMethod:[],
    safetyPrecautions:"",reentryTime:"",followUpVisit:"No",numFollowUps:"",warrantyPeriod:"",
    // S3 - Janitorial
    facilityType:"",numCleaners:"",workSchedule:"Weekdays only",workHours:"",
    dailyAreas:"",weeklyAreas:"",monthlyAreas:"",consumables:[],suppliedBy:"Dust & Wipes",
    supervisorFreq:"",uniformRequired:"No",siteRules:"",monthlyBudget:"",
    contractStart:"",contractDuration:"",
    // S3 - Outdoor
    surfaceType:[],heightLevel:"Ground level",accessReq:"Ladder",
    waterSource:"Yes",powerSource:"Yes",drainage:"Yes",safetyRisk:"",
    trafficControl:"No",workPermit:"No",bestPeriod:"Morning",
    // S4 - Site & Risk
    conditionSummary:"",challenges:"",healthRisks:"",fragileItems:"No",
    restrictedAreas:"",accessLimitations:"",parkingAvail:"Yes",
    waterAvail:"Yes",electricityAvail:"Yes",securityClearance:"No",
    ppeRequired:"",riskLevel:"Low",recommendedTeam:"",supervisorInvolvement:"",clientExpectations:"",
    // S5 - Photos
    photos:[],
    // S6 - Costing (admin/supervisor only)
    estWorkers:"",estWorkdays:"",estTransport:"",estMaterials:"",estEquipment:"",
    estWasteEvac:"",estSupervision:"",suggestedCharge:"",profitMargin:"",
    recommendedQuote:"",costingNotes:"",
    // S7 - Recommendation
    recommendedPlan:"",priorityLevel:"Normal",proposedDate:"",
    quotationRequired:"Yes",createJobNow:"No",followUpRequired:"No",
    followUpDate:"",followUpOfficer:"",
  };

  const[f,setF]=useState(data?{...blank,...data}:blank);
  const u=k=>e=>setF(p=>({...p,[k]:e.target.value}));

  const hasCleaning=f.services.some(s=>SA_CLEAN_SVCS.includes(s));
  const hasPest    =f.services.some(s=>SA_PEST_SVCS.includes(s));
  const hasJanitor =f.services.some(s=>SA_JANITORIAL.includes(s));
  const hasOutdoor =f.services.some(s=>SA_OUTDOOR_SVCS.includes(s));

  const addPhotos=async(e)=>{
    const files=Array.from(e.target.files||[]);
    if(!files.length)return;
    setUploading(true);
    const results=[];
    for(const file of (files.slice(0,10-f.photos.length) as File[])){
      const url=await uploadAssessmentPhoto(file,f.assessmentId);
      if(url)results.push({url,caption:"",name:file.name});
      else{
        // fallback: store as base64 preview
        await new Promise<void>(res=>{const r=new FileReader();r.onload=(ev:any)=>{results.push({url:ev.target.result,caption:"",name:file.name});res();};r.readAsDataURL(file);});
      }
    }
    setF(p=>({...p,photos:[...p.photos,...results]}));
    setUploading(false);
    e.target.value="";
  };

  const canNext=[
    f.clientName&&f.assessmentDate&&f.assessmentOfficer,
    f.services.length>0,
    true,true,true,true,
    f.status,
  ];

  const submit=(status)=>{
    const final={...f,id:f.id||"sa"+Date.now(),status,updatedAt:new Date().toISOString()};
    onSave(final);
  };

  const CheckList=({opts,val=[],onChange,cols=2})=>(
    <div className={`grid grid-cols-${cols} gap-1.5 mt-1`}>
      {opts.map(o=><label key={o} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${val.includes(o)?"border-green-400 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600 hover:border-gray-300"}`}>
        <input type="checkbox" checked={val.includes(o)} onChange={()=>onChange(val.includes(o)?val.filter(v=>v!==o):[...val,o])} className="accent-green-600 flex-shrink-0"/>{o}
      </label>)}
    </div>
  );

  const ynField=(label,key)=>(
    <Fld label={label}><select className={inp} value={f[key]} onChange={u(key)}><option>Yes</option><option>No</option><option>N/A</option></select></Fld>
  );

  return(<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">

      {/* Header + stepper */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">{isEdit?"Edit Assessment":"New Site Assessment"}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{f.assessmentId}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {SA_SECTIONS.map((s,i)=><div key={i} className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={()=>i<sec?setSec(i):null} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${i===sec?"text-white":i<sec?"text-green-700":"text-gray-400"}`} style={i===sec?{background:O}:i<sec?{background:GL}:{background:"#f9fafb"}}>
              {i<sec?"✓ ":""}{s}
            </button>
            {i<SA_SECTIONS.length-1&&<ChevronRight size={10} className="text-gray-300"/>}
          </div>)}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* SECTION 0: Client Info */}
        {sec===0&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>📋 Section 1 — Basic Client Information</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Client Name / Organisation" col required>
              <ContactSearchSelect value={f.clientName} onSelect={n=>{const c=[...clients,...((window as any).__DW_CONTACTS__||[])].find(x=>x.name===n);setF(p=>({...p,clientName:n,siteAddress:c?.addr||c?.address||p.siteAddress,clientPhone:c?.phone||p.clientPhone,clientEmail:c?.email||p.clientEmail}));}} clients={clients} contacts={(window as any).__DW_CONTACTS__||[]}/>
            </Fld>
            <Fld label="Contact Person"><input className={inp} value={f.contactPerson} onChange={u("contactPerson")}/></Fld>
            <Fld label="Phone"><input className={inp} type="tel" value={f.clientPhone} onChange={u("clientPhone")}/></Fld>
            <Fld label="Email"><input className={inp} type="email" value={f.clientEmail} onChange={u("clientEmail")}/></Fld>
            <Fld label="Site Address" col><input className={inp} value={f.siteAddress} onChange={u("siteAddress")} placeholder="Full site address"/></Fld>
            <Fld label="City / State"><input className={inp} value={f.cityState} onChange={u("cityState")} placeholder="e.g. Abuja, FCT"/></Fld>
            <Fld label="Assessment Date" required><input className={inp} type="date" value={f.assessmentDate} onChange={u("assessmentDate")}/></Fld>
            <Fld label="Assessment Officer" required><input className={inp} value={f.assessmentOfficer} onChange={u("assessmentOfficer")}/></Fld>
            <Fld label="Source of Request"><select className={inp} value={f.sourceOfRequest} onChange={u("sourceOfRequest")}>{["WhatsApp","Phone call","Email","Referral","Website","Existing client","Tender","Walk-in"].map(s=><option key={s}>{s}</option>)}</select></Fld>
            <Fld label="Client Type"><select className={inp} value={f.clientType} onChange={u("clientType")}>{["Residential","Commercial","Corporate","NGO/INGO","Embassy","Government","School","Hospital","Religious organization","Estate/facility manager","Other"].map(s=><option key={s}>{s}</option>)}</select></Fld>
          </div>
        </div>}

        {/* SECTION 1: Services */}
        {sec===1&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>🔧 Section 2 — Service Type (select all that apply)</div>
          <CheckList opts={SA_SERVICES} val={f.services} onChange={v=>setF(p=>({...p,services:v}))} cols={2}/>
          {f.services.length>0&&<div className="p-3 rounded-xl text-xs text-blue-700" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
            ℹ️ Conditional fields will appear in Section 3 based on your selection: {f.services.join(", ")}
          </div>}
        </div>}

        {/* SECTION 2: Scope (conditional) */}
        {sec===2&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>📐 Section 3 — Scope of Work</div>

          {/* Cleaning scope */}
          {hasCleaning&&<div className="space-y-4 p-4 rounded-xl border border-green-200" style={{background:"#f0fdf4"}}>
            <h3 className="text-sm font-bold text-green-800">🧹 Cleaning Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Property Type"><select className={inp} value={f.propertyType} onChange={u("propertyType")}>{["Apartment","Duplex","Office","School","Hospital","Warehouse","Estate","Hotel","Religious facility","Industrial facility","Other"].map(s=><option key={s}>{s}</option>)}</select></Fld>
              <Fld label="No. of Floors"><input className={inp} type="number" min="0" value={f.numFloors} onChange={u("numFloors")}/></Fld>
              <Fld label="No. of Rooms/Offices"><input className={inp} type="number" min="0" value={f.numRooms} onChange={u("numRooms")}/></Fld>
              <Fld label="No. of Toilets/Bathrooms"><input className={inp} type="number" min="0" value={f.numToilets} onChange={u("numToilets")}/></Fld>
              <Fld label="No. of Kitchens/Pantries"><input className={inp} type="number" min="0" value={f.numKitchens} onChange={u("numKitchens")}/></Fld>
              <Fld label="No. of Staircases"><input className={inp} type="number" min="0" value={f.numStaircases} onChange={u("numStaircases")}/></Fld>
              <Fld label="Wall Condition"><select className={inp} value={f.wallCondition} onChange={u("wallCondition")}>{["Clean","Dusty","Stained","Painted","Newly plastered","Moldy"].map(s=><option key={s}>{s}</option>)}</select></Fld>
              <Fld label="Window/Glass Quantity"><select className={inp} value={f.windowQty} onChange={u("windowQty")}><option>Low</option><option>Medium</option><option>High</option></select></Fld>
              <Fld label="Work Urgency"><select className={inp} value={f.urgency} onChange={u("urgency")}><option>Low</option><option>Normal</option><option>Urgent</option><option>Emergency</option></select></Fld>
              <Fld label="Waste Evacuation Required"><select className={inp} value={f.wasteEvacuation} onChange={u("wasteEvacuation")}><option>Yes</option><option>No</option></select></Fld>
              <Fld label="Est. Workers Required"><input className={inp} type="number" min="0" value={f.estimatedWorkers} onChange={u("estimatedWorkers")}/></Fld>
              <Fld label="Est. Duration"><input className={inp} value={f.estimatedDuration} onChange={u("estimatedDuration")} placeholder="e.g. 2 days"/></Fld>
              <Fld label="Preferred Work Date"><input className={inp} type="date" value={f.preferredDate} onChange={u("preferredDate")}/></Fld>
              <Fld label="Access Requirements" col><input className={inp} value={f.accessRequirements} onChange={u("accessRequirements")} placeholder="Keys, security clearance, escort required…"/></Fld>
            </div>
            <Fld label="Floor Type (select all)" col><CheckList opts={["Tiles","Marble","Terrazzo","Wood","Vinyl","Concrete","Carpet","Mixed"]} val={f.floorType} onChange={v=>setF(p=>({...p,floorType:v}))} cols={4}/></Fld>
            <Fld label="Stains Present" col>
              <div className="flex flex-wrap gap-3 mt-1">
                {[["paintStains","Paint stains"],["cementStains","Cement stains"],["glueStains","Glue/silicone stains"],["heavyDust","Heavy dust/debris"]].map(([k,l])=><label key={k} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f[k]} onChange={()=>setF(p=>({...p,[k]:!p[k]}))} className="accent-green-600"/> {l}</label>)}
              </div>
            </Fld>
            <Fld label="External Areas to Clean" col><CheckList opts={["Balconies","Compound","Parking area","Drainage","Walkways","Generator house","Security post"]} val={f.externalAreas} onChange={v=>setF(p=>({...p,externalAreas:v}))} cols={3}/></Fld>
            <Fld label="Equipment Likely Required" col><CheckList opts={SA_EQUIP_OPTS} val={f.equipment} onChange={v=>setF(p=>({...p,equipment:v}))} cols={3}/></Fld>
            <Fld label="Chemicals Likely Required" col><CheckList opts={SA_CHEM_OPTS} val={f.chemicals} onChange={v=>setF(p=>({...p,chemicals:v}))} cols={3}/></Fld>
          </div>}

          {/* Pest Control scope */}
          {hasPest&&<div className="space-y-4 p-4 rounded-xl border border-amber-200" style={{background:"#fffbeb"}}>
            <h3 className="text-sm font-bold text-amber-800">🐛 Pest Control Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Severity Level"><select className={inp} value={f.severityLevel} onChange={u("severityLevel")}><option>Mild</option><option>Moderate</option><option>Severe</option><option>Infestation</option></select></Fld>
              <Fld label="Occupancy Status"><select className={inp} value={f.occupancyStatus} onChange={u("occupancyStatus")}><option>Occupied</option><option>Vacant</option><option>Partially occupied</option></select></Fld>
              <Fld label="Previous Treatment?"><select className={inp} value={f.previousTreatment} onChange={u("previousTreatment")}><option>Yes</option><option>No</option></select></Fld>
              {f.previousTreatment==="Yes"&&<Fld label="Date of Previous Treatment"><input className={inp} type="date" value={f.prevTreatmentDate} onChange={u("prevTreatmentDate")}/></Fld>}
              <Fld label="Recommended Re-entry Time"><input className={inp} value={f.reentryTime} onChange={u("reentryTime")} placeholder="e.g. 4 hours, overnight"/></Fld>
              <Fld label="Follow-up Visit Required?"><select className={inp} value={f.followUpVisit} onChange={u("followUpVisit")}><option>Yes</option><option>No</option></select></Fld>
              {f.followUpVisit==="Yes"&&<><Fld label="No. of Follow-up Visits"><input className={inp} type="number" min="1" value={f.numFollowUps} onChange={u("numFollowUps")}/></Fld><Fld label="Warranty Period"><input className={inp} value={f.warrantyPeriod} onChange={u("warrantyPeriod")} placeholder="e.g. 3 months"/></Fld></>}
              <Fld label="Chemicals Used Previously" col><input className={inp} value={f.prevChemicals} onChange={u("prevChemicals")} placeholder="If known"/></Fld>
              <Fld label="Sensitivities (children, pets, food, equipment)" col><input className={inp} value={f.sensitivities} onChange={u("sensitivities")}/></Fld>
              <Fld label="Safety Precautions Required" col><input className={inp} value={f.safetyPrecautions} onChange={u("safetyPrecautions")}/></Fld>
            </div>
            <Fld label="Pest Types Identified" col><CheckList opts={SA_PEST_TYPES} val={f.pestTypes} onChange={v=>setF(p=>({...p,pestTypes:v}))} cols={3}/></Fld>
            <Fld label="Affected Areas" col><CheckList opts={["Kitchen","Toilets","Rooms","Offices","Store","Ceiling","Roof","Garden","Drains","Compound","Warehouse","Basement","Furniture","Bed frames","Cracks/crevices"]} val={f.affectedAreas} onChange={v=>setF(p=>({...p,affectedAreas:v}))} cols={3}/></Fld>
            <Fld label="Pest Activity Observed" col><CheckList opts={["Droppings","Live pests","Dead pests","Bite marks","Damaged wood","Nests","Smell","Tracks","Holes","Eggs","Stains"]} val={f.pestActivity} onChange={v=>setF(p=>({...p,pestActivity:v}))} cols={3}/></Fld>
            <Fld label="Required Treatment Method" col><CheckList opts={SA_TREATMENT} val={f.treatmentMethod} onChange={v=>setF(p=>({...p,treatmentMethod:v}))} cols={3}/></Fld>
          </div>}

          {/* Janitorial scope */}
          {hasJanitor&&<div className="space-y-4 p-4 rounded-xl border border-blue-200" style={{background:"#eff6ff"}}>
            <h3 className="text-sm font-bold text-blue-800">🏢 Janitorial Service Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Facility Type"><input className={inp} value={f.facilityType} onChange={u("facilityType")}/></Fld>
              <Fld label="No. of Cleaners Required"><input className={inp} type="number" min="1" value={f.numCleaners} onChange={u("numCleaners")}/></Fld>
              <Fld label="Work Schedule"><select className={inp} value={f.workSchedule} onChange={u("workSchedule")}>{["Daily","Weekdays only","Weekends","Shift-based","Custom"].map(s=><option key={s}>{s}</option>)}</select></Fld>
              <Fld label="Preferred Work Hours"><input className={inp} value={f.workHours} onChange={u("workHours")} placeholder="e.g. 7am–3pm"/></Fld>
              <Fld label="Who Supplies Consumables"><select className={inp} value={f.suppliedBy} onChange={u("suppliedBy")}><option>Dust & Wipes</option><option>Client</option><option>Shared</option></select></Fld>
              <Fld label="Uniform Required?"><select className={inp} value={f.uniformRequired} onChange={u("uniformRequired")}><option>Yes</option><option>No</option></select></Fld>
              <Fld label="Supervisor Visit Frequency"><input className={inp} value={f.supervisorFreq} onChange={u("supervisorFreq")} placeholder="e.g. weekly, fortnightly"/></Fld>
              <Fld label="Monthly Budget Expectation (₦)"><input className={inp} type="number" value={f.monthlyBudget} onChange={u("monthlyBudget")}/></Fld>
              <Fld label="Contract Start Date"><input className={inp} type="date" value={f.contractStart} onChange={u("contractStart")}/></Fld>
              <Fld label="Contract Duration"><input className={inp} value={f.contractDuration} onChange={u("contractDuration")} placeholder="e.g. 12 months"/></Fld>
              <Fld label="Daily Cleaning Areas" col><textarea className={inp} rows={2} value={f.dailyAreas} onChange={u("dailyAreas")}/></Fld>
              <Fld label="Weekly Cleaning Areas" col><textarea className={inp} rows={2} value={f.weeklyAreas} onChange={u("weeklyAreas")}/></Fld>
              <Fld label="Site-specific Rules" col><textarea className={inp} rows={2} value={f.siteRules} onChange={u("siteRules")}/></Fld>
            </div>
          </div>}

          {/* Outdoor scope */}
          {hasOutdoor&&<div className="space-y-4 p-4 rounded-xl border border-purple-200" style={{background:"#faf5ff"}}>
            <h3 className="text-sm font-bold" style={{color:"#5b21b6"}}>🏗️ Outdoor / Facade / Pressure Washing</h3>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Height Level"><select className={inp} value={f.heightLevel} onChange={u("heightLevel")}><option>Ground level</option><option>1 floor</option><option>2 floors</option><option>3+ floors</option></select></Fld>
              <Fld label="Access Requirement"><select className={inp} value={f.accessReq} onChange={u("accessReq")}><option>Ladder</option><option>Scaffolding</option><option>Rope access</option><option>Boom lift</option></select></Fld>
              {ynField("Water Source Available","waterSource")}
              {ynField("Power Source Available","powerSource")}
              {ynField("Drainage Available","drainage")}
              {ynField("Traffic Control Required","trafficControl")}
              {ynField("Work Permit Required","workPermit")}
              <Fld label="Best Work Period"><select className={inp} value={f.bestPeriod} onChange={u("bestPeriod")}><option>Morning</option><option>Afternoon</option><option>Weekend</option><option>Night</option></select></Fld>
              <Fld label="Safety Risk Description" col><input className={inp} value={f.safetyRisk} onChange={u("safetyRisk")}/></Fld>
            </div>
            <Fld label="Surface Type" col><CheckList opts={["Interlock","Concrete","Tiles","Walls","Glass","Aluminium cladding","Stone","Painted surface"]} val={f.surfaceType} onChange={v=>setF(p=>({...p,surfaceType:v}))} cols={4}/></Fld>
          </div>}

          {!hasCleaning&&!hasPest&&!hasJanitor&&!hasOutdoor&&<div className="text-center py-8 text-gray-400 text-sm">Go back to Section 2 and select at least one service type to see conditional fields here.</div>}
        </div>}

        {/* SECTION 3: Site & Risk */}
        {sec===3&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>⚠️ Section 4 — Site Condition & Risk Assessment</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Current Condition Summary" col><textarea className={inp} rows={3} value={f.conditionSummary} onChange={u("conditionSummary")}/></Fld>
            <Fld label="Main Challenges Observed" col><textarea className={inp} rows={2} value={f.challenges} onChange={u("challenges")}/></Fld>
            <Fld label="Health & Safety Risks" col><textarea className={inp} rows={2} value={f.healthRisks} onChange={u("healthRisks")}/></Fld>
            {ynField("Fragile/Sensitive Items Present","fragileItems")}
            {ynField("Parking Available","parkingAvail")}
            {ynField("Water Available On-site","waterAvail")}
            {ynField("Electricity Available","electricityAvail")}
            {ynField("Security Clearance Required","securityClearance")}
            <Fld label="Risk Level"><select className={inp} value={f.riskLevel} onChange={u("riskLevel")} style={{borderColor:f.riskLevel==="High"?RED:f.riskLevel==="Medium"?AMBER:"#d1fae5",borderWidth:"1.5px"}}><option>Low</option><option>Medium</option><option>High</option></select></Fld>
            <Fld label="Recommended Team Size"><input className={inp} value={f.recommendedTeam} onChange={u("recommendedTeam")}/></Fld>
            <Fld label="Restricted Areas" col><input className={inp} value={f.restrictedAreas} onChange={u("restrictedAreas")}/></Fld>
            <Fld label="Access Limitations" col><input className={inp} value={f.accessLimitations} onChange={u("accessLimitations")}/></Fld>
            <Fld label="PPE Required" col><input className={inp} value={f.ppeRequired} onChange={u("ppeRequired")} placeholder="e.g. Gloves, mask, goggles, overalls"/></Fld>
            <Fld label="Supervisor Involvement Needed" col><input className={inp} value={f.supervisorInvolvement} onChange={u("supervisorInvolvement")}/></Fld>
            <Fld label="Client Expectations / Notes" col><textarea className={inp} rows={2} value={f.clientExpectations} onChange={u("clientExpectations")}/></Fld>
          </div>
        </div>}

        {/* SECTION 4: Photos */}
        {sec===4&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>📷 Section 5 — Photos & Evidence</div>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold" style={{borderColor:G,color:G}}>
                {uploading?<><div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/>Uploading…</>:<>📷 Take Photo</>}
                <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="hidden" disabled={uploading}/>
              </label>
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold" style={{borderColor:BLUE,color:BLUE}}>
                🖼️ Choose from Gallery
                <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" disabled={uploading}/>
              </label>
            </div>
            {f.photos.length>0&&<div className="grid grid-cols-3 gap-3">
              {f.photos.map((p,i)=><div key={i} className="space-y-1">
                <div className="relative group">
                  <img src={p.url} alt={p.name} className="w-full h-28 object-cover rounded-xl border border-gray-200"/>
                  <button type="button" onClick={()=>setF(prev=>({...prev,photos:prev.photos.filter((_,j)=>j!==i)}))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
                <input className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs" placeholder="Caption (optional)" value={p.caption||""} onChange={e=>setF(prev=>({...prev,photos:prev.photos.map((ph,j)=>j===i?{...ph,caption:e.target.value}:ph)}))}/>
              </div>)}
            </div>}
            {f.photos.length===0&&<p className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">No photos added — capture site entrance, work areas, problem areas, and any evidence</p>}
            <p className="text-xs text-gray-400">{f.photos.length}/10 photos added</p>
          </div>
        </div>}

        {/* SECTION 5: Costing */}
        {sec===5&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>💰 Section 6 — Costing Support (Admin/Supervisor only)</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Est. Workers Required"><input className={inp} value={f.estWorkers} onChange={u("estWorkers")}/></Fld>
            <Fld label="Est. Number of Workdays"><input className={inp} value={f.estWorkdays} onChange={u("estWorkdays")}/></Fld>
            <Fld label="Est. Transport / Logistics (₦)"><input className={inp} type="number" value={f.estTransport} onChange={u("estTransport")}/></Fld>
            <Fld label="Est. Chemical / Material Cost (₦)"><input className={inp} type="number" value={f.estMaterials} onChange={u("estMaterials")}/></Fld>
            <Fld label="Est. Equipment Rental (₦)"><input className={inp} type="number" value={f.estEquipment} onChange={u("estEquipment")}/></Fld>
            <Fld label="Est. Waste Evacuation (₦)"><input className={inp} type="number" value={f.estWasteEvac} onChange={u("estWasteEvac")}/></Fld>
            <Fld label="Est. Supervision Cost (₦)"><input className={inp} type="number" value={f.estSupervision} onChange={u("estSupervision")}/></Fld>
            <Fld label="Suggested Service Charge (₦)"><input className={inp} type="number" value={f.suggestedCharge} onChange={u("suggestedCharge")}/></Fld>
            <Fld label="Suggested Profit Margin (%)"><input className={inp} type="number" value={f.profitMargin} onChange={u("profitMargin")}/></Fld>
            <Fld label="Recommended Quotation Amount (₦)"><input className={inp} type="number" value={f.recommendedQuote} onChange={u("recommendedQuote")}/></Fld>
            <Fld label="Costing Notes" col><textarea className={inp} rows={3} value={f.costingNotes} onChange={u("costingNotes")}/></Fld>
          </div>
          {/* Auto-total */}
          {(f.estTransport||f.estMaterials||f.estEquipment||f.estWasteEvac||f.estSupervision)&&<div className="p-4 rounded-xl" style={{background:GL}}>
            <p className="text-xs font-bold text-green-700 mb-1">Estimated Total Cost</p>
            <p className="text-2xl font-black" style={{color:G}}>₦{([f.estTransport,f.estMaterials,f.estEquipment,f.estWasteEvac,f.estSupervision].reduce((s,v)=>s+(Number(v)||0),0)).toLocaleString()}</p>
            {f.profitMargin&&<p className="text-xs text-gray-500 mt-1">With {f.profitMargin}% margin: ₦{Math.round([f.estTransport,f.estMaterials,f.estEquipment,f.estWasteEvac,f.estSupervision].reduce((s,v)=>s+(Number(v)||0),0)*(1+Number(f.profitMargin)/100)).toLocaleString()}</p>}
          </div>}
        </div>}

        {/* SECTION 6: Recommendation */}
        {sec===6&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>✅ Section 7 — Recommendation & Next Action</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Recommended Service Plan" col><textarea className={inp} rows={3} value={f.recommendedPlan} onChange={u("recommendedPlan")}/></Fld>
            <Fld label="Priority Level"><select className={inp} value={f.priorityLevel} onChange={u("priorityLevel")}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></Fld>
            <Fld label="Proposed Work Date"><input className={inp} type="date" value={f.proposedDate} onChange={u("proposedDate")}/></Fld>
            {ynField("Quotation Required","quotationRequired")}
            {ynField("Create Service Request Immediately","createJobNow")}
            {ynField("Follow-up Required","followUpRequired")}
            {f.followUpRequired==="Yes"&&<><Fld label="Follow-up Date"><input className={inp} type="date" value={f.followUpDate} onChange={u("followUpDate")}/></Fld><Fld label="Assigned Follow-up Officer"><input className={inp} value={f.followUpOfficer} onChange={u("followUpOfficer")}/></Fld></>}
            <Fld label="Assessment Status" col><select className={inp} value={f.status} onChange={u("status")}>{["Draft","Submitted","Reviewed","Quoted","Converted to Job","Closed","Lost"].map(s=><option key={s}>{s}</option>)}</select></Fld>
          </div>
          {/* Summary */}
          <div className="p-4 rounded-xl space-y-2 text-sm" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assessment Summary</p>
            {[["ID",f.assessmentId],["Client",f.clientName],["Services",(f.services||[]).join(", ")],["Site",f.siteAddress],["Officer",f.assessmentOfficer],["Date",f.assessmentDate],["Risk Level",f.riskLevel],["Quotation",f.recommendedQuote?`₦${Number(f.recommendedQuote).toLocaleString()}`:"Not set"],["Photos",`${(f.photos||[]).length} attached`]].map(([l,v])=>v?<div key={l} className="flex gap-2"><span className="text-xs font-bold text-gray-400 w-28 flex-shrink-0">{l}</span><span className="text-xs text-gray-700">{v}</span></div>:null)}
          </div>
        </div>}

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 bg-gray-50/50">
        <button onClick={sec===0?onClose:()=>setSec(s=>s-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
          {sec===0?"Cancel":"← Back"}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={()=>submit("Draft")} className="px-4 py-2.5 rounded-xl text-sm font-semibold border" style={{borderColor:AMBER,color:AMBER}}>Save Draft</button>
          {sec<6
            ?<button onClick={()=>setSec(s=>s+1)} disabled={!canNext[sec]} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Next →</button>
            :<button onClick={()=>submit("Submitted")} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{background:O}}>Submit Assessment ✓</button>
          }
        </div>
      </div>
    </div>
  </div>);}

function AssessmentViewer({assessment:a,onClose,userRole}){
  const isPrivileged=userRole==="Admin"||userRole==="Supervisor";
  const s=(l,v)=>v?<div className="flex gap-3 mb-1.5"><span className="text-xs font-bold text-gray-400 w-40 flex-shrink-0">{l}</span><span className="text-xs text-gray-700">{v}</span></div>:null;
  const section=(title,children)=><div className="mb-6"><h3 className="text-xs font-black uppercase tracking-widest pb-2 mb-3 border-b" style={{color:G}}>{title}</h3>{children}</div>;
  const riskColor=a.riskLevel==="High"?RED:a.riskLevel==="Medium"?AMBER:G;

  const print=()=>{
    const w=window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Assessment ${a.assessmentId}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;padding:24px}
    h1{color:#0B3518;font-size:18px}h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#1B6B2F;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:16px 0 8px}
    .row{display:flex;gap:12px;margin-bottom:6px}.lbl{font-weight:bold;color:#6b7280;min-width:160px;font-size:11px}.val{color:#111827;font-size:11px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}
    img{width:100%;height:100px;object-fit:cover;border-radius:6px}
    .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:bold;background:#dcfce7;color:#166534}
    @media print{button{display:none}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #0B3518">
      <div><h1>Dust & Wipes Limited</h1><p style="color:#6b7280;margin:4px 0 0;font-size:12px">Site Assessment Report</p></div>
      <div style="text-align:right"><p style="font-size:11px;color:#6b7280">Assessment ID</p><p style="font-size:16px;font-weight:bold;color:#0B3518">${a.assessmentId}</p><span class="badge">${a.status}</span></div>
    </div>
    <h2>Client Information</h2>
    <div class="row"><span class="lbl">Client</span><span class="val">${a.clientName||"—"}</span></div>
    <div class="row"><span class="lbl">Contact Person</span><span class="val">${a.contactPerson||"—"}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${a.clientPhone||"—"}</span></div>
    <div class="row"><span class="lbl">Site Address</span><span class="val">${a.siteAddress||"—"}</span></div>
    <div class="row"><span class="lbl">Assessment Date</span><span class="val">${a.assessmentDate||"—"}</span></div>
    <div class="row"><span class="lbl">Officer</span><span class="val">${a.assessmentOfficer||"—"}</span></div>
    <h2>Service Type</h2><p>${(a.services||[]).join(", ")||"—"}</p>
    <h2>Site Condition</h2>
    <div class="row"><span class="lbl">Condition Summary</span><span class="val">${a.conditionSummary||"—"}</span></div>
    <div class="row"><span class="lbl">Risk Level</span><span class="val" style="font-weight:bold;color:${riskColor}">${a.riskLevel||"—"}</span></div>
    <div class="row"><span class="lbl">Challenges</span><span class="val">${a.challenges||"—"}</span></div>
    <div class="row"><span class="lbl">PPE Required</span><span class="val">${a.ppeRequired||"—"}</span></div>
    ${(a.photos||[]).length>0?`<h2>Photos</h2><div class="grid">${(a.photos||[]).map(p=>`<div><img src="${p.url}" alt=""/><p style="font-size:10px;color:#6b7280">${p.caption||""}</p></div>`).join("")}</div>`:""}
    <h2>Recommendation</h2>
    <div class="row"><span class="lbl">Recommended Plan</span><span class="val">${a.recommendedPlan||"—"}</span></div>
    <div class="row"><span class="lbl">Priority</span><span class="val">${a.priorityLevel||"—"}</span></div>
    <div class="row"><span class="lbl">Proposed Date</span><span class="val">${a.proposedDate||"—"}</span></div>
    ${isPrivileged&&a.recommendedQuote?`<h2>Costing (Confidential)</h2><div class="row"><span class="lbl">Recommended Quote</span><span class="val" style="font-weight:bold">₦${Number(a.recommendedQuote).toLocaleString()}</span></div><div class="row"><span class="lbl">Notes</span><span class="val">${a.costingNotes||"—"}</span></div>`:""}
    <div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;display:flex;justify-content:space-between">
      <div><p style="font-size:11px;color:#6b7280">Prepared by: ${a.assessmentOfficer||"—"}</p><p style="font-size:11px;color:#6b7280">Date: ${a.assessmentDate||"—"}</p></div>
      <div style="text-align:right"><p style="font-size:11px;color:#6b7280">Dust & Wipes Limited · Abuja, Nigeria</p><p style="font-size:11px;color:#6b7280">app.dustandwipes.com</p></div>
    </div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
    </body></html>`);
    w.document.close();
  };

  return(<ModalWrap title={`Assessment Report — ${a.assessmentId}`} onClose={onClose} xl>
    <div className="flex gap-2 mb-4 pb-4 border-b">
      <button onClick={print} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>📄 Download PDF</button>
      <span className="text-xs self-center text-gray-400">Print dialog will open — use "Save as PDF"</span>
    </div>
    <div className="text-sm">
      {section("Section 1 — Client Information",<>
        {s("Client",a.clientName)}{s("Contact Person",a.contactPerson)}{s("Phone",a.clientPhone)}{s("Email",a.clientEmail)}
        {s("Site Address",a.siteAddress)}{s("City/State",a.cityState)}{s("Assessment Date",a.assessmentDate)}
        {s("Officer",a.assessmentOfficer)}{s("Source",a.sourceOfRequest)}{s("Client Type",a.clientType)}
      </>)}
      {section("Section 2 — Services",(a.services||[]).length>0?<div className="flex flex-wrap gap-2">{(a.services||[]).map(sv=><span key={sv} className="text-xs px-3 py-1 rounded-full font-semibold" style={{background:GL,color:G}}>{sv}</span>)}</div>:<p className="text-xs text-gray-400">None selected</p>)}
      {section("Section 3 — Scope",<>
        {a.numFloors&&s("Floors",a.numFloors)}{a.numRooms&&s("Rooms/Offices",a.numRooms)}{a.numToilets&&s("Toilets/Bathrooms",a.numToilets)}
        {(a.floorType||[]).length>0&&s("Floor Type",a.floorType.join(", "))}{a.wallCondition&&s("Wall Condition",a.wallCondition)}
        {(a.pestTypes||[]).length>0&&s("Pest Types",a.pestTypes.join(", "))}{a.severityLevel&&s("Severity",a.severityLevel)}
        {(a.treatmentMethod||[]).length>0&&s("Treatment",a.treatmentMethod.join(", "))}
        {(a.equipment||[]).length>0&&s("Equipment",a.equipment.join(", "))}{(a.chemicals||[]).length>0&&s("Chemicals",a.chemicals.join(", "))}
        {a.estimatedWorkers&&s("Est. Workers",a.estimatedWorkers)}{a.estimatedDuration&&s("Est. Duration",a.estimatedDuration)}
      </>)}
      {section("Section 4 — Site Condition & Risk",<>
        {s("Summary",a.conditionSummary)}{s("Challenges",a.challenges)}{s("Health Risks",a.healthRisks)}
        <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-bold text-gray-400 w-40">Risk Level</span><span className="text-xs font-black px-3 py-0.5 rounded-full text-white" style={{background:riskColor}}>{a.riskLevel||"—"}</span></div>
        {s("PPE Required",a.ppeRequired)}{s("Team Size",a.recommendedTeam)}{s("Client Expectations",a.clientExpectations)}
      </>)}
      {(a.photos||[]).length>0&&section(`Section 5 — Photos (${a.photos.length})`,<div className="grid grid-cols-3 gap-2">{(a.photos||[]).map((p,i)=><div key={i}><img src={p.url} alt={p.caption||"Photo"} className="w-full h-24 object-cover rounded-xl border border-gray-200"/>{p.caption&&<p className="text-xs text-gray-400 mt-0.5 text-center">{p.caption}</p>}</div>)}</div>)}
      {isPrivileged&&section("Section 6 — Costing (Confidential)",<>
        {s("Est. Workers",a.estWorkers)}{s("Est. Workdays",a.estWorkdays)}
        {a.estTransport&&s("Est. Transport",`₦${Number(a.estTransport).toLocaleString()}`)}{a.estMaterials&&s("Est. Materials",`₦${Number(a.estMaterials).toLocaleString()}`)}
        {a.recommendedQuote&&<div className="mt-2 p-3 rounded-xl" style={{background:GL}}><p className="text-xs font-bold text-gray-500">Recommended Quote</p><p className="text-2xl font-black" style={{color:G}}>₦{Number(a.recommendedQuote).toLocaleString()}</p></div>}
        {s("Costing Notes",a.costingNotes)}
      </>)}
      {section("Section 7 — Recommendation",<>
        {s("Recommended Plan",a.recommendedPlan)}{s("Priority",a.priorityLevel)}{s("Proposed Date",a.proposedDate)}
        {s("Quotation Required",a.quotationRequired)}{s("Follow-up Required",a.followUpRequired)}
        {a.followUpDate&&s("Follow-up Date",a.followUpDate)}{a.followUpOfficer&&s("Follow-up Officer",a.followUpOfficer)}
      </>)}
    </div>
  </ModalWrap>);}


