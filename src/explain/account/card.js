import { blockedBy, facingOf, holds } from '../../combos.js';
import { liveOf, toStored } from './frame.js';

/**
 * An action that ends the street, split by the card that comes. For each card: `value[combo]`,
 * what that card adds to the action's value (chips; NaN where the hand holds the card), and
 * `then[combo]`, what the hand is worth once that card has come (chips, given the card). Null
 * when the action does not lead to a deal.
 */
export function byCard(f, a) {
  const chance = f.nodes[f.node.edges[a].child];
  if (chance.kind !== 'chance') return null;
  const next = chance.edges[0].child;
  const deal = { next, round: f.round + 1, terminal: f.nodes[next].kind !== 'decision' };
  const cards = [];
  for (let card = 0; card < 52; card++) if (!f.taken[card]) cards.push(cardSplit(f, deal, card));
  return cards;
}

function cardSplit(f, deal, card) {
  const { fs, solver } = f;
  const found = f.solution.spot.resolveBoard([...f.board, card]);
  const keep = (c) => !holds(fs, c, card) && !blockedBy(fs, c, f.taken);
  const mineS = toStored(fs, found.combos, f.mine, keep);
  const hisS = toStored(fs, found.combos, f.his, keep);
  const live = liveOf(solver.ctx, deal.round, found.board, f.me);
  const raw = solver.valuesAt(deal.next, found.board, f.me, mineS, hisS, live, live.length);
  return { card, ...valuesAfter(f, deal, card, raw, found.combos), terminal: deal.terminal };
}

/** What each hand gets from the card (`value`), and what it is worth against what he can still hold once it is out (`then`). */
function valuesAfter(f, deal, card, raw, stored) {
  const { fs } = f;
  const facing = facingOf(fs, f.his, (c) => holds(fs, c, card));
  const weight = f.solver.ctx.runoutWeight[deal.round];
  const value = new Float64Array(fs.COMBOS).fill(NaN); const then = new Float64Array(fs.COMBOS).fill(NaN);
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(f.mine[c] > 0) || !(f.mass[c] > 0) || holds(fs, c, card)) continue;
    const left = facing(c);
    value[c] = raw[stored[c]] / (f.mass[c] * f.scale);
    then[c] = left > 0 ? raw[stored[c]] / (left * weight) : NaN;
  }
  return { value, then };
}
