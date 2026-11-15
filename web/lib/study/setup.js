// The setup drawer: the board, the two ranges (painted, typed or a preset's), the pot, stack and betting. From a street's
// first decision only the betting is asked, to re-solve that street on its own. A spot too big to solve whole can still
// be solved lite, and the Solve button says so.
import { cellsOf } from './paint.js';
import { formOf, goodBoard, readForm, boardOf } from './form.js';
import { presetAfter } from './presets.js';
import { begin, clearHand } from './solving.js';
import { conf, configOf, remember } from './versions.svelte.js';

const FIT_DELAY = 250; const SEATS_DELAY = 700;
const hasHands = (notation) => !!cellsOf(notation)?.size;

export function openSetup(game, sub = false) {
  const c = sub ? conf(game) : configOf(game);
  game.form = formOf(c); game.draft = { side: game.draft.side, oop: c.oop, ip: c.ip };
  game.setupError = ''; game.fit = { lite: false, note: '' }; game.panel = sub ? 'sub' : 'setup';
}
export const closePanel = (game) => { game.panel = ''; game.setupError = ''; };

/** A preset's ranges, pot and stack into the form; nothing is solved until Solve. */
export function takePreset(game, part, value) {
  const p = presetAfter(game.draft.oop, game.draft.ip, part, value);
  Object.assign(game.draft, { oop: p.ranges.oop, ip: p.ranges.ip }); Object.assign(game.form, { pot: p.pot, stack: p.stack });
}

const problemOf = (form, draft) => (!goodBoard(form.board) ? 'Three, four or five board cards are needed.' : !hasHands(draft.oop) || !hasHands(draft.ip) ? 'Both ranges need hands.' : '');

/** The street on screen re-solved on its own with the betting asked for (the subgame arrives as the next version). */
function solveStreet(game, betting) {
  game.sub = betting; closePanel(game); game.status = 'solving';
  game.worker.postMessage({ type: 'subgame', job: game.job, id: game.node, dealt: [...game.dealt] });
}

export function submitSetup(game) {
  const form = readForm(game.form);
  if (form.error) { game.setupError = form.error; return; }
  if (game.panel === 'sub') { solveStreet(game, form.betting); return; }
  const problem = problemOf(form, game.draft); if (problem) { game.setupError = problem; return; }
  Object.assign(game.config, { pot: form.pot, stack: form.stack, ...form.betting, board: form.board.join(' '), oop: game.draft.oop.trim(), ip: game.draft.ip.trim(), lite: game.fit.lite });
  remember(game); closePanel(game); game.node = 0; clearHand(game);
  begin(game);
}

/** The spot in the form, as the worker would solve it; null when it is not one yet. */
function spotInForm(game) {
  const form = readForm(game.form); const { oop, ip } = game.draft;
  if (game.panel !== 'setup' || form.error || problemOf(form, game.draft)) return null;
  return { ...form.betting, pot: form.pot, stack: form.stack, board: form.board.join(' '), oop: oop.trim(), ip: ip.trim() };
}

/** Ask, a moment after the form last changed, whether its spot can be solved whole. */
export function checkFit(game) {
  clearTimeout(game.fitTimer);
  game.fitTimer = setTimeout(() => {
    const config = spotInForm(game); const id = ++game.fitId;
    if (config) game.worker.postMessage({ type: 'fits', id, config }); else game.fit = { lite: false, note: '' };
  }, FIT_DELAY);
}

export function onFits(game, data) {
  if (data.id !== game.fitId) return;
  const later = boardOf(game.form?.board).length === 3 ? 'the turn and river' : 'the river';
  const note = data.whole ? '' : data.lite ? `${data.message} Lite solves it with your betting on this street and one bet size on ${later}.` : data.message;
  game.fit = { lite: !data.whole && data.lite, note };
}

/** Off the top bar: a preset taken at once, and the spot solved again a moment after the last tap. */
export function takeSeats(game, part, value) {
  const p = presetAfter(game.config.oop, game.config.ip, part, value);
  Object.assign(game.config, { oop: p.ranges.oop, ip: p.ranges.ip, pot: p.pot, stack: p.stack }); remember(game);
  clearTimeout(game.seatTimer);
  game.seatTimer = setTimeout(() => { game.node = 0; clearHand(game); begin(game); }, SEATS_DELAY);
}
