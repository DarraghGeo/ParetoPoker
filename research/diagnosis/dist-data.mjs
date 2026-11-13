// Turn opens on the tuning spots: every hand with how often the solver bets it, its equity and
// how that equity is spread over the river cards.   node diagnosis/dist-data.mjs <out.jsonl> <set> [set...]
import { appendFileSync, writeFileSync } from 'node:fs';
import { Equity, SolverBridge, cards, nextCardSpread } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const [out, ...sets] = process.argv.slice(2);
const equity = new Equity(); const { NUM_COMBOS } = cards;
writeFileSync(out, '');
for (const set of sets) {
  await pool(SPOTS[set], async (spot) => {
    const bridge = new SolverBridge();
    try {
      const info = await bridge.init(gameOf(spot));
      await bridge.solve({ iterations: 2000, target: 0.001 });
      const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
      const spread = (p, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[p][i]] = v; }); return o; };
      const board = cards.parseCards(spot.board);
      for (const history of [[], [0]]) {
        const node = await bridge.node(history); const me = node.player; const { strategy, weights } = await bridge.strategy(history); const n = ids[me].length;
        const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
        const strength = equity.against(board, villain, hero);
        const s = nextCardSpread({ equity, board, hero, villain });
        const hands = [];
        ids[me].forEach((id, h) => {
          const w = weights[me][h]; if (!(w > 1e-4)) return;
          let bet = 0; node.actions.forEach((a, k) => { if (a.to != null) bet += strategy[k * n + h]; });
          hands.push([id, +w.toFixed(4), +bet.toFixed(4), +strength[id].toFixed(4), +s.sd[id].toFixed(4), +s.best[id].toFixed(4), +s.high[id].toFixed(4)]);
        });
        appendFileSync(out, `${JSON.stringify({ set, spot: spot.name, position: me === 0 ? 'oop' : 'ip', hands })}\n`);
      }
    } finally { bridge.close(); }
  });
}
