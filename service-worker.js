const CACHE_NAME = "hos-profit-engine-v3";

const APP_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // Always check the network first for HTML so new app versions appear.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put("/index.html", responseClone);
          });

          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Other files can continue using the cache-first strategy.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    })
  );
});

