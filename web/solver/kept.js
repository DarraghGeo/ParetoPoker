// The solved flops, kept whole on the device (IndexedDB) and out of memory: each flop Play solves is written here as it
// finishes, the last few of them (the hands on the table and waiting), so that Study can be handed the flop of a hand
// without solving it again, and so that Play has a hand to deal the moment it is next opened. A record is the spot the
// flop was solved for, its three cards, the betting it was solved with and the strategy's numbers; a note says which is
// the newest. Everything here fails quietly: with no storage, Play solves from scratch and Study solves its own.
const NAME = 'pareto-kept'; const STORE = 'flops'; const NOTE = 'note';
/** How many solved flops are kept: the hand on the table and the three that may wait behind it. */
const KEEP = 4;
/** Nothing larger than this is kept, in bytes. */
const MOST = 400 * 2 ** 20;
let db = null;
const open = () => (db ??= new Promise((done) => {
  try {
    const ask = indexedDB.open(NAME, 1);
    ask.onupgradeneeded = () => ask.result.createObjectStore(STORE);
    ask.onsuccess = () => done(ask.result); ask.onerror = () => done(null); ask.onblocked = () => done(null);
  } catch { done(null); }
}));

/** What a kept flop was solved for: the two ranges, pot, stack and betting. */
export const sigOf = (c) => JSON.stringify([c.oop, c.ip, c.pot, c.stack, c.bets, c.raises, c.maxRaises, c.allIn]);

/** Throw away all but the newest flops kept (their keys sort by when they were written; an older build's single slot goes too). */
function prune(store) {
  const ask = store.getAllKeys();
  ask.onsuccess = () => { const flops = ask.result.filter((k) => k !== NOTE).sort(); for (const k of flops.slice(0, Math.max(0, flops.length - KEEP))) store.delete(k); for (const k of flops) if (!String(k).startsWith('f')) store.delete(k); };
}

/** Keep a solved flop, if it is no larger than `most` bytes (storing copies it once more). Resolved, with the key it is
 *  kept under (null if it was not), once it is safely written: a key given out is a flop that can be read. */
export async function keepFlop(record, most = MOST) {
  const d = await open(); if (!d || record.sums.byteLength > Math.min(most, MOST)) return null;
  const key = `f${Date.now().toString(36).padStart(9, '0')}${Math.random().toString(36).slice(2, 6)}`;
  return new Promise((done) => {
    try {
      const tx = d.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE);
      store.put(record, key); store.put({ sig: record.sig, cards: record.cards, key }, NOTE); prune(store);
      tx.oncomplete = () => done(key); tx.onerror = () => done(null); tx.onabort = () => done(null);
    } catch { done(null); }
  });
}

/** The newest flop kept, without its numbers: `{ sig, cards, key }`, or null. */
export const keptNote = () => read(NOTE);
/** A flop kept, by its key, or null. */
export const readFlop = (key) => (key ? read(key) : Promise.resolve(null));

async function read(slot) {
  const d = await open(); if (!d) return null;
  return new Promise((done) => {
    try { const ask = d.transaction(STORE).objectStore(STORE).get(slot); ask.onsuccess = () => done(ask.result ?? null); ask.onerror = () => done(null); } catch { done(null); }
  });
}
