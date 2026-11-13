// PROOF 1. The accounting is right.
//   (a) each action's value agrees with an evaluator that shares nothing with the solver's value walk;
//   (b) the split by his reply, by his holding and by the next card each add back to the action's value;
//   (c) folding is worth exactly minus what has been put in.
// Every check is reported as the largest error found, in % of the pot the spot started with.
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS } from './spots.mjs';
import { frameAt, actionValues, byReply, byHolding, byCard } from '../../src/explain/account.js';
import { independent } from './independent.mjs';

const only = process.argv[2];
const spots = [...TURNS.map((s) => ({ ...s, target: 0.3 })), ...FLOPS.map((s) => ({ ...s, target: 1.5 }))].filter((s) => !only || s.name.includes(only));
const report = [];
for (const s of spots) {
  const g = solveSpot(s, s.target);
  const play = independent(g);
  const worst = { reply: 0, holding: 0, card: 0, fold: 0, independent: 0, share: 0 };
  const count = { decisions: 0, hands: 0, reply: 0, holding: 0, card: 0, fold: 0, independent: 0 };
  const first = g.spot.board.length; const budget = [first === 3 ? 2 : 6, 6, 8]; // independent checks per round: they are slow on early streets
  const perRound = [0, 0, 0];
  const startMass = [g.solution.reachAt(0, 0, 0).reduce((t, x) => t + x, 0), g.solution.reachAt(0, 0, 1).reduce((t, x) => t + x, 0)];
  for (const { id, dealt } of decisions(g, { perRound: first === 3 ? [99, 2, 1] : [99, 3, 1] })) {
    const f = frameAt(fs, g.solution, g.nodes, id, dealt); if (!f) continue;
    const mineAll = f.mine.reduce((t, x) => t + x, 0); const hisAll = f.his.reduce((t, x) => t + x, 0);
    if (mineAll < 0.02 * startMass[f.me] || hisAll < 0.02 * startMass[1 - f.me]) continue; // lines the solution all but never takes
    count.decisions++;
    const pot0 = g.nodes[0].pot; const err = (x) => (100 * Math.abs(x)) / pot0;
    const values = actionValues(f); const hands = []; for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 1e-6 && f.mass[c] > 0) hands.push(c);
    count.hands += hands.length;
    f.node.edges.forEach((edge, a) => {
      if (edge.kind === 'fold') for (const h of hands) { worst.fold = Math.max(worst.fold, err(values[a][h] + pot0 / 2 + f.node.invested[f.me])); count.fold++; }
      const replies = byReply(f, a);
      if (replies) for (const h of hands) { let sum = 0, share = 0; for (const r of replies) { sum += r.value[h]; share += r.share[h]; } worst.reply = Math.max(worst.reply, err(sum - values[a][h])); worst.share = Math.max(worst.share, Math.abs(share - 1)); count.reply++; }
      const groups = byHolding(f, a, (c) => `g${c % 5}`);
      for (const h of hands) { let sum = 0; for (const part of groups.values()) sum += part.value[h]; worst.holding = Math.max(worst.holding, err(sum - values[a][h])); count.holding++; }
      const cards = byCard(f, a);
      if (cards) for (const h of hands) { let sum = 0; for (const c of cards) if (!Number.isNaN(c.value[h])) sum += c.value[h]; worst.card = Math.max(worst.card, err(sum - values[a][h])); count.card++; }
    });
    // played out by hand, for a few hands spread across the range
    if (perRound[f.round] < budget[f.round]) {
      perRound[f.round]++;
      const pick = [0, 0.25, 0.5, 0.75, 0.999].slice(0, f.board.length === 3 ? 2 : 5).map((q) => hands[Math.floor(q * hands.length)]);
      for (const h of new Set(pick)) f.node.edges.forEach((_, a) => { worst.independent = Math.max(worst.independent, err(play(id, dealt, a, h) - values[a][h])); count.independent++; });
    }
  }
  report.push({ spot: s.name, exploit: +g.exploit.toFixed(2), ...count, worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, v.toExponential(1)])) });
  console.log(JSON.stringify(report[report.length - 1]));
}
