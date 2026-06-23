// Minimal service worker to make the wallet installable as a PWA.
// Network-first passthrough; no aggressive caching (vouchers must stay fresh).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Let the browser handle requests normally.
});
