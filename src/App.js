import { useState, useMemo, useEffect, useRef, useCallback } from "react";
// ─── SUPABASE ──────────────────────────────────────────────────────────────────
// npm install @supabase/supabase-js  (add to package.json before deploying)
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, FileText, BarChart2, Settings, LogOut, Menu, Plus, Edit2, Trash2, Bell, Home, Bug, Eye, EyeOff, AlertTriangle, Search, X, ClipboardList, Package, Clock, Briefcase, ChevronRight, ArrowRight, Inbox, Shield, UserPlus, Gift, Wallet, ClipboardCheck, UserCheck, Info } from "lucide-react";

const APP_NAME="Operations Hub", APP_SUB="Dust & Wipes Limited";
const TODAY=new Date("2026-04-09");
let _uid=500;
const GD="#0B3518",G="#1B6B2F",GL="#E8F5E9",O="#E85D04",OL="#FFF3E0",AMBER="#D97706",RED="#DC2626",BLUE="#2563EB";
const LOGO="data:image/jpeg;base64,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";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
// ⚠️  IMPORTANT: Replace SUPABASE_ANON_KEY with your anon/public JWT key from:
//    Supabase Dashboard → Your Project → Settings → API → "anon public" key
//    It is a long string starting with "eyJ..."
const SUPABASE_URL  = "https://recnamvefsmwppgajdcu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlY25hbXZlZnNtd3BwZ2FqZGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTgyMjYsImV4cCI6MjA5MTc3NDIyNn0.cP6QtXVcub3VSE69sA5QzaWcymZB277WPzIhWe8dm_g";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DB table names — prefixed to avoid reserved word conflicts
const T = (name) => `dw_${name}`;

// Load all records from a table and populate React state
const dbLoad = async (table, setter) => {
  try {
    const { data, error } = await sb.from(T(table)).select("id,record").order("updated_at", { ascending: false });
    if (error) throw error;
    if (data?.length) setter(data.map(r => r.record).filter(Boolean));
  } catch(e) { console.warn(`[DB] load ${table}:`, e.message); }
};

