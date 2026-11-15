/**
 * A flop or turn decision, measured: everything an explanation of one hand may quote, computed
 * once for the decision and read per hand.
 *
 * Nothing here is worded. `study` gathers the decision; `measure` reads one hand off it. The
 * same two calls serve the page (which words what passes its gates) and the proof harness (which
 * measures the same hand in a far finer solve and checks each worded claim against it).
 *
 * All values are in % of the pot at this decision.
 */
import { frameAt } from './account.js';
import { evaluator } from './best.js';
import { features, groupOf, typeOf, tagsOf, TAG_ORDER, TYPES } from './features.js';
import { equityVs } from '../solver/flopsolve.js';

/** An action the range takes at least this often is on the path; a rarer one leads where the solution is not pinned down. */
export const ON_PATH = 0.05;
/** Hands within this much equity of one another are 'of about the same strength'. */
export const NEAR = 0.1;

export function study(fs, solution, nodes, id, dealt = []) {
  const f = frameAt(fs, solution, nodes, id, dealt);
  if (!f) return null;
  const N = fs.COMBOS;
  const view = solution.strategyAt(id, f.at);
  const n = view.actions.length;
  const row = new Int32Array(N).fill(-1); view.combos.forEach((c, i) => { row[c] = i; });
  const sigma = (c, a) => { const i = row[f.stored[c]]; return i < 0 ? 0 : view.probs[i * n + a]; };
  // how often the range takes each action
  let total = 0; const taken = f.node.edges.map(() => 0);
  for (let c = 0; c < N; c++) if (f.mine[c] > 0) { total += f.mine[c]; for (let a = 0; a < n; a++) taken[a] += f.mine[c] * sigma(c, a); }
  const actions = f.node.edges.map((e, a) => ({ kind: e.kind, label: e.label, freq: taken[a] / total, on: taken[a] / total >= ON_PATH, endsStreet: nodes[e.child].kind === 'chance', replies: nodes[e.child].kind === 'decision' ? nodes[e.child].edges.map((x) => ({ kind: x.kind, label: x.label })) : null }));
  // how much of each starting range takes this line
  const sum = (v) => { let t = 0; for (let c = 0; c < N; c++) t += v[c]; return t; };
  const lineReach = [sum(f.mine) / sum(solution.reachAt(0, 0, f.me)), sum(f.his) / sum(solution.reachAt(0, 0, 1 - f.me))];
  const feats = new Map();
  const featuresOf = (c) => { let x = feats.get(c); if (!x) feats.set(c, x = features(fs, f.board, c)); return x; };
  const best = evaluator(fs, solution, nodes);
  const close = new Map();
  // (the split by what he holds is not asked for: it does not survive the proof, see PROOF.md)
  const closely = (a) => { let x = close.get(a); if (!x) close.set(a, x = best.closely(f, a, null)); return x; };
  let equity = null;
  // The range in five parts by strength (equity against his range here), each a fifth of its weight: what each part
  // does as a group. A hand's own frequency is arbitrary; a fifth of the range's is not.
  let fifths = null;
  const facingBet = f.node.invested[1 - f.me] - f.node.invested[f.me] > 0;
  const bands = () => {
    if (fifths) return fifths;
    const eq = equity ?? (equity = equityVs(fs, f.board, f.mine, f.his));
    const hands = []; for (let c = 0; c < N; c++) if (f.mine[c] > 0 && !Number.isNaN(eq[c])) hands.push(c);
    hands.sort((x, y) => eq[x] - eq[y]);
    const all = hands.reduce((t, c) => t + f.mine[c], 0);
    const of = new Int8Array(N).fill(-1); const list = [0, 1, 2, 3, 4].map(() => ({ weight: 0, lo: 1, hi: 0, eq: 0, move: 0 }));
    let seen = 0;
    for (const c of hands) {
      const b = Math.min(4, Math.floor((5 * (seen + f.mine[c] / 2)) / all)); seen += f.mine[c]; of[c] = b;
      const t = list[b]; t.weight += f.mine[c]; t.lo = Math.min(t.lo, eq[c]); t.hi = Math.max(t.hi, eq[c]); t.eq += f.mine[c] * eq[c];
      // what the group does: puts money in (first to act), or does not fold (facing a bet)
      let move = 0; f.node.edges.forEach((e, a) => { if (facingBet ? e.kind !== 'fold' : (e.kind !== 'check' && e.kind !== 'call' && e.kind !== 'fold')) move += sigma(c, a); });
      t.move += f.mine[c] * move;
    }
    for (const t of list) if (t.weight > 0) { t.eq /= t.weight; t.move /= t.weight; }
    // each hand's own move and name, for comparing a type with the other hands of about its strength
    const moveOf = new Float64Array(N); const nameOf = new Array(N);
    for (const c of hands) { let mv = 0; f.node.edges.forEach((e, a) => { if (facingBet ? e.kind !== 'fold' : (e.kind !== 'check' && e.kind !== 'call' && e.kind !== 'fold')) mv += sigma(c, a); }); moveOf[c] = mv; nameOf[c] = typeOf(fs, f.board, c, featuresOf(c)); }
    /** Around a hand's equity (ten points either side): its own type as a group, and every other type as a group. */
    const isDraw = (name) => /draw|open-ended|gutshot/.test(name ?? '') && !/pair/.test(name ?? '');
    const near = (c) => {
      const out = { type: nameOf[c], draw: isDraw(nameOf[c]), same: { weight: 0, move: 0 }, rest: { weight: 0, move: 0 }, draws: { weight: 0, move: 0 }, others: { weight: 0, move: 0 }, all };
      if (!nameOf[c]) return out;
      for (const h of hands) {
        if (Math.abs(eq[h] - eq[c]) > NEAR) continue;
        for (const t of [nameOf[h] === nameOf[c] ? out.same : out.rest, isDraw(nameOf[h]) ? out.draws : out.others]) { t.weight += f.mine[h]; t.move += f.mine[h] * moveOf[h]; }
      }
      for (const t of [out.same, out.rest, out.draws, out.others]) if (t.weight > 0) t.move /= t.weight;
      return out;
    };
    // every type in the range: how much of it, how strong, and what it does action by action
    const kinds = new Map();
    for (const c of hands) { let k = kinds.get(nameOf[c]); if (!k) kinds.set(nameOf[c], k = { name: nameOf[c], weight: 0, eq: 0, mix: f.node.edges.map(() => 0) }); k.weight += f.mine[c]; k.eq += f.mine[c] * eq[c]; for (let a = 0; a < n; a++) k.mix[a] += f.mine[c] * sigma(c, a); }
    for (const k of kinds.values()) { k.eq /= k.weight; k.mix = k.mix.map((x) => x / k.weight); k.share = k.weight / all; }
    // every name that fits each hand (a hand can carry several): how much of the range has it, and what those hands do
    const tagsFor = new Array(N); const tags = new Map();
    for (const c of hands) { tagsFor[c] = tagsOf(fs, f.board, c, featuresOf(c)); for (const name of tagsFor[c]) { let k = tags.get(name); if (!k) tags.set(name, k = { name, weight: 0, eq: 0, mix: f.node.edges.map(() => 0), ids: [] }); k.ids.push(c); k.weight += f.mine[c]; k.eq += f.mine[c] * eq[c]; for (let a = 0; a < n; a++) k.mix[a] += f.mine[c] * sigma(c, a); } }
    for (const k of tags.values()) { k.eq /= k.weight; k.mix = k.mix.map((x) => x / k.weight); k.share = k.weight / all; }
    const tagList = [...tags.values()].sort((x, y) => TAG_ORDER.indexOf(x.name) - TAG_ORDER.indexOf(y.name));
    return (fifths = { of, list, near, nameOf, kinds: [...kinds.values()].sort((x, y) => y.eq - x.eq), tagsFor, tagList, hands, all });
  };
  // A hand's equity in two parts. `now`: how much of his range it beats as the board stands. `draw`: the part of its
  // equity that it wins from behind, against hands that beat it now, on the cards still to come.
  let split = null;
  const drawParts = () => {
    if (split || f.board.length === 5) return split;
    const A = (c) => fs.COMBO_CARDS[2 * c]; const B = (c) => fs.COMBO_CARDS[2 * c + 1];
    const heroes = []; const villains = []; for (let c = 0; c < N; c++) { if (f.mine[c] > 0) heroes.push(c); if (f.his[c] > 0) villains.push(c); }
    const cur = new Float64Array(N); for (const c of new Set([...heroes, ...villains])) cur[c] = fs.evaluateCards([...f.board, A(c), B(c)]);
    const now = new Float64Array(N).fill(NaN); const draw = new Float64Array(N).fill(NaN);
    const clash = (h, v) => A(h) === A(v) || A(h) === B(v) || B(h) === A(v) || B(h) === B(v);
    for (const h of heroes) { let w = 0, t = 0; for (const v of villains) { if (clash(h, v)) continue; w += f.his[v]; t += f.his[v] * (cur[h] > cur[v] ? 1 : cur[h] === cur[v] ? 0.5 : 0); } if (w > 0) now[h] = t / w; }
    const won = new Float64Array(N); const mass = new Float64Array(N); const s = new Float64Array(N);
    const deck = []; for (let x = 0; x < 52; x++) if (!f.taken[x]) deck.push(x);
    const deal = (x, y) => {
      const full = y < 0 ? [...f.board, x] : [...f.board, x, y]; const out = (c) => A(c) === x || B(c) === x || A(c) === y || B(c) === y;
      const hs = heroes.filter((c) => !out(c)); const vs = villains.filter((c) => !out(c));
      for (const c of new Set([...hs, ...vs])) s[c] = fs.evaluateCards([...full, A(c), B(c)]);
      for (const h of hs) for (const v of vs) { if (clash(h, v)) continue; mass[h] += f.his[v]; if (cur[v] > cur[h]) won[h] += f.his[v] * (s[h] > s[v] ? 1 : s[h] === s[v] ? 0.5 : 0); }
    };
    if (f.board.length === 4) for (const x of deck) deal(x, -1);
    else for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) deal(deck[i], deck[j]);
    for (const h of heroes) if (mass[h] > 0) draw[h] = won[h] / mass[h];
    return (split = { now, draw });
  };
  // Every card that can come next, and each hand's equity once it has: how a hand's strength is spread over the next street
  let nextCards = null;
  const spread = () => {
    if (nextCards || f.board.length === 5) return nextCards;
    nextCards = [];
    for (let x = 0; x < 52; x++) {
      if (f.taken[x]) continue;
      const mine = Float64Array.from(f.mine); const his = Float64Array.from(f.his);
      for (let c = 0; c < N; c++) if (fs.COMBO_CARDS[2 * c] === x || fs.COMBO_CARDS[2 * c + 1] === x) { mine[c] = 0; his[c] = 0; }
      nextCards.push({ card: x, eq: equityVs(fs, [...f.board, x], mine, his) });
    }
    return nextCards;
  };
  return { fs, f, solution, dealt, pot: f.node.pot, toCall: f.node.invested[1 - f.me] - f.node.invested[f.me], actions, lineReach, sigma, featuresOf, closely, bands, spread, drawParts, equity: () => equity ?? (equity = equityVs(fs, f.board, f.mine, f.his)) };
}

/** One hand at a studied decision. `onlyOn`: measure only the actions on the path (the others cannot be relied on). */
export function measure(s, c, { onlyOn = true, worth = true } = {}) {
  const { f, fs } = s;
  if (!(f.mine[c] > 0) || !(f.mass[c] > 0)) return null;
  const pc = (chips) => (100 * chips) / s.pot;
  const A = fs.COMBO_CARDS[2 * c]; const B = fs.COMBO_CARDS[2 * c + 1];
  const before = fs.categoryOf(fs.evaluateCards([...f.board, A, B]));
  const acts = s.actions.map((act, a) => {
    if (!worth || (onlyOn && !act.on)) return { ...act, sigma: s.sigma(c, a), worth: null };
    const x = s.closely(a);
    const out = { ...act, sigma: s.sigma(c, a), worth: pc(x.value[c]) };
    if (x.replies) {
      out.reply = x.replies.map((r) => ({ kind: r.kind, label: r.label, share: r.share[c], part: pc(r.value[c]) }));
      // what the action is worth each time he does not fold
      let share = 0, part = 0; for (const r of out.reply) if (r.kind !== 'fold') { share += r.share; part += r.part; }
      out.continues = share; out.whenContinued = share > 0 ? part / share : null;
      const folded = out.reply.find((r) => r.kind === 'fold'); out.folds = folded ? folded.share : 0; out.fromFolds = folded ? folded.part : 0;
      // on the river a call is a showdown: from what the called bet is worth, how often the hand is ahead of what calls
      const ci = x.replies.findIndex((r) => r.kind === 'call');
      if (f.board.length === 5 && ci >= 0 && x.replies[ci].share[c] > 0.01) {
        const end = f.nodes[f.nodes[f.node.edges[a].child].edges[ci].child];
        if (end.kind === 'showdown') { const pot0 = f.nodes[0].pot; const win = pot0 / 2 + end.invested[1 - f.me]; const lose = pot0 / 2 + end.invested[f.me]; out.calls = x.replies[ci].share[c]; out.aheadWhenCalled = Math.min(1, Math.max(0, (x.replies[ci].value[c] / x.replies[ci].share[c] + lose) / (win + lose))); }
      }
    }
    out.holding = Object.fromEntries([...x.holdings.entries()].map(([g, r]) => [g, { share: r.share[c], part: pc(r.value[c]) }]));
    if (x.cards) {
      // the cards to come, apart by whether they lift the hand's made category: how many, how often they come
      // (`weight`, the two adding to 1) and how much of the action's worth arrives on them (`part`, likewise adding to the worth)
      const lift = { n: 0, weight: 0, part: 0 }; const rest = { n: 0, weight: 0, part: 0 };
      for (const k of x.cards) { if (Number.isNaN(k.value[c])) continue; const up = fs.categoryOf(fs.evaluateCards([...f.board, k.card, A, B])) > before; const t = up ? lift : rest; t.n++; t.weight += k.weight[c]; t.part += pc(k.value[c]); }
      out.cards = { lift, rest };
    }
    return out;
  });
  const fifths = worth ? s.bands() : null;
  return { combo: c, name: fs.formatCombo(c), features: s.featuresOf(c), equity: worth ? s.equity()[c] : null, reach: f.mine[c], actions: acts, band: fifths ? fifths.of[c] : null, bands: fifths ? fifths.list : null, near: fifths ? fifths.near(c) : null };
}

