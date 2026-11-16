// The app's service worker: the newest build whenever there is a network, the last one seen when there is not, and no
// waiting on the network for what cannot have changed. The built files under assets/ carry a hash of their contents in
// their names, so one seen once is answered from the cache at once; the page itself and everything else go to the
// network first (skipping the browser's cache) and are kept for offline. `61390ced07` changes with every build, so a new
// build is a new worker, and it takes over at once.
const CACHE = 'pareto-61390ced07';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE && key !== 'pareto-fonts' && key !== 'pareto-assets') await caches.delete(key);
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
  if (/\/assets\/[^/]+-[\w-]{8,}\.\w+$/.test(new URL(request.url).pathname)) {
    event.respondWith((async () => {
      const kept = await caches.match(request); if (kept) return kept;
      const fresh = await fetch(request); if (fresh.ok) (await caches.open('pareto-assets')).put(request, fresh.clone());
      return fresh;
    })());
    return;
  }
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
