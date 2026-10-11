const CACHE_NAME = "quiet-scribe-shell-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("quiet-scribe-shell-") && key !== CACHE_NAME)
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
        if (response && response.ok) await cache.put("/", response.clone());
        return response;
      } catch {
        return (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/"));
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
    return cached || await network;
  })());
});
