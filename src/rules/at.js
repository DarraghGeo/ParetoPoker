// The rule for a hand at a decision, from the two ranges as they stand there: the hand's equity against his range, its
// draw, and the shares of the ranges the rules read, each counted only when a rule asks for it.
import { features } from '../explain/features.js';
import { bothEquities, equityVs } from '../solver/equity.js';
import { ruleFor } from './rules.js';

/** Top pair or better, made with at least one of the hand's own cards. */
const topPairUp = (x) => x.made >= 4 || x.own >= 2 || (x.made === 3 && x.own > 0) || (x.own === 1 && (x.pair === 'top pair' || x.pair === 'overpair'));

/** How much of a range is top pair or better on the board. */
export function topShare(fs, board, range) {
  let all = 0, top = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (range[c] > 0) { all += range[c]; if (topPairUp(features(fs, board, c))) top += range[c]; }
  return all > 0 ? top / all : 0;
}

/** How much of his range is strong (80% or more against mine) and weak (under 30%). */
export function shapeOf(fs, board, mine, his) {
  const eq = bothEquities(fs, board, mine, his)[1]; let all = 0, strong = 0, weak = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (his[c] > 0 && !Number.isNaN(eq[c])) { all += his[c]; if (eq[c] >= 0.8) strong += his[c]; else if (eq[c] < 0.3) weak += his[c]; }
  return all > 0 ? { strong: strong / all, weak: weak / all } : { strong: 0, weak: 0 };
}

/**
 * @param {{ board: number[], mine: ArrayLike<number>, his: ArrayLike<number>, combo: number, ip: boolean, toCall: number,
 *   pot: number, raised: boolean, raiser: 'oop'|'ip'|null }} d The decision: both ranges by combination, hero's hand, and the betting.
 * @returns {{ id, says, why, equity: number } | null} Null where the hand has nothing of his range to face.
 */
export function ruleAt(fs, d) {
  const one = new Float64Array(fs.COMBOS); one[d.combo] = 1;
  const equity = equityVs(fs, d.board, one, d.his)[d.combo]; if (Number.isNaN(equity)) return null;
  const x = features(fs, d.board, d.combo); const draw = d.board.length < 5 && (x.flushOuts >= 8 || x.straightOuts >= 8);
  const rule = ruleFor({ street: d.board.length - 3, ip: d.ip, toCall: d.toCall, pot: d.pot, raised: d.raised, raiser: d.raiser, equity, draw,
    topPair: () => ({ mine: topShare(fs, d.board, d.mine), his: topShare(fs, d.board, d.his) }), hisShape: () => shapeOf(fs, d.board, d.mine, d.his) });
  return { ...rule, equity };
}
