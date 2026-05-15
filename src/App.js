// Dust & Wipes Operations Hub -- OperationsHub_v6.jsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Users, FileText, BarChart2, Settings, LogOut, Menu, Bell, Home, Bug, AlertTriangle, Search, ClipboardList, Package, Briefcase, Inbox, Gift, Wallet, ClipboardCheck, UserCheck, MapPin, WifiOff } from "lucide-react";

// ── lib/ extractions (Phase 2 of TS migration) ───────────────────────────────
import { GD, O, RED, FREQ_DAYS } from "./lib/constants";
import { drainOfflineQueue } from "./lib/offline";
import {
  SUPABASE_URL, SUPABASE_ANON_KEY, T,
  dbLoad, dbSync,
  loadContacts, loadActivityLog,
} from "./lib/supabase";

// ── UI primitives + composite components (Phase 3) ───────────────────────────
import { Toaster } from "./components/ui/Toaster";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { buildNotifs, NotifPanel } from "./components/NotifPanel";

// ── Page modules (Phase 4 of TS migration) ───────────────────────────────────
import { BirthdaysPage } from "./pages/Birthdays";
import { ContractsPage } from "./pages/Contracts";
import { SchedulePage } from "./pages/Schedule";
import { InventoryPage } from "./pages/Inventory";
import { RequestsPage } from "./pages/Requests";
import { AbsenceCoverPage } from "./pages/AbsenceCover";
import { AnalyticsPage } from "./pages/Analytics";
import { StaffPage } from "./pages/Staff";
import { LoginScreen } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ClientsPage } from "./pages/Clients";
import { JobsPage } from "./pages/Jobs";
import { SettingsPage } from "./pages/Settings";
import { SiteReportsPage } from "./pages/SiteReports";
import { RequisitionsPage } from "./pages/Requisitions";
import { ImprestPage } from "./pages/Imprest";
import { AssessmentsPage } from "./pages/Assessments";

const APP_NAME="Operations Hub", APP_SUB="Dust & Wipes Limited";
const LOGO_B64_PARTS = [
  "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",
];
const LOGO_DATA = "data:image/jpeg;base64," + LOGO_B64_PARTS.join("");
// For production (Vercel), the file /public/icons/logo.png is also served
const LOGO = LOGO_DATA;

// SUPABASE: extracted to ./lib/supabase.ts in Phase 2 — imported at top of file.


// Offline queue + hashPw moved to ./lib/offline.ts and ./lib/auth.ts (Phase 2).

// Format helpers + brand constants moved to ./lib/format.ts and ./lib/constants.ts (Phase 2).
// Only App.js-local UI tokens remain:


