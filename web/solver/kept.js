// One solved flop kept on the device (IndexedDB), so that Play has a hand to deal the moment it is next opened: the spot it
// was solved for, its three cards, the betting it was solved with and the strategy's numbers. The newest solve replaces
// the one kept. Everything here fails quietly: with no storage, Play solves from scratch as before.
const NAME = 'pareto-kept'; const STORE = 'flops'; const SLOT = 'last'; const NOTE = 'note';
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

/** Keep a solved flop in place of the one kept, if it is no larger than `most` bytes (storing copies it once more, which
 *  a phone short of memory cannot always afford). Resolved once the numbers have been copied for storing, so that their
 *  buffer may then be handed on. */
export async function keepFlop(record, most = MOST) {
  const d = await open(); if (!d || record.sums.byteLength > Math.min(most, MOST)) return;
  try { const store = d.transaction(STORE, 'readwrite').objectStore(STORE); store.put(record, SLOT); store.put({ sig: record.sig, cards: record.cards }, NOTE); } catch { /* not kept */ }
}

/** What the flop kept was solved for and its cards, without its numbers: `{ sig, cards }`, or null. */
export const keptNote = () => read(NOTE);
/** The flop kept, or null. */
export const keptFlop = () => read(SLOT);

async function read(slot) {
  const d = await open(); if (!d) return null;
  return new Promise((done) => {
    try { const ask = d.transaction(STORE).objectStore(STORE).get(slot); ask.onsuccess = () => done(ask.result ?? null); ask.onerror = () => done(null); } catch { done(null); }
  });
}
