// How Play's game moves on. The worker tells every step of a hand as it happens; here they are shown one at a time, on
// the clock: villain takes three to eight seconds over each action, a street takes a moment to deal, and hero has a shot clock and
// then a time bank (out of time, he checks if he can and folds if not). A finished hand is counted once in the session.
import { dayKey } from '../days.js';
import { keep, load } from '../storage.js';
import { configOf, keepSeating } from './seating.js';

const KEY = 'pareto-play';
/** Seconds: hero's shot clock, each player's time bank, villain's shot clock, the bank a new hand gives back. */
export const SHOT = 20; export const BANK = 60; const VILLAIN_SHOT = 15; const REFILL = 5; const DEAL_MS = 650;
const NO_CLOCK = { who: null, left: 0, total: 1, bank: false };

/** Today's session: chips won and hands played (a new day starts a new one). */
export function loadSession() {
  const saved = load(KEY);
  return saved?.day === dayKey() ? saved : { day: dayKey(), net: 0, hands: 0, last: 0 };
}

function stopClock(game) { clearInterval(game.tick); game.tick = null; game.clock = NO_CLOCK; }

/** Run a clock for `who`: the shot clock, then the time bank; `onOut` when both are gone. */
function runClock(game, who, total, onOut) {
  stopClock(game); const from = performance.now(); const bank = game.bank[who]; game.clock = { who, left: total, total, bank: false };
  game.tick = setInterval(() => {
    const used = (performance.now() - from) / 1000;
    if (used < total) { game.clock = { who, left: total - used, total, bank: false }; return; }
    const left = Math.max(0, bank - (used - total)); game.bank = { ...game.bank, [who]: left };
    if (left > 0) { game.clock = { who, left, total: BANK, bank: true }; return; }
    stopClock(game); onOut?.();
  }, 100);
}

/** Out of time: check if hero can, else fold. */
function timedOut(game) {
  const list = game.state?.actions ?? []; const a = list.find((x) => x.kind === 'check') ?? list.find((x) => x.kind === 'fold') ?? list[0];
  if (a) { game.timedOut = true; act(game, a.label); }
}

/** A finished hand counted once. */
function counted(game, data) {
  if (!data.result || game.session.last === data.id) return;
  Object.assign(game.session, { last: data.id, net: game.session.net + data.result.net, hands: game.session.hands + 1 });
  keep(KEY, game.session);
}

/** Put a step on the table, and start the clock it calls for. */
function show(game, data) {
  game.state = data; stopClock(game);
  if (data.study) game.study = { ...data.study, hero: data.hero };
  counted(game, data);
  if (data.result) return;
  if (data.toAct) runClock(game, 'hero', SHOT, () => timedOut(game));
  else if (data.waiting || data.actor) runClock(game, 'villain', VILLAIN_SHOT);   // he is thinking, or the street is being solved
}

const moves = (st, who) => st.history.reduce((t, h) => t + h.actions.filter((a) => a.who === who).length, 0);
/** How long villain takes over an action, in milliseconds: three to eight seconds, at random. */
const thinking = () => 3000 + Math.random() * 5000;

/** Show the steps waiting, each after the time it should take. */
function pump(game) {
  if (game.busy || !game.queue.length) return;
  const data = game.queue.shift(); const prev = game.state; let delay = 0;
  if (prev && prev.id === data.id) {
    if (moves(data, 'villain') > moves(prev, 'villain')) { delay = thinking(); if (game.clock.who !== 'villain') runClock(game, 'villain', VILLAIN_SHOT); }
    else if (data.history.length > prev.history.length || (data.result && !prev.result)) delay = DEAL_MS;
  }
  game.busy = true;
  game.timer = setTimeout(() => { game.busy = false; show(game, data); pump(game); }, delay);
}

function queued(game, data) {
  const key = [data.id, data.step, data.waiting, data.toAct, !!data.result].join('|');
  if (key === game.lastKey) return;
  game.lastKey = key; game.error = ''; game.queue.push(data); pump(game);
}

function clear(game) { clearTimeout(game.timer); stopClock(game); Object.assign(game, { queue: [], busy: false, lastKey: '', state: null, timedOut: false, error: '' }); }

export function deal(game) {
  clear(game); game.bank = { hero: Math.min(BANK, game.bank.hero + REFILL), villain: BANK };
  game.worker.postMessage({ type: 'deal' });
}
export function act(game, label) { stopClock(game); game.worker.postMessage({ type: 'act', label }); }

/** Sit down with a seating: kept for next time, the table cleared, and the worker set up with its spots and bet sizes. */
export function sitDown(game, seating) {
  keepSeating(seating); game.seating = seating; game.seated = true; resetup(game, configOf(seating));
}

/** Play on with another setup: the table cleared, and the worker set up again. */
export function resetup(game, config) {
  clear(game); game.study = null; game.config = config; game.status = null; game.progress = null;
  game.worker.postMessage({ type: 'setup', config: JSON.parse(JSON.stringify(config)) });
}

const HEARD = {
  export: (game, data) => game.onExport(data),
  status: (game, data) => { game.status = data; },
  progress: (game, data) => { game.progress = data; },
  ready: (game) => { if (!game.state && !game.queue.length && !game.busy) deal(game); },
  error: (game, data) => { game.error = data.message; },
  state: queued,
};
export const heard = (game, data) => HEARD[data.type]?.(game, data);
