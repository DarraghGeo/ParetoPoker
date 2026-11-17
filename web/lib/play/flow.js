// How Play's game moves on. The flops of the hands ahead are solved in flop workers beside the table (one or two at once)
// and passed to Play's own worker. That worker tells every step of a hand as it happens; here they are shown one at a time, on
// the clock: villain takes three to eight seconds over each action, a street takes a moment to deal, and hero has a shot clock and
// then a time bank (out of time, he checks if he can and folds if not). A finished hand is counted once in the session.
import { dayKey } from '../days.js';
import { keep, load } from '../storage.js';
import { keepMistakes } from './mistakes.js';
import { handPlayed, sprintDue, sprintStarted } from './quiz.js';
import { keepRules } from './rules.js';
import { PHONE, configOf, keepSeating } from './seating.js';
import { mark, markSolver } from './trace.js';

const KEY = 'pareto-play'; const DAYS_KEY = 'pareto-days';
/** How many days of play are kept. */
export const DAYS = 10;
/** Seconds: hero's shot clock, each player's time bank, villain's shot clock, the bank a new hand gives back. */
export const SHOT = 20; export const BANK = 60; const VILLAIN_SHOT = 15; const REFILL = 5; const DEAL_MS = 650;
const NO_CLOCK = { who: null, left: 0, total: 1, bank: false };

/** Today's session: chips won, what hero's decisions gave up against the solver (`lost`) and hands played (a new day starts a new one). */
export function loadSession() {
  const saved = load(KEY);
  return saved?.day === dayKey() ? { day: saved.day, net: saved.net, lost: saved.lost ?? 0, hands: saved.hands } : { day: dayKey(), net: 0, lost: 0, hands: 0 };
}

/** The days played, the newest first, ten at most: each day's hands, chips won and EV given up. Today's session is one of them. */
export function loadDays() {
  const kept = load(DAYS_KEY); const days = Array.isArray(kept) ? kept.filter((d) => d?.day && d.hands > 0) : [];
  const today = loadSession(); if (today.hands && !days.some((d) => d.day === today.day)) days.unshift(today);
  return days.slice(0, DAYS);
}
/** Today's session written into the days kept. */
function keepDay(game) {
  const today = { day: game.session.day, net: game.session.net, lost: game.session.lost, hands: game.session.hands };
  game.days = [today, ...game.days.filter((d) => d.day !== today.day)].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, DAYS);
  keep(DAYS_KEY, game.days);
}

function stopClock(game) { clearInterval(game.tick); game.tick = null; game.clock = NO_CLOCK; }

/** Run a clock for `who`: the shot clock, then the time bank; `onOut` when both are gone. */
function runClock(game, who, total, onOut) {
  stopClock(game); const from = performance.now(); const bank = game.bank[who]; game.clock = { who, left: total, total, bank: false };
  let from0 = from;
  game.tick = setInterval(() => {
    if (game.paused) { from0 += 250; return; }   // Study or a card over the table is open: nobody's time runs
    const used = (performance.now() - from0) / 1000;
    if (used < total) { game.clock = { who, left: total - used, total, bank: false }; return; }
    const left = Math.max(0, bank - (used - total)); game.bank = { ...game.bank, [who]: left };
    if (left > 0) { game.clock = { who, left, total: BANK, bank: true }; return; }
    stopClock(game); onOut?.();
  }, 250);
}

/** Out of time: check if hero can, else fold. */
function timedOut(game) {
  const list = game.state?.actions ?? []; const a = list.find((x) => x.kind === 'check') ?? list.find((x) => x.kind === 'fold') ?? list[0];
  if (a) { game.timedOut = true; act(game, a.label); }
}

/** A finished hand counted once. */
function counted(game, data) {
  const hand = `${data.epoch}|${data.id}`; if (!data.result || game.counted === hand) return;
  game.counted = hand; Object.assign(game.session, { net: game.session.net + data.result.net, lost: game.session.lost + (data.result.lost ?? 0), hands: game.session.hands + 1 });
  keep(KEY, game.session); keepDay(game); keepMistakes(game, data); keepRules(game, data); handPlayed(game);
}

