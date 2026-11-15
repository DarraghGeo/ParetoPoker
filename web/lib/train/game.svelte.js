// Train's game: boards solved in the background (several kept ahead), the position and question on screen, and the
// answer graded and recorded. The worker deals the boards (workers/train.js).
import { dayKey } from '../days.js';
import { savedSetup } from '../setup.js';
import { ask, isRight, namesOf } from './questions.js';
import { loadPrefs, record, toggle, savePrefs, VIEWS } from './prefs.js';
import { spotOf } from './spot.js';

/** Boards kept solved ahead of the one on screen; times round a board, with other hands, when nothing waits behind it. */
const AHEAD = 3; const ROUNDS = 4;

export class TrainGame {
  prefs = $state(loadPrefs());
  spot = $state.raw(null);
  q = $state.raw(null);
  progress = $state.raw(null);
  error = $state('');
  config = savedSetup();
  failed = $state(0);
  boards = []; board = null; busy = null; id = 0; onExport = () => {};

  constructor() {
    this.worker = new Worker(new URL('../../workers/train.js', import.meta.url));
    this.worker.onmessage = ({ data }) => this.heard(data);
    this.want();
  }

  /** Ask the worker for another board, on a street chosen at random, unless enough wait. */
  want() {
    if (this.busy || this.boards.length >= AHEAD || this.failed >= 3) return;
    const streets = Object.keys(this.prefs.streets).filter((s) => this.prefs.streets[s]);
    this.busy = { id: ++this.id, street: streets[Math.floor(Math.random() * streets.length)] }; this.progress = null;
    this.worker.postMessage({ type: 'deal', id: this.busy.id, street: this.busy.street, config: $state.snapshot(this.config) });
  }

  /** A message from the worker: progress, a board dealt, an error, or a solve for Study. */
  heard(data) {
    if (data.type === 'export') { this.onExport(data); return; }
    if (!this.busy || data.id !== this.busy.id) return;
    if (data.type === 'progress') { this.progress = data; return; }
    this.busy = null;
    if (data.type === 'error') { this.failed++; this.error = data.message; }
    if (data.type === 'dealt') this.dealt(data);
    if (!this.q) this.advance(); else this.want();
  }

  /** A board dealt: its positions join the queue (a flop a card away from the last goes in anywhere, so the two do not always follow). */
  dealt(data) {
    this.failed = 0; this.error = '';
    if (!data.decisions.length) return;
    const board = { street: data.street, spots: data.decisions.map(spotOf), at: 0, round: 0, got: 0 };
    this.boards.splice(data.near ? Math.floor(Math.random() * (this.boards.length + 1)) : this.boards.length, 0, board);
  }

  /** The next question on the board on screen, from the position reached; null when it has none left this time round. */
  nextOnBoard(b) {
    const most = this.boards.length >= AHEAD ? Math.min(2, b.spots.length) : b.spots.length;
    for (; b.at < most; b.at++) {
      const q = ask(b.spots[b.at], b.round, this.prefs);
      if (q) { this.spot = b.spots[b.at]; b.got++; return q; }
    }
    return null;
  }

  /** Whether the board on screen goes round again with other hands: when nothing waits and it still gives questions. */
  goesRound(b) {
    if (this.boards.length || b.got === 0 || b.round >= ROUNDS || !this.prefs.types.hand || !this.prefs.streets[b.street]) return false;
    b.round++; b.at = 0; b.got = 0;
    return true;
  }

  /** On to the next question: the rest of this position, the board's other positions, then the next board. */
  advance() {
    let q = null;
    while (!q) {
      if (this.board) q = this.nextOnBoard(this.board);
      if (q || (this.board && this.goesRound(this.board))) continue;
      this.board = this.boards.shift() ?? null;
      if (!this.board) { this.spot = null; break; }
    }
    this.q = q; this.want();
  }

  /** Pick an answer: one for a single-answer question (graded at once), any number for one that asks for every one that applies. */
  choose(k) {
    const q = this.q; if (!q || q.done) return;
    if (!q.multi) { this.q = { ...q, chosen: [k] }; this.grade(); return; }
    this.q = { ...q, chosen: q.chosen.includes(k) ? q.chosen.filter((x) => x !== k) : [...q.chosen, k] };
  }

  /** Grade the answer and record it with its spot, for the day's score and the last questions. */
  grade() {
    const q = this.q; if (!q || q.done || !q.chosen.length) return;
    const ok = isRight(q); const d = this.spot.decision;
    this.q = { ...q, done: true, ok };
    record(this.prefs, { t: Date.now(), day: dayKey(), type: q.type, street: q.street, ok, board: d.boardText, seat: d.seat, line: d.line, history: d.history, hand: q.hand ?? null, text: q.text, mine: namesOf(q, q.chosen), right: namesOf(q, q.right), why: q.why, explained: q.street === 'river' });
  }

  /** Turn a kind of question or a street on or off; what no longer applies is dropped. */
  setChoice(group, key) {
    if (!toggle(this.prefs, group, key)) return;
    if (group === 'types') { if (this.q && !this.q.done && !this.prefs.types[this.q.type]) this.advance(); return; }
    this.boards = this.boards.filter((b) => this.prefs.streets[b.street]);
    if (this.busy && !this.prefs.streets[this.busy.street]) { this.busy = null; this.progress = null; }
    if (this.board && !this.prefs.streets[this.board.street] && !this.q?.done) { this.board = null; this.advance(); return; }
    this.want();
  }

  /** The next view above the question: ranges, equity curves, ladder. */
  nextView() { this.prefs.view = VIEWS[(VIEWS.indexOf(this.prefs.view) + 1) % VIEWS.length]; savePrefs($state.snapshot(this.prefs)); }
}
