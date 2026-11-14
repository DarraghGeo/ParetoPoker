// The app's service worker. Its one job: the newest build whenever there is a network, the last one seen when there is not.
// Every request for the app's own files goes to the network first and skips the browser's cache; what comes back is kept
// for offline. `94da7f0c65` changes with every build, so a new build is a new worker, and it takes over at once.
const CACHE = 'pareto-94da7f0c65';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE && key !== 'pareto-fonts') await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const host = new URL(request.url).hostname;
  // The typefaces come from elsewhere and never change: kept once seen, and with no network an empty answer
  // at once, so that the page does not hang waiting for them
  if (host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open('pareto-fonts'); const kept = await cache.match(request);
      if (kept) return kept;
      try { const fresh = await fetch(request); if (fresh.ok || fresh.type === 'opaque') cache.put(request, fresh.clone()); return fresh; } catch { return new Response('', { status: 200, headers: { 'content-type': 'text/css' } }); }
    })());
    return;
  }
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(request, { cache: 'no-store' });
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch {
      return (await cache.match(request)) ?? (await cache.match(request, { ignoreSearch: true })) ?? Response.error();
    }
  })());
});