// Sync an entire entity array to Supabase (debounced at call site)
const dbSync = async (table, data) => {
  try {
    if (!data) return;
    // Step 1: upsert all current records
    const rows = data.map(r => ({
      id: String(r.id),
      record: r,
      updated_at: new Date().toISOString()
    }));
    if (rows.length > 0) {
      const { error } = await sb.from(T(table)).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
    // Step 2: delete any DB rows whose ID is no longer in local state
    const currentIds = data.map(r => String(r.id));
    if (currentIds.length > 0) {
      await sb.from(T(table)).delete().not("id", "in", `(${currentIds.map(id => `"${id}"`).join(",")})`);
    } else {
      // No records — clear the whole table
      await sb.from(T(table)).delete().neq("id", "__NONE__");
    }
  } catch(e) { console.warn(`[DB] sync ${table}:`, e.message); }
};


const cStatus=end=>{if(!end)return"Unknown";const d=Math.ceil((new Date(end)-TODAY)/86400000);return d<0?"Expired":d<=30?"Critical":d<=60?"Expiring Soon":"Active";};
const dLeft=end=>end?Math.ceil((new Date(end)-TODAY)/86400000):null;
const fmt=n=>"₦"+Number(n||0).toLocaleString("en-NG",{maximumFractionDigits:0});
const fmtD=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtT=t=>{if(!t)return"—";if(t.includes("T")||t.length>8)return new Date(t).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});const[h,m]=t.split(":");return`${h}:${m}`;};
const fmtDT=t=>t?`${fmtD(t.split("T")[0])} ${fmtT(t)}`:"—";
const calcDur=(s,e)=>{if(!s||!e)return null;const d=new Date(e)-new Date(s);if(d<0)return"⚠️ Invalid";return`${Math.floor(d/3600000)}h ${Math.floor((d%3600000)/60000)}m`;};
const monthName=m=>["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m];
const inp="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white";
const JOB_STATUSES=["New","Scheduled","Assigned","In Progress","Awaiting Approval","Completed","Closed"];
const STATUS_COLORS={"New":{bg:"#f0f9ff",color:"#0369a1",border:"#bae6fd"},"Scheduled":{bg:"#faf5ff",color:"#7c3aed",border:"#ddd6fe"},"Assigned":{bg:"#eff6ff",color:"#1d4ed8",border:"#bfdbfe"},"In Progress":{bg:"#fffbeb",color:"#d97706",border:"#fde68a"},"Awaiting Approval":{bg:"#fff7ed",color:"#ea580c",border:"#fed7aa"},"Completed":{bg:"#f0fdf4",color:"#16a34a",border:"#bbf7d0"},"Closed":{bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb"}};
const CONTRACT_COLORS={"Active":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Expiring Soon":{bg:"#fffbeb",color:"#92400e",border:"#fde68a"},"Critical":{bg:"#fee2e2",color:"#991b1b",border:"#fca5a5"},"Expired":{bg:"#f3f4f6",color:"#6b7280",border:"#d1d5db"}};
const IMPREST_CATS=["Transportation","Emergency Supplies","Minor Repairs","Fuel/Logistics","Site Support","Consumables Procurement","Other"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── MASTER SUPPLY ITEMS (APRIL 2026 actuals + standard stock) ────────────────
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
  {id:"s37",name:"Spray Pump 5L",                 unit:"piece", cost:8500, cat:"Equipment",   active:true},
  {id:"s38",name:"Cypermethrin 1L",               unit:"bottle",cost:6500, cat:"Pest Control",active:true},
  {id:"s39",name:"Deltamethrin 500ml",            unit:"bottle",cost:7800, cat:"Pest Control",active:true},
  {id:"s40",name:"Bait Stations (box 12)",        unit:"box",   cost:5500, cat:"Pest Control",active:true},
];

// ── SEED DATA ────────────────────────────────────────────────────────────────
const INITIAL_USERS=[
  {id:"u1",email:"bisit@dustandwipes.com",       password:"Password123#",role:"Admin",      name:"Bisit Admin",   initial:"B"},
  {id:"u2",email:"james.akpa@dustandwipes.com",  password:"Password123#",role:"Supervisor", name:"James Akpa",    initial:"J"},
  {id:"u3",email:"agnes.dung@dustandwipes.com",  password:"Password123#",role:"Supervisor", name:"Agnes Dung",    initial:"A"},
  {id:"u4",username:"08183006297",               password:"Clean123#",   role:"Technician", name:"Faith Apeh",    initial:"F"},
  {id:"u5",username:"08160939949",               password:"Clean123#",   role:"Technician", name:"Veronica Apeh", initial:"V"},
  {id:"u6",username:"08099700001",               password:"Clean123#",   role:"Technician", name:"Info Desk",     initial:"I"},
];
const INITIAL_STAFF=[
  {id:"st1", name:"Vera Okeke",      role:"Cleaner",site:"AFD",            dob:"1993-03-15"},
  {id:"st2", name:"Chafa Musa",      role:"Cleaner",site:"AFD",            dob:"1990-07-22"},
  {id:"st3", name:"Sani Ibrahim",    role:"Cleaner",site:"IFRC",           dob:"1988-04-09"},
  {id:"st4", name:"Peter Eze",       role:"Cleaner",site:"IFRC",           dob:"1995-11-03"},
  {id:"st5", name:"Mariam Abubakar", role:"Cleaner",site:"First Ally",     dob:"1991-08-18"},
  {id:"st6", name:"Faith Obi",       role:"Cleaner",site:"Chayim",         dob:"1996-04-09"},
  {id:"st7", name:"Joy Nwosu",       role:"Cleaner",site:"Chayim",         dob:"1994-12-25"},
  {id:"st8", name:"Rebecca Adamu",   role:"Cleaner",site:"Mr. Sunday",     dob:"1989-02-14"},
  {id:"st9", name:"Vivian Lawal",    role:"Cleaner",site:"Mrs. Khareemah", dob:"1997-06-30"},
  {id:"st10",name:"Jennifer Ogah",   role:"Cleaner",site:"Ms. Angela",     dob:"1992-09-12"},
];
const SEED_CLIENTS=[
  {id:1, name:"AFD",                   cat:"Corporate", svc:"Cleaning",    addr:"12 Charles de Gaule St, Area 11, Abuja",     cp:"Mr. James",    phone:"+234 803 000 0001",email:"info@afd.ng",       cleaners:"Vera, Chafa",               duty:"Mon-Fri",      cs:"2024-03-01",ce:"2026-02-29",sal:150000,con:44650, sc:58395, vat:0,     tot:253045},
  {id:2, name:"IFRC",                  cat:"NGO",       svc:"Both",        addr:"Plot 589 TOS Benson Cres, Utako, Abuja",     cp:"Ms. Fatima",   phone:"+234 803 000 0002",email:"abuja@ifrc.org",    cleaners:"Sani, Peter, Williams",     duty:"Mon-Fri",      cs:"2024-06-26",ce:"2025-06-25",sal:435000,con:0,     sc:130500,vat:0,     tot:565500},
  {id:3, name:"First Ally Asset Mgt.", cat:"Corporate", svc:"Cleaning",    addr:"5 Tanba Street, Wuse 2, Abuja",              cp:"Mr. Bello",    phone:"+234 803 000 0003",email:"info@firstally.ng", cleaners:"Mariam, Catherine, Elizabeth",duty:"Mon-Fri",     cs:"2024-11-01",ce:"2025-10-31",sal:150000,con:43400,sc:58020, vat:4351.5,tot:255771.5},
  {id:4, name:"ISN Products",          cat:"Corporate", svc:"Cleaning",    addr:"25 Ndola Crescent, Zone 5, Abuja",           cp:"Mrs. Nwosu",   phone:"+234 803 000 0004",email:"hr@isn.ng",         cleaners:"Dorcas",                    duty:"Mon-Fri",      cs:"2024-08-08",ce:"2025-08-31",sal:40000, con:15200,sc:16560, vat:1242,   tot:73002},
  {id:5, name:"Sparkles Apartment",    cat:"Real Estate",svc:"Cleaning",   addr:"572 Iduwa Ogenyi St, Mabushi, Abuja",        cp:"Mr. Obi",      phone:"+234 803 000 0005",email:"mgr@sparkles.ng",   cleaners:"Mary, Clement, Ephraim",    duty:"Mon-Sun",      cs:"2024-09-04",ce:"2025-09-03",sal:300000,con:0,     sc:90000, vat:6750,   tot:396750},
  {id:6, name:"Chayim Diagnostics",    cat:"Healthcare",svc:"Both",        addr:"34 Euphrates Crescent, Maitama, Abuja",      cp:"Dr. Chayim",   phone:"+234 803 000 0006",email:"admin@chayim.ng",   cleaners:"Faith, Joy, Vincent",       duty:"Mon-Sat",      cs:"2024-11-01",ce:"2025-10-31",sal:195000,con:80000,sc:82500, vat:0,     tot:357500},
  {id:7, name:"Mobus Property Holdings",cat:"Real Estate",svc:"Cleaning",  addr:"Riverpark Estate, Airport Rd, Lugbe",        cp:"Mr. Mobus",    phone:"+234 803 000 0007",email:"info@mobus.ng",     cleaners:"Dooshima, Folashade",       duty:"Mon-Fri",      cs:"2024-11-01",ce:"2025-11-30",sal:140000,con:0,     sc:35000, vat:0,     tot:175000},
  {id:8, name:"The Showroom",          cat:"Retail",    svc:"Cleaning",    addr:"145 Ademola Adetokunbo, Wuse 2, Abuja",      cp:"Mrs. Show",    phone:"+234 803 000 0008",email:"mgr@showroom.ng",   cleaners:"Godfrey, Samuel, Solomon",  duty:"Mon-Sat",      cs:"2025-05-07",ce:"2026-05-06",sal:240000,con:0,     sc:60000, vat:4500,   tot:304500},
  {id:9, name:"INFRACORP",             cat:"Corporate", svc:"Cleaning",    addr:"12th Floor BOI Building, CBD, Abuja",        cp:"Mr. Infra",    phone:"+234 803 000 0009",email:"fm@infracorp.ng",   cleaners:"Mariam, Tobi",              duty:"Mon-Fri",      cs:"2025-05-21",ce:"2026-05-20",sal:150000,con:87500,sc:71250, vat:5343.75,tot:314093.75},
  {id:10,name:"Mr. Grant Ukaegbu",     cat:"Residence", svc:"Cleaning",    addr:"Apo Resettlement, Zone E, Abuja",            cp:"Mr. Grant",    phone:"+234 803 000 0010",email:"grant@email.com",   cleaners:"Peace Agocha",              duty:"Mon,Fri",      cs:"2024-10-01",ce:"2025-09-30",sal:45000, con:0,     sc:13500, vat:1012.5, tot:59512.5},
  {id:11,name:"Justice Abdulmalik",    cat:"Residence", svc:"Cleaning",    addr:"House 29, Rd 693, Judges Quarters, Gwarinpa",cp:"Justice A.",   phone:"+234 803 000 0011",email:"j.abd@court.ng",    cleaners:"Blessing",                  duty:"Mon,Wed,Sat",  cs:"2024-01-13",ce:"2025-01-12",sal:40000, con:0,     sc:12000, vat:900,    tot:52900},
  {id:12,name:"Mr. Justin Oko Odama",  cat:"Residence", svc:"Cleaning",    addr:"Plot 857 CAD Zone, Jahi, Abuja",             cp:"Mr. Justin",   phone:"+234 803 000 0012",email:"justin@email.com",  cleaners:"Janet",                     duty:"Mon,Wed,Sat",  cs:"2024-07-29",ce:"2025-07-28",sal:40000, con:0,     sc:12000, vat:900,    tot:52900},
  {id:13,name:"Mrs. Linda Azuonye",    cat:"Residence", svc:"Cleaning",    addr:"House 3, Fola Daniel Crescent, Jahi",        cp:"Mrs. Linda",   phone:"+234 803 000 0013",email:"linda@email.com",   cleaners:"Linda Tanko",               duty:"Mon,Wed,Fri,Sat",cs:"2024-08-17",ce:"2025-08-16",sal:60000,con:0,sc:18000,vat:1350,tot:79350},
  {id:14,name:"Mr. Sunday Ikorishor",  cat:"Residence", svc:"Cleaning",    addr:"Plot 25, Hillside Estate, Gwarinpa",         cp:"Mr. Sunday",   phone:"+234 803 000 0014",email:"sunday@email.com",  cleaners:"Rebecca",                   duty:"Wed,Sat",      cs:"2025-03-30",ce:"2026-03-29",sal:40000, con:0,     sc:12000, vat:900,    tot:52900},
  {id:15,name:"Mrs. Khareemah Kassim", cat:"Residence", svc:"Cleaning",    addr:"Flat 6, Darik Homes, Kaura, Abuja",          cp:"Mrs. Khareemah",phone:"+234 803 000 0015",email:"k.kassim@email.com",cleaners:"Vivian",                    duty:"Wed (Fortnight)",cs:"2025-03-04",ce:"2026-03-03",sal:20000,con:0,sc:6000,vat:450,tot:26450},
  {id:16,name:"Ms. Angela Obaseki",    cat:"Residence", svc:"Cleaning",    addr:"Katampe Extension, Abuja",                   cp:"Ms. Angela",   phone:"+234 803 000 0016",email:"angela@email.com",  cleaners:"Jennifer Ogah",             duty:"Tue,Sat",      cs:"2024-10-01",ce:"2025-10-31",sal:45000, con:0,     sc:13500, vat:1012.5, tot:59512.5},
  {id:17,name:"Tripple 9",             cat:"Food & Bev",svc:"Pest Control",addr:"Zone 4, Wuse, Abuja",                        cp:"Manager T9",   phone:"+234 803 000 0017",email:"mgr@triple9.ng",    cleaners:"—",                         duty:"Quarterly",    cs:"2025-03-10",ce:"2026-03-10",sal:0,     con:0,     sc:45000, vat:3375,   tot:48375},
  {id:18,name:"Crumble Bakery",        cat:"Food & Bev",svc:"Pest Control",addr:"Garki, Abuja",                               cp:"Mr. Crumble",  phone:"+234 803 000 0018",email:"info@crumble.ng",   cleaners:"—",                         duty:"Quarterly",    cs:"2025-04-26",ce:"2026-04-26",sal:0,     con:0,     sc:35000, vat:2625,   tot:37625},
];
const SEED_JOBS=[
  {id:"j1",clientName:"The Showroom",      svc:"Cleaning",    date:"2026-04-10",sup:"James Akpa", techs:"Faith Apeh, Veronica Apeh",status:"In Progress",      notes:"Weekly clean",checkIn:null,checkOut:null},
  {id:"j2",clientName:"IFRC",              svc:"Pest Control",date:"2026-04-09",sup:"Agnes Dung", techs:"Faith Apeh",               status:"Awaiting Approval",notes:"Quarterly",checkIn:"2026-04-09T08:30",checkOut:"2026-04-09T12:00"},
  {id:"j3",clientName:"INFRACORP",         svc:"Cleaning",    date:"2026-04-11",sup:"James Akpa", techs:"Veronica Apeh",            status:"Scheduled",        notes:"",checkIn:null,checkOut:null},
  {id:"j4",clientName:"Chayim Diagnostics",svc:"Both",        date:"2026-04-14",sup:"Agnes Dung", techs:"Faith Apeh, Veronica Apeh",status:"New",              notes:"",checkIn:null,checkOut:null},
  {id:"j5",clientName:"Crumble Bakery",    svc:"Pest Control",date:"2026-04-08",sup:"James Akpa", techs:"Faith Apeh",               status:"Completed",        notes:"Routine",checkIn:"2026-04-08T09:00",checkOut:"2026-04-08T11:30"},
];
const SEED_SCHEDULES=[
  {id:1,clientName:"IFRC",              service:"Pest Control",dateCarriedOut:"2025-02-07",dueDate:"2025-05-07",notes:"General fumigation"},
  {id:2,clientName:"Tripple 9",         service:"Pest Control",dateCarriedOut:"2025-03-10",dueDate:"2025-06-10",notes:""},
  {id:3,clientName:"Chayim Diagnostics",service:"Pest Control",dateCarriedOut:"2025-03-28",dueDate:"2025-06-28",notes:""},
  {id:4,clientName:"Crumble Bakery",    service:"Pest Control",dateCarriedOut:"2025-04-26",dueDate:"2025-07-26",notes:""},
];
const SEED_REQUESTS=[
  {id:"sr1",clientName:"Chayim Diagnostics",svc:"Pest Control",loc:"34 Euphrates Cres",prefDate:"2026-04-15",src:"WhatsApp",status:"Pending",notes:"Rodent issue in storage",created:"2026-04-01"},
  {id:"sr2",clientName:"INFRACORP",          svc:"Pest Control",loc:"BOI Building, CBD",prefDate:"2026-04-20",src:"Email",   status:"Pending",notes:"Ants on 12th floor",    created:"2026-04-06"},
];
const SEED_INVENTORY=[
  {id:"i1", item:"Multi-surface Cleaner (5L)",   cat:"Cleaning",    qty:12,reorder:5, cost:3500},
  {id:"i2", item:"Disinfectant Concentrate (5L)",cat:"Cleaning",    qty:8, reorder:4, cost:4200},
  {id:"i3", item:"Micro Fiber Towels (pack 10)",  cat:"Equipment",   qty:25,reorder:10,cost:2000},
  {id:"i4", item:"Mop Heads",                     cat:"Equipment",   qty:14,reorder:5, cost:5000},
  {id:"i5", item:"Cypermethrin 1L",               cat:"Pest Control",qty:3, reorder:4, cost:6500},
  {id:"i6", item:"Deltamethrin 500ml",            cat:"Pest Control",qty:2, reorder:3, cost:7800},
  {id:"i7", item:"Bait Stations (box 12)",        cat:"Pest Control",qty:6, reorder:3, cost:5500},
  {id:"i8", item:"Hand Gloves (box 100)",         cat:"PPE",         qty:4, reorder:5, cost:2800},
  {id:"i9", item:"Dust Masks (box 50)",           cat:"PPE",         qty:7, reorder:5, cost:1500},
  {id:"i10",item:"Spray Pump 5L",                cat:"Equipment",   qty:5, reorder:2, cost:8500},
];

// ── SHARED UI ────────────────────────────────────────────────────────────────
function SBadge({s,custom}){const st=custom||CONTRACT_COLORS[s]||STATUS_COLORS[s]||{bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb"};return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap border" style={{background:st.bg,color:st.color,borderColor:st.border}}>{s}</span>;}
function Card({children,className=""}){return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;}
function Fld({label,children,col=false,required=false}){return <div className={col?"col-span-2":""}><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label}{required&&<span className="text-red-400 ml-1">*</span>}</label>{children}</div>;}
function KPI({icon,label,value,sub,bg,onClick}){return <Card className={`p-5 overflow-hidden ${onClick?"cursor-pointer hover:shadow-md transition-shadow":""}`} onClick={onClick}><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3" style={{background:bg}}>{icon}</div><div className="text-2xl font-black text-gray-800">{value}</div><div className="text-xs font-bold text-gray-500 mt-1">{label}</div><div className="text-xs text-gray-400 mt-0.5">{sub}</div></Card>;}
function ModalWrap({title,children,onClose,wide=false,xl=false}){
  return(<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col ${xl?"max-w-4xl":wide?"max-w-2xl":"max-w-lg"}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>);}
function ConfirmModal({msg,onYes,onNo}){return(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"><div className="flex items-center gap-3 mb-4"><AlertTriangle size={20} style={{color:O}}/><p className="font-semibold text-gray-800">{msg}</p></div><div className="flex justify-end gap-3"><button onClick={onNo} className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">Cancel</button><button onClick={onYes} className="px-5 py-2 rounded-xl text-white text-sm font-bold" style={{background:RED}}>Delete</button></div></div></div>);}
function useConfirm(){const[state,setState]=useState(null);const confirm=(msg,onYes)=>setState({msg,onYes});const el=state?<ConfirmModal msg={state.msg} onYes={()=>{state.onYes();setState(null);}} onNo={()=>setState(null)}/>:null;return[confirm,el];}
function RadioG({value,onChange,options,danger=[]}){return <div className="flex flex-wrap gap-2 mt-1">{options.map(o=><label key={o} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${value===o?(danger.includes(o)?"border-red-500 bg-red-50 font-semibold text-red-800":"border-green-500 bg-green-50 font-semibold text-green-800"):"border-gray-200 text-gray-600 hover:border-gray-300"}`}><input type="radio" checked={value===o} onChange={()=>onChange(o)} className="accent-green-600"/>{o}</label>)}</div>;}

function buildNotifs(clients,jobs,inventory){
  const n=[];
  clients.forEach(c=>{const s=cStatus(c.ce);const dl=dLeft(c.ce);if(s==="Critical")n.push({id:`nc-${c.id}`,icon:"🔴",title:`Critical: ${c.name}`,body:`Expires in ${dl}d`,read:false});else if(s==="Expiring Soon")n.push({id:`na-${c.id}`,icon:"🟡",title:`Expiring Soon: ${c.name}`,body:`${dl} days left`,read:false});else if(s==="Expired")n.push({id:`ne-${c.id}`,icon:"⚫",title:`Expired: ${c.name}`,body:`Ended ${fmtD(c.ce)}`,read:false});});
  jobs.filter(j=>j.status==="Awaiting Approval").forEach(j=>n.push({id:`nj-${j.id}`,icon:"⏳",title:"Awaiting approval",body:`${j.clientName}`,read:false}));
  inventory.filter(i=>i.qty<=i.reorder).forEach(i=>n.push({id:`ni-${i.id}`,icon:"📦",title:"Low stock",body:`${i.item}: ${i.qty} left`,read:false}));
  return n;
}
function NotifPanel({notes,onRead,onClose}){
  const unread=notes.filter(n=>!n.read).length;
  return(<div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"><div className="flex items-center gap-2"><Bell size={14} style={{color:G}}/><span className="text-sm font-bold text-gray-800">Notifications</span>{unread>0&&<span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{background:RED}}>{unread}</span>}</div><div className="flex gap-2"><button onClick={()=>notes.forEach(n=>onRead(n.id))} className="text-xs text-green-700 hover:underline">Mark all read</button><button onClick={onClose}><X size={14} className="text-gray-400"/></button></div></div>
    <div className="max-h-80 overflow-y-auto">{notes.length===0?<div className="text-center py-8 text-gray-400 text-sm">All clear!</div>:notes.map(n=>(<div key={n.id} onClick={()=>onRead(n.id)} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${!n.read?"bg-green-50/40":""}`}><span className="text-base flex-shrink-0">{n.icon}</span><div className="flex-1 min-w-0"><p className={`text-xs ${!n.read?"font-bold text-gray-800":"font-medium text-gray-600"}`}>{n.title}</p><p className="text-xs text-gray-400 truncate">{n.body}</p></div>{!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{background:G}}/>}</div>))}</div>
  </div>);}

// ── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin,users}){
  const[em,setEm]=useState("");const[pw,setPw]=useState("");const[sp,setSp]=useState(false);const[err,setErr]=useState("");const[forgot,setForgot]=useState(false);const[fpEmail,setFpEmail]=useState("");const[fpSent,setFpSent]=useState(false);
  const go=()=>{const u=users.find(u=>(u.email===em.trim()||u.username===em.trim())&&u.password===pw);u?onLogin(u):setErr("Invalid credentials.");};
  return(<div className="min-h-screen flex" style={{background:`linear-gradient(145deg,${GD} 0%,#1B5E2F 60%,${GD} 100%)`}}>
    <div className="hidden lg:flex flex-1 flex-col justify-center p-16 text-white">
      <img src={LOGO} alt="D&W" className="w-24 mb-4 drop-shadow-lg"/>
      <h1 className="text-5xl font-black mb-1" style={{fontFamily:"Georgia,serif",letterSpacing:"-1px"}}>Operations Hub</h1>
      <p className="text-green-200 text-lg mt-1">Dust &amp; Wipes Limited</p>
      <p className="text-green-400 italic text-sm mt-1">"Restoring a Clean World"</p>
      <div className="mt-10 grid grid-cols-2 gap-3 w-72">{[["18","Clients"],["15","Modules"],["₦3.4M+","Portfolio"],["3","User Roles"]].map(([v,l])=><div key={l} className="rounded-2xl p-4 text-center" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)"}}><div className="text-2xl font-black" style={{color:O}}>{v}</div><div className="text-green-200 text-xs mt-1">{l}</div></div>)}</div>
    </div>
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6"><img src={LOGO} alt="D&W" className="w-12 mx-auto mb-3"/><h2 className="text-2xl font-black text-gray-800">Welcome Back</h2><p className="text-gray-400 text-sm">Sign in to Operations Hub</p></div>
        {err&&<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4"><AlertTriangle size={14}/>{err}</div>}
        <div className="space-y-4">
          <Fld label="Email or Username"><input className={inp} type="text" value={em} onChange={e=>{setEm(e.target.value);setErr("");}} placeholder="email@dustandwipes.com or phone"/></Fld>
          <Fld label="Password"><div className="relative"><input className={inp+" pr-10"} type={sp?"text":"password"} value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"/><button type="button" onClick={()=>setSp(p=>!p)} className="absolute right-3 top-2.5 text-gray-400">{sp?<EyeOff size={16}/>:<Eye size={16}/>}</button></div><button onClick={()=>setForgot(true)} className="text-xs mt-2 text-green-700 hover:underline float-right">Forgot password?</button></Fld>
          <button onClick={go} className="w-full py-3 rounded-xl text-white font-bold text-sm mt-2 clear-both" style={{background:`linear-gradient(135deg,${G},#2D8A45)`}}>Sign In →</button>
        </div>
      </div>
    </div>
    {forgot&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"><h3 className="font-bold text-gray-800 mb-1">Reset Password</h3><p className="text-xs text-gray-400 mb-5">Enter your email and a reset link will be sent.</p>{fpSent?<div className="p-4 rounded-xl text-sm text-green-700 font-medium" style={{background:GL}}>✅ Reset link sent to <strong>{fpEmail}</strong>.</div>:<div className="space-y-4"><Fld label="Email Address"><input className={inp} type="email" value={fpEmail} onChange={e=>setFpEmail(e.target.value)} placeholder="your@dustandwipes.com"/></Fld><button onClick={()=>{if(fpEmail)setFpSent(true);}} disabled={!fpEmail} className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Send Reset Link</button></div>}<button onClick={()=>{setForgot(false);setFpSent(false);setFpEmail("");}} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600">← Back to sign in</button></div></div>)}
  </div>);}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({clients,jobs,requests,inventory,users,staff,onNav}){
  const ws=useMemo(()=>clients.map(c=>({...c,status:cStatus(c.ce)})),[clients]);
  const critical=ws.filter(c=>c.status==="Critical").length,awaiting=jobs.filter(j=>j.status==="Awaiting Approval").length,lowStock=inventory.filter(i=>i.qty<=i.reorder).length,pending=requests.filter(r=>r.status==="Pending").length,activeJobs=jobs.filter(j=>!["Completed","Closed"].includes(j.status)).length;
  const allPeople=[...users,...staff];
  const todayM=TODAY.getMonth()+1,todayD=TODAY.getDate();
  const bdays=allPeople.filter(u=>u.dob&&new Date(u.dob).getMonth()+1===todayM).sort((a,b)=>new Date(a.dob).getDate()-new Date(b.dob).getDate());
  const todayBdays=bdays.filter(u=>new Date(u.dob).getDate()===todayD);
  const sc=JOB_STATUSES.slice(0,-1).map(s=>({s,count:jobs.filter(j=>j.status===s).length})).filter(d=>d.count>0);
  return(<div className="space-y-6">
    {todayBdays.length>0&&<div className="flex items-center gap-3 p-4 rounded-2xl" style={{background:"#fdf4ff",border:"1px solid #e9d5ff"}}><span className="text-2xl">🎂</span><div><p className="font-bold text-purple-800">Birthday Today!</p><p className="text-purple-600 text-sm">{todayBdays.map(u=>u.name).join(", ")} — Happy Birthday! 🎉</p></div></div>}
    {(critical+awaiting+lowStock)>0&&<div className="grid grid-cols-1 md:grid-cols-3 gap-3">{critical>0&&<div className="flex items-center gap-3 p-3.5 rounded-xl text-sm" style={{background:"#fee2e2",border:"1px solid #fca5a5"}}><AlertTriangle size={16} style={{color:RED}}/><div><p className="font-bold text-red-800">🔴 {critical} contract(s) critical</p><button onClick={()=>onNav("contracts")} className="text-xs text-red-600 underline">View</button></div></div>}{awaiting>0&&<div className="flex items-center gap-3 p-3.5 rounded-xl text-sm" style={{background:"#fff7ed",border:"1px solid #fed7aa"}}><Clock size={16} style={{color:O}}/><div><p className="font-bold text-orange-800">⏳ {awaiting} job(s) awaiting approval</p><button onClick={()=>onNav("jobs")} className="text-xs text-orange-600 underline">Review</button></div></div>}{lowStock>0&&<div className="flex items-center gap-3 p-3.5 rounded-xl text-sm" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><Package size={16} style={{color:BLUE}}/><div><p className="font-bold text-blue-800">📦 {lowStock} item(s) low stock</p><button onClick={()=>onNav("inventory")} className="text-xs text-blue-600 underline">View</button></div></div>}</div>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><KPI icon="⚙️" label="Active Jobs" value={activeJobs} sub={`${awaiting} need approval`} bg="#fffbeb" onClick={()=>onNav("jobs")}/><KPI icon="📩" label="Pending Requests" value={pending} sub="Awaiting conversion" bg="#eff6ff" onClick={()=>onNav("requests")}/><KPI icon="🔴" label="Critical Contracts" value={critical} sub="+expiring soon" bg="#fee2e2" onClick={()=>onNav("contracts")}/><KPI icon="📦" label="Low Stock Items" value={lowStock} sub="Below reorder level" bg="#f0f9ff" onClick={()=>onNav("inventory")}/></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Jobs by Status</h3><ResponsiveContainer width="100%" height={160}><BarChart data={sc} barSize={28}><XAxis dataKey="s" axisLine={false} tickLine={false} tick={{fontSize:9,fill:"#6b7280"}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:9}} allowDecimals={false}/><Tooltip contentStyle={{borderRadius:"12px"}}/><Bar dataKey="count" radius={[6,6,0,0]}>{sc.map((_,i)=><Cell key={i} fill={[G,BLUE,O,"#7c3aed","#ea580c","#16a34a"][i%6]}/>)}</Bar></BarChart></ResponsiveContainer></Card>
      <Card className="p-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Gift size={12} style={{color:"#9333ea"}}/>Birthdays This Month</h3>{bdays.length===0?<p className="text-gray-400 text-sm text-center py-4">No birthdays this month</p>:<div className="space-y-2 max-h-40 overflow-y-auto">{bdays.map(u=>{const d=new Date(u.dob);const isToday=d.getDate()===todayD;return(<div key={u.id} className={`flex items-center justify-between p-2.5 rounded-xl ${isToday?"border border-purple-200":"border border-gray-100"}`} style={isToday?{background:"#fdf4ff"}:{background:"#fafafa"}}><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:isToday?"#9333ea":G}}>{(u.initial||u.name[0])}</div><div><p className="text-sm font-semibold text-gray-800">{u.name}</p><p className="text-xs text-gray-400">{u.role}</p></div></div><p className={`text-xs font-bold ${isToday?"text-purple-600":"text-gray-500"}`}>{isToday?"🎂 Today!":d.getDate()+" "+monthName(d.getMonth())}</p></div>);})}</div>}</Card>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contract Alerts</h3><button onClick={()=>onNav("contracts")} className="text-xs text-green-700 hover:underline flex items-center gap-1">View all<ChevronRight size={10}/></button></div><div className="space-y-2">{ws.filter(c=>c.status!=="Active").slice(0,5).map(c=>{const dl=dLeft(c.ce);return(<div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:"#fafafa",border:"1px solid #f3f4f6"}}><div><p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">{c.name}</p><p className="text-xs text-gray-400">{fmtD(c.ce)}</p></div><div className="flex items-center gap-2">{dl!==null&&<span className={`text-xs font-bold ${dl<0?"text-gray-500":dl<=30?"text-red-500":"text-amber-500"}`}>{dl<0?`${Math.abs(dl)}d ago`:`${dl}d`}</span>}<SBadge s={c.status}/></div></div>);})}</div></Card>
      <Card className="p-6"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inventory Alerts</h3><button onClick={()=>onNav("inventory")} className="text-xs text-green-700 hover:underline flex items-center gap-1">View all<ChevronRight size={10}/></button></div><div className="space-y-2">{inventory.filter(i=>i.qty<=i.reorder).map(i=><div key={i.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:"#fafafa",border:"1px solid #f3f4f6"}}><div><p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">{i.item}</p><p className="text-xs text-gray-400">{i.cat}</p></div><div className="text-right"><p className="text-sm font-black text-red-600">{i.qty}</p><p className="text-xs text-gray-400">min {i.reorder}</p></div></div>)}{inventory.filter(i=>i.qty<=i.reorder).length===0&&<p className="text-gray-400 text-sm text-center py-4">✅ All stock levels OK</p>}</div></Card>
    </div>
  </div>);}

// ── CLIENTS ──────────────────────────────────────────────────────────────────
function ClientsPage({clients,setClients,userRole}){
  const[search,setSearch]=useState("");const[ft,setFt]=useState("All");const[fs,setFs]=useState("All");const[modal,setModal]=useState(null);
  const[confirm,confirmEl]=useConfirm();
  const ws=useMemo(()=>clients.map(c=>({...c,status:cStatus(c.ce)})),[clients]);
  const filtered=useMemo(()=>ws.filter(c=>[c.name,c.addr,c.cleaners,c.cp,c.phone].join(" ").toLowerCase().includes(search.toLowerCase())&&(ft==="All"||c.svc===ft)&&(fs==="All"||c.status===fs)),[ws,search,ft,fs]);
  const save=data=>{if(data.id)setClients(cs=>cs.map(c=>c.id===data.id?data:c));else setClients(cs=>[...cs,{...data,id:++_uid}]);setModal(null);};
  const del=id=>confirm("Delete this client?",()=>setClients(cs=>cs.filter(c=>c.id!==id)));
  const can=userRole!=="Technician";
  return(<div className="space-y-5">{confirmEl}
    <div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-52"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input className={inp+" pl-9"} placeholder="Name, address, phone…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select className={inp+" w-auto"} value={ft} onChange={e=>setFt(e.target.value)}><option value="All">All Services</option><option>Cleaning</option><option>Pest Control</option><option>Both</option></select><select className={inp+" w-auto"} value={fs} onChange={e=>setFs(e.target.value)}><option value="All">All Statuses</option><option>Active</option><option>Expiring Soon</option><option>Critical</option><option>Expired</option></select>{can&&<button onClick={()=>setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Client</button>}</div>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Client","Service","Category","Contact","Phone","Contract End","Value","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{filtered.map(c=>(<tr key={c.id} className="hover:bg-gray-50/70 transition-colors"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:c.svc==="Pest Control"?O:G}}>{c.name[0]}</div><div><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-400 max-w-[140px] truncate">{c.addr}</p></div></div></td><td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-lg font-medium" style={c.svc==="Pest Control"?{background:OL,color:"#c2410c"}:c.svc==="Both"?{background:"#f3f4f6",color:"#374151"}:{background:GL,color:G}}>{c.svc}</span></td><td className="px-4 py-3 text-xs text-gray-500">{c.cat}</td><td className="px-4 py-3 text-xs text-gray-500">{c.cp}</td><td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.phone}</td><td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.ce)}</td><td className="px-4 py-3 font-bold text-gray-700 text-sm whitespace-nowrap">{fmt(c.tot)}</td><td className="px-4 py-3"><SBadge s={c.status}/></td><td className="px-4 py-3">{can&&<div className="flex items-center gap-1.5"><button onClick={()=>setModal(c)} className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(c.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div>}</td></tr>))}</tbody></table>{filtered.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No clients match your filters</div>}</div></Card>
    {modal!==null&&<ClientModal data={modal.id?modal:null} onSave={save} onClose={()=>setModal(null)}/>}
  </div>);}
