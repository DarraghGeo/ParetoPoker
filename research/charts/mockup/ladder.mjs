// Data for the ladder mock-up: one solved spot walked down a fixed runout. At each of the hero's decisions, the range
// that is still there as a strip (40 slices, strongest first), what it does, and where a few tracked hands sit in it.
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../../src/solver/flopsolve.js';
import { PRESETS } from '../../../web/presets.js';
import { study } from '../../../src/explain/street.js';
const p = PRESETS.find((x) => x.action === '3BP' && x.oop === 'SB' && x.ip === 'BU') ?? PRESETS.find((x) => x.action === '3BP'); const FLOP = 'Ks9d4s'; const RUN = ['Qs', '4h'];
const spot = fs.defineSpot({ board: FLOP, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.33, 0.75], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
console.error(p.action, p.oop, p.ip, (spot.estimate.bytes / 2 ** 20).toFixed(0), 'MB');
const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.3 && run.completed < 1200) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); const N = fs.COMBOS; console.error('solved', ex.toFixed(2));
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }; const pretty = (h) => h.replace(/[shdc]/g, (s) => SUIT[s]); const r3 = (x) => +x.toFixed(3); const cards = RUN.map((c) => fs.parseCards(c)[0]);
const root = study(fs, solution, nodes, 0, []); const hero = root.f.me; const start = Float64Array.from(root.f.mine); let startMass = 0; for (let c = 0; c < N; c++) startMass += start[c];
// hands to follow: spread through the starting range by strength, plus a flush draw
const eq0 = root.equity(); const live = []; for (let c = 0; c < N; c++) if (start[c] > 0.2 && !Number.isNaN(eq0[c])) live.push(c); live.sort((x, y) => eq0[y] - eq0[x]);
const track = [0.01, 0.12, 0.28, 0.45, 0.62, 0.8, 0.95].map((q) => live[Math.floor(q * (live.length - 1))]); const sp = (c) => fs.suitOf(fs.COMBO_CARDS[2 * c]) === 0 && fs.suitOf(fs.COMBO_CARDS[2 * c + 1]) === 0; const fd = live.filter((c) => sp(c) && eq0[c] < 0.6); if (fd.length) track.push(fd[Math.floor(fd.length / 2)]);
const out = { spot: `${p.action}-${p.oop}-${p.ip}`, seat: hero ? 'IP' : 'OOP', flop: FLOP.match(/../g).join(' '), run: RUN, hands: [...new Set(track)].map((c) => pretty(fs.formatCombo(c))), nodes: {}, his: {} }; const ids = [...new Set(track)];
function visit(id, dealt, path) {
  const n = nodes[id]; if (!n) return;
  if (n.kind === 'chance') { if (dealt.length >= RUN.length) return; return visit(n.edges[0].child, [...dealt, cards[dealt.length]], path); }
  if (n.kind !== 'decision') return; const seat = n.seat === 'ip' || n.seat === 1 ? 1 : 0;
  if (seat !== hero) { const st = study(fs, solution, nodes, id, dealt); const facing = n.invested[hero] > n.invested[seat]; const i = n.edges.findIndex((e) => e.kind === (facing ? 'call' : 'check')); if (i < 0) return; out.his[path.join('/')] = { does: facing ? 'calls' : 'checks', freq: st ? r3(st.actions[i].freq) : null }; return visit(n.edges[i].child, dealt, path); }
  const st = study(fs, solution, nodes, id, dealt); if (!st) return; const f = st.f; const eq = st.equity(); const kinds = n.edges.map((e) => e.kind); if (kinds.includes('fold')) return;
  const hs = []; let mass = 0; for (let c = 0; c < N; c++) if (f.mine[c] > 1e-6 && !Number.isNaN(eq[c])) { hs.push(c); mass += f.mine[c]; } hs.sort((x, y) => eq[y] - eq[x]);
  const B = 40; const blocks = Array.from({ length: B }, () => ({ w: 0, e: 0, mix: kinds.map(() => 0), ex: null, exW: 0 })); let seen = 0; const pos = new Map();
  for (const c of hs) { const w = f.mine[c]; pos.set(c, (seen + w / 2) / mass); const b = blocks[Math.min(B - 1, Math.floor(((seen + w / 2) / mass) * B))]; b.w += w; b.e += w * eq[c]; kinds.forEach((_, a) => { b.mix[a] += w * st.sigma(c, a); }); if (w > b.exW) { b.exW = w; b.ex = pretty(fs.formatCombo(c)); } seen += w; }
  let he = equityHis(st); 
  out.nodes[path.join('/')] = { street: ['flop', 'turn', 'river'][f.board.length - 3], left: r3(mass / startMass), actions: st.actions.map((a) => ({ label: a.label, kind: a.kind, freq: r3(a.freq) })), top70: he,
    blocks: blocks.map((b) => (b.w > 0 ? { e: r3(b.e / b.w), mix: b.mix.map((x) => r3(x / b.w)), ex: b.ex } : null)),
    hands: ids.map((c) => (pos.has(c) && f.mine[c] / start[c] > 0.02 ? { at: r3(pos.get(c)), kept: r3(f.mine[c] / start[c]), e: r3(eq[c]), mix: kinds.map((_, a) => r3(st.sigma(c, a))) } : null)) };
  const order = st.actions.map((a, i) => i).filter((i) => st.actions[i].freq >= 0.08).sort((x, y) => st.actions[y].freq - st.actions[x].freq).slice(0, 2);
  for (const i of order) visit(n.edges[i].child, dealt, [...path, n.edges[i].label]);
  function equityHis(s) { const e = s.equity(); let m = 0, t = 0; for (let c = 0; c < N; c++) if (s.f.mine[c] > 0 && !Number.isNaN(e[c])) { m += s.f.mine[c]; if (e[c] >= 0.7) t += s.f.mine[c]; } return r3(t / m); }
}
visit(0, [], []);
writeFileSync(new URL('./ladder.json', import.meta.url), JSON.stringify(out)); console.error(Object.keys(out.nodes).join(' | '), out.hands.join(' '));