/**
 * How far each quoted quantity may be from the truth, by how finely the spot was solved and by
 * how much of the thinner range takes the line. Measured, not assumed: the largest difference
 * found between a solve of that accuracy and two far finer solves by different algorithms, over
 * every hand of the proof battery, times 1.5 (research/proof/tolerance.mjs; PROOF.md has the
 * table). Null: that quantity is not quoted there.
 *
 *   eq, folds: points.   gap, lift, rest, cmp: % of the pot.
 *   gap   the difference in worth between two actions the hand takes
 *   sign  how much worse an action the hand does not take must be, in this solve, before it is called worse
 *   cmp   what a bet is worth when he continues, less what the passive action is worth
 *   lift, rest   a call's gain over folding on the cards that lift the hand, and on the others
 */
export const TOLERANCE = {
  // Lines at least half of each range takes, and (with wider gates) lines a fifth to a half take.
  // Thinner than that, nothing is concluded.
  turn: [
    { upTo: 0.02, lines: [{ from: 0.5, eq: 1, folds: 1, gap: 1.1, sign: 2, role: 0.25, cmp: 3.5, lift: 0.5, rest: 1.5 }, { from: 0.2, eq: 4, folds: 2, gap: 2.3, sign: 4, role: null, cmp: 4.2, lift: 2.6, rest: 4.2 }] },
  ],
  // Rivers solve in a moment, so they are held to a finer solve; their mixes are looser all the same
  river: [
    { upTo: 0.01, lines: [{ from: 0.5, eq: 2, folds: 3, gap: 2.7, sign: 2, role: 0.25, cmp: 7.8, lift: null, rest: null }, { from: 0.2, eq: 4, folds: 3, gap: 4, sign: 5, role: null, cmp: 10, lift: null, rest: null }] },
  ],
  // The river once a card has come, inside a spot that started on the turn and was solved to 0.02% as a turn spot
  'river after a deal': [
    { upTo: 0.02, lines: [{ from: 0.5, eq: 3, folds: 3, gap: 4, sign: 5, role: 0.25, cmp: 10, lift: null, rest: null }] },
  ],
};
/**
 * Under test, not in use: flop spots at the accuracy a browser reaches. The proof harness tries these
 * beside the table above; they move into it only if they pass.
 */
export const ON_TRIAL = {
  ...TOLERANCE,
  // Flop spots at the accuracy a browser reaches (0.3%): the flop itself, and the turn once a card has come.
  // Gates are twice the largest differences measured on the one flop spot measured in full.
  // (the gate for 'worse' was raised from 3 to 5 after the first seventeen flop spots, where a finer solve reversed a
  // difference of 2.1; the 'extra' flop set was run after that and is the test of these gates as they stand)
  flop: [{ upTo: 0.3, lines: [{ from: 0.5, eq: 1, folds: 2, gap: 2.8, sign: 5, role: 0.25, cmp: 5, lift: 0.8, rest: 1.4 }] }],
  'turn after a deal': [{ upTo: 0.3, lines: [{ from: 0.5, eq: 2, folds: 2, gap: 2.4, sign: 5, role: 0.25, cmp: 3.6, lift: 1, rest: 2 }] }],
};
/** The tolerances that apply: `street` is 'turn' or 'flop' (where the decision is), `exploit` the solve's accuracy in % of the pot. */
export function tolerance(street, exploit, lineReach, table = TOLERANCE) {
  const tier = (table[street] ?? []).find((t) => exploit <= t.upTo * 1.0001);
  return tier?.lines.find((l) => Math.min(...lineReach) >= l.from) ?? null;
}

/**
 * What can be said about one hand, as claims: each a statement with the numbers it commits to.
 * `holds(claim, measure)` says whether a claim is true of the same hand measured in another
 * solve; the proof harness requires every claim made at page accuracy to hold in both references.
 *
 * Two sorts of claim, and they are held to different things.
 *
 * A NUMBER is a fact of the solution on screen: his fold frequency in it, the hand's equity against
 * the range he arrives with in it, what an action is worth against his strategy in it. These are
 * exact by construction (the accounting proofs) and are worded as being about this solution.
 * Another equally good solution of the same spot can differ: where and by how much is measured.
 *
 * A CONCLUSION is drawn from the numbers and is meant to be true of the spot, not of one solve.
 * It is made only where it has held, without exception, in two far finer solves of every spot
 * it has been tried on:
 *   worse   { best, a, gap }      action a, which the hand does not take, is worse than its best action
 *                                 (how much worse is a number: only that it is worse carries over)
 *   same    { a, b, within }      two actions the hand takes are worth the same to within `within`
 *   needs   { a, passive, by }    the times he continues against bet a are worth less to the hand than the
 *                                 passive action is overall: the bet earns through his folds
 *   builds  { a, passive, by }    they are worth more: the bet does not depend on his folding
 *   cards   { a, n, lift, rest }  a call's gain over folding, on the n cards that lift the hand and on the others
 *   role    { band, other, more } the hand's fifth of the range (by strength) bets, or continues, more (or less) than
 *                                 another fifth does, by at least T.role in this solve
 * The last four are made only about actions the hand itself takes (`TAKES` of the time or more).
 */
/** Below this share of either range, a line is too rare for the solution to mean anything on it. */
export const RARE = 0.05;
/** No conclusion passes these gates: only the numbers are said. */
const NUMBERS_ONLY = { eq: 0, folds: 0, gap: null, sign: null, cmp: null, lift: null, rest: null };
/** A hand takes an action when it does so at least this often. What an action is worth to a hand that takes it is pinned down far better than to one that does not. */
export const TAKES = 0.1;
export function claims(s, m, T) {
  const out = [];
  if (!m || !T) return out;
  const on = m.actions.map((a, i) => (a.on && a.worth != null ? i : -1)).filter((i) => i >= 0);
  out.push({ kind: 'equity', value: m.equity, number: true });
  const best = on.reduce((b, i) => (b < 0 || m.actions[i].worth > m.actions[b].worth ? i : b), -1);
  if (T.gap != null && on.length > 1) {
    for (const i of on) { if (i === best) continue; const gap = m.actions[best].worth - m.actions[i].worth; if (T.sign != null && gap >= T.sign) out.push({ kind: 'worse', best, a: i, gap }); }
    const played = on.filter((i) => m.actions[i].sigma >= 0.1);
    for (let x = 0; x < played.length; x++) for (let y = x + 1; y < played.length; y++) { const d = Math.abs(m.actions[played[x]].worth - m.actions[played[y]].worth); if (d <= T.gap / 2) out.push({ kind: 'same', a: played[x], b: played[y], within: d + T.gap }); }
  }
  // where the hand sits: its fifth of the range against the fifth that does the opposite most
  if (m.bands && m.band >= 0 && T.role != null) {
    const mine = m.bands[m.band].move; let other = -1;
    m.bands.forEach((b, k) => { if (k !== m.band && b.weight > 0 && (other < 0 || Math.abs(b.move - mine) > Math.abs(m.bands[other].move - mine))) other = k; });
    if (other >= 0 && Math.abs(m.bands[other].move - mine) >= T.role) out.push({ kind: 'role', band: m.band, other, more: mine > m.bands[other].move, mine, theirs: m.bands[other].move });
  }
  const passive = on.find((i) => m.actions[i].kind === 'check' || m.actions[i].kind === 'call');
  for (const i of on) {
    const a = m.actions[i];
    const aggressive = a.kind !== 'check' && a.kind !== 'call' && a.kind !== 'fold';
    if (aggressive && a.folds != null) {
      out.push({ kind: 'folds', a: i, value: a.folds, number: true });
      if (T.cmp != null && passive != null && a.sigma >= TAKES && a.continues >= 0.05 && a.whenContinued != null) {
        const d = a.whenContinued - m.actions[passive].worth;
        if (d <= -2 * T.cmp) out.push({ kind: 'needs', a: i, passive, by: -d });
        else if (d >= 2 * T.cmp) out.push({ kind: 'builds', a: i, passive, by: d });
      }
    }
    const fold = m.actions.findIndex((x) => x.kind === 'fold');
    if (a.kind === 'call' && a.sigma >= TAKES && a.cards && a.cards.lift.n > 0 && fold >= 0 && m.actions[fold].worth != null && T.lift != null) {
      const f = m.actions[fold].worth;
      const lift = a.cards.lift.part - f * a.cards.lift.weight; const rest = a.cards.rest.part - f * a.cards.rest.weight;
      // each half is concluded only when it is clear of zero by twice its tolerance
      const liftSure = Math.abs(lift) >= 2 * T.lift; const restSure = T.rest != null && Math.abs(rest) >= 2 * T.rest;
      if (liftSure || restSure) out.push({ kind: 'cards', a: i, fold, n: a.cards.lift.n, others: a.cards.rest.n, lift, rest, liftSure, restSure, liftWeight: a.cards.lift.weight, restWeight: a.cards.rest.weight });
    }
  }
  return out;
}

/** Is a claim true of the same hand as measured in another solve? */
export function holds(claim, m, T) {
  const A = m.actions;
  switch (claim.kind) {
    case 'equity': return Math.abs(m.equity - claim.value) <= T.eq / 100;
    case 'folds': return A[claim.a].folds != null && Math.abs(A[claim.a].folds - claim.value) <= T.folds / 100;
    case 'role': return !!m.bands && (claim.more ? m.bands[claim.band].move > m.bands[claim.other].move : m.bands[claim.band].move < m.bands[claim.other].move);
    case 'worse': return A[claim.best].worth - A[claim.a].worth > 0;
    case 'same': return Math.abs(A[claim.a].worth - A[claim.b].worth) <= claim.within;
    // the conclusion is the direction; how far is a number of the solution it was read from
    case 'needs': return A[claim.a].whenContinued != null && A[claim.a].whenContinued - A[claim.passive].worth < 0;
    case 'builds': return A[claim.a].whenContinued != null && A[claim.a].whenContinued - A[claim.passive].worth > 0;
    case 'cards': { const c = A[claim.a].cards; if (!c) return false; const f = A[claim.fold].worth; const lift = c.lift.part - f * c.lift.weight; const rest = c.rest.part - f * c.rest.weight; return (!claim.liftSure || Math.sign(lift) === Math.sign(claim.lift)) && (!claim.restSure || Math.sign(rest) === Math.sign(claim.rest)); }
    default: return false;
  }
}

// ---- wording: each sentence says what its claims commit to and nothing more ----
const RANK_WORD = { 12: 'ace', 11: 'king', 10: 'queen', 9: 'jack', 8: 'ten', 7: 'nine', 6: 'eight', 5: 'seven', 4: 'six', 3: 'five', 2: 'four', 1: 'three', 0: 'two' };
const MADE = ['', 'a pair', 'two pair', 'three of a kind', 'a straight', 'a flush', 'a full house', 'four of a kind', 'a straight flush'];
const PAIR = { overpair: 'an overpair', underpair: 'an underpair', 'top pair': 'top pair', 'middle pair': 'middle pair', 'bottom pair': 'bottom pair' };
/** The hand in a player's words. Every part is from `features`, which is checked card by card. */
export function describe(feature) {
  const made = feature.own >= 2 || feature.made >= 4 ? MADE[feature.made] : feature.own === 1 ? PAIR[feature.pair] ?? 'a pair' : `${RANK_WORD[feature.high]} high`;
  const draw = feature.draw === 'flush draw' ? `a flush draw (${feature.flushOuts} outs)` : feature.draw === 'open-ended' ? `a straight draw (${feature.straightOuts} outs)` : feature.draw === 'gutshot' ? `a gutshot (${feature.straightOuts} outs)` : '';
  if (!draw) return made;
  return feature.own >= 1 ? `${made} with ${draw}` : `${draw}, ${made}`;
}
const pts = (x) => `${Math.round(100 * x)}%`;
const pot = (x) => (Math.abs(x) >= 3 ? `${Math.round(Math.abs(x))}%` : `${(Math.round(Math.abs(x) * 10) / 10).toFixed(1)}%`);
const floorHalf = (x) => Math.floor(x * 2) / 2;

