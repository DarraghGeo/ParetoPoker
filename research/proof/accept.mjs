// PROOF 6. Every claim made at page accuracy is true in two far finer solves.
// A spot is solved as the page would solve it; every claim the explainer would make about every hand at
// every decision it explains is then checked against the same hand measured in two references (0.01%
// of the pot, discounted CFR and CFR+). One failure is a failure.
//   node accept.mjs <spot name prefix> <page accuracy> [reference accuracy]
import { writeFileSync } from 'node:fs';
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS, HELD_TURNS, HELD_FLOPS, HELD2_TURNS, randomTurns, config } from './spots.mjs';
import { study, measure, claims, holds, tolerance } from '../../src/explain/street.js';

const [only = 'held turn', levelText = '0.02', fineTarget = '0.01'] = process.argv.slice(2);
const level = +levelText;
const spots = [...TURNS, ...FLOPS, ...HELD_TURNS, ...HELD_FLOPS, ...HELD2_TURNS, ...randomTurns(+(process.env.RANDOM_SPOTS ?? 40))].filter((s) => s.name.startsWith(only));
const other = (s, algorithm, target) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: 3, algorithm }); let e = Infinity; while (e > target && run.completed < 40000) { run.step(spot.board.length === 3 ? 5 : 20); e = run.exploitabilityPercent(); } return { spot, run, solution: run.snapshot(), exploit: e }; };
const tally = {}; const failures = []; let hands = 0, decisionsSeen = 0, silent = 0;
for (const s of spots) {
  try { fs.defineSpot(config(s)); } catch (error) { console.error(`  ${s.name}: skipped (${String(error.message).split('\n')[0]})`); continue; }
  const page = solveSpot(s, level, { cap: 40000 });
  const refs = ['dcfr', 'cfr+'].map((algorithm) => ({ ...other(s, algorithm, +fineTarget), nodes: page.nodes }));
  const flop = page.spot.board.length === 3;
  for (const { id, dealt } of decisions(page, { perRound: flop ? [99, 2, 0] : [99, 3, 0] })) {
    const node = page.nodes[id]; if (node.round > (flop ? 1 : 0)) continue;
    const st = study(fs, page.solution, page.nodes, id, dealt); if (!st) continue;
    const street = st.f.board.length === 3 ? 'flop' : 'turn';
    const T = tolerance(flop && street === 'turn' ? 'turn after flop' : street, page.exploit, st.lineReach);
    if (!T) { silent++; continue; }
    decisionsSeen++;
    const others = refs.map((g) => study(fs, g.solution, g.nodes, id, dealt));
    for (let c = 0; c < fs.COMBOS; c++) {
      const m = measure(st, c); if (!m) continue; hands++;
      const made = claims(st, m, T); if (!made.length) continue;
      const truth = others.map((o) => measure(o, c, { onlyOn: false }));
      for (const claim of made) {
        const bucket = `${claim.kind} line ${T.from}+`; const t = tally[bucket] ?? (tally[bucket] = { made: 0, failed: 0 }); t.made++;
        const ok = truth.every((mm) => mm && holds(claim, mm, T));
        if (claim.kind === 'costs') { const slack = Math.min(...truth.map((mm) => mm.actions[claim.best].worth - mm.actions[claim.a].worth)) - claim.gap; t.worstSlack = Math.min(t.worstSlack ?? 0, slack); (t.slacks ??= []).push(slack); }
        if (!ok) { t.failed++; if (failures.length < 400) failures.push({ spot: s.name, id, dealt, hand: m.name, line: st.lineReach.map((x) => +x.toFixed(2)), claim, refs: truth.map((mm) => mm && { eq: +mm.equity.toFixed(3), a: mm.actions.map((x) => ({ w: x.worth == null ? null : +x.worth.toFixed(2), f: x.folds == null ? undefined : +x.folds.toFixed(3), c: x.whenContinued == null ? undefined : +x.whenContinued.toFixed(2) })) }) }); }
      }
    }
  }
  console.error(`  ${s.name}: page ${page.exploit.toFixed(3)}%, refs ${refs.map((r) => r.exploit.toFixed(4)).join(' ')}; running tally ${JSON.stringify(tally)}`);
}
for (const t of Object.values(tally)) if (t.slacks) { t.slacks.sort((x, y) => x - y); t.slackP001 = +t.slacks[Math.floor(0.001 * t.slacks.length)].toFixed(2); t.slackP01 = +t.slacks[Math.floor(0.01 * t.slacks.length)].toFixed(2); t.worstSlack = +t.worstSlack.toFixed(2); delete t.slacks; }
const total = Object.values(tally).reduce((t, x) => t + x.made, 0); const failed = Object.values(tally).reduce((t, x) => t + x.failed, 0);
const result = { proof: 'claims hold in both references', spots: spots.map((s) => s.name), pageAccuracy: level, referenceAccuracy: +fineTarget, decisionsExplained: decisionsSeen, decisionsLeftSilent: silent, hands, claims: total, failed, byKind: tally };
console.log(JSON.stringify(result));
if (failures.length) writeFileSync(new URL(`./out/failures-${only.replace(/\W+/g, '-')}-${levelText}.json`, import.meta.url), JSON.stringify(failures, null, 1));
