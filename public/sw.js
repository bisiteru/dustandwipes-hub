// ─────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Service Worker
//  File: public/sw.js
//  Version: bump CACHE_VERSION whenever you deploy a new build
// ─────────────────────────────────────────────────────────────

const CACHE_VERSION = "dw-hub-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// ── Files to cache immediately on install ───────────────────
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/vendors~main.chunk.js",
  "/static/js/bundle.js",
  "/static/css/main.chunk.css",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/offline.html"
];

// ── Install: pre-cache all static assets ─────────────────────
self.addEventListener("install", event => {
  console.log("[SW] Installing Dust & Wipes Hub service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log("[SW] Pre-caching static assets");
      // Use individual adds so one failure doesn't block the rest
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(err =>
          console.warn(`[SW] Failed to cache ${url}:`, err)
        ))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener("activate", event => {
  console.log("[SW] Activating new service worker...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests we don't control
  if (request.method !== "GET") return;
  if (!url.origin.match(/dustandwipes\.com|localhost/)) return;

  // API calls → network first, fall back to cached version
  if (url.pathname.startsWith("/api/") ||
      url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation requests (page loads) → network first, serve cached HTML if offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then(cached =>
          cached || caches.match("/offline.html")
        )
      )
    );
    return;
  }

  // Static assets → cache first, then network
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: "Offline — no cached data available" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a placeholder for images when offline
    if (request.destination === "image") {
      return caches.match("/icons/icon-192x192.png");
    }
    return new Response("Offline", { status: 503 });
  }
}

// ── Background Sync: queue failed form submissions ───────────
// Requires Supabase backend — stub ready for wiring up
self.addEventListener("sync", event => {
  if (event.tag === "sync-requisitions") {
    console.log("[SW] Background sync: requisitions");
    event.waitUntil(syncPendingRequisitions());
  }
  if (event.tag === "sync-site-reports") {
    console.log("[SW] Background sync: site reports");
    event.waitUntil(syncPendingSiteReports());
  }
});

async function syncPendingRequisitions() {
  // TODO: read from IndexedDB queue, POST to Supabase, clear queue
  console.log("[SW] Syncing pending requisitions to server...");
}

async function syncPendingSiteReports() {
  // TODO: read from IndexedDB queue, POST to Supabase, clear queue
  console.log("[SW] Syncing pending site reports to server...");
}

// ── Push Notifications ────────────────────────────────────────
// Triggered by Supabase Edge Functions for contract alerts etc.
self.addEventListener("push", event => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body:    data.body    || "New notification from Dust & Wipes Hub",
    icon:    "/icons/icon-192x192.png",
    badge:   "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data:    { url: data.url || "/" },
    actions: [
      { action: "open",    title: "Open App" },
      { action: "dismiss", title: "Dismiss"  }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || "D&W Operations Hub",
      options
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
