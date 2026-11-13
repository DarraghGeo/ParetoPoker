// Mixing diagnosis for facing a first bet: every hand of every such decision on the first street
// of each tree, with its kind and how often the solver calls and raises it.
//   node diagnosis/facing-hands.mjs <set> <out.json>
import { writeFileSync } from 'node:fs';
import { Equity, SolverBridge, cards, classifyHands, handFeatures } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const [set, out] = process.argv.slice(2);
const POSITIONS = ['oop', 'ip'];
async function collect(spot) {
  const equity = new Equity(); const bridge = new SolverBridge(); const rows = [];
  try {
    const info = await bridge.init(gameOf(spot));
    await bridge.solve({ iterations: 2000, target: 0.001 });
    const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
    const start = info.weights.map((w) => w.reduce((t, x) => t + x, 0));
    const spread = (player, values) => { const o = new Float64Array(cards.NUM_COMBOS); values.forEach((v, i) => { o[ids[player][i]] = v; }); return o; };
    const board = cards.parseCards(spot.board);
    for (const prefix of [[], [0]]) {
      const open = await bridge.node(prefix);
      for (const [a, action] of open.actions.entries()) {
        if (action.to == null) continue;
        const history = [...prefix, a];
        const node = await bridge.node(history);
        if (node.terminal || node.chance) continue;
        const { strategy, weights } = await bridge.strategy(history);
        const me = node.player; const n = ids[me].length;
        const reach = weights[1 - me].reduce((t, x) => t + x, 0) / start[1 - me];
        if (reach < 0.03) continue; // a size the solver hardly uses
        const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
        const f = handFeatures({ equity, board, hero, villain, pot: spot.pot + 2 * action.to, behind: spot.stack - action.to });
        const classes = classifyHands(board, hero);
        const total = weights[me].reduce((t, x) => t + x, 0);
        const fold = node.actions.findIndex((x) => x.type === 'fold'); const call = node.actions.findIndex((x) => x.type === 'call');
        const hands = []; let calls = 0, raises = 0;
        ids[me].forEach((id, h) => {
          const w = weights[me][h]; if (!(w > 1e-4)) return;
          const c = strategy[call * n + h]; const r = 1 - c - strategy[fold * n + h];
          calls += (w * c) / total; raises += (w * r) / total;
          hands.push({ hand: cards.comboName(id), weight: w, call: c, raise: Math.max(0, r), equity: f.equity[id], strengthNow: f.strengthNow?.[id] ?? f.equity[id], drawEquity: f.drawEquity?.[id] ?? 0, ehs2: f.ehs2?.[id] ?? f.equity[id] ** 2, draw: classes.draw[id], pair: classes.pair[id] });
        });
        const order = [...hands].sort((x, y) => x.strengthNow - y.strengthNow); let seen = 0;
        for (const hnd of order) { hnd.rank = (seen + hnd.weight / 2) / total; seen += hnd.weight; }
        const order2 = [...hands].sort((x, y) => x.equity - y.equity); seen = 0;
        for (const hnd of order2) { hnd.equityRank = (seen + hnd.weight / 2) / total; seen += hnd.weight; }
        rows.push({ spot: spot.name, pair: spot.pair, depth: spot.depth, board: spot.board, position: POSITIONS[me], bet: action.to / spot.pot, reach, calls, raises, mdf: 1 - action.to / (spot.pot + action.to), behind: (spot.stack - action.to) / (spot.pot + 2 * action.to), hands });
      }
    }
  } finally { bridge.close(); }
  return rows;
}
const rows = (await pool(SPOTS[set], collect)).flat();
writeFileSync(out, `${JSON.stringify(rows)}\n`);
console.log(`${rows.length} decisions, ${rows.reduce((t, r) => t + r.hands.length, 0)} hands -> ${out}`);
