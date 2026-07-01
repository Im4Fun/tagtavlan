// Service worker: cachning med automatisk uppdatering + push-notiser.
// Höj CACHE_VERSION vid varje ny version för att tvinga fram en ren uppdatering.
const CACHE_VERSION = "tagtavlan-v1.1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// Installera: cacha appens filer och aktivera den nya versionen direkt.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

// Aktivera: ta bort gamla cache-versioner och ta över öppna sidor.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// Hämtning: network-first för appens egna filer så att en ny version på
// GitHub plockas upp direkt vid omstart; faller tillbaka på cache offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Hantera bara förfrågningar till samma ursprung (appens egna filer).
  // API-anrop till Supabase/Trafikverket går alltid direkt till nätet.
  if (url.origin !== self.location.origin) return;

  // config.js går alltid mot nätet och cachas aldrig, så att ändrade
  // nycklar/värden slår igenom omedelbart utan risk för en gammal version.
  if (url.pathname.endsWith("/config.js")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))),
  );
});

// ---- Push-notiser ----
self.addEventListener("push", (event) => {
  let data = { title: "Tågtavlan", body: "" };
  try { if (event.data) data = event.data.json(); } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      vibrate: [120, 60, 120],
      tag: data.tag || undefined,
      data: { url: "./" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    }),
  );
});
