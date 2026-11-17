// Study's solver, off the main thread: solves a spot with poker-flopsolve and answers questions about it.
import { RangeManager } from 'poker-rangeman';
import { profile } from '../../src/explain/profile.js';
import { readFlop } from '../solver/kept.js';
import { held, say } from './study/held.js';
import { preview } from './study/preview.js';
import { QUESTIONS, ask, fits } from './study/questions.js';
import { solve } from './study/solve.js';

/** What the setup's ranges are on the board, in words: counted here so that the page is never held up by it, and kept
 *  for the spots seen before. */
const profiles = new Map();
async function describe(data) {
  const key = [data.oop, data.ip, data.board.join('')].join('|');
  if (!profiles.has(key)) { if (profiles.size > 40) profiles.clear(); profiles.set(key, await profile(RangeManager, data)); }
  say({ type: 'profile', job: data.job, spot: profiles.get(key) });
}

const handlers = {
  stop: () => { held.halt = true; },
  adopt: (data) => {
    if (!data.kept) { held.adopted = { key: data.key, sums: data.sums, exploit: data.exploit, lite: !!data.lite }; return; }
    // a flop kept on the device: read from there, and the solve that follows waits for it (solve.js)
    held.adopting = readFlop(data.kept).then((r) => { held.adopted = r ? { key: data.key, sums: r.sums, exploit: data.exploit, lite: true } : null; }).catch(() => {}).finally(() => { held.adopting = null; });
  },
  solve, fits, preview, profile: describe,
  ...Object.fromEntries(QUESTIONS.map((type) => [type, ask])),
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
