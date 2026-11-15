// Hands of exactly its strength that play differently, and whether its cards are the reason.
import { weightedMean } from '../rows.js';
import { peerCards } from './cards.js';
import { atPrice } from './facing.js';
import { pct } from './terms.js';
import { move, say } from './view.js';

const otherHands = (n) => (n === 1 ? 'other hand' : `${n} other hands`);

/** How often the hands of this strength take the move together. */
const levelMoves = ({ level, facing, fold, bets }) =>
  level.mix.reduce((t, x, a) => t + (facing ? (a === fold ? 0 : x) : (bets.includes(a) ? x : 0)), 0);

export function saySameStrength(view) {
  const { s, row, hand, level, verb } = view;
  if (level.rows.length <= 1 || (view.facing && atPrice(s, row)) || !hand.cards) return;
  const others = level.rows.filter((r) => r !== row);
  const mine = move(view, row);
  const theirs = weightedMean(others, (r) => move(view, r));
  if (!(Math.abs(mine - theirs) > 0.15)) return;
  const { meanBetter, meanWorse } = peerCards(others);
  const n = others.length;
  if (Math.abs(row.removesBetter - meanBetter) + Math.abs(row.removesWorse - meanWorse) >= 0.02) {
    say(view, 'blockers', `Why this one and not the ${otherHands(n)} of exactly its strength, which ${verb} ${pct(theirs)} of the time `
      + `against its ${pct(mine)}? The cards: yours take out ${pct(row.removesBetter)} of the hands that beat you `
      + `and ${pct(row.removesWorse)} of the hands you beat; theirs take out ${pct(meanBetter)} and ${pct(meanWorse)}.`);
  } else {
    say(view, 'arbitrary', `The ${otherHands(n)} of exactly its strength ${verb} ${pct(theirs)} of the time against its ${pct(mine)}, `
      + `and their cards do nothing different. Read them as one hand: together they ${verb} ${pct(levelMoves(view))}, `
      + "and which of them does it is the solver's bookkeeping.");
  }
}
