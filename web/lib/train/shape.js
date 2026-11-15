// Questions about what the range does: how much of it bets and in which of five shapes, how much of it continues against
// a bet, and which of two hands of the same equity is the one that bets. A question too close to call is not asked.
import { GLYPH, pct } from '../cards.js';
import { made } from './made.js';

const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
const SHAPES = [
  { name: 'Check everything', at: [10, 6, 5, 4, 4, 5, 8, 12, 13, 13], why: 'Almost nothing bets: the range checks as a whole.' },
  { name: 'Top, some of the rest', at: [34, 33, 31, 27, 21, 20, 22, 38, 66, 74], why: 'The strongest hands bet and the rest bets now and then, at about the same rate all the way down.' },
  { name: 'Both ends', at: [82, 53, 19, 9, 8, 21, 59, 86, 92, 91], why: 'The strongest hands bet for value and the weakest bet as bluffs; the middle checks, since it wins often enough without betting.' },
  { name: 'Top half', at: [29, 33, 38, 37, 41, 66, 82, 86, 88, 82], why: 'Betting climbs with strength: the better half of the range bets and the weaker half mostly checks.' },
  { name: 'Bet everything', at: [74, 72, 66, 62, 71, 77, 80, 86, 92, 91], why: 'Nearly the whole range bets, weak hands included.' },
];
/** How much of the range bets, or continues, in four bands; an answer within this of a boundary is not asked. */
const BET_BANDS = [0.2, 0.45, 0.7]; const STAY_BANDS = [0.35, 0.55, 0.75]; const EDGE = 0.03;
const bandNames = (cuts) => [`Under ${pct(cuts[0])}%`, `${pct(cuts[0])} to ${pct(cuts[1])}%`, `${pct(cuts[1])} to ${pct(cuts[2])}%`, `Over ${pct(cuts[2])}%`];
const banded = (x, cuts) => (cuts.some((c) => Math.abs(x - c) < EDGE) ? null : cuts.filter((c) => x > c).length);
const mixText = (actions, mix) => actions.map((a, k) => (mix[k] > 0.004 ? `${a.label} ${pct(mix[k])}%` : '')).filter(Boolean).join(', ');
/** How often a hand takes an aggressive action. */
const pushes = (d, h) => d.actions.reduce((t, a, k) => t + (AGGRESSIVE.has(a.kind) ? h.row.hand.strategy[k] : 0), 0);
/** A hand as it reads in a sentence: K♥J♥. */
const shown = (name) => name.replace(/[shdc]/g, (s) => GLYPH[s]);
const strong = (list) => { let all = 0, top = 0; for (const h of list) { all += h.w; if (h.e >= 0.7) top += h.w; } return all > 0 ? top / all : 0; };

/** How often each tenth of the range bets, weakest tenth first (0 to 100). */
export function profile(spot) {
  const total = spot.hero.reduce((t, h) => t + h.w, 0); const sum = Array(10).fill(0); const held = Array(10).fill(0); let seen = 0;
  for (const h of spot.hero) { const k = Math.min(9, Math.floor((10 * (seen + h.w / 2)) / total)); sum[k] += h.w * pushes(spot.decision, h); held[k] += h.w; seen += h.w; }
  return sum.map((s, k) => (held[k] > 0 ? (100 * s) / held[k] : 0));
}

/** The shape a profile is nearest to, and how clearly: the distance to the next nearest over the distance to it. */
export function shapeOf(at) {
  const far = SHAPES.map((s) => Math.sqrt(s.at.reduce((t, v, k) => t + (v - at[k]) ** 2, 0)));
  const order = far.map((_, k) => k).sort((a, b) => far[a] - far[b]);
  return { index: order[0], clear: far[order[1]] / Math.max(1, far[order[0]]) };
}

const betting = (spot) => !spot.s.facing && spot.decision.actions.some((a) => AGGRESSIVE.has(a.kind));
const betShare = (spot) => spot.decision.actions.reduce((t, a, k) => t + (AGGRESSIVE.has(a.kind) ? spot.s.mix[k] : 0), 0);

