// For the "line on the strip" idea: every hand's equity on each next card, at flop and turn decisions of solved spots.
//   node nextcard.mjs <spots> <seed> [flop|turn]  -> out/nextcard-<root>.jsonl (one line a decision)
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
import { study } from '../../src/explain/street.js';
const [count = '20', seed = '5', root = 'turn'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (root === 'turn' || ['3BP', '4BP', 'Squeeze'].includes(p.action))); const r3 = (x) => +x.toFixed(3);
const file = new URL(`./out/nextcard-${root}.jsonl`, import.meta.url); writeFileSync(file, ''); const N = fs.COMBOS;
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < (root === 'turn' ? 4 : 3)) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  const bets = root === 'turn' ? [[0.75], [0.75]] : [[0.33, 0.75], [0.75], [0.75]];
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: bets, raiseSizes: [{ times: 3 }], maxRaises: 2 }); } catch { continue; } if (spot.estimate.bytes > 500 * 2 ** 20) continue;
  const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.25 && run.completed < 900) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); done++;
  // the first decision, the one after a check, and the one facing the commonest bet
  const ids = [0]; const x = nodes[0].edges.find((e) => e.kind === 'check'); if (x && nodes[x.child].kind === 'decision') ids.push(x.child); const bet = nodes[0].edges.find((e) => e.kind === 'bet'); if (bet && nodes[bet.child].kind === 'decision') ids.push(bet.child);
  for (const id of ids) {
    const st = study(fs, solution, nodes, id, []); if (!st || Math.min(...st.lineReach) < 0.1) continue; const f = st.f; const eq = st.equity(); const cards = st.spread() ?? []; const facing = st.toCall > 0; const hands = [];
    for (let c = 0; c < N; c++) {
      if (!(f.mine[c] > 0.002) || Number.isNaN(eq[c])) continue; const v = cards.map((k) => k.eq[c]).filter((e) => e != null && !Number.isNaN(e)).sort((m, n) => m - n); if (v.length < 10) continue;
      const q = (t) => v[Math.min(v.length - 1, Math.floor(t * v.length))]; const mean = v.reduce((s, e) => s + e, 0) / v.length; const sd = Math.sqrt(v.reduce((s, e) => s + (e - mean) ** 2, 0) / v.length);
      let act = 0; f.node.edges.forEach((e, i) => { if (facing ? e.kind !== 'fold' : !['check', 'call', 'fold'].includes(e.kind)) act += st.sigma(c, i); });
      hands.push([fs.formatCombo(c), r3(f.mine[c]), r3(eq[c]), r3(act), r3(v[v.length - 1]), r3(v[0]), r3(mean), r3(q(0.5)), r3(q(0.75)), r3(q(0.25)), r3(sd), r3(v.filter((e) => e >= 0.7).length / v.length)]);
    }
    appendFileSync(file, JSON.stringify({ spot: `${p.action}-${p.oop}-${p.ip} ${b.join('')}`, root, facing, first: id === 0, exploit: r3(ex), hands }) + '\n');
  }
  console.error(`${done}/${count} ${p.action} ${b.join('')} ${ex.toFixed(2)}`);
}
