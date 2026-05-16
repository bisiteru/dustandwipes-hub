# Dust & Wipes — Operations Hub

Internal operations app for cleaning + pest control fieldwork management.
React 19 SPA on Create React App, Supabase backend, deployed to Vercel.

## Run locally

```bash
npm install
npm start          # dev server on http://localhost:3000
CI=true npm run build   # production build (matches Vercel's pipeline)
```

Requires a `.env.local` with `REACT_APP_SUPABASE_URL` and
`REACT_APP_SUPABASE_ANON_KEY` (mirror these in Vercel → Settings →
Environment Variables for Production / Preview / Development).

## Architecture

After the Phase 1–5 TypeScript migration, the codebase is organized as:

```
src/
  App.tsx                     ← root shell: state, routing, Supabase lifecycle
  index.tsx                   ← React entry
  index.css                   ← Tailwind imports

  lib/                        ← Pure utilities (no React unless suffixed .tsx)
    schemas.ts                ← Zod schemas for all 15 dw_* tables
    supabase.ts               ← dbLoad/dbSync/dbDelete + storage upload
    constants.ts              ← Colors, MONTHS, FREQ_DAYS, JOB_STATUSES, inp
    format.ts                 ← fmt/fmtD/fmtT/fmtDT/cStatus/dLeft
    auth.ts                   ← hashPw (Web Crypto SHA-256)
    offline.ts                ← localStorage queue + Background Sync
    monthly.tsx               ← MonthTabs/PrintReportButtons + helpers
    logo.ts                   ← Inline base64 LOGO + APP_NAME/APP_SUB
    seeds.ts                  ← INITIAL_USERS / SEED_STAFF / INITIAL_SUPPLY_MASTER

  components/
    ui/
      primitives.tsx          ← Card, Fld, SBadge, KPI, RadioG, StarRating, SaveBtn
      ModalWrap.tsx           ← Modal shell
      Toaster.tsx             ← <Toaster/> + useToast hook
      useConfirm.tsx          ← ConfirmModal + useConfirm hook
      ErrorBoundary.tsx       ← Per-page crash isolation
    pickers.tsx               ← StaffSelect, StaffMultiPicker, ContactSearchSelect
    GlobalSearch.tsx          ← ⌘K palette
    NotifPanel.tsx            ← Bell-icon dropdown + buildNotifs()

  pages/                      ← One file per top-level module (16 pages)
    Login.tsx          Dashboard.tsx     Clients.tsx
    Contracts.tsx      Requests.tsx      Jobs.tsx
    Schedule.tsx       SiteReports.tsx   Inventory.tsx
    Requisitions.tsx   AbsenceCover.tsx  Birthdays.tsx
    Imprest.tsx        Assessments.tsx   Analytics.tsx
    Staff.tsx          Settings.tsx
```

## Data validation

Every record read from / written to Supabase passes through a Zod schema
(see `src/lib/schemas.ts`). Mode is **coerce-and-warn**:

- Numeric strings are auto-coerced (`"100"` → `100`)
- Missing fields fall back to safe defaults via `.catch()`
- Bad rows log a single warning but never break the UI

This kills the entire class of bugs that previously caused things like the
₦228-quadrillion portfolio total (string concatenation in a sum reducer).
Phase 4 of the migration also surfaced and fixed ~12 latent type bugs.

## Modules

| Module | What it does |
|---|---|
| Dashboard | Today's jobs, contract alerts, low-stock, KPIs |
| Clients | Roster + contact directory + ContactSearchSelect autocomplete |
| Contracts | Status filter + Renew modal |
| Requests | Inbound service requests → convert to jobs |
| Jobs | Monthly-tabbed, with GPS check-in/out for technicians |
| Schedule | Recurring pest-control visits with auto-next-due |
| Site Reports | Multi-section inspection form + photo upload + PDF reports |
| Inventory | Stock + low-stock alerts |
| Requisitions | Monthly supply requisitions + approval workflow |
| Absence & Cover | Staff absences + cover assignments + CSV export |
| Birthdays | DOB tracking per staff |
| Imprest Fund | Monthly imprest accounts + carry-forward + expenses |
| Site Assessments | Pre-job assessment wizard + convert to Service Request |
| Analytics | KPI grid + Recharts visualizations |
| Staff | Field employee directory + payroll CSV export |
| Settings | App-user CRUD + activity log |

## Deploy

Pushed commits on `main` auto-deploy to Vercel. Before pushing:

```bash
rm -rf node_modules build && npm ci && CI=true npm run build
```

This matches Vercel's pipeline exactly (clean install + warnings-as-errors).
Never push without it.
