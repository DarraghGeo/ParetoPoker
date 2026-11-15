// What Train keeps between visits: the kinds of question (in three groups) and the streets chosen, the view above the question, each day's
// results by question type and street, and the last thirty questions.
import { dayKey } from '../days.js';
import { keep, load } from '../storage.js';

export const TYPES = { whose: 'Whose range is this', inout: 'In or out of a range', card: 'Whose card is it', range: 'Range advantage', nuts: 'Nut advantage', freq: 'How much the range bets', shape: 'The shape of the betting', defend: 'How much continues against a bet', size: 'Maximum bet or raise', hand: 'What a hand can do', twin: 'Which of two hands bets' };
/** The kinds of question as settings lists them: what the ranges are, who is ahead, and what to do. */
export const TYPE_GROUPS = [['Ranges', ['whose', 'inout']], ['Range advantage', ['card', 'range', 'nuts']], ['Actions', ['freq', 'shape', 'defend', 'size', 'hand', 'twin']]];
export const STREETS = { flop: 'Flop', turn: 'Turn', river: 'River' };
/** What sits above the question: the two ranges side by side, their equity curves, or the ladder of both on one scale. */
export const VIEWS = ['grid', 'curve', 'ladder'];
const KEY = 'pareto-train';
const DAYS_KEPT = 90; const LOG_KEPT = 30;

/** Each choice the saved prefs give a yes or no for, over the defaults; at least one of each stays on. */
function choices(defaults, saved, fallback) {
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) if (typeof saved?.[key] === 'boolean') out[key] = saved[key];
  if (!Object.values(out).some(Boolean)) out[fallback] = true;
  return out;
}

/** The prefs as saved, over the defaults. */
export function loadPrefs() {
  const saved = load(KEY, {});
  return {
    types: choices(Object.fromEntries(Object.keys(TYPES).map((key) => [key, true])), saved.types, 'range'),
    streets: choices({ flop: false, turn: false, river: true }, saved.streets, 'river'),
    view: VIEWS.includes(saved.view) ? saved.view : 'grid',
    days: saved.days && typeof saved.days === 'object' ? saved.days : {},
    log: Array.isArray(saved.log) ? saved.log : [],
  };
}
export const savePrefs = (prefs) => keep(KEY, prefs);

/** Today's score: right answers out of all. */
export const todayOf = (prefs) => prefs.days[dayKey()] ?? { ok: 0, n: 0, by: {} };

/** One answer goes into its day, under its question type and its street, and to the top of the last questions. */
export function record(prefs, entry) {
  const day = prefs.days[entry.day] ??= { ok: 0, n: 0, by: {} };
  day.n++; if (entry.ok) day.ok++;
  for (const key of [entry.type, entry.street]) { const at = day.by[key] ??= [0, 0]; at[1]++; if (entry.ok) at[0]++; }
  const keys = Object.keys(prefs.days).sort();
  for (const key of keys.slice(0, Math.max(0, keys.length - DAYS_KEPT))) delete prefs.days[key];
  prefs.log.unshift(entry); prefs.log.length = Math.min(prefs.log.length, LOG_KEPT);
  savePrefs(prefs);
}

/** The last five days a question type or a street was played, newest first. */
export function lastDays(prefs, key) {
  return Object.keys(prefs.days).sort().reverse().filter((d) => prefs.days[d].by?.[key]?.[1] > 0).slice(0, 5)
    .map((d) => ({ day: d, ok: prefs.days[d].by[key][0], n: prefs.days[d].by[key][1] }));
}

/** Turn a choice on or off; the last one on in its group stays on. */
export function toggle(prefs, group, key) {
  if (prefs[group][key] && Object.values(prefs[group]).filter(Boolean).length === 1) return false;
  prefs[group][key] = !prefs[group][key]; savePrefs(prefs);
  return true;
}