// -- MASTER SUPPLY ITEMS (APRIL 2026 actuals + standard stock) ----------------
const INITIAL_SUPPLY_MASTER=[
  {id:"s1", name:"Liquid Soap (4.5 ltr)",        unit:"bottle",cost:4500, cat:"Cleaning",    active:true},
  {id:"s2", name:"Liquid Soap (3 ltr)",           unit:"bottle",cost:3000, cat:"Cleaning",    active:true},
  {id:"s3", name:"Liquid Soap (4 ltr)",           unit:"bottle",cost:4000, cat:"Cleaning",    active:true},
  {id:"s4", name:"Glass Cleaner",                 unit:"bottle",cost:2500, cat:"Cleaning",    active:true},
  {id:"s5", name:"Hypo Toilet Cleaner",           unit:"bottle",cost:3500, cat:"Cleaning",    active:true},
  {id:"s6", name:"CH Bleach",                     unit:"bottle",cost:6000, cat:"Cleaning",    active:true},
  {id:"s7", name:"Small CH Bleach",               unit:"bottle",cost:2500, cat:"Cleaning",    active:true},
  {id:"s8", name:"Harpic Bleach Toilet Wash",     unit:"bottle",cost:4500, cat:"Cleaning",    active:true},
  {id:"s9", name:"Viva Detergent",                unit:"sachet",cost:1900, cat:"Cleaning",    active:true},
  {id:"s10",name:"Morning Fresh",                 unit:"bottle",cost:2500, cat:"Cleaning",    active:true},
  {id:"s11",name:"Morning Fresh (Medium)",        unit:"bottle",cost:1500, cat:"Cleaning",    active:true},
  {id:"s12",name:"Scouring Powder",               unit:"tin",   cost:1000, cat:"Cleaning",    active:true},
  {id:"s13",name:"Mr Sheen",                      unit:"bottle",cost:2000, cat:"Cleaning",    active:true},
  {id:"s14",name:"Fabuloso",                      unit:"bottle",cost:16000,cat:"Cleaning",    active:true},
  {id:"s15",name:"Soft Iron Sponge",              unit:"piece", cost:500,  cat:"Cleaning",    active:true},
  {id:"s16",name:"Multi-surface Cleaner (5L)",    unit:"bottle",cost:3500, cat:"Cleaning",    active:true},
  {id:"s17",name:"Disinfectant Concentrate (5L)", unit:"bottle",cost:4200, cat:"Cleaning",    active:true},
  {id:"s18",name:"Air Freshener",                 unit:"can",   cost:1200, cat:"Air Care",    active:true},
  {id:"s19",name:"Air Freshener GBC",             unit:"can",   cost:1500, cat:"Air Care",    active:true},
  {id:"s20",name:"Camphor (unit)",                unit:"piece", cost:1500, cat:"Air Care",    active:true},
  {id:"s21",name:"Camphor (large pack)",          unit:"pack",  cost:15000,cat:"Air Care",    active:true},
  {id:"s22",name:"Trash Bag",                     unit:"roll",  cost:1000, cat:"Consumables", active:true},
  {id:"s23",name:"Trash Liner",                   unit:"pack",  cost:2500, cat:"Consumables", active:true},
  {id:"s24",name:"Trash Liner (2-in-1)",          unit:"pack",  cost:2000, cat:"Consumables", active:true},
  {id:"s25",name:"Rose Belle Tissue (bag 48pcs)", unit:"bag",   cost:22000,cat:"Consumables", active:true},
  {id:"s26",name:"Dust Packer",                   unit:"piece", cost:1500, cat:"Consumables", active:true},
  {id:"s27",name:"Hand Wash (First Guard)",       unit:"bottle",cost:2000, cat:"Hygiene",     active:true},
  {id:"s28",name:"Hand Wash (Protect Care)",      unit:"bottle",cost:3000, cat:"Hygiene",     active:true},
  {id:"s29",name:"Hand Wash (Generic)",           unit:"bottle",cost:1500, cat:"Hygiene",     active:true},
  {id:"s30",name:"Hand Gloves",                   unit:"pack",  cost:5500, cat:"PPE",         active:true},
  {id:"s31",name:"Face Masks (box 50)",           unit:"box",   cost:1500, cat:"PPE",         active:true},
  {id:"s32",name:"Mop Head",                      unit:"piece", cost:5000, cat:"Equipment",   active:true},
  {id:"s33",name:"Mop Stick",                     unit:"piece", cost:2500, cat:"Equipment",   active:true},
  {id:"s34",name:"Sweeping Brush",                unit:"piece", cost:4500, cat:"Equipment",   active:true},
  {id:"s35",name:"Brooms",                        unit:"piece", cost:1500, cat:"Equipment",   active:true},
  {id:"s36",name:"Micro Fiber Towels",            unit:"piece", cost:1000, cat:"Equipment",   active:true},
  {id:"s41",name:"Squeegee",                       unit:"piece", cost:2500, cat:"Equipment",   active:true},
  {id:"s42",name:"Cobweb Remover",                 unit:"piece", cost:1800, cat:"Equipment",   active:true},
];

// -- SEED DATA ----------------------------------------------------------------
// ⚠️  Passwords are NO LONGER stored here. User accounts are managed via Supabase Auth.
//    The dw_users table holds: id, name, role, initial, email/username (no password).
//    Fallback below is only shown if the DB hasn't loaded yet (first render flash).
const INITIAL_USERS=[
  {id:"u1",email:"bisit@dustandwipes.com",       role:"Admin",      name:"Bisit Admin",   initial:"B"},
  {id:"u2",email:"james.akpa@dustandwipes.com",  role:"Supervisor", name:"James Akpa",    initial:"J"},
  {id:"u3",email:"agnes.dung@dustandwipes.com",  role:"Supervisor", name:"Agnes Dung",    initial:"A"},
  {id:"u4",username:"08183006297",               role:"Technician", name:"Faith Apeh",    initial:"F"},
  {id:"u5",username:"08160939949",               role:"Technician", name:"Veronica Apeh", initial:"V"},
  {id:"u6",username:"08099700001",               role:"Technician", name:"Info Desk",     initial:"I"},
];



// -- SEED_STAFF removed for security (NDPR/GDPR compliance) ----------------
// Staff personal data (bank accounts, home addresses, emergency contacts) is
// stored exclusively in Supabase (dw_staff table). It was seeded on first run
// and must never be committed to source control again.
// To add / edit staff, use the Staff module inside the app.
const SEED_STAFF = []; // intentionally empty — DB is authoritative


