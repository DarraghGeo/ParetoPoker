// A trace of what Play was last doing, kept on the device, so that when the page is thrown away under it (a phone closes a
// web app that holds too much, and reopens it at the start) the next start can say what it was in the middle of. A page
// that is left in the ordinary way says so on its way out, and leaves nothing to report.
import { keep, load } from '../storage.js';

const KEY = 'pareto-trace';
let state = { seated: false, doing: '', at: 0, hidden: false, left: true };
const write = () => { try { keep(KEY, state); } catch { /* no storage */ } };

/** What the last visit was doing if it ended without leaving: `{ doing, hidden, ago }` (seconds before it was last heard of), else null. */
export function lastStop() {
  const was = load(KEY);
  return was && was.seated && !was.left ? { doing: was.doing, hidden: !!was.hidden, at: was.at } : null;
}

/** Start tracing this visit (after `lastStop` has been read). */
export function startTrace() {
  state = { seated: false, doing: 'opened', at: Date.now(), hidden: false, left: false }; write();
  addEventListener('pagehide', () => { state.left = true; write(); });
  document.addEventListener('visibilitychange', () => { state.hidden = document.visibilityState === 'hidden'; state.at = Date.now(); write(); });
}

/** Note what Play is doing now. */
export function mark(doing, seated = state.seated) { state = { ...state, doing, seated, at: Date.now() }; write(); }