const RANKS_WORD = ['a deuce', 'a three', 'a four', 'a five', 'a six', 'a seven', 'an eight', 'a nine', 'a ten', 'a jack', 'a queen', 'a king', 'an ace'];
const SUIT_WORD = ['a spade', 'a heart', 'a diamond', 'a club'];
/** What a coach would call a hand, as a kind of hand. */
function kindOf(fs, board, combo, x) {
  if (x.made >= 6) return 'full houses'; if (x.made === 5) return 'flushes'; if (x.made === 4) return 'straights';
  if (x.made === 3 && x.own > 0) return x.pocket ? 'sets' : 'trips'; if (x.own >= 2 || (x.made === 2 && x.own >= 1 && x.boardMade === 0)) return 'two pair';
  const fd = x.flushOuts >= 8; const sd = x.straightOuts >= 8; const gut = x.straightOuts >= 4 && !sd;
  if (x.own === 1) { const base = x.pair === 'overpair' ? 'overpairs' : x.pair === 'top pair' ? 'top pair' : x.pair === 'underpair' ? 'small pocket pairs' : x.pair === 'bottom pair' ? 'bottom pair' : x.pocket ? 'pocket pairs under the top card' : 'middle pair'; return fd || sd ? `${base === 'overpairs' ? 'overpairs' : base === 'top pair' ? 'top pair' : 'a pair'} with a draw` : base; }
  if (fd && (sd || gut)) return 'combo draws'; if (fd) return 'flush draws'; if (sd) return 'open-ended straight draws'; if (gut) return 'gutshots';
  const top = Math.max(...board.map((c) => fs.rankOf(c))); const lo = Math.min(fs.rankOf(fs.COMBO_CARDS[2 * combo]), fs.rankOf(fs.COMBO_CARDS[2 * combo + 1]));
  return x.high === 12 ? 'ace high' : board.length < 5 && lo > top ? 'overcards' : x.high === 11 ? 'king high' : 'low unpaired hands';
}
/** A range as a coach would describe it: its kinds of hand, biggest first, each with the hand that is most of it. `skip`: cards that cannot be in it. */
export function groupsOf(fs, board, range, skip = []) {
  const by = new Map(); let all = 0;
  for (let v = 0; v < fs.COMBOS; v++) {
    const w = range[v]; if (!(w > 1e-9)) continue; const a = fs.COMBO_CARDS[2 * v], b = fs.COMBO_CARDS[2 * v + 1]; if (skip.includes(a) || skip.includes(b) || board.includes(a) || board.includes(b)) continue;
    const name = kindOf(fs, board, v, features(fs, board, v)); let g = by.get(name); if (!g) by.set(name, g = { name, weight: 0, top: -1, topW: 0, next: -1, nextW: 0 }); g.weight += w; all += w; if (w > g.topW) { g.nextW = g.topW; g.next = g.top; g.topW = w; g.top = v; } else if (w > g.nextW) { g.nextW = w; g.next = v; }
  }
  return [...by.values()].sort((x, y) => y.weight - x.weight).map((g) => ({ name: g.name, share: all > 0 ? g.weight / all : 0, example: pretty(fs.formatCombo(g.top)), second: g.next >= 0 ? pretty(fs.formatCombo(g.next)) : null }));
}
/** "top pair (K♥Q♥) and flush draws (J♠T♠)": the main kinds of a range, each with its example. */
const sayGroups = (groups, n = 2, floor = 0.12, seen = null) => { const g = groups.filter((x, i) => i === 0 || x.share >= floor).slice(0, n); return listOf(g.map((x) => { const e = seen && seen.has(x.example) && x.second && !seen.has(x.second) ? x.second : x.example; if (seen) seen.add(e); return `${x.name} (${e})`; })); };
/** Cards named the way a player would: "a diamond, a queen or an ace". Null when no short description fits. */
function sayCards(fs, good, all) {
  if (!good.length) return null; const isGood = new Set(good); const cands = [];
  for (let su = 0; su < 4; su++) { const of = all.filter((c) => fs.suitOf(c) === su); const hit = of.filter((c) => isGood.has(c)); if (of.length && hit.length / of.length >= 0.75 && hit.length >= 2) cands.push({ name: SUIT_WORD[su], cards: hit }); }
  for (let r = 0; r < 13; r++) { const of = all.filter((c) => fs.rankOf(c) === r); const hit = of.filter((c) => isGood.has(c)); if (of.length && hit.length / of.length >= 0.75 && hit.length >= 2) cands.push({ name: RANKS_WORD[r], cards: hit }); }
  cands.sort((x, y) => y.cards.length - x.cards.length); const picked = []; const covered = new Set();
  for (const k of cands) { const fresh = k.cards.filter((c) => !covered.has(c)); if (fresh.length < 2 && picked.length) continue; picked.push(k.name); k.cards.forEach((c) => covered.add(c)); if (covered.size >= 0.7 * good.length || picked.length >= 3) break; }
  if (!picked.length || covered.size < 0.6 * good.length) return null;
  return picked.length === 1 ? picked[0] : `${picked.slice(0, -1).join(', ')} or ${picked[picked.length - 1]}`;
}
/**
 * The street after a call (or a check behind), for one hand: on each card that can come, how often he bets, and whether
 * the hand can call that bet on its price. Read from the solution: his range after this line, his strategy on that card.
 */
export function nextStreet(s, c, edgeIndex) {
  const { fs, f } = s; if (!s.solution || f.board.length >= 5) return null; const child = f.nodes[f.node.edges[edgeIndex].child]; if (!child || child.kind !== 'chance') return null;
  const N = fs.COMBOS; const A = fs.COMBO_CARDS[2 * c]; const B = fs.COMBO_CARDS[2 * c + 1]; const mask = new Float64Array(N); mask[c] = 1; const root = child.edges[0].child; const cards = []; const all = [];
  for (let card = 0; card < 52; card++) {
    if (f.board.includes(card) || card === A || card === B) continue; all.push(card);
    let st; try { st = study(fs, s.solution, f.nodes, root, [...(s.dealt ?? []), card]); } catch { st = null; } if (!st) continue;
    // where he may bet: at once if he is first, else after our check
    let at = st; if (st.f.me === f.me) { const x = st.f.node.edges.findIndex((e) => e.kind === 'check'); if (x < 0 || f.nodes[st.f.node.edges[x].child].kind !== 'decision') continue; try { at = study(fs, s.solution, f.nodes, st.f.node.edges[x].child, [...(s.dealt ?? []), card]); } catch { at = null; } if (!at) continue; }
    const bets = at.f.node.edges.map((e, i) => (e.kind === 'bet' || e.kind === 'allin' ? i : -1)).filter((i) => i >= 0); if (!bets.length) { cards.push({ card, bets: 0, can: true }); continue; }
    const range = new Float64Array(N); let total = 0, bet = 0, add = 0;
    for (let v = 0; v < N; v++) { const w = at.f.mine[v]; if (!(w > 0)) continue; const x = fs.COMBO_CARDS[2 * v], y = fs.COMBO_CARDS[2 * v + 1]; if (x === A || x === B || y === A || y === B) continue; total += w; for (const i of bets) { const p = at.sigma(v, i); if (p > 0) { range[v] += w * p; bet += w * p; add += w * p * (f.nodes[at.f.node.edges[i].child].invested[at.f.me] - at.f.node.invested[at.f.me]); } } }
    if (!(total > 0)) continue; const freq = bet / total; if (freq < 0.01) { cards.push({ card, bets: freq, can: true }); continue; }
    const size = add / bet; const e = equityVs(fs, at.f.board, mask, range)[c]; const price = size / (at.f.node.pot + 2 * size); cards.push({ card, bets: freq, can: !Number.isNaN(e) && e >= price, equity: e, price });
  }
  if (!cards.length) return null;
  const bets = cards.reduce((t, k) => t + k.bets, 0) / cards.length; const weight = cards.reduce((t, k) => t + k.bets, 0); const can = weight > 0 ? cards.reduce((t, k) => t + (k.can ? k.bets : 0), 0) / weight : 1;
  const good = cards.filter((k) => k.can).map((k) => k.card);
  const allCards = cards.map((k) => k.card); const bad = cards.filter((k) => !k.can).map((k) => k.card); const share = good.length / cards.length;
  const named = share >= 0.9 ? 'on almost any card' : share <= 0.08 ? 'on almost no card' : share > 0.6 ? (sayCards(fs, bad, allCards) ? `unless ${sayCards(fs, bad, allCards)} comes` : null) : (sayCards(fs, good, allCards) ? `when ${sayCards(fs, good, allCards)} comes` : null);
  return { bets, can, good: good.length, of: cards.length, named: named ?? `on about ${good.length} of the ${cards.length} cards`, street: f.board.length === 3 ? 'turn' : 'river' };
}

/**
 * After a bet of ours is called: on each card that can come, how often this hand bets again in the solution (at its
 * first chance to: at once when first to act, else after his check).
 */
export function nextBarrel(s, c, edgeIndex) {
  const { fs, f } = s; if (!s.solution || f.board.length >= 5) return null; const his = f.nodes[f.node.edges[edgeIndex].child]; if (!his || his.kind !== 'decision') return null;
  const call = his.edges.find((e) => e.kind === 'call'); const chance = call ? f.nodes[call.child] : null; if (!chance || chance.kind !== 'chance') return null; const root = chance.edges[0].child;
  const A = fs.COMBO_CARDS[2 * c]; const B = fs.COMBO_CARDS[2 * c + 1]; const cards = [];
  for (let card = 0; card < 52; card++) {
    if (f.board.includes(card) || card === A || card === B) continue; let st; try { st = study(fs, s.solution, f.nodes, root, [...(s.dealt ?? []), card]); } catch { st = null; } if (!st) continue; let at = st;
    if (st.f.me !== f.me) { const x = st.f.node.edges.findIndex((e) => e.kind === 'check'); if (x < 0 || f.nodes[st.f.node.edges[x].child].kind !== 'decision') continue; try { at = study(fs, s.solution, f.nodes, st.f.node.edges[x].child, [...(s.dealt ?? []), card]); } catch { at = null; } if (!at) continue; }
    if (!(at.f.mine[c] > 0)) continue; let p = 0; at.f.node.edges.forEach((e, i) => { if (!['check', 'call', 'fold'].includes(e.kind)) p += at.sigma(c, i); }); cards.push({ card, bets: p });
  }
  if (cards.length < 5) return null; const all = cards.map((k) => k.card); const good = cards.filter((k) => k.bets >= 0.5).map((k) => k.card); const bad = cards.filter((k) => k.bets < 0.5).map((k) => k.card); const share = good.length / cards.length;
  const named = share >= 0.9 ? 'on almost any card' : share <= 0.08 ? 'on almost no card' : share > 0.6 ? (sayCards(fs, bad, all) ? `unless ${sayCards(fs, bad, all)} comes` : null) : (sayCards(fs, good, all) ? `when ${sayCards(fs, good, all)} comes` : null);
  return { bets: cards.reduce((t, k) => t + k.bets, 0) / cards.length, share, good: good.length, of: cards.length, named: named ?? `on about ${good.length} of the ${cards.length} cards`, street: f.board.length === 3 ? 'turn' : 'river' };
}

/**
 * One move ahead, against what he actually does (research/insight/FREQUENCIES.md: this rule, with the next street read the
 * same way, gives up about a twentieth of a percent of the pot on turns and rivers against the solver's own play).
 * For one hand at a decision, every action it has: how his range splits in answer, the hand's equity against each part,
 * and what that comes to in % of the pot, counted from now.
 *   fold 0;  call or check behind: equity of the pot as it will be, less the call;
 *   bet, raise or check in front: he folds (the pot is won), he continues (equity against those hands, less what went in),
 *   he bets or raises (the better of folding and calling).
 */
export function oneMove(s, c) {
  const { fs, f } = s; if (!s.solution || !(f.mine[c] > 0)) return null;
  const N = fs.COMBOS; const A = fs.COMBO_CARDS[2 * c]; const B = fs.COMBO_CARDS[2 * c + 1]; const mask = new Float64Array(N); mask[c] = 1; const node = f.node; const me = node.invested[f.me]; const him = node.invested[1 - f.me]; const pot = node.pot;
  const live = (r) => { let t = 0; for (let v = 0; v < N; v++) if (r[v] > 0) { const x = fs.COMBO_CARDS[2 * v], y = fs.COMBO_CARDS[2 * v + 1]; if (x !== A && x !== B && y !== A && y !== B) t += r[v]; } return t; };
  const eqVs = (r) => { const e = equityVs(fs, f.board, mask, r)[c]; return Number.isNaN(e) ? null : e; }; const all = live(f.his); if (!(all > 0)) return null;
  const actions = node.edges.map((edge, a) => {
    const child = f.nodes[edge.child]; const to = child.invested ? child.invested[f.me] : me; const paid = to - me; const out = { kind: edge.kind, label: edge.label, sigma: s.sigma(c, a), paid, parts: [], value: 0 };
    if (edge.kind === 'fold') return out;
    if (child.kind !== 'decision') { out.his = groupsOf(fs, f.board, f.his, [A, B]); const e = eqVs(f.his); const total = pot + (Math.max(to, him) - me) + (Math.max(to, him) - him); out.equity = e; out.value = e == null ? 0 : e * total - paid; out.price = paid > 0 ? paid / total : 0; return out; }
    const s2 = study(fs, s.solution, f.nodes, edge.child, s.dealt ?? []); if (!s2) return out;
    child.edges.forEach((reply, b) => {
      const r = new Float64Array(N); for (let v = 0; v < N; v++) if (f.his[v] > 0) r[v] = f.his[v] * s2.sigma(v, b); const share = live(r) / all; if (share <= 0.0005) return;
      const after = f.nodes[reply.child]; const hisTo = after.invested ? after.invested[1 - f.me] : him; const e = eqVs(r); const part = { kind: reply.kind, label: reply.label, share, equity: e, groups: groupsOf(fs, f.board, r, [A, B]) };
      if (reply.kind === 'fold') part.value = pot;
      else if (reply.kind === 'check' || reply.kind === 'call') { const I = Math.max(to, hisTo); part.value = (e ?? 0) * (pot + (I - me) + (I - him)) - paid; }
      else { const callValue = (e ?? 0) * (pot + (hisTo - me) + (hisTo - him)) - (hisTo - me); part.calls = callValue > -paid; part.value = Math.max(-paid, callValue); }
      out.parts.push(part); out.value += share * part.value;
    });
    return out;
  });
  for (const x of actions) { x.chips = x.value; x.value = (100 * x.value) / pot; }
  return { actions, pot };
}

