# Dust & Wipes Operations Hub — Deployment Guide
## From JSX file → app.dustandwipes.com (PWA)

---

## What's in this package

```
pwa-assets/
├── manifest.json              ← PWA identity & icon config
├── sw.js                      ← Service worker (offline + caching)
├── index.html                 ← Main HTML file (replaces CRA default)
├── offline.html               ← Page shown when user has no connection
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── icon-72x72.png             ← Android Chrome small
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png           ← Windows tile
├── apple-touch-icon.png       ← iPhone home screen (180px)
├── apple-touch-icon-152x152.png
├── icon-192x192.png           ← Android home screen
├── icon-256x256.png
├── icon-384x384.png
├── icon-512x512.png           ← PWA splash + high-res
└── splash-1170x2532.png       ← iPhone 14 Pro splash screen
```

---

## STEP 1 — Set up the React project (one-time, on any computer)

### Prerequisites
- Install **Node.js** from https://nodejs.org (choose "LTS" version)
- Install **Git** from https://git-scm.com

### Create the project
```bash
npx create-react-app dustandwipes-hub
cd dustandwipes-hub
```

### Install dependencies
```bash
npm install recharts lucide-react
```

### Replace the app code
1. Open `src/App.js` — delete ALL its contents
2. Paste the entire contents of `OperationsHub_v5.jsx` into it
3. Save

### Copy PWA files into place
Copy this entire `pwa-assets/` folder's files as follows:

| This file                    | Goes to                          |
|------------------------------|----------------------------------|
| `manifest.json`              | `public/manifest.json`           |
| `sw.js`                      | `public/sw.js`                   |
| `index.html`                 | `public/index.html` (replace)    |
| `offline.html`               | `public/offline.html`            |
| All `icon-*.png` files       | `public/icons/` (create folder)  |
| All `favicon-*.png` files    | `public/icons/`                  |
| `apple-touch-icon*.png`      | `public/icons/`                  |
| `splash-*.png`               | `public/icons/`                  |

### Test locally
```bash
npm start
```
Open http://localhost:3000 — the full app should appear.

---

## STEP 2 — Push to GitHub

```bash
# Inside your dustandwipes-hub folder:
git init
git add .
git commit -m "Initial Dust & Wipes Operations Hub"
```

Go to https://github.com → **New repository** → name it `dustandwipes-hub` → Create

```bash
git remote add origin https://github.com/YOUR_USERNAME/dustandwipes-hub.git
git branch -M main
git push -u origin main
```

---

## STEP 3 — Deploy on Vercel

1. Go to https://vercel.com → Sign up / Log in with GitHub
2. Click **"Add New Project"**
3. Select `dustandwipes-hub` from your repositories
4. Vercel auto-detects Create React App — click **Deploy**
5. Wait ~2 minutes — app is live at `dustandwipes-hub.vercel.app`

### Every future update
```bash
# Make your changes, then:
git add .
git commit -m "Update: describe what changed"
git push
# Vercel auto-deploys within 60 seconds
```

---

## STEP 4 — Connect app.dustandwipes.com

### In Vercel
1. Project → **Settings → Domains**
2. Type `app.dustandwipes.com` → Click **Add**
3. Copy the **CNAME value** Vercel gives you (e.g. `cname.vercel-dns.com`)

### In your domain registrar's DNS panel
Add a new DNS record:

| Type  | Name  | Value                    | TTL  |
|-------|-------|--------------------------|------|
| CNAME | app   | cname.vercel-dns.com     | Auto |

Common DNS panel locations:
- **Namecheap** → Domain List → Manage → Advanced DNS
- **Qservers / Web4Africa** → cPanel → Zone Editor
- **GoDaddy** → My Products → DNS

Wait 5–30 minutes. The app is then live at https://app.dustandwipes.com with HTTPS automatic.

---

## STEP 5 — Staff install it as a mobile app (PWA)

No App Store needed. Each staff member does this once:

### Android (any phone — Chrome browser)
1. Open **Chrome** → go to `app.dustandwipes.com`
2. Log in once
3. Tap **⋮ (three dots)** → **"Add to Home Screen"**
4. Tap **Add** on the prompt
5. Dust & Wipes icon now appears on home screen ✅

### iPhone / iPad (Safari browser)
1. Open **Safari** → go to `app.dustandwipes.com`
2. Log in once
3. Tap the **Share button** (box with arrow pointing up)
4. Scroll down → tap **"Add to Home Screen"**
5. Tap **Add**
6. Dust & Wipes icon now appears on home screen ✅

Once installed, the app:
- Opens full-screen (no browser bar)
- Shows the Dust & Wipes splash screen on launch
- Works on poor/slow connections (cached assets load instantly)
- Shows offline page if completely disconnected
- Can receive push notifications (once Supabase backend is connected)

---

## STEP 6 — One-time verification checklist

After deployment, verify everything works:

- [ ] https://app.dustandwipes.com loads the login page
- [ ] HTTPS padlock is shown (auto by Vercel)
- [ ] Logo appears on login screen
- [ ] Admin login works: bisit@dustandwipes.com / Password123#
- [ ] Supervisor login: james.akpa@dustandwipes.com / Password123#
- [ ] Technician login: 08183006297 / Clean123#
- [ ] On Android Chrome: "Add to Home Screen" prompt appears
- [ ] On iPhone Safari: icon installs and opens full-screen
- [ ] Disconnect Wi-Fi → visit app → offline.html appears
- [ ] Reconnect → app reloads automatically

---

## Future: Supabase Backend (Phase 2)

Once Supabase is connected:
- All data persists permanently across devices and sessions
- Supervisors receive real email alerts for requisitions and contracts
- Push notifications go to technician phones
- GPS coordinates validated against site addresses
- Offline form submissions sync automatically when back online

Setup guide: https://supabase.com/docs/guides/getting-started

---

## Support
For deployment issues contact your app developer.
App built for Dust & Wipes Limited, Abuja, Nigeria.
