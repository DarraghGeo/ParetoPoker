// Play: full hands against the solved villain, off the main thread (see play/: dealing, solving ahead, the hand).
import { exported } from '../solver/jobs.js';
import { onSolved, pump, status } from './play/schedule.js';
import { current, play, say } from './play/state.js';
import { heroActs, proceed, start } from './play/table.js';

// a solve finished: the hand on screen plays on if it was waiting for it, or the page hears a hand is ready
onSolved((job) => {
  if (job.hand === current()) { proceed(); return; }
  if (!current() && play.hands.some((h) => h.flop)) say({ type: 'ready' });
});

/** The street on screen, for Study, when it was solved again here. */
function share(solve) {
  const [id, key] = String(solve).split('|');
  const p = play.playing; const seg = p && String(p.hand.id) === id && p.seg.key === key ? p.seg.solved : null;
  return seg?.oop ? seg : null;
}

const handlers = {
  setup(data) { Object.assign(play, { config: data.config, hands: [], playing: null, jobs: new Map() }); pump(); status(); },
  deal() { if (!start()) say({ type: 'waiting' }); },
  act(data) { heroActs(data.label); },
  export(data) {
    const solved = share(data.solve);
    if (!solved) { say({ type: 'export', ask: data.ask, found: false }); return; }
    const out = exported(solved);
    say({ type: 'export', ask: data.ask, found: true, ...out }, [out.sums.buffer]);
  },
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
