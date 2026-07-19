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

import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  Users, FileText, BarChart2, Settings, LogOut, Menu, Bell, Home, Bug,
  AlertTriangle, Search, ClipboardList, Package, Briefcase, Inbox, Gift,
  Wallet, ClipboardCheck, UserCheck, MapPin, WifiOff, ListChecks, Filter,
} from "lucide-react";

// ── lib/ extractions (Phase 2-5) ─────────────────────────────────────────────
import { GD, O, RED } from "./lib/constants";
import { computeAutoJobs } from "./lib/scheduler";
import { drainOfflineQueue, getOfflineQueueDepth, OFFLINE_Q_KEY } from "./lib/offline";
import { setSentryUser } from "./lib/sentry";
import {
  SUPABASE_URL, SUPABASE_ANON_KEY, T,
  dbLoad, dbSync,
  loadContacts, loadActivityLog,
} from "./lib/supabase";
import { APP_NAME, APP_SUB, LOGO } from "./lib/logo";
import { INITIAL_USERS, SEED_STAFF, INITIAL_SUPPLY_MASTER } from "./lib/seeds";
import type {
  Client, Job, Staff, AppUser, Request_, SiteReport, Imprest, Inventory,
  Requisition, SupplyItem, Schedule, Absence, Cover, Assessment, Contact,
  Task, TaskTemplate, Lead, CurrentUser,
} from "./lib/schemas";
import { computeRecurringTasks } from "./lib/task-scheduler";
import { sameName } from "./lib/format";

// ── UI primitives + composite components (Phase 3) ───────────────────────────
import { Toaster } from "./components/ui/Toaster";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { buildNotifs, NotifPanel } from "./components/NotifPanel";

// ── Page modules (Phase 4) ───────────────────────────────────────────────────
// Code-split via React.lazy (Phase 5c — Performance). Each page becomes its own
// chunk, so the main bundle only loads what's needed at boot (login + shell).
// LoginScreen stays eager — it's always the first thing a logged-out user sees.
import { LoginScreen }     from "./pages/Login";
const Dashboard        = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const ClientsPage      = lazy(() => import("./pages/Clients").then(m => ({ default: m.ClientsPage })));
const ContractsPage    = lazy(() => import("./pages/Contracts").then(m => ({ default: m.ContractsPage })));
const RequestsPage     = lazy(() => import("./pages/Requests").then(m => ({ default: m.RequestsPage })));
const JobsPage         = lazy(() => import("./pages/Jobs").then(m => ({ default: m.JobsPage })));
const SchedulePage     = lazy(() => import("./pages/Schedule").then(m => ({ default: m.SchedulePage })));
const SiteReportsPage  = lazy(() => import("./pages/SiteReports").then(m => ({ default: m.SiteReportsPage })));
const InventoryPage    = lazy(() => import("./pages/Inventory").then(m => ({ default: m.InventoryPage })));
const RequisitionsPage = lazy(() => import("./pages/Requisitions").then(m => ({ default: m.RequisitionsPage })));
const AbsenceCoverPage = lazy(() => import("./pages/AbsenceCover").then(m => ({ default: m.AbsenceCoverPage })));
const BirthdaysPage    = lazy(() => import("./pages/Birthdays").then(m => ({ default: m.BirthdaysPage })));
const ImprestPage      = lazy(() => import("./pages/Imprest").then(m => ({ default: m.ImprestPage })));
const AssessmentsPage  = lazy(() => import("./pages/Assessments").then(m => ({ default: m.AssessmentsPage })));
const AnalyticsPage    = lazy(() => import("./pages/Analytics").then(m => ({ default: m.AnalyticsPage })));
const StaffPage        = lazy(() => import("./pages/Staff").then(m => ({ default: m.StaffPage })));
const SettingsPage     = lazy(() => import("./pages/Settings").then(m => ({ default: m.SettingsPage })));
const TasksPage        = lazy(() => import("./pages/Tasks").then(m => ({ default: m.TasksPage })));
const PipelinePage     = lazy(() => import("./pages/Pipeline").then(m => ({ default: m.PipelinePage })));

// Lightweight fallback for in-flight chunk loads — matches the boot skeleton
// so the visual stays calm when the user crosses a page boundary.
const PageFallback = () => (
  <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
    <div className="w-5 h-5 mr-3 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin"/>
    Loading…
  </div>
);

