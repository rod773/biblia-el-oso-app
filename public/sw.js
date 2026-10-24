const VERSION = "v1";
const STATIC_CACHE = `biblia-oso-static-${VERSION}`;
const PAGES_CACHE = `biblia-oso-pages-${VERSION}`;
const RUNTIME_CACHE = `biblia-oso-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== STATIC_CACHE &&
                key !== PAGES_CACHE &&
                key !== RUNTIME_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Scanned book pages: cache-first (immutable content, big payloads)
  if (url.pathname.startsWith("/pages/")) {
    event.respondWith(cacheFirst(request, PAGES_CACHE));
    return;
  }

  // Hashed Next.js build assets: cache-first (immutable filenames)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigations: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
