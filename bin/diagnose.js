#!/usr/bin/env node
// Diagnoses hand selection on the river against the solver's equilibrium, in five steps:
//   1. Is the hand bluff or value?         (does it beat half of the range that continues)
//   2. Is it a must, a can't or optional?  (the solver takes the action >= 85%, <= 15%, or mixes)
//   3. Is it interchangeable with others?  (how much of each role the solver mixes)
//   4. What makes hands twins?             (characteristics measured on every hand)
//   5. How do the characteristics rank?    (how well each separates musts from can'ts)
// The selectors are scored the same way: how well their order separates musts from can'ts
// when given the solver's own ranges at the node.
//   node bin/diagnose.js [--boards a,b,c] [--bet 33%,75%,150%] [--raise 2.5x] [--pot 100] [--stack 250] [--hands 8]
import { parseArgs } from 'node:util';
import {
  EquitySelector, Equity, NapkinSelector, ParetoEngine, SelectionContext, SolverBridge, cards, classifyHands,
} from '../src/index.js';

const { values: args } = parseArgs({
  options: {
    boards: { type: 'string', default: 'Td9d6hQc7s,Ks7h2d5c9s,AhJh8c3d2h,8s8d4c2hKd,QsJd6c3h2s,Ac9c5d5hTs,7h6h5c2dKs,KdQd4s9h3c,Jc8c3c6dAh,Ts7s4d2hQh,AdKh7c7d2s,9s8h3d2cJd' },
    oop: { type: 'string', default: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s' },
    ip: { type: 'string', default: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+' },
    pot: { type: 'string', default: '100' },
    stack: { type: 'string', default: '250' },
    bet: { type: 'string', default: '33%,75%,150%' },
    raise: { type: 'string', default: '2.5x' },
    hands: { type: 'string', default: '8' },
  },
});
const MUST = 0.85;
const CANT = 0.15;
const POSITIONS = ['oop', 'ip'];
const pot = Number(args.pot);
const stack = Number(args.stack);
const equity = new Equity();
const engine = new ParetoEngine();
const selectors = { equity: new EquitySelector(), napkin: new NapkinSelector() };
const bridge = new SolverBridge();

/** One row per hand per decision: its role, the solver's frequency, its characteristics, each selector's score. */
const samples = { 'value bet': [], 'bluff bet': [], 'call': [] };

for (const board of args.boards.split(',')) {
  const sizes = { bet: args.bet, raise: args.raise };
  const info = await bridge.init({ oopRange: args.oop, ipRange: args.ip, board, pot, stack, betSizes: { river: { oop: sizes, ip: sizes } } });
  await bridge.solve({ iterations: 1000, target: 0.002 });
  const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
  const spread = (player, values) => {
    const out = new Float64Array(cards.NUM_COMBOS);
    values.forEach((v, i) => { out[ids[player][i]] = v; });
    return out;
  };
  const read = async (history) => {
    const node = await bridge.node(history);
    const { player, strategy, weights } = await bridge.strategy(history);
    const n = ids[player].length;
    return {
      history, node, player,
      ranges: [spread(0, weights[0]), spread(1, weights[1])],
      strategy: node.actions.map((_, a) => spread(player, strategy.slice(a * n, (a + 1) * n))),
    };
  };
  const boardIds = cards.parseCards(board);

  // The two opening decisions (OOP first to act, IP after a check) and the answer to each bet
  for (const history of [[], [0]]) {
    const open = await read(history);
    const me = open.player;
    const hero = open.ranges[me];
    const villain = open.ranges[1 - me];
    const spot = { street: 'river', pot, stack };
    const context = new SelectionContext({ equity, position: POSITIONS[me], spot, board: boardIds, hero, villain, actions: open.node.actions });
    const classes = classifyHands(boardIds, hero);
    const bets = open.node.actions.map((a, i) => ({ ...a, index: i })).filter((a) => a.to != null);

    const answers = [];
    for (const bet of bets) answers.push({ bet, reply: await read([...history, bet.index]) });
    // The size the solver uses most stands for "the bet" when a hand does not bet
    const used = answers.map(({ bet }) => sum(hero, open.strategy[bet.index]));
    const main = answers[used.indexOf(Math.max(...used))];
    const fold = main.reply.node.actions.findIndex((a) => a.type === 'fold');
    const continues = villain.map((w, i) => w * (1 - main.reply.strategy[fold][i]));
    const versusContinues = equity.against(boardIds, continues, hero);
    const wager = engine.wager(POSITIONS[me], spot, main.bet.to);
    const blocksCalls = blocked(continues);
    const blocksFolds = blocked(villain.map((w, i) => w - continues[i]));
    const scores = Object.fromEntries(Object.entries(selectors).map(([name, s]) => [name, { value: plain(s.value(context, wager)), bluff: plain(s.bluff(context, wager)) }]));

    for (let i = 0; i < cards.NUM_COMBOS; i++) {
      if (!(hero[i] > 1e-4)) continue;
      const frequency = bets.reduce((total, bet) => total + open.strategy[bet.index][i], 0);
      const value = versusContinues[i] > 0.5; // step 1
      samples[value ? 'value bet' : 'bluff bet'].push({
        board, seat: POSITIONS[me], hand: cards.comboName(i), weight: hero[i], frequency,
        features: {
          'equity vs his range': context.strength[i],
          'equity vs his calls': versusContinues[i],
          'blocks his calls': blocksCalls[i],
          'blocks his folds': blocksFolds[i],
          'unblocks his folds': -blocksFolds[i],
          'has a pair': classes.pair[i] ? 1 : 0,
          'high card rank': Math.max(cards.COMBO_A[i], cards.COMBO_B[i]) >> 2,
        },
        scores: Object.fromEntries(Object.entries(scores).map(([name, s]) => [name, value ? s.value[i] : s.bluff[i]])),
      });
    }

    // Facing each bet: who continues
    for (const { bet, reply } of answers) {
      const caller = reply.player;
      const range = reply.ranges[caller];
      const bettor = reply.ranges[1 - caller];
      if (!(sum(bettor, bettor.map(() => 1)) > 0.5)) continue; // a size the solver does not use
      const callSpot = { street: 'river', pot: pot + bet.to, toCall: bet.to, stack, facing: bet.to };
      const callContext = new SelectionContext({ equity, position: POSITIONS[caller], spot: callSpot, board: boardIds, hero: range, villain: bettor, villainPrior: open.ranges[1 - caller], actions: reply.node.actions });
      const bettorStrength = equity.against(boardIds, range, bettor);
      const hisValue = bettor.map((w, i) => (bettorStrength[i] > 0.5 ? w : 0));
      const hisBluffs = bettor.map((w, i) => w - hisValue[i]);
      const versusValue = equity.against(boardIds, hisValue, range);
      const blocksValue = blocked(hisValue);
      const blocksBluffs = blocked(hisBluffs);
      const callScores = Object.fromEntries(Object.entries(selectors).map(([name, s]) => [name, plain(s.call(callContext))]));
      const foldIndex = reply.node.actions.findIndex((a) => a.type === 'fold');
      for (let i = 0; i < cards.NUM_COMBOS; i++) {
        if (!(range[i] > 1e-4)) continue;
        samples.call.push({
          board, seat: POSITIONS[caller], hand: cards.comboName(i), weight: range[i], frequency: 1 - reply.strategy[foldIndex][i],
          features: {
            'equity vs his bets': callContext.strength[i],
            'equity vs his value': versusValue[i] || 0,
            'equity vs his starting range': callContext.priorStrength[i],
            'blocks his value': blocksValue[i],
            'blocks his bluffs': blocksBluffs[i],
            'unblocks his bluffs': -blocksBluffs[i],
          },
          scores: Object.fromEntries(Object.entries(callScores).map(([name, s]) => [name, s[i]])),
        });
      }
    }
  }
}
bridge.close();

const percent = (x) => `${(100 * x).toFixed(0)}%`.padStart(4);
for (const [role, rows] of Object.entries(samples)) {
  const total = rows.reduce((t, r) => t + r.weight, 0);
  const musts = rows.filter((r) => r.frequency >= MUST);
  const cants = rows.filter((r) => r.frequency <= CANT);
  const share = (set) => set.reduce((t, r) => t + r.weight, 0) / total;
  console.log(`\n=== ${role}: ${rows.length} hands over ${args.boards.split(',').length} boards`);
  console.log(`  step 2-3  must ${percent(share(musts))}, can't ${percent(share(cants))}, optional (interchangeable) ${percent(1 - share(musts) - share(cants))}`);
  console.log('  step 4-5  characteristic            separates   must   can\'t   (1.00 = every must above every can\'t, 0.50 = no use)');
  const features = Object.keys(rows[0].features).map((name) => ({
    name, auc: separation(musts, cants, (r) => r.features[name]), must: mean(musts, (r) => r.features[name]), cant: mean(cants, (r) => r.features[name]),
  })).sort((a, b) => Math.abs(b.auc - 0.5) - Math.abs(a.auc - 0.5));
  for (const f of features) console.log(`            ${f.name.padEnd(30)} ${f.auc.toFixed(2)}      ${f.must.toFixed(2).padStart(5)}  ${f.cant.toFixed(2).padStart(5)}`);
  console.log('  selectors (the order each would fill in, on the solver\'s ranges)');
  for (const name of Object.keys(selectors)) {
    const score = (r) => (Number.isNaN(r.scores[name]) ? -Infinity : r.scores[name]);
    const dropped = (set) => set.filter((r) => Number.isNaN(r.scores[name])).reduce((t, r) => t + r.weight, 0) / (set.reduce((t, r) => t + r.weight, 0) || 1);
    console.log(`            ${name.padEnd(30)} ${separation(musts, cants, score).toFixed(2)}      not a candidate: ${percent(dropped(musts))} of musts, ${percent(dropped(cants))} of can'ts`);
  }
  // The clearest mistakes: musts the selector ranks lowest, can'ts it ranks highest
  const count = Number(args.hands);
  for (const name of Object.keys(selectors)) {
    const score = (r) => (Number.isNaN(r.scores[name]) ? -Infinity : r.scores[name]);
    const rank = (r) => (cants.filter((c) => score(c) >= score(r)).reduce((t, c) => t + c.weight, 0));
    const worst = [...musts].map((r) => ({ r, behind: rank(r) })).sort((a, b) => b.behind - a.behind).slice(0, count);
    console.log(`  ${name}: musts ranked behind the most can'ts: ${worst.map(({ r }) => `${r.hand}@${r.board.slice(0, 10)}/${r.seat}`).join(' ')}`);
  }
}

// How often the solver takes the action, by seat and by band of a characteristic
const bands = (rows, feature, edges) => edges.slice(0, -1).map((low, k) => {
  const inBand = rows.filter((r) => r.features[feature] >= low && r.features[feature] < edges[k + 1]);
  return inBand.length ? `${low.toFixed(2)}-${edges[k + 1].toFixed(2)}: ${percent(mean(inBand, (r) => r.frequency))} (${inBand.reduce((t, r) => t + r.weight, 0).toFixed(0)})` : null;
}).filter(Boolean).join('  ');
console.log('\n=== detail: solver frequency by band (combos in brackets)');
for (const seat of POSITIONS) {
  const of = (role) => samples[role].filter((r) => r.seat === seat);
  console.log(`  ${seat} value bets by equity vs his range:  ${bands(of('value bet'), 'equity vs his range', [0.5, 0.6, 0.7, 0.8, 0.9, 0.97, 1.01])}`);
  console.log(`  ${seat} bluff bets by equity vs his range:  ${bands(of('bluff bet'), 'equity vs his range', [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.01])}`);
  const air = of('bluff bet').filter((r) => !r.features['has a pair'] && r.features['equity vs his range'] < 0.2);
  const airMust = air.filter((r) => r.frequency >= MUST);
  const airCant = air.filter((r) => r.frequency <= CANT);
  console.log(`  ${seat} air only (${air.length} hands, solver bets ${percent(mean(air, (r) => r.frequency))}): separation by blocks his calls ${separation(airMust, airCant, (r) => r.features['blocks his calls']).toFixed(2)}, unblocks his folds ${separation(airMust, airCant, (r) => r.features['unblocks his folds']).toFixed(2)}, equity ${separation(airMust, airCant, (r) => r.features['equity vs his range']).toFixed(2)}, high card ${separation(airMust, airCant, (r) => r.features['high card rank']).toFixed(2)}`);
  // Steps 3-5 among twins: hands of the same decision with the same equity (to 2 points)
  const twin = (key) => (r) => Math.round(r.features[key] * 50);
  const among = (role, key, names) => {
    const rows = of(role);
    const musts = rows.filter((r) => r.frequency >= MUST);
    const cants = rows.filter((r) => r.frequency <= CANT);
    return names.map((name) => `${name} ${separation(musts, cants, (r) => r.features[name], twin(key)).toFixed(2)}`).join(', ');
  };
  console.log(`  ${seat} bluff twins (same equity): ${among('bluff bet', 'equity vs his range', ['blocks his calls', 'unblocks his folds', 'high card rank', 'has a pair'])}`);
  console.log(`  ${seat} value twins (same equity): ${among('value bet', 'equity vs his range', ['blocks his calls', 'unblocks his folds', 'equity vs his calls'])}`);
  console.log(`  ${seat} call twins (same equity vs his bets): ${among('call', 'equity vs his bets', ['equity vs his starting range', 'equity vs his value', 'blocks his value', 'unblocks his bluffs'])}`);
  console.log(`  ${seat} calls by equity vs his bets:  ${bands(of('call'), 'equity vs his bets', [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 1.01])}`);
}

function sum(weights, probabilities) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i] * probabilities[i];
  return total;
}
function plain(answer) {
  return ArrayBuffer.isView(answer) ? answer : answer.hands;
}
function blocked(range) {
  const perCard = new Float64Array(52);
  let total = 0;
  for (let i = 0; i < cards.NUM_COMBOS; i++) {
    if (range[i] > 0) { total += range[i]; perCard[cards.COMBO_A[i]] += range[i]; perCard[cards.COMBO_B[i]] += range[i]; }
  }
  return Float64Array.from({ length: cards.NUM_COMBOS }, (_, i) => (total > 0 ? (perCard[cards.COMBO_A[i]] + perCard[cards.COMBO_B[i]] - range[i]) / total : 0));
}
function mean(rows, value) {
  const weight = rows.reduce((t, r) => t + r.weight, 0);
  return rows.reduce((t, r) => t + r.weight * value(r), 0) / (weight || 1);
}
/**
 * Chance that a must scores above a can't from the same decision (ties count half). With `twin`,
 * only hands with the same twin key are compared: what separates hands that are otherwise alike.
 */
function separation(musts, cants, value, twin = () => '') {
  let above = 0;
  let pairs = 0;
  const byNode = new Map();
  const keyOf = (r) => `${r.board}/${r.seat}/${twin(r)}`;
  for (const c of cants) {
    const key = keyOf(c);
    if (!byNode.has(key)) byNode.set(key, []);
    byNode.get(key).push(c);
  }
  for (const m of musts) {
    for (const c of byNode.get(keyOf(m)) ?? []) {
      const w = m.weight * c.weight;
      const a = value(m);
      const b = value(c);
      above += w * (a > b ? 1 : a === b ? 0.5 : 0);
      pairs += w;
    }
  }
  return pairs > 0 ? above / pairs : NaN;
}
