const CACHE_PREFIX = "umaplanner-";
const CACHE_NAME = `${CACHE_PREFIX}shell-v1`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-180.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-512-maskable.png",
  "/fazed.webp",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);

    const index = await cache.match("/index.html");
    const html = await index?.text();
    const assets = html
      ? [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
        .map((match) => match[1])
      : [];
    if (assets.length > 0) {
      await cache.addAll(assets);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      let response;
      try {
        response = await fetch(request);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match(request) ?? await cache.match("/index.html");
        if (!offlinePage) {
          throw new Error("The app shell is not available for offline navigation.");
        }
        return offlinePage;
      }

      if (response.ok && !url.search) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (error) {
          console.error("Unable to cache the app page:", error);
        }
      }
      return response;
    })());
    return;
  }

  const isAppAsset = url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    APP_SHELL.includes(url.pathname);
  if (!isAppAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
