// Play: full hands against the solved villain, off the main thread (see play/: dealing, solving ahead, the hand).
import { exported, exportedFlop } from '../solver/jobs.js';
import { onSolved, pump, status } from './play/schedule.js';
import { current, play, say } from './play/state.js';
import { heroActs, proceed, start } from './play/table.js';

// a solve finished: the hand on screen plays on if it was waiting for it, or the page hears a hand is ready
onSolved((job) => {
  if (job.hand === current()) { proceed(); return; }
  if (!current() && play.hands.some((h) => h.flop)) say({ type: 'ready' });
});

/** A street of the hand on the table, for Study: its flop, or a later street solved again here (by the key it is kept under). */
function share(solve) {
  const at = String(solve).indexOf('|'); const id = String(solve).slice(0, at); const key = String(solve).slice(at + 1);
  const hand = play.playing?.hand; if (!hand || String(hand.id) !== id) return null;
  const solved = key === 'flop' ? hand.flop : hand.next.get(key);
  return solved && !solved.failed ? solved : null;
}

const handlers = {
  setup(data) { Object.assign(play, { config: data.config, hands: [], playing: null, jobs: new Map() }); pump(); status(); },
  deal() { if (!start()) say({ type: 'waiting' }); },
  act(data) { heroActs(data.label); },
  export(data) {
    const solved = share(data.solve); const out = !solved ? null : solved.street === 'flop' ? exportedFlop(solved) : solved.oop ? exported(solved) : null;
    if (!out) { say({ type: 'export', ask: data.ask, found: false }); return; }
    say({ type: 'export', ask: data.ask, found: true, ...out }, [out.sums.buffer]);
  },
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
