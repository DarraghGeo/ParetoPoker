#!/usr/bin/env node
// Where precisely does the engine fail? Starts from the solver's own strategy and lets the engine
// decide at one kind of decision only (a street and a situation), with the solver's range for
// the opponent. Then, at that decision, hands the engine's jobs back to the solver one at a time:
//   engine        the engine's frequencies (tuned) and the selector's hands, mixed by the mixer
//   freq given    the solver's frequencies, the selector's hands: hand order and mixing
//   order given   the solver's frequencies and its order of hands, dealt all-or-nothing: mixing alone
//   hands given   the engine's frequencies with the solver's hands and mixing: frequencies alone
//   node bin/locate.js [--set rivers-tune] [--parts napkin] [--out file.json]
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { SELECTORS, SETS, measure } from './compare.js';

const { values: args } = parseArgs({ options: { set: { type: 'string', default: 'rivers-tune' }, parts: { type: 'string', default: 'napkin' }, out: { type: 'string' } } });
const spots = SETS[args.set];
const streets = [...new Set((Array.isArray(spots) ? spots.map((s) => s.board) : spots.boards.split(',')).map((b) => b.length / 2))].flatMap((n) => (n === 5 ? ['river'] : n === 4 ? ['turn', 'river'] : ['flop', 'turn', 'river']));
const SITUATIONS = {
  'first to act or checked to': (d) => !d.facing,
  'facing a bet': (d) => d.facing && d.raises === 0,
  'facing a raise': (d) => d.facing && d.raises > 0,
};
const VARIANTS = {
  engine: { ranges: 'solver' },
  'freq given': { ranges: 'solver', frequencies: 'solver' },
  'order given': { ranges: 'solver', frequencies: 'solver', hands: 'solver' },
  'hands given': { ranges: 'solver', hands: 'solver-mixed' },
};

console.log(`${args.set}, ${args.parts}: loss to the best response as a share of the pot when the engine decides at one kind of decision only`);
console.log(`  ${'decision'.padEnd(44)} ${Object.keys(VARIANTS).map((v) => v.padStart(13)).join('')}     (out of position / in position)`);
const rows = [];
for (const street of [...new Set(streets)]) {
  for (const [situation, test] of Object.entries(SITUATIONS)) {
    const where = (d) => d.street === street && test(d);
    const cells = {};
    for (const [variant, options] of Object.entries(VARIANTS)) {
      const r = await measure(spots, SELECTORS[args.parts], { ...options, where });
      cells[variant] = { oop: r.oop[1], ip: r.ip[1], spots: r.spots };
    }
    rows.push({ street, situation, cells });
    const cell = (c) => `${(100 * c.oop).toFixed(1).padStart(5)} /${(100 * c.ip).toFixed(1).padStart(5)}`.padStart(13);
    console.log(`  ${`${street}: ${situation}`.padEnd(44)} ${Object.values(cells).map(cell).join('')}`);
  }
}
if (args.out) writeFileSync(args.out, `${JSON.stringify({ set: args.set, parts: args.parts, rows }, null, 1)}\n`);
