// Data for the ladder mock-up: one solved spot walked down a fixed runout. At every decision on the way: the range of
// the player to act as 60 slices (weakest first) with what each does, how much of each player's range is left, where
// each range's 70% mark falls, and where a few of the out-of-position player's hands sit.
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../../src/solver/flopsolve.js';
import { PRESETS } from '../../../web/presets.js';
import { study } from '../../../src/explain/street.js';
const p = PRESETS.find((x) => x.action === '3BP' && x.oop === 'SB' && x.ip === 'BU') ?? PRESETS.find((x) => x.action === '3BP'); const FLOP = 'Ks9d4s'; const RUN = ['Qs', '4h'];
const spot = fs.defineSpot({ board: FLOP, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.33, 0.75], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.3 && run.completed < 1200) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); const N = fs.COMBOS; console.error('solved', ex.toFixed(2));
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }; const pretty = (h) => h.replace(/[shdc]/g, (s) => SUIT[s]); const r3 = (x) => +x.toFixed(3); const cards = RUN.map((c) => fs.parseCards(c)[0]); const B = 60;
const root = study(fs, solution, nodes, 0, []); const start = [Float64Array.from(root.f.mine), Float64Array.from(root.f.his)]; const mass0 = start.map((r) => r.reduce((t, x) => t + x, 0));
const eq0 = root.equity(); const live = []; for (let c = 0; c < N; c++) if (start[0][c] > 0.2 && !Number.isNaN(eq0[c])) live.push(c); live.sort((x, y) => eq0[y] - eq0[x]);
const track = [0.01, 0.12, 0.28, 0.45, 0.62, 0.8, 0.95].map((q) => live[Math.floor(q * (live.length - 1))]); const sp = (c) => fs.suitOf(fs.COMBO_CARDS[2 * c]) === 0 && fs.suitOf(fs.COMBO_CARDS[2 * c + 1]) === 0; const fd = live.filter((c) => sp(c) && eq0[c] < 0.6); if (fd.length) track.push(fd[Math.floor(fd.length / 2)]);
const ids = [...new Set(track)]; const out = { spot: `${p.action}-${p.oop}-${p.ip}`, names: [p.oop, p.ip], flop: FLOP.match(/../g).join(' '), run: RUN.map((c) => c), hands: ids.map((c) => pretty(fs.formatCombo(c))), nodes: {} };
/** A range in order of strength, weakest first: each hand's place (0 the weakest, 1 the strongest), its mass, and where 70% equity falls. */
function order(range, eq) { const hs = []; let mass = 0; for (let c = 0; c < N; c++) if (range[c] > 1e-6 && !Number.isNaN(eq[c])) { hs.push(c); mass += range[c]; } hs.sort((x, y) => eq[x] - eq[y]); const at = new Map(); let seen = 0, below = 0; for (const c of hs) { at.set(c, (seen + range[c] / 2) / mass); seen += range[c]; if (eq[c] < 0.7) below += range[c]; } return { hs, mass, at, mark: mass > 0 ? below / mass : 1 }; }
function visit(id, dealt, path) {
  const n = nodes[id]; if (!n) return;
  if (n.kind === 'chance') { if (dealt.length >= RUN.length) return; return visit(n.edges[0].child, [...dealt, cards[dealt.length]], path); }
  if (n.kind !== 'decision') return; const st = study(fs, solution, nodes, id, dealt); if (!st) return; const f = st.f; const me = f.me; const eq = st.equity(); const his = equityVs(fs, f.board, f.his, f.mine);
  const mine = order(f.mine, eq); const other = order(f.his, his); const kinds = n.edges.map((e) => e.kind); const blocks = Array.from({ length: B }, () => ({ w: 0, mix: kinds.map(() => 0) }));
  for (const c of mine.hs) { const b = blocks[Math.min(B - 1, Math.floor(mine.at.get(c) * B))]; b.w += f.mine[c]; kinds.forEach((_, a) => { b.mix[a] += f.mine[c] * st.sigma(c, a); }); }
  const oop = me === 0 ? mine : other; const oopRange = me === 0 ? f.mine : f.his; const left = [0, 0]; left[me] = r3(mine.mass / mass0[me]); left[1 - me] = r3(other.mass / mass0[1 - me]); const mark = [0, 0]; mark[me] = r3(mine.mark); mark[1 - me] = r3(other.mark);
  out.nodes[path.join('/')] = { seat: me, street: f.board.length - 3, facing: st.toCall > 0, left, mark, actions: st.actions.map((a) => ({ label: a.label, kind: a.kind, freq: r3(a.freq) })),
    blocks: blocks.map((b) => (b.w > 0 ? b.mix.map((x) => r3(x / b.w)) : null)),
    hands: ids.map((c) => (oop.at.has(c) && oopRange[c] / start[0][c] > 0.02 ? { at: r3(oop.at.get(c)), mix: me === 0 ? kinds.map((_, a) => r3(st.sigma(c, a))) : null } : null)) };
  const go = st.actions.map((a, i) => i).filter((i) => st.actions[i].freq >= 0.08 && ['check', 'call', 'bet'].includes(kinds[i])).sort((x, y) => st.actions[y].freq - st.actions[x].freq).slice(0, 2);
  for (const i of go) visit(n.edges[i].child, dealt, [...path, n.edges[i].label]);
}
visit(0, [], []);
writeFileSync(new URL('./ladder.json', import.meta.url), JSON.stringify(out)); console.error(Object.keys(out.nodes).length, 'decisions');