// -- SHARED UI ----------------------------------------------------------------

// Print/download all requisitions as HTML report
// (Legacy — superseded by per-module PrintReportButtons; kept for potential reuse)
// eslint-disable-next-line no-unused-vars
const printAllRequisitions = (requisitions, supplyItems, users) => {
  const fmt = n => isNaN(Number(n)) ? n : "₦"+Number(n).toLocaleString();
  const fmtD = d => { try{ return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}catch{return d||"—";}};
  const w = window.open("", "_blank");
  const rows = requisitions.map(r => {
    const items = (r.items||[]).filter(i=>i.qty>0);
    const total = items.reduce((s,i)=>s+(i.qty*(i.cost||0)),0);
    return `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px 6px;font-size:11px;color:#6b7280">${r.id||"—"}</td>
      <td style="padding:8px 6px;font-size:12px;font-weight:600">${r.site||"—"}</td>
      <td style="padding:8px 6px;font-size:11px">${r.month||""} ${r.year||""}</td>
      <td style="padding:8px 6px;font-size:11px">${r.submittedBy||"—"}</td>
      <td style="padding:8px 6px;font-size:11px">${fmtD(r.submittedAt)}</td>
      <td style="padding:8px 6px;font-size:11px">${items.length} items</td>
      <td style="padding:8px 6px;font-size:12px;font-weight:bold;color:#1B6B2F">${fmt(total)}</td>
      <td style="padding:8px 6px"><span style="background:${r.status==="Approved"?"#dcfce7":r.status==="Rejected"?"#fee2e2":"#fff7ed"};color:${r.status==="Approved"?"#166534":r.status==="Rejected"?"#991b1b":"#92400e"};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold">${r.status||"Pending"}</span></td>
    </tr>
    <tr><td colspan="8" style="padding:4px 6px 12px 20px;font-size:10px;color:#9ca3af">
      ${items.map(i=>`${i.item||i.name}: ${i.qty} ${i.unit||""} × ${fmt(i.cost||0)} = ${fmt(i.qty*(i.cost||0))}`).join(" &nbsp;|&nbsp; ")}
    </td></tr>`;
  }).join("");
  const total_all = requisitions.reduce((s,r)=>{const items=(r.items||[]).filter(i=>i.qty>0);return s+items.reduce((ss,i)=>ss+(i.qty*(i.cost||0)),0);},0);
  w.document.write(`<!DOCTYPE html><html><head><title>All Requisitions — Dust & Wipes</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}
  table{width:100%;border-collapse:collapse}th{background:#0B3518;color:white;padding:10px 6px;font-size:11px;text-align:left;font-weight:bold}
  @media print{button{display:none}}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0B3518;padding-bottom:16px;margin-bottom:16px">
    <div><h1 style="color:#0B3518;margin:0;font-size:20px">Dust & Wipes Limited</h1><p style="color:#6b7280;margin:4px 0 0;font-size:13px">Supply Requisitions Report — ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</p></div>
    <div style="text-align:right"><p style="font-size:12px;color:#6b7280">${requisitions.length} requisitions</p><p style="font-size:18px;font-weight:bold;color:#1B6B2F">Total: ${fmt(total_all)}</p></div>
  </div>
  <table><thead><tr><th>ID</th><th>Site</th><th>Period</th><th>Submitted By</th><th>Date</th><th>Items</th><th>Value</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">Generated from Dust & Wipes Operations Hub · app.dustandwipes.com</div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`);
  w.document.close();
};








