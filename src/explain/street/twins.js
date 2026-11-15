// A hand beside its likes: its twins (the same hand but for its flush draw), and the hands of about its equity.
import { cardsOf } from '../../combos.js';
import { SUIT_NAME } from './hand-words.js';

/** A hand's flush draw, or on the flop its backdoor flush draw: 2, 1 or 0, and the suit. */
function flushLevel(s, c) {
  const { fs, f } = s; const x = s.featuresOf(c); const cards = cardsOf(fs, c);
  if (x.made >= 5) return { level: 0, suit: -1 };
  const ofSuit = (suit) => f.board.filter((b) => fs.suitOf(b) === suit).length + cards.filter((b) => fs.suitOf(b) === suit).length;
  for (const card of cards) { const suit = fs.suitOf(card); if (ofSuit(suit) === 4 && x.flushOuts >= 8) return { level: 2, suit }; }
  if (f.board.length === 3) for (const card of cards) { const suit = fs.suitOf(card); if (ofSuit(suit) === 3) return { level: 1, suit }; }
  return { level: 0, suit: -1 };
}

/** What each of a decision's hands is worth by the actions it takes there, in % of the pot (as measure() has it). */
function worthOf(s) {
  if (s.worths) return s.worths;
  const out = new Float64Array(s.fs.COMBOS).fill(NaN); const on = s.actions.map((a, i) => (a.on ? i : -1)).filter((i) => i >= 0);
  const values = on.map((a) => s.closely(a).value);
  for (let c = 0; c < s.fs.COMBOS; c++) {
    if (!(s.f.mine[c] > 0)) continue;
    let w = 0, t = 0; on.forEach((a, k) => { const p = s.sigma(c, a); if (p > 0 && !Number.isNaN(values[k][c])) { w += p; t += p * values[k][c]; } });
    if (w > 0.5) out[c] = (100 * t) / w / s.pot;
  }
  return (s.worths = out);
}

/** The two ranks, high then low, and whether the hand is suited. */
function shapeOf(fs, c) {
  const [a, b] = cardsOf(fs, c); const ra = fs.rankOf(a); const rb = fs.rankOf(b);
  return { hi: Math.max(ra, rb), lo: Math.min(ra, rb), suited: fs.suitOf(a) === fs.suitOf(b) };
}

/** The hands with the same ranks, suitedness, made hand and straight draw, but another flush draw. */
function twinCandidates(s, c, mine) {
  const { fs, f } = s; const shape = shapeOf(fs, c); const x = s.featuresOf(c); const found = [];
  for (let h = 0; h < fs.COMBOS; h++) {
    if (h === c || !(f.mine[h] > 0)) continue;
    const other = shapeOf(fs, h); if (other.hi !== shape.hi || other.lo !== shape.lo || other.suited !== shape.suited) continue;
    const y = s.featuresOf(h); if (y.made !== x.made || y.straightOuts !== x.straightOuts) continue;
    const l = flushLevel(s, h); if (l.level !== mine.level) found.push({ h, level: l.level, suit: l.suit });
  }
  return found;
}

/** The twins as one group: how much of the range, how they play, their equity and their worth. */
function asGroup(s, group) {
  const { f } = s; const E = s.equity(); const W = worthOf(s); let w = 0, eq = 0, worth = 0, ww = 0; const mix = s.actions.map(() => 0);
  for (const t of group) {
    const k = f.mine[t.h]; w += k; s.actions.forEach((_, a) => { mix[a] += k * s.sigma(t.h, a); }); eq += k * E[t.h];
    if (!Number.isNaN(W[t.h])) { worth += k * W[t.h]; ww += k; }
  }
  return { weight: w, mix: mix.map((v) => v / w), eq: eq / w, worth: ww > 0 ? worth / ww : null };
}

const drawName = (level, suit) => `${level === 1 ? 'backdoor ' : ''}${SUIT_NAME[suit] ?? ''} ${level === 1 ? 'draw' : 'flush draw'}`.replace('  ', ' ');

/**
 * The twins of a hand at a decision: the hands of your range with the same two ranks, suited or not as it is, making
 * the same hand and the same straight draw, but with a different flush draw. Compared with the hand: those without a
 * draw when it has one, those with one when it has none. Null when there are none.
 */
export function twins(s, c) {
  const mine = flushLevel(s, c); const found = twinCandidates(s, c, mine);
  if (!found.length) return null;
  // against the hands without the draw; or, for a hand with none, against the ones with the least draw more than it (the backdoor before the flush draw)
  const want = Math.min(...found.map((t) => t.level)); const group = found.filter((t) => t.level === want);
  if (mine.level > 0 && want >= mine.level) return null;
  const { weight, mix, eq, worth } = asGroup(s, group); const W = worthOf(s); const have = mine.level > 0;
  const best = group.reduce((b, t) => (s.f.mine[t.h] > s.f.mine[b.h] ? t : b));
  const draw = drawName(have ? mine.level : want, have ? mine.suit : group[0].suit);
  return { have, draw, name: s.fs.formatCombo(best.h), several: group.length > 1, weight, mix, eq, worth, mineWorth: Number.isNaN(W[c]) ? null : W[c] };
}

/** A hand's worth beside the average worth of your other hands within five points of its equity. Null when there are too few. */
export function worthAround(s, c) {
  const { f } = s; const E = s.equity(); const W = worthOf(s); if (Number.isNaN(W[c])) return null;
  let w = 0, t = 0, all = 0;
  for (let h = 0; h < s.fs.COMBOS; h++) {
    if (!(f.mine[h] > 0)) continue; all += f.mine[h];
    if (h === c || Number.isNaN(W[h]) || Number.isNaN(E[h]) || Math.abs(E[h] - E[c]) > 0.05) continue;
    w += f.mine[h]; t += f.mine[h] * W[h];
  }
  return w >= 0.03 * all ? { mine: W[c], others: t / w } : null;
}