export function freqQuestion(spot) {
  if (!betting(spot)) return null;
  const right = banded(betShare(spot), BET_BANDS); if (right == null) return null;
  const why = [`Across your range: ${mixText(spot.decision.actions, spot.s.mix)}.`, `Hands with 70% equity or more are ${pct(strong(spot.hero))}% of your range and ${pct(strong(spot.villain))}% of his. The more of them you hold compared with him, the more of your range can bet.`];
  return { text: 'How much of your range bets?', options: bandNames(BET_BANDS).map((label) => ({ label })), right: [right], why };
}

export function shapeQuestion(spot) {
  if (!betting(spot)) return null;
  const at = profile(spot); const { index, clear } = shapeOf(at); if (clear < 1.35) return null;
  const why = [SHAPES[index].why, `From your weakest tenth to your strongest, the share that bets: ${at.map((v) => Math.round(v)).join(', ')}.`, 'A betting range is nearly always one of these five shapes.'];
  return { text: 'Which shape does your betting take?', options: SHAPES.map((s) => ({ label: s.name, shape: s.at })), right: [index], why };
}

export function defendQuestion(spot) {
  const d = spot.decision; const fold = d.actions.findIndex((a) => a.kind === 'fold');
  if (!spot.s.facing || fold < 0) return null;
  const stays = 1 - spot.s.mix[fold]; const right = banded(stays, STAY_BANDS); if (right == null) return null;
  const price = d.toCall / (d.pot + d.toCall); const has = spot.hero.reduce((t, h) => t + (h.e >= price ? h.w : 0), 0) / spot.hero.reduce((t, h) => t + h.w, 0);
  const gap = has - stays >= 0.06 ? ' Fewer continue than have the price: the hands just over it are beaten too often by what he bets.' : stays - has >= 0.06 ? (d.street === 'river' ? ' A few continue without the price on equity alone.' : ' More continue than have the price: the rest can still improve, or raise as bluffs.') : '';
  const why = [`Across your range: ${mixText(d.actions, spot.s.mix)}.`, `A call needs ${pct(price)}% equity, and ${pct(has)}% of your range has it against what he bets.${gap}`, 'Facing a bet, the answer is one line on your range: everything above it continues.'];
  return { text: 'How much of your range continues?', options: bandNames(STAY_BANDS).map((label) => ({ label })), right: [right], why };
}

/** Two hands a point or two apart in equity, one with nothing made that bets and one with a pair that checks. */
function twins(spot) {
  const d = spot.decision; const board = d.boardText; const pool = spot.hero.filter((h) => h.w >= 0.25 && h.e >= 0.12 && h.e <= 0.6);
  const bets = pool.filter((h) => pushes(d, h) >= 0.85 && made(h.name, board) === 0); const checks = pool.filter((h) => pushes(d, h) <= 0.05 && made(h.name, board) >= 0.5 && made(h.name, board) < 2);
  const pairs = []; for (const a of bets) for (const b of checks) if (Math.abs(a.e - b.e) <= 0.025) pairs.push([a, b]);
  return pairs.length ? pairs[Math.floor(Math.random() * pairs.length)] : null;
}

export function twinQuestion(spot) {
  if (!betting(spot) || spot.decision.street === 'river' || spot.asked.twinDone) return null;
  const pair = twins(spot); if (!pair) return null;
  const [a, b] = pair; const first = Math.random() < 0.5; const d = spot.decision;
  const A = shown(a.name); const B = shown(b.name);
  const why = [`${A} bets ${pct(pushes(d, a))}% of the time and ${B} ${pct(pushes(d, b))}%. Their equity is about the same: ${pct(a.e)}% and ${pct(b.e)}%.`, `${A} has no pair: it wins only if it improves or he folds, so betting costs it nothing it would have won by checking.`, `${B} has a pair that wins some showdowns as it is. A bet folds out the hands it beats.`, 'Among weak hands of the same equity, what is still to come decides who bets.'];
  return { text: 'Two hands with about the same equity. Which one bets?', options: (first ? [a, b] : [b, a]).map((h) => ({ label: h.name, cards: h.name })), right: [first ? 0 : 1], why };
}