export default function App(){
  const[user,        setUser]        =useState(null);
  const[page,        setPage]        =useState("dashboard");
  const[sidebar,     setSidebar]     =useState(true);
  const[users,       setUsers]       =useState(INITIAL_USERS);
  const[staff,       setStaff]       =useState([]); // loaded from dw_staff
  const[clients,     setClients]     =useState([]);
  const[schedules,   setSchedules]   =useState([]);
  const[requests,    setRequests]    =useState([]);
  const[jobs,        setJobs]        =useState([]);
  const[inventory,   setInventory]   =useState([]);
  const[siteReports, setSiteReports] =useState([]);
  const[contacts,    setContacts]    =useState([]); // loaded from dw_contacts
  const[activityLog, setActivityLog] =useState([]);
  const[supplyItems, setSupplyItems] =useState([]);
  const[requisitions,setRequisitions]=useState([]);
  const[absences,    setAbsences]    =useState([]);
  const[covers,      setCovers]      =useState([]);
  const[imprests,    setImprests]    =useState([]);
  const[assessments, setAssessments] =useState([]);
  const[showNotif,   setShowNotif]   =useState(false);
  const[showSearch,  setShowSearch]  =useState(false);
  const[isOnline,    setIsOnline]    =useState(()=>navigator.onLine);
  const[readIds,     setReadIds]     =useState(()=>{try{const s=localStorage.getItem("dw_readNotifs");return s?JSON.parse(s):[];}catch{return[];}});
  const[dbStatus,    setDbStatus]    =useState("ok"); // DB loads in background
  const[dbLoading,   setDbLoading]   =useState(true);
  const notifRef   = useRef(null);
  const dbLoaded   = useRef(false);   // true after first load from Supabase
  const syncTimers = useRef({});      // debounce timers per table

  // -- Supabase: load all data on mount ---------------------------------------
  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.allSettled([
          dbLoad("clients",     setClients),
          dbLoad("jobs",        setJobs),
          dbLoad("requests",    setRequests),
          dbLoad("schedules",   setSchedules),
          dbLoad("reports",     setSiteReports),
          loadContacts(setContacts),
          loadActivityLog(setActivityLog),
          dbLoad("inventory",   setInventory),
          (async()=>{
            const url=`${SUPABASE_URL}/rest/v1/${T("supplyitems")}?select=id,record&order=updated_at.desc`;
            try{const r=await fetch(url,{headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`}});
              if(!r.ok)throw new Error(`HTTP ${r.status}`);
              const data=await r.json();
              const records=Array.isArray(data)?data.map(d=>d.record).filter(Boolean):[];
              if(records.length===0){setSupplyItems(INITIAL_SUPPLY_MASTER);dbSync("supplyitems",INITIAL_SUPPLY_MASTER);}
              else setSupplyItems(records);
            }catch(e){console.warn("[DB] load supplyitems:",e.message);setSupplyItems(INITIAL_SUPPLY_MASTER);}
          })(),
          dbLoad("requisitions",setRequisitions),
          dbLoad("absences",    setAbsences),
          dbLoad("covers",      setCovers),
          dbLoad("assessments", setAssessments),
          dbLoad("imprests",    setImprests),
          (async()=>{
            const url=`${SUPABASE_URL}/rest/v1/${T("staff")}?select=id,record&order=updated_at.desc`;
            try{
              const r=await fetch(url,{headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`}});
              if(!r.ok)throw new Error(`HTTP ${r.status}`);
              const data=await r.json();
              const records=Array.isArray(data)?data.map(d=>d.record).filter(Boolean):[];
              if(records.length===0){
                // First ever load — write SEED_STAFF to DB once, then use DB from now on
                setStaff(SEED_STAFF);
                dbSync("staff",SEED_STAFF);
              } else {
                // DB is fully authoritative — show exactly what is in the database
                setStaff(records);
              }
            }catch(e){console.warn("[DB] load staff:",e.message);setStaff(SEED_STAFF);}
          })(),
          dbLoad("users",       u => {
            if(u && u.length > 0) setUsers(u);
          }),
        ]);
        setDbStatus("ok");
      } catch(e) {
        console.error("[DB] initial load failed:", e);
        setDbStatus("error");
      } finally {
        dbLoaded.current = true;
        setDbLoading(false);
      }
    };
    loadAll();
  }, []);

  // -- Supabase: debounced sync whenever state changes -----------------------
  const debouncedSync = useCallback((table, data) => {
    if (!dbLoaded.current) return;
    clearTimeout(syncTimers.current[table]);
    syncTimers.current[table] = setTimeout(() => dbSync(table, data), 300);
  }, []);

  useEffect(() => { debouncedSync("clients",     clients);     }, [clients,     debouncedSync]);
  useEffect(() => { debouncedSync("jobs",         jobs);        }, [jobs,        debouncedSync]);
  useEffect(() => { debouncedSync("requests",     requests);    }, [requests,    debouncedSync]);
  useEffect(() => { debouncedSync("schedules",    schedules);   }, [schedules,   debouncedSync]);
  useEffect(() => { debouncedSync("reports",      siteReports); }, [siteReports, debouncedSync]);
  useEffect(() => { debouncedSync("inventory",    inventory);   }, [inventory,   debouncedSync]);
  useEffect(() => { debouncedSync("supplyitems",  supplyItems); }, [supplyItems, debouncedSync]);
  useEffect(() => { debouncedSync("requisitions", requisitions);}, [requisitions,debouncedSync]);
  useEffect(() => { debouncedSync("absences",     absences);    }, [absences,    debouncedSync]);
  useEffect(() => { debouncedSync("covers",       covers);      }, [covers,      debouncedSync]);
  // imprests intentionally excluded: ImprestPage uses targeted single-record syncs (saveOne/dbSync)
  // to prevent stale-session overwrites. A broad debounce here would re-upload stale full arrays.
  useEffect(() => { debouncedSync("assessments", assessments); }, [assessments, debouncedSync]);
  useEffect(() => { debouncedSync("staff",        staff);       }, [staff,       debouncedSync]);
  useEffect(() => { debouncedSync("users",        users);       }, [users,       debouncedSync]);

  // -- Auto-schedule recurring jobs from contract service frequency -------------
  // Runs whenever clients or jobs change (after initial DB load).
  // Creates a "Scheduled" job for each active client whose serviceFreq window is due
  // within the next 14 days and has no existing job already covering that window.
  // Uses deterministic IDs (auto-{clientId}-{dueDate}) so re-runs are fully idempotent.
  useEffect(()=>{
    if(!dbLoaded.current||clients.length===0)return;
    const todayStr=new Date().toISOString().split("T")[0];
    const today=new Date(todayStr);
    const LOOKAHEAD=14;
    const toAdd=[];
    clients.forEach(client=>{
      const freq=client.serviceFreq;
      if(!freq||!FREQ_DAYS[freq])return; // no freq or One-Time
      const expiry=client.ce?new Date(client.ce):null;
      if(expiry&&expiry<today)return; // contract expired
      const freqDays=FREQ_DAYS[freq];
      // Last job for this client sorted most-recent first
      const clientJobs=jobs.filter(j=>j.clientName===client.name&&j.date).sort((a,b)=>b.date.localeCompare(a.date));
      let nextDue=new Date(today);
      if(clientJobs.length>0){
        const lastDate=new Date(clientJobs[0].date);
        nextDue=new Date(lastDate);
        nextDue.setDate(nextDue.getDate()+freqDays);
      }
      // If overdue bring it to today; if beyond lookahead skip
      if(nextDue<today)nextDue=new Date(today);
      const windowEnd=new Date(today);
      windowEnd.setDate(windowEnd.getDate()+LOOKAHEAD);
      if(nextDue>windowEnd)return;
      const nextDueStr=nextDue.toISOString().split("T")[0];
      const autoId=`auto-${client.id}-${nextDueStr}`;
      // Skip if this exact auto-job already exists
      if(jobs.some(j=>j.id===autoId))return;
      // Also skip if any non-closed job for this client already covers a ±3-day window
      const winStart=new Date(nextDue);winStart.setDate(winStart.getDate()-3);
      const winStartStr=winStart.toISOString().split("T")[0];
      const covered=jobs.some(j=>j.clientName===client.name&&j.date&&j.date>=winStartStr&&j.date<=nextDueStr&&j.status!=="Closed");
      if(covered)return;
      toAdd.push({id:autoId,clientName:client.name,clientPhone:client.phone||"",loc:client.addr||"",svc:client.svc||"Cleaning",date:nextDueStr,sup:"",techs:"",status:"Scheduled",notes:`Auto-scheduled (${freq})`,autoScheduled:true,checkIn:null,checkOut:null});
    });
    if(toAdd.length===0)return;
    setJobs(js=>{
      const existingIds=new Set(js.map(j=>j.id));
      const truly=toAdd.filter(j=>!existingIds.has(j.id));
      if(truly.length===0)return js;
      const updated=[...js,...truly];
      dbSync("jobs",updated);
      Toaster._add?.(`${truly.length} recurring job${truly.length>1?"s":""} auto-scheduled`,"info");
      return updated;
    });
  },[clients,jobs]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Flush pending syncs when tab loses visibility (user switches away / closes) --
  const latestStateRef = useRef({});
  latestStateRef.current = { reports: siteReports, imprests, clients, jobs, requests, schedules, inventory, supplyitems: supplyItems, requisitions, absences, covers, staff, users, assessments };
  useEffect(() => {
    const flush = () => {
      if (!dbLoaded.current) return;
      Object.keys(syncTimers.current).forEach(table => {
        clearTimeout(syncTimers.current[table]);
        delete syncTimers.current[table];
      });
      // Skip imprests: all imprest writes use targeted single-record syncs;
      // flushing the full array here could overwrite other sessions' expenses with stale data.
      Object.entries(latestStateRef.current).forEach(([table, data]) => { if (table !== "imprests") dbSync(table, data); });
    };
    const onVisChange = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Online / offline detection + queue drain --------------------------------
  useEffect(()=>{
    // Drain any queue items left from a previous offline session
    if(navigator.onLine&&dbLoaded.current){
      const n=drainOfflineQueue(setJobs, dbSync);
      if(n>0)Toaster._add?.(`${n} offline action${n>1?"s":""} synced`,"success");
    }
    const handleOnline=()=>{
      setIsOnline(true);
      const n=drainOfflineQueue(setJobs, dbSync);
      if(n>0)Toaster._add?.(`${n} offline action${n>1?"s":""} synced to server`,"success");
    };
    const handleOffline=()=>{
      setIsOnline(false);
      Toaster._add?.("You are offline — actions will sync when reconnected","info");
    };
    // Service Worker background-sync message handler
    const handleSwMessage=e=>{
      if(e.data?.type==="DW_DRAIN_OFFLINE_QUEUE"){
        const n=drainOfflineQueue(setJobs, dbSync);
        if(n>0)Toaster._add?.(`${n} queued action${n>1?"s":""} synced via background sync`,"success");
      }
    };
    window.addEventListener("online",handleOnline);
    window.addEventListener("offline",handleOffline);
    navigator.serviceWorker?.addEventListener("message",handleSwMessage);
    return()=>{
      window.removeEventListener("online",handleOnline);
      window.removeEventListener("offline",handleOffline);
      navigator.serviceWorker?.removeEventListener("message",handleSwMessage);
    };
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Notifications ----------------------------------------------------------
  const allNotifs=useMemo(()=>buildNotifs(clients,jobs,inventory),[clients,jobs,inventory]);
  const liveNotifs=useMemo(()=>allNotifs.map(n=>({...n,read:readIds.includes(n.id)})),[allNotifs,readIds]);
  const unread=useMemo(()=>liveNotifs.filter(n=>!n.read).length,[liveNotifs]);
  const markRead=id=>setReadIds(r=>[...r,id]);
  // Persist read notification IDs across page refreshes
  useEffect(()=>{try{localStorage.setItem("dw_readNotifs",JSON.stringify(readIds));}catch{};},[readIds]);
  useEffect(()=>{const h=e=>{if(notifRef.current&&!notifRef.current.contains(e.target))setShowNotif(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  // Global ⌘K / Ctrl+K shortcut to open search
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowSearch(s=>!s);}if(e.key==="Escape")setShowSearch(false);};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[]);

  const handleLogin=u=>{setUser(u);setPage("dashboard");};

  // Show loading screen FIRST so users[] is fully populated from DB before login renders.
  // This ensures the local-hash fallback has access to pwHash stored in Supabase.
  if(dbLoading) return(
    <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
      <img src={LOGO} alt="D&W" className="w-14 rounded-xl bg-white p-1 shadow-md animate-pulse"/>
      <p className="text-sm font-semibold text-gray-500">Loading Operations Hub…</p>
    </div>
  );

  // ── Supabase config gate ──────────────────────────────────────────────────
  // If environment variables are not set (e.g. Vercel project settings missing),
  // every dbLoad call fails silently and all data appears empty.
  // Show an actionable error screen so the issue is immediately obvious.
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY) return(
    <div className="flex h-screen items-center justify-center bg-red-50 flex-col gap-5 p-8 text-center">
      <AlertTriangle size={48} className="text-red-500"/>
      <div>
        <h2 className="text-2xl font-black text-red-800 mb-1">Supabase Not Configured</h2>
        <p className="text-red-600 max-w-md mx-auto text-sm">The database connection environment variables are missing. No data can load until these are set.</p>
      </div>
      <div className="bg-white rounded-2xl p-5 text-left text-sm max-w-lg w-full shadow border border-red-100">
        <p className="font-bold text-gray-700 mb-3">Set these in Vercel → Project Settings → Environment Variables:</p>
        <div className="space-y-2 font-mono">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">REACT_APP_SUPABASE_URL</div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-blue-700 border border-gray-200">REACT_APP_SUPABASE_ANON_KEY</div>
        </div>
        <p className="text-gray-500 text-xs mt-3">After adding them, go to Vercel → Deployments → Redeploy (without clearing cache).</p>
      </div>
      <p className="text-red-400 text-xs">Values are in <span className="font-mono">.env.local</span> on the developer machine.</p>
    </div>
  );

  if(!user) return <LoginScreen onLogin={handleLogin} users={users} clients={clients}/>;

  const NAV=[
    {id:"dashboard",   label:"Dashboard",       icon:Home,          roles:["Admin","Supervisor"]},
    {id:"clients",     label:"Clients",          icon:Users,         roles:["Admin","Supervisor"]},
    {id:"contracts",   label:"Contracts",        icon:FileText,      roles:["Admin","Supervisor"]},
    {id:"requests",    label:"Service Requests", icon:Inbox,         roles:["Admin","Supervisor"]},
    {id:"jobs",        label:"Jobs",             icon:Briefcase,     roles:["Admin","Supervisor"]},
    {id:"schedule",    label:"Pest Schedule",    icon:Bug,           roles:["Admin","Supervisor"]},
    {id:"site_reports",label:"Site Reports",     icon:ClipboardList, roles:["Admin","Supervisor"]},
    {id:"inventory",   label:"Inventory",        icon:Package,       roles:["Admin","Supervisor"]},
    {id:"requisitions",label:"Requisitions",     icon:ClipboardCheck,roles:["Admin","Supervisor","Technician"]},
    {id:"absencecover",label:"Absence & Cover",  icon:UserCheck,     roles:["Admin","Supervisor"]},
    {id:"birthdays",   label:"Birthdays",        icon:Gift,          roles:["Admin","Supervisor"]},
    {id:"imprest",     label:"Imprest Fund",     icon:Wallet,        roles:["Admin","Supervisor"]},
    {id:"assessments", label:"Site Assessments",  icon:MapPin,        roles:["Admin","Supervisor"]},
    {id:"analytics",   label:"Analytics",        icon:BarChart2,     roles:["Admin"]},
    {id:"staff",       label:"Staff",            icon:Users,         roles:["Admin","Supervisor"]},
    {id:"settings",    label:"Settings",         icon:Settings,      roles:["Admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const pageTitle=NAV.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Global toast — renders above everything */}
      <Toaster/>
      {/* Global ⌘K search palette */}
      {showSearch&&<GlobalSearch clients={clients} jobs={jobs} staff={staff} inventory={inventory} requests={requests} onNav={p=>{setPage(p);}} onClose={()=>setShowSearch(false)}/>}
      <aside className={`${sidebar?"w-60":"w-14"} transition-all duration-200 flex flex-col flex-shrink-0`} style={{background:GD}}>
        <div className="h-16 flex items-center px-3 border-b gap-2 flex-shrink-0" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <img src={LOGO} alt="D&W" className="w-8 h-8 object-contain flex-shrink-0 rounded-lg bg-white p-0.5 border border-gray-100"/>
          {sidebar&&<div className="overflow-hidden"><div className="text-white text-sm font-black leading-tight whitespace-nowrap">{APP_NAME}</div><div className="text-xs whitespace-nowrap" style={{color:"#6EAD7E"}}>{APP_SUB}</div></div>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {NAV.map(item=>{const Icon=item.icon;const active=page===item.id;return(
            <button key={item.id} title={item.label} onClick={()=>setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${sidebar?"":"justify-center"} ${active?"":"hover:bg-white/5 hover:!text-white"}`}
              style={active?{background:"rgba(255,255,255,0.10)",color:"#fff",borderRight:`3px solid ${O}`}:{color:"#6EAD7E"}}>
              <Icon size={15} className="flex-shrink-0"/>
              {sidebar&&<span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          );})}
        </nav>
        <div className="p-3 flex-shrink-0" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {sidebar?(
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background:O}}>{user.initial}</div>
              <div className="flex-1 min-w-0 overflow-hidden"><div className="text-white text-xs font-semibold truncate">{user.name}</div><div className="text-xs truncate" style={{color:"#6EAD7E"}}>{user.role}</div></div>
              <button onClick={()=>setUser(null)} style={{color:"#6EAD7E"}} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-white/10 hover:!text-white transition-colors"><LogOut size={14}/></button>
            </div>
          ):(
            <button onClick={()=>setUser(null)} className="w-full flex justify-center py-1" style={{color:"#6EAD7E"}}><LogOut size={16}/></button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
          <button onClick={()=>setSidebar(o=>!o)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><Menu size={18}/></button>
          <div className="flex-1 min-w-0"><h1 className="font-bold text-gray-700 text-sm">{pageTitle}</h1><p className="text-xs text-gray-400 hidden sm:block">{APP_NAME}  {APP_SUB}</p></div>
          <button onClick={()=>setShowSearch(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors text-xs text-gray-400" title="Search (⌘K)"><Search size={13}/><span>Search</span><kbd className="ml-1 font-mono text-gray-300 text-xs">⌘K</kbd></button>
          <div className="flex items-center gap-2">
            {/* Offline banner */}
            {!isOnline&&<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold animate-fade-in" style={{background:"#fef3c7",color:"#92400e",border:"1px solid #fde68a"}}><WifiOff size={12}/>Offline</div>}
            {/* DB status dot */}
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-2 h-2 rounded-full" style={{background:dbStatus==="ok"?"#22c55e":dbStatus==="error"?"#ef4444":"#f59e0b"}}/>
              <span className="hidden sm:inline text-xs font-medium" style={{color:dbStatus==="ok"?"#16a34a":dbStatus==="error"?"#dc2626":"#d97706"}}>{dbStatus==="ok"?"Synced":dbStatus==="error"?"DB Error":"Syncing..."}</span>
            </div>
            <div className="relative" ref={notifRef}>
              <button onClick={()=>setShowNotif(p=>!p)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                <Bell size={16} className="text-gray-400"/>
                {unread>0&&<span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white flex items-center justify-center font-bold" style={{background:RED,fontSize:"9px"}}>{unread>9?"9+":unread}</span>}
              </button>
              {showNotif&&<NotifPanel notes={liveNotifs} onRead={markRead} onClose={()=>setShowNotif(false)}/>}
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{background:O}}>{user.initial}</div>
              <div className="hidden sm:block"><div className="text-xs font-semibold text-gray-700">{user.name}</div><div className="text-xs text-gray-400">{user.role}</div></div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {page==="dashboard"   &&<ErrorBoundary module="Dashboard"><Dashboard clients={clients} jobs={jobs} requests={requests} inventory={inventory} users={users} staff={staff} onNav={setPage}/></ErrorBoundary>}
          {page==="clients"     &&<ErrorBoundary module="Clients"><ClientsPage clients={clients} setClients={setClients} userRole={user.role} staff={staff} contacts={contacts}/></ErrorBoundary>}
          {page==="contracts"   &&<ErrorBoundary module="Contracts"><ContractsPage clients={clients} setClients={setClients}/></ErrorBoundary>}
          {page==="requests"    &&<ErrorBoundary module="Service Requests"><RequestsPage requests={requests} setRequests={setRequests} setJobs={setJobs} clients={clients}/></ErrorBoundary>}
          {page==="jobs"        &&<ErrorBoundary module="Jobs"><JobsPage jobs={jobs} setJobs={setJobs} clients={clients} contacts={contacts} staff={staff} user={user}/></ErrorBoundary>}
          {page==="schedule"    &&<ErrorBoundary module="Pest Schedule"><SchedulePage schedules={schedules} setSchedules={setSchedules} clients={clients} userRole={user.role}/></ErrorBoundary>}
          {page==="site_reports"&&<ErrorBoundary module="Site Reports"><SiteReportsPage reports={siteReports} setReports={setSiteReports} user={user} clients={clients} contacts={contacts} staff={staff}/></ErrorBoundary>}
          {page==="inventory"   &&<ErrorBoundary module="Inventory"><InventoryPage inventory={inventory} setInventory={setInventory} userRole={user.role}/></ErrorBoundary>}
          {page==="requisitions"&&<ErrorBoundary module="Requisitions"><RequisitionsPage requisitions={requisitions} setRequisitions={setRequisitions} supplyItems={supplyItems} setSupplyItems={setSupplyItems} clients={clients} users={users} user={user} inventory={inventory} setInventory={setInventory}/></ErrorBoundary>}
          {page==="absencecover"&&<ErrorBoundary module="Absence & Cover"><AbsenceCoverPage absences={absences} setAbsences={setAbsences} covers={covers} setCovers={setCovers} clients={clients} staff={staff} users={users}/></ErrorBoundary>}
          {page==="birthdays"   &&<ErrorBoundary module="Birthdays"><BirthdaysPage users={users} setUsers={setUsers} staff={staff} setStaff={setStaff}/></ErrorBoundary>}
          {page==="imprest"     &&<ErrorBoundary module="Imprest Fund"><ImprestPage imprests={imprests} setImprests={setImprests} staff={staff}/></ErrorBoundary>}
          {page==="assessments" &&<ErrorBoundary module="Site Assessments"><AssessmentsPage assessments={assessments} setAssessments={setAssessments} user={user} clients={clients} contacts={contacts} requests={requests} setRequests={setRequests}/></ErrorBoundary>}
          {page==="analytics"   &&<ErrorBoundary module="Analytics"><AnalyticsPage clients={clients} siteReports={siteReports} jobs={jobs} staff={staff} absences={absences} requests={requests}/></ErrorBoundary>}
          {page==="staff"       &&<ErrorBoundary module="Staff"><StaffPage staff={staff} setStaff={setStaff}/></ErrorBoundary>}
          {page==="settings"    &&<ErrorBoundary module="Settings"><SettingsPage users={users} setUsers={setUsers} activityLog={activityLog}/></ErrorBoundary>}
        </main>
      </div>
    </div>
  );
}
