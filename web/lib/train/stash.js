// The boards Train has solved ahead and not yet started, kept in the browser (IndexedDB) for the setup they were solved
// with, so the next visit asks its first question at once instead of solving from nothing. A board's solve stays with the
// worker that made it, so a kept board opens in Study from its flop rather than from a handover.
const DB = 'pareto'; const STORE = 'train'; const KEY = 'ahead';

function opened() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}

/** One request on the store, as a promise. */
async function request(mode, work) {
  const db = await opened();
  return new Promise((resolve, reject) => {
    const req = work(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}

const setupKey = (config) => JSON.stringify(config);
/** A board as kept: its street and decisions, with no hold on a solve this worker no longer has. */
const kept = (b) => ({ street: b.street, decisions: b.decisions.map((d) => ({ ...d, solve: null })) });

/** Keep the boards waiting (fails quietly where the browser keeps nothing). */
export function stash(game) {
  const value = { setup: setupKey(game.config), boards: game.boards.map((b) => kept(b.dealt)) };
  request('readwrite', (store) => store.put(value, KEY)).catch(() => {});
}

/** The boards kept for this setup, as the worker dealt them; none for another setup or where nothing is kept. */
export async function unstash(config) {
  try {
    const value = await request('readonly', (store) => store.get(KEY));
    return value?.setup === setupKey(config) ? value.boards : [];
  } catch { return []; }
}
