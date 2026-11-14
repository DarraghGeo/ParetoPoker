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
  return { fs, f, pot: f.node.pot, toCall: f.node.invested[1 - f.me] - f.node.invested[f.me], actions, lineReach, sigma, featuresOf, closely, bands, spread, drawParts, equity: () => equity ?? (equity = equityVs(fs, f.board, f.mine, f.his)) };
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

/**
 * One hand explained. Returns `{ name, strategy, line, reasons, claims, silent }`:
 * `line` is what the hand is; `reasons` the paragraphs, each built from claims that passed the
 * gates; `silent` says why nothing more is said when the decision is not one the proof covers.
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
    return { name: m.name, strategy, line: `You have ${what}.`, reasons, claims: [], silent: 'This line is taken too rarely for the solution to be settled on it, so nothing more is said.' };
  }
  if (!T) T = NUMBERS_ONLY;
  const made = claims(s, m, T);
  const label = (i) => m.actions[i].label;
  const facing = s.toCall > 0;
  const street = s.f.board.length === 3 ? 'the turn and river still to come' : s.f.board.length === 4 ? 'the river still to come' : 'no cards to come';
  const river = s.f.board.length === 5;
  // on the river equity is simply how much of his range the hand beats; and a bet names its own price
  let line = river ? `You have ${what}. It beats ${pts(m.equity)} of the range he has here.` : `You have ${what}. With ${street} it has ${pts(m.equity)} equity against the range he has here.`;
  if (river && facing) line += ` He has bet ${Math.round(s.toCall)} into ${Math.round(s.pot - s.toCall)}, so a call has to win ${pts(s.toCall / (s.pot + s.toCall))} of the time.`;
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
    if (nr && nr.same.weight >= floor && nr.rest.weight >= floor && Math.abs(nr.same.move - nr.rest.move) >= 0.2) kind = { group: TYPES[nr.type] ?? nr.type, mine: nr.same.move, theirs: nr.rest.move, rest: 'the rest' };
    else if (nr && nr.draw && nr.draws.weight > 0 && nr.others.weight >= floor && Math.abs(nr.draws.move - nr.others.move) >= 0.2) kind = { group: 'the draws', mine: nr.draws.move, theirs: nr.others.move, rest: 'the hands without a draw' };
    else if (nr && !nr.draw && m.features.own === 0 && !river && nr.draws.weight >= floor && nr.others.weight > 0 && Math.abs(nr.draws.move - nr.others.move) >= 0.2) kind = { group: 'the hands without a draw', mine: nr.others.move, theirs: nr.draws.move, rest: 'the draws' };
    if (kind) {
      const more = kind.mine > kind.theirs; const outs = m.features.flushOuts + m.features.straightOuts; const isDraw = nr.draw;
      let text = `What sets it apart: in this solution, among your hands of about this strength, ${kind.group} ${doing} ${pts(kind.mine)} of the time and ${kind.rest} ${doing} ${pts(kind.theirs)}.`;
      if (!facing && more && isDraw && outs > 0) text += ` A draw has two ways to win: he folds now, or one of its ${outs} outs comes.`;
      else if (!facing && !more && !isDraw && !river && m.features.own === 0) text += ' It has no draw: when a bet is called it has almost nothing to improve to, so the draws do the betting at this strength.';
      else if (!facing && !more && river && m.features.own >= 1) text += ' A pair still wins some showdowns when checked; the hands with nothing at all do the bluffing.';
      else if (!facing && more && river && m.features.own === 0) text += ' It has no showdown value to protect.';
      else if (facing && more && isDraw && outs > 0) text += ` It can still make the best hand: ${outs} outs.`;
      reasons.push({ id: 'type', text });
    }
    // its cards: how often he folds to this hand, against the weak hands around it (a number of this solution)
    const bets = m.actions.map((x, i) => i).filter((i) => m.actions[i].on && m.actions[i].folds != null && !['check', 'call', 'fold'].includes(m.actions[i].kind));
    if (bets.length && m.equity < 0.25) {
      const main = bets.sort((x, y) => m.actions[y].freq - m.actions[x].freq)[0];
      const fold = s.closely(main).replies?.find((r) => r.kind === 'fold')?.share; const eq = s.equity();
      if (fold) {
        let w = 0, t = 0; for (let c = 0; c < eq.length; c++) if (s.f.mine[c] > 0 && eq[c] < 0.25 && !Number.isNaN(fold[c])) { w += s.f.mine[c]; t += s.f.mine[c] * fold[c]; }
        const avg = w > 0 ? t / w : null; const mine = m.actions[main].folds;
        if (avg != null && Math.abs(mine - avg) >= 0.015) reasons.push({ id: 'cards-held', text: mine > avg ? `Its cards help: he folds ${pts(mine)} to ${label(main)} against this hand, and ${pts(avg)} against your weak hands on average. It holds cards his calling hands need.` : `Its cards work against it: he folds ${pts(mine)} to ${label(main)} against this hand, and ${pts(avg)} against your weak hands on average. It holds cards his folding hands need.` });
      }
    }
  }
  // ---- why this hand: where it sits in your range, and what that part of the range does ----
  if (m.bands && m.band >= 0) {
    const NAME = ['the weakest fifth', 'the second-weakest fifth', 'the middle fifth', 'the second-strongest fifth', 'the strongest fifth'];
    const doing = facing ? 'continues against the bet' : 'bets';
    const mine = m.bands[m.band]; const role = made.find((c) => c.kind === 'role');
    let text = `Where it sits: in ${NAME[m.band]} of the hands you get here with. As a group that fifth ${doing} ${pts(mine.move)} of the time.`;
    if (role) {
      const other = m.bands[role.other];
      text += ` ${NAME[role.other].replace(/^t/, 'T')} ${doing} ${pts(other.move)}.`;
      // what separates the two groups is how much of his range each beats
      const weakSide = role.band < role.other; const own = m.actions.reduce((t, x) => t + ((facing ? x.kind !== 'fold' : !['check', 'call', 'fold'].includes(x.kind)) ? x.sigma : 0), 0);
      const along = role.more ? own >= 0.25 : own <= 0.75;
      if (!along) text += ' This hand goes the other way from its part of the range.';
      else if (!facing && role.more && weakSide) text += ` Those hands beat ${pts(other.eq)} of his range on average and this one beats ${pts(m.equity)}: it has the least to lose by betting, which is why the bluffs come from down here.`;
      else if (!facing && role.more && !weakSide) text += ` Those hands beat ${pts(other.eq)} of his range on average and this one beats ${pts(m.equity)}: it is strong enough to be paid by worse, which they are not.`;
      else if (!facing && !role.more && weakSide) text += ` Those hands beat ${pts(other.eq)} of his range on average and this one beats ${pts(m.equity)}: not enough to bet for value the way they do.`;
      else if (!facing && !role.more && !weakSide) text += ` Those hands beat ${pts(other.eq)} of his range on average and this one beats ${pts(m.equity)}: it wins too often at showdown to be turned into a bluff the way they are.`;
      else if (facing && role.more) text += ` Those hands beat ${pts(other.eq)} of what he bets on average; this one beats ${pts(m.equity)}.`;
      else if (facing) text += ` Those hands beat ${pts(other.eq)} of what he bets on average; this one beats only ${pts(m.equity)}.`;
    }
    reasons.push({ id: 'role', text });
  }
  const passive = m.actions.findIndex((x) => x.on && x.worth != null && (x.kind === 'check' || x.kind === 'call'));
  const passiveIdx = passive >= 0 ? passive : null;
  // the bets and raises it makes: who pays for them
  for (const i of taken) {
    const folds = made.find((c) => c.kind === 'folds' && c.a === i); if (!folds) continue;
    const needs = made.find((c) => c.kind === 'needs' && c.a === i); const builds = made.find((c) => c.kind === 'builds' && c.a === i);
    let text = `${label(i)}: he folds ${pts(folds.value)} of the time against this hand.`;
    // what is compared: the hand's expectation over the times he continues, with its expectation by the passive action over everything he holds
    if (needs) text += ` The times he does not fold are worth less to you than ${passiveName} is overall, by ${pot(needs.by)} of the pot, so the bet earns its keep through the times he folds.`;
    else if (builds) text += ` Even the times he does not fold are worth more to you than ${passiveName} is overall, by ${pot(builds.by)} of the pot: the bet does not depend on his folding.`;
    else if (passiveIdx != null && m.actions[i].whenContinued != null && m.actions[i].continues >= 0.05) { const d = m.actions[i].whenContinued - m.actions[passiveIdx].worth; text += ` In this solution the times he does not fold are worth ${pot(d)} of the pot ${d >= 0 ? 'more' : 'less'} to you than ${passiveName} is overall.`; }
    if (m.actions[i].aheadWhenCalled != null) text += ` When he calls you are ahead ${pts(m.actions[i].aheadWhenCalled)} of the time.`;
    reasons.push({ id: needs ? 'needs' : builds ? 'builds' : 'folds', text });
  }
  // a hand that does not bet: what the range's main bet would have met, as this solution's numbers
  if (!taken.some((i) => m.actions[i].folds != null && m.actions[i].kind !== 'check' && m.actions[i].kind !== 'call')) {
    const bets = m.actions.map((x, i) => i).filter((i) => m.actions[i].on && m.actions[i].worth != null && m.actions[i].folds != null && m.actions[i].kind !== 'check' && m.actions[i].kind !== 'call' && m.actions[i].kind !== 'fold');
    const main = bets.sort((x, y) => m.actions[y].freq - m.actions[x].freq)[0];
    if (main != null && passiveIdx != null && m.actions[main].whenContinued != null && m.actions[main].continues >= 0.05) {
      const d = m.actions[main].whenContinued - m.actions[passiveIdx].worth;
      reasons.push({ id: 'unbet', text: `In this solution, had it made the bet the range makes most, ${label(main)}, he would fold ${pts(m.actions[main].folds)} of the time, and the times he did not would be worth ${pot(d)} of the pot ${d >= 0 ? 'more' : 'less'} to you than ${passiveName} is overall.` });
    }
  }
  // a call: which cards it is for
  for (const c of made.filter((x) => x.kind === 'cards')) {
    // said per time such a card comes: the part of the gain that arrives on those cards, over how often they come
    const each = (part, weight) => (weight > 0 ? part / weight : 0);
    const up = c.liftSure ? `when one of the ${c.n} cards that improve the hand comes (${pts(c.liftWeight)} of the time) it is ${pot(each(c.lift, c.liftWeight))} of the pot ${c.lift > 0 ? 'better' : 'worse'} off` : '';
    const down = c.restSure ? `on the other ${c.others} cards it is ${pot(each(c.rest, c.restWeight))} ${c.rest > 0 ? 'better' : 'worse'} off` : '';
    const moral = c.liftSure && c.restSure ? (c.lift > 0 && c.rest < 0 ? ' The call is for those cards.' : c.lift > 0 && c.rest > 0 ? ' The call pays whether or not it improves.' : '') : '';
    reasons.push({ id: 'cards', text: `${label(c.a)}, set against folding: ${[up, down].filter(Boolean).join(', and ')}.${moral}` });
  }
  // what it mixes
  const same = made.filter((x) => x.kind === 'same');
  if (same.length) {
    // every pair among them, or it is said pair by pair
    const set = [...new Set(same.flatMap((c) => [c.a, c.b]))].sort((x, y) => x - y);
    const whole = same.length === (set.length * (set.length - 1)) / 2;
    const list = (ids) => (ids.length === 2 ? `${label(ids[0])} and ${label(ids[1])}` : `${ids.slice(0, -1).map(label).join(', ')} and ${label(ids[ids.length - 1])}`);
    if (whole) reasons.push({ id: 'same', text: `${list(set)} earn the same with this hand, to within ${pot(Math.max(...same.map((c) => c.within)))} of the pot, so it can do ${set.length === 2 ? 'either' : 'any of them'}.` });
    else for (const c of same) reasons.push({ id: 'same', text: `${list([c.a, c.b])} earn the same with this hand, to within ${pot(c.within)} of the pot.` });
  }
  // what it does not do, and what that would cost
  for (const c of made.filter((x) => x.kind === 'worse')) reasons.push({ id: 'worse', text: `${label(c.a)} is worse with this hand: against his strategy in this solution it gives up ${pot(c.gap)} of the pot${m.actions[c.a].sigma >= TAKES ? `, though this solution still plays it ${pts(m.actions[c.a].sigma)} of the time` : ''}.` });
  // numbers where no conclusion is drawn: what this solution has, said as that
  {
    const on = m.actions.map((x, i) => (x.on && x.worth != null ? i : -1)).filter((i) => i >= 0);
    const best = on.reduce((b, i) => (b < 0 || m.actions[i].worth > m.actions[b].worth ? i : b), -1);
    for (const i of on) {
      if (i === best || made.some((c) => (c.kind === 'worse' && c.a === i) || (c.kind === 'same' && (c.a === i || c.b === i)))) continue;
      const gap = m.actions[best].worth - m.actions[i].worth;
      if (gap < 0.25) { reasons.push({ id: 'level', text: `In this solution ${label(i)} and ${label(best)} come out level with this hand.` }); continue; }
      reasons.push({ id: 'behind', text: m.actions[i].sigma >= TAKES ? `In this solution ${label(i)} comes out ${pot(gap)} of the pot behind ${label(best)}, and the hand still does both.` : `In this solution ${label(i)} comes out ${pot(gap)} of the pot behind ${label(best)}${proven ? ': too close to call it worse' : ''}.` });
    }
  }
  return { name: m.name, strategy, line, reasons, claims: made, silent: proven ? null : 'Numbers only, as this solution has them. Conclusions are drawn only where they have been proven to carry over: see the proof file for which decisions those are.' };
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