/** Put a step on the table, and start the clock it calls for. */
function show(game, data) {
  game.state = data; game.shownAt = performance.now(); stopClock(game);
  if (data.study) game.study = { ...data.study, hero: data.hero };
  if (data.sprint) sprintStarted(game, data.sprint);   // a few questions before this decision
  counted(game, data);
  if (data.result) return;
  if (data.toAct) runClock(game, 'hero', SHOT, () => timedOut(game));
  else if (data.waiting || data.actor) runClock(game, 'villain', VILLAIN_SHOT);   // he is thinking, or the street is being solved
}

const moves = (st, who) => st.history.reduce((t, h) => t + h.actions.filter((a) => a.who === who).length, 0);
/** How much longer villain takes over an action, in milliseconds: three to eight seconds in all, at random, of which the
 *  time the table has already stood waiting (a street being solved, say) is counted. */
const thinking = (game) => Math.max(0, 3000 + Math.random() * 5000 - (performance.now() - (game.shownAt ?? 0)));

/** Show the steps waiting, each after the time it should take. */
function pump(game) {
  if (game.busy || game.paused || !game.queue.length) return;
  const data = game.queue.shift(); const prev = game.state; let delay = 0;
  if (prev && prev.id === data.id) {
    if (moves(data, 'villain') > moves(prev, 'villain')) { delay = thinking(game); if (game.clock.who !== 'villain') runClock(game, 'villain', VILLAIN_SHOT); }
    else if (data.history.length > prev.history.length || (data.result && !prev.result)) delay = DEAL_MS;
  }
  game.busy = true;
  // a step that comes due while the table stands still waits at the front of the line
  game.timer = setTimeout(() => { game.busy = false; if (game.paused) { game.queue.unshift(data); return; } show(game, data); pump(game); }, delay);
}

function queued(game, data) {
  const key = [data.id, data.step, data.waiting, data.toAct, !!data.result].join('|');
  if (key === game.lastKey) return;
  game.lastKey = key; game.error = ''; game.queue.push(data); pump(game);
}

/** How many flops are solved at once beside the table: two where the device has the cores, one on a phone. */
const HELPERS = PHONE ? 1 : Math.max(1, Math.min(2, (globalThis.navigator?.hardwareConcurrency ?? 4) - 2));

/** How many threads each flop worker solves on, where the page has them: the cores there are, less the page's and the
 *  table's own, shared among the flop workers; four at most. */
const THREADS = PHONE ? 1 : Math.max(1, Math.min(4, Math.floor(((globalThis.navigator?.hardwareConcurrency ?? 4) - 1) / HELPERS)));   // one on a phone: Play began stopping by itself there once flops were solved on several

/** A solved flop is written to the device (for Study and for the next start) only up to this size: storing copies it once more. */
const KEEP_UNDER = (PHONE ? 200 : 400) * 2 ** 20;

/** Give waiting flops to the flop workers that are free. */
function assign(game) {
  if (game.holding) return;
  for (const h of game.helpers) { if (h.busy || !game.needs.length) continue; const need = game.needs.shift(); h.busy = need.id; h.need = need; h.worker.postMessage({ type: 'solve', threads: THREADS, keepUnder: KEEP_UNDER, ...need }); markSolver(need.kept ? 'reading back the flop kept' : 'started solving a flop'); }
}
function fromHelper(game, h, data) {
  if (data.epoch !== game.epoch) return;   // a solve stopped with the setup it was for
  if (data.type === 'progress') { markSolver(`solving a flop, ${Math.round(100 * (data.done ?? 0))}% along`); if (!game.state && data.id === game.needs.first) game.progress = { done: data.done }; return; }
  if (data.type === 'stage') { markSolver(data.stage); return; }
  if (data.slim) markSolver(data.readBack ? 'handed over the flop kept from last time' : `handed over a flop of ${Math.round((data.solvedBytes ?? 0) / 2 ** 20)} MB`);
  h.busy = null; game.worker.postMessage(data); assign(game);
}
/** A flop worker that broke: its flop is told as failed, so the table does not wait for it for ever. */
function helperBroke(game, h, why) {
  const need = h.need; h.busy = null; h.need = null;
  if (need?.epoch === game.epoch) game.worker.postMessage({ type: 'flop', id: need.id, epoch: need.epoch, failed: true, why });
  assign(game);
}
function helper(game) {
  const h = { worker: new Worker(new URL('../../workers/flop.js', import.meta.url), { type: 'module' }), busy: null, need: null };
  h.worker.onmessage = ({ data }) => fromHelper(game, h, data);
  h.worker.onerror = (ev) => { ev.preventDefault?.(); helperBroke(game, h, 'the solver stopped'); };
  return h;
}
/** The flop workers ready for a new setup: any solve under way is stopped, and the workers are kept (or started). */
export function startHelpers(game) {
  game.needs = []; game.needs.first = null;
  for (const h of game.helpers) { h.worker.postMessage({ type: 'stop' }); h.busy = null; h.need = null; }
  while (game.helpers.length < HELPERS) game.helpers.push(helper(game));
}