function ClientModal({data,onSave,onClose}){
  const blank={name:"",cat:"Corporate",svc:"Cleaning",addr:"",cp:"",phone:"",email:"",cleaners:"",duty:"Mon-Fri",cs:"",ce:"",sal:0,con:0,sc:0,vat:0,tot:0};
  const[f,setF]=useState(data||blank);const u=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  return(<ModalWrap title={data?"Edit Client":"Add New Client"} onClose={onClose} xl>
    <div className="grid grid-cols-2 gap-4"><Fld label="Client / Company Name" col><input className={inp} value={f.name} onChange={u("name")}/></Fld><Fld label="Category"><select className={inp} value={f.cat} onChange={u("cat")}><option>Corporate</option><option>NGO</option><option>Healthcare</option><option>Real Estate</option><option>Food & Bev</option><option>Retail</option><option>Residence</option><option>Other</option></select></Fld><Fld label="Service Type"><select className={inp} value={f.svc} onChange={u("svc")}><option>Cleaning</option><option>Pest Control</option><option>Both</option></select></Fld><Fld label="Address" col><input className={inp} value={f.addr} onChange={u("addr")}/></Fld><Fld label="Contact Person"><input className={inp} value={f.cp} onChange={u("cp")}/></Fld><Fld label="Phone"><input className={inp} value={f.phone} onChange={u("phone")}/></Fld><Fld label="Email"><input className={inp} type="email" value={f.email} onChange={u("email")}/></Fld><Fld label="Cleaners Assigned"><input className={inp} value={f.cleaners} onChange={u("cleaners")}/></Fld><Fld label="Duty Days"><input className={inp} value={f.duty} onChange={u("duty")}/></Fld><Fld label="Contract Start"><input className={inp} type="date" value={f.cs} onChange={u("cs")}/></Fld><Fld label="Contract End"><input className={inp} type="date" value={f.ce} onChange={u("ce")}/></Fld><div className="col-span-2 border-t pt-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Financials (₦)</p></div><Fld label="Salary"><input className={inp} type="number" value={f.sal} onChange={u("sal")}/></Fld><Fld label="Consumables"><input className={inp} type="number" value={f.con} onChange={u("con")}/></Fld><Fld label="Service Charge"><input className={inp} type="number" value={f.sc} onChange={u("sc")}/></Fld><Fld label="VAT"><input className={inp} type="number" value={f.vat} onChange={u("vat")}/></Fld><Fld label="Total Contract Sum" col><input className={inp} type="number" value={f.tot} onChange={u("tot")}/></Fld></div>
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>onSave(f)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{data?"Save Changes":"Add Client"}</button></div>
  </ModalWrap>);}

// ── CONTRACTS ────────────────────────────────────────────────────────────────
function ContractsPage({clients}){
  const[filter,setFilter]=useState("All");
  const ws=useMemo(()=>clients.map(c=>({...c,status:cStatus(c.ce)})),[clients]);
  const sorted=useMemo(()=>(filter==="All"?ws:ws.filter(c=>c.status===filter)).sort((a,b)=>(dLeft(a.ce)||0)-(dLeft(b.ce)||0)),[ws,filter]);
  const stats=[{l:"Active",v:ws.filter(c=>c.status==="Active").length,c:"#22c55e",bg:"#dcfce7"},{l:"Expiring Soon",v:ws.filter(c=>c.status==="Expiring Soon").length,c:AMBER,bg:"#fffbeb"},{l:"Critical ≤30d",v:ws.filter(c=>c.status==="Critical").length,c:RED,bg:"#fee2e2"},{l:"Expired",v:ws.filter(c=>c.status==="Expired").length,c:"#6b7280",bg:"#f3f4f6"}];
  return(<div className="space-y-5">
    <div className="p-3 rounded-xl text-xs text-gray-600" style={{background:GL,border:`1px solid ${G}30`}}>🔔 <strong>Alert Policy:</strong> <span className="font-bold text-amber-600">Amber</span> ≤60d · <span className="font-bold text-red-600">Red/Critical</span> ≤30d · SMS &amp; Email to Admin &amp; Supervisor.</div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map(s=><button key={s.l} onClick={()=>setFilter(filter===s.l?"All":s.l)} className="p-5 rounded-2xl border-2 text-center transition-all bg-white border-gray-100 hover:shadow" style={filter===s.l?{borderColor:s.c,background:s.bg}:{}}><div className="text-3xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-xs font-semibold text-gray-500 mt-1">{s.l}</div></button>)}</div>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Client","Service","Phone","Start","End","Days Left","Value","Status"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{sorted.map(c=>{const dl=dLeft(c.ce);return(<tr key={c.id} className="hover:bg-gray-50/70"><td className="px-4 py-3.5"><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.cp}</p></td><td className="px-4 py-3.5 text-xs text-gray-500">{c.svc}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{c.phone}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.cs)}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.ce)}</td><td className="px-4 py-3.5">{dl!==null&&<span className={`text-xs font-bold ${dl<0?"text-gray-500":dl<=30?"text-red-600":dl<=60?"text-amber-600":"text-green-600"}`}>{dl<0?`${Math.abs(dl)}d ago`:`${dl}d`}</span>}</td><td className="px-4 py-3.5 font-bold text-gray-700 whitespace-nowrap">{fmt(c.tot)}</td><td className="px-4 py-3.5"><SBadge s={c.status}/></td></tr>);})}</tbody></table></div></Card>
  </div>);}

