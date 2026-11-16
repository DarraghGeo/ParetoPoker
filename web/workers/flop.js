// A flop solved off to the side, for a hand Play will deal later: Play's own worker keeps the table and its turns and
// rivers, and one or two of these solve the flops ahead beside it, each handing its result back as the strategy's numbers.
import { exportedFlop, flopJob } from '../solver/jobs.js';
import { pause } from '../solver/progress.js';

let task = 0;
const say = (message, transfer) => self.postMessage(message, transfer ?? []);

/** Solve one flop to the end, telling how far along it is; a newer task or a stop ends it early. */
async function solve({ id, epoch, config, cards }) {
  const mine = ++task; let told = 0;
  try {
    const job = flopJob(config, cards); let result = null;
    while (!(result = job.step())) {
      if (mine !== task) return;
      if (Date.now() - told > 250) { told = Date.now(); say({ type: 'progress', id, epoch, done: job.done() }); }
      await pause();
    }
    const out = exportedFlop(result);
    if (!out) { say({ type: 'flop', id, epoch, failed: true, why: 'its storage cannot be handed over' }); return; }
    say({ type: 'flop', id, epoch, used: out.betting, sums: out.sums }, [out.sums.buffer]);
  } catch (error) { say({ type: 'flop', id, epoch, failed: true, why: String(error?.message ?? error) }); }
}

self.onmessage = ({ data }) => { if (data.type === 'solve') solve(data); else if (data.type === 'stop') task++; };
