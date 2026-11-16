// The installed app keeps itself current: a service worker that always asks the network first, a check for a newer build
// when the app opens and each time it comes back to the front, and a reload when one is there (only where nothing is lost:
// the home page, and Play before a hand is dealt, so that a spot being studied or a hand being played is never thrown away).
const BUILD = globalThis.PARETO_BUILD;

async function newerBuild() {
  try { const latest = (await (await fetch('version.json', { cache: 'no-store' })).json()).version; return latest && latest !== BUILD; } catch { return false; }
}

export function keepFresh(onHome) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = async () => { reg.update(); if (onHome() && (await newerBuild())) location.reload(); };
    check();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    addEventListener('pageshow', (ev) => { if (ev.persisted) check(); });
  }).catch(() => {});
}
