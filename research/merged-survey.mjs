// Merged bets found in solved river spots: the hands whose bet, set against checking, gains both from his calls and from
// his folds (src/explain/street/hand/merged.js), first to act and in position after a check, with the notes they are given.
// node research/merged-survey.mjs
import * as fs from 'poker-flopsolve';
import { treeOf } from '../src/solver/flopsolve.js';
import { study, measure, explainStreet } from '../src/explain/street.js';
import { mergedBet } from '../src/explain/street/hand/merged.js';
import { TYPES } from '../web/lib/study/presets.js';
const T = Object.fromEntries(TYPES.map((t) => [t[0], t]));
const CAP = 'JJ-22,AJs-A2s,KQs-K9s,QJs-Q9s,JTs-J9s,T9s,98s,87s,76s,65s,AQo-ATo,KQo-KJo,QJo';   // a river range without the top: after checks
const SPOTS = [['4c5s7sQdQh', T.Rec[2], T.Reg[1]], ['4c5s7sQdQh', CAP, CAP], ['Ks9d4s7h2c', CAP, CAP], ['Jh8h5c2d2s', CAP, CAP], ['Ad9c6s6d3h', T.Rec[2], CAP], ['Td8s4c4h9d', CAP, T.Reg[1]]];
for (const [board, oop, ip] of SPOTS) {
  const spot = fs.defineSpot({ board, pot: 6.5, stack: 97, oop, ip, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 });
  const run = fs.createRun(spot, {}); let exploit = 9; for (let i = 0; i < 400 && exploit > 0.1; i++) { run.step(10); exploit = run.exploitabilityPercent(); }
  const nodes = treeOf(fs, spot); const solution = run.snapshot(); const check = nodes[0].edges.find((e) => e.kind === 'check').child;
  for (const id of [0, check]) {
    const s = study(fs, solution, nodes, id, []); let bets = 0; const found = [];
    for (let c = 0; c < fs.COMBOS; c++) { const m = measure(s, c, {}); if (!m) continue; const top = m.actions.map((a, i) => i).sort((x, y) => m.actions[y].sigma - m.actions[x].sigma)[0]; if (!m.actions[top].gains) continue; bets++; if (mergedBet({ m }, top)) found.push([m, top]); }
    console.log(`${board} ${id === 0 ? 'OOP first' : 'IP after a check'}: ${found.length} of ${bets} betting hands merged`);
    const seen = new Set();
    for (const [m, top] of found) { const kind = `${m.features.pair}|${m.features.made}|${m.actions[top].label}`; if (seen.has(kind) || seen.size >= 2) continue; seen.add(kind); const g = m.actions[top].gains; const t = explainStreet(s, m, null);
      console.log(`  ${m.name} ${m.actions[top].label} eq ${(100 * m.equity).toFixed(0)}: calls ${g.calls.toFixed(1)} folds ${g.folds.toFixed(1)} raises ${g.raises.toFixed(1)}\n    ${t.line}\n    ${t.reasons.filter((r) => ['move', 'role'].includes(r.id)).map((r) => `[${r.id}] ${r.text}`).join('\n    ')}`); }
  }
}
