// The service worker: lets the site open without internet and shows phone notifications.
//
// Offline: pages and their files are kept after the first visit; the user's own data (documents, payments,
// profile) and the guides are taken from the network when there is one and from the copy when there is not.
// On logout the page asks to forget the user's data (message "clear-user-data").
const VERSION = "muhojir-v1";
const SHELL = ["/", "/manifest.webmanifest", "/logo.svg", "/icon-192.png"];

// API lists kept for offline reading (GET only). Photos and receipts are not kept.
const OFFLINE_API = [
  "/api/auth/profile/",
  "/api/documents/my-documents/",
  "/api/documents/payments/",
  "/api/documents/document-types/",
  "/api/documents/regions/",
  "/api/documents/guide-steps/",
  "/api/documents/centers/",
  "/api/documents/news/",
  "/api/help/contacts/",
];
const USER_API = ["/api/auth/", "/api/documents/my-documents/", "/api/documents/payments/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl || request, response.clone());
    return response;
  } catch (error) {
    const saved = await cache.match(fallbackUrl || request);
    if (saved) return saved;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      // Every page is the same index.html; the app draws the rest.
      event.respondWith(networkFirst(request, "/"));
    } else if (url.pathname.startsWith("/assets/") || SHELL.includes(url.pathname) || url.pathname.startsWith("/icon")) {
      event.respondWith(cacheFirst(request)); // file names change with every build, so a kept copy is never stale
    } else if (OFFLINE_API.some((path) => url.pathname.startsWith(path)) && !/\/(photo|receipt)\/$/.test(url.pathname)) {
      event.respondWith(networkFirst(request));
    }
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "clear-user-data") return;
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      for (const request of await cache.keys()) {
        if (USER_API.some((path) => new URL(request.url).pathname.startsWith(path))) await cache.delete(request);
      }
    }),
  );
});

// Phone notifications sent by the server (accounts/push.py): {title, body, url}.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Muhojir.tj", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
