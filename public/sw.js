// ─────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Service Worker
//  File: public/sw.js
//  Bump CACHE_VERSION on every new deployment
// ─────────────────────────────────────────────────────────────

const CACHE_VERSION = "dw-hub-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/offline.html"
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.origin.match(/dustandwipes\.com|localhost/)) return;

  // API / Supabase → network first
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Page navigation → network first, fall back to cached index
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then(c => c || caches.match("/offline.html"))
      )
    );
    return;
  }

  // Static assets → cache first
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
      JSON.stringify({ error: "Offline — no cached data" }),
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
    if (request.destination === "image") return caches.match("/icons/icon-192x192.png");
    return new Response("Offline", { status: 503 });
  }
}

// ── Push Notifications ────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "D&W Operations Hub", {
      body:    data.body || "New notification",
      icon:    "/icons/icon-192x192.png",
      badge:   "/icons/icon-72x72.png",
      vibrate: [200, 100, 200],
      data:    { url: data.url || "/" },
      actions: [
        { action: "open",    title: "Open App" },
        { action: "dismiss", title: "Dismiss"  }
      ]
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});
