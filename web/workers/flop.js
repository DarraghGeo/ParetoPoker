// A flop solved off to the side, for a hand Play will deal later: Play's own worker keeps the table and its turns and
// rivers, and one or two of these solve the flops ahead beside it. A solved flop is made slim here for the hand that will
// be dealt onto it (solver/slim.js) and only that is handed back: the solve itself, 75 to 120 MB of it, never leaves this
// worker and is let go of with the next one. The newest is also kept on the device, where it is small enough, for a hand
// to deal at the next start (`kept`: a hand dealt onto that one, read back and made slim the same way).
// Where the page is cross-origin isolated (the service worker sees to that: sw.js) the solve is split across threads
// that share its memory; where it is not, it runs on one, as before.
import { enableThreads } from 'poker-flopsolve/threads';
import { exportedFlop, flopFrom, flopJob } from '../solver/jobs.js';
import { keepFlop, keptFlop, sigOf } from '../solver/kept.js';
import { pause } from '../solver/progress.js';
import { slimFlop } from '../solver/slim.js';

let task = 0; let threads = null;
const say = (message) => self.postMessage(message);
/** The threads to solve on, started once: as many as asked for, or one where they cannot be had. */
const threadsFor = (wanted) => (threads ??= wanted > 1 ? enableThreads(wanted).catch(() => 1) : Promise.resolve(1));

/** The flop kept on the device, read back whole, if it is the one this hand was dealt onto; else null. */
async function fromKept({ config, cards }) {
  try {
    const kept = await keptFlop(); if (!kept || kept.sig !== sigOf(config) || kept.cards.join() !== cards.join()) return null;
    return flopFrom(config, cards, kept.used, kept.sums);
  } catch { return null; }
}

/** Solve a flop to the end, telling how far along it is; null when a newer task or a stop ended it early. */
async function solved(need, mine, n) {
  const { id, epoch, config, cards } = need; const job = flopJob(config, cards, null, n); let told = 0; let result = null;
  try {
    while (!(result = job.step())) {
      if (mine !== task) return null;
      if (Date.now() - told > 250) { told = Date.now(); say({ type: 'progress', id, epoch, done: job.done() }); }
      await pause();
    }
    const slim = slimFlop(result, need.hand);
    // kept on the device for the next start, where it is small enough to copy once more
    const out = result.run.solver.ctx.strategySum.byteLength <= (need.keepUnder ?? 0) ? exportedFlop(result) : null;
    if (out) await keepFlop({ sig: sigOf(config), cards: [...cards], used: out.betting, sums: out.sums }, need.keepUnder);
    return { slim, bytes: result.run.solver.ctx.strategySum.byteLength };
  } finally { job.close(); }
}

/** One flop for one hand: read back from the device where it is the one kept, else solved. */
async function solve(need) {
  const { id, epoch } = need; const mine = ++task;
  try {
    const n = await threadsFor(need.threads ?? 1); if (mine !== task) return;
    const back = need.kept ? await fromKept(need) : null; if (mine !== task) return;
    const out = back ? { slim: slimFlop(back, need.hand), bytes: 0 } : await solved(need, mine, n);
    if (out && mine === task) say({ type: 'flop', id, epoch, slim: out.slim, solvedBytes: out.bytes, threads: n, readBack: !!back });
  } catch (error) { say({ type: 'flop', id, epoch, failed: true, why: String(error?.message ?? error) }); }
}

self.onmessage = ({ data }) => { if (data.type === 'solve') solve(data); else if (data.type === 'stop') task++; };