/** Study opens beside the table: on a phone no new flop is started while it is open (Study reads a whole flop into
 *  memory, and a second one being solved beside it is more than it should hold); the flop being solved is finished and
 *  written, and the hands ahead, which are small, stay. */
export function studyOpened(game) { mark('Study open'); if (PHONE) game.holding = true; }
export function studyClosed(game) { mark('back from Study'); if (!game.holding) return; game.holding = false; assign(game); }

/** The table stands still (Study, or a card over it, is open), or moves on again: clocks stop and no step is shown meanwhile. */
export function pause(game, on) { if (game.paused === on) return; game.paused = on; mark(on ? 'opened a card or drawer over the table' : 'closed it and went back to the table'); if (!on) pump(game); }

function clear(game) { clearTimeout(game.timer); stopClock(game); Object.assign(game, { queue: [], busy: false, lastKey: '', state: null, timedOut: false, error: '' }); }

export function deal(game) {
  mark('asked for the next hand');
  clear(game); game.study = null; game.bank = { hero: Math.min(BANK, game.bank.hero + REFILL), villain: BANK };   // the hand before is gone from the worker, and from Study with it
  game.sprint = null; game.worker.postMessage({ type: 'deal', sprint: sprintDue(game) });
}
export function act(game, label) { mark(`your move (${label})`); stopClock(game); game.worker.postMessage({ type: 'act', label }); }

/** Sit down with a seating: kept for next time, the table cleared, and the worker set up with its spots and bet sizes. */
export function sitDown(game, seating) {
  const config = configOf(seating); const same = sameSetup(config, game.config); keepSeating(seating); game.seating = seating;
  const first = !game.seated; game.seated = true; mark('sat down', true);
  if (same && first) deal(game); else if (!same) { resetup(game, config); game.worker.postMessage({ type: 'deal', sprint: sprintDue(game) }); }   // the same table again plays on with what is solved
}
/** Whether two setups are solved alike: the same spots in rotation and the same betting, however they were chosen. */
const sameSetup = (a, b) => { const of = (c) => JSON.stringify([c.spots, c.bets, c.raises, c.maxRaises, c.allIn]); return of(a) === of(b); };

/** Play on with another setup: the table cleared, and the worker set up again. */
export function resetup(game, config) {
  clear(game); game.study = null; game.config = config; game.status = null; game.progress = null; startHelpers(game);
  setup(game);
}
/** Set the worker up with the game's setup: a new epoch, so that what the one before still says is dropped. */
export function setup(game) { game.epoch++; game.worker.postMessage({ type: 'setup', epoch: game.epoch, config: JSON.parse(JSON.stringify(game.config)) }); }
/** The worker broke: said plainly, with the clocks stopped. */
export function broke(game) { clearTimeout(game.timer); stopClock(game); game.error = 'the solver stopped'; }

const HEARD = {
  need: (game, data) => { game.needs.first ??= data.id; game.needs.push({ id: data.id, epoch: data.epoch, config: data.config, cards: data.cards, hand: data.hand, kept: data.kept || false }); assign(game); },
  export: (game, data) => game.onExport(data),
  explained: (game, data) => game.onExplained(data),
  status: (game, data) => { game.status = data; },
  progress: (game, data) => { game.progress = data; },
  error: (game, data) => { game.error = data.message; },
  state: (game, data) => { if (game.seated) queued(game, data); },
};
export const heard = (game, data) => { if (data.epoch === game.epoch || data.type === 'export' || data.type === 'explained') HEARD[data.type]?.(game, data); };
