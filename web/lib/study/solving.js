// Moving Study on: solving the version on screen, going between versions and decisions, showing a decision, picking a hand.
import { cellOf } from '../cards.js';
import { surveyOf } from '../hands.js';
import { START, boardCards, conf, placeOf, version, versionOf } from './versions.svelte.js';

export function setHand(game, name) { game.hand = name; game.cell = name ? cellOf(name) : null; }
export const clearHand = (game) => setHand(game, null);
/** A hand picked: the one already picked, picked again, goes back to the range. */
export const pickHand = (game, name) => setHand(game, game.hand === name ? null : name);

/** A chart cell picked: its most held hand (the cell already picked, picked again, goes back to the range). */
export function pickCell(game, key) {
  if (game.cell === key) { clearHand(game); return; }
  const rows = game.survey.rows.filter((r) => cellOf(r.hand.name) === key).sort((a, b) => b.hand.weight - a.hand.weight);
  game.cell = key; game.hand = rows[0]?.hand.name ?? null;
}

function clearShown(game) {
  Object.assign(game, { nodes: null, decision: null, survey: null, spot: null, dealt: [], pick: null });
  clearHand(game);
}

/** What the setup's ranges are on the board, in words (a re-solved street's ranges have none). */
function describeSpot(game, v) {
  if (v.fixed) return;
  game.worker.postMessage({ type: 'profile', job: game.job, oop: v.oop, ip: v.ip, board: boardCards(conf(game).board) });
}

/** Solve the version on screen. `keep`: stay on the same decision and hand (another version of the same spot). */
export function solve(game, keep = false) {
  game.job++;
  if (!keep) clearShown(game);
  game.status = 'solving'; game.spot = null;
  const v = version(game);
  game.worker.postMessage({ type: 'solve', job: game.job, key: v.id, config: { ...conf(game), oop: v.oop, ip: v.ip, dials: v.dials } });
  describeSpot(game, v);
}

/** A new spot from setup: its ranges as given are the first version. */
export function begin(game) {
  game.versions = [versionOf(game, { oop: game.config.oop, ip: game.config.ip })]; game.at = 0;
  solve(game);
}

/** Go to another version: the stage slides away, the other one is solved and slides in from its side. */
export function turnTo(game, index) {
  if (index < 0 || index >= game.versions.length || index === game.at) return;
  const forward = index > game.at; const board = conf(game).board;
  version(game).pos = placeOf(game); game.at = index;
  game.slide = forward ? 'out-left' : 'out-right'; game.slideIn = forward ? 'in-right' : 'in-left';
  solve(game, board === conf(game).board);
}

export function go(game, id) {
  game.node = id; game.pick = null;
  game.worker.postMessage({ type: 'decision', job: game.job, id, dealt: [...game.dealt] });
}

/** A decision arrives: its survey, the hand picked kept while it is still in the range, the stage slid in. */
export function show(game, decision) {
  game.decision = decision; game.survey = decision ? surveyOf(decision) : null;
  if (!game.survey?.byName.has(game.hand)) clearHand(game);
  if (!game.slideIn) return;
  game.slide = game.slideIn; game.slideIn = null;
  requestAnimationFrame(() => requestAnimationFrame(() => { game.slide = ''; }));
}

/** Back where the version was last looked at, if that place is in its tree; else its first decision. */
export function goToKept(game) {
  const pos = version(game).pos ?? START(); const there = game.nodes[pos.node];
  const ok = there?.kind === 'decision' && pos.dealt.length >= there.round;
  game.dealt = ok ? [...pos.dealt] : []; game.pick = null;
  go(game, ok ? pos.node : 0);
}
