// Do named hand types behave as buckets? For every hand at the first decision of each player (first to act,
// and after a check), on many solved spots: what it is called, its equity, how often it bets.
//   node buckets.mjs <street: turn|river|flop> <spots>      -> out/buckets-<street>.jsonl (one line a hand)
import { writeFileSync } from 'node:fs';
import { fs, solveSpot } from './lib.mjs';
import { freshSpots, freshFlops, config } from './spots.mjs';
import { typeOf } from '../../src/explain/features.js';
import { study, measure } from '../../src/explain/street.js';
const [street = 'turn', count = '60'] = process.argv.slice(2);
const cards = { flop: 3, turn: 4, river: 5 }[street];
const spots = street === 'flop' ? freshFlops(+count, 9101, (x) => { try { return fs.defineSpot(config(x)).estimate.bytes < 200 * 2 ** 20; } catch { return false; } }) : freshSpots(+count, cards, 9100 + cards);
const target = { flop: 0.25, turn: 0.02, river: 0.01 }[street];
const nameOf = (f, board, a, b) => { for (let c = 0; c < fs.COMBOS; c++) if (fs.COMBO_CARDS[2 * c] === a && fs.COMBO_CARDS[2 * c + 1] === b) return typeOf(fs, board, c, f); return '?'; };
const lines = [];
for (const s of spots) {
  let g; try { g = solveSpot(s, target, { cap: 40000, workers: +(process.env.WORKERS ?? 2), quiet: true }); } catch { continue; }
  for (const id of [0, g.nodes[0].edges[0].child]) {
    const st = study(fs, g.solution, g.nodes, id, []); if (!st || Math.min(...st.lineReach) < 0.5) continue;
    const bets = st.actions.map((a, i) => (!['check', 'call', 'fold'].includes(a.kind) && a.on ? i : -1)).filter((i) => i >= 0); if (!bets.length) continue;
    const main = bets.reduce((b, i) => (st.actions[i].freq > st.actions[b].freq ? i : b), bets[0]);
    const eq = st.equity(); const board = st.f.board;
    for (let c = 0; c < fs.COMBOS; c++) {
      if (!(st.f.mine[c] > 0) || Number.isNaN(eq[c])) continue;
      const a = fs.COMBO_CARDS[2 * c], b = fs.COMBO_CARDS[2 * c + 1]; const f = st.featuresOf(c);
      let bet = 0; st.actions.forEach((x, i) => { if (!['check', 'call', 'fold'].includes(x.kind)) bet += st.sigma(c, i); });
      // on turn and river: how often he folds to the range's main bet against this very hand (what its cards remove)
      const folds = street === 'flop' ? null : measure(st, c).actions[main].folds;
      lines.push(JSON.stringify({ spot: s.name, seat: st.f.me, w: +st.f.mine[c].toFixed(4), eq: +eq[c].toFixed(4), name: nameOf(f, board, a, b), bet: +bet.toFixed(4), folds: folds == null ? null : +folds.toFixed(4), fo: f.flushOuts, so: f.straightOuts }));
    }
  }
  console.error(`  ${s.name} done (${g.exploit.toFixed(3)}%)`);
}
writeFileSync(new URL(`./out/buckets-${street}.jsonl`, import.meta.url), lines.join('\n') + '\n');
console.log(`${street}: ${lines.length} hands on ${spots.length} spots`);
