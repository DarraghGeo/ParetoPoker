/**
 * "What would change it" where the street is too large to play again: read off the solution hand by hand, with everything
 * else he does kept as it is. A bet is worth one thing when he folds and another when he does not, so each hand has a
 * share of folds at which betting and checking are worth the same; the bets that need the folds he gives, and the checks
 * that are a few folds short of a bet, are counted. Facing a bet: how much of what continues does so by a small margin.
 */
import { percent, howMuch, inTen, capitalize, isWager } from '../words.js';
import { betName } from './common.js';

/** A step of folds: ten points more or fewer. */
const STEP = 0.1;

const doesBy = (s, kinds) => (c, pick) => kinds.reduce((t, k, a) => t + (pick(k) ? s.sigma(c, a) : 0), 0);

function closeText(x) {
  if (x <= 0.1) return 'What would change it. Very little: almost everything you continue with would still do so if the bet cost a quarter of the pot more.';
  if (x >= 0.9) return 'What would change it. The price: almost none of what you continue with could pay a quarter of the pot more.';
  return `What would change it. The price: ${howMuch(x)} of what you continue with is close enough that it would fold if the bet cost a quarter of the pot ` +
    `more. The rest would still continue.`;
}

/** Facing a bet: how much of what continues is worth less than a quarter of the pot more than folding. */
function facingChange(s, kinds) {
  const { fs, f } = s; const does = doesBy(s, kinds); const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call'); if (fi < 0 || ci < 0) return null;
  const C = s.closely(ci); const F = s.closely(fi); if (!C || !F) return null; const more = 0.25 * s.pot;
  let cont = 0, close = 0;
  for (let c = 0; c < fs.COMBOS; c++) {
    const w = f.mine[c]; if (!(w > 0)) continue; const d = C.value[c] - F.value[c]; if (Number.isNaN(d)) continue;
    const on = w * does(c, (k) => k !== 'fold'); cont += on; if (d < more) close += on;
  }
  if (!(cont > 0)) return null; const x = close / cont;
  const detail = `Counted hand by hand from the solution, keeping the hands he bets as they are: ${percent(x)} of what continues is worth less than a ` +
    `quarter of the pot more than folding. The street is too large to solve again here.`;
  return { facing: true, close: x, said: { id: 'change', text: closeText(x), detail } };
}

/** The share of folds at which betting is worth what checking is, for one hand (2: never; 0: even with no folds). */
function foldsNeeded(X, Q, fold, c, p) {
  const whenFolds = fold.value[c] / p; const rest = (X.value[c] - fold.value[c]) / (1 - p);
  return whenFolds > rest ? (Q.value[c] - rest) / (whenFolds - rest) : (rest >= Q.value[c] ? 0 : 2);
}

/** Over the range: the bets that need no folds, the bets ten points of folds would turn, the checks ten points more would turn. */
function margins(s, kinds, { X, Q, fold }) {
  const { fs, f } = s; const does = doesBy(s, kinds); let B = 0, free = 0, stop = 0, K = 0, start = 0, folds = 0, W = 0;
  for (let c = 0; c < fs.COMBOS; c++) {
    const w = f.mine[c]; if (!(w > 0)) continue; const p = fold.share[c];
    if (!(p > 0.02 && p < 0.98) || Number.isNaN(X.value[c]) || Number.isNaN(Q.value[c])) continue;
    const need = foldsNeeded(X, Q, fold, c, p); const b = w * does(c, isWager); const k = w - b;
    B += b; K += k; folds += w * p; W += w; if (need <= 0.02) free += b; if (need > p - STEP) stop += b; if (need < p + STEP) start += k;
  }
  if (!(W > 0)) return null;
  return { facing: false, folds: folds / W, free: B > 0 ? free / B : null, stop: B > 0 ? stop / B : null, start: K > 0 ? start / K : null, bet: B / W };
}

const allOr = (x) => (x >= 0.9 ? 'almost all' : howMuch(x));

function betsSaid(r, fewer) {
  const free = r.free >= 0.9 ? 'Almost none of your bets need him to fold: they would still be bets if he never did.'
    : r.free <= 0.1 ? 'Almost all of your bets need him to fold.' : `${howMuch(r.free)} of your bets do not need him to fold at all.`;
  const stop = r.stop >= 0.1 ? `If he folded ${fewer} instead of ${inTen(r.folds)}, ${allOr(r.stop)} of your bets would be better checked.`
    : `Even if he folded ${fewer} instead of ${inTen(r.folds)}, your bets would stay bets.`;
  return [free, stop];
}

function checksSaid(r, extra) {
  if (r.start >= 0.1) return `If he folded ${extra}, ${allOr(r.start)} of your checks would be better bet.`;
  return `Your checks are not close: they would stay checks even if he folded ${extra}.`;
}

function said(r) {
  const out = []; const fewer = inTen(Math.max(0, r.folds - STEP)); const extra = inTen(Math.min(1, r.folds + STEP));
  if (r.bet >= 0.05) out.push(...betsSaid(r, fewer));
  if (r.bet <= 0.95 && r.start != null) out.push(checksSaid(r, extra));
  return out;
}

function actingDetail(r, edge) {
  const free = r.free == null ? ''
    : ` ${percent(r.free)} of the betting is worth more than checking even with no folds; ${percent(r.stop)} of it stops being so with ten points fewer folds.`;
  return `Counted hand by hand from the solution, for ${betName(edge)}, keeping everything else he does as it is: he folds ${percent(r.folds)} now.${free}`
    + ' The street is too large to solve again here. Where streets could be solved again (66 decisions measured), taking his strongest hands out raised'
    + ' the betting or left it and never lowered it, and taking yours out lowered it or left it.';
}

/** First to act: how close the main bet and the check are, counted against his folds to that bet. */
function actingChange(s, kinds) {
  const bets = kinds.map((k, a) => (isWager(k) ? a : -1)).filter((a) => a >= 0); const xi = kinds.indexOf('check'); if (!bets.length || xi < 0) return null;
  const main = bets.reduce((b, a) => (s.actions[a].freq > s.actions[b].freq ? a : b)); const X = s.closely(main); const Q = s.closely(xi);
  const fold = X?.replies?.find((r) => r.kind === 'fold'); if (!X || !Q || !fold) return null;
  const r = margins(s, kinds, { X, Q, fold }); if (!r) return null;
  const sentences = said(r); if (!sentences.length) return null;
  return { ...r, said: { id: 'change', text: `What would change it. ${sentences.map(capitalize).join(' ')}`, detail: actingDetail(r, s.f.node.edges[main]) } };
}

export function firstOrder(s) {
  if (!s.solution) return null;
  const kinds = s.f.node.edges.map((e) => e.kind);
  return s.toCall > 0 ? facingChange(s, kinds) : actingChange(s, kinds);
}