/** How often, in a word. */
const often = (x, verb) => (x >= 0.97 ? `always ${verb}` : x >= 0.85 ? `almost always ${verb}` : x >= 0.6 ? `mostly ${verb}` : x >= 0.4 ? `${verb} about half the time` : x >= 0.15 ? `sometimes ${verb}` : x >= 0.03 ? `rarely ${verb}` : `never ${verb}`);
const listOf = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
/** One of his hands, named the way a player would name what he is blocking. */
function hisName(x) {
  if (x.made >= 6) return 'full houses'; if (x.made === 5) return 'flushes'; if (x.made === 4) return 'straights';
  if (x.made === 3 && x.own > 0) return x.pocket ? 'sets' : 'trips'; if (x.own >= 2 || (x.made === 2 && x.own >= 1 && x.boardMade === 0)) return 'two pair';
  if (x.own === 1) return x.pair === 'overpair' ? 'overpairs' : x.pair === 'top pair' ? 'top pair' : 'weaker pairs';
  if (x.flushOuts >= 8) return 'flush draws'; if (x.straightOuts >= 4) return 'straight draws';
  return 'unpaired hands';
}
/** Which of his hands this hand's cards take away, among those that continue against a bet and those that fold to it. */
function blocked(s, a, c) {
  const { fs, f } = s; if (!s.solution) return null;
  const s2 = study(fs, s.solution, f.nodes, f.node.edges[a].child, s.dealt ?? []); if (!s2) return null;
  const fold = s2.f.node.edges.findIndex((e) => e.kind === 'fold'); const A = fs.COMBO_CARDS[2 * c]; const B = fs.COMBO_CARDS[2 * c + 1];
  const cont = new Map(); const gone = new Map(); let contAll = 0, foldAll = 0;
  for (let v = 0; v < fs.COMBOS; v++) {
    const w = s2.f.mine[v]; if (!(w > 0)) continue; const x = fs.COMBO_CARDS[2 * v]; const y = fs.COMBO_CARDS[2 * v + 1]; if (x !== A && x !== B && y !== A && y !== B) continue;
    const p = fold >= 0 ? s2.sigma(v, fold) : 0; const name = hisName(s2.featuresOf(v));
    cont.set(name, (cont.get(name) ?? 0) + w * (1 - p)); gone.set(name, (gone.get(name) ?? 0) + w * p); contAll += w * (1 - p); foldAll += w * p;
  }
  const top = (map, all) => [...map.entries()].filter(([, w]) => all > 0 && w / all >= 0.2).sort((p, q) => q[1] - p[1]).slice(0, 2).map(([n]) => n);
  return { continues: top(cont, contAll), folds: top(gone, foldAll) };
}

/**
 * The explanation of one hand at a flop, turn or river decision: what it does and why, in plain words. Each reason has
 * its `text`, and where numbers stand behind it a `detail` that carries them. Conclusions are drawn only inside the
 * proven gates; `silent` says why nothing more is said when the decision is not one the proof covers.
 */
