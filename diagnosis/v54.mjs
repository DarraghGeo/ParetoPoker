// The interchange test by any grouping: hands that share a key play the solver's average over
// them (his range, the frequencies and the mixing are the solver's). What a grouping loses is
// what telling its hands apart would have been worth.
//   node diagnosis/v54.mjs <set> <grouping,grouping,...|all>
import { SETS, measure, format } from '../bin/compare.js';
import { Equity, SelectionContext, cards, presets } from '../src/index.js';
const { NUM_COMBOS, COMBO_A, COMBO_B } = cards;
const equity = new Equity();
const context = (d) => new SelectionContext({ equity, position: d.position, spot: d.spot, board: d.board, hero: d.hero, villain: d.villain, villainPrior: d.villainPrior, actions: d.actions });

/** Band (0..n-1) of each hand by `score`, in equal shares of the range. */
export function bands(score, hero, n) {
  const ids = []; let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (hero[i] > 1e-9) { ids.push(i); total += hero[i]; }
  ids.sort((a, b) => (Number.isNaN(score[a]) ? -1 : score[a]) - (Number.isNaN(score[b]) ? -1 : score[b]));
  const out = new Int32Array(NUM_COMBOS); let seen = 0;
  for (const i of ids) { out[i] = Math.min(n - 1, Math.floor((n * (seen + hero[i] / 2)) / total)); seen += hero[i]; }
  return out;
}
function removal(weights) {
  const byCard = new Float64Array(52); let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0) { byCard[COMBO_A[i]] += weights[i]; byCard[COMBO_B[i]] += weights[i]; total += weights[i]; }
  const o = new Float64Array(NUM_COMBOS);
  for (let i = 0; i < NUM_COMBOS; i++) o[i] = total > 0 ? (byCard[COMBO_A[i]] + byCard[COMBO_B[i]] - weights[i]) / total : 0;
  return o;
}
/** How much more of his best quarter than of his worst quarter each hand blocks. */
export function blockEdge(d) {
  const his = equity.against(d.board, d.hero, d.villain);
  const band = bands(his, d.villain, 4);
  const part = (k) => d.villain.map((w, i) => (w > 1e-9 && band[i] === k ? w : 0));
  const top = removal(part(3)); const bottom = removal(part(0));
  return top.map((x, i) => x - bottom[i]);
}
/** The actions that cost the hand no more than `tau` of the pot: its status. */
const status = (tau) => (d) => Array.from({ length: NUM_COMBOS }, (_, i) => d.gaps.map((g) => (g[i] <= tau ? 1 : 0)).join(''));
const cross = (...fs) => (d) => { const parts = fs.map((f) => f(d)); return Array.from({ length: NUM_COMBOS }, (_, i) => parts.map((p) => p[i]).join('|')); };
const byEquity = (n) => (d) => bands(context(d).strength, d.hero, n);
const byBlock = (n) => (d) => bands(blockEdge(d), d.hero, n);
const cardsToCome = (d) => d.board.length < 5;
const feature = (name, n) => (d) => (cardsToCome(d) ? bands(context(d).features[name], d.hero, n) : bands(context(d).strength, d.hero, n));
const draws = (d) => (cardsToCome(d) ? context(d).kinds.draw : new Int32Array(NUM_COMBOS));
const pairs = (d) => context(d).kinds.pair;

/**
 * Hands clustered by their equity on every next card (k-means, started from equity bands): two
 * hands are alike when they are worth the same on the same cards, not merely on average.
 */
export function byRunouts(k, sorted = false) {
  return (d) => {
    if (!cardsToCome(d)) return bands(context(d).strength, d.hero, k);
    const ids = []; for (let i = 0; i < NUM_COMBOS; i++) if (d.hero[i] > 1e-9) ids.push(i);
    const strength = context(d).strength;
    const columns = [];
    for (let card = 0; card < 52; card++) if (!d.board.includes(card)) columns.push({ card, e: equity.against([...d.board, card], d.villain, d.hero) });
    const vectors = new Map(ids.map((i) => [i, columns.map(({ card, e }) => (COMBO_A[i] === card || COMBO_B[i] === card || Number.isNaN(e[i]) ? strength[i] : e[i]))]));
    // `sorted`: only the distribution of the hand's river equities counts, not which cards bring them
    if (sorted) for (const v of vectors.values()) v.sort((a, b) => a - b);
    const dims = columns.length;
    const start = bands(strength, d.hero, k);
    let assign = new Map(ids.map((i) => [i, start[i]]));
    for (let pass = 0; pass < 12; pass++) {
      const centres = Array.from({ length: k }, () => ({ w: 0, v: new Float64Array(dims) }));
      for (const i of ids) { const c = centres[assign.get(i)]; const v = vectors.get(i); c.w += d.hero[i]; for (let j = 0; j < dims; j++) c.v[j] += d.hero[i] * v[j]; }
      for (const c of centres) if (c.w > 0) for (let j = 0; j < dims; j++) c.v[j] /= c.w;
      let moved = 0;
      for (const i of ids) {
        const v = vectors.get(i); let best = assign.get(i); let bestD = Infinity;
        for (let c = 0; c < k; c++) { if (!(centres[c].w > 0)) continue; let dist = 0; for (let j = 0; j < dims; j++) { const x = v[j] - centres[c].v[j]; dist += x * x; } if (dist < bestD) { bestD = dist; best = c; } }
        if (best !== assign.get(i)) { assign.set(i, best); moved++; }
      }
      if (!moved) break;
    }
    const out = new Int32Array(NUM_COMBOS); for (const i of ids) out[i] = assign.get(i);
    return out;
  };
}

