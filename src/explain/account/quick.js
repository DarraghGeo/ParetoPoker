// One action looked at quickly: what it is worth to each hand and how that splits by his reply or by the next card, from
// the solver's own value walk (its fast engine), in the shape best/closely.js gives. The hand's later play is the solved
// strategy, not its best reply: the same thing for an action a hand takes, and nothing to rely on for one it does not
// (its later strategy was never trained), so a caller reads these only for the actions a hand takes. This is what makes
// a flop explanation a matter of seconds: the careful walk goes through every turn and river in JavaScript.
import { facingOf, holds } from '../../combos.js';
import { byCard } from './card.js';
import { byReply } from './reply.js';
import { chips } from './values.js';

/** How much of the time each card comes for each hand, of the cards it does not hold (adding to 1 over the cards). */
function withWeights(f, cards) {
  const n = 52 - f.board.length - 4;
  return cards.map((k) => {
    const facing = facingOf(f.fs, f.his, (c) => holds(f.fs, c, k.card)); const weight = new Float64Array(f.fs.COMBOS).fill(NaN);
    for (let c = 0; c < f.fs.COMBOS; c++) if (!Number.isNaN(k.value[c])) weight[c] = facing(c) / n / f.mass[c];
    return { ...k, weight };
  });
}

/** A value worked out the first time it is read. */
function lazy(target, name, make) {
  let made = false; let value;
  Object.defineProperty(target, name, { enumerable: true, get: () => { if (!made) { value = make(); made = true; } return value; } });
}

/**
 * @returns {{ value: Float64Array, replies: null | object[], cards: null | object[], holdings: Map }} As `closely`
 *   (best/closely.js); the splits are worked out when first read.
 */
export function quickly(f, a) {
  const edge = f.node.edges[a]; const out = { holdings: new Map() };
  lazy(out, 'value', () => chips(f, edge.child, f.hisS));
  lazy(out, 'replies', () => byReply(f, a));
  lazy(out, 'cards', () => { const cards = byCard(f, a); return cards && withWeights(f, cards); });
  return out;
}
