const CACHE_NAME = "quiet-scribe-shell-v4";
const CACHE_PREFIX = "quiet-scribe-shell-";

// Derive the app root from the worker registration scope. This works both
// at a domain root (Cloudflare Pages) and in a repository subpath (GitHub Pages).
const APP_ROOT = new URL("./", self.registration.scope);
const APP_PATH = APP_ROOT.pathname;
const appURL = (path) => new URL(path, APP_ROOT).href;
const SHELL = [
  appURL("./"),
  appURL("offline.html"),
  appURL("manifest.webmanifest"),
  appURL("icon.svg"),
  appURL("icon-192.png"),
  appURL("icon-512.png")
];

self.addEventListener("install", (event) => {
  // If a shell asset is unavailable, do not leave a broken partial cache.
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

  // Never intercept another app hosted on the same origin.
  if (url.pathname !== APP_PATH && !url.pathname.startsWith(APP_PATH.endsWith("/") ? APP_PATH : APP_PATH + "/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok && url.pathname === APP_PATH) {
          await cache.put(appURL("./"), response.clone());
        }
        return response;
      } catch {
        const cachedPage = await cache.match(request, { ignoreSearch: true });
        if (cachedPage) return cachedPage;
        return (await cache.match(appURL("offline.html"))) || (await cache.match(appURL("./")));
      }
    })());
    return;
  }

  const isStaticAsset = url.pathname.startsWith(APP_PATH + "assets/") ||
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
