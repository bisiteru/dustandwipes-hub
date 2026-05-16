// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Seed data
//  Phase 5 extraction.
//
//  These constants are used as bootstrap fallbacks before Supabase data has
//  finished loading on first paint, and as the canonical starter records for
//  fresh deployments. The DB is authoritative once loaded.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️  Passwords are NO LONGER stored here. User accounts are managed via
//     Supabase Auth. The dw_users table holds: id, name, role, initial,
//     email/username (no password). Fallback below is only shown if the DB
//     hasn't loaded yet (first render flash before dbLoaded.current).
export const INITIAL_USERS = [
  { id: "u1", email: "bisit@dustandwipes.com",       role: "Admin",      name: "Bisit Admin",   initial: "B" },
  { id: "u2", email: "james.akpa@dustandwipes.com",  role: "Supervisor", name: "James Akpa",    initial: "J" },
  { id: "u3", email: "agnes.dung@dustandwipes.com",  role: "Supervisor", name: "Agnes Dung",    initial: "A" },
  { id: "u4", username: "08183006297",               role: "Technician", name: "Faith Apeh",    initial: "F" },
  { id: "u5", username: "08160939949",               role: "Technician", name: "Veronica Apeh", initial: "V" },
  { id: "u6", username: "08099700001",               role: "Technician", name: "Info Desk",     initial: "I" },
];

// ── SEED_STAFF removed for security (NDPR/GDPR compliance) ───────────────────
// Staff personal data (bank accounts, home addresses, emergency contacts) is
// stored exclusively in Supabase (dw_staff table). It was seeded on first run
// and must never be committed to source control again.
// To add / edit staff, use the Staff module inside the app.
export const SEED_STAFF: any[] = []; // intentionally empty — DB is authoritative

// ── Master supply catalogue (April 2026 prices) ──────────────────────────────
// Seeded into dw_supplyitems on first run. Editable thereafter via
// Requisitions → Item Catalogue (Admin/Supervisor).
export const INITIAL_SUPPLY_MASTER=[
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
