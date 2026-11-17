// Do the butterfly's equity lines tell Always from Mix from Never? At first-to-act decisions on solved flops, turns and
// rivers, every hand of the range to act is put in its row (by made hand) and along its row's line (how far ahead it is
// now, how much equity is still to come, or how often he folds to it: web/lib/study/butterfly.js). A hand always bets
// (90% or more), never bets (10% or less) or mixes. If the line orders a row well, the three kinds sit in three stretches
// along it, and two cuts tell them apart: the score is how much of the range the best two cuts get right. It is set
// beside the same with the row's hands in order of plain equity, and beside calling the whole row by its commonest kind
// (no line at all). The cuts are the best for each row, so these are ceilings: what the picture can hold, not what a
// player reads off it.   node research/butterfly-lines.mjs
import * as fs from 'poker-flopsolve';
import { treeOf } from '../src/solver/tree.js';
import { study } from '../src/explain/street.js';
import { LINES, ROWS, rowOf } from '../web/lib/study/butterfly.js';
import { flopJob } from '../web/solver/jobs.js';
import { TYPES } from '../web/lib/study/presets.js';

const T = Object.fromEntries(TYPES.map((t) => [t[0], t]));
let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const board = (n) => { const out = []; while (out.length < n) { const c = Math.floor(rnd() * 52); if (!out.includes(c)) out.push(c); } return out; };
const kindOf = (f) => (f >= 0.9 ? 2 : f <= 0.1 ? 0 : 1);   // never, mix, always
const isBet = (k) => !['check', 'call', 'fold'].includes(k);

/** How often he folds to the bet, seen from each hand to act (his hands sharing a card with it left out). */
function foldsTo(s, a, nodes, solution) {
  const child = study(fs, solution, nodes, s.f.node.edges[a].child, []); if (!child) return null;
  const fold = child.actions.findIndex((x) => x.kind === 'fold'); if (fold < 0) return null;
  const his = s.f.his; const out = new Float64Array(fs.COMBOS);
  for (let h = 0; h < fs.COMBOS; h++) {
    if (!(s.f.mine[h] > 0)) continue; const [a1, a2] = [fs.COMBO_CARDS[2 * h], fs.COMBO_CARDS[2 * h + 1]]; let all = 0, folds = 0;
    for (let v = 0; v < fs.COMBOS; v++) { const w = his[v]; if (!(w > 0)) continue; const [b1, b2] = [fs.COMBO_CARDS[2 * v], fs.COMBO_CARDS[2 * v + 1]]; if (b1 === a1 || b1 === a2 || b2 === a1 || b2 === a2) continue; all += w; folds += w * child.sigma(v, fold); }
    out[h] = all > 0 ? folds / all : 0;
  }
  return out;
}

/** The most of a row's weight that two cuts along an order can get right, the kinds running never, mix, always either way along it. */
function bestCuts(hands) {
  const n = hands.length; let best = 0;
  for (const dir of [0, 1]) {
    const list = dir ? [...hands].reverse() : hands; const pre = [[0], [0], [0]];
    for (const h of list) for (let k = 0; k < 3; k++) pre[k].push(pre[k].at(-1) + (h.kind === k ? h.w : 0));
    for (let i = 0; i <= n; i++) for (let j = i; j <= n; j++) best = Math.max(best, pre[0][i] + (pre[1][j] - pre[1][i]) + (pre[2][n] - pre[2][j]));
  }
  return best;
}