export function explainStreet(s, m, T) {
  if (!m) return null;
  const strategy = m.actions.map((a) => a.sigma);
  const what = describe(m.features);
  const reasons = [];
  // Where conclusions are not proven (a thinner line, a coarser solve), the numbers of this solution are still its numbers.
  // Where the line is hardly ever taken the solution was never trained, and nothing is said.
  const proven = !!T;
  if (!T && (Math.min(...s.lineReach) < RARE || m.equity == null)) {
    return { name: m.name, strategy, line: `You have ${what}.`, detail: null, reasons, claims: [], silent: 'This line is taken too rarely for the solution to be settled on it, so nothing more is said.' };
  }
  if (!T) T = NUMBERS_ONLY;
  const made = claims(s, m, T);
  // an action in words: checking, calling, the 33% bet, raising
  const raises = m.actions.filter((x) => x.kind === 'raise').length;
  const label = (i) => { const x = m.actions[i]; const n = /\d+/.exec(x.label)?.[0]; return x.kind === 'check' ? 'checking' : x.kind === 'call' ? 'calling' : x.kind === 'fold' ? 'folding' : x.kind === 'allin' ? 'going all in' : x.kind === 'raise' ? (raises > 1 ? `raising (${x.label})` : 'raising') : n ? `the ${n}% bet` : 'betting'; };
  const facing = s.toCall > 0;
  const street = s.f.board.length === 3 ? 'the turn and river still to come' : s.f.board.length === 4 ? 'the river still to come' : 'no cards to come';
  const river = s.f.board.length === 5;
  // the numbers behind the first line: on the river equity is simply how much of his range the hand beats, and a bet names its own price
  let detail = river ? `It beats ${pts(m.equity)} of the range he has here.` : `With ${street} it has ${pts(m.equity)} equity against the range he has here.`;
  if (river && facing) detail += ` He has bet ${Math.round(s.toCall)} into ${Math.round(s.pot - s.toCall)}, so a call has to win ${pts(s.toCall / (s.pot + s.toCall))} of the time.`;
  let line = `You have ${what}.`;
  const taken = m.actions.map((a, i) => i).filter((i) => m.actions[i].sigma >= TAKES).sort((x, y) => m.actions[y].sigma - m.actions[x].sigma);
  const passiveName = facing ? 'calling' : 'checking';
  // ---- the answer first: what the hand does, and what kind of play that is ----
  {
    const top = taken[0]; const kindOf = (i) => m.actions[i].kind; const pushes = (i) => !['check', 'call', 'fold'].includes(kindOf(i));
    const verb = (i) => (kindOf(i) === 'check' ? 'check' : kindOf(i) === 'call' ? 'call' : kindOf(i) === 'fold' ? 'fold' : facing ? 'raise' : 'bet');
    const purpose = (i) => {
      const needs = made.some((c) => c.kind === 'needs' && c.a === i); const builds = made.some((c) => c.kind === 'builds' && c.a === i); const ahead = m.actions[i].aheadWhenCalled;
      if (river) return ahead != null && ahead >= 0.5 ? ' for value' : needs && (ahead == null || ahead < 0.35) ? ' as a bluff' : builds ? ' for value' : '';
      return builds ? ' for value' : needs && m.equity < 0.5 ? ' to make him fold' : '';
    };
    if (top != null) {
      const second = taken.find((i) => i !== top && verb(i) !== verb(top) && m.actions[i].sigma >= 0.25);
      const first = `${verb(top)}${pushes(top) ? purpose(top) : ''}`;
      line = (second != null ? `You ${first}, and sometimes ${verb(second)}${pushes(second) ? purpose(second) : ''}. ` : `You ${first}. `) + line.replace(/^You have /, 'It is ');
    }
  }
  // ---- what this hand has that the hands around it do not: its type, and its cards ----
  {
    const doing = facing ? 'continue' : 'bet'; const nr = m.near; const floor = nr ? 0.02 * nr.all : 0;
    // its own type against the rest; or, when there are too few of its type to speak of, draws against the hands without one
    let kind = null;
    if (nr && nr.same.weight >= floor && nr.rest.weight >= floor && Math.abs(nr.same.move - nr.rest.move) >= 0.2) kind = { group: TYPES[nr.type] ?? `hands with ${nr.type.replace(' + backdoor flush', ' and a backdoor flush draw')}`, mine: nr.same.move, theirs: nr.rest.move, rest: 'the rest' };
    else if (nr && nr.draw && nr.draws.weight > 0 && nr.others.weight >= floor && Math.abs(nr.draws.move - nr.others.move) >= 0.2) kind = { group: 'the draws', mine: nr.draws.move, theirs: nr.others.move, rest: 'the hands without a draw' };
    else if (nr && !nr.draw && m.features.own === 0 && !river && nr.draws.weight >= floor && nr.others.weight > 0 && Math.abs(nr.draws.move - nr.others.move) >= 0.2) kind = { group: 'the hands without a draw', mine: nr.others.move, theirs: nr.draws.move, rest: 'the draws' };
    const doesIt = m.actions.reduce((t, x) => t + (x.kind !== (facing ? 'fold' : 'check') ? x.sigma : 0), 0);
    if (kind && !((kind.mine > kind.theirs) ? doesIt < 0.3 : doesIt > 0.7)) {
      const more = kind.mine > kind.theirs; const outs = m.features.flushOuts + m.features.straightOuts; const isDraw = nr.draw;
      let text = `Among your hands of about this strength, ${kind.group} ${doing} ${more ? 'more' : 'less'} often than ${kind.rest}.`;
      if (!facing && more && isDraw && outs > 0) text += ' A draw has two ways to win: he folds now, or it gets there.';
      else if (!facing && !more && !isDraw && !river && m.features.own === 0) text += ' It has no draw: when a bet is called it has almost nothing to improve to, so the draws do the betting at this strength.';
      else if (!facing && !more && river && m.features.own === 1 && m.equity < 0.8) text += ' A pair still wins some showdowns when checked; the hands with nothing at all do the bluffing.';
      else if (!facing && more && river && m.features.own === 0) text += ' It has no showdown value to protect.';
      else if (facing && more && isDraw && outs > 0) text += ' It can still make the best hand.';
      reasons.push({ id: 'type', text, detail: `In this solution ${kind.group} ${doing} ${pts(kind.mine)} of the time and ${kind.rest} ${pts(kind.theirs)}.${isDraw && outs > 0 ? ` This hand has ${outs} outs.` : ''}` });
    }
    // its cards: whose hands they take away, and so how often he folds to this hand against the weak hands around it
    const bets = m.actions.map((x, i) => i).filter((i) => m.actions[i].on && m.actions[i].folds != null && !['check', 'call', 'fold'].includes(m.actions[i].kind));
    if (bets.length && m.equity < 0.25) {
      const main = bets.sort((x, y) => m.actions[y].freq - m.actions[x].freq)[0];
      const fold = s.closely(main).replies?.find((r) => r.kind === 'fold')?.share; const eq = s.equity();
      if (fold) {
        let w = 0, t = 0; for (let c = 0; c < eq.length; c++) if (s.f.mine[c] > 0 && eq[c] < 0.25 && !Number.isNaN(fold[c])) { w += s.f.mine[c]; t += s.f.mine[c] * fold[c]; }
        const avg = w > 0 ? t / w : null; const mine = m.actions[main].folds;
        if (avg != null && Math.abs(mine - avg) >= 0.015) {
          const helps = mine > avg; const b = blocked(s, main, m.combo); const names = b ? (helps ? b.continues : b.folds) : [];
          const text = helps ? (names.length ? `It blocks hands that would continue: his ${listOf(names)}. So he folds more often to this hand.` : 'Its cards help: he folds more often to this hand than to your other weak hands.')
            : (names.length ? `It blocks hands that would fold: his ${listOf(names)}. So he folds less often to this hand.` : 'Its cards work against it: he folds less often to this hand than to your other weak hands.');
          reasons.push({ id: 'cards-held', text, detail: `He folds ${pts(mine)} to ${label(main)} against this hand, and ${pts(avg)} against your weak hands on average.` });
        }
      }
    }
  }
  // ---- one move ahead: why the action it takes comes out best, against what he actually does, with his hands named ----
  {
    const mv = oneMove(s, m.combo); const top = taken[0];
    if (mv && top != null) {
      const x = mv.actions[top]; const parts = (pick) => x.parts.filter(pick); const sum = (pick) => parts(pick).reduce((t, p) => t + p.share, 0);
      const avg = (pick) => { const ps = parts((p) => pick(p) && p.equity != null); const w = ps.reduce((t, p) => t + p.share, 0); return w > 0 ? ps.reduce((t, p) => t + p.share * p.equity, 0) / w : null; };
      const merged = (pick) => { const by = new Map(); for (const pt of parts(pick)) for (const g of pt.groups ?? []) { const k = by.get(g.name) ?? { name: g.name, share: 0, example: g.example, second: g.second, best: 0 }; k.share += pt.share * g.share; if (pt.share * g.share > k.best) { k.best = pt.share * g.share; k.example = g.example; k.second = g.second; } by.set(g.name, k); } const all = [...by.values()].reduce((t, g) => t + g.share, 0) || 1; return [...by.values()].map((g) => ({ ...g, share: g.share / all })).sort((a, b) => b.share - a.share); };
      const had = (e) => (e < 0.2 ? 'almost nothing' : e < 0.35 ? 'some equity' : e < 0.5 ? 'a good deal of equity' : 'the better of it');
      const stand = (e) => (e >= 0.6 ? 'well ahead' : e >= 0.5 ? 'ahead' : e >= 0.4 ? 'a little behind' : e >= 0.25 ? 'behind' : 'far behind'); const against = (e) => (e >= 0.5 ? `${stand(e)} of` : stand(e));
      const sort = (y) => (['check', 'call', 'fold'].includes(y.kind) ? y.kind : 'wager');
      const other = mv.actions.map((y, i) => i).filter((i) => i !== top && sort(mv.actions[i]) !== sort(x) && mv.actions[i].kind !== 'fold').sort((i, j) => mv.actions[j].value - mv.actions[i].value)[0];
      // what the two are worth: the solution's own figures where it has them (an action it hardly takes is not trained), else the count
      const exact = other != null && m.actions[top].worth != null && m.actions[other].worth != null ? m.actions[top].worth - m.actions[other].worth : null;
      const worthOf = (v) => (v < 0 ? `${pot(v)} of the pot less than nothing` : `${pot(v)} of the pot`);
      const versus = other == null ? '' : exact != null ? (Math.abs(exact) < 0.5 ? ` In the solution ${label(top)} and ${label(other)} are worth the same with this hand.` : ` In the solution ${label(top)} is worth ${pot(exact)} of the pot ${exact > 0 ? 'more' : 'less'} than ${label(other)} with this hand.`) : ` Counted one move ahead, ${label(top)} is worth ${worthOf(x.value)} and ${label(other)} ${worthOf(mv.actions[other].value)}.`;
      /** How often he would have to fold to wager `w` for it to be worth what the quiet action `q` is: from the solution's figures, else the count. */
      const foldsNeeded = (w, q) => { const W = m.actions[w]; const Q = m.actions[q];
        if (W.worth != null && Q.worth != null && W.folds != null && W.folds > 0.02 && W.folds < 0.98) { const whenFolds = W.fromFolds / W.folds; const cont = (W.worth - W.fromFolds) / (1 - W.folds); return whenFolds > cont ? { need: (Q.worth - cont) / (whenFolds - cont), folds: W.folds } : null; }
        const wm = mv.actions[w]; const wf = wm.parts.filter((p) => p.kind === 'fold').reduce((t, p) => t + p.share, 0); if (wf >= 0.999 || !wm.parts.length) return null; const cont = (wm.chips - wf * mv.pot) / (1 - wf); return mv.pot > cont ? { need: (mv.actions[q].chips - cont) / (mv.pot - cont), folds: wf } : null; };
      // the street after a call: how often he bets again, and on which cards this hand can go on
      const later = (a) => { const nx = river ? null : nextStreet(s, m.combo, a); if (!nx || nx.bets < 0.1) return null; const cards = nx.named;
        return { text: `He ${often(nx.bets, 'bets')} the ${nx.street} again, and this hand can call ${cards}.`, quit: `he ${often(nx.bets, 'bets')} the ${nx.street} again, and this hand could keep calling only ${cards}`, detail: ` On the ${nx.street} he bets ${pts(nx.bets)} of the time on average; this hand has the price to call ${pts(nx.can)} of those bets.`, nx }; };
      if (x.kind === 'fold') {
        const ci = mv.actions.findIndex((y) => y.kind === 'call'); const call = mv.actions[ci];
        if (call && call.equity != null) {
          const his = call.his?.length ? ` He is betting ${sayGroups(call.his)}.` : ''; const nx = call.equity >= call.price ? later(ci) : null;
          const text = call.equity < call.price ? `It does not have the price to call: it is ${against(call.equity)} the hands that bet.${his}` : river ? `It has the price on paper, and folds all the same: the cards it holds make his bets stronger than they look.${his}` : nx && nx.nx.can <= 0.6 ? `It has the price for this bet, but not for the next: ${nx.quit}.${his}` : m.actions[top].sigma < 0.85 ? `It is close. It has the price on paper and the solution calls with it part of the time; equity that has to face another bet is worth a little less than its number.${his}` : `It has the raw equity to call, but equity that has to face another bet is worth less than its number.${his}`;
          reasons.push({ id: 'move', text, detail: `A call needs ${pts(call.price)} and the hand has ${pts(call.equity)} against the range that bet.${nx ? nx.detail : ''}` });
        }
      } else if (x.kind === 'call' && x.equity != null) {
        const his = x.his?.length ? ` He is betting ${sayGroups(x.his)}.` : ''; const nx = later(top);
        const first = x.equity >= 0.5 ? `It calls: it is ${against(x.equity)} the hands that bet.` : x.equity >= x.price ? `It has the price to call: it is ${against(x.equity)} the hands that bet, and the price asks for less.` : 'On equity alone it is short of the price, and calls for what the cards to come can still bring.';
        const upTo = x.equity < 0.5 && x.equity > 0.05 ? x.equity / (1 - 2 * x.equity) : null; const sizeWord = upTo == null ? '' : upTo >= 2 ? ' It could call a bet of any size he has here.' : ` Against these same hands it could call up to about ${upTo >= 0.9 ? 'a pot-sized bet' : upTo >= 0.6 ? 'three quarters of the pot' : upTo >= 0.4 ? 'half the pot' : 'a third of the pot'}.`;
        reasons.push({ id: 'move', text: `${first}${his}${nx ? ` ${nx.text}` : ''}${nx ? '' : sizeWord}`, detail: `A call needs ${pts(x.price)} and the hand has ${pts(x.equity)} against the range that bet.${nx ? nx.detail : ''}${versus}` });
      } else if (x.kind === 'check' && !x.parts.length && x.equity != null) reasons.push({ id: 'move', text: 'Checking keeps what the hand has: it sees the next card or the showdown with its equity intact.', detail: `${pts(x.equity)} equity against his range here.${versus}` });
      else if (x.parts.length) {
        const isFold = (p) => p.kind === 'fold'; const isCall = (p) => p.kind === 'call' || p.kind === 'check'; const isPush = (p) => !isFold(p) && !isCall(p);
        const folds = sum(isFold); const eFold = avg(isFold); const eCall = avg(isCall); const pushes = sum(isPush); const ePush = avg(isPush); const gf = merged(isFold); const gc = merged(isCall); const gp = merged(isPush); let text; const numbers = [];
        if (x.kind === 'check') {
          text = pushes >= 0.5 ? `It checks expecting a bet: he ${often(pushes, 'bets')} when checked to${gp.length ? `, with ${sayGroups(gp)}` : ''}, and against those hands it is ${stand(ePush ?? 0)}.` : `It checks, and he ${often(1 - pushes, 'checks')} behind${gc.length ? ` with ${sayGroups(gc)}` : ''}: against those hands it is ${stand(eCall ?? 0)}.${pushes >= 0.15 && gp.length ? ` When he does bet it is ${sayGroups(gp)}.` : ''}`;
          numbers.push(`After a check he bets ${pts(pushes)} of the time${ePush != null ? ` (this hand has ${pts(ePush)} against those hands)` : ''}${eCall != null ? ` and checks the rest (${pts(eCall)} against those)` : ''}.`);
          // what would change it: what the best bet would need
          if (other != null && mv.actions[other].parts.length) { const fn = foldsNeeded(other, top);
            const ob = mv.actions[other]; const cw = ob.parts.filter((q) => q.kind === 'call'); const cs = cw.reduce((t, q) => t + q.share, 0); const ec = cs > 0 ? cw.reduce((t, q) => t + q.share * (q.equity ?? 0), 0) / cs : null; const gcb = cw.length ? (cw[0].groups ?? []) : [];
            if (fn && fn.need > fn.folds + 0.03 && fn.need < 1) { text += ` To bet it, he would have to fold ${inTen(fn.need)}; he folds ${inTen(fn.need) === inTen(fn.folds) ? 'a little less than that' : inTen(fn.folds)}.`; numbers.push(`${label(other)} would be worth what checking is if he folded ${pts(fn.need)}; he folds ${pts(fn.folds)}.`); }
            else if (exact != null && Math.abs(exact) < 0.5) text += ' A bet would do just as well, which is why it sometimes is one.';
            else if (fn && fn.need >= 1) text += ' A bet would lose even if he folded far more than he does: called or raised, it gives back more than the folds bring.';
            else if (ec != null && ec < 0.5 && m.equity >= 0.3) text += ` A bet would fold out the hands it beats and be called by ${gcb.length ? sayGroups(gcb) : 'better ones'}: it would turn a hand that wins its share of showdowns into a bluff.`;
            else if (ec != null && ec >= 0.5 && pushes >= 0.3) text += ' It is ahead of what would call a bet, but the check earns more: he bets worse hands himself when checked to.';
            else if (ec != null && ec >= 0.5) text += ' It is ahead of what would call a bet, but not by enough to pay for the raises a bet would meet.'; }
        } else {
          const best = other == null || (exact != null ? exact >= -0.3 : x.value >= mv.actions[other].value); const act = label(top);
          const seen = new Set(); const foldPart = folds < 0.03 ? 'He hardly ever folds' : `He ${often(folds, 'folds')}${gf.length ? `: ${sayGroups(gf, 2, 0.12, seen)}` : ''}`;
          const denial = folds >= 0.05 && eFold != null && !river ? ` Those hands had ${had(1 - eFold)} against this one${1 - eFold >= 0.2 ? ', which the bet takes away' : ''}.` : '';
          const callPart = gc.length ? ` He calls with ${sayGroups(gc, 2, 0.12, seen)}; against those this hand is ${stand(eCall ?? 0)}.` : '';
          const pushPart = pushes >= 0.08 && gp.length ? ` He raises with ${sayGroups(gp, 2, 0.12, seen)}.` : '';
          const earn = (eCall ?? 0) < 0.5 && folds >= 0.2 ? ' The bet earns from the folds, not from the calls.' : (eCall ?? 0) >= 0.5 && folds < 0.5 ? ' The bet earns from the calls.' : '';
          text = `${best ? `${act.charAt(0).toUpperCase()}${act.slice(1)} comes out best. ` : ''}${foldPart}${best ? '' : ` to ${act}`}.${denial}${callPart}${pushPart}${earn}`;
          numbers.push(`He folds ${pts(folds)}${eFold != null ? ` (those hands had ${pts(1 - eFold)} equity against this one)` : ''}, calls ${pts(sum((p) => p.kind === 'call'))}${eCall != null ? ` (this hand has ${pts(eCall)} against those)` : ''}${pushes >= 0.005 ? `, raises ${pts(pushes)}` : ''}.`);
          // what would change it: how much he would have to fold for the bet to be worth what the quiet action is
          if (other != null && !((eCall ?? 0) >= 0.5 && folds < 0.5)) { const fn = foldsNeeded(top, other); const need = fn ? fn.need : null;
            if (need != null && need <= 0.02) text += ' It does not need him to fold at all: it would still be a bet if he never did.';
            else if (need != null && need < 1) { text += best ? (inTen(need) === inTen(fn.folds) ? ` It needs him to fold ${inTen(need)}, and that is just about what he does: which is why it is close.` : ` It stays a bet as long as he folds more than ${inTen(need)}; he folds ${inTen(fn.folds)}.`) : (inTen(need) === inTen(fn.folds) ? ` To beat ${label(other)} it would need him to fold ${inTen(need)}, a little more than he does.` : ` To beat ${label(other)} it would need him to fold ${inTen(need)}; he folds ${inTen(fn.folds)}.`); numbers.push(`It is worth what ${label(other)} is when he folds ${pts(need)}.`); } }
          // and what comes next, if he calls
          if (!river && sum((p) => p.kind === 'call') >= 0.15) { const nb = nextBarrel(s, m.combo, top); if (nb) { text += nb.share >= 0.9 ? ` If he calls, it bets the ${nb.street} too on almost any card.` : nb.share <= 0.08 ? ` If he calls, it gives up on the ${nb.street}: this is a one-street bet.` : ` If he calls, it bets the ${nb.street} again ${nb.named}.`; numbers.push(`After a call it bets the ${nb.street} ${pts(nb.bets)} of the time on average.`); } }
        }
        reasons.push({ id: 'move', text, detail: numbers.join(' ') + versus });
      }
    }
  }
  // ---- its twin: the same two ranks with or without its flush draw (or, on the flop, its backdoor flush draw). Nothing
  // else differs between them, so what they do differently is down to the draw. Numbers of this solution.
  if (!river) {
    const tw = twins(s, m.combo);
    if (tw) {
      const groups = facing ? [['fold', (k) => k === 'fold', 'folds'], ['call', (k) => k === 'call', 'calls'], ['raise', (k) => !['fold', 'call'].includes(k), 'raises']] : [['check', (k) => k === 'check', 'checks'], ['bet', (k) => k !== 'check', 'bets']];
      const share = (mix) => groups.map(([, is]) => m.actions.reduce((t, x, i) => t + (is(x.kind) ? mix[i] : 0), 0));
      const mine = share(m.actions.map((x) => x.sigma)); const theirs = share(tw.mix);
      const g = mine.reduce((b, x, i) => (Math.abs(x - theirs[i]) > Math.abs(mine[b] - theirs[b]) ? i : b), 0); const gap = Math.abs(mine[g] - theirs[g]);
      const verb = groups[g][2]; const other = `${tw.several ? 'such as ' : ''}${pretty(tw.name)}`;
      const dWorth = tw.worth != null && tw.mineWorth != null ? tw.mineWorth - tw.worth : null; const dEq = m.equity - tw.eq;
      const value = dWorth != null ? ` This hand has ${pts(Math.abs(dEq))} ${dEq >= 0 ? 'more' : 'less'} equity and is worth ${pot(dWorth)} of the pot ${dWorth >= 0 ? 'more' : 'less'}.` : '';
      const numbers = `In this solution the twin ${verb} ${pts(theirs[g])} of the time and this hand ${pts(mine[g])}.${value}`;
      if (gap >= 0.15) reasons.push({ id: 'twin', detail: numbers, text: tw.have ? `The ${tw.draw} is the reason. The same hand without it (${other}) ${often(theirs[g], verb)} here, and this one ${often(mine[g], verb)}. Nothing else differs between them.` : `It lacks a ${tw.draw}. The same hand with one (${other}) ${often(theirs[g], verb)} here, and this one ${often(mine[g], verb)}. Nothing else differs between them.` });
      else if (tw.have && dWorth != null && dWorth >= 2) reasons.push({ id: 'twin', detail: numbers, text: `The ${tw.draw} does not change how it plays here, but it makes the hand worth more than the same hand without it (${other}).` });
    }
    // what the hand is worth against your other hands of the same equity: equity that can improve wins more than equity that cannot
    const w = worthAround(s, m.combo);
    if (w && Math.abs(w.mine - w.others) >= 3) {
      const less = w.mine < w.others; const x = m.features; const drawn = x.draw != null;
      const text = less && !drawn && x.own === 0 ? 'Its equity is showdown equity: it wins the small pots that get checked down and has little to improve to. So it is worth less than its equity suggests.'
        : less && x.pocket && (x.pair === 'underpair' || x.pair === 'middle pair') ? 'A pocket pair that is not an overpair has only two cards that improve it. So it is worth less than its equity suggests.'
          : !less && drawn ? 'A draw wins a bigger pot when it comes in than a made hand of the same equity wins. So it is worth more than its equity suggests.'
            : `It is worth ${less ? 'less' : 'more'} than your other hands of about the same equity.`;
      reasons.push({ id: 'worth', text, detail: `In this solution it is worth ${pot(w.mine - w.others)} of the pot ${less ? 'less' : 'more'} than your other hands within five points of its equity.` });
    }
  }
  // ---- why this hand: where it sits in your range, and what that part of the range does ----
  if (m.bands && m.band >= 0) {
    const NAME = ['your weakest hands', 'your weaker hands', 'the hands in the middle of your range', 'your stronger hands', 'your strongest hands']; const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const doing = facing ? 'continue' : 'bet';
    const mine = m.bands[m.band]; const role = made.find((c) => c.kind === 'role');
    let text = `It is among ${NAME[m.band]} here, which ${often(mine.move, doing)}.`; let numbers = `As a group those hands ${doing} ${pts(mine.move)} of the time.`;
    if (role) {
      const other = m.bands[role.other];
      text += ` ${capital(NAME[role.other])} ${often(other.move, doing)}.`;
      numbers += ` ${capital(NAME[role.other])} ${doing} ${pts(other.move)}. Those hands beat ${pts(other.eq)} of ${facing ? 'what he bets' : 'his range'} on average and this one ${pts(m.equity)}.`;
      // what separates the two groups is how much of his range each beats
      const weakSide = role.band < role.other; const own = m.actions.reduce((t, x) => t + ((facing ? x.kind !== 'fold' : !['check', 'call', 'fold'].includes(x.kind)) ? x.sigma : 0), 0);
      const along = role.more ? own >= 0.25 : own <= 0.75;
      if (!along) text += ' This hand goes the other way from its part of the range.';
      else if (!facing && role.more && weakSide) text += ' It has the least to lose by betting, which is why the bluffs come from down here.';
      else if (!facing && role.more && !weakSide) text += ' It is strong enough to be paid by worse hands, which they are not.';
      else if (!facing && !role.more && weakSide) text += ' It is not strong enough to bet for value the way they do.';
      else if (!facing && !role.more && !weakSide) text += ' It wins too often at showdown to be turned into a bluff the way they are.';
      else if (facing && role.more) text += ' It beats more of what he bets than they do.';
      else if (facing) text += ' It beats less of what he bets than they do.';
    }
    reasons.push({ id: 'role', text, detail: numbers });
  }
  // what it mixes
  const same = made.filter((x) => x.kind === 'same');
  if (same.length) {
    // every pair among them, or it is said pair by pair
    const set = [...new Set(same.flatMap((c) => [c.a, c.b]))].sort((x, y) => x - y);
    const whole = same.length === (set.length * (set.length - 1)) / 2;
    const list = (ids) => (ids.length === 2 ? `${label(ids[0])} and ${label(ids[1])}` : `${ids.slice(0, -1).map(label).join(', ')} and ${label(ids[ids.length - 1])}`);
    if (whole) reasons.push({ id: 'same', text: `${list(set)} earn the same with this hand, so it can do ${set.length === 2 ? 'either' : 'any of them'}.`, detail: `To within ${pot(Math.max(...same.map((c) => c.within)))} of the pot.` });
    else for (const c of same) reasons.push({ id: 'same', text: `${list([c.a, c.b])} earn the same with this hand.`, detail: `To within ${pot(c.within)} of the pot.` });
  }
  // what it does not do, and what that would cost
  for (const c of made.filter((x) => x.kind === 'worse')) reasons.push({ id: 'worse', text: `${label(c.a)} is worse with this hand${m.actions[c.a].sigma >= TAKES ? ', though this solution still plays it sometimes' : ''}.`, detail: `Against his strategy in this solution it gives up ${pot(c.gap)} of the pot${m.actions[c.a].sigma >= TAKES ? `; it is played ${pts(m.actions[c.a].sigma)} of the time` : ''}.` });
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1); const caps = (t) => cap(t).replace(/([.:] )(the |a |he |it |checking|calling|folding|raising|betting|going)/g, (_, p1, w) => (p1 === ': ' ? p1 + w : p1 + cap(w)));
  for (const r of reasons) { r.text = cap(r.text); if (r.detail) r.detail = caps(r.detail); }
  return { name: m.name, strategy, line, detail, reasons, claims: made, silent: proven ? null : 'These are this solution\'s own numbers. Conclusions are drawn only where they have been proven to carry over.' };
}


