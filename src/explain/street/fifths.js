// The range in five parts by strength (equity against his range here), each a fifth of its weight: what each part does
// as a group. A hand's own frequency is arbitrary; a fifth of the range's is not. Beside them: each hand's type and the
// hands of about its strength, and every type and name in the range with what it does.
import { typeOf, tagsOf, TAG_ORDER } from '../features.js';
import { isWager } from './words.js';

/** Hands within this much equity of one another are 'of about the same strength'. */
export const NEAR = 0.1;

const isDraw = (name) => /draw|open-ended|gutshot/.test(name ?? '') && !/pair/.test(name ?? '');

function byStrength(fs, f, eq) {
  const hands = []; for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0 && !Number.isNaN(eq[c])) hands.push(c);
  return hands.sort((x, y) => eq[x] - eq[y]);
}

/** What each hand does: puts money in (first to act), or does not fold (facing a bet). */
function movesOf({ fs, f, sigma }, hands) {
  const facingBet = f.node.invested[1 - f.me] - f.node.invested[f.me] > 0; const moveOf = new Float64Array(fs.COMBOS);
  const moves = (kind) => (facingBet ? kind !== 'fold' : isWager(kind));
  for (const c of hands) { let mv = 0; f.node.edges.forEach((e, a) => { if (moves(e.kind)) mv += sigma(c, a); }); moveOf[c] = mv; }
  return moveOf;
}

function fifthList(fs, f, hands, eq, all, moveOf) {
  const of = new Int8Array(fs.COMBOS).fill(-1); const list = [0, 1, 2, 3, 4].map(() => ({ weight: 0, lo: 1, hi: 0, eq: 0, move: 0 }));
  let seen = 0;
  for (const c of hands) {
    const b = Math.min(4, Math.floor((5 * (seen + f.mine[c] / 2)) / all)); seen += f.mine[c]; of[c] = b;
    const t = list[b]; t.weight += f.mine[c]; t.lo = Math.min(t.lo, eq[c]); t.hi = Math.max(t.hi, eq[c]); t.eq += f.mine[c] * eq[c];
    t.move += f.mine[c] * moveOf[c];
  }
  for (const t of list) if (t.weight > 0) { t.eq /= t.weight; t.move /= t.weight; }
  return { of, list };
}

/** Around a hand's equity (ten points either side): its own type as a group, and every other type as a group. */
function nearOf({ f, hands, eq, nameOf, moveOf, all }, c) {
  const group = () => ({ weight: 0, move: 0 });
  const out = { type: nameOf[c], draw: isDraw(nameOf[c]), same: group(), rest: group(), draws: group(), others: group(), all };
  if (!nameOf[c]) return out;
  for (const h of hands) {
    if (Math.abs(eq[h] - eq[c]) > NEAR) continue;
    const groups = [nameOf[h] === nameOf[c] ? out.same : out.rest, isDraw(nameOf[h]) ? out.draws : out.others];
    for (const t of groups) { t.weight += f.mine[h]; t.move += f.mine[h] * moveOf[h]; }
  }
  for (const t of [out.same, out.rest, out.draws, out.others]) if (t.weight > 0) t.move /= t.weight;
  return out;
}

/** A hand joins a named group: its weight, its equity and its strategy, action by action (`ids`: which hands are in it). */
function join({ f, n, sigma }, groups, name, c, eq, withIds) {
  let k = groups.get(name); if (!k) groups.set(name, k = { name, weight: 0, eq: 0, mix: f.node.edges.map(() => 0), ...(withIds ? { ids: [] } : {}) });
  if (withIds) k.ids.push(c);
  k.weight += f.mine[c]; k.eq += f.mine[c] * eq[c]; for (let a = 0; a < n; a++) k.mix[a] += f.mine[c] * sigma(c, a);
}

function settle(groups, all) {
  for (const k of groups.values()) { k.eq /= k.weight; k.mix = k.mix.map((x) => x / k.weight); k.share = k.weight / all; }
  return [...groups.values()];
}

/** Every type in the range, and every name that fits each hand (a hand can carry several): how much of it, how strong, what it does. */
function typesAndTags(ctx, hands, eq, nameOf, all) {
  const { fs, f, featuresOf } = ctx; const kinds = new Map(); const tagsFor = new Array(fs.COMBOS); const tags = new Map();
  for (const c of hands) join(ctx, kinds, nameOf[c], c, eq, false);
  for (const c of hands) { tagsFor[c] = tagsOf(fs, f.board, c, featuresOf(c)); for (const name of tagsFor[c]) join(ctx, tags, name, c, eq, true); }
  const kindList = settle(kinds, all).sort((x, y) => y.eq - x.eq);
  return { kinds: kindList, tagsFor, tagList: settle(tags, all).sort((x, y) => TAG_ORDER.indexOf(x.name) - TAG_ORDER.indexOf(y.name)) };
}

/** `ctx`: the studied decision's { fs, f, n, sigma, featuresOf, equity }. */
export function fifthsOf(ctx) {
  const { fs, f, featuresOf } = ctx; const eq = ctx.equity();
  const hands = byStrength(fs, f, eq); const all = hands.reduce((t, c) => t + f.mine[c], 0);
  const moveOf = movesOf(ctx, hands); const nameOf = new Array(fs.COMBOS);
  for (const c of hands) nameOf[c] = typeOf(fs, f.board, c, featuresOf(c));
  const { of, list } = fifthList(fs, f, hands, eq, all, moveOf);
  const { kinds, tagsFor, tagList } = typesAndTags(ctx, hands, eq, nameOf, all);
  const near = (c) => nearOf({ f, hands, eq, nameOf, moveOf, all }, c);
  return { of, list, near, nameOf, kinds, tagsFor, tagList, hands, all };
}
