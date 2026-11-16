// The app's service worker: the newest build whenever there is a network, the last one seen when there is not, and no
// waiting on the network for what cannot have changed. The built files under assets/ carry a hash of their contents in
// their names: this build's are fetched once, when the worker is installed, and answered from the cache from then on
// (the ones of builds before are thrown away). The page itself and everything else go to the network first (skipping
// the browser's cache), for two seconds at most before the copy kept is shown instead, and are kept for offline.
// `20b6c1c863` changes with every build, so a new build is a new worker, and it takes over at once.
// Everything of the app's own is answered with the headers that make the page cross-origin isolated, which GitHub Pages
// cannot send itself: that is what lets a solve be split across threads (workers/flop.js). The typefaces, from elsewhere,
// are asked for with CORS so that they still load on such a page.
const CACHE = 'pareto-20b6c1c863';
const ASSETS = ["assets/Play-BtiHalur.js","assets/StudyPage-CrCQ_bnz.js","assets/bitval-B2XgIrqC.js","assets/evaluator-BhiR7e2W.js","assets/evaluator-DzLyv7ye.js","assets/flop-DhdFjw0G.js","assets/game.svelte-B0mXNAYS.js","assets/index-C-WV8r0X.css","assets/index-DhnE8Lvi.js","assets/play-DXz1j3-7.js","assets/rolldown-runtime-BWaJ3C7D.js","assets/study-CReMYlyh.js"];
const FONTS = 'pareto-fonts-2';
const KEPT = [CACHE, FONTS, 'pareto-assets'];
/** How long the page waits on the network before the copy kept is shown, in milliseconds. */
const PATIENCE = 2000;
const here = (name) => new URL(name, self.registration.scope).href;

/** This build's files, each fetched unless already kept; one that fails is fetched when first asked for instead. */
async function precache() {
  const cache = await caches.open('pareto-assets');
  await Promise.all(ASSETS.map(async (name) => { try { if (!(await cache.match(here(name)))) await cache.add(here(name)); } catch { /* fetched when asked for */ } }));
}
/** Throw away the caches of builds before, and their files under assets/. */
async function prune() {
  for (const key of await caches.keys()) if (!KEPT.includes(key)) await caches.delete(key);
  const cache = await caches.open('pareto-assets'); const mine = new Set(ASSETS.map(here));
  for (const request of await cache.keys()) if (!mine.has(request.url)) await cache.delete(request);
}
self.addEventListener('install', (event) => { self.skipWaiting(); event.waitUntil(precache()); });
self.addEventListener('activate', (event) => event.waitUntil(prune().then(() => self.clients.claim())));

/** The typefaces come from elsewhere and never change: kept once seen, and with no network an empty answer at once, so
 *  that the page does not hang waiting for them. */
async function typeface(request) {
  const cache = await caches.open(FONTS); const kept = await cache.match(request);
  if (kept) return kept;
  try { const fresh = await fetch(request); if (fresh.ok) cache.put(request, fresh.clone()); return fresh; } catch { return new Response('', { status: 200, headers: { 'content-type': 'text/css' } }); }
}
/** An answer with the headers of a cross-origin isolated page. */
function isolated(response) {
  if (!response || response.status === 0 || response.type === 'error') return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin'); headers.set('Cross-Origin-Embedder-Policy', 'require-corp'); headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
/** A built file: from the cache, or fetched and kept. */
async function asset(request) {
  const kept = await caches.match(request); if (kept) return kept;
  const fresh = await fetch(request); if (fresh.ok) (await caches.open('pareto-assets')).put(request, fresh.clone());
  return fresh;
}
/** Everything else: the network's answer if it comes in time (kept for later either way), else the copy kept. */
async function newest(request) {
  const cache = await caches.open(CACHE);
  const kept = async () => (await cache.match(request)) ?? (await cache.match(request, { ignoreSearch: true }));
  const fresh = fetch(request, { cache: 'no-store' }).then((answer) => { if (answer.ok) cache.put(request, answer.clone()); return answer; });
  const late = new Promise((resolve) => setTimeout(resolve, PATIENCE)).then(kept);
  try { return (await Promise.race([fresh, late])) ?? (await fresh); } catch { return (await kept()) ?? Response.error(); }
}
self.addEventListener('fetch', (event) => {
  const { request } = event; if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { event.respondWith(typeface(request)); return; }
  if (url.origin !== self.location.origin) return;
  event.respondWith((/\/assets\/[^/]+-[\w-]{8,}\.\w+$/.test(url.pathname) ? asset(request) : newest(request)).then(isolated));
});
