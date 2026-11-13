// PROOF 6. Every claim made at page accuracy is true in two far finer solves.
// A spot is solved as the page would solve it; every claim the explainer would make about every hand at
// every decision it explains is then checked against the same hand measured in two references (0.01%
// of the pot, discounted CFR and CFR+). One failure is a failure.
//   node accept.mjs <spot name prefix> <page accuracy> [reference accuracy]
import { writeFileSync } from 'node:fs';
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS, HELD_TURNS, HELD_FLOPS, HELD2_TURNS, RIVERS, HELD_RIVERS, randomTurns, randomRivers, freshSpots, freshFlops, config } from './spots.mjs';
import { study, measure, claims, holds, tolerance, ON_TRIAL } from '../../src/explain/street.js';

const [only = 'held turn', levelText = '0.02', fineTarget = '0.01'] = process.argv.slice(2);
const level = +levelText;
const spots = [...TURNS, ...FLOPS, ...HELD_TURNS, ...HELD_FLOPS, ...HELD2_TURNS, ...RIVERS, ...HELD_RIVERS, ...randomTurns(+(process.env.RANDOM_SPOTS ?? 40)), ...randomRivers(+(process.env.RANDOM_SPOTS ?? 40)), ...freshSpots(+(process.env.FRESH ?? 60), 4, 4401), ...freshSpots(+(process.env.FRESH ?? 60), 5, 5501), ...freshFlops(+(process.env.FRESH_FLOPS ?? 6), 3301, (x) => { try { fs.defineSpot(config(x)); return true; } catch { return false; } })].filter((s) => s.name.startsWith(only));
const other = (s, algorithm, target) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 3), algorithm }); let e = Infinity; while (e > target && run.completed < 40000) { run.step(spot.board.length === 3 ? 5 : 20); e = run.exploitabilityPercent(); } return { spot, run, solution: run.snapshot(), exploit: e }; };
const tally = {}; const failures = []; let hands = 0, decisionsSeen = 0, silent = 0;
const flip = { gap: 0, where: '' }; const flips = {}; // the largest gap, at page accuracy, whose sign a reference reverses
for (const s of spots) {
  try { fs.defineSpot(config(s)); } catch (error) { console.error(`  ${s.name}: skipped (${String(error.message).split('\n')[0]})`); continue; }
  const page = solveSpot(s, level, { cap: 40000, workers: +(process.env.WORKERS ?? 3) });
  const refs = ['dcfr', 'cfr+'].map((algorithm) => ({ ...other(s, algorithm, +fineTarget), nodes: page.nodes }));
  const flop = page.spot.board.length === 3;
  for (const { id, dealt } of decisions(page, { perRound: flop ? [99, 2, 0] : [99, 3, 0] })) {
    const node = page.nodes[id]; if (node.round > (flop ? 1 : 0)) continue;
    const st = study(fs, page.solution, page.nodes, id, dealt); if (!st) continue;
    const street = ['flop', 'turn', 'river'][st.f.board.length - 3];
    const T = tolerance(st.f.round === 0 ? street : `${street} after a deal`, page.exploit, st.lineReach, process.env.TRIAL === '0' ? undefined : ON_TRIAL);
    if (!T) { silent++; continue; }
    decisionsSeen++;
    const others = refs.map((g) => study(fs, g.solution, g.nodes, id, dealt));
    for (let c = 0; c < fs.COMBOS; c++) {
      const m = measure(st, c); if (!m) continue; hands++;
      const made = claims(st, m, T); if (!made.length) continue;
      const truth = others.map((o) => measure(o, c, { onlyOn: false }));
      { const onIdx = m.actions.map((x, i) => (x.on && x.worth != null ? i : -1)).filter((i) => i >= 0); const bestIdx = onIdx.reduce((bb, i) => (bb < 0 || m.actions[i].worth > m.actions[bb].worth ? i : bb), -1);
        for (const i of onIdx) { if (i === bestIdx) continue; const gap = m.actions[bestIdx].worth - m.actions[i].worth; const ref = Math.min(...truth.map((mm) => mm.actions[bestIdx].worth - mm.actions[i].worth)); if (ref <= 0 && gap > flip.gap) { flip.gap = gap; flip.where = `${s.name} node ${id} ${m.name} ${m.actions[i].label}`; } const fb = (flips[T.from] ??= { gap: 0, where: '' }); if (ref <= 0 && gap > fb.gap) { fb.gap = +gap.toFixed(3); fb.where = `${s.name} node ${id} ${m.name} ${m.actions[i].label}`; } } }
      for (const claim of made) {
        const bucket = `${claim.kind} line ${T.from}+`; const t = tally[bucket] ?? (tally[bucket] = { made: 0, failed: 0 }); t.made++;
        const ok = truth.every((mm) => mm && holds(claim, mm, T));
        t.number = !!claim.number;
        if (!ok) { t.failed++; if (failures.length < 400) failures.push({ spot: s.name, id, dealt, hand: m.name, line: st.lineReach.map((x) => +x.toFixed(2)), claim, refs: truth.map((mm) => mm && { eq: +mm.equity.toFixed(3), a: mm.actions.map((x) => ({ w: x.worth == null ? null : +x.worth.toFixed(2), f: x.folds == null ? undefined : +x.folds.toFixed(3), c: x.whenContinued == null ? undefined : +x.whenContinued.toFixed(2) })) }) }); }
      }
    }
  }
  console.error(`  ${s.name}: page ${page.exploit.toFixed(3)}%, refs ${refs.map((r) => r.exploit.toFixed(4)).join(' ')}; running tally ${JSON.stringify(tally)}`);
}
const total = Object.values(tally).reduce((t, x) => t + x.made, 0); const failed = Object.values(tally).reduce((t, x) => t + x.failed, 0);
const conclusions = Object.values(tally).filter((t) => !t.number); const numbers = Object.values(tally).filter((t) => t.number);
const sum = (list, k) => list.reduce((t, x) => t + x[k], 0);
const result = { proof: 'claims hold in both references', conclusions: { made: sum(conclusions, 'made'), failed: sum(conclusions, 'failed') }, numbers: { made: sum(numbers, 'made'), outsideTolerance: sum(numbers, 'failed') }, spots: spots.map((s) => s.name), pageAccuracy: level, referenceAccuracy: +fineTarget, decisionsExplained: decisionsSeen, decisionsLeftSilent: silent, hands, claims: total, failed, largestReversedGap: flip, largestReversedGapByLine: flips, byKind: tally };
console.log(JSON.stringify(result));
if (failures.length) writeFileSync(new URL(`./out/failures-${only.replace(/\W+/g, '-')}-${levelText}.json`, import.meta.url), JSON.stringify(failures, null, 1));
