// Do value hands pick their bet size by what they can still draw to? For every hand at the first decision of each
// player, on spots with two or more bet sizes: what it is, its equity now and its draw equity, and how it spreads
// its bets over the sizes.   node valuesize.mjs <flop|turn> <spots>   -> out/valuesize-<street>.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import { fs, solveSpot } from './lib.mjs';
import { freshSpots, WIDE_OOP, WIDE_IP, config } from './spots.mjs';
import { tagsOf } from '../../src/explain/features.js';
import { study } from '../../src/explain/street.js';
const [street = 'turn', count = '60'] = process.argv.slice(2);
const BTN = '22+,A2s+,A7o+,K6s+,KTo+,Q8s+,QTo+,J8s+,JTo,T8s+,97s+,87s,76s,65s'; const BB = '99-22,AJs-A2s,AJo-A8o,K2s+,K9o+,Q6s+,QTo+,J7s+,JTo,T7s+,96s+,85s+,75s+,64s+,54s'; const CO = '22+,A2s+,A9o+,K8s+,KTo+,Q9s+,QJo,J9s+,T8s+,97s+,86s+,76s,65s,54s';
function flops(n, seed) {
  let a = seed >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
  const OOP = [WIDE_OOP, BB, '88+,ATs+,AJo+,KJs+,KQo,QJs,JTs,T9s,98s,A5s-A2s', 'JJ-22,AQs-A2s,AQo-A9o,KTs+,KJo+,Q9s+,J9s+,T8s+,97s+,86s+,76s,65s']; const IP = [WIDE_IP, BTN, CO, 'TT-33,AQs-A6s,KQs-KTs,QJs,QTs,JTs,T9s,98s,87s,AQo,AJo,KQo'];
  const FIRST = [[0.33, 0.75, 1.5], [0.33, 1], [0.5, 1.25], [0.33, 0.75]]; const cards = 'AKQJT98765432', suits = 'shdc'; const out = []; let guard = 0;
  while (out.length < n && guard++ < 400) {
    const board = []; while (board.length < 3) { const c = cards[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
    const s = { name: `size flop ${seed}-${String(out.length + 1).padStart(2, '0')}`, board: board.join(''), oop: OOP[rand(OOP.length)], ip: IP[rand(IP.length)], stack: [200, 300][rand(2)], betSizes: [FIRST[rand(FIRST.length)], [0.66], [0.66]], raiseSizes: [{ times: 3 }], maxRaises: 2 };
    try { if (fs.defineSpot(config(s)).estimate.bytes < +(process.env.MAXMB ?? 900) * 2 ** 20) out.push(s); } catch { /* too big */ }
  }
  return out;
}
const SEED = +(process.env.SEED ?? 7301);
const spots = street === 'flop' ? flops(+count, SEED) : freshSpots(+count * 2, 4, 7304).filter((s) => s.betSizes[0].length >= 2).slice(0, +count);
const target = street === 'flop' ? 0.3 : 0.02; let lines = []; let total = 0;
const file = new URL(`./out/valuesize-${street}${process.env.SEED ? `-${SEED}` : ''}.jsonl`, import.meta.url); writeFileSync(file, '');
/** On a flop: how many pairs of ranks (turn and river) would make the hand a straight it does not share with the board. Three in a row in the middle of the deck has three; a gapped three has two or one. */
function runnerStraights(board, a, b) {
  const all = new Set([...board, a, b].map((c) => fs.rankOf(c))); const onBoard = new Set(board.map((c) => fs.rankOf(c))); let ways = 0;
  for (let lo = -1; lo <= 8; lo++) { let have = 0, shared = 0; for (let k = 0; k < 5; k++) { const r = lo + k === -1 ? 12 : lo + k; if (all.has(r)) have++; if (onBoard.has(r)) shared++; } if (have === 3 && shared < 3) ways++; }
  return ways;
}
for (const s of spots) {
  let g; const t0 = Date.now(); try { g = solveSpot(s, target, { cap: 40000, workers: +(process.env.WORKERS ?? 3), quiet: true }); } catch (e) { console.error('skip', s.name, String(e.message).slice(0, 60)); continue; }
  for (const id of [0, g.nodes[0].edges[0].child]) {
    const st = study(fs, g.solution, g.nodes, id, []); if (!st || Math.min(...st.lineReach) < 0.5) continue;
    const bets = st.actions.map((a, i) => (a.kind === 'bet' || a.kind === 'allin' ? i : -1)).filter((i) => i >= 0); if (bets.length < 2) continue;
    // each size as a share of the pot
    const sizes = bets.map((i) => (g.nodes[st.f.node.edges[i].child].invested[st.f.me] - st.f.node.invested[st.f.me]) / st.pot);
    const eq = st.equity(); const parts = st.drawParts();
    for (let c = 0; c < fs.COMBOS; c++) {
      if (!(st.f.mine[c] > 0) || Number.isNaN(eq[c])) continue;
      const f = st.featuresOf(c); const p = bets.map((i) => st.sigma(c, i)); const bet = p.reduce((t, x) => t + x, 0);
      lines.push(JSON.stringify({ spot: s.name, board: s.board, hand: fs.formatCombo(c), seat: st.f.me, w: +st.f.mine[c].toFixed(4), e: +eq[c].toFixed(4), now: +parts.now[c].toFixed(4), draw: +parts.draw[c].toFixed(4), tags: tagsOf(fs, st.f.board, c, f), ways: st.f.board.length === 3 && f.straightOuts < 4 && f.made < 4 ? runnerStraights(st.f.board, fs.COMBO_CARDS[2 * c], fs.COMBO_CARDS[2 * c + 1]) : 0, bet: +bet.toFixed(4), size: bet > 0.02 ? +(p.reduce((t, x, k) => t + x * sizes[k], 0) / bet).toFixed(4) : null, big: bet > 0.02 ? +(p[p.length - 1] / bet).toFixed(4) : null, small: bet > 0.02 ? +(p[0] / bet).toFixed(4) : null, top: +Math.max(...sizes).toFixed(2), low: +Math.min(...sizes).toFixed(2) }));
    }
  }
  // saved spot by spot, so that a run cut short keeps what it has
  if (lines.length) appendFileSync(file, lines.join('\n') + '\n'); total += lines.length; lines = [];
  console.error(`  ${s.name} ${s.board} done (${g.exploit.toFixed(3)}%, ${Math.round((Date.now() - t0) / 1000)}s)`);
}
console.log(`${street}: ${total} hands on ${spots.length} spots`);
