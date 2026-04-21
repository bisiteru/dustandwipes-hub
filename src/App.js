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
  {id:"s41",name:"Squeegee",                       unit:"piece", cost:2500, cat:"Equipment",   active:true},
  {id:"s42",name:"Cobweb Remover",                 unit:"piece", cost:1800, cat:"Equipment",   active:true},
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
  {id:"st1", name:"Vera Okeke",      role:"Cleaner",category:"Cleaning Staff",site:"AFD",            dob:"1993-03-15",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st2", name:"Chafa Musa",      role:"Cleaner",category:"Cleaning Staff",site:"AFD",            dob:"1990-07-22",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st3", name:"Sani Ibrahim",    role:"Cleaner",category:"Cleaning Staff",site:"IFRC",           dob:"1988-04-09",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st4", name:"Peter Eze",       role:"Cleaner",category:"Cleaning Staff",site:"IFRC",           dob:"1995-11-03",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st5", name:"Mariam Abubakar", role:"Cleaner",category:"Cleaning Staff",site:"First Ally",     dob:"1991-08-18",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st6", name:"Faith Obi",       role:"Cleaner",category:"Cleaning Staff",site:"Chayim",         dob:"1996-04-09",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st7", name:"Joy Nwosu",       role:"Cleaner",category:"Cleaning Staff",site:"Chayim",         dob:"1994-12-25",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st8", name:"Rebecca Adamu",   role:"Cleaner",category:"Cleaning Staff",site:"Mr. Sunday",     dob:"1989-02-14",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st9", name:"Vivian Lawal",    role:"Cleaner",category:"Cleaning Staff",site:"Mrs. Khareemah", dob:"1997-06-30",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
  {id:"st10",name:"Jennifer Ogah",   role:"Cleaner",category:"Cleaning Staff",site:"Ms. Angela",     dob:"1992-09-12",homeAddress:"",phone:"",emergencyContact:"",emergencyPhone:""},
];