export default function App(){
  const[page,        setPage]        =useState("dashboard");
  // Sidebar state: on desktop = expanded/collapsed (rail); on mobile = open/closed (drawer).
  // Default collapsed on phones so the page gets full width on first paint.
  const[sidebar,     setSidebar]     =useState<boolean>(()=>{
    if(typeof window==="undefined")return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  // State — typed via Zod-derived aliases from src/lib/schemas.ts.
  // Strict mode requires explicit generics on useState([]) — `never[]` is the
  // default inference otherwise.
  const[user,        setUser]        =useState<CurrentUser | null>(null);
  const[users,       setUsers]       =useState<AppUser[]>(INITIAL_USERS as unknown as AppUser[]);
  const[staff,       setStaff]       =useState<Staff[]>([]);
  const[clients,     setClients]     =useState<Client[]>([]);
  const[schedules,   setSchedules]   =useState<Schedule[]>([]);
  const[requests,    setRequests]    =useState<Request_[]>([]);
  const[jobs,        setJobs]        =useState<Job[]>([]);
  const[inventory,   setInventory]   =useState<Inventory[]>([]);
  const[siteReports, setSiteReports] =useState<SiteReport[]>([]);
  const[contacts,    setContacts]    =useState<Contact[]>([]);
  const[activityLog, setActivityLog] =useState<any[]>([]);  // raw dw_activity_log rows
  const[supplyItems, setSupplyItems] =useState<SupplyItem[]>([]);
  const[requisitions,setRequisitions]=useState<Requisition[]>([]);
  const[absences,    setAbsences]    =useState<Absence[]>([]);
  const[covers,      setCovers]      =useState<Cover[]>([]);
  const[imprests,    setImprests]    =useState<Imprest[]>([]);
  const[assessments, setAssessments] =useState<Assessment[]>([]);
  const[tasks,       setTasks]       =useState<Task[]>([]);
  const[taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const[leads,       setLeads]       =useState<Lead[]>([]);
  const[showNotif,   setShowNotif]   =useState(false);
  const[showSearch,  setShowSearch]  =useState(false);
  const[isOnline,    setIsOnline]    =useState<boolean>(()=>navigator.onLine);
  // Depth of the localStorage offline-action queue. Mirrored into state so the
  // header indicator can show "Offline · N pending" without polling.
  const[queueDepth,  setQueueDepth]  =useState<number>(()=>getOfflineQueueDepth());
  const[readIds,     setReadIds]     =useState<string[]>(()=>{try{const s=localStorage.getItem("dw_readNotifs");return s?JSON.parse(s):[];}catch{return[];}});
  const[dbStatus,    setDbStatus]    =useState<"ok"|"error"|"loading">("ok");
  const[dbLoading,   setDbLoading]   =useState(true);
  const notifRef   = useRef<HTMLDivElement|null>(null);
  const dbLoaded   = useRef(false);
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
            }catch(e:any){console.warn("[DB] load supplyitems:",e?.message);setSupplyItems(INITIAL_SUPPLY_MASTER);}
          })(),
          dbLoad("requisitions",setRequisitions),
          dbLoad("absences",    setAbsences),
          dbLoad("covers",      setCovers),
          dbLoad("assessments", setAssessments),
          dbLoad("tasks",       setTasks),
          dbLoad("tasktemplates", setTaskTemplates),
          dbLoad("leads",       setLeads),
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
            }catch(e:any){console.warn("[DB] load staff:",e?.message);setStaff(SEED_STAFF);}
          })(),
          dbLoad("users", u => {
            // Merge DB users with INITIAL_USERS seeds so technician phone-
            // number accounts survive even if the DB table never persisted
            // them. Without this, App.tsx silently replaces the seed array
            // with whatever Supabase has, technicians disappear from the
            // in-memory users[], and Login.tsx's username-match fallback
            // (their only auth path) can't find them. See observation #49.
            const dbRows = (u || []) as AppUser[];
            const seedById = new Map(
              (INITIAL_USERS as unknown as AppUser[]).map(s => [String(s.id), s] as const)
            );
            // DB wins for any id that exists in both; remaining seeds get added.
            const merged: AppUser[] = [...dbRows];
            const dbIds = new Set(dbRows.map(r => String(r.id)));
            for (const [id, seed] of seedById) if (!dbIds.has(id)) merged.push(seed);
            // Sanitize: technicians use phone-number username login only — if
            // a pwHash slipped onto a Technician row (e.g. a password got
            // typed into the Settings edit modal at some point), strip it.
            // Login.tsx now also ignores pwHash for Technician role, but
            // cleaning the persisted data prevents the same row from causing
            // confusion in the Settings UI or any future code path.
            let sanitizedCount = 0;
            const sanitized: AppUser[] = merged.map(u => {
              const isTech = String(u.role || "").toLowerCase() === "technician";
              if (isTech && u.pwHash) {
                sanitizedCount++;
                return { ...u, pwHash: "" } as AppUser;
              }
              return u;
            });
            setUsers(sanitized);
            // Self-heal: if we added any missing seeds OR stripped any
            // technician pwHashes, persist the cleaned list back so
            // subsequent boots start consistent. Fire-and-forget — login
            // should not depend on this write succeeding.
            if (sanitized.length !== dbRows.length || sanitizedCount > 0) {
              dbSync("users", sanitized).catch(() => {});
            }
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
  const debouncedSync = useCallback((table: string, data: any[]) => {
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
  useEffect(() => { debouncedSync("tasks",        tasks);       }, [tasks,       debouncedSync]);
  useEffect(() => { debouncedSync("tasktemplates", taskTemplates); }, [taskTemplates, debouncedSync]);
  useEffect(() => { debouncedSync("leads",        leads);       }, [leads,       debouncedSync]);
  useEffect(() => { debouncedSync("staff",        staff);       }, [staff,       debouncedSync]);
  useEffect(() => { debouncedSync("users",        users);       }, [users,       debouncedSync]);

  // -- Auto-materialize recurring tasks from templates ---------------------------
  // Runs once per Dashboard mount per browser session — the idempotent
  // deterministic IDs in lib/task-scheduler.ts mean re-running never produces
  // duplicates. Templates active in the current ISO week each emit one
  // concrete Task row for the current Monday.
  useEffect(() => {
    if (!dbLoaded.current || taskTemplates.length === 0) return;
    const toAdd = computeRecurringTasks({ templates: taskTemplates, tasks });
    if (toAdd.length === 0) return;
    setTasks(ts => {
      const existing = new Set(ts.map(t => String(t.id)));
      const truly = toAdd.filter(t => !existing.has(String(t.id)));
      if (truly.length === 0) return ts;
      const updated = [...ts, ...truly];
      dbSync("tasks", updated, () => Toaster._add?.("Recurring tasks failed to sync — will retry next load", "error"));
      Toaster._add?.(`${truly.length} recurring task${truly.length > 1 ? "s" : ""} materialized for this week`, "info");
      return updated;
    });
  }, [taskTemplates, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Auto-schedule recurring jobs from contract service frequency -------------
  // Pure logic lives in `lib/scheduler.ts` so it's unit-tested in isolation.
  // This effect is just the React glue: gate on dbLoaded, run the computation,
  // and apply the result to state + Supabase.
  useEffect(()=>{
    if(!dbLoaded.current||clients.length===0)return;
    const toAdd = computeAutoJobs({ clients, jobs });
    if(toAdd.length===0)return;
    setJobs(js=>{
      const existingIds=new Set(js.map(j=>j.id));
      const truly=toAdd.filter(j=>!existingIds.has(j.id as string));
      if(truly.length===0)return js;
      const updated=[...js,...(truly as Job[])];
      dbSync("jobs",updated);
      Toaster._add?.(`${truly.length} recurring job${truly.length>1?"s":""} auto-scheduled`,"info");
      return updated;
    });
  },[clients,jobs]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Flush pending syncs when tab loses visibility (user switches away / closes) --
  const latestStateRef = useRef({});
  latestStateRef.current = { reports: siteReports, imprests, clients, jobs, requests, schedules, inventory, supplyitems: supplyItems, requisitions, absences, covers, staff, users, assessments, tasks, tasktemplates: taskTemplates, leads };
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
    const refreshQueueDepth=()=>setQueueDepth(getOfflineQueueDepth());
    const handleOnline=()=>{
      setIsOnline(true);
      const n=drainOfflineQueue(setJobs, dbSync);
      if(n>0)Toaster._add?.(`Back online — ${n} queued action${n>1?"s":""} synced to server`,"success");
      refreshQueueDepth();
    };
    const handleOffline=()=>{
      setIsOnline(false);
      Toaster._add?.("You are offline — actions will queue and sync when reconnected","info");
      refreshQueueDepth();
    };
    // Service Worker background-sync message handler
    const handleSwMessage=(e:any)=>{
      if(e.data?.type==="DW_DRAIN_OFFLINE_QUEUE"){
        const n=drainOfflineQueue(setJobs, dbSync);
        if(n>0)Toaster._add?.(`${n} queued action${n>1?"s":""} synced via background sync`,"success");
        refreshQueueDepth();
      }
    };
    // Same-tab storage write detection — covers the case where the queue grows
    // inside the current tab (the browser-native `storage` event only fires
    // cross-tab). We listen for a custom event that queueOfflineAction emits.
    const handleQueueChange=()=>refreshQueueDepth();
    // Cross-tab updates
    const handleStorage=(e:StorageEvent)=>{ if(e.key===OFFLINE_Q_KEY) refreshQueueDepth(); };

    window.addEventListener("online",handleOnline);
    window.addEventListener("offline",handleOffline);
    window.addEventListener("storage",handleStorage);
    window.addEventListener("dw-offline-queue-changed",handleQueueChange);
    navigator.serviceWorker?.addEventListener("message",handleSwMessage);
    return()=>{
      window.removeEventListener("online",handleOnline);
      window.removeEventListener("offline",handleOffline);
      window.removeEventListener("storage",handleStorage);
      window.removeEventListener("dw-offline-queue-changed",handleQueueChange);
      navigator.serviceWorker?.removeEventListener("message",handleSwMessage);
    };
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Notifications ----------------------------------------------------------
  const allNotifs=useMemo(()=>buildNotifs(clients,jobs,inventory),[clients,jobs,inventory]);
  const liveNotifs=useMemo(()=>allNotifs.map(n=>({...n,read:readIds.includes(n.id)})),[allNotifs,readIds]);
  const unread=useMemo(()=>liveNotifs.filter(n=>!n.read).length,[liveNotifs]);
  const markRead=(id:string)=>setReadIds(r=>[...r,id]);
  // Persist read notification IDs across page refreshes
  useEffect(()=>{try{localStorage.setItem("dw_readNotifs",JSON.stringify(readIds));}catch{};},[readIds]);
  useEffect(()=>{const h=(e:any)=>{if(notifRef.current&&!notifRef.current.contains(e.target))setShowNotif(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  // Global ⌘K / Ctrl+K shortcut to open search
  useEffect(()=>{const h=(e:any)=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowSearch(s=>!s);}if(e.key==="Escape")setShowSearch(false);};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[]);

  const handleLogin=(u:any)=>{setUser(u);setPage("dashboard");setSentryUser(u);};

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

  // Open tasks assigned to the logged-in user — drives the "My Tasks" nav
  // badge so an assignee gets a visible signal that work is waiting, even
  // before they open the page. sameName tolerates "Bola" ↔ "Bola Adebayo".
  const myOpenTaskCount=tasks.filter(t=>sameName(t.assignee,user.name)&&t.status!=="Done"&&t.status!=="Cancelled").length;
  const NAV=[
    {id:"dashboard",   label:"Dashboard",       icon:Home,          roles:["Admin","Supervisor","Finance","Technician"]},
    {id:"tasks",       label:"My Tasks",         icon:ListChecks,    roles:["Admin","Supervisor","Finance","Technician"], badge:myOpenTaskCount},
    {id:"clients",     label:"Clients",          icon:Users,         roles:["Admin","Supervisor"]},
    {id:"contracts",   label:"Contracts",        icon:FileText,      roles:["Admin","Supervisor"]},
    {id:"pipeline",    label:"Sales Pipeline",   icon:Filter,        roles:["Admin","Supervisor","Finance"]},
    {id:"requests",    label:"Service Requests", icon:Inbox,         roles:["Admin","Supervisor","Finance"]},
    {id:"jobs",        label:"Jobs",             icon:Briefcase,     roles:["Admin","Supervisor"]},
    {id:"schedule",    label:"Pest Schedule",    icon:Bug,           roles:["Admin","Supervisor"]},
    {id:"site_reports",label:"Site Reports",     icon:ClipboardList, roles:["Admin","Supervisor"]},
    {id:"inventory",   label:"Inventory",        icon:Package,       roles:["Admin","Supervisor"]},
    {id:"requisitions",label:"Requisitions",     icon:ClipboardCheck,roles:["Admin","Supervisor","Technician"]},
    {id:"absencecover",label:"Absence & Cover",  icon:UserCheck,     roles:["Admin","Supervisor","Finance"]},
    {id:"birthdays",   label:"Birthdays",        icon:Gift,          roles:["Admin","Supervisor"]},
    {id:"imprest",     label:"Imprest Fund",     icon:Wallet,        roles:["Admin","Supervisor","Finance"]},
    {id:"assessments", label:"Site Assessments",  icon:MapPin,        roles:["Admin","Supervisor","Finance"]},
    {id:"analytics",   label:"Analytics",        icon:BarChart2,     roles:["Admin","Finance"]},
    {id:"staff",       label:"Staff",            icon:Users,         roles:["Admin","Supervisor","Finance"]},
    {id:"settings",    label:"Settings",         icon:Settings,      roles:["Admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const pageTitle=NAV.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Global toast — renders above everything */}
      <Toaster/>
      {/* Global ⌘K search palette */}
      {showSearch&&<GlobalSearch clients={clients} jobs={jobs} staff={staff} inventory={inventory} requests={requests} onNav={p=>{setPage(p);}} onClose={()=>setShowSearch(false)}/>}
      {/* Mobile backdrop — tap to close drawer */}
      {sidebar && <div onClick={()=>setSidebar(false)} className="md:hidden fixed inset-0 bg-black/40 z-30 transition-opacity"/>}
      <aside className={`
        ${sidebar?"w-60 translate-x-0":"w-14 -translate-x-full md:translate-x-0"}
        fixed md:relative inset-y-0 left-0 z-40
        transition-all duration-200 flex flex-col flex-shrink-0
      `} style={{background:GD}}>
        <div className="h-16 flex items-center px-3 border-b gap-2 flex-shrink-0" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <img src={LOGO} alt="D&W" className="w-8 h-8 object-contain flex-shrink-0 rounded-lg bg-white p-0.5 border border-gray-100"/>
          {sidebar&&<div className="overflow-hidden"><div className="text-white text-sm font-black leading-tight whitespace-nowrap">{APP_NAME}</div><div className="text-xs whitespace-nowrap" style={{color:"#6EAD7E"}}>{APP_SUB}</div></div>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {NAV.map(item=>{const Icon=item.icon;const active=page===item.id;const badge=(item as any).badge||0;return(
            <button key={item.id} title={item.label} onClick={()=>{setPage(item.id);
              // Auto-close drawer after navigation on mobile
              if(window.matchMedia("(max-width: 767px)").matches)setSidebar(false);
            }}
              className={`w-full flex items-center gap-3 px-4 min-h-[44px] py-2.5 transition-all relative ${sidebar?"":"justify-center"} ${active?"":"hover:bg-white/5 hover:!text-white"}`}
              style={active?{background:"rgba(255,255,255,0.10)",color:"#fff",borderRight:`3px solid ${O}`}:{color:"#6EAD7E"}}>
              <span className="relative flex-shrink-0">
                <Icon size={15}/>
                {/* Collapsed rail: dot on the icon. */}
                {!sidebar&&badge>0&&<span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center font-bold" style={{background:RED,fontSize:"8px"}}>{badge>9?"9+":badge}</span>}
              </span>
              {sidebar&&<span className="text-sm font-medium whitespace-nowrap flex-1 text-left">{item.label}</span>}
              {/* Expanded: count pill at row end. */}
              {sidebar&&badge>0&&<span className="px-1.5 py-0.5 rounded-full text-white font-bold flex-shrink-0" style={{background:RED,fontSize:"10px"}}>{badge>99?"99+":badge}</span>}
            </button>
          );})}
        </nav>
        <div className="p-3 flex-shrink-0" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {sidebar?(
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background:O}}>{user.initial}</div>
              <div className="flex-1 min-w-0 overflow-hidden"><div className="text-white text-xs font-semibold truncate">{user.name}</div><div className="text-xs truncate" style={{color:"#6EAD7E"}}>{user.role}</div></div>
              <button onClick={()=>{setUser(null);setSentryUser(null);}} style={{color:"#6EAD7E"}} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-white/10 hover:!text-white transition-colors"><LogOut size={14}/></button>
            </div>
          ):(
            <button onClick={()=>{setUser(null);setSentryUser(null);}} className="w-full flex justify-center py-1" style={{color:"#6EAD7E"}}><LogOut size={16}/></button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile-only offline banner. Stays under the header on desktop where
            the small pill is enough; on phones the bar is impossible to miss. */}
        {!isOnline && (
          <div className="md:hidden flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold" style={{background:"#fef3c7",color:"#92400e",borderBottom:"1px solid #fde68a"}}>
            <WifiOff size={12}/>
            <span>Offline mode</span>
            {queueDepth>0 && <span>· {queueDepth} pending</span>}
          </div>
        )}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 flex-shrink-0 shadow-sm">
          <button onClick={()=>setSidebar(o=>!o)} aria-label="Toggle navigation" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><Menu size={18}/></button>
          <div className="flex-1 min-w-0"><h1 className="font-bold text-gray-700 text-sm">{pageTitle}</h1><p className="text-xs text-gray-400 hidden sm:block">{APP_NAME}  {APP_SUB}</p></div>
          <button onClick={()=>setShowSearch(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors text-xs text-gray-400" title="Search (⌘K)"><Search size={13}/><span>Search</span><kbd className="ml-1 font-mono text-gray-300 text-xs">⌘K</kbd></button>
          <div className="flex items-center gap-2">
            {/* Offline / queue-depth pill */}
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold animate-fade-in" style={{background:"#fef3c7",color:"#92400e",border:"1px solid #fde68a"}} title={queueDepth>0 ? `${queueDepth} action${queueDepth>1?"s":""} waiting to sync` : "No network — changes will queue"}>
                <WifiOff size={12}/>
                <span>Offline</span>
                {queueDepth>0 && (
                  <span className="ml-1 px-1.5 rounded-full text-white font-bold" style={{background:"#92400e",fontSize:"10px"}}>{queueDepth}</span>
                )}
              </div>
            )}
            {/* Online but queue still draining — shows briefly as actions reconcile */}
            {isOnline && queueDepth > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold animate-fade-in" style={{background:"#dbeafe",color:"#1e40af",border:"1px solid #bfdbfe"}} title="Syncing queued offline actions">
                <div className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin"/>
                Syncing {queueDepth}
              </div>
            )}
            {/* DB status dot */}
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-2 h-2 rounded-full" style={{background:dbStatus==="ok"?"#22c55e":dbStatus==="error"?"#ef4444":"#f59e0b"}}/>
              <span className="hidden sm:inline text-xs font-medium" style={{color:dbStatus==="ok"?"#16a34a":dbStatus==="error"?"#dc2626":"#d97706"}}>{dbStatus==="ok"?"Synced":dbStatus==="error"?"DB Error":"Syncing..."}</span>
            </div>
            <div className="relative" ref={notifRef}>
              <button onClick={()=>setShowNotif(p=>!p)} aria-label="Notifications" className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
         <Suspense fallback={<PageFallback/>}>
          {page==="dashboard"   &&<ErrorBoundary module="Dashboard"><Dashboard clients={clients} jobs={jobs} requests={requests} setRequests={setRequests} inventory={inventory} users={users} staff={staff} tasks={tasks} imprests={imprests} requisitions={requisitions} absences={absences} user={user} onNav={setPage}/></ErrorBoundary>}
          {page==="clients"     &&<ErrorBoundary module="Clients"><ClientsPage clients={clients} setClients={setClients} userRole={user.role} staff={staff} contacts={contacts}/></ErrorBoundary>}
          {page==="contracts"   &&<ErrorBoundary module="Contracts"><ContractsPage clients={clients} setClients={setClients}/></ErrorBoundary>}
          {page==="pipeline"    &&<ErrorBoundary module="Sales Pipeline"><PipelinePage leads={leads} setLeads={setLeads} users={users} clients={clients} user={user}/></ErrorBoundary>}
          {page==="requests"    &&<ErrorBoundary module="Service Requests"><RequestsPage requests={requests} setRequests={setRequests} setJobs={setJobs} clients={clients}/></ErrorBoundary>}
          {page==="jobs"        &&<ErrorBoundary module="Jobs"><JobsPage jobs={jobs} setJobs={setJobs} clients={clients} contacts={contacts} staff={staff} users={users} user={user}/></ErrorBoundary>}
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
          {page==="tasks"       &&<ErrorBoundary module="Tasks"><TasksPage tasks={tasks} setTasks={setTasks} taskTemplates={taskTemplates} setTaskTemplates={setTaskTemplates} user={user} users={users} staff={staff}/></ErrorBoundary>}
         </Suspense>
        </main>
      </div>
    </div>
  );
}
