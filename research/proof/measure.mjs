// The quantities an explanation quotes, measured hand by hand in several solves of the same spot:
// at the accuracies the page may reach, and in two far finer references by different algorithms.
// One line a hand a decision goes to out/measure-<spot>.jsonl; `tolerance.mjs` reads them.
//   node measure.mjs <spot name prefix> <levels> <reference accuracy>      MINLINE: thinnest line looked at
import { writeFileSync } from 'node:fs';
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS, HELD_TURNS, HELD_FLOPS, HELD2_TURNS, RIVERS, HELD_RIVERS, config } from './spots.mjs';
import { study, measure } from '../../src/explain/street.js';

const [only, levelText = '0.3,0.05,0.02', fineTarget = '0.01'] = process.argv.slice(2);
const LEVELS = levelText.split(',').map(Number); const MINLINE = +(process.env.MINLINE ?? 0.05);
const spots = [...TURNS, ...FLOPS, ...HELD_TURNS, ...HELD_FLOPS, ...HELD2_TURNS, ...RIVERS, ...HELD_RIVERS].filter((s) => !only || s.name.startsWith(only));
const other = (s, algorithm, target) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 3), algorithm }); let e = Infinity; const t = Date.now(); while (e > target && run.completed < 40000) { run.step(spot.board.length === 3 ? 5 : 20); e = run.exploitabilityPercent(); } console.error(`  ${algorithm} ${s.name}: ${run.completed} its ${e.toFixed(4)}% ${((Date.now() - t) / 1000).toFixed(0)}s`); return { spot, run, solution: run.snapshot(), exploit: e }; };
const r3 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000);
for (const s of spots) {
  const solves = LEVELS.map((level) => solveSpot(s, level, { cap: 40000, workers: +(process.env.WORKERS ?? 3) }));
  for (const algorithm of ['dcfr', 'cfr+']) solves.push({ ...other(s, algorithm, +fineTarget), nodes: solves[0].nodes });
  const lines = []; const t0 = Date.now(); const flop = s.board.replace(/\s/g, '').length === 6;
  for (const { id, dealt } of decisions(solves[0], { perRound: flop ? [99, 2, 0] : [99, 3, 0] })) {
    if (solves[0].nodes[id].round > (flop ? 1 : 0)) continue; // rivers are another matter
    const studies = solves.map((g) => study(fs, g.solution, g.nodes, id, dealt)); if (studies.some((x) => !x)) continue;
    // lines both ranges take often enough, as the coarsest solve sees them
    if (Math.min(...studies[0].lineReach) < MINLINE || Math.min(...studies[studies.length - 1].lineReach) < MINLINE / 2) continue;
    const head = { id, dealt, round: studies[0].f.round, seat: studies[0].f.me, actions: studies[0].actions.map((a) => a.label), kinds: studies[0].actions.map((a) => a.kind), ends: studies[0].actions.map((a) => a.endsStreet), freq: studies.map((x) => x.actions.map((a) => r3(a.freq))), line: studies.map((x) => x.lineReach.map(r3)) };
    lines.push(JSON.stringify({ head }));
    for (let c = 0; c < fs.COMBOS; c++) {
      const ms = studies.map((x) => measure(x, c, { onlyOn: false })); if (ms.some((m) => !m)) continue;
      lines.push(JSON.stringify({ h: ms[0].name, eq: ms.map((m) => r3(m.equity)), reach: ms.map((m) => r3(m.reach)),
        a: ms.map((m) => m.actions.map((x) => ({ s: r3(x.sigma), w: r3(x.worth), f: r3(x.folds), c: r3(x.whenContinued), cs: r3(x.continues), k: x.cards ? [x.cards.lift.n, r3(x.cards.lift.weight), r3(x.cards.lift.part), r3(x.cards.rest.part)] : undefined }))) }));
    }
    console.error(`  ${s.name} node ${id} [${dealt}] round ${head.round} done, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  writeFileSync(new URL(`./out/measure-${s.name.replace(/\W+/g, '-')}.jsonl`, import.meta.url), lines.join('\n') + '\n');
  console.log(JSON.stringify({ spot: s.name, levels: LEVELS, exploit: solves.map((g) => +g.exploit.toFixed(4)), lines: lines.length, seconds: Math.round((Date.now() - t0) / 1000) }));
}