const CONTACTS_DB=[
  {id:"ct1",name:"Mrs. Olufunke Femi Ojo",phone:"08025835383",email:"",address:"Plot 60, 52 Road, Off Tai Solarin Ave., Abuja"},
  {id:"ct2",name:"Ms. Hadiza Umar",phone:"08036640955",email:"",address:"No. 3 Sani S Ameh Close, Abuja, FCT"},
  {id:"ct3",name:"Abdullahi Babandede",phone:"",email:"",address:""},
  {id:"ct4",name:"Aerial Project Analytics Africa.",phone:"",email:"",address:""},
  {id:"ct5",name:"AGENCE FRANÇAISE DE DÉVELOPPEMENT",phone:"07063773988",email:"djorsur@afd.fr",address:""},
  {id:"ct6",name:"Ahmed 0. Ahmed",phone:"",email:"",address:""},
  {id:"ct7",name:"Aisha Modibo",phone:"08022446622",email:"",address:""},
  {id:"ct8",name:"aladeolayinka",phone:"",email:"",address:""},
  {id:"ct9",name:"Alhaja Olumoh",phone:"08037144824",email:"",address:""},
  {id:"ct10",name:"Alhaji. A. A. Sayi",phone:"08023030171",email:"",address:""},
  {id:"ct11",name:"Al Hassan Abubakar Khalifa",phone:"08037486118",email:"",address:""},
  {id:"ct12",name:"Alh Waziri",phone:"08055041211",email:"",address:""},
  {id:"ct13",name:"Althea Specialty Clinics",phone:"",email:"",address:""},
  {id:"ct14",name:"Amos Musa",phone:"",email:"",address:""},
  {id:"ct15",name:"Anadolu global",phone:"",email:"",address:""},
  {id:"ct16",name:"Anadolu global office Nigeria Ltd",phone:"",email:"",address:""},
  {id:"ct17",name:"Antarn nig ltd",phone:"",email:"",address:""},
  {id:"ct18",name:"Architect Rufai",phone:"08036316472",email:"",address:""},
  {id:"ct19",name:"Arch Ozavukonga",phone:"08035893799",email:"",address:""},
  {id:"ct20",name:"Aremo Yusuf",phone:"08053031592",email:"",address:""},
  {id:"ct21",name:"Aso drive",phone:"",email:"",address:""},
  {id:"ct22",name:"Azikel Group",phone:"",email:"",address:""},
  {id:"ct23",name:"Azura Power West Africa Limited",phone:"08023903599",email:"",address:""},
  {id:"ct24",name:"Barbados Gate Ltd",phone:"09021681061",email:"",address:""},
  {id:"ct25",name:"Barr. Isaac",phone:"08068478299",email:"",address:""},
  {id:"ct26",name:"Barrister Tony",phone:"08035406365",email:"",address:""},
  {id:"ct27",name:"Barr O. Obigbesan",phone:"07064183258",email:"",address:""},
  {id:"ct28",name:"Bedmate Funiture Abuja",phone:"",email:"",address:""},
  {id:"ct29",name:"Benson Skincare",phone:"09080970721",email:"",address:""},
  {id:"ct30",name:"Betty@theparadiseabuja.com",phone:"",email:"",address:""},
  {id:"ct31",name:"Bimbo Kila",phone:"07032630456",email:"",address:""},
  {id:"ct32",name:"Bishop Mrs Charity Vedelago",phone:"07030000302",email:"",address:""},
  {id:"ct33",name:"bizyjingles@yahoo.com",phone:"",email:"",address:""},
  {id:"ct34",name:"Blessing Jegede",phone:"09038465604",email:"",address:""},
  {id:"ct35",name:"Block A, CBN Quarters Wuse2",phone:"",email:"",address:""},
  {id:"ct36",name:"Block C3, PTF Estate, Adetokunbo Ademola Crescent,  Wuse 2.",phone:"",email:"",address:""},
  {id:"ct37",name:"Block C3, PTF Estate, Adetokunbo Ademola Crescent,  Wuse 2, Enter  by FCMB Junction",phone:"",email:"",address:""},
  {id:"ct38",name:"Bomaco@hotmail.com",phone:"",email:"",address:""},
  {id:"ct39",name:"Brains and Harmers Estate",phone:"",email:"",address:""},
  {id:"ct40",name:"British Council",phone:"",email:"",address:""},
  {id:"ct41",name:"Bymara confectioneries",phone:"",email:"",address:""},
  {id:"ct42",name:"Carlos Franji",phone:"07030000603",email:"",address:""},
  {id:"ct43",name:"Casa De Los Reyes Luxury Apartments",phone:"",email:"",address:""},
  {id:"ct44",name:"Cedacrest hospital",phone:"",email:"",address:""},
  {id:"ct45",name:"Cedarmed Nigeria Limited",phone:"08036307968",email:"",address:""},
  {id:"ct46",name:"Cellulant Nigeria",phone:"",email:"",address:""},
  {id:"ct47",name:"Charles Arua",phone:"08064329918",email:"",address:""},
  {id:"ct48",name:"Chayim Diagnostics Services Limited",phone:"07031326535",email:"oluwabusayo.Adetona@chayimds.com",address:""},
  {id:"ct49",name:"Chidera Okolie",phone:"08169119111",email:"",address:""},
  {id:"ct50",name:"Chidozie",phone:"08155661404",email:"",address:""},
  {id:"ct51",name:"Chrome Group",phone:"09091711438",email:"",address:""},
  {id:"ct52",name:"Cincinnati Homes Limited",phone:"08136563553",email:"",address:""},
  {id:"ct53",name:"Citypot Restaurant",phone:"08065143620",email:"",address:""},
  {id:"ct54",name:"Client",phone:"",email:"",address:""},
  {id:"ct55",name:"Client katampe",phone:"",email:"",address:""},
  {id:"ct56",name:"Concordia Luxury Apartment",phone:"",email:"",address:""},
  {id:"ct57",name:"Coral Trade Investment",phone:"",email:"",address:""},
  {id:"ct58",name:"Core Group Polio Project Nigeria",phone:"08104475606",email:"",address:""},
  {id:"ct59",name:"Country Coordinating Office Nigeria CBM International",phone:"",email:"",address:""},
  {id:"ct60",name:"Crumbles",phone:"08036425454",email:"",address:"No. 32, 1st Avenue,, Abuja, Abuja Federal Capital Territory"},
  {id:"ct61",name:"Customer",phone:"",email:"",address:""},
  {id:"ct62",name:"Dada Monday",phone:"08124892269",email:"",address:""},
  {id:"ct63",name:"David Igoniwari",phone:"08146984303",email:"",address:""},
  {id:"ct64",name:"Deloitte",phone:"",email:"",address:""},
  {id:"ct65",name:"Deloitte Consulting",phone:"",email:"",address:""},
  {id:"ct66",name:"DevTech Systems, Inc.",phone:"",email:"",address:""},
  {id:"ct67",name:"DIA",phone:"",email:"",address:""},
  {id:"ct68",name:"Director",phone:"",email:"",address:""},
  {id:"ct69",name:"Director Center for Women Development",phone:"",email:"",address:""},
  {id:"ct70",name:"Director-General",phone:"",email:"",address:""},
  {id:"ct71",name:"Dr. Hilda Titiloye",phone:"08037017103",email:"",address:"Palm Court Ganges, House 2, Abuja"},
  {id:"ct72",name:"Dr Linus Ikpaahindi",phone:"08037879593",email:"",address:""},
  {id:"ct73",name:"Dr & Mrs Mangete",phone:"08133283961",email:"",address:""},
  {id:"ct74",name:"Dr. Ochuko",phone:"07030859971",email:"",address:""},
  {id:"ct75",name:"Dr Samuel Usman",phone:"08037031310",email:"",address:""},
  {id:"ct76",name:"Dr. Tapfuma",phone:"07034089707",email:"",address:""},
  {id:"ct77",name:"Dr Uhaa",phone:"07048744288",email:"",address:""},
  {id:"ct78",name:"Duke Global Energy Investment Limited (NNPC TRADING)",phone:"",email:"",address:""},
  {id:"ct79",name:"E-Clinic & Diagnostic ltd",phone:"",email:"",address:""},
  {id:"ct80",name:"Economic and Financial Crimes Commission",phone:"",email:"",address:""},
  {id:"ct81",name:"Efab Queens Estate, Gwarimpa,",phone:"08034499260",email:"",address:""},
  {id:"ct82",name:"Efetobore",phone:"",email:"",address:""},
  {id:"ct83",name:"ehealth4everyone",phone:"07019511836",email:"",address:""},
  {id:"ct84",name:"Embassy of Belgium",phone:"",email:"",address:""},
  {id:"ct85",name:"Embassy of Denmark",phone:"",email:"",address:""},
  {id:"ct86",name:"Embassy of Japan",phone:"",email:"",address:""},
  {id:"ct87",name:"Embassy of Switzerland",phone:"00922004002",email:"",address:""},
  {id:"ct88",name:"Emeka",phone:"",email:"",address:""},
  {id:"ct89",name:"Emokiniovo Dafe-Akpedeye",phone:"08057164742",email:"",address:""},
  {id:"ct90",name:"Enchanted Event",phone:"",email:"",address:""},
  {id:"ct91",name:"Engineer Patrick",phone:"07066081130",email:"",address:""},
  {id:"ct92",name:"Engr Adams",phone:"08058674842",email:"",address:""},
  {id:"ct93",name:"Engr. Pius",phone:"08037874206",email:"",address:""},
  {id:"ct94",name:"Engr. Yunusa",phone:"",email:"",address:""},
  {id:"ct95",name:"Eng. Sam",phone:"",email:"",address:""},
  {id:"ct96",name:"Fama Islamic International School",phone:"07034707015",email:"",address:""},
  {id:"ct97",name:"Fawazalli",phone:"",email:"",address:""},
  {id:"ct98",name:"Febson mall",phone:"",email:"",address:""},
  {id:"ct99",name:"fed4mail@yahoo.com",phone:"",email:"",address:""},
  {id:"ct100",name:"FIRST ALLY ASSET MANAGEMENT LTD",phone:"07038444887",email:"lydia.oko@first-ally.com",address:""},
  {id:"ct101",name:"Flawless Skin by Abby Medspa",phone:"07041987428",email:"",address:""},
  {id:"ct102",name:"FRASER SUITES",phone:"09095614691",email:"",address:""},
  {id:"ct103",name:"Gaduwa",phone:"",email:"",address:""},
  {id:"ct104",name:"Games Village Estate",phone:"",email:"",address:""},
  {id:"ct105",name:"Georgina Kennedy",phone:"",email:"",address:""},
  {id:"ct106",name:"Geycci collezioni Nig.Ltd",phone:"",email:"",address:""},
  {id:"ct107",name:"GHSC-PSM",phone:"09087382833",email:"",address:""},
  {id:"ct108",name:"GHSC-PSM project",phone:"",email:"",address:""},
  {id:"ct109",name:"Glamour Secret Home",phone:"",email:"",address:""},
  {id:"ct110",name:"Granny Murray Schools",phone:"08056011874",email:"",address:""},
  {id:"ct111",name:"Grant Ukaegbu",phone:"08166041539",email:"",address:""},
  {id:"ct112",name:"Gwarimpa",phone:"",email:"",address:""},
  {id:"ct113",name:"Hajia",phone:"",email:"",address:""},
  {id:"ct114",name:"Hajia Aisha Ismaila",phone:"",email:"",address:""},
  {id:"ct115",name:"Hajia Amina",phone:"09071479143",email:"",address:""},
  {id:"ct116",name:"Hajia Asabe",phone:"",email:"",address:""},
  {id:"ct117",name:"Hajia Bala",phone:"",email:"",address:""},
  {id:"ct118",name:"Hajia Bilkis",phone:"08033337517",email:"",address:""},
  {id:"ct119",name:"Hajia. Maryam",phone:"08161621303",email:"",address:""},
  {id:"ct120",name:"Hajiya Fatima",phone:"",email:"",address:""},
  {id:"ct121",name:"Hajiya Umma",phone:"08033033693",email:"",address:""},
  {id:"ct122",name:"Hajiya Zulaihat Muhammad",phone:"",email:"",address:""},
  {id:"ct123",name:"Hamid Academy,  Gwarimpa",phone:"",email:"",address:""},
  {id:"ct124",name:"Hamza Abdulahi Close in Asokoro",phone:"",email:"",address:""},
  {id:"ct125",name:"Hausba Smarthomes Limited",phone:"",email:"",address:""},
  {id:"ct126",name:"Head People and Culture,",phone:"07033468801",email:"",address:""},
  {id:"ct127",name:"Health Communication Capacity Collaborative",phone:"",email:"",address:""},
  {id:"ct128",name:"High Chief Igho Osiebe",phone:"",email:"",address:""},
  {id:"ct129",name:"House 10, 444 Crescent, citec villas, Gwarinpa",phone:"",email:"",address:""},
  {id:"ct130",name:"House 29, Aso garden estate, Maitama, Abuja",phone:"",email:"",address:""},
  {id:"ct131",name:"House 2, no 4 umar abubakar crescent, katampe extension",phone:"",email:"",address:""},
  {id:"ct132",name:"House A14 unit5 brains and hammers city lifecamp extension.",phone:"",email:"",address:""},
  {id:"ct133",name:"HSF Foods Limited",phone:"07033468801",email:"",address:""},
  {id:"ct134",name:"Human resources, Jb",phone:"",email:"",address:""},
  {id:"ct135",name:"Human resources manager, Jb Nig Ltd",phone:"",email:"",address:""},
  {id:"ct136",name:"Human resources manager, Jubailibros Ng Ltd",phone:"",email:"",address:""},
  {id:"ct137",name:"IMZA Nigeria",phone:"",email:"",address:""},
  {id:"ct138",name:"Inabeto22@gmail.com",phone:"",email:"",address:""},
  {id:"ct139",name:"International Federation of Red Cross and Red Crescent Societies (IFRC)",phone:"08173333093",email:"Fatima.ATSENOKHAI@ifrc.org",address:""},
  {id:"ct140",name:"International Medical Corps",phone:"",email:"",address:""},
  {id:"ct141",name:"IOM",phone:"",email:"",address:""},
  {id:"ct142",name:"Iraq Embassy",phone:"",email:"",address:""},
  {id:"ct143",name:"Isaac Bako",phone:"",email:"",address:""},
  {id:"ct144",name:"ISN Clinic (ISN MEDICAL LTD)",phone:"",email:"",address:""},
  {id:"ct145",name:"ISN Medical",phone:"",email:"",address:""},
  {id:"ct146",name:"ISN MEDICAL LTD",phone:"",email:"",address:""},
  {id:"ct147",name:"itsupport@izyair.com",phone:"",email:"",address:""},
  {id:"ct148",name:"Jabi Apartment",phone:"",email:"",address:""},
  {id:"ct149",name:"Jade",phone:"",email:"",address:""},
  {id:"ct150",name:"James Kalu",phone:"",email:"",address:""},
  {id:"ct151",name:"Jamy563",phone:"08096667218",email:"",address:""},
  {id:"ct152",name:"Janitorial services",phone:"",email:"",address:""},
  {id:"ct153",name:"Jayne Achea",phone:"09087503533",email:"",address:""},
  {id:"ct154",name:"Jimaj Energy Services Ltd",phone:"",email:"",address:""},
  {id:"ct155",name:"Joannajames102@gmail.com",phone:"",email:"",address:""},
  {id:"ct156",name:"John Apeh",phone:"",email:"",address:""},
  {id:"ct157",name:"Johnbosco",phone:"",email:"",address:""},
  {id:"ct158",name:"JSI",phone:"",email:"",address:""},
  {id:"ct159",name:"Juggernaut industries",phone:"",email:"",address:""},
  {id:"ct160",name:"Justice Abdulmalik",phone:"08039430004",email:"",address:""},
  {id:"ct161",name:"Justice Goodluck",phone:"08106359316",email:"",address:""},
  {id:"ct162",name:"Juwairiyyamangal@yahoo.com",phone:"",email:"",address:""},
  {id:"ct163",name:"Kachi Ike",phone:"09165232471",email:"",address:""},
  {id:"ct164",name:"Kado mall",phone:"",email:"",address:""},
  {id:"ct165",name:"Katampe",phone:"",email:"",address:""},
  {id:"ct166",name:"Kinderbloom Daycare & Pre-School",phone:"08035006597",email:"",address:""},
  {id:"ct167",name:"kureen services",phone:"",email:"",address:""},
  {id:"ct168",name:"Kwik Delivery",phone:"",email:"",address:""},
  {id:"ct169",name:"Ladi mall",phone:"",email:"",address:""},
  {id:"ct170",name:"La Famosa",phone:"09031247336",email:"",address:""},
  {id:"ct171",name:"LEAP Africa",phone:"",email:"",address:""},
  {id:"ct172",name:"Life camp",phone:"",email:"",address:""},
  {id:"ct173",name:"Lifestyle at Topp",phone:"",email:"",address:""},
  {id:"ct174",name:"Lugbe Rest House",phone:"",email:"",address:""},
  {id:"ct175",name:"LUKMAN OYEBANJI FAGBEMI",phone:"",email:"",address:""},
  {id:"ct176",name:"LUMOS",phone:"09062275474",email:"",address:""},
  {id:"ct177",name:"Mabuchi home",phone:"",email:"",address:""},
  {id:"ct178",name:"Madam Chinic",phone:"08037861143",email:"",address:""},
  {id:"ct179",name:"Madam Fatima",phone:"08034594888",email:"",address:""},
  {id:"ct180",name:"Madam Maureen",phone:"07051217081",email:"",address:""},
  {id:"ct181",name:"mailto:fed4mail@yahoo.com",phone:"",email:"",address:""},
  {id:"ct182",name:"Maitama",phone:"",email:"",address:""},
  {id:"ct183",name:"Malaria Consortium",phone:"",email:"",address:""},
  {id:"ct184",name:"Malaria Consortium Nigeria",phone:"",email:"",address:""},
  {id:"ct185",name:"Managing Director",phone:"",email:"",address:""},
  {id:"ct186",name:"Marvis",phone:"09011039271",email:"",address:""},
  {id:"ct187",name:"Meldaine2004@yahoo.com",phone:"",email:"",address:""},
  {id:"ct188",name:"MEXAN Nigeria Limited",phone:"",email:"",address:""},
  {id:"ct189",name:"MGIC",phone:"",email:"",address:""},
  {id:"ct190",name:"Mini-Mac Limited",phone:"",email:"",address:""},
  {id:"ct191",name:"Miss Fatima",phone:"",email:"",address:""},
  {id:"ct192",name:"Miss Oghenero",phone:"",email:"",address:""},
  {id:"ct193",name:"Miss Stephanie",phone:"",email:"",address:""},
  {id:"ct194",name:"Miss Victoria",phone:"",email:"",address:""},
  {id:"ct195",name:"M.O.",phone:"09022130096",email:"",address:""},
  {id:"ct196",name:"Mobus Property",phone:"",email:"akeem.ibitoye@mobusproperty.com",address:""},
  {id:"ct197",name:"Mohammed Hayatu",phone:"07033760877",email:"",address:""},
  {id:"ct198",name:"Mordel primary sch federal housing estate",phone:"",email:"",address:""},
  {id:"ct199",name:"Mr.",phone:"08091303764",email:"",address:""},
  {id:"ct200",name:"Mr. Abba",phone:"08033727977",email:"",address:""},
  {id:"ct201",name:"Mr Abdul",phone:"08023153475",email:"",address:""},
  {id:"ct202",name:"Mr. Abdulateef",phone:"08137823363",email:"",address:""},
  {id:"ct203",name:"Mr. Abdulhameed Mohammed",phone:"08035935082",email:"",address:""},
  {id:"ct204",name:"Mr Abraham",phone:"08131858898",email:"",address:""},
  {id:"ct205",name:"Mr. Abubakar",phone:"",email:"",address:""},
  {id:"ct206",name:"Mr. Abubakar Ibrahim",phone:"08181400009",email:"",address:""},
  {id:"ct207",name:"Mr. Adebayo Agboola",phone:"08179479908",email:"",address:""},
  {id:"ct208",name:"Mr. Adegbite Oladotun",phone:"07038789278",email:"",address:""},
  {id:"ct209",name:"Mr Ahmed",phone:"08033579927",email:"",address:""},
  {id:"ct210",name:"Mr. Ahmed",phone:"08138603403",email:"",address:""},
  {id:"ct211",name:"Mr Alex",phone:"08032564716",email:"",address:""},
  {id:"ct212",name:"Mr. Aliyu",phone:"07054352988",email:"",address:""},
  {id:"ct213",name:"Mr A. Momoh",phone:"08039110701",email:"",address:""},
  {id:"ct214",name:"Mr.  Anaekwe",phone:"08136694588",email:"",address:""},
  {id:"ct215",name:"Mr. Asuk",phone:"",email:"",address:""},
  {id:"ct216",name:"Mr. Austin fanus",phone:"",email:"",address:""},
  {id:"ct217",name:"Mr Awogbemi",phone:"09065634868",email:"",address:""},
  {id:"ct218",name:"Mr. Azubuike",phone:"08165594778",email:"",address:""},
  {id:"ct219",name:"Mr. Babatunde Anwo-Ade",phone:"08094206060",email:"",address:""},
  {id:"ct220",name:"Mr. Bello",phone:"",email:"",address:""},
  {id:"ct221",name:"Mr. Bigs",phone:"",email:"",address:""},
  {id:"ct222",name:"Mr Bimbo",phone:"08183133433",email:"",address:""},
  {id:"ct223",name:"Mr Bisi",phone:"",email:"",address:""},
  {id:"ct224",name:"Mr. Buhari",phone:"08092000115",email:"",address:""},
  {id:"ct225",name:"Mr Bukar",phone:"08036365141",email:"",address:""},
  {id:"ct226",name:"Mr Charles",phone:"",email:"",address:""},
  {id:"ct227",name:"Mr. Charles",phone:"971567014221",email:"",address:""},
  {id:"ct228",name:"Mr. Chidi Momah",phone:"08037543051",email:"",address:""},
  {id:"ct229",name:"Mr Chris",phone:"",email:"",address:""},
  {id:"ct230",name:"Mr. Chris",phone:"",email:"",address:""},
  {id:"ct231",name:"Mr Chukwudi",phone:"07035366460",email:"",address:""},
  {id:"ct232",name:"Mr. Clement Erohubie",phone:"",email:"",address:""},
  {id:"ct233",name:"Mr Clint",phone:"",email:"",address:""},
  {id:"ct234",name:"Mr. Dakpokpo",phone:"",email:"",address:""},
  {id:"ct235",name:"Mr. Daniel",phone:"",email:"",address:""},
  {id:"ct236",name:"Mr. Dimeji Durojaiye",phone:"",email:"",address:""},
  {id:"ct237",name:"Mr. Doja",phone:"08036891214",email:"",address:""},
  {id:"ct238",name:"Mr. Douglas",phone:"08022011518",email:"",address:"Arab Road, Abuja"},
  {id:"ct239",name:"Mr. Dupe Omotosho",phone:"08093201650",email:"",address:""},
  {id:"ct240",name:"Mr. Emanuel",phone:"",email:"",address:""},
  {id:"ct241",name:"Mr Emeka",phone:"07051311239",email:"",address:""},
  {id:"ct242",name:"Mr. Emeka",phone:"08136694588",email:"",address:""},
  {id:"ct243",name:"Mr. Emmanuel",phone:"",email:"",address:""},
  {id:"ct244",name:"Mr Emmanuel Adams",phone:"07089450103",email:"",address:""},
  {id:"ct245",name:"Mr. Eric",phone:"",email:"",address:""},
  {id:"ct246",name:"Mr. Everest",phone:"",email:"",address:""},
  {id:"ct247",name:"Mr. Ezekwesiri Imo",phone:"",email:"",address:""},
  {id:"ct248",name:"Mr Fadipe Oluwafemi",phone:"",email:"",address:""},
  {id:"ct249",name:"Mr. Falujo",phone:"",email:"",address:""},
  {id:"ct250",name:"Mr. Farouk",phone:"",email:"",address:""},
  {id:"ct251",name:"Mr. Femi",phone:"",email:"",address:""},
  {id:"ct252",name:"Mr. Frank",phone:"",email:"",address:""},
  {id:"ct253",name:"Mr. Gabriel Adetula",phone:"09165065795",email:"",address:""},
  {id:"ct254",name:"Mr. Godson",phone:"08033729675",email:"",address:""},
  {id:"ct255",name:"Mr. Handel",phone:"07018197952",email:"",address:""},
  {id:"ct256",name:"Mr Hassan",phone:"08060652844",email:"",address:""},
  {id:"ct257",name:"Mr Henry",phone:"08186024347",email:"",address:""},
  {id:"ct258",name:"Mr. Henry",phone:"08146637580",email:"",address:""},
  {id:"ct259",name:"Mr Henry Emembolu",phone:"08138264048",email:"",address:""},
  {id:"ct260",name:"Mr. Hope Edobor",phone:"09030001393",email:"",address:""},
  {id:"ct261",name:"Mr. Ibe Osonwa",phone:"",email:"",address:""},
  {id:"ct262",name:"Mr Idris",phone:"08035349090",email:"",address:""},
  {id:"ct263",name:"Mr Ifeanyi",phone:"09071504450",email:"",address:""},
  {id:"ct264",name:"Mr. Ikenna",phone:"",email:"",address:""},
  {id:"ct265",name:"Mr. James",phone:"",email:"",address:""},
  {id:"ct266",name:"Mr. John",phone:"",email:"",address:""},
  {id:"ct267",name:"Mr. Johnbosco",phone:"",email:"",address:""},
  {id:"ct268",name:"Mr. Joshua",phone:"",email:"",address:""},
  {id:"ct269",name:"Mr. Justin",phone:"07062213830",email:"",address:""},
  {id:"ct270",name:"Mr. Kabiru Usman",phone:"08036734428",email:"",address:""},
  {id:"ct271",name:"Mr. Ken",phone:"",email:"",address:""},
  {id:"ct272",name:"Mr. Kolawole",phone:"",email:"",address:""},
  {id:"ct273",name:"Mr Lawal",phone:"08032031867",email:"",address:""},
  {id:"ct274",name:"Mr. Lawrence",phone:"08094546479",email:"",address:""},
  {id:"ct275",name:"Mr. Leslie",phone:"",email:"",address:""},
  {id:"ct276",name:"Mr. Machinizzy",phone:"",email:"",address:""},
  {id:"ct277",name:"Mr. Madichie",phone:"",email:"",address:""},
  {id:"ct278",name:"Mr Malik",phone:"09090512400",email:"",address:""},
  {id:"ct279",name:"Mr. Mark",phone:"08052726240",email:"",address:""},
  {id:"ct280",name:"Mr. Melvin",phone:"08174623265",email:"",address:""},
  {id:"ct281",name:"Mr. Mohammad",phone:"",email:"",address:""},
  {id:"ct282",name:"Mr. Mohammed Babandede",phone:"08095043470",email:"",address:""},
  {id:"ct283",name:"Mr. Moses",phone:"",email:"",address:""},
  {id:"ct284",name:"Mr. Moyo",phone:"08069153347",email:"",address:""},
  {id:"ct285",name:"Mr. & Mrs. Adams",phone:"",email:"",address:""},
  {id:"ct286",name:"Mr & Mrs Idemudia",phone:"08037036334",email:"",address:""},
  {id:"ct287",name:"Mr. Muhammed",phone:"09039711162",email:"",address:""},
  {id:"ct288",name:"Mr. Musa",phone:"",email:"",address:""},
  {id:"ct289",name:"Mr. Mustapha",phone:"08183468638",email:"",address:""},
  {id:"ct290",name:"Mr. Niyi",phone:"08133330699",email:"",address:""},
  {id:"ct291",name:"Mr. Niyi Afolabi",phone:"",email:"",address:""},
  {id:"ct292",name:"Mr. Noel",phone:"08026116113",email:"",address:""},
  {id:"ct293",name:"Mr. Nwokolo",phone:"",email:"",address:""},
  {id:"ct294",name:"Mr Nwokoro",phone:"",email:"",address:""},
  {id:"ct295",name:"Mr. Obum",phone:"08033547085",email:"",address:""},
  {id:"ct296",name:"Mr. Oche Gabriel",phone:"08142796764",email:"",address:""},
  {id:"ct297",name:"Mr. Odimegwu",phone:"",email:"",address:""},
  {id:"ct298",name:"Mr. Oko Justin Odama",phone:"07062213830",email:"okojustin@aol.com",address:""},
  {id:"ct299",name:"Mr. Okpara Elvis",phone:"",email:"",address:""},
  {id:"ct300",name:"Mr.Olajide Sunday",phone:"",email:"",address:""},
  {id:"ct301",name:"Mr.onafalujo",phone:"",email:"",address:""},
  {id:"ct302",name:"Mr Onafalujo",phone:"",email:"",address:""},
  {id:"ct303",name:"Mr Onoja",phone:"",email:"",address:""},
  {id:"ct304",name:"Mr. Onyekachi",phone:"",email:"",address:""},
  {id:"ct305",name:"Mr. Onyenweaku",phone:"09031744849",email:"",address:""},
  {id:"ct306",name:"Mr. Ovie",phone:"",email:"",address:""},
  {id:"ct307",name:"Mr Owen",phone:"08099066988",email:"",address:""},
  {id:"ct308",name:"Mr Oyetunji",phone:"08053031592",email:"",address:""},
  {id:"ct309",name:"Mr Peter",phone:"08063841691",email:"",address:""},
  {id:"ct310",name:"Mr. Prudence",phone:"08180851471",email:"",address:""},
  {id:"ct311",name:"Mrs Abiri",phone:"08033101199",email:"",address:""},
  {id:"ct312",name:"Mrs. Aboki Fatima",phone:"08034795456",email:"",address:""},
  {id:"ct313",name:"Mrs. Afolabi",phone:"08032865909",email:"",address:""},
  {id:"ct314",name:"Mrs Ajayi",phone:"07041212351",email:"",address:""},
  {id:"ct315",name:"Mr. Sam",phone:"",email:"",address:""},
  {id:"ct316",name:"Mrs. Ameerah Umar K.",phone:"08133603709",email:"",address:""},
  {id:"ct317",name:"Mr. Samuel Akinola",phone:"",email:"",address:""},
  {id:"ct318",name:"Mr. Sani",phone:"08031824088",email:"",address:""},
  {id:"ct319",name:"Mr. Sanumy",phone:"",email:"",address:""},
  {id:"ct320",name:"Mrs. Asuk",phone:"",email:"",address:""},
  {id:"ct321",name:"Mrs Awunah",phone:"08035336027",email:"",address:""},
  {id:"ct322",name:"Mrs. Ayesha",phone:"",email:"",address:""},
  {id:"ct323",name:"Mrs Bello",phone:"08036226657",email:"",address:""},
  {id:"ct324",name:"Mrs Bibogha",phone:"",email:"",address:""},
  {id:"ct325",name:"Mrs Ebika",phone:"",email:"",address:""},
  {id:"ct326",name:"Mrs.Ebika",phone:"",email:"",address:""},
  {id:"ct327",name:"Mrs Eboh",phone:"09027000077",email:"",address:""},
  {id:"ct328",name:"Mr. Segun Salami",phone:"08035899562",email:"",address:""},
  {id:"ct329",name:"Mrs. Elisabeth",phone:"",email:"",address:""},
  {id:"ct330",name:"Mr. Seun",phone:"",email:"",address:""},
  {id:"ct331",name:"Mrs.  Evbuomwan",phone:"08033761999",email:"",address:""},
  {id:"ct332",name:"Mr. Seyi",phone:"08180974245",email:"",address:""},
  {id:"ct333",name:"Mrs. Ezeh",phone:"",email:"",address:""},
  {id:"ct334",name:"Mrs. Fatima",phone:"",email:"",address:""},
  {id:"ct335",name:"Mrs. Fauziah Tukur",phone:"",email:"",address:""},
  {id:"ct336",name:"Mrs. Francis",phone:"08035311130",email:"",address:""},
  {id:"ct337",name:"Mrs Garba",phone:"",email:"",address:""},
  {id:"ct338",name:"Mr Sharon",phone:"07089432537",email:"",address:""},
  {id:"ct339",name:"Mr. Sheriff",phone:"",email:"",address:""},
  {id:"ct340",name:"Mr. Shuaibu",phone:"08065305090",email:"",address:""},
  {id:"ct341",name:"Mrs Hurera H",phone:"",email:"",address:""},
  {id:"ct342",name:"Mrs Ijeoma Ohiembor",phone:"08038775985",email:"",address:""},
  {id:"ct343",name:"Mr. Simon",phone:"",email:"",address:""},
  {id:"ct344",name:"Mrs. Isaac",phone:"",email:"",address:""},
  {id:"ct345",name:"Mrs. Jemila",phone:"08091926888",email:"",address:""},
  {id:"ct346",name:"Mrs Josephine",phone:"",email:"",address:""},
  {id:"ct347",name:"Mrs Josephine Ikem Kwalli",phone:"",email:"",address:""},
  {id:"ct348",name:"Mrs. Lamar",phone:"",email:"",address:""},
  {id:"ct349",name:"Mrs. Linda Cyril",phone:"08092957295",email:"",address:""},
  {id:"ct350",name:"Mrs. Makonjola",phone:"",email:"",address:""},
  {id:"ct351",name:"Mrs Martina Oko",phone:"08032111311",email:"",address:""},
  {id:"ct352",name:"Mrs. Moji",phone:"",email:"",address:""},
  {id:"ct353",name:"Mrs. Musa",phone:"",email:"",address:""},
  {id:"ct354",name:"Mrs Ngozi",phone:"07034172922",email:"",address:"T4016 phase 2, Brains and Hammers Estate,, Abuja, FCT"},
  {id:"ct355",name:"Mrs Nnam. E. C.",phone:"08066777046",email:"",address:""},
  {id:"ct356",name:"Mrs Nneka Obiamalu",phone:"08080880501",email:"",address:""},
  {id:"ct357",name:"Mrs Obasi",phone:"08034172464",email:"",address:""},
  {id:"ct358",name:"Mrs Odia",phone:"08182851237",email:"",address:""},
  {id:"ct359",name:"Mrs. Ogirima",phone:"",email:"",address:""},
  {id:"ct360",name:"Mrs Ogundipe",phone:"",email:"",address:""},
  {id:"ct361",name:"Mrs Ohakwe",phone:"07031034067",email:"",address:""},
  {id:"ct362",name:"Mrs. Olere",phone:"",email:"",address:""},
  {id:"ct363",name:"Mrs Olu",phone:"09064439477",email:"",address:""},
  {id:"ct364",name:"Mr. Som",phone:"",email:"",address:""},
  {id:"ct365",name:"Mrs Osuagwu",phone:"08035006597",email:"",address:""},
  {id:"ct366",name:"Mrs. Peters",phone:"08101484270",email:"",address:""},
  {id:"ct367",name:"Mrs Rukiyat",phone:"",email:"",address:""},
  {id:"ct368",name:"Mrs Uchenna-Festus",phone:"08036671878",email:"",address:""},
  {id:"ct369",name:"Mr. Suleiman",phone:"08069323139",email:"",address:""},
  {id:"ct370",name:"Mrs. Uzan",phone:"",email:"",address:""},
  {id:"ct371",name:"Mrs. Zainab",phone:"",email:"",address:""},
  {id:"ct372",name:"Mr. Teru",phone:"",email:"",address:""},
  {id:"ct373",name:"Mr. Theophilus Apere",phone:"",email:"",address:""},
  {id:"ct374",name:"Mr Tijjani",phone:"07051032866",email:"",address:""},
  {id:"ct375",name:"Mr Tijjani Abdullahi",phone:"09138888511",email:"",address:""},
  {id:"ct376",name:"Mr. Timothy",phone:"",email:"",address:""},
  {id:"ct377",name:"Mr. Tobi .O",phone:"",email:"",address:""},
  {id:"ct378",name:"Mr. Tommy",phone:"08033896862",email:"",address:""},
  {id:"ct379",name:"Mr. Tony",phone:"08102770777",email:"",address:""},
  {id:"ct380",name:"Mr. Tope",phone:"08183752078",email:"",address:""},
  {id:"ct381",name:"Mr. Tunde",phone:"",email:"",address:""},
  {id:"ct382",name:"Mr. Tundea",phone:"08070984309",email:"",address:""},
  {id:"ct383",name:"Mr. Umar",phone:"08088954347",email:"",address:""},
  {id:"ct384",name:"Mr. Valentine",phone:"",email:"",address:""},
  {id:"ct385",name:"Mr. Waziri",phone:"09066923692",email:"",address:""},
  {id:"ct386",name:"Mr. Wills",phone:"09096717000",email:"",address:""},
  {id:"ct387",name:"Mr Willy",phone:"08033057698",email:"",address:""},
  {id:"ct388",name:"Mr Wilson",phone:"08035799339",email:"",address:""},
  {id:"ct389",name:"Mr. Yomi",phone:"08107709971",email:"",address:""},
  {id:"ct390",name:"Ms. Adana",phone:"08127392222",email:"",address:""},
  {id:"ct391",name:"Ms Adaobi",phone:"08037767443",email:"",address:""},
  {id:"ct392",name:"Ms. Adaora Ikenze.",phone:"09037753089",email:"",address:""},
  {id:"ct393",name:"Ms Adebola",phone:"09068490709",email:"",address:""},
  {id:"ct394",name:"Ms Adedami",phone:"08023616681",email:"",address:""},
  {id:"ct395",name:"Ms Adepeju",phone:"",email:"",address:""},
  {id:"ct396",name:"Ms Aisha",phone:"08099889926",email:"",address:""},
  {id:"ct397",name:"Ms. Amaka",phone:"07069997026",email:"",address:""},
  {id:"ct398",name:"Ms. Amarachi",phone:"",email:"",address:""},
  {id:"ct399",name:"Ms. Angela",phone:"08076054625",email:"angieobaseki@gmail.com",address:""},
  {id:"ct400",name:"Ms. Annabelle",phone:"09011126821",email:"",address:""},
  {id:"ct401",name:"Ms Atongo",phone:"08036064458",email:"",address:""},
  {id:"ct402",name:"Ms. Blessing",phone:"",email:"",address:""},
  {id:"ct403",name:"Ms. Bolu Awesu",phone:"08127230649",email:"",address:""},
  {id:"ct404",name:"Ms. Boma",phone:"",email:"",address:""},
  {id:"ct405",name:"Ms.Bridget",phone:"",email:"",address:""},
  {id:"ct406",name:"Ms. Bridget",phone:"",email:"",address:""},
  {id:"ct407",name:"Ms Campbell",phone:"",email:"",address:""},
  {id:"ct408",name:"Ms Charity Mene",phone:"08033419519",email:"",address:""},
  {id:"ct409",name:"Ms. Chinemerem",phone:"08163932584",email:"",address:""},
  {id:"ct410",name:"Ms Chioma",phone:"08177922838",email:"",address:""},
  {id:"ct411",name:"Ms. Chioma",phone:"08038386610",email:"",address:""},
  {id:"ct412",name:"Ms. Comfort Lamptey",phone:"",email:"",address:""},
  {id:"ct413",name:"Ms. Dayo Akinmoyo",phone:"07064184034",email:"",address:""},
  {id:"ct414",name:"Ms Didun Hassan-Odukale",phone:"09083003415",email:"",address:""},
  {id:"ct415",name:"Ms Ekeyo",phone:"",email:"",address:""},
  {id:"ct416",name:"Ms. Elohor",phone:"08036512890",email:"",address:""},
  {id:"ct417",name:"Ms Ene",phone:"08066189718",email:"",address:""},
  {id:"ct418",name:"Ms. Farida",phone:"07032098960",email:"",address:""},
  {id:"ct419",name:"Ms. Fatima Atsenokhai",phone:"08173333093",email:"",address:""},
  {id:"ct420",name:"Ms. Genevive",phone:"",email:"",address:""},
  {id:"ct421",name:"Ms Gift Nwanna",phone:"07056881075",email:"",address:""},
  {id:"ct422",name:"Ms. Goodness",phone:"09075200034",email:"",address:""},
  {id:"ct423",name:"Ms. Hadiza",phone:"08088805801",email:"",address:""},
  {id:"ct424",name:"Ms. Hafsah",phone:"",email:"",address:""},
  {id:"ct425",name:"Ms Hassah",phone:"",email:"",address:""},
  {id:"ct426",name:"Ms Hauwa",phone:"",email:"",address:""},
  {id:"ct427",name:"Ms. Hauwa",phone:"07019554923",email:"",address:""},
  {id:"ct428",name:"Ms. Ibrahim",phone:"08037329428",email:"",address:""},
  {id:"ct429",name:"Ms Ifeoma",phone:"",email:"",address:""},
  {id:"ct430",name:"Ms Ima",phone:"",email:"",address:""},
  {id:"ct431",name:"Ms. Itari Turner",phone:"08090980380",email:"",address:""},
  {id:"ct432",name:"Ms Ivie Bare",phone:"07081920799",email:"",address:""},
  {id:"ct433",name:"Ms. Jackie",phone:"",email:"",address:""},
  {id:"ct434",name:"Ms. Jane Ameh",phone:"07068216434",email:"",address:""},
  {id:"ct435",name:"Ms. Jennifer",phone:"08092957295",email:"",address:""},
  {id:"ct436",name:"Ms Jessica",phone:"09080338170",email:"",address:""},
  {id:"ct437",name:"Ms. Joan",phone:"08032543738",email:"",address:""},
  {id:"ct438",name:"Ms Josephine",phone:"",email:"",address:""},
  {id:"ct439",name:"Ms. Josephine",phone:"",email:"",address:""},
  {id:"ct440",name:"Ms. Juliet",phone:"",email:"",address:""},
  {id:"ct441",name:"Ms. Konye",phone:"08132538402",email:"",address:""},
  {id:"ct442",name:"Ms Lawal",phone:"",email:"",address:""},
  {id:"ct443",name:"Ms Lolia Wilcox",phone:"08090240188",email:"",address:""},
  {id:"ct444",name:"Ms. Lotenne",phone:"",email:"",address:""},
  {id:"ct445",name:"Ms. Love",phone:"",email:"",address:""},
  {id:"ct446",name:"Ms. Maimouna Tall",phone:"",email:"",address:""},
  {id:"ct447",name:"Ms. Martha",phone:"",email:"",address:""},
  {id:"ct448",name:"Ms Marvelous",phone:"",email:"",address:""},
  {id:"ct449",name:"Ms. Muneerah",phone:"447511465885",email:"",address:""},
  {id:"ct450",name:"Ms. Naima",phone:"",email:"",address:""},
  {id:"ct451",name:"Ms Nnedinma",phone:"",email:"",address:""},
  {id:"ct452",name:"Ms Onyinye",phone:"",email:"",address:""},
  {id:"ct453",name:"Ms Patience",phone:"08056271299",email:"",address:""},
  {id:"ct454",name:"Ms Precious Adigwe",phone:"08168551708",email:"",address:""},
  {id:"ct455",name:"Ms. Priscilla G",phone:"",email:"",address:""},
  {id:"ct456",name:"Ms. Priscilla",phone:"",email:"",address:""},
  {id:"ct457",name:"Ms. Rachael Pindar",phone:"08104775606",email:"",address:""},
  {id:"ct458",name:"Ms. Sakina",phone:"",email:"",address:""},
  {id:"ct459",name:"Ms Sana",phone:"",email:"",address:""},
  {id:"ct460",name:"Ms. Sara .O",phone:"",email:"",address:""},
  {id:"ct461",name:"Ms. Sharon Dada",phone:"",email:"",address:""},
  {id:"ct462",name:"Ms Shehu",phone:"",email:"",address:""},
  {id:"ct463",name:"Ms Sheila",phone:"08064866387",email:"",address:""},
  {id:"ct464",name:"Ms. Sonia Agu",phone:"09165080531",email:"",address:""},
  {id:"ct465",name:"Ms Sonnia",phone:"08176501411",email:"",address:""},
  {id:"ct466",name:"Ms. Stephanie L.E.",phone:"08098333783",email:"",address:""},
  {id:"ct467",name:"Ms. Stephenie",phone:"",email:"",address:""},
  {id:"ct468",name:"Ms Temitope",phone:"08055348285",email:"",address:""},
  {id:"ct469",name:"Ms. Vanessa",phone:"08164145041",email:"",address:""},
  {id:"ct470",name:"Ms Venessa",phone:"",email:"",address:""},
  {id:"ct471",name:"Ms. Vivian",phone:"",email:"",address:""},
  {id:"ct472",name:"Ms. Yvonne",phone:"08073356284",email:"",address:""},
  {id:"ct473",name:"Ms. Zahra",phone:"07019461900",email:"",address:""},
  {id:"ct474",name:"Ms zarah",phone:"",email:"",address:""},
  {id:"ct475",name:"Ms Zinatu Ahmad",phone:"",email:"",address:""},
  {id:"ct476",name:"Mubarak Aboki",phone:"08035579333",email:"",address:""},
  {id:"ct477",name:"M.U. Fulani",phone:"08058743429",email:"",address:""},
  {id:"ct478",name:"Muhammad Salisu Barde",phone:"",email:"",address:""},
  {id:"ct479",name:"NAF conference Centre",phone:"",email:"",address:""},
  {id:"ct480",name:"Nengi\'s Place Restaurant",phone:"09096717000",email:"",address:""},
  {id:"ct481",name:"Nigeria Security and Civil Defence Corps",phone:"",email:"",address:""},
  {id:"ct482",name:"Nigeria Sovereign Investment Authority",phone:"099040035",email:"",address:""},
  {id:"ct483",name:"Nigeria Tennis Federation",phone:"",email:"",address:""},
  {id:"ct484",name:"Nigeria Tulip international Colleges",phone:"09099150025",email:"",address:""},
  {id:"ct485",name:"Nikon Grand Hotel",phone:"",email:"",address:""},
  {id:"ct486",name:"Nippon Grand Hotel",phone:"",email:"",address:""},
  {id:"ct487",name:"Nixon",phone:"",email:"",address:""},
  {id:"ct488",name:"No 19, Ebitu Ukiwe Street Jahi.",phone:"",email:"",address:""},
  {id:"ct489",name:"No 35 burnin kebbi crescent garki",phone:"",email:"",address:""},
  {id:"ct490",name:"No 3,Teal lane  Bilaad estate wuye.",phone:"",email:"",address:""},
  {id:"ct491",name:"No 4, Teal Lane Bilaad Estate (next to Wuye Police Station) 547, Ameh Ebute Street, Wuye, Abuja",phone:"",email:"",address:""},
  {id:"ct492",name:"Ntel",phone:"",email:"",address:""},
  {id:"ct493",name:"Ntel Nig",phone:"",email:"",address:""},
  {id:"ct494",name:"Obiageli",phone:"",email:"",address:""},
  {id:"ct495",name:"Ochacho Empire Otukpo",phone:"",email:"",address:""},
  {id:"ct496",name:"Ochacho Estate",phone:"",email:"",address:""},
  {id:"ct497",name:"ONEPRO",phone:"08065683084",email:"",address:""},
  {id:"ct498",name:"Opique center",phone:"",email:"",address:""},
  {id:"ct499",name:"Otunba Olalekan UHMS",phone:"07048528790",email:"",address:""},
  {id:"ct500",name:"Oxfam International",phone:"",email:"",address:""},
  {id:"ct501",name:"PAGMI Office",phone:"",email:"",address:""},
  {id:"ct502",name:"Park Hill center, Gwarimpa.",phone:"",email:"",address:""},
  {id:"ct503",name:"Peacock House",phone:"",email:"",address:""},
  {id:"ct504",name:"Pelta Spa and Beauty Salon",phone:"07062517440",email:"",address:""},
  {id:"ct505",name:"Pengasin 1 estate road 4 house no 3",phone:"",email:"",address:""},
  {id:"ct506",name:"Person",phone:"08033117414",email:"",address:""},
  {id:"ct507",name:"Plot 182, John oyegun-odigie street, off Paul odili street, River park estate",phone:"",email:"",address:""},
  {id:"ct508",name:"Plot B 847 Lodgiani",phone:"",email:"",address:""},
  {id:"ct509",name:"Police Service Commission",phone:"",email:"",address:""},
  {id:"ct510",name:"Project Manager",phone:"",email:"",address:""},
  {id:"ct511",name:"PYRICH GROUP LTD",phone:"",email:"",address:""},
  {id:"ct512",name:"Raclyde",phone:"",email:"",address:""},
  {id:"ct513",name:"Rayan kcc",phone:"",email:"",address:""},
  {id:"ct514",name:"RCCG Grace Arena",phone:"",email:"",address:""},
  {id:"ct515",name:"Redeemed Christian Church of God",phone:"",email:"",address:""},
  {id:"ct516",name:"Regal avenue africa",phone:"",email:"",address:""},
  {id:"ct517",name:"River Park",phone:"",email:"",address:""},
  {id:"ct518",name:"River park estate",phone:"",email:"",address:""},
  {id:"ct519",name:"Rodo",phone:"",email:"",address:""},
  {id:"ct520",name:"rofasy nigeria ltd",phone:"",email:"",address:""},
  {id:"ct521",name:"Rolling Bricks Ltd",phone:"07067167383",email:"",address:""},
  {id:"ct522",name:"Rose Valley Group",phone:"",email:"",address:""},
  {id:"ct523",name:"RTIE Wash",phone:"",email:"",address:""},
  {id:"ct524",name:"Ryussi Synergy Limited",phone:"08036359243",email:"",address:""},
  {id:"ct525",name:"RYUSSI SYNERGY LTD",phone:"08036359243",email:"",address:""},
  {id:"ct526",name:"Sady Ahmed",phone:"",email:"",address:""},
  {id:"ct527",name:"Sam and Shade Gara",phone:"08035892150",email:"",address:""},
  {id:"ct528",name:"SED Ltd",phone:"",email:"",address:""},
  {id:"ct529",name:"Senator Dada Gbolahan",phone:"08023059905",email:"",address:""},
  {id:"ct530",name:"Sheikh Hayatuddeen",phone:"",email:"",address:""},
  {id:"ct531",name:"Sheikh Ibrahim",phone:"08035863915",email:"",address:""},
  {id:"ct532",name:"SHELTER AFRIQUE",phone:"",email:"",address:""},
  {id:"ct533",name:"Simba group",phone:"",email:"",address:""},
  {id:"ct534",name:"Skin 101",phone:"",email:"",address:""},
  {id:"ct535",name:"SKIN101",phone:"",email:"",address:""},
  {id:"ct536",name:"Skin 101 Clinics Ltd.",phone:"",email:"",address:""},
  {id:"ct537",name:"SKINTIVITY SKINCARE & MEDSPA",phone:"",email:"",address:""},
  {id:"ct538",name:"SLN ltd",phone:"",email:"",address:""},
  {id:"ct539",name:"South African High Commission",phone:"07031533362",email:"",address:""},
  {id:"ct540",name:"Sparkles Apartments Limited",phone:"08062332639",email:"sparklesapartments@gmail.com",address:""},
  {id:"ct541",name:"Specifics Lounge",phone:"09024152061",email:"",address:""},
  {id:"ct542",name:"st4ifnwachukwu@gmail.com",phone:"",email:"",address:""},
  {id:"ct543",name:"Stacy",phone:"09099650704",email:"",address:""},
  {id:"ct544",name:"Stanley Oranika",phone:"07031840000",email:"",address:""},
  {id:"ct545",name:"Starview Palace Hotel",phone:"",email:"",address:""},
  {id:"ct546",name:"stefshady@gmail.com",phone:"",email:"",address:""},
  {id:"ct547",name:"Suncity Estate",phone:"",email:"",address:""},
  {id:"ct548",name:"Surgical Aid Foundation",phone:"09077172352",email:"",address:""},
  {id:"ct549",name:"Takumi Towers estate",phone:"",email:"",address:""},
  {id:"ct550",name:"Tanzania High Commission",phone:"",email:"",address:""},
  {id:"ct551",name:"Tarylliay",phone:"",email:"",address:""},
  {id:"ct552",name:"Taslima",phone:"08189316757",email:"",address:""},
  {id:"ct553",name:"Test Account",phone:"08065683084",email:"",address:""},
  {id:"ct554",name:"The address is as follows:  Glendale Place  Block E4  Plot BO3 Ghali Na\'aba Crescent, Wuye, Cadastral Zone, AMAC, Abuja",phone:"",email:"",address:""},
  {id:"ct555",name:"The adGlendale Place  Block E4  Plot BO3 Ghali Na\'aba Crescent, Wuye, Cadastral Zone, AMAC, Abuja",phone:"",email:"",address:""},
  {id:"ct556",name:"The Council Restaurant",phone:"",email:"",address:""},
  {id:"ct557",name:"The Fashion Academy",phone:"",email:"",address:""},
  {id:"ct558",name:"The name of the companyAerial Project Analytics Africa.",phone:"",email:"",address:""},
  {id:"ct559",name:"Thrive Agric",phone:"",email:"",address:""},
  {id:"ct560",name:"Torchmark Group of Company",phone:"",email:"",address:""},
  {id:"ct561",name:"Transcop",phone:"",email:"",address:""},
  {id:"ct562",name:"Triple 9 Apartments Spa Pool",phone:"",email:"",address:""},
  {id:"ct563",name:"Tropic Galleria",phone:"",email:"",address:""},
  {id:"ct564",name:"Turbham",phone:"07062011450",email:"",address:""},
  {id:"ct565",name:"Uboh Hotels and Resorts Ltd.",phone:"",email:"",address:""},
  {id:"ct566",name:"Uchechi Anyanwu",phone:"",email:"",address:""},
  {id:"ct567",name:"Uchenna Adibe",phone:"",email:"",address:""},
  {id:"ct568",name:"u.ebu@off-field.com",phone:"",email:"",address:""},
  {id:"ct569",name:"Ugochuku Ebu",phone:"08050610578",email:"",address:""},
  {id:"ct570",name:"Unique",phone:"",email:"",address:""},
  {id:"ct571",name:"Urban Rootz",phone:"09077777277",email:"",address:""},
  {id:"ct572",name:"VAL DE MAURIS ACADEMY",phone:"",email:"",address:""},
  {id:"ct573",name:"Vestates Ltd",phone:"",email:"",address:""},
  {id:"ct574",name:"VG-AMU Nig. Ltd",phone:"09052267280",email:"",address:""},
  {id:"ct575",name:"Victoria",phone:"",email:"",address:""},
  {id:"ct576",name:"Vinara Confectionaries Limited",phone:"",email:"",address:""},
  {id:"ct577",name:"Vinara confectionery",phone:"",email:"",address:""},
  {id:"ct578",name:"Vinee Gas Ltd",phone:"",email:"",address:""},
  {id:"ct579",name:"Viviyese Fashion School",phone:"08112034075",email:"",address:""},
  {id:"ct580",name:"Volunteer Service Organization",phone:"",email:"",address:""},
  {id:"ct581",name:"Vulcan suite",phone:"",email:"",address:""},
  {id:"ct582",name:"Wasia Africa Mining Co. Ltd",phone:"",email:"",address:""},
  {id:"ct583",name:"Wassail Group of Companies Ltd",phone:"",email:"",address:""},
  {id:"ct584",name:"Wingist restaurant and sports bar",phone:"",email:"",address:""},
  {id:"ct585",name:"Wragby Business Solutions and Tech Ltd.",phone:"08131301056",email:"",address:""},
  {id:"ct586",name:"Xplixit Architecture & Integrated Services",phone:"",email:"",address:""},
  {id:"ct587",name:"zagbonda@yahoo.com",phone:"",email:"",address:""},
  {id:"ct588",name:"Zayyad Mahmoud",phone:"",email:"",address:""},
  {id:"ct589",name:"Zuwere Muhammad",phone:"08160192428",email:"",address:""},
  {id:"ct590",name:"Dr. Linda",phone:"08137889141",email:"",address:"Abuja"},
  {id:"ct591",name:"Madam Fatima (Justice Abdulmalik)",phone:"08166292701",email:"",address:"Abuja"},
  {id:"ct592",name:"Mr. Chigboh",phone:"08064084006",email:"",address:"Katampe Extension, Abuja"},
  {id:"ct593",name:"Mr. Jafar",phone:"08035333050",email:"",address:"Abuja"},
  {id:"ct594",name:"Mrs Obisan",phone:"08036793087",email:"",address:"Guzape, Abuja"},
  {id:"ct595",name:"Ms. Angela Obaseki",phone:"08076054625",email:"Angieobaseki@gmail.com",address:"katampe Extension, Abuja"},
  {id:"ct596",name:"Ms. Nana",phone:"09072289658",email:"",address:"5 Ali A. Rabiu Street, Abuja"},
  {id:"ct597",name:"Ms. Stella",phone:"07063705214",email:"",address:"A Close, off 692 Road,, Abuja"},
  {id:"ct598",name:"Dr",phone:"09099140030",email:"",address:""},
  {id:"ct599",name:"Mr. Joshua Okodugha",phone:"08065672050",email:"j.okodugha@gmail.com",address:"Dawaki, Abuja"},
  {id:"ct600",name:"SYDANI GROUP",phone:"",email:"marcus.sule@sydani.org",address:"Plot 1422, Independence Avenue, Central Business District,, Abuja"},
  {id:"ct601",name:"Mr. Brown",phone:"08033107408",email:"",address:"B111 Copacabana Estate (near Doveland school), Abuja"},
  {id:"ct602",name:"Ultimate Health Management Services",phone:"07048528790",email:"",address:"Plot 1446, Tsukunda House, 4th Floor,, Abuja Federal Capital Territory"},
  {id:"ct603",name:"Mrs. Obisan",phone:"",email:"",address:""},
  {id:"ct604",name:"The Aesthetic Clinic, Abuja",phone:"09056304707",email:"",address:"36A Gnassingbe Eyadema Crescent, Asokoro, Abuja, Abuja Federal Capital Territory"},
  {id:"ct605",name:"BENARC Construction Limited",phone:"08066941728",email:"",address:"Abuja"},
  {id:"ct606",name:"Embassy of Sweden",phone:"07011979754",email:"",address:"41, T.Y. Danjuma Street, Abuja"},
  {id:"ct607",name:"Mrs. Nneka Obiamalu",phone:"08080880501",email:"",address:"17 Usan Street, Total Cooperative
Estate, Gaduwa, Abuja, Abuja Federal Capital Territory"},
  {id:"ct608",name:"Mrs. Miracle Okolo",phone:"08033344992",email:"",address:"No. 5, Ibrahim Bomai Street, Guzape, Abuja"},
  {id:"ct609",name:"Mr. Michael Aboh",phone:"",email:"",address:""},
  {id:"ct610",name:"Ms. Khareemah Kassim",phone:"",email:"",address:"Flat 6, Darik Homes Apartment, After Prince and Princess second gate. Kaura, Abuja, FCT, Abuja Federal Capital Territory"},
  {id:"ct611",name:"Mr. Sunday Ikorishor",phone:"09155328905",email:"",address:"Plot 25, Umaru Sanda Nyako street, Hillside Estate, Gwarinpa"},
  {id:"ct612",name:"Damunde Estate",phone:"00813847639",email:"",address:"33, Damunde Estate, Mabora District, Life-Camp, Abuja, Abuja Federal Capital Territory"},
  {id:"ct613",name:"Mocoh",phone:"",email:"",address:"24 Anambra crescent, off Nile Street, Maitama, Abuja, Abuja Federal Capital Territory"},
  {id:"ct614",name:"Mrs Omotosho (Damunde Estate)",phone:"08060584298",email:"",address:""},
  {id:"ct615",name:"Ms. Ngunan",phone:"08037873118",email:"",address:"Karsana District, Abuja, FCT"},
  {id:"ct616",name:"INFRACORP",phone:"09038864807",email:"",address:"Bank of Industry Building
12th Floor, Tower 2
Central Business District, Abuja, Abuja Federal Capital Territory"},
  {id:"ct617",name:"Mrs. Chiadi Inegbu",phone:"08023140501",email:"",address:"2. Ibrahim Tenimu Shehu Close, Gwarimpa"},
  {id:"ct618",name:"The Showroom",phone:"08036688816",email:"kristina@cosmodesign.net",address:"145,Ademola Adetokunbo Crescent, Wuse 2"},
  {id:"ct619",name:"Mr. Richard",phone:"",email:"",address:""},
  {id:"ct620",name:"Barr. Miracle",phone:"",email:"",address:"2. Pitonga Street, Games Village, Abuja Federal Capital Territory"},
  {id:"ct621",name:"TrustFund Pensions",phone:"",email:"",address:"Plot 820/821, Labour House, Central Area., Abuja"},
  {id:"ct622",name:"Muzammil Waziri",phone:"08032466795",email:"",address:"154 Sola Adebiyi Crescent
House 8, Wuye, Abuja"},
  {id:"ct623",name:"Mr. A. M Asuku",phone:"08033000280",email:"",address:"No. 4 Abubakar Hashidu Close, Off Pattrick Yakowa Street, Katampe Extension,, Abuja"},
  {id:"ct624",name:"Mr. Agbo Sunday",phone:"08131935472",email:"sundaylawrence51@gmail.com",address:"No. 96 NEPA Road, Kubwa, Abuja"},
  {id:"ct625",name:"TLC Apartments",phone:"",email:"",address:"1b Ola Vincent Close, Abuja"},
  {id:"ct626",name:"YCM CITY CHAPEL",phone:"",email:"",address:"Off Yemi Osinbajo Blvd, Abuja, FCT"},
  {id:"ct627",name:"IKEA Nigeria, Abuja",phone:"08034511152",email:"",address:"2nd & 3rd Floor, Irrama Plaza, Abuja"},
  {id:"ct628",name:"Ms. Gloria",phone:"08109394365",email:"",address:"Wuye Extensions, Abuja"},
  {id:"ct629",name:"Ms. Freda",phone:"08065383446",email:"",address:"SOAR Plaza, Abuja"},
  {id:"ct630",name:"Arc Maimuna",phone:"08033120024",email:"",address:"Abuja, FCT"},
  {id:"ct631",name:"Ms. Yetunde Oladapo",phone:"07082968139",email:"yea2ndey@yahoo.com",address:"Tpumpy Phase 20, Lugbe,, Abuja, FCT"},
  {id:"ct632",name:"Ms. Venassa Patrick",phone:"08063442583",email:"",address:"Maitama, Abuja"},
  {id:"ct633",name:"Mr. Pedro Agbo",phone:"08162046532",email:"bisiteru@gmail.com",address:"Mabu Court, Abuja"},
  {id:"ct634",name:"Mr. Kalu",phone:"",email:"",address:"445 Attahiru Jega crescent,, Abuja"},
  {id:"ct635",name:"Nnadi Munachiso",phone:"08032601409",email:"",address:"Plot 16A, Larix Estate, Apo, Abuja"},
  {id:"ct636",name:"Joerno. Conceptions Ltd.",phone:"08032896640",email:"belloolufemi@keno.com.ng",address:"2nd Floor, 25 Ndola Crescent,, Abuja"},
  {id:"ct637",name:"Crux of Care",phone:"08037031310",email:"susman@cruxofcare.com",address:"Suite 308, Wetland Plaza, Abuja"},
  {id:"ct638",name:"Expertise France",phone:"07072752518",email:"abissiata.ouattara@expertisefrance.fr",address:"12 Charles de Gaulle Street,, Abuja"},
  {id:"ct639",name:"Casa Bolingo",phone:"08135770041",email:"",address:""},
  {id:"ct640",name:"Ogiemudia Eghoosa",phone:"08065757880",email:"eghosaogiemudia@gmail.com",address:"Paradise Estate, Abuja"},
  {id:"ct641",name:"Smart Trust Limited",phone:"",email:"",address:"Abuja"},
  {id:"ct642",name:"James Akpa",phone:"",email:"",address:""},
  {id:"ct643",name:"maryam",phone:"",email:"",address:""},
  {id:"ct644",name:"Pascal Chukwuma Omile",phone:"",email:"",address:"13 Olusegun Soyemi Avenue, Abuja"},
  {id:"ct645",name:"Mr Eric F.Y",phone:"",email:"",address:""},
  {id:"ct646",name:"Radiant Wellness Spa",phone:"",email:"",address:"No 1 setiff close wuse 2, Abuja, Abuja Federal Capital Territory"},
  {id:"ct647",name:"SWIFTLENDS NIGERIA LTD.",phone:"08100994713",email:"",address:"SUITE 445,  ROCK OF AGES, MALL, ABUJA"},
  {id:"ct648",name:"MR Habeeb",phone:"",email:"",address:""},
  {id:"ct649",name:"Mr Habeeb",phone:"23408028271786",email:"",address:"House  B10, 2nd Avenue, Brains and Hammers Estate, Abuja, Nigeria"},
  {id:"ct650",name:"MARYJANE",phone:"07074644738",email:"",address:"DAWAKI, ABUJA"},
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
function LoginScreen({onLogin,users,clients,jobs,supplyItems}){
  const[em,setEm]=useState("");const[pw,setPw]=useState("");const[sp,setSp]=useState(false);const[err,setErr]=useState("");const[forgot,setForgot]=useState(false);const[fpEmail,setFpEmail]=useState("");const[fpSent,setFpSent]=useState(false);
  const go=()=>{const u=users.find(u=>(u.email===em.trim()||u.username===em.trim())&&u.password===pw);u?onLogin(u):setErr("Invalid credentials.");};
  return(<div className="min-h-screen flex" style={{background:`linear-gradient(145deg,${GD} 0%,#1B5E2F 60%,${GD} 100%)`}}>
    <div className="hidden lg:flex flex-1 flex-col justify-center p-16 text-white">
      <img src={LOGO} alt="D&W" className="w-24 mb-4 drop-shadow-lg bg-white rounded-xl p-1"/>
      <h1 className="text-5xl font-black mb-1" style={{fontFamily:"Georgia,serif",letterSpacing:"-1px"}}>Operations Hub</h1>
      <p className="text-green-200 text-lg mt-1">Dust &amp; Wipes Limited</p>
      <p className="text-green-400 italic text-sm mt-1">"Restoring a Clean World"</p>
      <div className="mt-10 grid grid-cols-2 gap-3 w-72">{[["18","Clients"],["15","Modules"],["₦3.4M+","Portfolio"],["3","User Roles"]].map(([v,l])=><div key={l} className="rounded-2xl p-4 text-center" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)"}}><div className="text-2xl font-black" style={{color:O}}>{v}</div><div className="text-green-200 text-xs mt-1">{l}</div></div>)}</div>
    </div>
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6"><img src={LOGO} alt="D&W" className="w-14 mx-auto mb-3 bg-white rounded-xl p-1"/><h2 className="text-2xl font-black text-gray-800">Welcome Back</h2><p className="text-gray-400 text-sm">Sign in to Operations Hub</p></div>
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
function ClientsPage({clients,setClients,userRole,staff}){
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
    {modal!==null&&<ClientModal data={modal.id?modal:null} onSave={save} onClose={()=>setModal(null)} staff={staff}/>}
  </div>);}
function ClientModal({data,onSave,onClose,staff}){
  const blank={name:"",cat:"Corporate",svc:"Cleaning",addr:"",cp:"",phone:"",email:"",cleaners:[],duty:"Mon-Fri",cs:"",ce:"",sal:0,con:0,sc:0,vat:0,tot:0};
  const[f,setF]=useState(data?{...data,cleaners:Array.isArray(data.cleaners)?data.cleaners:data.cleaners?[data.cleaners]:[]}:blank);
  const[cleanerSearch,setCleanerSearch]=useState("");
  const u=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const cleaningStaff=staff.filter(s=>s.category==="Cleaning Staff"||s.role==="Cleaner"||s.role==="Team Lead");
  const filteredStaff=cleanerSearch?cleaningStaff.filter(s=>s.name.toLowerCase().includes(cleanerSearch.toLowerCase())):cleaningStaff;
  const toggleCleaner=name=>setF(p=>({...p,cleaners:p.cleaners.includes(name)?p.cleaners.filter(c=>c!==name):[...p.cleaners,name]}));

  return(<ModalWrap title={data?"Edit Client":"Add New Client"} onClose={onClose} xl>
    <div className="grid grid-cols-2 gap-4">
      <Fld label="Client / Company Name" col><input className={inp} value={f.name} onChange={u("name")}/></Fld>
      <Fld label="Category"><select className={inp} value={f.cat} onChange={u("cat")}>
        <option>Corporate</option><option>NGO</option><option>Healthcare</option>
        <option>Real Estate</option><option>Food & Bev</option><option>Retail</option>
        <option>Residence</option><option>Hospitality</option><option>Education</option>
        <option>Other</option>
      </select></Fld>
      <Fld label="Service Type"><select className={inp} value={f.svc} onChange={u("svc")}>
        <option>Cleaning</option><option>Pest Control</option>
        <option>Both</option><option>Training/Consultancy</option>
      </select></Fld>
      <Fld label="Address" col><input className={inp} value={f.addr} onChange={u("addr")}/></Fld>
      <Fld label="Contact Person"><input className={inp} value={f.cp} onChange={u("cp")}/></Fld>
      <Fld label="Phone"><input className={inp} value={f.phone} onChange={u("phone")}/></Fld>
      <Fld label="Email"><input className={inp} type="email" value={f.email} onChange={u("email")}/></Fld>
      <Fld label="Duty Days"><input className={inp} value={f.duty} onChange={u("duty")}/></Fld>
      <Fld label="Contract Start"><input className={inp} type="date" value={f.cs} onChange={u("cs")}/></Fld>
      <Fld label="Contract End"><input className={inp} type="date" value={f.ce} onChange={u("ce")}/></Fld>
      {/* Cleaners Multi-Select */}
      <Fld label="Cleaners Assigned" col>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative"><Search size={12} className="absolute left-2.5 top-2.5 text-gray-400"/>
              <input className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                placeholder="Search cleaning staff…" value={cleanerSearch} onChange={e=>setCleanerSearch(e.target.value)}/>
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto p-2 space-y-1">
            {filteredStaff.length===0&&<p className="text-xs text-gray-400 text-center py-2">No cleaning staff found</p>}
            {filteredStaff.map(s=><label key={s.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${f.cleaners.includes(s.name)?"bg-green-50 border border-green-300 font-semibold text-green-800":"hover:bg-gray-50 text-gray-600"}`}>
              <input type="checkbox" checked={f.cleaners.includes(s.name)} onChange={()=>toggleCleaner(s.name)} className="accent-green-600"/>
              <span>{s.name}</span>
              {s.site&&<span className="text-gray-400 ml-auto">({s.site})</span>}
            </label>)}
          </div>
          {f.cleaners.length>0&&<div className="p-2 border-t border-gray-100 bg-green-50/50">
            <p className="text-xs font-semibold text-green-700 mb-1">{f.cleaners.length} assigned:</p>
            <div className="flex flex-wrap gap-1">{f.cleaners.map(c=><span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
              {c}<button type="button" onClick={()=>toggleCleaner(c)} className="text-green-600 hover:text-red-500 ml-0.5 font-bold">×</button>
            </span>)}</div>
          </div>}
        </div>
      </Fld>
      <div className="col-span-2 border-t pt-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Financials (₦)</p></div>
      <Fld label="Salary"><input className={inp} type="number" value={f.sal} onChange={u("sal")}/></Fld>
      <Fld label="Consumables"><input className={inp} type="number" value={f.con} onChange={u("con")}/></Fld>
      <Fld label="Service Charge"><input className={inp} type="number" value={f.sc} onChange={u("sc")}/></Fld>
      <Fld label="VAT"><input className={inp} type="number" value={f.vat} onChange={u("vat")}/></Fld>
      <Fld label="Total Contract Sum" col><input className={inp} type="number" value={f.tot} onChange={u("tot")}/></Fld>
    </div>
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
      <button onClick={onClose} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
      <button onClick={()=>onSave({...f,cleaners:f.cleaners})} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{data?"Save Changes":"Add Client"}</button>
    </div>
  </ModalWrap>);}


// ── CONTRACTS ────────────────────────────────────────────────────────────────
function ContractsPage({clients}){
  const[filter,setFilter]=useState("All");
  const ws=useMemo(()=>clients.map(c=>({...c,status:cStatus(c.ce)})),[clients]);
  const sorted=useMemo(()=>(filter==="All"?ws:ws.filter(c=>c.status===filter)).sort((a,b)=>(dLeft(a.ce)||0)-(dLeft(b.ce)||0)),[ws,filter]);
  const stats=[{l:"Active",v:ws.filter(c=>c.status==="Active").length,c:"#22c55e",bg:"#dcfce7"},{l:"Expiring Soon",v:ws.filter(c=>c.status==="Expiring Soon").length,c:AMBER,bg:"#fffbeb"},{l:"Critical",v:ws.filter(c=>c.status==="Critical").length,c:RED,bg:"#fee2e2"},{l:"Expired",v:ws.filter(c=>c.status==="Expired").length,c:"#6b7280",bg:"#f3f4f6"}];
  return(<div className="space-y-5">
    <div className="p-3 rounded-xl text-xs text-gray-600" style={{background:GL,border:`1px solid ${G}30`}}>🔔 <strong>Alert Policy:</strong> <span className="font-bold text-amber-600">Amber</span> ≤60d · <span className="font-bold text-red-600">Red/Critical</span> ≤30d · SMS &amp; Email to Admin &amp; Supervisor.</div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map(s=><button key={s.l} onClick={()=>setFilter(filter===s.l?"All":s.l)} className="p-5 rounded-2xl border-2 text-center transition-all bg-white border-gray-100 hover:shadow" style={filter===s.l?{borderColor:s.c,background:s.bg}:{}}><div className="text-3xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-xs font-semibold text-gray-500 mt-1">{s.l}</div></button>)}</div>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Client","Service","Phone","Start","End","Days Left","Value","Status"].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{sorted.map(c=>{const dl=dLeft(c.ce);return(<tr key={c.id} className="hover:bg-gray-50/70"><td className="px-4 py-3.5"><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.cp}</p></td><td className="px-4 py-3.5 text-xs text-gray-500">{c.svc}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{c.phone}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.cs)}</td><td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtD(c.ce)}</td><td className="px-4 py-3.5">{dl!==null&&<span className={`text-xs font-bold ${dl<0?"text-gray-500":dl<=30?"text-red-600":dl<=60?"text-amber-600":"text-green-600"}`}>{dl<0?`${Math.abs(dl)}d ago`:`${dl}d`}</span>}</td><td className="px-4 py-3.5 font-bold text-gray-700 whitespace-nowrap">{fmt(c.tot)}</td><td className="px-4 py-3.5"><SBadge s={c.status}/></td></tr>);})}</tbody></table></div></Card>
  </div>);}

// ── SERVICE REQUESTS ─────────────────────────────────────────────────────────
function RequestsPage({requests,setRequests,setJobs,clients}){
  const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const blank={clientName:"",clientPhone:"",svc:"",loc:"",prefDate:"",src:"Phone",status:"Pending",notes:""};
  const save=data=>{if(data.id)setRequests(rs=>rs.map(r=>r.id===data.id?data:r));else setRequests(rs=>[...rs,{...data,id:"sr"+Date.now(),created:TODAY.toISOString().split("T")[0]}]);setModal(null);};
  const convert=req=>{setJobs(js=>[...js,{id:"j"+Date.now(),clientName:req.clientName,svc:req.svc,date:req.prefDate,sup:"",techs:"",status:"New",notes:req.notes,checkIn:null,checkOut:null}]);setRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"Converted"}:r));};
  const del=id=>confirm("Delete this request?",()=>setRequests(rs=>rs.filter(r=>r.id!==id)));
  const SC={Pending:{bg:"#fffbeb",color:AMBER,border:"#fde68a"},Converted:{bg:"#f0fdf4",color:"#16a34a",border:"#bbf7d0"},Declined:{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"}};
  return(<div className="space-y-5">{confirmEl}
    <div className="flex items-center justify-between"><div className="flex gap-3"><div className="p-3 rounded-xl text-sm font-bold" style={{background:"#fffbeb",color:AMBER}}>{requests.filter(r=>r.status==="Pending").length} Pending</div><div className="p-3 rounded-xl text-sm font-bold" style={{background:GL,color:G}}>{requests.filter(r=>r.status==="Converted").length} Converted</div></div><button onClick={()=>setModal(blank)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Log Request</button></div>
    <Card><div className="divide-y divide-gray-50">{requests.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No requests yet</div>}{requests.map(r=>(<div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"><div className="flex items-start gap-3 min-w-0"><div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:G}}>{(r.clientName||"?")[0]}</div><div><p className="font-semibold text-gray-800 text-sm">{r.clientName}</p><p className="text-xs text-gray-500">{r.svc} · {fmtD(r.prefDate)} · via {r.src}{r.clientPhone?<> · <span className="font-medium">{r.clientPhone}</span></>:""}</p>{r.notes&&<p className="text-xs text-gray-400 italic mt-0.5">"{r.notes}"</p>}</div></div><div className="flex items-center gap-2 flex-shrink-0 ml-4"><SBadge s={r.status} custom={SC[r.status]}/>{r.status==="Pending"&&<button onClick={()=>convert(r)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1" style={{background:BLUE}}><ArrowRight size={11}/>Convert</button>}<button onClick={()=>setModal(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>))}</div></Card>
    {modal&&<ModalWrap title={modal.id?"Edit Request":"Log Service Request"} onClose={()=>setModal(null)}><div className="space-y-4"><Fld label="Client Name"><input className={inp} value={modal.clientName} onChange={e=>setModal(p=>({...p,clientName:e.target.value}))}/></Fld><Fld label="Client Phone"><input className={inp} type="tel" value={modal.clientPhone||""} onChange={e=>setModal(p=>({...p,clientPhone:e.target.value}))} placeholder="e.g. 08031234567"/></Fld><Fld label="Service"><select className={inp} value={modal.svc} onChange={e=>setModal(p=>({...p,svc:e.target.value}))}><option value="">— Select —</option><option>General Cleaning</option><option>One-Time Cleaning</option><option>Deep Cleaning</option><option>Pest Control</option><option>Fumigation</option><option>Training/Consultancy</option></select></Fld><div className="grid grid-cols-2 gap-4"><Fld label="Location"><input className={inp} value={modal.loc} onChange={e=>setModal(p=>({...p,loc:e.target.value}))}/></Fld><Fld label="Preferred Date"><input className={inp} type="date" value={modal.prefDate} onChange={e=>setModal(p=>({...p,prefDate:e.target.value}))}/></Fld><Fld label="Source"><select className={inp} value={modal.src} onChange={e=>setModal(p=>({...p,src:e.target.value}))}><option>Phone</option><option>WhatsApp</option><option>Email</option><option>Walk-in</option><option>Website</option><option>Referral</option></select></Fld></div><Fld label="Notes" col><textarea className={inp} rows={3} value={modal.notes} onChange={e=>setModal(p=>({...p,notes:e.target.value}))}/></Fld></div><div className="flex justify-end gap-3 mt-5 pt-4 border-t"><button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button><button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Save</button></div></ModalWrap>}
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
const EQUIPMENT_OPTS=["Vacuum Cleaner","Industrial Vacuum","Steam Cleaner","Scrubbing Machine","Pressure Washer","Carpet Extractor","Dryer/Blower","Power Extension Box","Spray Pump (Manual)","Spray Pump (Motorised)","Mop & Bucket Set","Ladder","Squeegee","Scrubbing Brushes","Telescopic Pole","Glass Scrubber","Hand Drill Machine","PPE Kit"];
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

function ContactSearchSelect({value,onSelect,clients}){
  const[search,setSearch]=useState(value||"");const[open,setOpen]=useState(false);const ref=useRef(null);
  // Merge clients from app + CONTACTS_DB, deduplicated by name
  const allContacts=useMemo(()=>{
    const names=new Set();const list=[];
    [...clients.map(c=>({name:c.name,phone:c.phone||"",address:c.addr||""})),...CONTACTS_DB].forEach(c=>{
      if(c.name&&!names.has(c.name)){names.add(c.name);list.push(c);}
    });
    return list.sort((a,b)=>a.name.localeCompare(b.name));
  },[clients]);
  const filtered=search.trim()?allContacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).slice(0,30):allContacts.slice(0,30);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const select=c=>{setSearch(c.name);onSelect(c.name);setOpen(false);};
  return(<div className="relative" ref={ref}>
    <div className="relative"><Search size={13} className="absolute left-3 top-2.5 text-gray-400"/>
      <input className={inp+" pl-9"} value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Search or type client name…"/>
      {search&&<button type="button" onClick={()=>{setSearch("");onSelect("");}} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X size={14}/></button>}
    </div>
    {open&&filtered.length>0&&<div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
      {filtered.map(c=><button key={c.name} type="button" onClick={()=>select(c)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0">
        <p className="font-medium text-gray-800">{c.name}</p>
        {(c.phone||c.address)&&<p className="text-xs text-gray-400">{[c.phone,c.address].filter(Boolean).join(" · ")}</p>}
      </button>)}
    </div>}
  </div>);}

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

  const submit=async()=>{
    const reportData={...f,id:Date.now(),submittedAt:new Date().toISOString(),
      signatureTimestamp:new Date().toLocaleString("en-GB")};
    onSave(reportData);
    // Fire-and-forget: email full report to admin + supervisors via Edge Function
    try{
      fetch(`${SUPABASE_URL}/functions/v1/send-site-report-pdf`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${SUPABASE_ANON_KEY}`},
        body:JSON.stringify({report:reportData})
      }).then(r=>r.ok?console.log("[App] Report emailed ✓"):console.warn("[App] Email error:",r.status));
    }catch(e){console.warn("[App] Site report email (non-blocking):",e);}
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
            <Fld label="Client / Site" col required>
            <ContactSearchSelect value={f.clientName} onSelect={name=>{const c=clients.find(c=>c.name===name);const ct=CONTACTS_DB.find(c=>c.name===name);setF(p=>({...p,clientName:name,address:c?c.addr:ct?ct.address:""}));}} clients={clients}/>
          </Fld>
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
  const approve=(id,status)=>{
    setRequisitions(rs=>rs.map(r=>{
      if(r.id!==id) return r;
      // Auto-add to CONTACTS_DB if newly approved and site not already known
      if(status==="Approved"&&r.site){
        const alreadyInContacts=CONTACTS_DB.some(c=>c.name.toLowerCase()===r.site.toLowerCase());
        const alreadyInClients=clients.some(c=>c.name.toLowerCase()===r.site.toLowerCase());
        if(!alreadyInContacts&&!alreadyInClients){
          CONTACTS_DB.push({id:"ct"+Date.now(),name:r.site,phone:"",email:"",address:""});
        }
      }
      return {...r,status,reviewedBy:user.name,reviewedAt:new Date().toLocaleString("en-GB")};
    }));
  };
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
  const today=new Date();const thisMonth=today.getMonth();const thisYear=today.getFullYear();

  const del=id=>confirm("Delete this imprest account?",()=>setImprests(im=>im.filter(i=>i.id!==id)));

  const addExpense=(id,exp)=>setImprests(im=>im.map(i=>i.id===id?{...i,expenses:[...(i.expenses||[]),exp]}:i));
  const addTopUp=(id,topup)=>setImprests(im=>im.map(i=>i.id===id?{...i,amount:i.amount+(topup.amount||0),topups:[...(i.topups||[]),topup]}:i));
  const updateStatus=(id,status)=>setImprests(im=>im.map(i=>i.id===id?{...i,status}:i));

  // Mini dashboard per fund manager this month
  const byManager={};
  imprests.forEach(imp=>{
    const key=imp.holder||"Unknown";
    if(!byManager[key])byManager[key]={name:key,issued:0,spent:0,accounts:0};
    byManager[key].issued+=imp.amount||0;
    byManager[key].spent+=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0);
    byManager[key].accounts++;
  });
  const totalIssued=imprests.reduce((s,i)=>s+i.amount,0);
  const totalSpent=imprests.reduce((s,i)=>s+(i.expenses||[]).reduce((ss,e)=>ss+e.amount,0),0);

  // Monthly issued this month
  const monthlyIssued=imprests.filter(i=>{
    const d=new Date(i.releaseDate||i.created||"");
    return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;
  }).reduce((s,i)=>s+i.amount,0);

  const SC={"Active":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Pending Reconciliation":{bg:"#fffbeb",color:AMBER,border:"#fde68a"},"Closed":{bg:"#f3f4f6",color:"#6b7280",border:"#e5e7eb"},"Flagged":{bg:"#fee2e2",color:RED,border:"#fca5a5"}};

  return(<div className="space-y-5">{confirmEl}
    {/* Mini Dashboard */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI icon="💼" label="Total Issued" value={fmt(totalIssued)} sub="All accounts" bg={GL}/>
      <KPI icon="📅" label="This Month" value={fmt(monthlyIssued)} sub={MONTHS[thisMonth]+" disbursements"} bg="#eff6ff"/>
      <KPI icon="💸" label="Total Spent" value={fmt(totalSpent)} sub="Across all accounts" bg={OL}/>
      <KPI icon="💰" label="Net Balance" value={fmt(totalIssued-totalSpent)} sub={totalIssued-totalSpent<0?"⚠️ Overspent":"Remaining"} bg={totalIssued-totalSpent<0?"#fee2e2":"#f0f9ff"}/>
    </div>
    {/* Per-Manager Summary */}
    {Object.values(byManager).length>0&&<Card className="p-5">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Fund Manager Summary</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.values(byManager).map(m=>{const bal=m.issued-m.spent;return(<div key={m.name} className="p-3.5 rounded-xl" style={{background:"#f9fafb",border:"1px solid #f3f4f6"}}>
          <p className="text-sm font-bold text-gray-800 mb-2">{m.name}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs font-bold text-gray-400">Issued</p><p className="text-sm font-black" style={{color:G}}>{fmt(m.issued)}</p></div>
            <div><p className="text-xs font-bold text-gray-400">Spent</p><p className="text-sm font-black" style={{color:O}}>{fmt(m.spent)}</p></div>
            <div><p className="text-xs font-bold text-gray-400">Balance</p><p className="text-sm font-black" style={{color:bal<0?RED:BLUE}}>{fmt(bal)}</p></div>
          </div>
        </div>);})}
      </div>
    </Card>}
    <div className="flex justify-end"><button onClick={()=>setModal({type:"new"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>New Imprest</button></div>
    <Card><div className="divide-y divide-gray-50">{imprests.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No imprest accounts yet</div>}
      {imprests.map(imp=>{
        const spent=(imp.expenses||[]).reduce((s,e)=>s+e.amount,0);
        const topupsTotal=(imp.topups||[]).reduce((s,t)=>s+t.amount,0);
        const bal=imp.amount-spent;
        const overdue=imp.deadline&&new Date(imp.deadline)<TODAY&&imp.status==="Active";
        return(<div key={imp.id} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:bal<0?RED:G}}>₦</div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{imp.title}</p>
                <p className="text-xs text-gray-500">Holder: {imp.holder} · {imp.fundType||"Field Operations"} · {fmtD(imp.releaseDate)}</p>
                <p className="text-xs text-gray-400">{imp.purpose}</p>
                {overdue&&<p className="text-xs text-red-600 font-semibold">⚠️ Reconciliation overdue</p>}
                {(imp.topups||[]).length>0&&<p className="text-xs text-blue-600">+{imp.topups.length} top-up{imp.topups.length!==1?"s":""} · Total received: {fmt(imp.amount)}</p>}
                <div className="flex gap-4 mt-1.5 text-xs flex-wrap">
                  <span>Original: <strong>{fmt(imp.originalAmount||imp.amount)}</strong></span>
                  {(imp.topups||[]).length>0&&<span>Top-ups: <strong style={{color:BLUE}}>{fmt(topupsTotal)}</strong></span>}
                  <span>Spent: <strong>{fmt(spent)}</strong></span>
                  <span>Bal: <strong style={{color:bal<0?RED:G}}>{fmt(bal)}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <SBadge s={overdue?"Flagged":imp.status} custom={SC[overdue?"Flagged":imp.status]}/>
              <button onClick={()=>setView(imp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100" title="View Details"><Eye size={13}/></button>
              <button onClick={()=>setModal({type:"expense",impId:imp.id,imp})} className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 border border-green-100" title="Log Expense"><Plus size={13}/></button>
              <button onClick={()=>setModal({type:"topup",impId:imp.id,imp})} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-100" title="Top Up Fund">↑</button>
              <button onClick={()=>del(imp.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
            </div>
          </div>
        </div>);
      })}
    </div></Card>

    {/* NEW IMPREST MODAL */}
    {modal?.type==="new"&&<ModalWrap title="Create Imprest Account" onClose={()=>setModal(null)} wide>
      <div className="grid grid-cols-2 gap-4">
        <Fld label="Title" col><input className={inp} value={modal.title||""} onChange={e=>setModal(p=>({...p,title:e.target.value}))} placeholder="e.g. Site Operations Fund — April"/></Fld>
        <Fld label="Fund Type"><select className={inp} value={modal.fundType||"Field Operations"} onChange={e=>setModal(p=>({...p,fundType:e.target.value}))}><option>Field Operations</option><option>Office Operations / Supplies</option></select></Fld>
        <Fld label="Fund Holder (Staff Name)"><input className={inp} value={modal.holder||""} onChange={e=>setModal(p=>({...p,holder:e.target.value}))}/></Fld>
        <Fld label="Branch / Site"><input className={inp} value={modal.branch||""} onChange={e=>setModal(p=>({...p,branch:e.target.value}))}/></Fld>
        <Fld label="Amount Released (₦)"><input className={inp} type="number" min="0" value={modal.amount||""} onChange={e=>setModal(p=>({...p,amount:Number(e.target.value)}))}/></Fld>
        <Fld label="Release Date"><input className={inp} type="date" value={modal.releaseDate||""} onChange={e=>setModal(p=>({...p,releaseDate:e.target.value}))}/></Fld>
        <Fld label="Reconciliation Deadline"><input className={inp} type="date" value={modal.deadline||""} onChange={e=>setModal(p=>({...p,deadline:e.target.value}))}/></Fld>
        <Fld label="Purpose" col><textarea className={inp} rows={2} value={modal.purpose||""} onChange={e=>setModal(p=>({...p,purpose:e.target.value}))}/></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{setImprests(im=>[...im,{...modal,id:"imp"+Date.now(),originalAmount:modal.amount||0,status:"Active",expenses:[],topups:[]}]);setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Create</button>
      </div>
    </ModalWrap>}

    {/* LOG EXPENSE MODAL */}
    {modal?.type==="expense"&&<ModalWrap title={`Log Expense — ${modal.imp.title}`} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm flex justify-between" style={{background:GL}}>
          <span className="font-bold text-green-700">Available Balance:</span>
          <span className="font-black" style={{color:(modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0))<0?RED:G}}>{fmt(modal.imp.amount-(modal.imp.expenses||[]).reduce((s,e)=>s+e.amount,0))}</span>
        </div>
        <p className="text-xs text-blue-600 font-medium">ℹ️ Negative balance is permitted — overspend will be flagged.</p>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Date"><input className={inp} type="date" value={modal.expDate||TODAY.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,expDate:e.target.value}))}/></Fld>
          <Fld label="Amount (₦)"><input className={inp} type="number" min="0" value={modal.expAmount||""} onChange={e=>setModal(p=>({...p,expAmount:Number(e.target.value)}))}/></Fld>
        </div>
        <Fld label="Category"><select className={inp} value={modal.expCat||""} onChange={e=>setModal(p=>({...p,expCat:e.target.value}))}><option value="">— Select —</option>{IMPREST_CATS.map(c=><option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Item / Service" col><input className={inp} value={modal.expItem||""} onChange={e=>setModal(p=>({...p,expItem:e.target.value}))}/></Fld>
        <Fld label="Vendor"><input className={inp} value={modal.expVendor||""} onChange={e=>setModal(p=>({...p,expVendor:e.target.value}))}/></Fld>
        <Fld label="Notes"><textarea className={inp} rows={2} value={modal.expNote||""} onChange={e=>setModal(p=>({...p,expNote:e.target.value}))}/></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{addExpense(modal.impId,{id:"exp"+Date.now(),date:modal.expDate,amount:modal.expAmount||0,category:modal.expCat,item:modal.expItem,vendor:modal.expVendor,note:modal.expNote});setModal(null);}} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>Log Expense</button>
      </div>
    </ModalWrap>}

    {/* TOP UP MODAL */}
    {modal?.type==="topup"&&<ModalWrap title={`Top Up — ${modal.imp.title}`} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl text-sm" style={{background:GL}}><p className="text-xs font-bold text-green-700 mb-1">Current Fund Total</p><p className="text-lg font-black" style={{color:G}}>{fmt(modal.imp.amount)}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Top-Up Date"><input className={inp} type="date" value={modal.topupDate||TODAY.toISOString().split("T")[0]} onChange={e=>setModal(p=>({...p,topupDate:e.target.value}))}/></Fld>
          <Fld label="Amount to Add (₦)"><input className={inp} type="number" min="1" value={modal.topupAmount||""} onChange={e=>setModal(p=>({...p,topupAmount:Number(e.target.value)}))}/></Fld>
        </div>
        <Fld label="Reason / Note" col><input className={inp} value={modal.topupNote||""} onChange={e=>setModal(p=>({...p,topupNote:e.target.value}))} placeholder="e.g. Additional site expenses authorised by admin"/></Fld>
        {modal.topupAmount>0&&<div className="p-3 rounded-xl text-sm" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}><span className="text-blue-700 font-semibold">New total after top-up: </span><span className="font-black text-blue-800">{fmt((modal.imp.amount||0)+(modal.topupAmount||0))}</span></div>}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>{if(!modal.topupAmount||modal.topupAmount<=0)return;addTopUp(modal.impId,{id:"tu"+Date.now(),date:modal.topupDate,amount:modal.topupAmount,note:modal.topupNote});setModal(null);}} disabled={!modal.topupAmount||modal.topupAmount<=0} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:BLUE}}>Add Top-Up</button>
      </div>
    </ModalWrap>}

    {/* DETAIL VIEW MODAL */}
    {view&&<ModalWrap title={`Imprest — ${view.title}`} onClose={()=>setView(null)} xl>
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <div><p className="font-bold text-gray-800">{view.title}</p><p className="text-xs text-gray-400">Holder: {view.holder} · {view.fundType||"Field Operations"} · Released: {fmtD(view.releaseDate)}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>updateStatus(view.id,"Pending Reconciliation")} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-amber-300 text-amber-700">Reconcile</button>
          <button onClick={()=>updateStatus(view.id,"Closed")} className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-300 text-gray-600">Close</button>
        </div>
      </div>
      {(()=>{const spent=(view.expenses||[]).reduce((s,e)=>s+e.amount,0);const bal=view.amount-spent;return(
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[["Issued",view.amount,GL,G],["Spent",spent,OL,O],["Balance",bal,bal<0?"#fee2e2":"#f0f9ff",bal<0?RED:BLUE]].map(([l,v,bg,c])=>
            <div key={l} className="p-4 rounded-xl text-center" style={{background:bg}}>
              <p className="text-lg font-black" style={{color:c}}>{fmt(v)}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">{l}</p>
            </div>)
          }
        </div>
      );}())}
      {/* Top-ups */}
      {(view.topups||[]).length>0&&<div className="mb-4"><p className="text-xs font-bold text-blue-600 mb-2">TOP-UPS</p><div className="space-y-1">{(view.topups||[]).map(t=><div key={t.id} className="flex justify-between p-2.5 rounded-lg text-xs" style={{background:"#eff6ff"}}><span>{fmtD(t.date)} — {t.note||"Top-up"}</span><span className="font-bold text-blue-700">+{fmt(t.amount)}</span></div>)}</div></div>}
      {/* Expenses */}
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Expenses</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr style={{background:"#f9fafb"}} className="border-b">{["Date","Item","Category","Vendor","Amount","Notes"].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-50">{(view.expenses||[]).length===0?<tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No expenses logged</td></tr>:(view.expenses||[]).map(e=><tr key={e.id} className="hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtD(e.date)}</td><td className="px-3 py-2 font-medium text-gray-800">{e.item}</td><td className="px-3 py-2 text-xs text-gray-500">{e.category}</td><td className="px-3 py-2 text-xs text-gray-500">{e.vendor||"—"}</td><td className="px-3 py-2 font-bold text-gray-800">{fmt(e.amount)}</td><td className="px-3 py-2 text-xs text-gray-400">{e.note||"—"}</td></tr>)}
        </tbody>
      </table></div>
    </ModalWrap>}
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
function StaffPage({staff,setStaff}){
  const[tab,setTab]=useState("office");const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const[search,setSearch]=useState("");
  const CATEGORIES=["Office Staff","Cleaning Staff","Gardening Staff"];
  const TAB_MAP={"office":"Office Staff","cleaning":"Cleaning Staff","gardening":"Gardening Staff"};
  const filtered=staff.filter(s=>s.category===TAB_MAP[tab]&&[s.name,s.site,s.phone,s.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  const del=id=>confirm("Remove this staff member?",()=>setStaff(ss=>ss.filter(s=>s.id!==id)));
  const save=data=>{
    if(data.id)setStaff(ss=>ss.map(s=>s.id===data.id?{...s,...data}:s));
    else setStaff(ss=>[...ss,{...data,id:"st"+Date.now()}]);
    setModal(null);
  };
  const blank={name:"",category:TAB_MAP[tab],role:"",site:"",phone:"",homeAddress:"",emergencyContact:"",emergencyPhone:"",dob:""};

  const counts=Object.fromEntries(CATEGORIES.map(c=>[c,staff.filter(s=>s.category===c).length]));

  return(<div className="space-y-5">{confirmEl}
    <div className="grid grid-cols-3 gap-4">
      <KPI icon="🏢" label="Office Staff" value={counts["Office Staff"]||0} sub="Admin & Supervisors" bg="#eff6ff"/>
      <KPI icon="🧹" label="Cleaning Staff" value={counts["Cleaning Staff"]||0} sub="Field cleaners" bg={GL}/>
      <KPI icon="🌿" label="Gardening Staff" value={counts["Gardening Staff"]||0} sub="Gardeners" bg="#f0fdf4"/>
    </div>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex gap-2 border border-gray-200 rounded-xl p-1 bg-white">
        {[{id:"office",l:"Office Staff"},{id:"cleaning",l:"Cleaning Staff"},{id:"gardening",l:"Gardening Staff"}].map(t=>
          <button key={t.id} onClick={()=>{setTab(t.id);setSearch("");}} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id?"text-white":"text-gray-500"}`} style={tab===t.id?{background:G}:{}}>{t.l} ({counts[TAB_MAP[t.id]]||0})</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input className={inp+" pl-9 w-48"} placeholder="Search staff…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button onClick={()=>setModal({...blank,category:TAB_MAP[tab]})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><Plus size={14}/>Add Staff</button>
      </div>
    </div>
    <Card><div className="divide-y divide-gray-50">
      {filtered.length===0&&<div className="text-center py-12 text-gray-400 text-sm">No {TAB_MAP[tab].toLowerCase()} found</div>}
      {filtered.map(s=><div key={s.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{background:tab==="cleaning"?G:tab==="gardening"?"#16a34a":O}}>{(s.name||"?")[0]}</div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
            <p className="text-xs text-gray-500">{s.role}{s.site?` · Site: ${s.site}`:""}</p>
            {s.phone&&<p className="text-xs text-gray-400">📞 {s.phone}</p>}
            {s.homeAddress&&<p className="text-xs text-gray-400 truncate max-w-xs">🏠 {s.homeAddress}</p>}
            {s.emergencyContact&&<p className="text-xs text-gray-400">🚨 {s.emergencyContact}{s.emergencyPhone?` · ${s.emergencyPhone}`:""}</p>}
            {s.dob&&<p className="text-xs text-gray-400">🎂 {fmtD(s.dob)}</p>}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={()=>setModal({...s,_editing:true})} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button>
          <button onClick={()=>del(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button>
        </div>
      </div>)}
    </div></Card>
    {modal&&<ModalWrap title={modal._editing?"Edit Staff Member":"Add Staff Member"} onClose={()=>setModal(null)} wide>
      <div className="grid grid-cols-2 gap-4">
        <Fld label="Full Name" required><input className={inp} value={modal.name||""} onChange={e=>setModal(p=>({...p,name:e.target.value}))}/></Fld>
        <Fld label="Category"><select className={inp} value={modal.category||"Cleaning Staff"} onChange={e=>setModal(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Role / Position"><input className={inp} value={modal.role||""} onChange={e=>setModal(p=>({...p,role:e.target.value}))} placeholder="e.g. Cleaner, Supervisor, Gardener…"/></Fld>
        <Fld label="Site / Location Assigned"><input className={inp} value={modal.site||""} onChange={e=>setModal(p=>({...p,site:e.target.value}))} placeholder="e.g. IFRC, AFD, Multiple…"/></Fld>
        <Fld label="Phone Number"><input className={inp} type="tel" value={modal.phone||""} onChange={e=>setModal(p=>({...p,phone:e.target.value}))}/></Fld>
        <Fld label="Date of Birth"><input className={inp} type="date" value={modal.dob||""} onChange={e=>setModal(p=>({...p,dob:e.target.value}))}/></Fld>
        <Fld label="Home Address" col><input className={inp} value={modal.homeAddress||""} onChange={e=>setModal(p=>({...p,homeAddress:e.target.value}))}/></Fld>
        <Fld label="Emergency Contact Name"><input className={inp} value={modal.emergencyContact||""} onChange={e=>setModal(p=>({...p,emergencyContact:e.target.value}))}/></Fld>
        <Fld label="Emergency Contact Phone"><input className={inp} type="tel" value={modal.emergencyPhone||""} onChange={e=>setModal(p=>({...p,emergencyPhone:e.target.value}))}/></Fld>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>save(modal)} disabled={!modal.name} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{background:G}}>{modal._editing?"Save Changes":"Add Staff Member"}</button>
      </div>
    </ModalWrap>}
  </div>);}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsPage({users,setUsers}){
  const[modal,setModal]=useState(null);const[confirm,confirmEl]=useConfirm();
  const rc={"Admin":{bg:"#dcfce7",color:"#166534",border:"#bbf7d0"},"Supervisor":{bg:"#fff7ed",color:"#9a3412",border:"#fed7aa"},"Technician":{bg:"#eff6ff",color:"#1e40af",border:"#bfdbfe"}};
  const save=data=>{if(data.id)setUsers(us=>us.map(u=>u.id===data.id?{...u,...data,initial:(data.name||"?")[0].toUpperCase()}:u));else setUsers(us=>[...us,{...data,id:"u"+Date.now(),initial:(data.name||"?")[0].toUpperCase()}]);setModal(null);};
  const del=id=>confirm("Remove this app user account?",()=>setUsers(us=>us.filter(u=>u.id!==id)));
  return(<div className="space-y-6 max-w-3xl">{confirmEl}
    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-4">Company Profile</h3><div className="grid grid-cols-2 gap-4">{[["Company Name","Dust & Wipes Limited"],["App Name","Operations Hub"],["Domain","app.dustandwipes.com"],["Location","Abuja, Nigeria"],["Currency","NGN (₦)"],["Timezone","WAT (UTC+1)"]].map(([l,v])=><Fld key={l} label={l}><input className={inp+" bg-gray-50"} defaultValue={v} readOnly/></Fld>)}</div></Card>

    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h3 className="font-bold text-gray-800">App User Accounts</h3><p className="text-xs text-gray-400 mt-0.5">Manage login credentials for app access. Separate from field staff records.</p></div>
        <button onClick={()=>setModal({role:"Technician"})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:G}}><UserPlus size={14}/>Add User</button>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-xl mb-4 text-sm" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{color:AMBER}}/>
        <div><p className="font-bold text-amber-800">Session Persistence</p><p className="text-amber-700 text-xs mt-0.5">Accounts added here persist in the Supabase database permanently once the DB sync runs. Phone number login for technicians: use number as username (e.g. <code>08031234567</code>).</p></div>
      </div>
      <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
        {users.map(u=><div key={u.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center flex-shrink-0 text-sm" style={{background:O}}>{u.initial}</div>
            <div><p className="font-semibold text-gray-800 text-sm">{u.name}</p><p className="text-xs text-gray-400">{u.email||u.username||"No email/username"}</p></div>
          </div>
          <div className="flex items-center gap-3"><SBadge s={u.role} custom={rc[u.role]}/><div className="flex gap-1"><button onClick={()=>setModal(u)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 border border-blue-100"><Edit2 size={13}/></button><button onClick={()=>del(u.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 border border-red-100"><Trash2 size={13}/></button></div></div>
        </div>)}
      </div>
    </Card>

    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-3">Role Permissions</h3><div className="space-y-2.5">{[["Admin","#166534","Full access: all modules, staff management, settings, item catalogue"],["Supervisor","#9a3412","Jobs, clients, contracts, reports, requisitions (with costs), cover scheduling, imprest, item catalogue"],["Technician","#1e40af","Assigned jobs, GPS check-in/out, site reports, submit requisitions (no cost visibility)"]].map(([r,c,d])=><div key={r} className="flex gap-3 p-3 rounded-xl" style={{background:"#f9fafb"}}><span className="text-xs font-black w-24 flex-shrink-0 pt-0.5" style={{color:c}}>{r}</span><span className="text-xs text-gray-600">{d}</span></div>)}</div></Card>

    <Card className="p-6"><h3 className="font-bold text-gray-800 mb-3">Technology Stack</h3><div className="space-y-2.5">{[["Database","Supabase (PostgreSQL) — 13 tables, row-level security"],["Auth","Email/password + phone/username login, password reset via email"],["Hosting","Vercel (frontend) + Supabase (backend) → app.dustandwipes.com"],["Email","Resend via Supabase Edge Functions → notifications@mail.dustandwipes.com"],["PWA","Installable on Android & iPhone — offline cache via Service Worker"],["GPS","Browser Geolocation API + coordinates captured on site reports"]].map(([l,d])=><div key={l} className="flex gap-3 p-3 rounded-xl" style={{background:"#f9fafb"}}><span className="text-xs font-bold text-green-700 w-36 flex-shrink-0">{l}</span><span className="text-xs text-gray-600">{d}</span></div>)}</div></Card>

    {modal&&<ModalWrap title={modal.id?"Edit User":"Add New User"} onClose={()=>setModal(null)}>
      <div className="space-y-4">
        <Fld label="Full Name"><input className={inp} value={modal.name||""} onChange={e=>setModal(p=>({...p,name:e.target.value}))}/></Fld>
        <Fld label="Role"><select className={inp} value={modal.role||"Technician"} onChange={e=>setModal(p=>({...p,role:e.target.value}))}><option>Admin</option><option>Supervisor</option><option>Technician</option></select></Fld>
        <Fld label="Email (leave blank for technicians)"><input className={inp} type="email" value={modal.email||""} onChange={e=>setModal(p=>({...p,email:e.target.value}))} placeholder="name@dustandwipes.com"/></Fld>
        <Fld label="Username / Phone (for technicians without email)"><input className={inp} value={modal.username||""} onChange={e=>setModal(p=>({...p,username:e.target.value}))} placeholder="e.g. 08031234567"/></Fld>
        {!modal.id&&<Fld label="Temporary Password"><input className={inp} type="password" value={modal.password||""} onChange={e=>setModal(p=>({...p,password:e.target.value}))}/></Fld>}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
        <button onClick={()=>setModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
        <button onClick={()=>save(modal)} className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:G}}>{modal.id?"Save":"Add User"}</button>
      </div>
    </ModalWrap>}
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
        <img src={LOGO} alt="D&W" className="w-16 mb-2 drop-shadow-lg bg-white rounded-xl p-1"/>
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{borderColor:`rgba(255,255,255,0.3)`,borderTopColor:"transparent"}}/>
        <p className="text-green-200 text-sm font-medium">Connecting to database…</p>
      </div>
    );
  }

  if(!user) return <LoginScreen onLogin={handleLogin} users={users} clients={clients} jobs={jobs} supplyItems={supplyItems}/>;

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
    {id:"analytics",   label:"Analytics",        icon:BarChart2,     roles:["Admin"]},
    {id:"staff",       label:"Staff",            icon:Users,         roles:["Admin","Supervisor"]},
    {id:"settings",    label:"Settings",         icon:Settings,      roles:["Admin"]},
  ].filter(n=>n.roles.includes(user.role));
  const pageTitle=NAV.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <aside className={`${sidebar?"w-60":"w-14"} transition-all duration-200 flex flex-col flex-shrink-0`} style={{background:GD}}>
        <div className="h-16 flex items-center px-3 border-b gap-2 flex-shrink-0" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <img src={LOGO} alt="D&W" className="w-8 h-8 object-contain flex-shrink-0 rounded-lg bg-white p-0.5 border border-gray-100"/>
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
          {page==="clients"     &&<ClientsPage clients={clients} setClients={setClients} userRole={user.role} staff={staff}/>}
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
          {page==="staff"       &&<StaffPage staff={staff} setStaff={setStaff}/>}
          {page==="settings"    &&<SettingsPage users={users} setUsers={setUsers}/>}
        </main>
      </div>
    </div>
  );
}
