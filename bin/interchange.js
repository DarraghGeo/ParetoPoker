#!/usr/bin/env node
// Are a group of hands interchangeable? Takes the solver's equilibrium strategy for one seat,
// reassigns which hands of the group take which action at the first decision while keeping every
// action's total frequency, leaves the rest of the strategy as the solver had it, and measures
// what the solver's best response gains. If the hands are interchangeable, nothing is lost.
//   node bin/interchange.js [--boards a,b] [--seat oop|ip] [--group 0.7,1] [--stack 250] [--bet ...] [--raise ...]
// --group is a band of equity against his range. Reassignments:
//   solver     the solver's own strategy, untouched (the floor: its own exploitability)
//   even       every hand of the group plays the group's average strategy
//   strongest  the strongest hands of the group take the most aggressive action first
//   weakest    the weakest hands of the group take the most aggressive action first
import { parseArgs } from 'node:util';
import { Equity, SolverBridge, cards } from '../src/index.js';

const { values: args } = parseArgs({
  options: {
    boards: { type: 'string', default: 'Ks7h2d5c,JsTs4h8d,Td9d6hQc,Ah8c3d6s' },
    oop: { type: 'string', default: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s' },
    ip: { type: 'string', default: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+' },
    seat: { type: 'string', default: 'oop' },
    group: { type: 'string', default: '0.7,1' },
    pot: { type: 'string', default: '100' },
    stack: { type: 'string', default: '250' },
    bet: { type: 'string', default: '33%,75%,150%' },
    raise: { type: 'string', default: '2.5x' },
    iterations: { type: 'string', default: '2000' },
  },
});
const seat = ['oop', 'ip'].indexOf(args.seat);
const [low, high] = args.group.split(',').map(Number);
const pot = Number(args.pot);
const history = seat === 0 ? [] : [0]; // out of position opens; in position acts after a check
const equity = new Equity();
const bridge = new SolverBridge();
const sizes = { bet: args.bet, raise: args.raise };
const both = { oop: sizes, ip: sizes };
const totals = {};

console.log(`${args.seat} hands with ${low}-${high} equity against his range, loss to the best response as a share of the pot`);
console.log(`${'board'.padEnd(12)} ${'group'.padStart(7)} ${'solver'.padStart(8)} ${'even'.padStart(8)} ${'strongest'.padStart(10)} ${'weakest'.padStart(8)}   solver's frequencies for the group`);
for (const board of args.boards.split(',')) {
  const info = await bridge.init({ oopRange: args.oop, ipRange: args.ip, board, pot, stack: Number(args.stack), betSizes: { flop: both, turn: both, river: both } });
  await bridge.solve({ iterations: Number(args.iterations), target: 0.001 });
  const gto = (await bridge.currentEv())[seat];
  await bridge.snapshot(seat);
  const { actions } = await bridge.node(history);
  const { strategy, weights } = await bridge.strategy(history);
  const hands = info.hands[seat].map(([a, b]) => cards.comboId(a, b));
  const n = hands.length;
  const spread = (player, values) => {
    const out = new Float64Array(cards.NUM_COMBOS);
    values.forEach((v, i) => { out[cards.comboId(...info.hands[player][i])] = v; });
    return out;
  };
  const strength = equity.against(cards.parseCards(board), spread(1 - seat, weights[1 - seat]), spread(seat, weights[seat]));
  const group = hands.map((id, h) => h).filter((h) => weights[seat][h] > 1e-4 && strength[hands[h]] >= low && strength[hands[h]] <= high);
  const weight = group.reduce((t, h) => t + weights[seat][h], 0);
  const average = actions.map((_, a) => group.reduce((t, h) => t + weights[seat][h] * strategy[a * n + h], 0) / weight);

  const variants = {
    solver: () => strategy,
    even: () => {
      const out = [...strategy];
      for (const h of group) actions.forEach((_, a) => { out[a * n + h] = average[a]; });
      return out;
    },
    strongest: () => sorted(-1),
    weakest: () => sorted(1),
  };
  // The group's hands in order take the last action (the biggest bet) until its total is used, then the next
  function sorted(direction) {
    const out = [...strategy];
    const order = [...group].sort((x, y) => direction * (strength[hands[x]] - strength[hands[y]]));
    const left = average.map((share) => share * weight);
    let a = actions.length - 1;
    for (const h of order) {
      let need = weights[seat][h];
      actions.forEach((_, k) => { out[k * n + h] = 0; });
      while (need > 1e-12 && a >= 0) {
        const take = Math.min(need, left[a]);
        out[a * n + h] += take / weights[seat][h];
        left[a] -= take;
        need -= take;
        if (left[a] <= 1e-12) a--;
      }
    }
    return out;
  }

  const loss = {};
  for (const [name, build] of Object.entries(variants)) {
    await bridge.reset();
    await bridge.restore(seat);
    await bridge.lock(history, build().map((x) => Math.max(x, 1e-9)));
    const exploited = pot - (await bridge.bestResponseEv())[1 - seat];
    loss[name] = (gto - exploited) / pot;
    totals[name] = (totals[name] ?? 0) + loss[name];
  }
  const cell = (x, width) => `${(100 * x).toFixed(2)}%`.padStart(width);
  console.log(`${board.padEnd(12)} ${`${(100 * weight / weights[seat].reduce((t, w) => t + w, 0)).toFixed(0)}%`.padStart(7)} ${cell(loss.solver, 8)} ${cell(loss.even, 8)} ${cell(loss.strongest, 10)} ${cell(loss.weakest, 8)}   ${actions.map((x, a) => `${x.type}${x.to ? ` ${x.to}` : ''} ${(100 * average[a]).toFixed(0)}%`).join(', ')}`);
}
bridge.close();
const count = args.boards.split(',').length;
const cell = (x, width) => `${(100 * x / count).toFixed(2)}%`.padStart(width);
console.log(`${'average'.padEnd(12)} ${''.padStart(7)} ${cell(totals.solver, 8)} ${cell(totals.even, 8)} ${cell(totals.strongest, 10)} ${cell(totals.weakest, 8)}`);
