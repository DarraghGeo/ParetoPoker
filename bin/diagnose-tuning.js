#!/usr/bin/env node
// Tuning diagnosis: how do the solver's frequencies depart from the fundamentals, and does the
// departure follow the spot? At every decision of the first street of each tree it records how
// the spot is defined (context.profile) and, next to the fundamental:
//   facing a bet or raise   how often the solver continues, against the minimum defence frequency
//   first to act            how often it bets, which sizes, and the bluffs per value bet against
//                           the balanced ratio for the size
// then reports averages, what the departures move with, and a least-squares fit.
//   node bin/diagnose-tuning.js [--set rivers-tune] [--out file.json]
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Equity, ParetoEngine, SelectionContext, SolverBridge, cards } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';

const { values: args } = parseArgs({ options: { set: { type: 'string', default: 'rivers-tune' }, out: { type: 'string' }, 'min-reach': { type: 'string', default: '0.03' } } });
const POSITIONS = ['oop', 'ip'];
const STREETS = { 3: 'flop', 4: 'turn', 5: 'river' };
const engine = new ParetoEngine();
const minReach = Number(args['min-reach']);

/** One row per decision. */
export async function collect(spot) {
  const equity = new Equity();
  const bridge = new SolverBridge();
  const rows = [];
  try {
    const info = await bridge.init(gameOf(spot));
    await bridge.solve({ iterations: 2000, target: 0.001 });
    const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
    const start = info.weights.map((w) => w.reduce((t, x) => t + x, 0));
    const spread = (player, values) => {
      const out = new Float64Array(cards.NUM_COMBOS);
      values.forEach((v, i) => { out[ids[player][i]] = v; });
      return out;
    };
    const board = cards.parseCards(spot.board);
    const read = async (history) => {
      const node = await bridge.node(history);
      if (node.terminal || node.chance) return { node };
      const { strategy, weights } = await bridge.strategy(history);
      const n = ids[node.player].length;
      return { node, weights, ranges: [spread(0, weights[0]), spread(1, weights[1])], strategy: node.actions.map((_, a) => spread(node.player, strategy.slice(a * n, (a + 1) * n))) };
    };
    const share = (range, probabilities) => {
      let hit = 0, all = 0;
      for (let i = 0; i < cards.NUM_COMBOS; i++) { all += range[i]; hit += range[i] * probabilities[i]; }
      return all > 0 ? hit / all : 0;
    };

    const walk = async (history, last, raises, path) => {
      const at = await read(history);
      const { node } = at;
      if (node.terminal || node.chance) return;
      const me = node.player;
      const them = 1 - me;
      const hero = at.ranges[me];
      const villain = at.ranges[them];
      const reach = [at.weights[0].reduce((t, x) => t + x, 0) / start[0], at.weights[1].reduce((t, x) => t + x, 0) / start[1]];
      const toCall = node.bets[them] - node.bets[me];
      const pot = spot.pot + node.bets[0] + node.bets[1];
      const s = { street: STREETS[board.length], pot, stack: spot.stack - node.bets[me], toCall, invested: node.bets[me], facing: last[them], raises };
      const children = [];
      for (const [a, action] of node.actions.entries()) {
        const nextLast = [...last];
        if (action.to != null) nextLast[me] = action.to - node.bets[me];
        children.push({ a, action, history: [...history, a], last: nextLast, raises: raises + (action.to != null && toCall > 0 ? 1 : 0) });
      }
      if (Math.min(reach[0], reach[1]) >= minReach) {
        const context = new SelectionContext({ equity, position: POSITIONS[me], spot: s, board, hero, villain, actions: node.actions });
        const base = { spot: spot.name, pair: spot.pair, depth: spot.depth, board: spot.board, path, position: POSITIONS[me], reach: reach[me] * reach[them], profile: context.profile };
        const frequencies = at.strategy.map((p) => share(hero, p));
        // The mixing curve: the range cut into 20 slices of equal weight by equity against his
        // range (weakest first), with how often each slice takes each action
        const order = [...hero.keys()].filter((i) => hero[i] > 1e-6 && !Number.isNaN(context.strength[i])).sort((x, y) => context.strength[x] - context.strength[y]);
        const totalWeight = order.reduce((t, i) => t + hero[i], 0);
        base.curve = Array.from({ length: 20 }, () => ({ weight: 0, equity: 0, actions: node.actions.map(() => 0) }));
        let seen = 0;
        for (const i of order) {
          const slice = base.curve[Math.min(19, Math.floor((20 * (seen + hero[i] / 2)) / totalWeight))];
          seen += hero[i];
          slice.weight += hero[i];
          slice.equity += hero[i] * context.strength[i];
          at.strategy.forEach((p, a) => { slice.actions[a] += hero[i] * p[i]; });
        }
        for (const slice of base.curve) {
          if (!(slice.weight > 0)) continue;
          slice.equity /= slice.weight;
          slice.actions = slice.actions.map((x) => x / slice.weight);
        }
        base.actions = node.actions.map((x) => ({ type: x.type, pots: x.to != null ? (x.to - node.bets[me]) / pot : 0 }));
        if (toCall > 0) {
          const fold = node.actions.findIndex((x) => x.type === 'fold');
          const mdf = 1 - last[them] / pot;
          const raise = node.actions.reduce((t, x, a) => t + (x.to != null ? frequencies[a] : 0), 0);
          rows.push({ ...base, kind: raises > 0 ? 'facing a raise' : 'facing a bet', price: last[them] / (pot - last[them]), mdf, continues: 1 - frequencies[fold], defence: (1 - frequencies[fold]) / mdf, raise, raiseOfContinue: raise / Math.max(1e-9, 1 - frequencies[fold]) });
        } else {
          const sizes = [];
          for (const child of children) {
            if (child.action.to == null) continue;
            const frequency = frequencies[child.a];
            const reply = await read(child.history);
            const foldIndex = reply.node.actions.findIndex((x) => x.type === 'fold');
            const continues = villain.map((w, i) => w * (1 - reply.strategy[foldIndex][i]));
            const versus = equity.against(board, continues, hero);
            let value = 0, bluff = 0, total = 0;
            for (let i = 0; i < cards.NUM_COMBOS; i++) {
              if (!(hero[i] > 0)) continue;
              total += hero[i];
              const w = hero[i] * at.strategy[child.a][i];
              if (versus[i] > 0.5) value += w; else bluff += w;
            }
            const wager = engine.wager(POSITIONS[me], s, child.action.to);
            const balanced = wager.bluffShare / (1 - wager.bluffShare);
            sizes.push({ pots: (child.action.to - node.bets[me]) / pot, frequency, value: value / total, bluff: bluff / total, bluffRatio: value > 1e-9 ? bluff / value / balanced : NaN, hisFold: share(villain, reply.strategy[foldIndex]), alpha: wager.alpha });
          }
          const bet = sizes.reduce((t, x) => t + x.frequency, 0);
          const value = sizes.reduce((t, x) => t + x.value, 0);
          const balancedBluff = sizes.reduce((t, x) => t + (Number.isNaN(x.bluffRatio) ? 0 : x.bluff / x.bluffRatio), 0);
          rows.push({
            ...base, kind: 'first to act', bet, value, bluff: bet - value, sizes,
            averageSize: bet > 1e-9 ? sizes.reduce((t, x) => t + x.frequency * x.pots, 0) / bet : NaN,
            smallShare: bet > 1e-9 ? sizes[0].frequency / bet : NaN,
            bluffRatio: balancedBluff > 1e-9 ? (bet - value) / balancedBluff : NaN,
          });
        }
      }
      for (const child of children) await walk(child.history, child.last, child.raises, `${path ? `${path} ` : ''}${child.action.type}${child.action.to ? ` ${child.action.to}` : ''}`);
    };
    await walk([], [0, 0], 0, '');
  } finally {
    bridge.close();
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = (await pool(SPOTS[args.set], collect)).flat();
  if (args.out) writeFileSync(args.out, `${JSON.stringify(rows)}\n`);
  const FEATURES = ['rangeAdvantage', 'nutAdvantage', 'polarizationAdvantage', 'polarization', 'villainPolarization', 'nutShare', 'villainNutShare', 'spr'];
  const mean = (set, f) => set.reduce((t, r) => t + r.reach * f(r), 0) / (set.reduce((t, r) => t + r.reach, 0) || 1);
  const corr = (set, fx, fy) => {
    const ok = set.filter((r) => Number.isFinite(fx(r)) && Number.isFinite(fy(r)));
    const mx = mean(ok, fx), my = mean(ok, fy);
    let sxy = 0, sxx = 0, syy = 0;
    for (const r of ok) { sxy += r.reach * (fx(r) - mx) * (fy(r) - my); sxx += r.reach * (fx(r) - mx) ** 2; syy += r.reach * (fy(r) - my) ** 2; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  const two = (x) => (Number.isFinite(x) ? x.toFixed(2) : '  - ').padStart(6);
  const report = (title, set, targets) => {
    if (!set.length) return;
    console.log(`\n=== ${title}: ${set.length} decisions`);
    console.log(`  ${''.padEnd(22)} ${'mean'.padStart(6)} ${'sd'.padStart(6)}  ${FEATURES.map((f) => f.slice(0, 12).padStart(13)).join('')}`);
    for (const [name, f] of Object.entries(targets)) {
      const ok = set.filter((r) => Number.isFinite(f(r)));
      const m = mean(ok, f);
      const sd = Math.sqrt(mean(ok, (r) => (f(r) - m) ** 2));
      console.log(`  ${name.padEnd(22)} ${two(m)} ${two(sd)}  ${FEATURES.map((k) => two(corr(ok, (r) => r.profile[k], f)).padStart(13)).join('')}`);
    }
  };
  console.log(`${args.set}: ${rows.length} decisions reached by both players at least ${minReach} of the time. Means are weighted by how often the decision is reached; the columns after are correlations with how the spot is defined.`);
  for (const position of POSITIONS) {
    const of = (kind) => rows.filter((r) => r.kind === kind && r.position === position);
    report(`${position}, first to act`, of('first to act'), { 'bets': (r) => r.bet, 'value bets': (r) => r.value, 'average size (pots)': (r) => r.averageSize, 'share on smallest size': (r) => r.smallShare, 'bluffs vs balanced': (r) => r.bluffRatio });
    for (const kind of ['facing a bet', 'facing a raise']) {
      report(`${position}, ${kind}`, of(kind), { 'continues': (r) => r.continues, 'continues vs MDF': (r) => r.defence, 'raises (of continue)': (r) => r.raiseOfContinue });
    }
  }
}
