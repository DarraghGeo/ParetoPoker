// How Train's game moves on: boards asked for and dealt (several kept ahead), and the next question found on them.
import { ask } from './questions.js';
import { RANGE_TYPES, rangeAsk } from './ranges.js';
import { spotOf } from './spot.js';
import { stash, unstash } from './stash.js';

/** Boards kept solved ahead of the one on screen; times round a board, with other hands, when nothing waits behind it. */
const AHEAD = 3; const ROUNDS = 4;
const snapshot = (value) => JSON.parse(JSON.stringify(value));
/** Whether any kind of question that needs a solved spot is on. */
const solving = (prefs) => Object.keys(prefs.types).some((t) => prefs.types[t] && !RANGE_TYPES.includes(t));
/** Whether the next question is one on the ranges: every third when both sorts are on, every one when only they are. */
function rangesTurn(game) {
  if (!RANGE_TYPES.some((t) => game.prefs.types[t])) return false;
  return !solving(game.prefs) || ++game.turn % 3 === 0;
}

/** Ask the worker for another board, on a street chosen at random, unless enough wait. */
export function want(game) {
  if (game.busy || game.boards.length >= AHEAD || game.failed >= 3 || !solving(game.prefs)) return;
  const streets = Object.keys(game.prefs.streets).filter((s) => game.prefs.streets[s]);
  game.busy = { id: ++game.id, street: streets[Math.floor(Math.random() * streets.length)] }; game.progress = null;
  game.worker.postMessage({ type: 'deal', id: game.busy.id, street: game.busy.street, config: snapshot(game.config) });
}

/** A board as the queue holds it, from what the worker dealt (kept with it, so it can be stashed for the next visit). */
export const boardOf = (dealt) => ({ street: dealt.street, spots: dealt.decisions.map(spotOf), at: 0, round: 0, got: 0, dealt });

/** A board dealt: its positions join the queue (a flop a card away from the last goes in anywhere, so the two do not always follow). */
function dealt(game, data) {
  game.failed = 0; game.error = '';
  if (!data.decisions.length) return;
  game.boards.splice(data.near ? Math.floor(Math.random() * (game.boards.length + 1)) : game.boards.length, 0, boardOf(data));
  stash(game);
}

/** The boards kept from the last visit join the queue ahead of any dealt since; the first question is asked if none is up. */
export async function resume(game) {
  const kept = await unstash(game.config);
  if (!kept.length) return;
  game.boards.unshift(...kept.map(boardOf));
  if (!game.q) advance(game); else want(game);
}

/** A message from the worker: progress, a board dealt, an error, or a solve for Study. */
export function heard(game, data) {
  if (data.type === 'export') { game.onExport(data); return; }
  if (!game.busy || data.id !== game.busy.id) return;
  if (data.type === 'progress') { game.progress = data; return; }
  game.busy = null;
  if (data.type === 'error') { game.failed++; game.error = data.message; }
  if (data.type === 'dealt') dealt(game, data);
  if (!game.q) advance(game); else want(game);
}

/** The next question on a board, from the position reached; null when it has none left this time round. */
function nextOnBoard(game, b) {
  const most = game.boards.length >= AHEAD ? Math.min(2, b.spots.length) : b.spots.length;
  for (; b.at < most; b.at++) {
    const q = ask(b.spots[b.at], b.round, game.prefs);
    if (q) { game.spot = b.spots[b.at]; b.got++; return q; }
  }
  return null;
}

/** Whether the board on screen goes round again with other hands: when nothing waits and it still gives questions. */
function goesRound(game, b) {
  if (game.boards.length || b.got === 0 || b.round >= ROUNDS || !game.prefs.types.hand || !game.prefs.streets[b.street]) return false;
  b.round++; b.at = 0; b.got = 0;
  return true;
}

/** On to the next question: one on the ranges when it is their turn, else the rest of this position, the board's other
 *  positions, then the next board; and one on the ranges while nothing is solved yet. */
export function advance(game) {
  let q = rangesTurn(game) ? rangeAsk(game.prefs) : null;
  while (!q && solving(game.prefs)) {
    if (game.board) q = nextOnBoard(game, game.board);
    if (q || (game.board && goesRound(game, game.board))) continue;
    game.board = game.boards.shift() ?? null;
    if (!game.board) break;
    stash(game);
  }
  q ??= rangeAsk(game.prefs);
  if (!q || q.street === 'preflop') game.spot = null;
  game.q = q; want(game);
}