const tally = { all: 0, line: 0, equity: 0, none: 0, byRow: ROWS.map(() => ({ all: 0, line: 0, equity: 0, none: 0, kinds: [0, 0, 0] })), byStreet: {} };
function score(s, nodes, solution, street) {
  const wagers = s.actions.map((a, i) => i).filter((i) => isBet(s.actions[i].kind)); if (!wagers.length) return;
  const main = wagers.reduce((b, i) => (s.actions[i].freq > s.actions[b].freq ? i : b)); const folds = foldsTo(s, main, nodes, solution);
  const eq = s.equity(); const parts = s.drawParts(); const boardText = fs.formatCards(s.f.board); const rows = ROWS.map(() => []);
  for (let c = 0; c < fs.COMBOS; c++) {
    const w = s.f.mine[c]; if (!(w > 1e-6) || Number.isNaN(eq[c])) continue; const lv = rowOf(fs.formatCombo(c), boardText); const line = LINES[lv];
    const bets = wagers.reduce((t, i) => t + s.sigma(c, i), 0);
    const measure = line === 'folds' && folds ? folds[c] : line === 'come' && parts ? parts.draw[c] : parts ? parts.now[c] : eq[c];
    rows[lv].push({ w, kind: kindOf(bets), measure, eq: eq[c] });
  }
  const st = (tally.byStreet[street] ??= { all: 0, line: 0, equity: 0, none: 0 });
  rows.forEach((hands, lv) => {
    if (!hands.length) return; const all = hands.reduce((t, h) => t + h.w, 0); const kinds = [0, 1, 2].map((k) => hands.reduce((t, h) => t + (h.kind === k ? h.w : 0), 0));
    const line = bestCuts([...hands].sort((a, b) => a.measure - b.measure)); const equity = bestCuts([...hands].sort((a, b) => a.eq - b.eq)); const none = Math.max(...kinds);
    for (const t of [tally, tally.byRow[lv], st]) { t.all += all; t.line += line; t.equity += equity; t.none += none; }
    kinds.forEach((x, k) => { tally.byRow[lv].kinds[k] += x; });
  });
}

function decisions(solution, nodes, street) {
  const check = nodes[0].edges.find((e) => e.kind === 'check')?.child;
  for (const id of [0, check]) { if (id == null || nodes[id].kind !== 'decision') continue; const s = study(fs, solution, nodes, id, []); if (s) score(s, nodes, solution, street); }
}

const N = { river: Number(process.env.RIVERS ?? 30), turn: Number(process.env.TURNS ?? 12), flop: Number(process.env.FLOPS ?? 3) };
const pairs = [[T.Rec[2], T.Reg[1]], [T.Reg[2], T.Reg[1]], [T.Nit[2], T.Rec[1]]];
for (const [street, cards, target] of [['river', 5, 0.1], ['turn', 4, 0.3]]) {
  for (let k = 0; k < N[street]; k++) {
    const [oop, ip] = pairs[k % pairs.length];
    try {
      const spot = fs.defineSpot({ board: fs.formatCards(board(cards)), pot: 6.5, stack: 97, oop, ip, betSizes: street === 'river' ? [[0.75]] : [[0.33], [0.75]], raiseSizes: [{ times: 2.5 }], maxRaises: 1 });
      const run = fs.createRun(spot, {}); let exploit = 9; for (let i = 0; i < 300 && exploit > target; i++) { run.step(10); exploit = run.exploitabilityPercent(); }
      decisions(run.snapshot(), treeOf(fs, spot), street);
    } catch (e) { console.error(street, k, String(e.message).slice(0, 80)); }
  }
  console.error(`${street}s done`);
}
for (let k = 0; k < N.flop; k++) {
  const [oop, ip] = pairs[k % pairs.length]; const job = flopJob({ pot: 6.5, stack: 97, oop, ip, bets: [[0.33], [0.33], [0.75]], raises: [2.5], maxRaises: 1, allIn: false }, board(3)); let r; while (!(r = job.step()));
  decisions(r.solution, r.nodes, 'flop'); console.error(`flop ${k + 1} done`);
}

const pc = (x, all) => `${(100 * x / (all || 1)).toFixed(0)}%`.padStart(5);
console.log(`\nHow much of the range the picture gets right as Always / Mix / Never (best two cuts along each row)\n`);
console.log('                     no line   by equity   by the row\'s line');
console.log(`all decisions        ${pc(tally.none, tally.all)}      ${pc(tally.equity, tally.all)}        ${pc(tally.line, tally.all)}`);
for (const [street, t] of Object.entries(tally.byStreet)) console.log(`${street.padEnd(20)} ${pc(t.none, t.all)}      ${pc(t.equity, t.all)}        ${pc(t.line, t.all)}`);
console.log('\nby row (its line)                 no line   by equity   by its line    never / mix / always in the row');
ROWS.forEach(([code, name], lv) => { const t = tally.byRow[lv]; if (!t.all) return; console.log(`${code.padEnd(4)} ${name.padEnd(16)} ${LINES[lv].padEnd(6)}   ${pc(t.none, t.all)}      ${pc(t.equity, t.all)}        ${pc(t.line, t.all)}        ${t.kinds.map((x) => pc(x, t.all)).join(' /')}   (${pc(t.all, tally.all).trim()} of all)`); });
