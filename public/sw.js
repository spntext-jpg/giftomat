// GIFTOMAT_PRODUCTION_RELEASE_V1_SW
// Static Next.js chunks are immutable. Public runtime assets use stale-while-revalidate,
// so an installed PWA opens immediately but still receives the next production revision.
const CACHE_VERSION = "giftomat-v2";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/gif.js",
  "/gif.worker.js",
  "/html-to-image.js",
  "/giftomat-favicon-stack-v4.png?v=20260728-v4",
];

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Offline support must never block activation of the main application.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.protocol === "blob:") return;

  if (url.pathname.startsWith("/_next/static/")) {
    const network = fetchAndCache(request);
    event.waitUntil(network.then(() => undefined).catch(() => undefined));
    event.respondWith(caches.match(request).then((cached) => cached || network));
    return;
  }

  if (request.mode === "navigate") {
    const network = fetchAndCache(request);
    event.waitUntil(network.then(() => undefined).catch(() => undefined));
    event.respondWith(
      network.catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const network = fetchAndCache(request);
  event.waitUntil(network.then(() => undefined).catch(() => undefined));
  event.respondWith(caches.match(request).then((cached) => cached || network));
});
