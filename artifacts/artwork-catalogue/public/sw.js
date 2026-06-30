const APP_SHELL_CACHE = "hourglass-app-shell-v1";
const APP_SHELL_FILES = ["/", "/index.html", "/hourglass-logo.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== APP_SHELL_CACHE && !name.startsWith("hourglass-images"))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Network-first for navigation/app shell, cache-first for images
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Image cache: cache-first (images don't change once uploaded)
  if (url.pathname.includes("/storage/v1/object/public/artwork-images/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open("hourglass-images-v1").then((cache) => cache.put(req, resClone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // App shell: network-first, fallback to cache when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }
});
