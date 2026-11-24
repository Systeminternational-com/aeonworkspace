/* AEON service worker: makes the app installable and fast. Bump VERSION when you want to force-refresh caches. */
const VERSION = "aeon-v2";
const SHELL = ["./", "index.html", "style.css", "aeonapp.js", "manifest.webmanifest", "assets/logo.png", "assets/icon-192.png", "assets/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const own = u.origin === location.origin, lib = u.hostname === "www.gstatic.com" && u.pathname.includes("/firebasejs/");
  if (!own && !lib) return;                      // Firestore / Auth API traffic always goes straight to the network
  if (lib) {                                     // Firebase library files: cache first
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
    return;
  }
  e.respondWith(fetch(r).then(res => {           // Your own files: network first, so updates show immediately; cache is the offline fallback
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r).then(hit => hit || caches.match("index.html"))));
});