export const GROUPINGS = {
  'runout profile x20': byRunouts(20),
  'runout profile x50': byRunouts(50),
  'runout profile x100': byRunouts(100),
  'runout distribution x50': byRunouts(50, true),
  'runout distribution x100': byRunouts(100, true),
  'one group (everything alike)': () => new Int32Array(NUM_COMBOS),
  'status 0.5%': status(0.005),
  'status 0.2%': status(0.002),
  'status 1%': status(0.01),
  'status 2%': status(0.02),
  'equity x20': byEquity(20),
  'equity x10': byEquity(10),
  'equity x5': byEquity(5),
  'equity x50': byEquity(50),
  'equity x100': byEquity(100),
  'equity exact (every distinct equity its own group)': (d) => Array.from(context(d).strength, (x) => Math.round(x * 1e4)),
  'equity x50, blockers x2': cross(byEquity(50), byBlock(2)),
  'equity x25, blockers x2': cross(byEquity(25), byBlock(2)),
  'equity x25, blockers x4': cross(byEquity(25), byBlock(4)),
  'equity x50, made hand class': cross(byEquity(50), pairs),
  'made hand class alone': pairs,
  'equity x20, made hand class': cross(byEquity(20), pairs),
  'equity x10, blockers x2': cross(byEquity(10), byBlock(2)),
  'equity x10, blockers x3': cross(byEquity(10), byBlock(3)),
  'equity x5, blockers x4': cross(byEquity(5), byBlock(4)),
  'equity x10, made hand class': cross(byEquity(10), pairs),
  'status 0.5%, equity x5': cross(status(0.005), byEquity(5)),
  'status 0.5%, blockers x3': cross(status(0.005), byBlock(3)),
  'equity x10, strength now x5': cross(byEquity(10), feature('strengthNow', 5)),
  'equity x10, draw equity x5': cross(byEquity(10), feature('drawEquity', 5)),
  'equity x10, swing x5': cross(byEquity(10), feature('swing', 5)),
  'equity x10, E[HS2] x5': cross(byEquity(10), feature('ehs2', 5)),
  'equity x10, best card x5': cross(byEquity(10), feature('bestCard', 5)),
  'equity x10, upside x5': cross(byEquity(10), feature('upside', 5)),
  'equity x10, downside x5': cross(byEquity(10), feature('downside', 5)),
  'equity x10, implied odds x5': cross(byEquity(10), feature('impliedOdds', 5)),
  'equity x10, spread x5': cross(byEquity(10), feature('spread', 5)),
  'equity x10, slope x5': cross(byEquity(10), feature('slope', 5)),
  'equity x10, blockers x5': cross(byEquity(10), byBlock(5)),
  'equity x7, strength now x7': cross(byEquity(7), feature('strengthNow', 7)),
  'equity x5, strength now x5, draw class': cross(byEquity(5), feature('strengthNow', 5), draws),
  'equity x10, strength now x5, draw class': cross(byEquity(10), feature('strengthNow', 5), draws),
  'equity x10, strength now x10': cross(byEquity(10), feature('strengthNow', 10)),
  'equity x20, strength now x10': cross(byEquity(20), feature('strengthNow', 10)),
  'strength now x5, draw class': cross(feature('strengthNow', 5), draws),
  'strength now x10, draw class': cross(feature('strengthNow', 10), draws),
  'E[HS2] x20': feature('ehs2', 20),
  'equity x10, draw class': cross(byEquity(10), draws),
  'equity x10, swing x2': cross(byEquity(10), feature('swing', 2)),
  'equity x10, best card x2': cross(byEquity(10), feature('bestCard', 2)),
  'status 0.5%, draw class': cross(status(0.005), draws),
  'strength now x5, draw class, blockers x2': cross(feature('strengthNow', 5), draws, byBlock(2)),
};
if (import.meta.url === `file://${process.argv[1]}`) {
  const [set, which, street, kind] = process.argv.slice(2);
  const names = which === 'all' ? Object.keys(GROUPINGS) : which.split(';');
  const kinds = { open: (d) => !d.facing, bet: (d) => d.facing && d.raises === 0, raise: (d) => d.facing && d.raises > 0 };
  const where = (d) => (!street || d.street === street) && (!kind || kinds[kind](d));
  for (const name of names) {
    console.log(`${set.padEnd(12)} ${(street ? `[${street} only${kind ? `, ${kind}` : ''}] ` : '') + name.padEnd(44)} ${format(await measure(SETS[set], presets.fitted, { ranges: 'solver', hands: 'solver-by-groups', groups: GROUPINGS[name.replace(/, pure$/, '')], pure: name.endsWith(', pure'), where, firstStreet: !!street }))}`);
  }
}
