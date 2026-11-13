// Prints the engine's and the solver's frequencies at the first decisions of some spots.
//   node diagnosis/lines.mjs <set> <seat> <count> [path filter]
import { RangeStrategist, SolverMatch, presets } from '../src/index.js';
import { SPOTS, gameOf } from '../src/solver/spots.js';
const [set, seat, count = '6', filter = ''] = process.argv.slice(2);
const spots = SPOTS[set].filter((s) => !process.env.SPOT || s.name.includes(process.env.SPOT)); const step = Math.max(1, Math.floor(spots.length / Number(count)));
for (let k = 0; k < spots.length; k += step) {
  const spot = spots[k];
  const r = await new SolverMatch(gameOf(spot), { strategist: new RangeStrategist(process.env.TUNED ? { ...presets.napkin(), tuner: (await import('../src/index.js')).fittedTuner() } : presets.napkin()) }).play(seat, { iterations: 500, ranges: 'solver', where: () => true });
  console.log(`${spot.name}  (${seat}, exploited ${(100 * r.loss.exploited).toFixed(1)}%)`);
  for (const l of r.lines.filter((x) => x.player === seat && x.path.includes(filter) && x.engine)) {
    console.log(`   ${(l.path || 'first to act').padEnd(22)} ${l.actions.map((a, i) => `${a} ${(100 * l.engine[i]).toFixed(0)}/${(100 * l.solver[i]).toFixed(0)}`).join('  ')}`);
  }
}
