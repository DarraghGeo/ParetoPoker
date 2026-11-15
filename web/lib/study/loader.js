// A solve that takes a while says so: what is being solved, how far along (never back), and a way to stop. It shows only
// once a solve has run a moment.
import { along } from '../../solver/progress.js';

const SHOW_AFTER = 350;
const seconds = (load) => Math.round((Date.now() - load.started) / 1000);

function begun(game) {
  const load = { started: Date.now(), first: null, last: 0, shown: false };
  load.timer = setTimeout(() => { if (game.load) game.load = { ...game.load, shown: true }; }, SHOW_AFTER);
  return load;
}

/** How far along a solve aiming for an accuracy is: it closes in on the target by ratio, so on a log scale. */
function fineDone(load, data) {
  if (data.exploit < Infinity && load.first == null) load.first = Math.max(data.exploit, data.target * 1.01);
  return load.first == null ? 0 : along(load.first, data.exploit, data.target);
}

function noteOf(load, data) {
  const took = `${data.iterations} iterations  ·  ${seconds(load)}s`;
  if (data.lite) return `Lite${data.moving > 0 ? `  ·  first decisions still moving ${(100 * data.moving).toFixed(1)}%` : ''}  ·  ${took}`;
  return data.exploit < Infinity ? `${data.exploit.toFixed(2)}% of pot, aiming for ${data.target}%  ·  ${took}` : 'Building the tree';
}

export function loading(game, data) {
  const load = { ...(game.load ?? begun(game)) };
  load.last = Math.max(load.last, data.lite ? data.done : fineDone(load, data));
  game.load = { ...load, street: data.street, note: noteOf(load, data) };
}

export function loaded(game) { clearTimeout(game.load?.timer); game.load = null; }
