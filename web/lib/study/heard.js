// What Study's worker says: how a solve is going, the solve itself, a street's subgame, a decision, and the answers to
// questions. Anything about a solve no longer on screen is dropped.
import { ANSWERS, clearAnswers } from './asks.js';
import { onPreview } from './editor.svelte.js';
import { loaded, loading } from './loader.js';
import { openAt, solveOnward } from './opening.js';
import { onFits, openSetup } from './setup.js';
import { goToKept, show, turnTo } from './solving.js';
import { addVersion, placeOf, version, versionOf } from './versions.svelte.js';

const percent = (x) => (x < 100 ? `${x.toFixed(x < 1 ? 2 : 1)}%` : '');

/** A solve going on: behind a street handed over, with no loader in the way; else with the loader. */
function progress(game, data) {
  game.busy = true;
  if (data.refine) { game.status = `Quick solve; refining ${percent(data.exploit)}`; return; }
  loading(game, data);
  game.status = data.lite ? 'solving lite' : `solving ${percent(data.exploit)}`;
}

function failed(game, data) {
  loaded(game); game.status = ''; game.busy = false;
  openSetup(game, !!game.sub); game.setupError = data.message;
}

/** A street re-solved on its own becomes the next version: the cards dealt, the ranges as they arrive. */
function subgame(game, { spot }) {
  const base = { board: spot.board, pot: spot.pot, stack: spot.stack, ...game.sub, lite: false };
  const index = addVersion(game, versionOf(game, { oop: spot.oop, ip: spot.ip, base, fixed: true }));
  game.sub = null; turnTo(game, index);
}

function solved(game, data) {
  loaded(game); game.nodes = data.nodes; clearAnswers(game);
  game.status = data.provisional ? `Quick solve, ${data.exploit.toFixed(2)}%; refining` : data.exploit == null ? 'lite, from Play' : `${data.lite ? 'lite ' : ''}${data.exploit.toFixed(2)}%`;
  game.busy = !!data.provisional;
  // the finer solve of a street shown from a handover: stay where the walk has got to since
  if (game.refining && !data.provisional && !game.open) version(game).pos = placeOf(game);
  game.refining = !!data.provisional;
  if (game.open) openAt(game);
  goToKept(game);
  if (game.onward) solveOnward(game);
}

const HANDLERS = { progress, error: failed, subgame, solved, decision: (game, data) => show(game, data.decision), parts: (game, data) => { game.parts = { key: data.key, by: data.parts }; }, ...ANSWERS };

export function heard(game, data) {
  if (data.type === 'preview') { onPreview(game, data); return; }
  if (data.type === 'fits') { onFits(game, data); return; }
  if (data.job === game.job) HANDLERS[data.type]?.(game, data);
}
