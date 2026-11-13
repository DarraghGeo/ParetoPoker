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
import { features, groupOf } from './features.js';
import { equityVs } from '../solver/flopsolve.js';

/** An action the range takes at least this often is on the path; a rarer one leads where the solution is not pinned down. */
export const ON_PATH = 0.05;

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
  return { fs, f, pot: f.node.pot, toCall: f.node.invested[1 - f.me] - f.node.invested[f.me], actions, lineReach, sigma, featuresOf, closely, equity: () => equity ?? (equity = equityVs(fs, f.board, f.mine, f.his)) };
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
  return { combo: c, name: fs.formatCombo(c), features: s.featuresOf(c), equity: worth ? s.equity()[c] : null, reach: f.mine[c], actions: acts };
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
 *   low   how much is taken off the cost of an action the hand does not take before saying 'at least'
 *   cmp   what a bet is worth when he continues, less what the passive action is worth
 *   lift, rest   a call's gain over folding on the cards that lift the hand, and on the others
 */
export const TOLERANCE = {
  // Only lines that at least half of each range takes: on thinner ones two equally fine solves disagree about
  // which hands he holds, and claims failed the held-out test (PROOF.md, "what did not pass").
  turn: [
    { upTo: 0.02, lines: [{ from: 0.5, eq: 1, folds: 1, gap: 1.1, low: 2, cmp: 3.5, lift: 0.5, rest: 1.5 }] },
  ],
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
 * Claims (m: the hand's measurement; T: the tolerances):
 *   equity  { value }             its equity against his range here
 *   folds   { a, value }          how often he folds to action a, against this hand
 *   costs   { best, a, atLeast }  action a is worth at least `atLeast` less than the best action (never an exact amount:
 *                                 what an action a hand does not take is worth is not pinned down by the equilibrium)
 *   same    { a, b, within }      two actions the hand takes are worth the same to within `within`
 *   The next three are made only about actions the hand itself takes (`TAKES` of the time or more).
 *   needs   { a, passive, by }    when he continues against bet a, the hand does worse than the passive action by `by`: the bet lives on folds
 *   builds  { a, passive, by }    when he continues it still does better than the passive action by `by`: the bet needs no folds
 *   cards   { a, n, lift, rest }  a call's gain over folding: `lift` on the n cards that lift the hand, `rest` on the others
 */
/** A hand takes an action when it does so at least this often. What an action is worth to a hand that takes it is pinned down far better than to one that does not. */
export const TAKES = 0.1;
export function claims(s, m, T) {
  const out = [];
  if (!m || !T) return out;
  const on = m.actions.map((a, i) => (a.on && a.worth != null ? i : -1)).filter((i) => i >= 0);
  out.push({ kind: 'equity', value: m.equity });
  const best = on.reduce((b, i) => (b < 0 || m.actions[i].worth > m.actions[b].worth ? i : b), -1);
  if (T.gap != null && on.length > 1) {
    for (const i of on) { if (i === best) continue; const gap = m.actions[best].worth - m.actions[i].worth; if (T.low != null && gap - T.low >= 0.5) out.push({ kind: 'costs', best, a: i, gap, atLeast: gap - T.low }); }
    const played = on.filter((i) => m.actions[i].sigma >= 0.1);
    for (let x = 0; x < played.length; x++) for (let y = x + 1; y < played.length; y++) { const d = Math.abs(m.actions[played[x]].worth - m.actions[played[y]].worth); if (d <= T.gap / 2) out.push({ kind: 'same', a: played[x], b: played[y], within: d + T.gap }); }
  }
  const passive = on.find((i) => m.actions[i].kind === 'check' || m.actions[i].kind === 'call');
  for (const i of on) {
    const a = m.actions[i];
    const aggressive = a.kind !== 'check' && a.kind !== 'call' && a.kind !== 'fold';
    if (aggressive && a.folds != null) {
      out.push({ kind: 'folds', a: i, value: a.folds });
      if (T.cmp != null && passive != null && a.sigma >= TAKES && a.continues >= 0.05 && a.whenContinued != null) {
        const d = a.whenContinued - m.actions[passive].worth;
        if (d <= -2 * T.cmp) out.push({ kind: 'needs', a: i, passive, by: -d });
        else if (d >= 2 * T.cmp) out.push({ kind: 'builds', a: i, passive, by: d });
      }
    }
    const fold = m.actions.findIndex((x) => x.kind === 'fold');
    if (a.kind === 'call' && a.sigma >= TAKES && a.cards && a.cards.lift.n > 0 && fold >= 0 && m.actions[fold].worth != null && T.lift != null) {
      const f = m.actions[fold].worth;
      out.push({ kind: 'cards', a: i, fold, n: a.cards.lift.n, others: a.cards.rest.n, lift: a.cards.lift.part - f * a.cards.lift.weight, rest: a.cards.rest.part - f * a.cards.rest.weight });
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
    case 'costs': return A[claim.best].worth - A[claim.a].worth >= claim.atLeast;
    case 'same': return Math.abs(A[claim.a].worth - A[claim.b].worth) <= claim.within;
    case 'needs': { const d = A[claim.a].whenContinued - A[claim.passive].worth; return d < 0 && Math.abs(-d - claim.by) <= T.cmp; }
    case 'builds': { const d = A[claim.a].whenContinued - A[claim.passive].worth; return d > 0 && Math.abs(d - claim.by) <= T.cmp; }
    case 'cards': { const c = A[claim.a].cards; if (!c) return false; const f = A[claim.fold].worth; return Math.abs(c.lift.part - f * c.lift.weight - claim.lift) <= T.lift && Math.abs(c.rest.part - f * c.rest.weight - claim.rest) <= T.rest; }
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
  const made = claims(s, m, T);
  const reasons = [];
  if (!T) {
    return { name: m.name, strategy, line: `You have ${what}.`, reasons, claims: [], silent: 'Reasons are only given where they have been proven to hold: on lines that at least half of both ranges take, in a solve fine enough. This decision is not one of them yet.' };
  }
  const label = (i) => m.actions[i].label;
  const facing = s.toCall > 0;
  const street = s.f.board.length === 3 ? 'the turn and river still to come' : 'the river still to come';
  const line = `You have ${what}. With ${street} it has about ${pts(m.equity)} equity against the hands he can hold here.`;
  const taken = m.actions.map((a, i) => i).filter((i) => m.actions[i].sigma >= TAKES).sort((x, y) => m.actions[y].sigma - m.actions[x].sigma);
  const passiveName = facing ? 'calling' : 'checking';
  // the bets and raises it makes: who pays for them
  for (const i of taken) {
    const folds = made.find((c) => c.kind === 'folds' && c.a === i); if (!folds) continue;
    const needs = made.find((c) => c.kind === 'needs' && c.a === i); const builds = made.find((c) => c.kind === 'builds' && c.a === i);
    let text = `${label(i)}: he folds about ${pts(folds.value)} of the time against this hand.`;
    // what is compared: the hand's expectation over the times he continues, with its expectation by the passive action over everything he holds
    if (needs) text += ` The times he does not fold are worth less to you than ${passiveName} is overall, by about ${pot(needs.by)} of the pot, so the bet earns its keep through the times he folds.`;
    else if (builds) text += ` Even the times he does not fold are worth more to you than ${passiveName} is overall, by about ${pot(builds.by)} of the pot: the bet does not depend on his folding.`;
    reasons.push({ id: needs ? 'needs' : builds ? 'builds' : 'folds', text });
  }
  // a call: which cards it is for
  for (const c of made.filter((x) => x.kind === 'cards')) {
    const sure = (v, t) => Math.abs(v) >= 2 * t;
    if (!sure(c.lift, T.lift) && !sure(c.rest, T.rest)) continue;
    const up = sure(c.lift, T.lift) ? `on the ${c.n} cards that improve the hand it ${c.lift > 0 ? 'gains' : 'loses'} about ${pot(c.lift)} of the pot` : '';
    const down = sure(c.rest, T.rest) ? `on the other ${c.others} it ${c.rest > 0 ? 'gains' : 'loses'} about ${pot(c.rest)}` : '';
    const moral = sure(c.lift, T.lift) && sure(c.rest, T.rest) ? (c.lift > 0 && c.rest < 0 ? ' The call is for those cards.' : c.lift > 0 && c.rest > 0 ? ' The call pays whether or not it improves.' : '') : '';
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
  for (const c of made.filter((x) => x.kind === 'costs')) { const least = floorHalf(c.atLeast); if (least >= 0.5) reasons.push({ id: 'costs', text: `${label(c.a)} would give up at least ${least % 1 ? least.toFixed(1) : least}% of the pot against the way he plays here.` }); }
  return { name: m.name, strategy, line, reasons, claims: made, silent: null };
}
