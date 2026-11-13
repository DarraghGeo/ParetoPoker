// Mixing diagnosis for opening decisions with cards to come: every hand of every first-to-act
// decision (out of position, and in position after a check) with what kind of hand it is and
// how often the solver bets it.   node diagnosis/open-hands.mjs <set> <out.json>
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
    const spread = (player, values) => { const o = new Float64Array(cards.NUM_COMBOS); values.forEach((v, i) => { o[ids[player][i]] = v; }); return o; };
    const board = cards.parseCards(spot.board);
    for (const history of [[], [0]]) {
      const node = await bridge.node(history);
      const { strategy, weights } = await bridge.strategy(history);
      const me = node.player; const n = ids[me].length;
      const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
      const f = handFeatures({ equity, board, hero, villain, pot: spot.pot, behind: spot.stack });
      const classes = classifyHands(board, hero);
      const total = weights[me].reduce((t, x) => t + x, 0);
      let level = 0;
      const hands = [];
      ids[me].forEach((id, h) => {
        const w = weights[me][h]; if (!(w > 1e-4)) return;
        let bet = 0; const sizes = [];
        node.actions.forEach((a, k) => { if (a.to != null) { bet += strategy[k * n + h]; sizes.push(strategy[k * n + h]); } });
        level += (w * bet) / total;
        hands.push({ hand: cards.comboName(id), weight: w, bet, sizes, equity: f.equity[id], strengthNow: f.strengthNow?.[id] ?? f.equity[id], drawEquity: f.drawEquity?.[id] ?? 0, swing: f.swing?.[id] ?? 0, ehs2: f.ehs2?.[id] ?? f.equity[id] ** 2, draw: classes.draw[id], pair: classes.pair[id] });
      });
      // rank of each hand within the range by strength now (0 weakest, 1 strongest)
      const order = [...hands].sort((a, b) => a.strengthNow - b.strengthNow); let seen = 0;
      for (const hnd of order) { hnd.rank = (seen + hnd.weight / 2) / total; seen += hnd.weight; }
      rows.push({ spot: spot.name, pair: spot.pair, depth: spot.depth, board: spot.board, position: POSITIONS[me], level, pots: node.actions.filter((a) => a.to != null).map((a) => a.to / spot.pot), hands });
    }
  } finally { bridge.close(); }
  return rows;
}
const rows = (await pool(SPOTS[set], collect)).flat();
writeFileSync(out, `${JSON.stringify(rows)}\n`);
console.log(`${rows.length} decisions, ${rows.reduce((t, r) => t + r.hands.length, 0)} hands -> ${out}`);
