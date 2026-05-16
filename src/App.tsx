// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Root <App/> component
//
//  After the Phase 1-5 TypeScript migration, this file is the application
//  shell only — it owns the cross-page state (clients, jobs, staff, etc.),
//  the Supabase load/sync lifecycle, navigation, the notification panel, and
//  the ⌘K search palette. Each page lives in its own file under src/pages/.
//
//  See ARCHITECTURE notes at the bottom of this file.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Users, FileText, BarChart2, Settings, LogOut, Menu, Bell, Home, Bug,
  AlertTriangle, Search, ClipboardList, Package, Briefcase, Inbox, Gift,
  Wallet, ClipboardCheck, UserCheck, MapPin, WifiOff,
} from "lucide-react";

// ── lib/ extractions (Phase 2-5) ─────────────────────────────────────────────
import { GD, O, RED, FREQ_DAYS } from "./lib/constants";
import { drainOfflineQueue } from "./lib/offline";
import {
  SUPABASE_URL, SUPABASE_ANON_KEY, T,
  dbLoad, dbSync,
  loadContacts, loadActivityLog,
} from "./lib/supabase";
import { APP_NAME, APP_SUB, LOGO } from "./lib/logo";
import { INITIAL_USERS, SEED_STAFF, INITIAL_SUPPLY_MASTER } from "./lib/seeds";

// ── UI primitives + composite components (Phase 3) ───────────────────────────
import { Toaster } from "./components/ui/Toaster";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { buildNotifs, NotifPanel } from "./components/NotifPanel";

// ── Page modules (Phase 4) ───────────────────────────────────────────────────
import { BirthdaysPage }   from "./pages/Birthdays";
import { ContractsPage }   from "./pages/Contracts";
import { SchedulePage }    from "./pages/Schedule";
import { InventoryPage }   from "./pages/Inventory";
import { RequestsPage }    from "./pages/Requests";
import { AbsenceCoverPage }from "./pages/AbsenceCover";
import { AnalyticsPage }   from "./pages/Analytics";
import { StaffPage }       from "./pages/Staff";
import { LoginScreen }     from "./pages/Login";
import { Dashboard }       from "./pages/Dashboard";
import { ClientsPage }     from "./pages/Clients";
import { JobsPage }        from "./pages/Jobs";
import { SettingsPage }    from "./pages/Settings";
import { SiteReportsPage } from "./pages/SiteReports";
import { RequisitionsPage }from "./pages/Requisitions";
import { ImprestPage }     from "./pages/Imprest";
import { AssessmentsPage } from "./pages/Assessments";

export default function App(){
  const[user,        setUser]        =useState(null);
  const[page,        setPage]        =useState("dashboard");
  const[sidebar,     setSidebar]     =useState(true);
  const[users,       setUsers]       =useState<any[]>(INITIAL_USERS);
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
      Object.entries(latestStateRef.current).forEach(([table, data]) => { if (table !== "imprests") dbSync(table, data as any[]); });
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
          {page==="absencecover"&&<ErrorBoundary module="Absence & Cover"><AbsenceCoverPage absences={absences} setAbsences={setAbsences} covers={covers} setCovers={setCovers} clients={clients} staff={staff}/></ErrorBoundary>}
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
