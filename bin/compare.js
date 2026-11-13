#!/usr/bin/env node
// Compares selectors against the solver's best response on a set of trees, in three settings:
//   engine              the engine tracks ranges itself and uses its own frequencies (the whole engine)
//   his range           it is given the solver's range for the opponent at every decision, and uses its own frequencies
//   his range + freq    it is also given the solver's action frequencies: hand selection alone
//   node bin/compare.js [--set rivers|turns|turns-b|flop|rivers-tune|rivers-held|turns-tune|turns-held] [--selectors equity,napkin] [--modes engine,ranges,selection]
import { parseArgs } from 'node:util';
import { RangeStrategist, SolverMatch, presets } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';

const A = { oopRange: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s', ipRange: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+' };
const B = { oopRange: '99-22,A9s-A2s,K2s+,Q5s+,J7s+,T7s+,96s+,86s+,75s+,64s+,54s,AJo-A2o,K9o+,Q9o+,J9o+,T9o', ipRange: '22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QTo+,JTo' };
const wide = { bet: '33%,75%,150%', raise: '2.5x' };
/** The test sets of TUNINGS.md. */
export const SETS = {
  rivers: { ...A, boards: 'Td9d6hQc7s,Ks7h2d5c9s,AhJh8c3d2h,8s8d4c2hKd,QsJd6c3h2s,Ac9c5d5hTs,7h6h5c2dKs,KdQd4s9h3c,Jc8c3c6dAh,Ts7s4d2hQh,AdKh7c7d2s,9s8h3d2cJd', stack: 250, sizes: wide },
  'rivers-b': { ...B, boards: 'Kh8s4d2cJs,As7d6d3hTc,QdTd5s9c2h,9h9c4s7dAd,JsTh2c5dKd,6s5s2h8cQs,Ad5c3h9sQc,Th8h7c2sAc', stack: 400, sizes: { bet: '50%,100%', raise: '3x' } },
  turns: { ...A, boards: 'Ks7h2d5c,JsTs4h8d,Td9d6hQc,Ah8c3d6s', stack: 250, sizes: wide },
  'turns-b': { ...B, boards: 'Kh8s4d2c,QdTd5s9c,9h9c4s7d,6s5s2h8c', stack: 500, sizes: { bet: '50%,100%', raise: '3x' } },
  flop: { ...A, boards: 'Td9d6h', stack: 150, sizes: { bet: '75%', raise: '3x' } },
  ...SPOTS,
};
export const MODES = {
  engine: { label: 'engine', options: {} },
  ranges: { label: 'his range', options: { ranges: 'solver' } },
  selection: { label: 'his range + freq', options: { ranges: 'solver', frequencies: 'solver' } },
};
/** Sets of parts by name: each returns `{ selector, mixer, tuner }`. */
export const SELECTORS = presets;

/**
 * Average loss over a set, per seat: `{ oop: [versusGto, exploited], ip: [...], spots: [...] }`.
 * `set` is one of the sets above or a list of spots (see src/solver/spots.js). `makeParts`
 * returns the strategist's parts (`{ selector, mixer, tuner, engine }`), or a selector alone.
 * Four trees are run at a time.
 */
export async function measure(set, makeParts, options = {}) {
  const spots = Array.isArray(set) ? set : set.boards.split(',').map((board) => ({ name: board, ...set, board, pot: 100 }));
  const jobs = spots.flatMap((spot) => ['oop', 'ip'].map((hero) => ({ spot, hero })));
  const results = await pool(jobs, async ({ spot, hero }) => {
    const made = makeParts();
    const parts = made.selector || made.mixer || made.tuner || made.engine ? made : { selector: made };
    // `opponent` parts, when given, are how the engine pictures the other seat (default: itself)
    const { opponent, ...own } = parts;
    const result = await new SolverMatch(gameOf(spot), { strategist: new RangeStrategist(own), opponent: opponent ? new RangeStrategist(opponent) : null }).play(hero, { iterations: 300, ...options });
    return { spot: spot.name, pair: spot.pair, depth: spot.depth, board: spot.board, hero, versusGto: result.loss.versusGto, exploited: result.loss.exploited };
  });
  const out = { oop: [0, 0], ip: [0, 0], spots: results };
  for (const r of results) {
    out[r.hero][0] += r.versusGto / spots.length;
    out[r.hero][1] += r.exploited / spots.length;
  }
  return out;
}

export function format(result) {
  const cell = ([versusGto, exploited]) => `${(100 * versusGto).toFixed(2).padStart(5)} / ${(100 * exploited).toFixed(2).padStart(5)}`;
  return `oop ${cell(result.oop)} | ip ${cell(result.ip)} | both ${cell([(result.oop[0] + result.ip[0]) / 2, (result.oop[1] + result.ip[1]) / 2])}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values: args } = parseArgs({
    options: { set: { type: 'string', default: 'rivers' }, selectors: { type: 'string', default: 'equity,napkin' }, modes: { type: 'string', default: 'engine,ranges,selection' } },
  });
  console.log(`${args.set}: loss as a share of the pot, against the solver's equilibrium / against its best response`);
  for (const mode of args.modes.split(',')) {
    for (const name of args.selectors.split(',')) {
      console.log(`  ${MODES[mode].label.padEnd(19)} ${name.padEnd(8)} ${format(await measure(SETS[args.set], SELECTORS[name], MODES[mode].options))}`);
    }
  }
}