// ── SERVICE REQUESTS ─────────────────────────────────────────────────────────
function RequestsPage({requests,setRequests,setJobs,clients}){
  const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const blank={clientName:"",svc:"",loc:"",prefDate:"",src:"Phone",status:"Pending",notes:""};
  const save=data=>{if(data.id)setRequests(rs=>rs.map(r=>r.id===data.id?data:r));else setRequests(rs=>[...rs,{...data,id:"sr"+Date.now(),created:TODAY.toISOString().split("T")[0]}]);setModal(null);};
  const convert=req=>{setJobs(js=>[...js,{id:"j"+Date.now(),clientName:req.clientName,svc:req.svc,date:req.prefDate,sup:"",techs:"",status:"New",notes:req.notes,checkIn:null,checkOut:null}]);setRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"Converted"}:r));};
  const del=id=>confirm("Delete this request?",()=>setRequests(rs=>rs.filter(r=>r.id!==id)));
  const SC={Pending:{bg:"#fffbeb",color:AMBER,border:"#fde68a"},Converted:{bg:"#f0fdf4",color:"#16a34a",border:"#bbf7d0"},Declined:{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"}};
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between"><div className="flex gap-3"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fffbeb",color:AMBER}}>{requests.filter(r=>r.status==="Pending").length} Pending</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:GL,color:G}}>{requests.filter(r=>r.status==="Converted").length} Converted</div></div><button onClick={()=>setModal(blank)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Log Request</button></div>
    <Card><div className="divide-y divide-gray-50">{requests.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No requests yet</div>}{requests.map(r=>(<div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.clientName||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{r.clientName}</p><p className="text-xs text-gray-500">{r.svc} · {fmtD(r.prefDate)} · via {r.src}</p>{r.notes&&<p className="text-xs text-gray-400 italic mt-0.5">"{r.notes}"</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={r.status} custom={SC[r.status]}/>{r.status==="Pending"&&<button onClick={()=>convert(r)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1" style={{background:BLUE}}><ArrowRight size={11}/>Convert</button>}<button onClick={()=>setModal(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>))}</div></Card>
    {modal&&<ModalWrap title={modal.id?"Edit Request":"Log Service Request"} onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Client Name"><input className={inp} value={modal.clientName} onChange={e=>setModal(p=>({...p,clientName:e.target.value}))}/></Fld><Fld label="Service"><select className={inp} value={modal.svc} onChange={e=>setModal(p=>({...p,svc:e.target.value}))}><option value="">— Select —</option><option>General Cleaning</option><option>One-Time Cleaning</option><option>Deep Cleaning</option><option>Pest Control</option><option>Fumigation</option></select></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Location"><input className={inp} value={modal.loc} onChange={e=>setModal(p=>({...p,loc:e.target.value}))}/></Fld><Fld label="Preferred Date"><input className={inp} type="date" value={modal.prefDate} onChange={e=>setModal(p=>({...p,prefDate:e.target.value}))}/></Fld><Fld label="Source"><select className={inp} value={modal.src} onChange={e=>setModal(p=>({...p,src:e.target.value}))}><option>Phone</option><option>WhatsApp</option><option>Email</option><option>Walk-in</option><option>Website</option><option>Referral</option></select></Fld></div><Fld label="Notes" col><textarea className={inp} rows={3} value={modal.notes} onChange={e=>setModal(p=>({...p,notes:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Save</button></div></ModalWrap>}
  </div>);}

// ── JOBS ─────────────────────────────────────────────────────────────────────
function JobsPage({jobs,setJobs,clients,user}){
  const[modal,setModal]=useState(null);const[filter,setFilter]=useState("All");const[gpsModal,setGpsModal]=useState(null);
  const[confirm,confirmEl]=useConfirm();
  const filtered=filter==="All"?jobs:jobs.filter(j=>j.status===filter);
  const save=data=>{if(data.id)setJobs(js=>js.map(j=>j.id===data.id?data:j));else setJobs(js=>[...js,{...data,id:"j"+Date.now(),checkIn:null,checkOut:null}]);setModal(null);};
  const advance=(id,ns)=>setJobs(js=>js.map(j=>j.id===id?{...j,status:ns}:j));
  const del=id=>confirm("Delete this job?",()=>setJobs(js=>js.filter(j=>j.id!==id)));
  const canEdit=user.role!=="Technician",isTech=user.role==="Technician";
  return(<div className="space-y-5">{confirmEl}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{["All",...JOB_STATUSES].map(s=><button key={s} onClick={()=>setFilter(s)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border ${filter===s?"text-white border-transparent":"bg-white text-gray-500 border-gray-200"}`} style={filter===s?{background:s==="All"?GD:(STATUS_COLORS[s]?.color||G)}:{}}>{s} ({s==="All"?jobs.length:jobs.filter(j=>j.status===s).length})</button>)}</div>{canEdit&&<button onClick={()=>setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Job</button>}</div>
    <Card><div className="divide-y divide-gray-50">{filtered.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No jobs match this filter</div>}{filtered.map(j=>{const sc=STATUS_COLORS[j.status]||{};const ns=JOB_STATUSES[JOB_STATUSES.indexOf(j.status)+1];const canCI=isTech&&j.status==="Assigned"&&!j.checkIn;const canCO=isTech&&j.status==="In Progress"&&j.checkIn&&!j.checkOut;return(<div key={j.id} className="px-5 py-4 hover:bg-gray-50/60"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:sc.color||G}}>{(j.clientName||"?")[0]}</div><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-gray-800 text-sm">{j.clientName}</p><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{j.svc}</span><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{fmtD(j.date)}</span></div><p className="text-xs text-gray-400 mt-0.5">Sup: {j.sup||"—"} · Crew: {j.techs||"—"}</p>{j.checkIn&&<p className="text-xs text-green-600 mt-0.5">✓ In: {fmtDT(j.checkIn)}{j.checkOut?` · Out: ${fmtDT(j.checkOut)} · ${calcDur(j.checkIn,j.checkOut)}`:""}</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0"><SBadge s={j.status}/><div className="flex gap-1">{canCI&&<button onClick={()=>setGpsModal({job:j,type:"in"})} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:G}}>Check In</button>}{canCO&&<button onClick={()=>setGpsModal({job:j,type:"out"})} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:O}}>Check Out</button>}{canEdit&&ns&&!["Closed"].includes(j.status)&&<button onClick={()=>advance(j.id,ns)} className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-0.5" style={{background:BLUE}}><ArrowRight size={9}/>{ns}</button>}{canEdit&&<button onClick={()=>setModal(j)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={12}/></button>}{canEdit&&<button onClick={()=>del(j.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={12}/></button>}</div></div></div></div>);})}</div></Card>
    {modal!==null&&<ModalWrap title={modal.id?"Edit Job":"Create Job"} onClose={()=>setModal(null)} wide><div className="grid grid-cols-2 gap-4"><Fld label="Client" col><select className={inp} value={modal.clientName||""} onChange={e=>setModal(p=>({...p,clientName:e.target.value}))}><option value="">— Select —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><Fld label="Service"><select className={inp} value={modal.svc||"Cleaning"} onChange={e=>setModal(p=>({...p,svc:e.target.value}))}><option>Cleaning</option><option>Pest Control</option><option>Both</option><option>Deep Cleaning</option></select></Fld><Fld label="Scheduled Date"><input className={inp} type="date" value={modal.date||""} onChange={e=>setModal(p=>({...p,date:e.target.value}))}/></Fld><Fld label="Status"><select className={inp} value={modal.status||"New"} onChange={e=>setModal(p=>({...p,status:e.target.value}))}>{JOB_STATUSES.map(s=><option key={s}>{s}</option>)}</select></Fld><Fld label="Supervisor"><input className={inp} value={modal.sup||""} onChange={e=>setModal(p=>({...p,sup:e.target.value}))}/></Fld><Fld label="Technicians"><input className={inp} value={modal.techs||""} onChange={e=>setModal(p=>({...p,techs:e.target.value}))}/></Fld><Fld label="Notes" col><textarea className={inp} rows={3} value={modal.notes||""} onChange={e=>setModal(p=>({...p,notes:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{modal.id?"Save":"Create"}</button></div></ModalWrap>}
    {gpsModal&&<GpsModal job={gpsModal.job} type={gpsModal.type} onSave={data=>{setJobs(js=>js.map(j=>j.id===data.id?data:j));setGpsModal(null);}} onClose={()=>setGpsModal(null)}/>}
  </div>);}
function GpsModal({job,type,onSave,onClose}){
  const[loc,setLoc]=useState(null);const[loading,setLoading]=useState(true);const[note,setNote]=useState(null);
  useEffect(()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition(pos=>{setLoc({lat:pos.coords.latitude.toFixed(5),lng:pos.coords.longitude.toFixed(5),acc:Math.round(pos.coords.accuracy)});setLoading(false);},()=>{setLoc({lat:"9.07650",lng:"7.39876",acc:15});setLoading(false);setNote("GPS unavailable — simulated Abuja coords used");});}else{setLoc({lat:"9.07650",lng:"7.39876",acc:15});setLoading(false);setNote("GPS not supported");}},[]);
  const confirm=()=>{const now=new Date().toISOString().slice(0,16);const gs=loc?`${loc.lat}°N, ${loc.lng}°E (±${loc.acc}m)`:"Unavailable";onSave(type==="in"?{...job,status:"In Progress",checkIn:now,gpsIn:gs}:{...job,status:"Awaiting Approval",checkOut:now,gpsOut:gs});};
  return(<ModalWrap title={type==="in"?"🗺️ GPS Check-In":"🗺️ GPS Check-Out"} onClose={onClose}><div className="space-y-4"><div className="p-4 rounded-2xl text-center" style={{background:GL}}><p className="font-bold text-green-800">{job.clientName}</p></div>{loading?<div className="flex flex-col items-center gap-3 py-6"><div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin"/><p className="text-sm text-gray-500">Acquiring GPS…</p></div>:<div className="p-4 rounded-xl" style={{background:"#f0f9ff",border:"1px solid #bae6fd"}}><p className="text-xs font-bold text-blue-700 mb-2">📍 Location Captured</p>{loc&&<><p className="text-sm text-blue-800 font-mono">Lat: {loc.lat}°N</p><p className="text-sm text-blue-800 font-mono">Lng: {loc.lng}°E</p></>}<p className="text-xs text-blue-500 mt-1">{new Date().toLocaleString("en-GB")}</p>{note&&<p className="text-xs text-amber-600 mt-2">⚠️ {note}</p>}</div>}</div><div className="flex justify-end gap-3 pt-4 border-t"><button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={confirm} disabled={loading} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{background:type==="in"?G:O}}>{type==="in"?"Confirm Check-In ✓":"Confirm Check-Out ✓"}</button></div></ModalWrap>);}

// ── PEST SCHEDULE ─────────────────────────────────────────────────────────────
function SchedulePage({schedules,setSchedules,clients,userRole}){
  const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const canEdit=userRole!=="Technician";
  const ws=schedules.map(s=>({...s,overdue:new Date(s.dueDate)<TODAY}));
  const save=data=>{if(data.id)setSchedules(ss=>ss.map(s=>s.id===data.id?data:s));else setSchedules(ss=>[...ss,{...data,id:Date.now()}]);setModal(null);};
  const del=id=>confirm("Delete this schedule?",()=>setSchedules(ss=>ss.filter(s=>s.id!==id)));
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between"><div className="flex gap-3"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fee2e2",color:RED}}>{ws.filter(s=>s.overdue).length} Overdue</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dbeafe",color:BLUE}}>{ws.filter(s=>!s.overdue).length} Upcoming</div></div>{canEdit&&<button onClick={()=>setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Visit</button>}</div>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Client","Service","Date Done","Next Due","Status","Notes",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{ws.map(s=><tr key={s.id} className="hover:bg-gray-50/70"><td className="px-4 py-3.5 font-semibold text-gray-800">{s.clientName}</td><td className="px-4 py-3.5 text-xs text-gray-600">{s.service}</td><td className="px-4 py-3.5 text-xs text-gray-500">{fmtD(s.dateCarriedOut)}</td><td className="px-4 py-3.5 text-xs text-gray-500">{fmtD(s.dueDate)}</td><td className="px-4 py-3.5"><SBadge s={s.overdue?"Overdue":"Upcoming"} custom={s.overdue?{bg:"#fee2e2",color:RED,border:"#fca5a5"}:{bg:"#dbeafe",color:"#1e40af",border:"#bfdbfe"}}/></td><td className="px-4 py-3.5 text-xs text-gray-400">{s.notes||"—"}</td><td className="px-4 py-3.5">{canEdit&&<div className="flex gap-1"><button onClick={()=>setModal(s)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div>}</td></tr>)}</tbody></table></div></Card>
    {modal!==null&&<ModalWrap title={modal.id?"Edit Schedule":"New Pest Visit"} onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Client"><select className={inp} value={modal.clientName||""} onChange={e=>setModal(p=>({...p,clientName:e.target.value}))}><option value="">— Select —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><Fld label="Service"><select className={inp} value={modal.service||"Pest Control"} onChange={e=>setModal(p=>({...p,service:e.target.value}))}><option>Pest Control</option><option>Fumigation</option><option>Rodent Control</option><option>Termite Treatment</option></select></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Date Done"><input className={inp} type="date" value={modal.dateCarriedOut||""} onChange={e=>setModal(p=>({...p,dateCarriedOut:e.target.value}))}/></Fld><Fld label="Next Due"><input className={inp} type="date" value={modal.dueDate||""} onChange={e=>setModal(p=>({...p,dueDate:e.target.value}))}/></Fld></div><Fld label="Notes" col><textarea className={inp} rows={3} value={modal.notes||""} onChange={e=>setModal(p=>({...p,notes:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{modal.id?"Save":"Add"}</button></div></ModalWrap>}
  </div>);}

// ── SITE REPORTS ─────────────────────────────────────────────────────────────
// Constants
const EQUIPMENT_OPTS=["Vacuum Cleaner","Industrial Vacuum","Steam Cleaner","Scrubbing Machine","Pressure Washer","Carpet Extractor","Dryer/Blower","Power Extension Box","Spray Pump (Manual)","Spray Pump (Motorised)","Mop & Bucket Set","Ladder","Squeegee","Scrubbing Brushes","PPE Kit"];
const SUPPLY_OPTS=["Liquid Soap","CH Bleach","Hypo Toilet Cleaner","Disinfectant Concentrate","Glass Cleaner","Morning Fresh","Fabuloso","Mr Sheen","Varnish/Fabric Softener","Air Freshener","Camphor","Scouring Powder","Microfiber Cloths","Trash Bags/Liners"];
const CLEANING_TASK_OPTS=["General Cleaning","Deep Cleaning","Residential Cleaning","Office Cleaning","Carpet/Rug Cleaning","Upholstery Cleaning","Kitchen Cleaning","Bathroom & Toilet Cleaning","Window Cleaning","Floor Scrubbing & Polishing","Post-Construction Cleaning","Ceiling & Wall Cleaning"];
const PEST_TASK_OPTS=["General Fumigation","Termite Treatment","Rodent Control","Cockroach Treatment","Bed Bug Treatment","Mosquito Control","Ant & Crawling Insect Control","Flying Insect Control","Pre-Construction Treatment"];

function CheckGroup({options,value=[],onChange}){
  const tog=o=>onChange(value.includes(o)?value.filter(v=>v!==o):[...value,o]);
  return <div className="grid grid-cols-2 gap-2 mt-1">{options.map(o=><label key={o} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${value.includes(o)?"border-green-500 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600 hover:border-gray-300"}`}><input type="checkbox" checked={value.includes(o)} onChange={()=>tog(o)} className="accent-green-600 flex-shrink-0"/>{o}</label>)}</div>;
}

function StarRating({value,onChange,label}){
  const lbl=["","Poor","Below Average","Average","Good","Excellent"];
  return(<div><label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>onChange(n)} className="w-10 h-10 rounded-xl font-black text-sm transition-all" style={value===n?{background:n<=2?RED:n===3?AMBER:G,color:"#fff"}:{background:"#f3f4f6",color:"#9ca3af"}}>{n}</button>)}{value>0&&<span className="text-xs font-semibold ml-1" style={{color:value<=2?RED:value===3?AMBER:G}}>{lbl[value]}</span>}</div>
  </div>);
}

const SR_SECTIONS=["General Info","Job Details","Quality Control","Safety","Client Feedback","Photos & Notes","Confirmation"];

function SiteReportsPage({reports,setReports,user,clients}){
  const[showForm,setShowForm]=useState(false);const[view,setView]=useState(null);
  const[confirm,confirmEl]=useConfirm();
  const del=id=>confirm("Delete this report?",()=>setReports(rs=>rs.filter(r=>r.id!==id)));
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between">
      <div className="flex gap-3">
        <div className="p-3 rounded-xl text-sm font-bold" style={{background:GL,color:G}}>{reports.length} Total</div>
        <div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dcfce7",color:"#166534"}}>{reports.filter(r=>r.overallAssessment==="Job Completed Successfully").length} Completed</div>
      </div>
      <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Report</button>
    </div>
    <Card>{reports.length===0?
      <div className="text-center py-16 text-gray-400"><ClipboardList size={40} className="mx-auto mb-3 opacity-20"/><p className="text-sm font-semibold">No site visit reports yet</p><p className="text-xs mt-1">Reports capture job details, quality scores, photos and client feedback</p></div>:
      <div className="divide-y divide-gray-50">{reports.map(r=>{
        const photos=r.photos||[];
        const done=r.overallAssessment==="Job Completed Successfully";
        const sc=done?{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}:{bg:"#fff7ed",color:AMBER,border:"#fde68a"};
        return(<div key={r.id} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.clientName||"?")[0]}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-gray-800 text-sm">{r.clientName||"Unknown"}</p><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{r.jobType||"—"}</span>{r.serviceCategory?.length>0&&<><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{r.serviceCategory.join(", ")}</span></>}</div>
                <p className="text-xs text-gray-400 mt-0.5">{fmtD(r.arrivalDate)}{r.arrivalTime?` ${r.arrivalTime}`:""} · {r.supervisorName}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {r.cleanlinessRating>0&&<span className="text-xs font-medium text-gray-600">Cleanliness: <span style={{color:"#f59e0b"}}>{"★".repeat(r.cleanlinessRating)}</span><span className="text-gray-300">{"★".repeat(5-r.cleanlinessRating)}</span></span>}
                  {r.adherenceRating>0&&<span className="text-xs font-medium text-gray-600">Adherence: <span style={{color:"#f59e0b"}}>{"★".repeat(r.adherenceRating)}</span><span className="text-gray-300">{"★".repeat(5-r.adherenceRating)}</span></span>}
                  {photos.length>0&&<span className="text-xs font-medium text-blue-600">📷 {photos.length} photo{photos.length!==1?"s":""}</span>}
                  {r.gpsLat&&<span className="text-xs font-medium text-green-600">📍 GPS</span>}
                  {r.satisfactionLevel&&<span className="text-xs font-medium" style={{color:r.satisfactionLevel==="Very Satisfied"?G:r.satisfactionLevel==="Unsatisfied"?RED:AMBER}}>😊 {r.satisfactionLevel}</span>}
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
    {showForm&&<SiteReportModal onSave={data=>{setReports(rs=>[data,...rs]);setShowForm(false);}} onClose={()=>setShowForm(false)} user={user} clients={clients}/>}
    {view&&<SiteReportViewer report={view} onClose={()=>setView(null)}/>}
  </div>);}

function SiteReportModal({onSave,onClose,user,clients}){
  const[sec,setSec]=useState(0);
  const[gpsLoading,setGpsLoading]=useState(false);
  const[f,setF]=useState({
    supervisorName:user.name, supervisorEmail:user.email||"",
    clientName:"",address:"",
    arrivalDate:TODAY.toISOString().split("T")[0],arrivalTime:"",
    departureDate:TODAY.toISOString().split("T")[0],departureTime:"",
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
  });
  const u=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const tog=k=>v=>setF(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const selClient=n=>{const c=clients.find(c=>c.name===n);setF(p=>({...p,clientName:n,address:c?c.addr:""}));};

  const acquireGPS=()=>{
    setGpsLoading(true);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos=>{setF(p=>({...p,gpsLat:pos.coords.latitude.toFixed(6),gpsLng:pos.coords.longitude.toFixed(6),gpsAcquired:true}));setGpsLoading(false);},
        ()=>{setF(p=>({...p,gpsLat:"9.076500",gpsLng:"7.398760",gpsAcquired:true}));setGpsLoading(false);}
      );
    } else {setF(p=>({...p,gpsLat:"9.076500",gpsLng:"7.398760",gpsAcquired:true}));setGpsLoading(false);}
  };

  const addPhotos=e=>{
    Array.from(e.target.files||[]).forEach(file=>{
      if(f.photos.length>=10)return;
      const reader=new FileReader();
      reader.onload=ev=>setF(p=>({...p,photos:[...p.photos,{data:ev.target.result,name:file.name}]}));
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };
  const removePhoto=i=>setF(p=>({...p,photos:p.photos.filter((_,idx)=>idx!==i)}));

  const hasCleaning=f.serviceCategory.includes("Cleaning");
  const hasPest=f.serviceCategory.includes("Pest Control");
  const hasOther=f.serviceCategory.includes("Other");
  const isOneTime=f.jobType==="One-Time Job";

  const canNext=[
    f.clientName&&f.arrivalDate&&f.arrivalTime&&f.jobType&&f.serviceCategory.length>0,
    (hasCleaning?f.cleaningTasks.length>0:true)&&(hasPest?f.pestTasks.length>0:true)&&f.crewMembers.trim().length>0,
    f.cleanlinessRating>0&&f.adherenceRating>0,
    f.ppeWorn&&f.safeHandling,
    f.clientPresent&&(f.clientPresent==="Yes"?f.satisfactionLevel:true),
    true,
    f.overallAssessment&&f.signatureName,
  ];

  const submit=()=>{
    onSave({...f,id:Date.now(),submittedAt:new Date().toISOString(),
      signatureTimestamp:new Date().toLocaleString("en-GB")});
  };

  const SECT_ICONS=["📋","🧹","⭐","🦺","🤝","📷","✅"];

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
          {SR_SECTIONS.map((s,i)=><div key={i} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i<sec?"text-white":i===sec?"text-white border-2":"bg-gray-100 text-gray-400"}`}
                style={i<sec?{background:G}:i===sec?{background:O,borderColor:O}:{}}>
                {i<sec?"✓":SECT_ICONS[i]}
              </div>
              <span className={`text-xs mt-0.5 font-medium hidden sm:block ${i===sec?"text-orange-600":"text-gray-400"}`} style={{fontSize:"9px"}}>{s}</span>
            </div>
            {i<SR_SECTIONS.length-1&&<div className={`h-0.5 flex-1 mb-3 rounded ${i<sec?"bg-green-400":"bg-gray-200"}`}/>}
          </div>)}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* SECTION 0 — General Info */}
        {sec===0&&<div className="space-y-4">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>📋 Section 1 of 7 — General Information</div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Supervisor Name"><input className={inp} value={f.supervisorName} onChange={u("supervisorName")}/></Fld>
            <Fld label="Supervisor Email"><input className={inp} type="email" value={f.supervisorEmail} onChange={u("supervisorEmail")}/></Fld>
            <Fld label="Client / Site" col required><select className={inp} value={f.clientName} onChange={e=>selClient(e.target.value)}><option value="">— Select client —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld>
            <Fld label="Site Address" col><input className={inp} value={f.address} onChange={u("address")} placeholder="Auto-filled from client · edit if different"/></Fld>
            {/* GPS */}
            <Fld label="GPS Location" col>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={acquireGPS} disabled={gpsLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold flex-shrink-0 disabled:opacity-50" style={{background:f.gpsAcquired?G:BLUE}}>
                  {gpsLoading?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<span>📍</span>}
                  {gpsLoading?"Locating…":f.gpsAcquired?"Re-capture":"Capture GPS"}
                </button>
                {f.gpsAcquired&&<div className="text-xs font-mono p-2 rounded-lg flex-1" style={{background:"#f0f9ff",color:"#0369a1"}}>Lat: {f.gpsLat} · Lng: {f.gpsLng}</div>}
              </div>
            </Fld>
            <Fld label="Date of Arrival" required><input className={inp} type="date" value={f.arrivalDate} onChange={u("arrivalDate")}/></Fld>
            <Fld label="Time of Arrival" required><input className={inp} type="time" value={f.arrivalTime} onChange={u("arrivalTime")}/></Fld>
            <Fld label="Date of Departure"><input className={inp} type="date" value={f.departureDate} onChange={u("departureDate")}/></Fld>
            <Fld label="Time of Departure"><input className={inp} type="time" value={f.departureTime} onChange={u("departureTime")}/></Fld>
          </div>
          <Fld label="Job Type" required>
            <RadioG value={f.jobType} onChange={v=>setF(p=>({...p,jobType:v,contractType:""}))} options={["Recurring Contract Inspection","One-Time Job"]}/>
          </Fld>
          {isOneTime&&<Fld label="Contract Type"><RadioG value={f.contractType} onChange={v=>setF(p=>({...p,contractType:v}))} options={["One-Time","Monthly","Quarterly","Annual"]}/></Fld>}
          <Fld label="Service Category (select all that apply)" required>
            <div className="flex flex-wrap gap-2 mt-1">{["Cleaning","Pest Control","Other"].map(o=><label key={o} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm transition-all ${f.serviceCategory.includes(o)?"border-green-500 bg-green-50 font-semibold text-green-800":"border-gray-200 text-gray-600"}`}><input type="checkbox" checked={f.serviceCategory.includes(o)} onChange={()=>tog("serviceCategory")(o)} className="accent-green-600"/>{o}</label>)}</div>
          </Fld>
        </div>}

        {/* SECTION 1 — Job Details */}
        {sec===1&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>🧹 Section 2 of 7 — Job Details</div>
          {hasCleaning&&<Fld label="Cleaning Tasks Performed (select all)" col><CheckGroup options={CLEANING_TASK_OPTS} value={f.cleaningTasks} onChange={v=>setF(p=>({...p,cleaningTasks:v}))}/></Fld>}
          {hasPest&&<><Fld label="Pest Control Tasks Performed" col><CheckGroup options={PEST_TASK_OPTS} value={f.pestTasks} onChange={v=>setF(p=>({...p,pestTasks:v}))}/></Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Pesticides / Chemicals Used"><textarea className={inp} rows={2} value={f.pesticidesUsed} onChange={u("pesticidesUsed")} placeholder="e.g. Cypermethrin, Deltamethrin…"/></Fld>
              <Fld label="Active Ingredients"><textarea className={inp} rows={2} value={f.activeIngredients} onChange={u("activeIngredients")} placeholder="e.g. Cypermethrin 10% w/v…"/></Fld>
            </div>
          </>}
          {hasOther&&<Fld label="Other Tasks Performed" col><textarea className={inp} rows={2} value={f.otherTasks} onChange={u("otherTasks")}/></Fld>}
          <Fld label="Crew Members Present (one per line)" col required>
            <textarea className={inp} rows={4} value={f.crewMembers} onChange={u("crewMembers")} placeholder={"James Akpa\nGarba Musa\n…"}/>
          </Fld>
          <Fld label="Equipment Used" col><CheckGroup options={EQUIPMENT_OPTS} value={f.equipment} onChange={v=>setF(p=>({...p,equipment:v}))}/></Fld>
          <Fld label="Supplies / Consumables Used" col><CheckGroup options={SUPPLY_OPTS} value={f.supplies} onChange={v=>setF(p=>({...p,supplies:v}))}/></Fld>
        </div>}

        {/* SECTION 2 — Quality Control */}
        {sec===2&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>⭐ Section 3 of 7 — Quality Control (Rate 1 = Poor, 5 = Excellent)</div>
          <StarRating value={f.cleanlinessRating} onChange={v=>setF(p=>({...p,cleanlinessRating:v}))} label="Cleanliness Achieved *"/>
          <StarRating value={f.adherenceRating} onChange={v=>setF(p=>({...p,adherenceRating:v}))} label="Adherence to Client's Requests *"/>
          {(f.cleanlinessRating>0&&f.adherenceRating>0)&&<div className="p-4 rounded-xl" style={{background:"#f0fdf4",border:"1px solid #bbf7d0"}}><p className="text-xs font-bold text-green-600 mb-1">QUALITY SCORE</p><p className="text-3xl font-black" style={{color:G}}>{((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}<span className="text-sm font-medium text-gray-400"> / 5.0</span></p></div>}
          <Fld label="Notes on Quality Issues" col><textarea className={inp} rows={3} value={f.qualityNotes} onChange={u("qualityNotes")} placeholder="e.g. Missed spots, incomplete areas, follow-up needed… (write 'None' if no issues)"/></Fld>
        </div>}

        {/* SECTION 3 — Safety */}
        {sec===3&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>🦺 Section 4 of 7 — Safety Compliance</div>
          <Fld label="PPE Worn by All Crew Members *">
            <RadioG value={f.ppeWorn} onChange={v=>setF(p=>({...p,ppeWorn:v}))} options={["Yes","No","Partial"]} danger={["No","Partial"]}/>
          </Fld>
          {f.ppeWorn==="No"&&<div className="p-3 rounded-xl text-sm text-red-700 font-medium" style={{background:"#fee2e2",border:"1px solid #fca5a5"}}>⚠️ PPE non-compliance logged. This will be flagged in the report.</div>}
          <Fld label="Safe Handling of Chemicals / Equipment *">
            <RadioG value={f.safeHandling} onChange={v=>setF(p=>({...p,safeHandling:v}))} options={["Yes","No","N/A — No Chemicals Used"]} danger={["No"]}/>
          </Fld>
          <Fld label="Incidents or Near-Misses">
            <RadioG value={f.incidents} onChange={v=>setF(p=>({...p,incidents:v,incidentDetails:""}))} options={["None","Yes — Incident Occurred"]} danger={["Yes — Incident Occurred"]}/>
          </Fld>
          {f.incidents.startsWith("Yes")&&<Fld label="Describe Incident / Near-Miss" col><textarea className={inp} rows={3} value={f.incidentDetails} onChange={u("incidentDetails")} placeholder="Describe what happened, who was involved, and any action taken…"/></Fld>}
        </div>}

        {/* SECTION 4 — Client Interaction */}
        {sec===4&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>🤝 Section 5 of 7 — Client Interaction</div>
          <Fld label="Client / Contact Person Present During Visit *">
            <RadioG value={f.clientPresent} onChange={v=>setF(p=>({...p,clientPresent:v,clientContactName:"",clientFeedback:"",satisfactionLevel:""}))} options={["Yes","No"]}/>
          </Fld>
          {f.clientPresent==="Yes"&&<>
            <Fld label="Client Contact Name"><input className={inp} value={f.clientContactName} onChange={u("clientContactName")} placeholder="Name of person present"/></Fld>
            <Fld label="Client Feedback / Comments" col><textarea className={inp} rows={3} value={f.clientFeedback} onChange={u("clientFeedback")} placeholder="Record what the client said about the job…"/></Fld>
            <Fld label="Satisfaction Level (Observed) *">
              <RadioG value={f.satisfactionLevel} onChange={v=>setF(p=>({...p,satisfactionLevel:v}))}
                options={["Very Satisfied","Satisfied","Neutral","Unsatisfied"]}
                danger={["Unsatisfied"]}/>
            </Fld>
          </>}
          {f.clientPresent==="No"&&<div className="p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>ℹ️ Satisfaction level will be marked as N/A since client was not present.</div>}
          <Fld label="Additional Requirements from Client">
            <RadioG value={f.additionalRequirements} onChange={v=>setF(p=>({...p,additionalRequirements:v,additionalReqDetails:""}))} options={["None","Yes — Requirements Noted"]}/>
          </Fld>
          {f.additionalRequirements.startsWith("Yes")&&<Fld label="Describe Requirements" col><textarea className={inp} rows={2} value={f.additionalReqDetails} onChange={u("additionalReqDetails")}/></Fld>}
        </div>}

        {/* SECTION 5 — Photos & Notes */}
        {sec===5&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>📷 Section 6 of 7 — Photos &amp; Operational Notes</div>
          <Fld label="Site Photos (up to 10 — use camera or file picker)" col>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-green-400" style={{borderColor:G,color:G}}>
                  📷 Take Photo
                  <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="hidden"/>
                </label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm font-semibold transition-all hover:border-blue-400" style={{borderColor:BLUE,color:BLUE}}>
                  🖼️ Choose from Gallery
                  <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden"/>
                </label>
              </div>
              {f.photos.length>0&&<div className="grid grid-cols-3 gap-2">{f.photos.map((p,i)=><div key={i} className="relative group">
                <img src={p.data} alt={p.name} className="w-full h-24 object-cover rounded-xl"/>
                <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.name}</p>
              </div>)}</div>}
              {f.photos.length===0&&<p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">No photos added yet — photos help document the job quality and site condition</p>}
              <p className="text-xs text-gray-400">{f.photos.length}/10 photos added</p>
            </div>
          </Fld>
          <Fld label="Operational Notes / Observations" col>
            <textarea className={inp} rows={4} value={f.operationalNotes} onChange={u("operationalNotes")} placeholder="Any other observations about the site, access issues, recurring problems, maintenance items to flag for the client…"/>
          </Fld>
        </div>}

        {/* SECTION 6 — Supervisor Confirmation */}
        {sec===6&&<div className="space-y-5">
          <div className="p-3 rounded-xl text-xs font-semibold text-green-700" style={{background:GL}}>✅ Section 7 of 7 — Supervisor Confirmation</div>
          {/* Summary */}
          <div className="p-4 rounded-2xl space-y-2 text-sm" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Report Summary</p>
            {[
              ["Client",f.clientName],
              ["Job Type",f.jobType+(f.contractType?` · ${f.contractType}`:"")],
              ["Service",f.serviceCategory.join(", ")],
              ["Arrival",`${fmtD(f.arrivalDate)} ${f.arrivalTime}`],
              ["Departure",`${fmtD(f.departureDate)} ${f.departureTime}`],
              ["GPS",f.gpsAcquired?`${f.gpsLat}°N, ${f.gpsLng}°E`:"Not captured"],
              ["Crew",f.crewMembers.split("\n").filter(Boolean).join(", ")],
              ["Quality Score",f.cleanlinessRating>0?`${((f.cleanlinessRating+f.adherenceRating)/2).toFixed(1)}/5.0`:"Not rated"],
              ["Client Satisfaction",f.satisfactionLevel||"N/A"],
              ["Photos",`${f.photos.length} attached`],
            ].map(([l,v])=>v&&<div key={l} className="flex gap-2"><span className="text-xs font-bold text-gray-400 w-32 flex-shrink-0">{l}</span><span className="text-xs text-gray-700">{v}</span></div>)}
          </div>
          <Fld label="Overall Assessment *">
            <RadioG value={f.overallAssessment} onChange={v=>setF(p=>({...p,overallAssessment:v}))}
              options={["Job Completed Successfully","Issues Observed — Follow-up Required"]}
              danger={["Issues Observed — Follow-up Required"]}/>
          </Fld>
          <Fld label="Supervisor Digital Signature (type full name) *">
            <input className={inp} value={f.signatureName} onChange={e=>setF(p=>({...p,signatureName:e.target.value,signatureTimestamp:new Date().toLocaleString("en-GB")}))} placeholder={f.supervisorName}/>
            {f.signatureName&&<p className="text-xs text-gray-400 mt-1">Signed: {f.signatureTimestamp}</p>}
          </Fld>
          <div className="p-3 rounded-xl text-xs text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>📧 This report will be emailed to supervisors and admin once Supabase backend is connected.</div>
        </div>}

      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 bg-gray-50/50">
        <button onClick={sec===0?onClose:()=>setSec(s=>s-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
          {sec===0?"Cancel":"← Back"}
        </button>
        <span className="text-xs text-gray-400 font-medium">Step {sec+1} of 7</span>
        {sec<6
          ?<button onClick={()=>setSec(s=>s+1)} disabled={!canNext[sec]} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2" style={{background:G}}>Next →</button>
          :<button onClick={submit} disabled={!canNext[6]} className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2" style={{background:O}}>Submit Report ✓</button>
        }
      </div>
    </div>
  </div>);}

function SiteReportViewer({report:r,onClose}){
  const[photoIdx,setPhotoIdx]=useState(null);
  const photos=r.photos||[];
  const score=r.cleanlinessRating&&r.adherenceRating?((r.cleanlinessRating+r.adherenceRating)/2).toFixed(1):null;
  const sectionBlock=(title,children)=><div className="mb-5"><h3 className="text-xs font-black uppercase tracking-widest mb-3 pb-2 border-b" style={{color:G}}>{title}</h3>{children}</div>;
  const row=(l,v)=>v?<div key={l} className="flex gap-3 mb-2"><span className="text-xs font-bold text-gray-400 w-40 flex-shrink-0 pt-0.5">{l}</span><span className="text-sm text-gray-700">{v}</span></div>:null;
  return(<ModalWrap title={`Report — ${r.clientName||"Unknown"}`} onClose={onClose} xl>
    <div className="text-sm">
      {sectionBlock("Section 1 — General Information",<>
        {row("Supervisor",r.supervisorName)}
        {row("Client / Site",r.clientName)}
        {row("Address",r.address)}
        {row("GPS",r.gpsAcquired?`${r.gpsLat}°N, ${r.gpsLng}°E`:"Not captured")}
        {row("Arrival",`${fmtD(r.arrivalDate)} ${r.arrivalTime||""}`)}
        {row("Departure",`${fmtD(r.departureDate)} ${r.departureTime||""}`)}
        {row("Job Type",r.jobType+(r.contractType?` · ${r.contractType}`:""))}
        {row("Service Category",r.serviceCategory?.join(", "))}
      </>)}
      {sectionBlock("Section 2 — Job Details",<>
        {r.cleaningTasks?.length>0&&row("Cleaning Tasks",r.cleaningTasks.join(", "))}
        {r.pestTasks?.length>0&&row("Pest Tasks",r.pestTasks.join(", "))}
        {r.pesticidesUsed&&row("Pesticides Used",r.pesticidesUsed)}
        {r.activeIngredients&&row("Active Ingredients",r.activeIngredients)}
        {r.otherTasks&&row("Other Tasks",r.otherTasks)}
        {row("Crew Members",r.crewMembers?.split("\n").filter(Boolean).join(", "))}
        {r.equipment?.length>0&&row("Equipment",r.equipment.join(", "))}
        {r.supplies?.length>0&&row("Supplies",r.supplies.join(", "))}
      </>)}
      {sectionBlock("Section 3 — Quality Control",<>
        <div className="flex gap-6 mb-3">
          <div className="p-3 rounded-xl text-center" style={{background:GL}}><p className="text-xs font-bold text-gray-500">Cleanliness</p><p className="text-2xl font-black" style={{color:G}}>{r.cleanlinessRating||"—"}</p><p style={{color:"#f59e0b"}}>{"★".repeat(r.cleanlinessRating||0)}</p></div>
          <div className="p-3 rounded-xl text-center" style={{background:GL}}><p className="text-xs font-bold text-gray-500">Adherence</p><p className="text-2xl font-black" style={{color:G}}>{r.adherenceRating||"—"}</p><p style={{color:"#f59e0b"}}>{"★".repeat(r.adherenceRating||0)}</p></div>
          {score&&<div className="p-3 rounded-xl text-center" style={{background:"#f0fdf4",border:`1px solid #bbf7d0`}}><p className="text-xs font-bold text-gray-500">Quality Score</p><p className="text-2xl font-black" style={{color:G}}>{score}</p><p className="text-xs text-gray-400">out of 5.0</p></div>}
        </div>
        {row("Quality Issues",r.qualityNotes||"None")}
      </>)}
      {sectionBlock("Section 4 — Safety",<>
        {row("PPE Worn",r.ppeWorn)}
        {row("Safe Handling",r.safeHandling)}
        {row("Incidents",r.incidents)}
        {r.incidentDetails&&row("Incident Details",r.incidentDetails)}
      </>)}
      {sectionBlock("Section 5 — Client Interaction",<>
        {row("Client Present",r.clientPresent)}
        {r.clientContactName&&row("Contact Name",r.clientContactName)}
        {r.clientFeedback&&row("Client Feedback",`"${r.clientFeedback}"`)}
        {row("Satisfaction",r.satisfactionLevel||"N/A")}
        {row("Additional Requirements",r.additionalRequirements)}
        {r.additionalReqDetails&&row("Requirements Detail",r.additionalReqDetails)}
      </>)}
      {photos.length>0&&sectionBlock(`Section 6 — Photos (${photos.length})`,<div className="grid grid-cols-3 gap-2">{photos.map((p,i)=><div key={i} className="cursor-pointer" onClick={()=>setPhotoIdx(i)}><img src={p.data} alt={p.name} className="w-full h-24 object-cover rounded-xl hover:opacity-90 transition-opacity"/></div>)}</div>)}
      {r.operationalNotes&&sectionBlock("Operational Notes",<p className="text-sm text-gray-700 whitespace-pre-wrap">{r.operationalNotes}</p>)}
      {sectionBlock("Section 7 — Supervisor Confirmation",<>
        {row("Overall Assessment",r.overallAssessment)}
        {row("Signed by",`${r.signatureName} · ${r.signatureTimestamp}`)}
      </>)}
    </div>
    {/* Lightbox */}
    {photoIdx!==null&&<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]" onClick={()=>setPhotoIdx(null)}>
      <img src={photos[photoIdx].data} alt="" className="max-w-full max-h-full rounded-xl" onClick={e=>e.stopPropagation()}/>
      <button onClick={()=>setPhotoIdx(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-lg">×</button>
      {photoIdx>0&&<button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i-1);}} className="absolute left-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl">‹</button>}
      {photoIdx<photos.length-1&&<button onClick={e=>{e.stopPropagation();setPhotoIdx(i=>i+1);}} className="absolute right-16 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl">›</button>}
    </div>}
  </ModalWrap>);}



// ── INVENTORY ─────────────────────────────────────────────────────────────────
function InventoryPage({inventory,setInventory,userRole}){
  const[modal,setModal]=useState(null);const[filter,setFilter]=useState("All");const[search,setSearch]=useState("");
  const[confirm,confirmEl]=useConfirm();
  const cats=["All",...new Set(inventory.map(i=>i.cat))];
  const filtered=inventory.filter(i=>(filter==="All"||i.cat===filter)&&i.item.toLowerCase().includes(search.toLowerCase()));
  const save=data=>{if(data.id)setInventory(inv=>inv.map(i=>i.id===data.id?data:i));else setInventory(inv=>[...inv,{...data,id:"i"+Date.now()}]);setModal(null);};
  const del=id=>confirm("Remove this item?",()=>setInventory(inv=>inv.filter(i=>i.id!==id)));
  const canEdit=userRole!=="Technician";
  return(<div className="space-y-5">{confirmEl}
    <div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-48"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input className={inp+" pl-9"} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="flex flex-wrap gap-2">{cats.map(c=><button key={c} onClick={()=>setFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${filter===c?"text-white border-transparent":"bg-white text-gray-500 border-gray-200"}`} style={filter===c?{background:G}:{}}>{c}</button>)}</div>{canEdit&&<button onClick={()=>setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Item</button>}</div>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Item","Category","In Stock","Reorder","Unit Cost","Value","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{filtered.map(i=>{const low=i.qty<=i.reorder;return(<tr key={i.id} className={`hover:bg-gray-50/70 ${low?"bg-red-50/30":""}`}><td className="px-4 py-3 font-medium text-gray-800">{i.item}</td><td className="px-4 py-3 text-xs text-gray-500">{i.cat}</td><td className="px-4 py-3 font-black text-lg" style={{color:low?RED:G}}>{i.qty}</td><td className="px-4 py-3 text-xs text-gray-400">{i.reorder}</td><td className="px-4 py-3 text-xs text-gray-500">{fmt(i.cost)}</td><td className="px-4 py-3 font-semibold text-gray-700">{fmt(i.qty*i.cost)}</td><td className="px-4 py-3"><SBadge s={low?"Low Stock":"OK"} custom={low?{bg:"#fee2e2",color:RED,border:"#fca5a5"}:{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}}/></td><td className="px-4 py-3">{canEdit&&<div className="flex gap-1"><button onClick={()=>setModal(i)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(i.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div>}</td></tr>);})}</tbody></table></div></Card>
    {modal!==null&&<ModalWrap title={modal.id?"Edit Item":"Add Item"} onClose={()=>setModal(null)}><div className="space-y-4">{[["Item Name","item","text"],["Category","cat","text"],["Qty","qty","number"],["Reorder Level","reorder","number"],["Unit Cost (₦)","cost","number"]].map(([l,k,t])=><Fld key={k} label={l}><input className={inp} type={t} value={modal[k]||""} onChange={e=>setModal(p=>({...p,[k]:t==="number"?Number(e.target.value):e.target.value}))}/></Fld>)}</div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{modal.id?"Save":"Add"}</button></div></ModalWrap>}
  </div>);}

// ── REQUISITIONS ──────────────────────────────────────────────────────────────
function RequisitionsPage({requisitions,setRequisitions,supplyItems,setSupplyItems,clients,users,user}){
  const[tab,setTab]=useState("reqs");const[modal,setModal]=useState(null);const[view,setView]=useState(null);const[itemModal,setItemModal]=useState(null);
  const[confirm,confirmEl]=useConfirm();
  const canManage=user.role==="Admin"||user.role==="Supervisor";
  const statusColors={Pending:{bg:"#fffbeb",color:AMBER,border:"#fde68a"},Approved:{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},Rejected:{bg:"#fee2e2",color:RED,border:"#fca5a5"},Forwarded:{bg:"#eff6ff",color:BLUE,border:"#bfdbfe"}};
  const approve=(id,status)=>setRequisitions(rs=>rs.map(r=>r.id===id?{...r,status,reviewedBy:user.name,reviewedAt:new Date().toLocaleString("en-GB")}:r));
  const del=id=>confirm("Delete this requisition?",()=>setRequisitions(rs=>rs.filter(r=>r.id!==id)));
  const saveItem=data=>{if(data.id)setSupplyItems(si=>si.map(i=>i.id===data.id?data:i));else setSupplyItems(si=>[...si,{...data,id:"s"+Date.now(),active:true}]);setItemModal(null);};
  const delItem=id=>confirm("Remove item from catalogue?",()=>setSupplyItems(si=>si.filter(i=>i.id!==id)));
  const cats=["All",...new Set(supplyItems.map(i=>i.cat))];
  const[catFilter,setCatFilter]=useState("All");
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center gap-4 border-b border-gray-200">
      {[{id:"reqs",label:"Requisitions",n:requisitions.filter(r=>r.status==="Pending").length},{id:"catalogue",label:"Item Catalogue",hide:!canManage,n:supplyItems.length}].filter(t=>!t.hide).map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${tab===t.id?"border-b-2":"text-gray-400 hover:text-gray-600"}`} style={tab===t.id?{borderColor:G,color:G}:{}}>{t.label}{t.n>0&&<span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white" style={{background:t.id==="reqs"?AMBER:G}}>{t.n}</span>}</button>)}
    </div>
    {tab==="reqs"&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 flex-wrap"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fffbeb",color:AMBER}}>{requisitions.filter(r=>r.status==="Pending").length} Pending</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#dcfce7",color:G}}>{requisitions.filter(r=>r.status==="Approved").length} Approved</div></div><button onClick={()=>setModal({type:"new"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Requisition</button></div>
      {canManage&&<div className="flex items-center gap-2 p-3 rounded-xl text-xs text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><Info size={13}/>Submitted requisitions trigger email notifications to all Supervisors. (Requires Supabase backend.)</div>}
      <Card><div className="divide-y divide-gray-50">{requisitions.length===0&&<div className="text-center py-12 text-gray-400"><ClipboardCheck size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">No requisitions yet</p></div>}{requisitions.map(r=>{const total=r.items?.reduce((s,i)=>s+(i.qty*(i.approvedRate||i.rate||0)),0)||0;const budget=r.budgetCap||0;const pct=budget>0?total/budget:0;return(<div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.site||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{r.site} — {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-500">By: {r.submittedBy} · {r.items?.length||0} items</p>{canManage&&budget>0&&<span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{background:pct>1?"#fee2e2":pct>0.85?"#fffbeb":"#dcfce7"}}><span className={pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%)</span></span>}{r.reviewedBy&&<p className="text-xs text-gray-400 mt-0.5">Reviewed: {r.reviewedBy}</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={r.status} custom={statusColors[r.status]}/><button onClick={()=>setView(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Eye size={13}/></button>{canManage&&r.status==="Pending"&&<><button onClick={()=>approve(r.id,"Approved")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:G}}>Approve</button><button onClick={()=>approve(r.id,"Rejected")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:RED}}>Reject</button></>}{canManage&&r.status==="Approved"&&<button onClick={()=>approve(r.id,"Forwarded")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white" style={{background:BLUE}}>Forward</button>}<button onClick={()=>del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>);})}</div></Card>
    </>}
    {tab==="catalogue"&&canManage&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${catFilter===c?"text-white border-transparent":"bg-white text-gray-500 border-gray-200"}`} style={catFilter===c?{background:G}:{}}>{c}</button>)}</div><button onClick={()=>setItemModal({cat:"Cleaning",unit:"bottle",active:true})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Item</button></div>
      <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-amber-700" style={{background:"#fffbeb",border:"1px solid #fde68a"}}><AlertTriangle size={13}/>Master price list — costs visible to <strong>Admin &amp; Supervisor only</strong>. Technicians see items without prices.</div>
      <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Item Name","Category","Unit","Unit Cost (₦)","Status",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{supplyItems.filter(i=>catFilter==="All"||i.cat===catFilter).map(i=><tr key={i.id} className={`hover:bg-gray-50/70 ${!i.active?"opacity-50":""}`}><td className="px-4 py-3 font-medium text-gray-800">{i.name}</td><td className="px-4 py-3 text-xs text-gray-500">{i.cat}</td><td className="px-4 py-3 text-xs text-gray-500">{i.unit}</td><td className="px-4 py-3 font-bold text-gray-700">{fmt(i.cost)}</td><td className="px-4 py-3"><SBadge s={i.active?"Active":"Inactive"} custom={i.active?{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"}:{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"}}/></td><td className="px-4 py-3"><div className="flex gap-1"><button onClick={()=>setItemModal(i)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>delItem(i.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></td></tr>)}</tbody></table></div></Card>
    </>}
    {modal?.type==="new"&&<ReqFormModal supplyItems={supplyItems} clients={clients} user={user} canSeeCosts={canManage} onSave={data=>{setRequisitions(rs=>[data,...rs]);setModal(null);}} onClose={()=>setModal(null)}/>}
    {view&&<ReqViewer req={view} canSeeCosts={canManage} onClose={()=>setView(null)}/>}
    {itemModal&&<ModalWrap title={itemModal.id?"Edit Item":"Add to Catalogue"} onClose={()=>setItemModal(null)}><div className="space-y-4"><Fld label="Item Name"><input className={inp} value={itemModal.name||""} onChange={e=>setItemModal(p=>({...p,name:e.target.value}))}/></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Category"><select className={inp} value={itemModal.cat||"Cleaning"} onChange={e=>setItemModal(p=>({...p,cat:e.target.value}))}>{["Cleaning","Air Care","Consumables","Hygiene","PPE","Equipment","Pest Control"].map(c=><option key={c}>{c}</option>)}</select></Fld><Fld label="Unit"><select className={inp} value={itemModal.unit||"bottle"} onChange={e=>setItemModal(p=>({...p,unit:e.target.value}))}>{["bottle","can","pack","bag","box","tin","piece","roll","sachet","litre","kg"].map(u=><option key={u}>{u}</option>)}</select></Fld><Fld label="Unit Cost (₦)"><input className={inp} type="number" min="0" value={itemModal.cost||""} onChange={e=>setItemModal(p=>({...p,cost:Number(e.target.value)}))}/></Fld><Fld label="Status"><select className={inp} value={itemModal.active?"Active":"Inactive"} onChange={e=>setItemModal(p=>({...p,active:e.target.value==="Active"}))}><option>Active</option><option>Inactive</option></select></Fld></div></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setItemModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>saveItem(itemModal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{itemModal.id?"Save Changes":"Add Item"}</button></div></ModalWrap>}
  </div>);}

function ReqFormModal({supplyItems,clients,user,canSeeCosts,onSave,onClose}){
  const[submitted,setSubmitted]=useState(false);
  const activeItems=supplyItems.filter(i=>i.active);
  const[f,setF]=useState({site:"",month:TODAY.getMonth(),year:TODAY.getFullYear(),budgetCap:0,items:activeItems.map(i=>({id:i.id,name:i.name,unit:i.unit,cat:i.cat,cost:i.cost,qty:0,notes:""})),submittedBy:user.name,status:"Pending"});
  const updItem=(idx,k,v)=>setF(p=>({...p,items:p.items.map((it,i)=>i===idx?{...it,[k]:v}:it)}));
  const activeRequested=f.items.filter(i=>i.qty>0);
  const total=activeRequested.reduce((s,i)=>s+i.qty*(i.cost||0),0);
  const budget=f.budgetCap||0,pct=budget>0?total/budget:0;
  if(submitted)return(<ModalWrap title="Requisition Submitted" onClose={onClose}><div className="text-center py-8"><div className="text-5xl mb-4">✅</div><h3 className="font-bold text-gray-800 text-lg mb-2">Submitted Successfully!</h3><p className="text-sm text-gray-500 mb-4">Requisition for <strong>{f.site}</strong> — {MONTHS[f.month]} {f.year}</p><div className="p-3 rounded-xl text-sm text-blue-700 font-medium" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>📧 Supervisors notified by email.</div><button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Done</button></div></ModalWrap>);
  const cats=[...new Set(activeItems.map(i=>i.cat))];
  return(<ModalWrap title="New Monthly Requisition" onClose={onClose} xl>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4"><Fld label="Site / Client"><select className={inp} value={f.site} onChange={e=>setF(p=>({...p,site:e.target.value}))}><option value="">— Select —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><Fld label="Month"><select className={inp} value={f.month} onChange={e=>setF(p=>({...p,month:Number(e.target.value)}))}>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></Fld><Fld label="Year"><input className={inp} type="number" value={f.year} onChange={e=>setF(p=>({...p,year:Number(e.target.value)}))}/></Fld></div>
      {canSeeCosts&&<Fld label="Monthly Budget Cap (₦)"><input className={inp} type="number" value={f.budgetCap} onChange={e=>setF(p=>({...p,budgetCap:Number(e.target.value)}))}/></Fld>}
      <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items — enter qty needed (0 = skip)</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {cats.map(cat=>{const catItems=f.items.filter(i=>i.cat===cat);return(<div key={cat}><div className="px-4 py-2 text-xs font-black uppercase tracking-wider sticky top-0" style={{background:"#f9fafb",color:G,borderBottom:"1px solid #f3f4f6"}}>{cat}</div><table className="w-full text-sm"><tbody className="divide-y divide-gray-50">{catItems.map(it=>{const idx=f.items.indexOf(it);return(<tr key={it.id} className={it.qty>0?"bg-green-50/40":""}><td className="px-4 py-2.5 font-medium text-gray-800">{it.name}</td><td className="px-4 py-2.5 text-xs text-gray-400">{it.unit}</td>{canSeeCosts&&<td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(it.cost)}/unit</td>}<td className="px-4 py-2.5"><input type="number" min="0" value={it.qty} onChange={e=>updItem(idx,"qty",Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500"/></td>{canSeeCosts&&<td className="px-4 py-2.5">{it.qty>0&&<span className="text-xs font-semibold text-green-700">{fmt(it.qty*it.cost)}</span>}</td>}<td className="px-3 py-2.5"><input value={it.notes} onChange={e=>updItem(idx,"notes",e.target.value)} className="w-28 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Notes…"/></td></tr>);})}</tbody></table></div>);})}
        </div>
      </div>
      {activeRequested.length>0&&<div className="flex items-center justify-between p-3 rounded-xl" style={{background:GL}}><span className="text-xs font-semibold text-green-700">{activeRequested.length} item(s) requested</span>{canSeeCosts&&budget>0&&<span className={`text-xs font-bold ${pct>1?"text-red-700":pct>0.85?"text-amber-700":"text-green-700"}`}>{fmt(total)} / {fmt(budget)} ({(pct*100).toFixed(0)}%) {pct>1?"🔴 Over":pct>0.85?"🟡 Near":"🟢 OK"}</span>}</div>}
      <Fld label="Submitted By"><input className={inp} value={f.submittedBy} onChange={e=>setF(p=>({...p,submittedBy:e.target.value}))}/></Fld>
    </div>
    <div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{const data={...f,id:"req"+Date.now(),items:activeRequested.map(i=>({...i,rate:i.cost,approvedRate:0}))};onSave(data);setSubmitted(true);}} disabled={!f.site||activeRequested.length===0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Submit Requisition</button></div>
  </ModalWrap>);}

function ReqViewer({req:r,canSeeCosts,onClose}){
  const[rates,setRates]=useState(Object.fromEntries((r.items||[]).map(i=>[i.id||i.name,i.approvedRate||i.rate||i.cost||0])));
  const total=r.items?.reduce((s,i)=>s+(i.qty*(rates[i.id||i.name]||0)),0)||0;
  const budget=r.budgetCap||0,pct=budget>0?(total/budget*100).toFixed(1):null;
  const printReq=()=>{const html=`<!DOCTYPE html><html><head><title>Requisition — ${r.site}</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:24px}h1{color:#1B6B2F}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f9fafb;font-size:10px;font-weight:bold}</style></head><body><h1>Dust &amp; Wipes — Monthly Supply Requisition</h1><p><strong>Site:</strong> ${r.site} &nbsp; <strong>Period:</strong> ${MONTHS[r.month]} ${r.year} &nbsp; <strong>Status:</strong> ${r.status}</p><p><strong>Submitted by:</strong> ${r.submittedBy}${r.reviewedBy?" &nbsp; <strong>Reviewed by:</strong> "+r.reviewedBy:""}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th>${canSeeCosts?"<th>Rate (₦)</th><th>Total (₦)</th>":""}<th>Notes</th></tr></thead><tbody>${(r.items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit}</td>${canSeeCosts?`<td>${(rates[i.id||i.name]||0).toLocaleString()}</td><td>${(i.qty*(rates[i.id||i.name]||0)).toLocaleString()}</td>`:""}<td>${i.notes||""}</td></tr>`).join("")}</tbody>${canSeeCosts?`<tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">TOTAL</td><td>₦${total.toLocaleString()}</td><td></td></tr></tfoot>`:""}</table></body></html>`;const w=window.open("","_blank","width=820,height=900");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}};
  return(<ModalWrap title={`Requisition — ${r.site} · ${MONTHS[r.month]} ${r.year}`} onClose={onClose} xl>
    <div className="flex justify-between items-center mb-4 pb-4 border-b"><div><p className="font-bold text-gray-800">{r.site} — {MONTHS[r.month]} {r.year}</p><p className="text-xs text-gray-400">By {r.submittedBy} · {r.status}{r.reviewedBy?` · Reviewed: ${r.reviewedBy}`:""}</p></div><button onClick={printReq} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:O}}>🖨️ Print / PDF</button></div>
    {canSeeCosts&&budget>0&&<div className="p-3 rounded-xl mb-4 text-sm font-semibold" style={{background:Number(pct)>100?"#fee2e2":Number(pct)>85?"#fffbeb":"#dcfce7"}}><span className={Number(pct)>100?"text-red-700":Number(pct)>85?"text-amber-700":"text-green-700"}>{fmt(total)} / {fmt(budget)} ({pct}%) {Number(pct)>100?"🔴 OVER BUDGET":Number(pct)>85?"🟡 Near budget":"🟢 Within budget"}</span></div>}
    <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b"><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Item</th><th className="px-4 py-2.5 text-xs font-bold text-gray-400 uppercase text-center">Qty</th><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Unit</th>{canSeeCosts&&<><th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Rate (₦)</th><th className="text-right px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Total</th></>}<th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase">Notes</th></tr></thead><tbody className="divide-y divide-gray-50">{(r.items||[]).map(i=><tr key={i.id||i.name} className="hover:bg-gray-50"><td className="px-4 py-2.5 font-medium text-gray-800">{i.name}</td><td className="px-4 py-2.5 text-center font-bold text-gray-700">{i.qty}</td><td className="px-4 py-2.5 text-xs text-gray-500">{i.unit}</td>{canSeeCosts&&<><td className="px-4 py-2.5"><input type="number" min="0" value={rates[i.id||i.name]||""} onChange={e=>setRates(r=>({...r,[i.id||i.name]:Number(e.target.value)}))} className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Rate"/></td><td className="px-4 py-2.5 text-right font-semibold text-gray-700">{rates[i.id||i.name]?fmt(i.qty*rates[i.id||i.name]):"—"}</td></>}<td className="px-4 py-2.5 text-xs text-gray-400">{i.notes||"—"}</td></tr>)}</tbody>{canSeeCosts&&<tfoot><tr style={{background:"#f0fdf4"}}><td className="px-4 py-2.5 font-black text-gray-800" colSpan={4}>TOTAL</td><td className="px-4 py-2.5 text-right font-black" style={{color:G}}>{fmt(total)}</td><td/></tr></tfoot>}</table></div>
  </ModalWrap>);}

// ── ABSENCE & COVER ───────────────────────────────────────────────────────────
function AbsenceCoverPage({absences,setAbsences,covers,setCovers,clients}){
  const[tab,setTab]=useState("absences");const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const delA=id=>confirm("Delete this absence?",()=>setAbsences(as=>as.filter(a=>a.id!==id)));
  const delC=id=>confirm("Delete this cover?",()=>setCovers(cs=>cs.filter(c=>c.id!==id)));
  const SC={"Absent Logged":{bg:"#fff7ed",color:O,border:"#fed7aa"},"Cover Assigned":{bg:"#eff6ff",color:BLUE,border:"#bfdbfe"},"Completed":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Sent to Finance":{bg:"#fdf4ff",color:"#7c3aed",border:"#ddd6fe"}};
  const advanceAbs=(id,cur)=>setAbsences(as=>as.map(a=>a.id===id?{...a,status:cur==="Absent Logged"?"Cover Assigned":cur==="Cover Assigned"?"Completed":"Sent to Finance"}:a));
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between"><div className="flex gap-2 border border-gray-200 rounded-xl p-1 bg-white"><button onClick={()=>setTab("absences")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="absences"?"text-white":"text-gray-500"}`} style={tab==="absences"?{background:G}:{}}>Absences ({absences.length})</button><button onClick={()=>setTab("covers")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="covers"?"text-white":"text-gray-500"}`} style={tab==="covers"?{background:G}:{}}>Cover ({covers.length})</button></div><button onClick={()=>setModal({type:tab==="absences"?"absence":"cover"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>{tab==="absences"?"Log Absence":"Assign Cover"}</button></div>
    {tab==="absences"&&<Card><div className="divide-y divide-gray-50">{absences.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No absences logged</div>}{absences.map(a=><div key={a.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:RED}}>{(a.cleaner||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{a.cleaner}</p><p className="text-xs text-gray-500">Site: {a.site} · {fmtD(a.startDate)}{a.endDate&&a.endDate!==a.startDate?` – ${fmtD(a.endDate)}`:""}</p>{a.reason&&<p className="text-xs text-gray-400 italic">Reason: {a.reason}</p>}<p className="text-xs text-gray-400">Replacement: {a.needsReplacement?"Needed":"Not required"}</p></div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={a.status||"Absent Logged"} custom={SC[a.status||"Absent Logged"]}/>{a.status!=="Sent to Finance"&&<button onClick={()=>advanceAbs(a.id,a.status||"Absent Logged")} className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-0.5" style={{background:BLUE}}><ArrowRight size={9}/>Next</button>}<button onClick={()=>delA(a.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>)}</div></Card>}
    {tab==="covers"&&<Card><div className="divide-y divide-gray-50">{covers.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No cover assignments</div>}{covers.map(c=><div key={c.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(c.replacement||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{c.replacement} <span className="font-normal text-gray-400">covered for</span> {c.absentCleaner}</p><p className="text-xs text-gray-500">Site: {c.site} · {fmtD(c.startDate)}{c.endDate&&c.endDate!==c.startDate?` – ${fmtD(c.endDate)}`:""}</p><p className="text-xs text-gray-400">{c.days} day(s) · Compensation: {c.compensation?"Yes":"No"}</p></div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><button onClick={()=>delC(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>)}</div></Card>}
    {modal?.type==="absence"&&<ModalWrap title="Log Staff Absence" onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Absent Staff"><input className={inp} value={modal.cleaner||""} onChange={e=>setModal(p=>({...p,cleaner:e.target.value}))}/></Fld><Fld label="Site"><select className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))}><option value="">— Select —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Start Date"><input className={inp} type="date" value={modal.startDate||""} onChange={e=>setModal(p=>({...p,startDate:e.target.value}))}/></Fld><Fld label="End Date"><input className={inp} type="date" value={modal.endDate||""} onChange={e=>setModal(p=>({...p,endDate:e.target.value}))}/></Fld></div><Fld label="Reason"><input className={inp} value={modal.reason||""} onChange={e=>setModal(p=>({...p,reason:e.target.value}))}/></Fld><Fld label="Replacement Needed?"><RadioG value={modal.needsReplacement?"Yes":"No"} onChange={v=>setModal(p=>({...p,needsReplacement:v==="Yes"}))} options={["Yes","No"]}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{setAbsences(as=>[...as,{...modal,id:"abs"+Date.now(),status:"Absent Logged"}]);setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Log Absence</button></div></ModalWrap>}
    {modal?.type==="cover"&&<ModalWrap title="Assign Cover" onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Absent Cleaner"><input className={inp} value={modal.absentCleaner||""} onChange={e=>setModal(p=>({...p,absentCleaner:e.target.value}))}/></Fld><Fld label="Replacement Cleaner"><input className={inp} value={modal.replacement||""} onChange={e=>setModal(p=>({...p,replacement:e.target.value}))}/></Fld><Fld label="Site"><select className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))}><option value="">— Select —</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></Fld><div className="grid grid-cols-3 gap-4"><Fld label="Start Date"><input className={inp} type="date" value={modal.startDate||""} onChange={e=>setModal(p=>({...p,startDate:e.target.value}))}/></Fld><Fld label="End Date"><input className={inp} type="date" value={modal.endDate||""} onChange={e=>setModal(p=>({...p,endDate:e.target.value}))}/></Fld><Fld label="Days Covered"><input className={inp} type="number" min="1" value={modal.days||1} onChange={e=>setModal(p=>({...p,days:Number(e.target.value)}))}/></Fld></div><Fld label="Compensation?"><RadioG value={modal.compensation?"Yes":"No"} onChange={v=>setModal(p=>({...p,compensation:v==="Yes"}))} options={["Yes","No"]}/></Fld><Fld label="Remarks"><textarea className={inp} rows={2} value={modal.remarks||""} onChange={e=>setModal(p=>({...p,remarks:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{setCovers(cs=>[...cs,{...modal,id:"cov"+Date.now()}]);setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Assign</button></div></ModalWrap>}
  </div>);}

// ── BIRTHDAYS (V5: users + standalone staff, Add Staff button) ────────────────
function BirthdaysPage({users,setUsers,staff,setStaff}){
  const[modal,setModal]=useState(null);const[tab,setTab]=useState("all");const[confirm,confirmEl]=useConfirm();
  const thisM=TODAY.getMonth()+1,todayD=TODAY.getDate();
  const allPeople=[...users.map(u=>({...u,src:"user"})),...staff.map(s=>({...s,src:"staff"}))];
  const withBdays=allPeople.filter(u=>u.dob);
  const sorted=[...withBdays].sort((a,b)=>{const am=new Date(a.dob).getMonth()+1,ad=new Date(a.dob).getDate(),bm=new Date(b.dob).getMonth()+1,bd=new Date(b.dob).getDate();return am!==bm?am-bm:ad-bd;});
  const thisMonth=sorted.filter(u=>new Date(u.dob).getMonth()+1===thisM);
  const showList=tab==="all"?allPeople:tab==="users"?users:staff;
  const del=id=>confirm("Remove this staff member?",()=>setStaff(ss=>ss.filter(s=>s.id!==id)));
  const save=data=>{
    if(data.src==="user"||data.id?.startsWith("u")){setUsers(us=>us.map(u=>u.id===data.id?{...u,dob:data.dob}:u));}
    else if(data.id&&!data._new){setStaff(ss=>ss.map(s=>s.id===data.id?{...s,...data}:s));}
    else{setStaff(ss=>[...ss,{id:"st"+Date.now(),name:data.name,role:data.role||"Cleaner",site:data.site||"",dob:data.dob||""}]);}
    setModal(null);
  };
  return(<div className="space-y-5">{confirmEl}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><KPI icon="👥" label="Total Staff" value={allPeople.length} sub="Users + field staff" bg="#f0fdf4"/><KPI icon="🎂" label="DOB Recorded" value={withBdays.length} sub={`of ${allPeople.length}`} bg="#fdf4ff"/><KPI icon="🎉" label="This Month" value={thisMonth.length} sub={monthName(thisM-1)+" celebrants"} bg="#eff6ff"/><KPI icon="⚠️" label="No DOB" value={allPeople.filter(u=>!u.dob).length} sub="Update profiles" bg="#fffbeb"/></div>
    {thisMonth.length>0&&<Card className="p-5"><h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:G}}>🎂 {monthName(thisM-1)} Celebrants</h3><div className="grid grid-cols-1 gap-2.5">{thisMonth.map(u=>{const d=new Date(u.dob);const isToday=d.getDate()===todayD;return(<div key={u.id} className={`flex items-center justify-between p-3.5 rounded-xl ${isToday?"border-2":"border"}`} style={isToday?{borderColor:"#9333ea",background:"#fdf4ff"}:{borderColor:"#e9d5ff",background:"#faf5ff"}}><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{background:isToday?"#9333ea":"#a855f7"}}>{(u.initial||u.name[0])}</div><div><p className="font-semibold text-gray-800">{u.name}</p><p className="text-xs text-gray-500">{u.role}{u.site?` · ${u.site}`:""}</p></div></div><p className={`text-sm font-bold ${isToday?"text-purple-600":"text-gray-500"}`}>{isToday?"🎂 Today!":d.getDate()+" "+monthName(d.getMonth())}</p></div>);})}</div></Card>}
    <div className="flex items-center justify-between"><div className="flex gap-2 border border-gray-200 rounded-xl p-1 bg-white">{[{id:"all",l:"All Staff"},{id:"users",l:"App Users"},{id:"staff",l:"Field Staff"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id?"text-white":"text-gray-500"}`} style={tab===t.id?{background:G}:{}}>{t.l}</button>)}</div><button onClick={()=>setModal({_new:true,role:"Cleaner"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Staff Member</button></div>
    <Card><div className="divide-y divide-gray-50">{showList.map(u=>{const d=u.dob?new Date(u.dob):null;const isUser=u.src==="user"||u.id?.startsWith("u");return(<div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:isUser?O:G}}>{(u.initial||u.name[0])}</div><div><p className="font-semibold text-gray-800 text-sm">{u.name}</p><p className="text-xs text-gray-400">{u.role}{u.site?` · ${u.site}`:""}{isUser?<span className="text-blue-500 ml-1">(App User)</span>:null}</p></div></div><div className="flex items-center gap-3">{d?<p className="text-sm font-semibold text-gray-700">{d.getDate()} {monthName(d.getMonth())} {d.getFullYear()}</p>:<p className="text-xs text-amber-500 font-medium">No DOB</p>}<button onClick={()=>setModal({...u,_editing:true})} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button>{!isUser&&<button onClick={()=>del(u.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>}</div></div>);})}</div></Card>
    {modal&&<ModalWrap title={modal._new?"Add Staff Member":modal.src==="user"?"Update User DOB":"Edit Staff Member"} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        {modal._new&&!modal._editing&&<><Fld label="Full Name"><input className={inp} value={modal.name||""} onChange={e=>setModal(p=>({...p,name:e.target.value}))}/></Fld><Fld label="Role / Position"><select className={inp} value={modal.role||"Cleaner"} onChange={e=>setModal(p=>({...p,role:e.target.value}))}><option>Cleaner</option><option>Team Lead</option><option>Pest Technician</option><option>Driver</option><option>Office Staff</option><option>Other</option></select></Fld><Fld label="Assigned Site"><input className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))} placeholder="e.g. IFRC, AFD…"/></Fld></>}
        {modal._editing&&!modal._new&&<div className="p-3 rounded-xl mb-2 text-sm text-gray-600" style={{background:"#f9fafb"}}><span className="font-bold">{modal.name}</span> · {modal.role}{modal.site?` · ${modal.site}`:""}</div>}
        <Fld label="Date of Birth"><input className={inp} type="date" value={modal.dob||""} onChange={e=>setModal(p=>({...p,dob:e.target.value}))}/></Fld>
        {modal._editing&&modal.src!=="user"&&<><Fld label="Role"><select className={inp} value={modal.role||""} onChange={e=>setModal(p=>({...p,role:e.target.value}))}><option>Cleaner</option><option>Team Lead</option><option>Pest Technician</option><option>Driver</option><option>Other</option></select></Fld><Fld label="Site"><input className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))}/></Fld></>}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} disabled={modal._new&&!modal.name} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>Save</button></div>
    </ModalWrap>}
  </div>);}

// ── IMPREST ───────────────────────────────────────────────────────────────────
function ImprestPage({imprests,setImprests}){
  const[modal,setModal]=useState(null);const[view,setView]=useState(null);const[confirm,confirmEl]=useConfirm();
  const del=id=>confirm("Delete this imprest account?",()=>setImprests(im=>im.filter(i=>i.id!==id)));
  const addExpense=(id,exp)=>setImprests(im=>im.map(i=>i.id===id?{...i,expenses:[...(i.expenses||[]),exp]}:i));
  const updateStatus=(id,status)=>setImprests(im=>im.map(i=>i.id===id?{...i,status}:i));
  const totalIssued=imprests.reduce((s,i)=>s+i.amount,0),totalSpent=imprests.reduce((s,i)=>s+(i.expenses||[]).reduce((ss,e)=>ss+e.amount,0),0);
  const SC={"Active":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Pending Reconciliation":{bg:"#fffbeb",color:AMBER,border:"#fde68a"},"Closed":{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"},"Flagged":{bg:"#fee2e2",color:RED,border:"#fca5a5"}};
  return(<div className="space-y-5">{confirmEl}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><KPI icon="💼" label="Total Issued" value={fmt(totalIssued)} sub="All accounts" bg={GL}/><KPI icon="💸" label="Total Spent" value={fmt(totalSpent)} sub="All accounts" bg={OL}/><KPI icon="💰" label="Balance" value={fmt(totalIssued-totalSpent)} sub="Remaining" bg="#f0f9ff"/><KPI icon="📋" label="Active" value={imprests.filter(i=>i.status==="Active").length} sub="Open accounts" bg="#fdf4ff"/></div>
    <div className="flex justify-end"><button onClick={()=>setModal({type:"new"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Imprest</button></div>
    <Card><div className="divide-y divide-gray-50">{imprests.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No imprest accounts yet</div>}{imprests.map(imp=>{const spent=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0),bal=imp.amount-spent,overdue=imp.deadline&&new Date(imp.deadline)<TODAY&&imp.status==="Active";return(<div key={imp.id} className="px-5 py-4 hover:bg-gray-50"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:bal<0?RED:G}}>₦</div><div className="min-w-0"><p className="font-semibold text-gray-800 text-sm">{imp.title}</p><p className="text-xs text-gray-500">Holder: {imp.holder} · {imp.branch} · {fmtD(imp.releaseDate)}</p><p className="text-xs text-gray-400">{imp.purpose}</p>{overdue&&<p className="text-xs text-red-600 font-semibold">⚠️ Reconciliation overdue</p>}<div className="flex gap-4 mt-1.5 text-xs"><span>Issued: <strong>{fmt(imp.amount)}</strong></span><span>Spent: <strong>{fmt(spent)}</strong></span><span>Bal: <strong style={{color:bal<0?RED:G}}>{fmt(bal)}</strong></span></div></div></div><div className="flex items-center gap-2 flex-shrink-0"><SBadge s={overdue?"Flagged":imp.status} custom={SC[overdue?"Flagged":imp.status]}/><button onClick={()=>setView(imp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Eye size={13}/></button><button onClick={()=>setModal({type:"expense",impId:imp.id,imp})} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 border border-green-100"><Plus size={13}/></button><button onClick={()=>del(imp.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div></div>);})}</div></Card>
    {modal?.type==="new"&&<ModalWrap title="Create Imprest Account" onClose={()=>setModal(null)} wide><div className="grid grid-cols-2 gap-4"><Fld label="Title" col><input className={inp} value={modal.title||""} onChange={e=>setModal(p=>({...p,title:e.target.value}))} placeholder="e.g. Site Operations Fund — April"/></Fld><Fld label="Holder"><input className={inp} value={modal.holder||""} onChange={e=>setModal(p=>({...p,holder:e.target.value}))}/></Fld><Fld label="Branch/Site"><input className={inp} value={modal.branch||""} onChange={e=>setModal(p=>({...p,branch:e.target.value}))}/></Fld><Fld label="Amount Released (₦)"><input className={inp} type="number" min="0" value={modal.amount||""} onChange={e=>setModal(p=>({...p,amount:Number(e.target.value)}))}/></Fld><Fld label="Release Date"><input className={inp} type="date" value={modal.releaseDate||""} onChange={e=>setModal(p=>({...p,releaseDate:e.target.value}))}/></Fld><Fld label="Reconciliation Deadline"><input className={inp} type="date" value={modal.deadline||""} onChange={e=>setModal(p=>({...p,deadline:e.target.value}))}/></Fld><Fld label="Purpose" col><textarea className={inp} rows={2} value={modal.purpose||""} onChange={e=>setModal(p=>({...p,purpose:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{setImprests(im=>[...im,{...modal,id:"imp"+Date.now(),status:"Active",expenses:[]}]);setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Create</button></div></ModalWrap>}
    {modal?.type==="expense"&&<ModalWrap title={`Log Expense — ${modal.imp.title}`} onClose={()=>setModal(null)}><div className="space-y-4"><div className="p-3 rounded-xl text-sm" style={{background:GL}}><span className="font-bold text-green-700">Available Balance: </span><span style={{color:G}}>{fmt(modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0))}</span></div><div className="grid grid-cols-2 gap-4"><Fld label="Date"><input className={inp} type="date" value={modal.expDate||TODAY.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,expDate:e.target.value}))}/></Fld><Fld label="Amount (₦)"><input className={inp} type="number" min="0" value={modal.expAmount||""} onChange={e=>setModal(p=>({...p,expAmount:Number(e.target.value)}))}/></Fld></div><Fld label="Category"><select className={inp} value={modal.expCat||""} onChange={e=>setModal(p=>({...p,expCat:e.target.value}))}><option value="">— Select —</option>{IMPREST_CATS.map(c=><option key={c}>{c}</option>)}</select></Fld><Fld label="Item/Service" col><input className={inp} value={modal.expItem||""} onChange={e=>setModal(p=>({...p,expItem:e.target.value}))}/></Fld><Fld label="Vendor"><input className={inp} value={modal.expVendor||""} onChange={e=>setModal(p=>({...p,expVendor:e.target.value}))}/></Fld><Fld label="Notes"><textarea className={inp} rows={2} value={modal.expNote||""} onChange={e=>setModal(p=>({...p,expNote:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>{const bal=modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0);if((modal.expAmount||0)>bal){alert("Insufficient balance!");return;}addExpense(modal.impId,{id:"exp"+Date.now(),date:modal.expDate,amount:modal.expAmount||0,category:modal.expCat,item:modal.expItem,vendor:modal.expVendor,note:modal.expNote});setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Log Expense</button></div></ModalWrap>}
    {view&&<ModalWrap title={`Imprest — ${view.title}`} onClose={()=>setView(null)} xl><div className="flex justify-between items-center mb-4 pb-4 border-b"><div><p className="font-bold text-gray-800">{view.title}</p><p className="text-xs text-gray-400">Holder: {view.holder} · {view.branch} · Released: {fmtD(view.releaseDate)}</p></div><div className="flex gap-2"><button onClick={()=>updateStatus(view.id,"Pending Reconciliation")} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-amber-300 text-amber-700">Reconcile</button><button onClick={()=>updateStatus(view.id,"Closed")} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-300 text-gray-600">Close</button></div></div>{(()=>{const spent=(view.expenses||[]).reduce((s,e)=>s+e.amount,0),bal=view.amount-spent;return(<div className="grid grid-cols-3 gap-4 mb-4">{[["Issued",view.amount,GL,G],["Spent",spent,OL,O],["Balance",bal,bal<0?"#fee2e2":"#f0f9ff",bal<0?RED:BLUE]].map(([l,v,bg,c])=><div key={l} className="p-4 rounded-xl text-center" style={{background:bg}}><p className="text-lg font-black" style={{color:c}}>{fmt(v)}</p><p className="text-xs font-bold text-gray-500 mt-1">{l}</p></div>)}</div>);})()}<div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Date","Item","Category","Vendor","Amount","Notes"].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{(view.expenses||[]).length===0?<tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No expenses logged</td></tr>:(view.expenses||[]).map(e=><tr key={e.id} className="hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtD(e.date)}</td><td className="px-3 py-2 font-medium text-gray-800">{e.item}</td><td className="px-3 py-2 text-xs text-gray-500">{e.category}</td><td className="px-3 py-2 text-xs text-gray-500">{e.vendor||"—"}</td><td className="px-3 py-2 font-bold text-gray-800">{fmt(e.amount)}</td><td className="px-3 py-2 text-xs text-gray-400">{e.note||"—"}</td></tr>)}</tbody></table></div></ModalWrap>}
  </div>);}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsPage({clients,siteReports,jobs}){
  const ws=useMemo(()=>clients.map(c=>({...c,status:cStatus(c.ce)})),[clients]);
  const top=[...ws].sort((a,b)=>b.tot-a.tot).slice(0,7);
  const svcRev=[{name:"Cleaning",value:ws.filter(c=>c.svc==="Cleaning").reduce((s,c)=>s+c.tot,0)},{name:"Pest Control",value:ws.filter(c=>c.svc==="Pest Control").reduce((s,c)=>s+c.tot,0)},{name:"Both",value:ws.filter(c=>c.svc==="Both").reduce((s,c)=>s+c.tot,0)}];
  return(<div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[{l:"Total Clients",v:clients.length},{l:"Active Contracts",v:ws.filter(c=>c.status==="Active").length},{l:"Jobs Completed",v:jobs.filter(j=>j.status==="Completed").length},{l:"Site Reports",v:siteReports.length}].map(k=><Card key={k.l} className="p-5"><div className="text-2xl font-black text-gray-800">{k.v}</div><div className="text-xs font-bold text-gray-500 mt-1">{k.l}</div></Card>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Top Clients by Value</h3><ResponsiveContainer width="100%" height={220}><BarChart data={top} layout="vertical" barSize={14}><XAxis type="number" tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`} tick={{fontSize:9,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:"#6b7280"}} width={130} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[fmt(v),"Value"]} contentStyle={{borderRadius:"12px"}}/><Bar dataKey="tot" fill={G} radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></Card>
      <Card className="p-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Revenue by Service</h3><ResponsiveContainer width="100%" height={140}><BarChart data={svcRev} barSize={45}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#6b7280"}}/><YAxis tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fontSize:10}}/><Tooltip formatter={v=>[fmt(v),"Revenue"]}/><Bar dataKey="value" radius={[8,8,0,0]}>{svcRev.map((_,i)=><Cell key={i} fill={[G,O,BLUE][i]}/>)}</Bar></BarChart></ResponsiveContainer></Card>
    </div>
    <Card className="p-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Full Revenue Breakdown</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{["Client","Cat","Service","Salary","Consumables","Svc Charge","VAT","Total","Status"].map(h=><th key={h} className="text-right first:text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{[...clients].sort((a,b)=>b.tot-a.tot).map(c=><tr key={c.id} className="hover:bg-gray-50"><td className="px-3 py-2.5 font-medium text-gray-700">{c.name}</td><td className="px-3 py-2.5 text-right text-xs text-gray-500">{c.cat}</td><td className="px-3 py-2.5 text-right text-xs text-gray-500">{c.svc}</td><td className="px-3 py-2.5 text-right text-xs">{fmt(c.sal)}</td><td className="px-3 py-2.5 text-right text-xs">{fmt(c.con)}</td><td className="px-3 py-2.5 text-right text-xs">{fmt(c.sc)}</td><td className="px-3 py-2.5 text-right text-xs">{fmt(c.vat)}</td><td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmt(c.tot)}</td><td className="px-3 py-2.5 text-right"><SBadge s={cStatus(c.ce)}/></td></tr>)}<tr className="border-t-2 font-black" style={{background:GL}}><td className="px-3 py-2.5 text-gray-800" colSpan={3}>TOTAL</td>{[clients.reduce((s,c)=>s+c.sal,0),clients.reduce((s,c)=>s+c.con,0),clients.reduce((s,c)=>s+c.sc,0),clients.reduce((s,c)=>s+c.vat,0),clients.reduce((s,c)=>s+c.tot,0)].map((v,i)=><td key={i} className="px-3 py-2.5 text-right" style={i===4?{color:G}:{}}>{fmt(v)}</td>)}<td/></tr></tbody></table></div></Card>
  </div>);}

// ── USERS ──────────────────────────────────────────────────────────────────────
function UsersPage({users,setUsers}){
  const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const rc={"Admin":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Supervisor":{bg:"#fff7ed",color:"#9a3412",border:"#fed7aa"},"Technician":{bg:"#eff6ff",color:"#1e40af",border:"#bfdbfe"}};
  const save=data=>{if(data.id)setUsers(us=>us.map(u=>u.id===data.id?{...u,...data,initial:(data.name||"?")[0].toUpperCase()}:u));else setUsers(us=>[...us,{...data,id:"u"+Date.now(),initial:(data.name||"?")[0].toUpperCase()}]);setModal(null);};
  const del=id=>confirm("Remove this user account?",()=>setUsers(us=>us.filter(u=>u.id!==id)));
  return(<div className="space-y-5 max-w-3xl">{confirmEl}
    <div className="flex items-start gap-3 p-4 rounded-xl" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{color:AMBER}}/>
      <div><p className="font-bold text-amber-800">Session Persistence Notice</p><p className="text-amber-700 text-xs mt-1">Accounts added here persist for this browser session only. To permanently add staff, <strong>please send the full staff list</strong> (name, role, email/phone, temp password, DOB) and they will be hard-coded into the database.</p><p className="text-amber-600 text-xs mt-1">📱 Technicians without email: use their phone number as username (e.g. <code>08031234567</code>) — they sign in with phone + password.</p></div>
    </div>
    <div className="flex items-center justify-between"><p className="text-sm text-gray-500">{users.length} account(s)</p><button onClick={()=>setModal({role:"Technician"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><UserPlus size={14}/>Add User</button></div>
    <Card><div className="divide-y divide-gray-50">{users.map(u=><div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center flex-shrink-0" style={{background:O}}>{u.initial}</div><div><p className="font-semibold text-gray-800">{u.name}</p><p className="text-xs text-gray-400">{u.email||u.username||"No email/username"}</p>{u.dob&&<p className="text-xs text-gray-300">DOB: {fmtD(u.dob)}</p>}</div></div><div className="flex items-center gap-3"><SBadge s={u.role} custom={rc[u.role]}/><div className="flex gap-1"><button onClick={()=>setModal(u)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(u.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div></div>)}</div></Card>
    {modal&&<ModalWrap title={modal.id?"Edit User":"Add New User"} onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Full Name"><input className={inp} value={modal.name||""} onChange={e=>setModal(p=>({...p,name:e.target.value}))}/></Fld><Fld label="Role"><select className={inp} value={modal.role||"Technician"} onChange={e=>setModal(p=>({...p,role:e.target.value}))}><option>Admin</option><option>Supervisor</option><option>Technician</option></select></Fld><Fld label="Email (leave blank for technicians)"><input className={inp} type="email" value={modal.email||""} onChange={e=>setModal(p=>({...p,email:e.target.value}))} placeholder="name@dustandwipes.com"/></Fld><Fld label="Username / Phone (for technicians without email)"><input className={inp} value={modal.username||""} onChange={e=>setModal(p=>({...p,username:e.target.value}))} placeholder="e.g. 08031234567"/></Fld>{!modal.id&&<Fld label="Temporary Password"><input className={inp} type="password" value={modal.password||""} onChange={e=>setModal(p=>({...p,password:e.target.value}))} placeholder="Min 8 characters"/></Fld>}<Fld label="Date of Birth (optional)"><input className={inp} type="date" value={modal.dob||""} onChange={e=>setModal(p=>({...p,dob:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{modal.id?"Save":"Add User"}</button></div></ModalWrap>}
  </div>);}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsPage(){
  return(<div className="space-y-6 max-w-2xl">
    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-4">Company Profile</h3><div className="grid grid-cols-2 gap-4">{[["Company Name","Dust & Wipes Limited"],["App Name","Operations Hub"],["Domain","app.dustandwipes.com"],["Location","Abuja, Nigeria"],["Currency","NGN (₦)"],["Timezone","WAT (UTC+1)"]].map(([l,v])=><Fld key={l} label={l}><input className={inp+" bg-gray-50"} defaultValue={v} readOnly/></Fld>)}</div></Card>
    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-3">Role Permissions</h3><div className="space-y-2.5">{[["Admin","#166534","Full access: all 15 modules, user management, settings, item catalogue"],["Supervisor","#9a3412","Jobs, clients, contracts, reports, requisitions (with costs), cover scheduling, imprest, item catalogue"],["Technician","#1e40af","Assigned jobs, GPS check-in/out, site reports, submit requisitions (no cost visibility)"]].map(([r,c,d])=><div key={r} className="flex gap-3 p-3 rounded-xl" style={{background:"#f9fafb"}}><span className="text-xs font-black w-24 flex-shrink-0 pt-0.5" style={{color:c}}>{r}</span><span className="text-xs text-gray-600">{d}</span></div>)}</div></Card>
    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-3">Technology Stack</h3><div className="space-y-2.5">{[["Database","Supabase (PostgreSQL) — row-level security, Nigerian-accessible"],["Auth","Supabase Auth — email/password + phone/username, password reset via email"],["Hosting","Vercel (frontend) + Supabase (backend) → app.dustandwipes.com"],["SMS/Email Alerts","Edge Functions → Twilio (SMS) + SendGrid (email) at 60d & 30d contract thresholds"],["Req. Emails","Edge Function on requisition submit → emails all supervisors"],["Mobile/Offline","PWA with Service Worker — offline job list + form caching"],["GPS","Browser Geolocation API + Supabase geo-validation per site"]].map(([l,d])=><div key={l} className="flex gap-3 p-3 rounded-xl" style={{background:"#f9fafb"}}><span className="text-xs font-bold text-green-700 w-36 flex-shrink-0">{l}</span><span className="text-xs text-gray-600">{d}</span></div>)}</div></Card>
  </div>);}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const[user,        setUser]        =useState(null);
  const[page,        setPage]        =useState("dashboard");
  const[sidebar,     setSidebar]     =useState(true);
  const[users,       setUsers]       =useState(INITIAL_USERS);
  const[staff,       setStaff]       =useState(INITIAL_STAFF);
  const[clients,     setClients]     =useState(SEED_CLIENTS);
  const[schedules,   setSchedules]   =useState(SEED_SCHEDULES);
  const[requests,    setRequests]    =useState(SEED_REQUESTS);
  const[jobs,        setJobs]        =useState(SEED_JOBS);
  const[inventory,   setInventory]   =useState(SEED_INVENTORY);
  const[siteReports, setSiteReports] =useState([]);
  const[supplyItems, setSupplyItems] =useState(INITIAL_SUPPLY_MASTER);
  const[requisitions,setRequisitions]=useState([]);
  const[absences,    setAbsences]    =useState([]);
  const[covers,      setCovers]      =useState([]);
  const[imprests,    setImprests]    =useState([]);
  const[showNotif,   setShowNotif]   =useState(false);
  const[readIds,     setReadIds]     =useState([]);
  const[dbStatus,    setDbStatus]    =useState("loading"); // "loading" | "ok" | "error"
  const notifRef   = useRef(null);
  const dbLoaded   = useRef(false);   // true after first load from Supabase
  const syncTimers = useRef({});      // debounce timers per table

  // ── Supabase: load all data on mount ───────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.allSettled([
          dbLoad("clients",     setClients),
          dbLoad("jobs",        setJobs),
          dbLoad("requests",    setRequests),
          dbLoad("schedules",   setSchedules),
          dbLoad("reports",     setSiteReports),
          dbLoad("inventory",   setInventory),
          dbLoad("supplyitems", setSupplyItems),
          dbLoad("requisitions",setRequisitions),
          dbLoad("absences",    setAbsences),
          dbLoad("covers",      setCovers),
          dbLoad("imprests",    setImprests),
          dbLoad("staff",       setStaff),
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
      }
    };
    loadAll();
  }, []);

  // ── Supabase: debounced sync whenever state changes ───────────────────────
  const debouncedSync = useCallback((table, data) => {
    if (!dbLoaded.current) return;
    clearTimeout(syncTimers.current[table]);
    syncTimers.current[table] = setTimeout(() => dbSync(table, data), 1200);
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
  useEffect(() => { debouncedSync("imprests",     imprests);    }, [imprests,    debouncedSync]);
  useEffect(() => { debouncedSync("staff",        staff);       }, [staff,       debouncedSync]);
  useEffect(() => { debouncedSync("users",        users);       }, [users,       debouncedSync]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const allNotifs=useMemo(()=>buildNotifs(clients,jobs,inventory),[clients,jobs,inventory]);
  const liveNotifs=allNotifs.map(n=>({...n,read:readIds.includes(n.id)}));
  const unread=liveNotifs.filter(n=>!n.read).length;
  const markRead=id=>setReadIds(r=>[...r,id]);
  useEffect(()=>{const h=e=>{if(notifRef.current&&!notifRef.current.contains(e.target))setShowNotif(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const handleLogin=u=>{setUser(u);setPage("dashboard");};

  // ── Loading screen (while fetching from Supabase) ─────────────────────────
  if(!user && dbStatus === "loading"){
    return(
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:`linear-gradient(145deg,${GD},#1B5E2F)`}}>
        <img src={LOGO} alt="D&W" className="w-16 mb-2 drop-shadow-lg"/>
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{borderColor:`rgba(255,255,255,0.3)`,borderTopColor:"transparent"}}/>
        <p className="text-green-200 text-sm font-medium">Connecting to database…</p>
      </div>
    );
  }

  if(!user) return <LoginScreen onLogin={handleLogin} users={users}/>;

  const NAV=[
    {id:"dashboard",   label:"Dashboard",       icon:Home,          roles:["Admin","Supervisor","Technician"]},
    {id:"clients",     label:"Clients",          icon:Users,         roles:["Admin","Supervisor"]},
    {id:"contracts",   label:"Contracts",        icon:FileText,      roles:["Admin","Supervisor"]},
    {id:"requests",    label:"Service Requests", icon:Inbox,         roles:["Admin","Supervisor"]},
    {id:"jobs",        label:"Jobs",             icon:Briefcase,     roles:["Admin","Supervisor","Technician"]},
    {id:"schedule",    label:"Pest Schedule",    icon:Bug,           roles:["Admin","Supervisor","Technician"]},
    {id:"site_reports",label:"Site Reports",     icon:ClipboardList, roles:["Admin","Supervisor","Technician"]},
    {id:"inventory",   label:"Inventory",        icon:Package,       roles:["Admin","Supervisor"]},
    {id:"requisitions",label:"Requisitions",     icon:ClipboardCheck,roles:["Admin","Supervisor","Technician"]},
    {id:"absencecover",label:"Absence & Cover",  icon:UserCheck,     roles:["Admin","Supervisor"]},
    {id:"birthdays",   label:"Birthdays",        icon:Gift,          roles:["Admin","Supervisor"]},
    {id:"imprest",     label:"Imprest Fund",     icon:Wallet,        roles:["Admin","Supervisor"]},
    {id:"analytics",   label:"Analytics",        icon:BarChart2,     roles:["Admin"]},
    {id:"users",       label:"Users",            icon:Shield,        roles:["Admin"]},
    {id:"settings",    label:"Settings",         icon:Settings,      roles:["Admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const pageTitle=NAV.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <aside className={`${sidebar?"w-60":"w-14"} transition-all duration-200 flex flex-col flex-shrink-0`} style={{background:GD}}>
        <div className="h-16 flex items-center px-3 border-b gap-2 flex-shrink-0" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <img src={LOGO} alt="D&W" className="w-8 h-8 object-contain flex-shrink-0 rounded-lg bg-white p-0.5"/>
          {sidebar&&<div className="overflow-hidden"><div className="text-white text-sm font-black leading-tight whitespace-nowrap">{APP_NAME}</div><div className="text-xs whitespace-nowrap" style={{color:"#6EAD7E"}}>{APP_SUB}</div></div>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {NAV.map(item=>{const Icon=item.icon;const active=page===item.id;return(
            <button key={item.id} onClick={()=>setPage(item.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${sidebar?"":"justify-center"}`}
              style={active?{background:"rgba(255,255,255,0.10)",color:"#fff",borderRight:`3px solid ${O}`}:{color:"#6EAD7E"}}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#fff";}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#6EAD7E";}}}>
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
              <button onClick={()=>setUser(null)} style={{color:"#6EAD7E"}} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0" onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#6EAD7E";}}><LogOut size={14}/></button>
            </div>
          ):(
            <button onClick={()=>setUser(null)} className="w-full flex justify-center py-1" style={{color:"#6EAD7E"}}><LogOut size={16}/></button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
          <button onClick={()=>setSidebar(o=>!o)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><Menu size={18}/></button>
          <div className="flex-1 min-w-0"><h1 className="font-bold text-gray-700 text-sm">{pageTitle}</h1><p className="text-xs text-gray-400 hidden sm:block">{APP_NAME} · {APP_SUB}</p></div>
          <div className="flex items-center gap-2">
            {/* DB status dot */}
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <div className="w-2 h-2 rounded-full" style={{background:dbStatus==="ok"?"#22c55e":dbStatus==="error"?"#ef4444":"#f59e0b"}}/>
              <span className="text-xs font-medium" style={{color:dbStatus==="ok"?"#16a34a":dbStatus==="error"?"#dc2626":"#d97706"}}>{dbStatus==="ok"?"Synced":dbStatus==="error"?"DB Error":"Syncing…"}</span>
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
          {page==="dashboard"   &&<Dashboard clients={clients} jobs={jobs} requests={requests} inventory={inventory} users={users} staff={staff} onNav={setPage}/>}
          {page==="clients"     &&<ClientsPage clients={clients} setClients={setClients} userRole={user.role}/>}
          {page==="contracts"   &&<ContractsPage clients={clients}/>}
          {page==="requests"    &&<RequestsPage requests={requests} setRequests={setRequests} setJobs={setJobs} clients={clients}/>}
          {page==="jobs"        &&<JobsPage jobs={jobs} setJobs={setJobs} clients={clients} user={user}/>}
          {page==="schedule"    &&<SchedulePage schedules={schedules} setSchedules={setSchedules} clients={clients} userRole={user.role}/>}
          {page==="site_reports"&&<SiteReportsPage reports={siteReports} setReports={setSiteReports} user={user} clients={clients}/>}
          {page==="inventory"   &&<InventoryPage inventory={inventory} setInventory={setInventory} userRole={user.role}/>}
          {page==="requisitions"&&<RequisitionsPage requisitions={requisitions} setRequisitions={setRequisitions} supplyItems={supplyItems} setSupplyItems={setSupplyItems} clients={clients} users={users} user={user}/>}
          {page==="absencecover"&&<AbsenceCoverPage absences={absences} setAbsences={setAbsences} covers={covers} setCovers={setCovers} clients={clients} users={users}/>}
          {page==="birthdays"   &&<BirthdaysPage users={users} setUsers={setUsers} staff={staff} setStaff={setStaff}/>}
          {page==="imprest"     &&<ImprestPage imprests={imprests} setImprests={setImprests}/>}
          {page==="analytics"   &&<AnalyticsPage clients={clients} siteReports={siteReports} jobs={jobs}/>}
          {page==="users"       &&<UsersPage users={users} setUsers={setUsers}/>}
          {page==="settings"    &&<SettingsPage/>}
        </main>
      </div>
    </div>
  );
}
