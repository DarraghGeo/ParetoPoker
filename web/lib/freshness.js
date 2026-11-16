// The installed app keeps itself current: a service worker that always asks the network first, a check for a newer build
// when the app opens and each time it comes back to the front, and a reload when one is there (only where nothing is lost:
// the home page, and Play before a hand is dealt, so that a spot being studied or a hand being played is never thrown away).
const BUILD = globalThis.PARETO_BUILD;

/** The newest build's version when it is not this one; null otherwise, and with no network. */
async function newerBuild() {
  try { const latest = (await (await fetch('version.json', { cache: 'no-store' })).json()).version; return latest && latest !== BUILD ? latest : null; } catch { return null; }
}
/** Reload for a newer build: once for each (were the reload still to give this build, it is not tried again), and only
 *  if nothing has been started in the time it took to ask. */
async function refresh(onHome) {
  if (!onHome()) return;
  const latest = await newerBuild(); if (!latest || !onHome()) return;
  try { if (sessionStorage.getItem('pareto-reloaded') === latest) return; sessionStorage.setItem('pareto-reloaded', latest); } catch { return; }
  location.reload();
}

export function keepFresh(onHome) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => { reg.update(); refresh(onHome); };
    check();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    addEventListener('pageshow', (ev) => { if (ev.persisted) check(); });
  }).catch(() => {});
}
