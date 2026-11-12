#!/usr/bin/env node
// Plays the engine against postflop-solver on one spot and prints the result.
//   node bin/play.js [--board Td9d6hQc7s] [--pot 100] [--stack 200] [--hero ip|oop|both]
//                    [--bet 33%,75%,150%] [--raise 2.5x] [--max-raises 3] [--sizing geometric] [--selector equity|napkin]
import { parseArgs } from 'node:util';
import { EquitySelector, NapkinSelector, ParetoEngine, RangeStrategist, SolverMatch } from '../src/index.js';

const { values: args } = parseArgs({
  options: {
    board: { type: 'string', default: 'Td9d6hQc7s' },
    oop: { type: 'string', default: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s' },
    ip: { type: 'string', default: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+' },
    pot: { type: 'string', default: '100' },
    stack: { type: 'string', default: '200' },
    hero: { type: 'string', default: 'both' },
    bet: { type: 'string', default: '33%,75%,150%' },
    raise: { type: 'string', default: '2.5x' },
    'max-raises': { type: 'string', default: '3' },
    sizing: { type: 'string', default: 'geometric' },
    selector: { type: 'string', default: 'equity' },
    iterations: { type: 'string', default: '1000' },
  },
});

const sizes = { bet: args.bet, raise: args.raise };
const street = { oop: sizes, ip: sizes };
const game = {
  oopRange: args.oop,
  ipRange: args.ip,
  board: args.board,
  pot: Number(args.pot),
  stack: Number(args.stack),
  betSizes: { flop: street, turn: street, river: street },
};
const engine = new ParetoEngine({ maxRaises: Number(args['max-raises']), sizing: args.sizing });
const percent = (x) => `${(100 * x).toFixed(1)}%`;

console.log(`Board ${game.board}, pot ${game.pot}, stack ${game.stack}, bets ${args.bet}, raises ${args.raise}\n`);
for (const hero of args.hero === 'both' ? ['oop', 'ip'] : [args.hero]) {
  const started = Date.now();
  const result = await new SolverMatch(game, { strategist: new RangeStrategist({ engine, selector: args.selector === 'napkin' ? new NapkinSelector() : new EquitySelector() }) })
    .play(hero, { iterations: Number(args.iterations) });
  console.log(`Engine ${hero === 'ip' ? 'in position' : 'out of position'} (${result.lockedNodes} decision nodes, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
  console.log(`  EV at equilibrium            ${result.ev.gto.toFixed(2)}`);
  console.log(`  EV against the solver's GTO  ${result.ev.versusGto.toFixed(2)}  (loses ${percent(result.loss.versusGto)} of the pot)`);
  console.log(`  EV when fully exploited      ${result.ev.exploited.toFixed(2)}  (loses ${percent(result.loss.exploited)} of the pot)`);
  console.log('  Frequencies, engine / solver:');
  for (const line of result.lines.filter((l) => l.player === hero)) {
    if (!line.engine) continue; // a line the engine never takes
    const cells = line.actions.map((action, i) => `${action} ${percent(line.engine[i])} / ${percent(line.solver[i])}`);
    console.log(`    ${line.path || '(first to act)'}: ${cells.join(', ')}`);
  }
  console.log();
}
