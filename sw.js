const CACHE_NAME = "quiet-scribe-shell-v3";
const CACHE_PREFIX = "quiet-scribe-shell-";
const SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  // Do not force an update over an active writing session.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok && url.pathname === "/") {
          await cache.put("/", response.clone());
        }
        return response;
      } catch {
        const cachedPage = await cache.match(request, { ignoreSearch: true });
        if (cachedPage) return cachedPage;
        return (await cache.match("/offline.html")) || (await cache.match("/"));
      }
    })());
    return;
  }

  const isStaticAsset = url.pathname.startsWith("/assets/") ||
    /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|woff2?|ttf|otf)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(async (response) => {
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    }).catch(() => cached);
    // Return cached files quickly while refreshing them for the next visit.
    return cached || await network;
  })());
});
