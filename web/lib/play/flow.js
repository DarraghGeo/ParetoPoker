// How Play's game moves on: the worker's messages taken in, a finished hand counted once in the session, and hero's
// actions and the next hand asked for.
import { dayKey } from '../days.js';
import { keep, load } from '../storage.js';

const KEY = 'pareto-play';

/** Today's session: chips won and hands played (a new day starts a new one). */
export function loadSession() {
  const saved = load(KEY);
  return saved?.day === dayKey() ? saved : { day: dayKey(), net: 0, hands: 0, last: 0 };
}

/** The hand as it stands now: kept for Study while there is a decision, and a finished hand counted once. */
function shown(game, data) {
  game.state = data;
  if (data.study) game.study = { ...data.study, hero: data.hero };
  if (!data.result || game.session.last === data.id) return;
  Object.assign(game.session, { last: data.id, net: game.session.net + data.result.net, hands: game.session.hands + 1 });
  keep(KEY, game.session);
}

export const deal = (game) => { game.state = null; game.error = ''; game.worker.postMessage({ type: 'deal' }); };
export const act = (game, label) => game.worker.postMessage({ type: 'act', label });

const HEARD = {
  export: (game, data) => game.onExport(data),
  status: (game, data) => { game.status = data; },
  progress: (game, data) => { game.progress = data; },
  ready: (game) => { if (!game.state) deal(game); },
  error: (game, data) => { game.error = data.message; },
  state: shown,
};
export const heard = (game, data) => HEARD[data.type]?.(game, data);
