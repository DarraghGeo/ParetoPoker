// Answering in Train: answers picked and graded, the result recorded, and the choices in settings changed.
import { dayKey } from '../days.js';
import { advance, want } from './flow.js';
import { record, savePrefs, setDrill, toggle, VIEWS } from './prefs.js';
import { isRight, namesOf } from './questions.js';

/** Grade the answer and record it with its spot, for the day's score and the last questions. */
export function grade(game) {
  const q = game.q; if (!q || q.done || !q.chosen.length) return;
  const ok = isRight(q); const d = game.spot?.decision ?? null;
  game.q = { ...q, done: true, ok };
  record(game.prefs, { t: Date.now(), day: dayKey(), type: q.type, street: q.street, ok, board: d?.boardText ?? '', seat: d?.seat ?? null, line: d?.line ?? [], history: d?.history ?? [], hand: q.hand ?? null, about: q.plain ?? null, context: q.context ?? null, text: q.text, mine: namesOf(q, q.chosen), right: namesOf(q, q.right), why: q.why, explained: q.street === 'river' || q.type !== 'hand' });
}

/** Pick an answer: one for a single-answer question (graded at once), any number for one that asks for every one that applies. */
export function choose(game, k) {
  const q = game.q; if (!q || q.done) return;
  if (!q.multi) { game.q = { ...q, chosen: [k] }; grade(game); return; }
  game.q = { ...q, chosen: q.chosen.includes(k) ? q.chosen.filter((x) => x !== k) : [...q.chosen, k] };
}

/** Start a drill: its questions from here on, the one on screen dropped. */
export function startDrill(game, drill) { setDrill(game.prefs, drill); game.turn = 0; game.q = null; advance(game); }

/** Turn a kind of question or a street on or off; what no longer applies is dropped. */
export function setChoice(game, group, key) {
  if (!toggle(game.prefs, group, key)) return;
  if (group === 'types') { if (game.q && !game.q.done && !game.prefs.types[game.q.type]) advance(game); return; }
  game.boards = game.boards.filter((b) => game.prefs.streets[b.street]);
  if (game.busy && !game.prefs.streets[game.busy.street]) { game.busy = null; game.progress = null; }
  if (game.board && !game.prefs.streets[game.board.street] && !game.q?.done) { game.board = null; advance(game); return; }
  want(game);
}

/** The next view above the question: ranges, equity curves, ladder. */
export function nextView(game) { game.prefs.view = VIEWS[(VIEWS.indexOf(game.prefs.view) + 1) % VIEWS.length]; savePrefs(game.prefs); }
