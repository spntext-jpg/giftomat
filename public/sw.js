// GIFTOMAT_SPRINT4_V1_SW
// Ванильный service worker без сборочных плагинов (Turbopack ещё не дружит с Serwist
// на офлайн-кеше — см. официальный гайд Next.js по PWA). Стратегия:
//   - /_next/static/* — контент-хэшированные файлы, безопасно кешировать навсегда;
//   - навигация (HTML) — network-first с фолбэком на кеш (всегда свежая версия онлайн,
//     рабочий шелл офлайн);
//   - всё остальное (шрифт, gif.js, gif.worker.js, favicon) — cache-first с обновлением
//     кеша в фоне.
//
// Если меняете /gif.js, /gif.worker.js или другой некэш-хэшированный файл из public/ —
// поднимите CACHE_VERSION ниже, иначе офлайн-пользователи получат старую копию.
const CACHE_VERSION = "giftomat-v1";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/gif.js",
  "/gif.worker.js",
  "/giftomat-favicon-stack-v4.png?v=20260728-v4",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Один из ресурсов недоступен при установке — не блокируем активацию SW.
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
  if (url.origin !== self.location.origin) return;
  // Blob-URL — локально сгенерированные GIF/PDF/изображения, сеть тут не участвует.
  if (url.protocol === "blob:") return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