const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }; const SUIT_NAME = ['spade', 'heart', 'diamond', 'club'];
const pretty = (name) => name.replace(/([2-9TJQKA])([shdc])/g, (_, r, x) => r + SUIT[x]);
/** A hand's flush draw, or on the flop its backdoor flush draw: 2, 1 or 0, and the suit. */
function flushLevel(s, c) {
  const { fs, f } = s; const x = s.featuresOf(c); const cards = [fs.COMBO_CARDS[2 * c], fs.COMBO_CARDS[2 * c + 1]];
  if (x.made >= 5) return { level: 0, suit: -1 };
  for (const card of cards) {
    const suit = fs.suitOf(card); const n = f.board.filter((b) => fs.suitOf(b) === suit).length + cards.filter((b) => fs.suitOf(b) === suit).length;
    if (n === 4 && x.flushOuts >= 8) return { level: 2, suit };
  }
  if (f.board.length === 3) for (const card of cards) {
    const suit = fs.suitOf(card); const n = f.board.filter((b) => fs.suitOf(b) === suit).length + cards.filter((b) => fs.suitOf(b) === suit).length;
    if (n === 3) return { level: 1, suit };
  }
  return { level: 0, suit: -1 };
}
/** What each of a decision's hands is worth by the actions it takes there, in % of the pot (as measure() has it). */
function worthOf(s) {
  if (s.worths) return s.worths;
  const N = s.fs.COMBOS; const out = new Float64Array(N).fill(NaN); const on = s.actions.map((a, i) => (a.on ? i : -1)).filter((i) => i >= 0); const vals = on.map((a) => s.closely(a).value);
  for (let c = 0; c < N; c++) { if (!(s.f.mine[c] > 0)) continue; let w = 0, t = 0; on.forEach((a, k) => { const p = s.sigma(c, a); if (p > 0 && !Number.isNaN(vals[k][c])) { w += p; t += p * vals[k][c]; } }); if (w > 0.5) out[c] = (100 * t) / w / s.pot; }
  return (s.worths = out);
}
/**
 * The twins of a hand at a decision: the hands of your range with the same two ranks, suited or not as it is, making
 * the same hand and the same straight draw, but with a different flush draw. Compared with the hand: those without a
 * draw when it has one, those with one when it has none. Null when there are none.
 */
export function twins(s, c) {
  const { fs, f } = s; const rank = (k) => fs.rankOf(fs.COMBO_CARDS[k]); const suited = (h) => fs.suitOf(fs.COMBO_CARDS[2 * h]) === fs.suitOf(fs.COMBO_CARDS[2 * h + 1]);
  const hi = Math.max(rank(2 * c), rank(2 * c + 1)); const lo = Math.min(rank(2 * c), rank(2 * c + 1)); const x = s.featuresOf(c); const mine = flushLevel(s, c); const found = [];
  for (let h = 0; h < fs.COMBOS; h++) {
    if (h === c || !(f.mine[h] > 0) || Math.max(rank(2 * h), rank(2 * h + 1)) !== hi || Math.min(rank(2 * h), rank(2 * h + 1)) !== lo || suited(h) !== suited(c)) continue;
    const y = s.featuresOf(h); if (y.made !== x.made || y.straightOuts !== x.straightOuts) continue;
    const l = flushLevel(s, h); if (l.level !== mine.level) found.push({ h, level: l.level, suit: l.suit });
  }
  if (!found.length) return null;
  // against the hands without the draw; or, for a hand with none, against the ones with the least draw more than it (the backdoor before the flush draw)
  const want = Math.min(...found.map((t) => t.level)); const group = found.filter((t) => t.level === want);
  if (mine.level > 0 && want >= mine.level) return null;
  let w = 0; const mix = s.actions.map(() => 0); let eq = 0; let worth = 0, ww = 0; const E = s.equity(); const W = worthOf(s);
  for (const t of group) { const k = f.mine[t.h]; w += k; s.actions.forEach((_, a) => { mix[a] += k * s.sigma(t.h, a); }); eq += k * E[t.h]; if (!Number.isNaN(W[t.h])) { worth += k * W[t.h]; ww += k; } }
  const level = mine.level > 0 ? mine.level : want; const suit = mine.level > 0 ? mine.suit : group[0].suit; const best = group.reduce((b, t) => (f.mine[t.h] > f.mine[b.h] ? t : b));
  return { have: mine.level > 0, draw: `${level === 1 ? 'backdoor ' : ''}${SUIT_NAME[suit] ?? ''} ${level === 1 ? 'draw' : 'flush draw'}`.replace('  ', ' '), name: fs.formatCombo(best.h), several: group.length > 1, weight: w, mix: mix.map((v) => v / w), eq: eq / w, worth: ww > 0 ? worth / ww : null, mineWorth: Number.isNaN(W[c]) ? null : W[c] };
}
/** A hand's worth beside the average worth of your other hands within five points of its equity. Null when there are too few. */
export function worthAround(s, c) {
  const { f } = s; const E = s.equity(); const W = worthOf(s); if (Number.isNaN(W[c])) return null;
  let w = 0, t = 0, all = 0; for (let h = 0; h < s.fs.COMBOS; h++) { if (!(f.mine[h] > 0)) continue; all += f.mine[h]; if (h === c || Number.isNaN(W[h]) || Number.isNaN(E[h]) || Math.abs(E[h] - E[c]) > 0.05) continue; w += f.mine[h]; t += f.mine[h] * W[h]; }
  return w >= 0.03 * all ? { mine: W[c], others: t / w } : null;
}

/**
 * The analytical look at one hand: every hand type in the range with what it does and whether this
 * hand is one of them, and (before the river) how the hand's equity is spread over the cards that
 * can come next, beside the same for the range as a whole.
 */
export function analysis(s, c) {
  const { fs, f } = s;
  const one = c != null && f.mine[c] > 0;
  const b = s.bands(); const mine = one ? new Set(b.tagsFor[c] ?? []) : new Set();
  // every name some hand in the range carries; with a hand given, `has` marks the ones it carries
  const types = b.tagList.map((k) => ({ name: k.name, share: k.share, equity: k.eq, mix: k.mix, has: mine.has(k.name), ids: k.ids }));
  let spread = null;
  const cards = s.spread();
  if (cards) {
    const hand = []; const range = [];
    for (const k of cards) {
      if (one && !Number.isNaN(k.eq[c])) hand.push({ card: fs.formatCards([k.card]), eq: k.eq[c] });
      let w = 0, t = 0; for (let h = 0; h < fs.COMBOS; h++) if (f.mine[h] > 0 && !Number.isNaN(k.eq[h])) { w += f.mine[h]; t += f.mine[h] * k.eq[h]; }
      if (w > 0) range.push({ card: fs.formatCards([k.card]), eq: t / w });
    }
    hand.sort((x, y) => x.eq - y.eq); range.sort((x, y) => x.eq - y.eq);
    // the range's own equity now: its hands' equities by weight
    let w = 0, t = 0; const eq = s.equity(); for (const h of b.hands) { w += f.mine[h]; t += f.mine[h] * eq[h]; }
    // equity, and its two parts: what the hand beats as the board stands, and what it wins from behind
    const parts = s.drawParts(); const avg = (v) => { let ww = 0, tt = 0; for (const h of b.hands) if (!Number.isNaN(v[h])) { ww += f.mine[h]; tt += f.mine[h] * v[h]; } return ww > 0 ? tt / ww : null; };
    spread = { hand, range, now: one ? eq[c] : t / w, equityNow: parts ? (one ? parts.now[c] : avg(parts.now)) : null, drawEquity: parts ? (one ? parts.draw[c] : avg(parts.draw)) : null, street: f.board.length === 3 ? 'turn' : 'river' };
  }
  // every hand's own spread, weakest card first, for drawing small: { combo: [equity on each next card] }
  let curves = null;
  if (cards) { curves = {}; for (const h of b.hands) { const list = []; for (const k of cards) if (!Number.isNaN(k.eq[h])) list.push(Math.round(k.eq[h] * 100) / 100); curves[h] = list.sort((x, y) => x - y); } }
  return { name: one ? fs.formatCombo(c) : null, types, spread, curves };
}

/**
 * The one-move rule for every hand of the range at once (see `oneMove`): what each action is worth to each hand, in chips
 * counted from now, against what he actually does. `what`: a change to try, to see what the range would do otherwise.
 *   noRaise   he may not raise: the hands he raises with call instead
 *   noStab    he may not bet after our check: the hands he bets with check behind instead
 *   lastBet   (facing a bet) nothing more can be bet after this: a call is worth exactly its equity (this is the rule's
 *             own count; it is here to be set against what the solution does)
 * Returns { hands, values[action][combo], kinds, share(pick) } where share is how much of the range does best by an
 * action of that kind (level within a hair counts for each).
 */
