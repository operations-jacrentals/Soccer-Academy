const CACHE_PREFIX = "family-calendar-";
const CACHE_NAME = `${CACHE_PREFIX}shell-v2`;

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/event-art/church.png",
  "/event-art/dance.png",
  "/event-art/house.png",
  "/event-art/park.png",
  "/event-art/school.png",
  "/event-art/scouts.png",
  "/event-art/soccer.png",
  "/event-art/street-corner.png",
  "/event-art/work.png",
];

function isAppAsset(url) {
  return url.pathname.startsWith("/assets/");
}

function isStaticArtwork(url) {
  return url.pathname.startsWith("/event-art/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/icon-192.png" ||
    url.pathname === "/icon-512.png" ||
    url.pathname === "/icon-maskable-512.png" ||
    url.pathname === "/apple-touch-icon.png";
}

function isRscRequest(request, url) {
  return request.headers.has("RSC") ||
    request.headers.get("accept")?.includes("text/x-component") ||
    url.searchParams.has("_rsc");
}

async function cacheShell(response) {
  if (!response.ok || response.type === "opaqueredirect" || new URL(response.url).origin !== self.location.origin) {
    throw new Error("Calendar shell response was not cacheable");
  }
  const html = await response.clone().text();
  if (!html.includes('name="codex-preview"')) throw new Error("Calendar shell marker was missing");

  const assetUrls = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin).href);
  const assetResponses = await Promise.all(assetUrls.map(async (assetUrl) => {
    const assetResponse = await fetch(assetUrl, { cache: "reload" });
    if (!assetResponse.ok) throw new Error(`Calendar asset failed: ${assetUrl}`);
    return [assetUrl, assetResponse];
  }));

  const cache = await caches.open(CACHE_NAME);
  const currentAssets = new Set(assetUrls);
  const cachedRequests = await cache.keys();
  await Promise.all(assetResponses.map(([assetUrl, assetResponse]) => cache.put(assetUrl, assetResponse)));
  await cache.put("/", response.clone());
  await Promise.all(cachedRequests
    .filter((request) => new URL(request.url).pathname.startsWith("/assets/") && !currentAssets.has(request.url))
    .map((request) => cache.delete(request)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    const response = await fetch(new Request("/", { cache: "reload", credentials: "same-origin" }));
    await cacheShell(response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request, event) {
  try {
    const response = await fetch(request);
    if (response.ok) event.waitUntil(cacheShell(response.clone()).catch(() => undefined));
    return response;
  } catch {
    return (await caches.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => undefined));
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js" || isRscRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, event));
    return;
  }
  if (isAppAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isStaticArtwork(url)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
