// PROOF 3. How far can a number move? Each spot is solved at the accuracies the page might use
// (0.3%, 0.1%, 0.05% of the pot) and twice far more finely by two different algorithms (discounted CFR and CFR+).
// For every hand at every decision the quantities an explanation would quote are compared. What moves
// between the page's solve and BOTH references is noise; what moves between the two references is
// the equilibrium itself not being unique. Records go to out/stability-<spot>.jsonl for analysis.
import { writeFileSync } from 'node:fs';
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS } from './spots.mjs';
import { frameAt, actionValues, byReply, byHolding } from '../../src/explain/account.js';
import { features, groupOf } from '../../src/explain/features.js';
import { equityVs } from '../../src/solver/flopsolve.js';
import { evaluator } from '../../src/explain/best.js';

const [only, levelText = '0.3,0.05,0.02', fineTarget = '0.01'] = process.argv.slice(2);
export const LEVELS = levelText.split(',').map(Number);
const spots = [...TURNS, ...FLOPS].filter((s) => !only || s.name.includes(only));
const other = (s, algorithm, target) => { const spot = fs.defineSpot({ pot: 100, stack: 200, ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'name')) }); const run = fs.createRun(spot, { workers: 3, algorithm }); let e = Infinity; const t = Date.now(); while (e > target && run.completed < 40000) { run.step(spot.board.length === 3 ? 5 : 20); e = run.exploitabilityPercent(); } console.error(`  ${algorithm} ${s.name}: ${run.completed} its ${e.toFixed(4)}% ${((Date.now() - t) / 1000).toFixed(0)}s`); return { spot, run, solution: run.snapshot(), exploit: e }; };
for (const s of spots) {
  // the page's candidates (the default algorithm at each accuracy), then two references by different algorithms
  const solves = LEVELS.map((level) => solveSpot(s, level, { cap: 40000 }));
  for (const algorithm of ['dcfr', 'cfr+']) solves.push({ ...other(s, algorithm, +fineTarget), nodes: solves[0].nodes });
  const R = LEVELS.length; // index of the first reference
  const pot0 = solves[0].nodes[0].pot; const lines = [];
  const start = [0, 1].map((p) => solves[R].solution.reachAt(0, 0, p));
  const featureCache = new Map();
  for (const { id, dealt } of decisions(solves[0], { perRound: s.board.length === 3 ? [99, 2, 1] : [99, 3, 1] })) {
    const frames = solves.map((g) => frameAt(fs, g.solution, g.nodes, id, dealt)); if (frames.some((f) => !f)) continue;
    const ref = frames[R]; const node = ref.node;
    const total = (v) => v.reduce((t, x) => t + x, 0);
    const startMass = [total(start[0]), total(start[1])];
    // how much of each range takes this line, in every solve: [mine, his]
    const lineReach = frames.map((f) => [+(total(f.mine) / startMass[ref.me]).toFixed(4), +(total(f.his) / startMass[1 - ref.me]).toFixed(4)]);
    if (Math.min(...lineReach[R]) < 0.005) continue;
    const key = ref.board.join(','); let feats = featureCache.get(key); if (!feats) { feats = new Map(); featureCache.set(key, feats); }
    const group = (c) => { let g = feats.get(c); if (!g) { g = groupOf(features(fs, ref.board, c)); feats.set(c, g); } return g; };
    const improves = new Map(); // does a card lift this hand's made category
    const lifts = (c, x) => { const k = c * 64 + x; let v = improves.get(k); if (v === undefined) { const a0 = fs.COMBO_CARDS[2 * c], b0 = fs.COMBO_CARDS[2 * c + 1]; v = fs.categoryOf(fs.evaluateCards([...ref.board, x, a0, b0])) > fs.categoryOf(fs.evaluateCards([...ref.board, a0, b0])); improves.set(k, v); } return v; };
    const per = frames.map((f, i) => {
      const g = solves[i]; const view = g.solution.strategyAt(id, f.at); const n = view.actions.length; const row = new Map(); view.combos.forEach((c, k) => row.set(c, k));
      const best = evaluator(fs, g.solution, g.nodes);
      const close = node.edges.map((_, a) => best.closely(f, a, group));
      const equity = equityVs(fs, f.board, f.mine, f.his);
      return { f, close, strat: (c, a) => { const k = row.get(f.stored[c]); return k === undefined ? 0 : view.probs[k * n + a]; }, equity };
    });
    for (let c = 0; c < fs.COMBOS; c++) {
      if (!(start[ref.me][c] > 0) || !(ref.mass[c] > 0) || per.some((p) => !(p.f.mine[c] > 0))) continue;
      const rec = { id, dealt, round: node.round, seat: ref.me, hand: fs.formatCombo(c), reach: per.map((p) => +(p.f.mine[c] / start[ref.me][c]).toFixed(5)), lineReach,
        actions: node.edges.map((e) => e.label), kinds: node.edges.map((e) => e.kind),
        sigma: per.map((p) => node.edges.map((_, a) => +p.strat(c, a).toFixed(4))),
        equity: per.map((p) => +p.equity[c].toFixed(4)),
        best: per.map((p) => p.close.map((x) => +((100 * x.value[c]) / pot0).toFixed(4))),
        reply: per.map((p) => p.close.map((x) => (x.replies ? x.replies.map((r) => [+r.share[c].toFixed(4), +((100 * r.value[c]) / pot0).toFixed(4)]) : null))),
        holding: per.map((p) => p.close.map((x) => Object.fromEntries([...x.holdings.entries()].map(([g, r]) => [g, [+r.share[c].toFixed(4), +((100 * r.value[c]) / pot0).toFixed(4)]])))),
        // the next card, for actions that end the street: [cards that lift the hand, their part of the value, the other cards, their part]
        card: per.map((p) => p.close.map((x) => { if (!x.cards) return null; const o = [0, 0, 0, 0]; for (const k of x.cards) { if (Number.isNaN(k.value[c])) continue; const up = lifts(c, k.card) ? 0 : 2; o[up]++; o[up + 1] += (100 * k.value[c]) / pot0; } return o.map((v) => +v.toFixed(4)); })) };
      lines.push(JSON.stringify(rec));
    }
  }
  const file = new URL(`./out/stability-${s.name.replace(/\W+/g, '-')}.jsonl`, import.meta.url);
  writeFileSync(file, lines.join('\n') + '\n');
  console.log(JSON.stringify({ spot: s.name, levels: LEVELS, exploit: solves.map((g) => +g.exploit.toFixed(4)), records: lines.length }));
}