export function rangeMoves(s, what = {}) {
  const { fs, f } = s; if (!s.solution) return null; const N = fs.COMBOS; const node = f.node; const me = node.invested[f.me]; const him = node.invested[1 - f.me]; const pot = node.pot;
  const hands = []; const mask = new Float64Array(N); for (let c = 0; c < N; c++) if (f.mine[c] > 0) { hands.push(c); mask[c] = 1; }
  const liveOf = (range) => { let all = 0; const card = new Float64Array(52); for (let v = 0; v < N; v++) { const w = range[v]; if (w > 0) { all += w; card[fs.COMBO_CARDS[2 * v]] += w; card[fs.COMBO_CARDS[2 * v + 1]] += w; } } return (c) => Math.max(0, all - card[fs.COMBO_CARDS[2 * c]] - card[fs.COMBO_CARDS[2 * c + 1]] + range[c]); };
  const liveAll = liveOf(f.his); const eqVs = (range) => equityVs(fs, f.board, mask, range); const kinds = node.edges.map((e) => e.kind);
  const values = node.edges.map((edge) => {
    const child = f.nodes[edge.child]; const to = child.invested ? child.invested[f.me] : me; const paid = to - me; const V = new Float64Array(N); if (edge.kind === 'fold') return V;
    if (child.kind !== 'decision') { const e = eqVs(f.his); const I = Math.max(to, him); for (const c of hands) V[c] = Number.isNaN(e[c]) ? -paid : e[c] * (pot + (I - me) + (I - him)) - paid; return V; }
    const s2 = study(fs, s.solution, f.nodes, edge.child, s.dealt ?? []); if (!s2) return V;
    child.edges.forEach((reply, b) => {
      const r = new Float64Array(N); let any = false; for (let v = 0; v < N; v++) if (f.his[v] > 0) { r[v] = f.his[v] * s2.sigma(v, b); if (r[v] > 0) any = true; } if (!any) return;
      const live = liveOf(r); const after = f.nodes[reply.child]; const hisTo = after.invested ? after.invested[1 - f.me] : him; const pushes = !['fold', 'check', 'call'].includes(reply.kind); let e = null;
      // a wager of his that the change takes away is played as the quiet action instead
      const quiet = reply.kind === 'check' || reply.kind === 'call' || (pushes && ((what.noRaise && paid > 0) || (what.noStab && paid === 0)));
      for (const c of hands) {
        const all = liveAll(c); if (!(all > 0)) continue; const share = live(c) / all; if (share <= 0) continue;
        if (reply.kind === 'fold') { V[c] += share * pot; continue; }
        e ??= eqVs(r); const eq = Number.isNaN(e[c]) ? 0 : e[c];
        if (quiet) { const I = Math.max(to, pushes ? to : hisTo, him); V[c] += share * (eq * (pot + (I - me) + (I - him)) - paid); }
        else V[c] += share * Math.max(-paid, eq * (pot + (hisTo - me) + (hisTo - him)) - (hisTo - me));
      }
    });
    return V;
  });
  const W = hands.reduce((t, c) => t + f.mine[c], 0);
  const share = (pick) => { let t = 0; for (const c of hands) { let best = -Infinity; for (const v of values) best = Math.max(best, v[c]); const tol = 1e-9 + 0.002 * pot; const top = kinds.map((k, a) => a).filter((a) => values[a][c] >= best - tol); t += f.mine[c] * top.filter((a) => pick(kinds[a], a)).length / top.length; } return W > 0 ? t / W : 0; };
  // how much of the range clearly does better one way, how much the other, and how much is close (within `margin` of the pot)
  const lean = (pick, margin = 0.015) => { let yes = 0, no = 0, close = 0; for (const c of hands) { let a = -Infinity, b = -Infinity; values.forEach((v, i) => { if (pick(kinds[i], i)) a = Math.max(a, v[c]); else b = Math.max(b, v[c]); }); const d = a - b; if (d > margin * pot) yes += f.mine[c]; else if (d < -margin * pot) no += f.mine[c]; else close += f.mine[c]; } return { yes: yes / W, no: no / W, close: close / W }; };
  return { hands, values, kinds, share, lean, pot };
}
/** How much of something, in words a coach would use. */
const FRACTIONS = [[0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half'], [2 / 3, 'two thirds'], [0.75, 'three quarters']];
const howMuch = (x) => (x >= 0.955 ? 'nearly all' : x <= 0.05 ? 'almost none' : x < 0.19 ? 'a small part' : x > 0.82 ? 'most' : `about ${FRACTIONS.reduce((b, f) => (Math.abs(f[0] - x) < Math.abs(b[0] - x) ? f : b))[1]}`);
/** "about four times in ten": how often, for setting one frequency beside another. */
const inTen = (x) => { const n = Math.round(10 * x); return n <= 0 ? 'almost never' : n >= 10 ? 'almost always' : `about ${['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times'][n]} in ten`; };

/**
 * The range as a whole at a decision: what it does, why, and what would change it. Read from the solution and said the
 * way a coach would, with hands for examples. Returns { line, reasons: [{ id, text, detail }], facts } (`facts`: the
 * numbers behind it, for the tests).
 *
 * The why is the one-move rule added up over the range: for each hand, what a bet is worth (he folds, he calls, he
 * raises) against what a check is worth (he checks behind, he bets). The "what would change it" is the same count with
 * one thing about his play taken away, to show what that thing is doing.
 */
export function explainRange(s) {
  const { fs, f } = s; if (!s.solution) return null; const N = fs.COMBOS; const node = f.node; const facing = s.toCall > 0; const river = f.board.length === 5; const reasons = []; const facts = {};
  const W = f.mine.reduce((t, w) => t + (w > 0 ? w : 0), 0); if (!(W > 0)) return null;
  const kinds = node.edges.map((e) => e.kind); const freq = s.actions.map((a) => a.freq); const by = (pick) => { const r = new Float64Array(N); for (let c = 0; c < N; c++) if (f.mine[c] > 0) { let p = 0; node.edges.forEach((e, a) => { if (pick(e.kind, a)) p += s.sigma(c, a); }); r[c] = f.mine[c] * p; } return r; };
  const share = (pick) => freq.reduce((t, x, a) => t + (pick(kinds[a], a) ? x : 0), 0); const wager = (k) => !['check', 'call', 'fold'].includes(k);
  // who holds the strong hands: 65% equity or better against the other range
  const eMine = s.equity(); const eHis = equityVs(fs, f.board, f.his, f.mine); const strongOf = (range, e) => { let t = 0, w = 0; const r = new Float64Array(N); for (let c = 0; c < N; c++) if (range[c] > 0 && !Number.isNaN(e[c])) { w += range[c]; if (e[c] >= 0.65) { t += range[c]; r[c] = range[c]; } } return { share: w > 0 ? t / w : 0, range: r }; };
  const mine = strongOf(f.mine, eMine); const his = strongOf(f.his, eHis); const ahead = (() => { let t = 0, w = 0; for (let c = 0; c < N; c++) if (f.mine[c] > 0 && !Number.isNaN(eMine[c])) { t += f.mine[c] * eMine[c]; w += f.mine[c]; } return w > 0 ? t / w : 0.5; })();
  facts.strongMine = mine.share; facts.strongHis = his.share; facts.equity = ahead;
  const strength = () => {
    const d = mine.share - his.share; const g1 = groupsOf(fs, f.board, mine.range); const g2 = groupsOf(fs, f.board, his.range);
    const text = d >= 0.07 ? `You hold more of the strong hands: ${g1.length ? sayGroups(g1) : 'the best of them'}. He has fewer.` : d <= -0.07 ? `He holds more of the strong hands here: ${g2.length ? sayGroups(g2) : 'the best of them'}.` : `Neither of you holds clearly more of the strong hands${ahead >= 0.54 ? ', though your range is ahead overall' : ahead <= 0.46 ? ', though his range is ahead overall' : ''}.`;
    return { id: 'strong', text, detail: `Hands with 65% equity or more: ${pts(mine.share)} of your range, ${pts(his.share)} of his. Your range has ${pts(ahead)} equity.` };
  };
  let line;
  if (!facing) {
    const bet = share(wager); const bets = node.edges.map((e, a) => (wager(e.kind) ? a : -1)).filter((a) => a >= 0); const main = bets.length ? bets.reduce((b, a) => (freq[a] > freq[b] ? a : b)) : -1; const small = bets.length > 1 && main === bets[0]; const big = bets.length > 1 && main === bets[bets.length - 1]; facts.bet = bet;
    line = bet >= 0.8 ? `You bet almost your whole range here${small ? ', mostly the small size' : big ? ', mostly the big size' : ''}.` : bet <= 0.2 ? 'You check almost your whole range here.' : bet >= 0.6 ? `You bet most of your range here${small ? ', mostly small' : big ? ', mostly big' : ''}, and check the rest.` : bet <= 0.4 ? 'You check most of your range here, and bet the rest.' : 'You bet about half your range here and check the other half.';
    // ---- why: what a bet meets, for the range as a whole ----
    let answer = null;
    if (main >= 0 && f.nodes[node.edges[main].child].kind === 'decision') {
      const s2 = study(fs, s.solution, f.nodes, node.edges[main].child, s.dealt ?? []);
      if (s2) {
        const reply = (pick) => { const r = new Float64Array(N); let t = 0, w = 0; for (let v = 0; v < N; v++) if (s2.f.mine[v] > 0) { let p = 0; s2.f.node.edges.forEach((e, b) => { if (pick(e.kind)) p += s2.sigma(v, b); }); r[v] = s2.f.mine[v] * p; t += r[v]; w += s2.f.mine[v]; } return { share: w > 0 ? t / w : 0, groups: groupsOf(fs, f.board, r), range: r }; };
        const fo = reply((k) => k === 'fold'); const ra = reply((k) => wager(k)); const ca = reply((k) => k === 'call'); const size = (f.nodes[node.edges[main].child].invested[f.me] - node.invested[f.me]) / node.pot; const price = size / (1 + size);
        // where the range stands against the hands that call: its equity against them, hand by hand, averaged
        const mask = new Float64Array(N); for (let c = 0; c < N; c++) if (f.mine[c] > 0) mask[c] = 1; const eCall = equityVs(fs, f.board, mask, ca.range); let aheadOfCalls = 0, wC = 0; for (let c = 0; c < N; c++) if (f.mine[c] > 0 && !Number.isNaN(eCall[c])) { wC += f.mine[c]; if (eCall[c] >= 0.5) aheadOfCalls += f.mine[c]; } aheadOfCalls = wC > 0 ? aheadOfCalls / wC : 0;
        answer = { fo, ra, ca, size, price, aheadOfCalls }; Object.assign(facts, { folds: fo.share, calls: ca.share, raises: ra.share, price, aheadOfCalls });
        const act = name(node.edges[main]);
        const seen = new Set(); const foldBit = `he ${often(fo.share, 'folds')}${fo.groups.length && fo.share >= 0.05 ? ` (${sayGroups(fo.groups, 2, 0.12, seen)})` : ''}`; const enough = fo.share >= price + 0.04 ? 'more than a bet of that size needs' : fo.share <= price - 0.04 ? 'less than a bet of that size needs to pay with nothing behind it' : 'about what a bet of that size needs';
        const callBit = ca.groups.length ? `He calls with ${sayGroups(ca.groups, 2, 0.12, seen)}, and ${howMuch(aheadOfCalls)} of your range is ahead of those hands.` : '';
        const raiseBit = ra.share >= 0.08 && ra.groups.length ? ` He raises ${ra.share >= 0.2 ? 'a lot' : 'now and then'}, with ${sayGroups(ra.groups, 2, 0.12, seen)}.` : '';
        const head = bet >= 0.6 ? 'Why so much betting: ' : bet <= 0.4 ? 'Why so little betting: ' : 'Why the split: ';
        reasons.push({ id: 'why', text: `${head}against ${act} ${foldBit}, ${enough}. ${callBit}${raiseBit}`.trim(), detail: `To ${act} he folds ${pts(fo.share)}, calls ${pts(ca.share)} and raises ${pts(ra.share)}. A bet of that size breaks even as a pure bluff when he folds ${pts(price)}. ${pts(aheadOfCalls)} of your range has 50% or more against the hands that call.` });
      }
    }
    reasons.push(strength());
    /*CHANGE-ACTING*/
    // which hands bet, which check
    if (bet > 0.08 && bet < 0.92) { const gb = groupsOf(fs, f.board, by((k) => wager(k))); const gx = groupsOf(fs, f.board, by((k) => k === 'check')); if (gb.length && gx.length) reasons.push({ id: 'which', text: `The bets are mostly ${sayGroups(gb, 3)}. The checks are mostly ${sayGroups(gx, 3)}.`, detail: `Bets: ${gb.slice(0, 4).map((g) => `${g.name} ${pts(g.share)}`).join(', ')}. Checks: ${gx.slice(0, 4).map((g) => `${g.name} ${pts(g.share)}`).join(', ')}.` }); }
    // what he does when checked to
    const xi = kinds.indexOf('check');
    if (xi >= 0 && f.nodes[node.edges[xi].child].kind === 'decision' && freq[xi] >= 0.15) {
      const s3 = study(fs, s.solution, f.nodes, node.edges[xi].child, s.dealt ?? []);
      if (s3) { const stab = s3.actions.reduce((t, a) => t + (wager(a.kind) ? a.freq : 0), 0); const r = new Float64Array(N); for (let v = 0; v < N; v++) if (s3.f.mine[v] > 0) { let p = 0; s3.f.node.edges.forEach((e, b) => { if (wager(e.kind)) p += s3.sigma(v, b); }); r[v] = s3.f.mine[v] * p; } const g = groupsOf(fs, f.board, r); facts.stab = stab;
        reasons.push({ id: 'after', text: stab >= 0.6 ? `When you check he ${often(stab, 'bets')}${g.length ? `, with ${sayGroups(g)}` : ''}: a check is not a free card, and the hands you check have to be ready for it.` : stab <= 0.3 ? `When you check he ${often(1 - stab, 'checks')} back, so a check usually sees the next card for nothing.` : `When you check he bets about ${stab >= 0.45 ? 'half' : 'a third of'} the time${g.length ? `, with ${sayGroups(g)}` : ''}.`, detail: `After your check he bets ${pts(stab)} of the time.` }); }
    }
  } else {
    const fold = share((k) => k === 'fold'); const raise = share(wager); const price = s.toCall / (s.pot + s.toCall); const gHis = groupsOf(fs, f.board, f.his); const alpha = s.toCall / s.pot; Object.assign(facts, { fold, raise, price, alpha });
    line = fold <= 0.15 ? 'You continue with almost your whole range against this bet.' : fold >= 0.7 ? 'You fold most of your range to this bet.' : `You continue with about ${fold <= 0.4 ? 'two thirds' : fold <= 0.55 ? 'half' : 'a third'} of your range against this bet${raise >= 0.12 ? ', and raise some of it' : ''}.`;
    if (gHis.length) reasons.push({ id: 'his', text: `He is betting ${sayGroups(gHis, 3)}.`, detail: gHis.slice(0, 5).map((g) => `${g.name} ${pts(g.share)}`).join(', ') + '.' });
    // ---- why: the price against what the range has, and what is still to come ----
    let has = 0; for (let c = 0; c < N; c++) if (f.mine[c] > 0 && !Number.isNaN(eMine[c]) && eMine[c] >= price) has += f.mine[c]; has /= W; facts.hasPrice = has;
    const cont = 1 - fold;
    let why = `Why you continue this often: the call needs ${pts(price)}, and ${howMuch(has)} of your range has that against what he is betting.`;
    if (!river && has - cont >= 0.08) why += ` Fewer continue than have the price: a hand that just has it now does not keep it when he bets again, so the bottom of those folds.`;
    else if (has - cont <= -0.08) why += ` More continue than have the price on equity: the rest are ${river ? 'bluff raises' : 'hands that can still improve, and raises that can win the pot at once'}.`;
    reasons.push({ id: 'why', text: why, detail: `${pts(has)} of your range has ${pts(price)} equity or more against his betting range. You continue with ${pts(cont)}: call ${pts(share((k) => k === 'call'))}, raise ${pts(raise)}.` });
    reasons.push(strength());
    // what would change it: nothing more to come, or a bet with no hand behind it
    { const said = []; if (!river && Math.abs(has - cont) >= 0.08) said.push(`If this were the last bet, ${howMuch(has)} of your range would continue: everything with the price.`);
      said.push(folded(fold, alpha));
      reasons.push({ id: 'price', text: said.join(' '), detail: `You fold ${pts(fold)}. His bet breaks even as a pure bluff when you fold ${pts(alpha)}.` }); }
    const gf = groupsOf(fs, f.board, by((k) => k === 'fold')); const gc = groupsOf(fs, f.board, by((k) => k === 'call')); const gr = groupsOf(fs, f.board, by((k) => wager(k)));
    let text = ''; if (fold >= 0.05 && gf.length) text += `You fold ${sayGroups(gf)}. `; if (gc.length) text += `You call with ${sayGroups(gc, 3)}. `; if (raise >= 0.05 && gr.length) text += `The raises are ${sayGroups(gr)}.`;
    if (text) reasons.push({ id: 'which', text: text.trim(), detail: `Fold ${pts(fold)}, call ${pts(share((k) => k === 'call'))}, raise ${pts(raise)}.` });
  }
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1); for (const r of reasons) { r.text = cap(r.text); if (r.detail) r.detail = cap(r.detail); }
  return { line, reasons, facts };
}
/** How the folding compares with what would make his bet pay with nothing: said as what it means for him. */
function folded(fold, alpha) {
  if (fold >= alpha + 0.08) return 'You fold more than would stop him betting any two cards, so his bluffs pay here: his range is strong enough on this board that defending wider would cost you more than that.';
  if (fold <= alpha - 0.08) return 'You fold less than he would need for a bet with nothing to pay: your range has too much against what he is betting to give up, and if he bet more often with nothing you would not need to change.';
  return 'You fold about as much as makes a bet with nothing break even for him: fold more and he could bet any two cards, fold less and his bluffs would lose.';
}
/** An action in words, for the range sentences. */
function name(edge) { const n = /\d+/.exec(edge.label)?.[0]; return edge.kind === 'allin' ? 'an all-in' : edge.kind === 'raise' ? 'a raise' : n ? `the ${n}% bet` : 'a bet'; }

/**
 * "What would change it" where the street is too large to play again: read off the solution hand by hand, with everything
 * else he does kept as it is. A bet is worth one thing when he folds and another when he does not, so each hand has a
 * share of folds at which betting and checking are worth the same; the bets that need the folds he gives, and the checks
 * that are a few folds short of a bet, are counted. Facing a bet: how much of what continues does so by a small margin.
 */
export function firstOrder(s) {
  const { fs, f } = s; if (!s.solution) return null; const N = fs.COMBOS; const node = f.node; const facing = s.toCall > 0; const wager = (k) => !['check', 'call', 'fold'].includes(k); const kinds = node.edges.map((e) => e.kind); const step = 0.1;
  const does = (c, pick) => kinds.reduce((t, k, a) => t + (pick(k) ? s.sigma(c, a) : 0), 0);
  if (facing) {
    const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call'); if (fi < 0 || ci < 0) return null; const C = s.closely(ci); const F = s.closely(fi); if (!C || !F) return null; const more = 0.25 * s.pot;
    let cont = 0, close = 0; for (let c = 0; c < N; c++) { const w = f.mine[c]; if (!(w > 0)) continue; const d = C.value[c] - F.value[c]; if (Number.isNaN(d)) continue; const on = w * does(c, (k) => k !== 'fold'); cont += on; if (d < more) close += on; }
    if (!(cont > 0)) return null; const x = close / cont;
    const text = x <= 0.1 ? 'What would change it. Very little: almost everything you continue with would still do so if the bet cost a quarter of the pot more.' : x >= 0.9 ? 'What would change it. The price: almost none of what you continue with could pay a quarter of the pot more.' : `What would change it. The price: ${howMuch(x)} of what you continue with is close enough that it would fold if the bet cost a quarter of the pot more. The rest would still continue.`;
    return { facing, close: x, said: { id: 'change', text, detail: `Counted hand by hand from the solution, keeping the hands he bets as they are: ${pts(x)} of what continues is worth less than a quarter of the pot more than folding. The street is too large to solve again here.` } };
  }
  const bets = kinds.map((k, a) => (wager(k) ? a : -1)).filter((a) => a >= 0); const xi = kinds.indexOf('check'); if (!bets.length || xi < 0) return null;
  const main = bets.reduce((b, a) => (s.actions[a].freq > s.actions[b].freq ? a : b)); const X = s.closely(main); const Q = s.closely(xi); const fold = X?.replies?.find((r) => r.kind === 'fold'); if (!X || !Q || !fold) return null;
  let B = 0, free = 0, stop = 0, K = 0, start = 0, folds = 0, W = 0;
  for (let c = 0; c < N; c++) {
    const w = f.mine[c]; if (!(w > 0)) continue; const p = fold.share[c]; if (!(p > 0.02 && p < 0.98) || Number.isNaN(X.value[c]) || Number.isNaN(Q.value[c])) continue;
    const whenFolds = fold.value[c] / p; const rest = (X.value[c] - fold.value[c]) / (1 - p); const need = whenFolds > rest ? (Q.value[c] - rest) / (whenFolds - rest) : (rest >= Q.value[c] ? 0 : 2);
    const b = w * does(c, wager); const k = w - b; B += b; K += k; folds += w * p; W += w; if (need <= 0.02) free += b; if (need > p - step) stop += b; if (need < p + step) start += k;
  }
  if (!(W > 0)) return null; const r = { facing, folds: folds / W, free: B > 0 ? free / B : null, stop: B > 0 ? stop / B : null, start: K > 0 ? start / K : null, bet: B / W }; const said = []; const fewer = inTen(Math.max(0, r.folds - step)); const extra = inTen(Math.min(1, r.folds + step));
  if (r.bet >= 0.05) { said.push(r.free >= 0.9 ? 'Almost none of your bets need him to fold: they would still be bets if he never did.' : r.free <= 0.1 ? 'Almost all of your bets need him to fold.' : `${howMuch(r.free)} of your bets do not need him to fold at all.`);
    if (r.stop >= 0.1) said.push(`If he folded ${fewer} instead of ${inTen(r.folds)}, ${r.stop >= 0.9 ? 'almost all' : howMuch(r.stop)} of your bets would be better checked.`); else said.push(`Even if he folded ${fewer} instead of ${inTen(r.folds)}, your bets would stay bets.`); }
  if (r.bet <= 0.95 && r.start != null) said.push(r.start >= 0.1 ? `If he folded ${extra}, ${r.start >= 0.9 ? 'almost all' : howMuch(r.start)} of your checks would be better bet.` : `Your checks are not close: they would stay checks even if he folded ${extra}.`);
  if (!said.length) return null; const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  return { ...r, said: { id: 'change', text: `What would change it. ${said.map(cap).join(' ')}`, detail: `Counted hand by hand from the solution, for ${name(node.edges[main])}, keeping everything else he does as it is: he folds ${pts(r.folds)} now.${r.free != null ? ` ${pts(r.free)} of the betting is worth more than checking even with no folds; ${pts(r.stop)} of it stops being so with ten points fewer folds.` : ''} The street is too large to solve again here. Where streets could be solved again (66 decisions measured), taking his strongest hands out raised the betting or left it and never lowered it, and taking yours out lowered it or left it.` } };
}

/**
 * "What would change it", from the street played again with one thing changed (web/worker.js `whatIf`): the frequency the
 * range bets (or, facing a bet, folds) as things are, and with each change. Said in the order of how much each moves it.
 * A move under seven points is said to be none: the two solves are not exact to more than that.
 */
export function sayChanges(r) {
  if (!r || r.base == null) return null; const verb = r.facing ? 'fold' : 'bet'; const said = []; const numbers = [`Solved again as it is, your range ${verb}s ${pts(r.base)} of the time. The strongest hands are the top 20% of a range by equity.`]; const big = 0.07;
  const items = [['hisLess', r.hisLess], ['myLess', r.myLess], ['noRaise', r.noRaise], ['noStab', r.noStab]].filter((x) => x[1] != null).map(([id, to]) => ({ id, to, d: to - r.base })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const much = (x) => { const t = howMuch(x); return /^(most|a small part|nearly all|almost none)$/.test(t) ? `${t} of it` : t; }; const only = (x) => (x <= 0.05 ? 'hardly bet at all' : `bet only ${much(x)}`); const foldOnly = (x) => (x <= 0.05 ? 'hardly fold at all' : `fold only ${much(x)}`); const NAME = { hisLess: 'without his strongest hands', myLess: 'without your own strongest hands', noRaise: 'if he could not raise', noStab: 'if he could not bet when checked to' };
  for (const it of items) {
    numbers.push(`${NAME[it.id].charAt(0).toUpperCase()}${NAME[it.id].slice(1)}: ${pts(it.to)}.`); const up = it.d > 0;
    if (Math.abs(it.d) < big) continue;
    if (!r.facing) {
      if (it.id === 'hisLess') said.push(up ? `Take the strongest hands out of his range and you would bet ${howMuch(it.to)} of yours instead of ${howMuch(r.base)}: it is those hands of his that hold you back.` : `Take the strongest hands out of his range and you would bet less (${much(it.to)}): much of your betting is aimed at those hands.`);
      if (it.id === 'myLess') said.push(up ? `Without your own strongest hands you would bet more (${much(it.to)}): those hands are doing your checking.` : `Without your own strongest hands you would ${only(it.to)}: the rest of the betting leans on those hands being there.`);
      if (it.id === 'noRaise') said.push(up ? `If he could not raise you would bet ${much(it.to)}: his raises keep part of your range quiet.` : `If he could not raise you would bet less (${much(it.to)}): some of your bets are there to be raised.`);
      if (it.id === 'noStab') said.push(up ? `If he could not bet when checked to you would bet ${much(it.to)}: the chance that he bets is part of what makes your checks worth making.` : `If he could not bet when checked to you would bet less (${much(it.to)}): some of your bets are made so as not to face his.`);
    } else {
      if (it.id === 'hisLess') said.push(up ? `Take the strongest hands out of what he holds and you would fold more (${much(it.to)}).` : `Take the strongest hands out of his range and you would ${foldOnly(it.to)} instead of ${much(r.base)}: it is those hands you are folding to.`);
      if (it.id === 'myLess') said.push(up ? `Without your own strongest hands you would fold ${much(it.to)}: the hands below them are only good enough to continue with those above them in the range.` : `Without your own strongest hands you would fold less (${much(it.to)}): the rest would have to do the defending.`);
    }
  }
  const quiet = items.filter((it) => Math.abs(it.d) < big).map((it) => NAME[it.id]);
  if (quiet.length && said.length) said.push(`It would be much the same ${listOf(quiet).replace(/, and | and /g, (m) => m.replace('and', 'or'))}.`);
  if (!said.length) said.push(r.facing ? `Not the hands: ${listOf(quiet).replace(/ and /, ' or ')}, your range would fold about as often. How much you fold is set by the price he lays you, so that his bluffs do not pay.` : `Nothing tried moves it: ${listOf(quiet).replace(/ and /, ' or ')}, your range would ${verb} about as often. It comes from how the two ranges meet this board as a whole.`);
  if (r.facing && r.close != null) { said.push(r.close <= 0.1 ? 'A bigger bet would change little: almost everything you continue with could pay a quarter of the pot more.' : `A bigger bet would: ${r.close >= 0.9 ? 'almost all' : howMuch(r.close)} of what you continue with is close enough to fold if it cost a quarter of the pot more.`); numbers.push(`${pts(r.close)} of what continues is worth less than a quarter of the pot more than folding.`); }
  return { id: 'change', text: `What would change it. ${said.join(' ')}`, detail: numbers.join(' ') };
}
