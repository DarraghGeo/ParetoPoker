// PROOF 5. The three splits under the best reply add back to the action's worth, for every hand.
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS } from './spots.mjs';
import { frameAt } from '../../src/explain/account.js';
import { evaluator } from '../../src/explain/best.js';
const only = process.argv[2];
const spots = [...TURNS.map((s) => ({ ...s, target: 0.3 })), ...FLOPS.map((s) => ({ ...s, target: 1.5 }))].filter((s) => !only || s.name.includes(only));
for (const s of spots) {
  const g = solveSpot(s, s.target); const best = evaluator(fs, g.solution, g.nodes); const pot0 = g.nodes[0].pot;
  const worst = { value: 0, reply: 0, share: 0, holding: 0, card: 0, then: 0 }; const count = { decisions: 0, checks: 0 }; const first = g.spot.board.length;
  const budget = first === 3 ? [1, 3, 6] : [8, 12, 0]; const seen = [0, 0, 0]; const t0 = Date.now();
  const start = [0, 1].map((p) => g.solution.reachAt(0, 0, p).reduce((t, x) => t + x, 0));
  for (const { id, dealt } of decisions(g, { perRound: [99, 2, 1] })) {
    const f = frameAt(fs, g.solution, g.nodes, id, dealt); if (!f) continue;
    if (f.mine.reduce((t, x) => t + x, 0) < 0.02 * start[f.me] || f.his.reduce((t, x) => t + x, 0) < 0.02 * start[1 - f.me]) continue;
    if (seen[f.round] >= budget[f.round]) continue; seen[f.round]++; count.decisions++;
    const whole = best(f, 'best'); const err = (x) => (100 * Math.abs(x)) / pot0;
    f.node.edges.forEach((_, a) => {
      const c = best.closely(f, a, (v) => `g${v % 4}`);
      for (let h = 0; h < fs.COMBOS; h++) {
        if (Number.isNaN(whole[a][h])) continue; count.checks++;
        worst.value = Math.max(worst.value, err(c.value[h] - whole[a][h]));
        if (c.replies) { let sum = 0, share = 0; for (const r of c.replies) { sum += r.value[h]; share += r.share[h]; } worst.reply = Math.max(worst.reply, err(sum - whole[a][h])); worst.share = Math.max(worst.share, Math.abs(share - 1)); }
        { let sum = 0; for (const part of c.holdings.values()) sum += part.value[h]; worst.holding = Math.max(worst.holding, err(sum - whole[a][h])); }
        if (c.cards) { let sum = 0, mean = 0, n = 0; for (const x of c.cards) if (!Number.isNaN(x.value[h])) { sum += x.value[h]; } worst.card = Math.max(worst.card, err(sum - whole[a][h])); }
      }
    });
  }
  console.log(JSON.stringify({ spot: s.name, ...count, seconds: Math.round((Date.now() - t0) / 1000), worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, v.toExponential(1)])) }));
}
