// Play: full hands against the solved villain, off the main thread (see play/: dealing, solving ahead, the hand). The
// flops of the hands ahead are solved in the page's flop workers (workers/flop.js) and handed in here.
import * as fs from 'poker-flopsolve';
import { RARE, explainStreet, measure, study, tolerance } from '../../src/explain/street.js';
import { exported, exportedFlop } from '../solver/jobs.js';
import { dealAhead, gotFlop, hold, onSolved, pump, resume, status, takeKept } from './play/schedule.js';
import { current, play, say } from './play/state.js';
import { heroActs, proceed, start } from './play/table.js';

// a solve finished: the hand on screen plays on if it was waiting for it, or the page hears a hand is ready
onSolved((job) => {
  if (job.hand === current()) { proceed(); return; }
  if (play.wants && !current()) deal();
});

/** The next hand, as soon as one is solved: asked for before then, it starts by itself when its flop arrives. */
function deal() { play.wants = !start(); }

/** A street of the hand on the table, for Study: its flop, or a later street solved again here (by the key it is kept under). */
function share(solve) {
  const at = String(solve).indexOf('|'); const id = String(solve).slice(0, at); const key = String(solve).slice(at + 1);
  const hand = play.playing?.hand; if (!hand || String(hand.id) !== id) return null;
  const solved = key === 'flop' ? hand.flop : hand.next.get(key);
  return solved && !solved.failed ? solved : null;
}

/** Why hero's hand plays as it does at a decision of the hand on the table (`at`, in the solve kept under `solve`, with
 *  the cards dealt inside it): the same explanation Study gives, from the solve the table already holds. */
function explained(data) {
  const solved = share(data.solve); const hand = play.playing?.hand; if (!solved || !hand) return null;
  const st = study(fs, solved.solution, solved.nodes, data.at, data.cards ?? []); if (!st) return null;
  const street = ['flop', 'turn', 'river'][st.f.board.length - 3];
  const T = solved.exploit != null ? tolerance(st.f.round === 0 ? street : `${street} after a deal`, solved.exploit, st.lineReach) : null;
  const m = measure(st, hand.hero, { worth: !!T || Math.min(...st.lineReach) >= RARE });
  const t = explainStreet(st, m, T);
  return t && { name: t.name, line: t.line, detail: t.detail, reasons: t.reasons.map((r) => ({ text: r.text, detail: r.detail ?? null })), silent: t.silent };
}

const handlers = {
  setup(data) { Object.assign(play, { config: data.config, hands: [], playing: null, jobs: new Map(), epoch: data.epoch ?? play.epoch + 1, held: false, typical: 0, wants: false, fails: 0, loading: false }); status(); takeKept().finally(() => { if (data.epoch == null || data.epoch === play.epoch) { dealAhead(); pump(); status(); } }); },
  flop(data) { gotFlop(data); },
  hold() { hold(); },
  resume() { resume(); },
  deal,
  act(data) { heroActs(data.label); },
  explain(data) { let told = null; try { told = explained(data); } catch { told = null; } say({ type: 'explained', ask: data.ask, told }); },
  export(data) {
    const solved = share(data.solve); const out = !solved ? null : solved.street === 'flop' ? exportedFlop(solved) : solved.oop ? exported(solved) : null;
    if (!out) { say({ type: 'export', ask: data.ask, found: false }); return; }
    say({ type: 'export', ask: data.ask, found: true, ...out }, [out.sums.buffer]);
  },
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
