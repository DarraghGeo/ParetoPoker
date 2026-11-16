// A flop solved off to the side, for a hand Play will deal later: Play's own worker keeps the table and its turns and
// rivers, and one or two of these solve the flops ahead beside it, each handing its result back as the strategy's numbers.
// Where the page is cross-origin isolated (the service worker sees to that: sw.js) the solve is split across threads
// that share its memory, which is what makes a flop quick on a phone; where it is not, it runs on one, as before.
import { enableThreads } from 'poker-flopsolve/threads';
import { exportedFlop, flopJob } from '../solver/jobs.js';
import { pause } from '../solver/progress.js';

let task = 0; let threads = null;
const say = (message, transfer) => self.postMessage(message, transfer ?? []);
/** The threads to solve on, started once: as many as asked for, or one where they cannot be had. */
const threadsFor = (wanted) => (threads ??= wanted > 1 ? enableThreads(wanted).catch(() => 1) : Promise.resolve(1));

/** Solve one flop to the end, telling how far along it is; a newer task or a stop ends it early. */
async function solve({ id, epoch, config, cards, threads: wanted = 1 }) {
  const mine = ++task; let told = 0; let job = null;
  try {
    const n = await threadsFor(wanted); if (mine !== task) return;
    job = flopJob(config, cards, null, n); let result = null;
    while (!(result = job.step())) {
      if (mine !== task) return;
      if (Date.now() - told > 250) { told = Date.now(); say({ type: 'progress', id, epoch, done: job.done() }); }
      await pause();
    }
    const out = exportedFlop(result);
    if (!out) { say({ type: 'flop', id, epoch, failed: true, why: 'its storage cannot be handed over' }); return; }
    say({ type: 'flop', id, epoch, used: out.betting, sums: out.sums, threads: n }, [out.sums.buffer]);
  } catch (error) { say({ type: 'flop', id, epoch, failed: true, why: String(error?.message ?? error) }); } finally { job?.close(); }
}

self.onmessage = ({ data }) => { if (data.type === 'solve') solve(data); else if (data.type === 'stop') task++; };
