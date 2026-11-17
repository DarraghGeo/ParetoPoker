// A trace of what Play was last doing, kept on the device, so that when the page is thrown away under it (a phone closes a
// web app that holds too much, and reopens it at the start) the next start can say what it was in the middle of: the last
// thing done at the table, the last thing the flop worker said it was doing, and how long after each the page was last
// alive. A page that is left in the ordinary way, or Play left for another page, says so and leaves nothing to report.
import { keep, load } from '../storage.js';

const KEY = 'pareto-trace';
let state = { seated: false, doing: '', at: 0, solver: '', solverAt: 0, alive: 0, hidden: false, left: true };
let beat = null;
const write = () => { try { keep(KEY, state); } catch { /* no storage */ } };
const ago = (from, to) => Math.max(0, Math.round((to - from) / 1000));

/** What the last visit was doing if it ended without leaving, in a sentence; null otherwise. */
export function lastStop() {
  const was = load(KEY); if (!was || !was.seated || was.left) return null;
  const alive = was.alive || was.at;
  const solver = was.solver ? ` The flop solver: ${was.solver}, ${ago(was.solverAt, alive)} s before.` : '';
  return { text: `Last at the table: ${was.doing}, ${ago(was.at, alive)} s before it stopped${was.hidden ? ' (the app was in the background)' : ''}.${solver}` };
}

/** Start tracing this visit (after `lastStop` has been read). */
export function startTrace() {
  state = { seated: false, doing: 'opened', at: Date.now(), solver: '', solverAt: 0, alive: Date.now(), hidden: false, left: false }; write();
  addEventListener('pagehide', () => { state.left = true; write(); });
  document.addEventListener('visibilitychange', () => { state.hidden = document.visibilityState === 'hidden'; state.alive = Date.now(); write(); });
  clearInterval(beat); beat = setInterval(() => { state.alive = Date.now(); write(); }, 2000);
}
/** Play is left for another page: nothing to report. */
export function endTrace() { clearInterval(beat); state.left = true; write(); }

/** Note what was last done at the table. */
export function mark(doing, seated = state.seated) { state = { ...state, doing, seated, at: Date.now(), alive: Date.now() }; write(); }
/** Note what the flop worker last said it was doing. */
export function markSolver(doing) { state = { ...state, solver: doing, solverAt: Date.now(), alive: Date.now() }; write(); }
