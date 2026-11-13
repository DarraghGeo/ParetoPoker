#!/usr/bin/env node
// Diagnoses hand selection against the solver's equilibrium on the first decisions of a river,
// turn or flop tree, in six steps:
//   1. Is the hand bluff or value?         (does it beat half of the range that continues)
//   2. Is it a must, a can't or optional?  (the solver takes the action >= 85%, <= 15%, or mixes)
//   3. Is it interchangeable with others?  (tested: every hand of a group is given the group's average
//                                           strategy inside the solver's own, and the best response is measured)
//   4. What makes hands twins?             (characteristics measured on every hand)
//   5. How do the characteristics rank?    (how well each separates musts from can'ts)
//   6. Is it specific to the spot?         (does what the solver does move with range advantage,
//                                           nut advantage, polarization or capping)
// The selectors are scored the same way: how well their order separates musts from can'ts
// when given the solver's own ranges at the node.
//   node bin/diagnose.js [--street river|turn|flop] [--boards a,b,c] [--stack 250,600] [--bet 33%,75%,150%]
//                        [--raise 2.5x] [--pot 100] [--hands 8] [--out file.json] [--rows file.json]
// Characteristics include the forms of equity in src/handFeatures.js: spread and slope against his
// enumerated range and, with cards to come, draw equity, swing, E[HS^2] and an implied-odds proxy.
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { RangeManager } from 'poker-rangeman';
import {
  EquitySelector, Equity, NapkinSelector, ParetoEngine, SelectionContext, SolverBridge, cards, classifyHands, handFeatures,
} from '../src/index.js';

const { values: args } = parseArgs({
  options: {
    street: { type: 'string', default: 'river' },
    boards: { type: 'string' },
    oop: { type: 'string', default: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s' },
    ip: { type: 'string', default: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+' },
    pot: { type: 'string', default: '100' },
    stack: { type: 'string', default: '250' },
    bet: { type: 'string', default: '33%,75%,150%' },
    raise: { type: 'string', default: '2.5x' },
    hands: { type: 'string', default: '8' },
    out: { type: 'string' },
    rows: { type: 'string' },
    'no-interchange': { type: 'boolean', default: false },
  },
});
const MUST = 0.85;
const CANT = 0.15;
const POSITIONS = ['oop', 'ip'];
const BOARDS = {
  river: 'Td9d6hQc7s,Ks7h2d5c9s,AhJh8c3d2h,8s8d4c2hKd,QsJd6c3h2s,Ac9c5d5hTs,7h6h5c2dKs,KdQd4s9h3c,Jc8c3c6dAh,Ts7s4d2hQh,AdKh7c7d2s,9s8h3d2cJd',
  turn: 'Ks7h2d5c,JsTs4h8d,Td9d6hQc,Ah8c3d6s,QsJd6c3h,Ac9c5d5h,7h6h5c2d,KdQd4s9h',
  flop: 'Td9d6h,Ks7h2d,AhJh8c,8s8d4c',
};
const STREETS = { 3: 'flop', 4: 'turn', 5: 'river' };
const boardList = (args.boards ?? BOARDS[args.street]).split(',');
const pot = Number(args.pot);
const FEATURE_NAMES = {
  spread: 'equity spread', slope: 'equity slope', strengthNow: 'strength now', drawEquity: 'draw equity', swing: 'equity swing',
  ehs2: 'E[HS^2]', bestCard: 'best-card equity', upside: 'upside', downside: 'downside', impliedOdds: 'implied odds proxy',
};
const extra = (features, i) => Object.fromEntries(Object.entries(FEATURE_NAMES).filter(([key]) => features[key]).map(([key, name]) => [name, features[key][i]]));
const equity = new Equity();
const engine = new ParetoEngine();
const selectors = { equity: new EquitySelector(), napkin: new NapkinSelector() };
const bridge = new SolverBridge();

/** One row per hand per decision: its role, the solver's frequency, its characteristics, each selector's score. */
const samples = { 'value bet': [], 'bluff bet': [], 'call': [] };
/** One row per opening decision: how the spot is defined (poker-rangeman) and what the solver does in it. */
const spots = [];
/** Step 3: what it costs to treat a group of hands as interchangeable, per role and group width. */
const WIDTHS = { 'the whole role': () => 0, 'within 10 points of equity': (e) => Math.floor(e * 10), 'within 2 points of equity': (e) => Math.round(e * 50) };
const interchange = {};

for (const stack of args.stack.split(',').map(Number)) for (const board of boardList) {
  const sizes = { bet: args.bet, raise: args.raise };
  const street = STREETS[board.length / 2];
  const both = { oop: sizes, ip: sizes };
  const info = await bridge.init({ oopRange: args.oop, ipRange: args.ip, board, pot, stack, betSizes: { flop: both, turn: both, river: both } });
  const node = (seat) => `${board} ${seat} ${stack}`;
  // Tight: which hands are musts and can'ts is read off the strategy, which settles later than the value
  await bridge.solve({ iterations: 3000, target: 0.001 });
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
  const gto = await bridge.currentEv();
  const jobs = [{ seat: 0 }, { seat: 1 }]; // the solver's own strategy, for the floor
  // Gives every hand of a group the group's average strategy at one decision, the rest untouched
  const mixEvenly = (role, at, member, equityOf, widths = WIDTHS) => {
    if (args['no-interchange']) return;
    const me = at.player;
    const weights = at.ranges[me];
    for (const [width, key] of Object.entries(widths)) {
      const groups = new Map();
      for (let i = 0; i < cards.NUM_COMBOS; i++) {
        if (!(weights[i] > 1e-4) || !member(i)) continue;
        const k = key(equityOf[i], i);
        if (!groups.has(k)) groups.set(k, { weight: 0, sum: at.strategy.map(() => 0), hands: [] });
        const group = groups.get(k);
        group.weight += weights[i];
        at.strategy.forEach((probabilities, a) => { group.sum[a] += weights[i] * probabilities[i]; });
        group.hands.push(i);
      }
      const mixed = at.strategy.map((probabilities) => Float64Array.from(probabilities));
      for (const group of groups.values()) {
        for (const i of group.hands) group.sum.forEach((total, a) => { mixed[a][i] = total / group.weight; });
      }
      const n = ids[me].length;
      const flat = new Array(mixed.length * n);
      mixed.forEach((probabilities, a) => ids[me].forEach((id, h) => { flat[a * n + h] = Math.max(probabilities[id], 1e-9); }));
      jobs.push({ role, width, seat: me, history: at.history, flat });
    }
  };

  // The two opening decisions (OOP first to act, IP after a check) and the answer to each bet
  for (const history of [[], [0]]) {
    const open = await read(history);
    const me = open.player;
    const hero = open.ranges[me];
    const villain = open.ranges[1 - me];
    const spot = { street, pot, stack };
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
    // The forms of equity, judged as the bet goes in and is called
    const forms = handFeatures({ equity, board: boardIds, hero, villain, pot: pot + 2 * main.bet.to, behind: stack - main.bet.to });

    const first = { 'value bet': samples['value bet'].length, 'bluff bet': samples['bluff bet'].length };
    for (let i = 0; i < cards.NUM_COMBOS; i++) {
      if (!(hero[i] > 1e-4)) continue;
      const frequency = bets.reduce((total, bet) => total + open.strategy[bet.index][i], 0);
      const value = versusContinues[i] > 0.5; // step 1
      samples[value ? 'value bet' : 'bluff bet'].push({
        board, seat: POSITIONS[me], node: node(POSITIONS[me]), hand: cards.comboName(i), weight: hero[i], frequency,
        features: {
          'equity vs his range': context.strength[i],
          'equity vs his calls': versusContinues[i],
          'blocks his calls': blocksCalls[i],
          'blocks his folds': blocksFolds[i],
          'unblocks his folds': -blocksFolds[i],
          'has a pair': classes.pair[i] ? 1 : 0,
          ...(street === 'river' ? {} : { 'has a draw': classes.draw[i] ? 1 : 0 }),
          'high card rank': Math.max(cards.COMBO_A[i], cards.COMBO_B[i]) >> 2,
          ...extra(forms, i),
        },
        scores: Object.fromEntries(Object.entries(scores).map(([name, s]) => [name, value ? s.value[i] : s.bluff[i]])),
      });
    }

    mixEvenly('value bet', open, (i) => versusContinues[i] > 0.5, context.strength);
    mixEvenly('bluff bet', open, (i) => !(versusContinues[i] > 0.5), context.strength);
    if (forms.strengthNow) {
      // Kinds: the rank of the hand's strength now within the range, in bands, and its draw
      const order = [...hero.keys()].filter((i) => hero[i] > 1e-4).sort((x, y) => forms.strengthNow[x] - forms.strengthNow[y]);
      const all = order.reduce((t, i) => t + hero[i], 0);
      const rank = new Map();
      let seen = 0;
      for (const i of order) { rank.set(i, (seen + hero[i] / 2) / all); seen += hero[i]; }
      const bandOf = (edges) => (i) => { let k = edges.length - 2; while (k > 0 && rank.get(i) < edges[k]) k--; return k; };
      const six = bandOf([0, 0.2, 0.4, 0.6, 0.8, 0.9, 1]);
      const twenty = (i) => Math.min(19, Math.floor(rank.get(i) * 20));
      mixEvenly('first to act, every hand', open, () => true, context.strength, {
        'the whole range': () => 0,
        'kinds: 6 bands of strength now x draw': (e, i) => `${six(i)}/${classes.draw[i]}`,
        'kinds: 20 bands of strength now x draw': (e, i) => `${twenty(i)}/${classes.draw[i]}`,
        'kinds: 20 bands x draw x pair class': (e, i) => `${twenty(i)}/${classes.draw[i]}/${classes.pair[i]}`,
        '20 bands of equity alone': (e) => Math.min(19, Math.floor(e * 20)),
      });
    }

    // Step 6: how the spot is defined, next to what the solver does in it
    const asRange = (weights) => Object.fromEntries([...weights.keys()].filter((i) => weights[i] > 1e-4).map((i) => [cards.comboName(i), Math.min(1, weights[i])]));
    const report = await new RangeManager(asRange(hero)).against(asRange(villain), board.match(/.{2}/g)).compare();
    const valueRows = samples['value bet'].slice(first['value bet']);
    const bluffRows = samples['bluff bet'].slice(first['bluff bet']);
    const rows = [...valueRows, ...bluffRows];
    const betting = (set) => set.map((r) => ({ ...r, weight: r.weight * r.frequency }));
    const strong = valueRows.filter((r) => r.features['equity vs his range'] >= 0.8);
    spots.push({
      board, seat: POSITIONS[me], stack,
      spot: {
        'stack to pot': stack / pot,
        'range advantage': report.advantage.range,
        'nut advantage': report.advantage.nut,
        'polarization advantage': report.advantage.polarization,
        'we are capped': report.hero.capped.relative,
        'he is capped': report.villain.capped.relative,
        'our polarization': report.hero.shape?.polarized ?? NaN,
      },
      solver: {
        'bets': mean(rows, (r) => r.frequency),
        'main size (pots)': main.bet.to / pot,
        'strong value that checks': strong.length ? 1 - mean(strong, (r) => r.frequency) : NaN,
        'thinnest value (equity vs calls)': quantile(betting(valueRows), (r) => r.features['equity vs his calls'], 0.1),
        'strongest bluff (equity)': quantile(betting(bluffRows), (r) => r.features['equity vs his range'], 0.9),
        'bluffs in his bets': sumWeights(betting(bluffRows)) / (sumWeights(betting(rows)) || 1),
      },
    });

    // Facing each bet: who continues
    for (const { bet, reply } of answers) {
      const caller = reply.player;
      const range = reply.ranges[caller];
      const bettor = reply.ranges[1 - caller];
      if (!(sum(bettor, bettor.map(() => 1)) > 0.5)) continue; // a size the solver does not use
      const callSpot = { street, pot: pot + bet.to, toCall: bet.to, stack, facing: bet.to };
      const callContext = new SelectionContext({ equity, position: POSITIONS[caller], spot: callSpot, board: boardIds, hero: range, villain: bettor, villainPrior: open.ranges[1 - caller], actions: reply.node.actions });
      const bettorStrength = equity.against(boardIds, range, bettor);
      const hisValue = bettor.map((w, i) => (bettorStrength[i] > 0.5 ? w : 0));
      const hisBluffs = bettor.map((w, i) => w - hisValue[i]);
      const versusValue = equity.against(boardIds, hisValue, range);
      const blocksValue = blocked(hisValue);
      const blocksBluffs = blocked(hisBluffs);
      const callScores = Object.fromEntries(Object.entries(selectors).map(([name, s]) => [name, plain(s.call(callContext))]));
      const foldIndex = reply.node.actions.findIndex((a) => a.type === 'fold');
      mixEvenly('call', reply, () => true, callContext.strength);
      const callForms = handFeatures({ equity, board: boardIds, hero: range, villain: bettor, pot: pot + 2 * bet.to, behind: stack - bet.to });
      const callClasses = classifyHands(boardIds, range);
      for (let i = 0; i < cards.NUM_COMBOS; i++) {
        if (!(range[i] > 1e-4)) continue;
        samples.call.push({
          board, seat: POSITIONS[caller], node: `${node(POSITIONS[caller])} vs ${bet.to}`, hand: cards.comboName(i), weight: range[i], frequency: 1 - reply.strategy[foldIndex][i],
          features: {
            'equity vs his bets': callContext.strength[i],
            'equity vs his value': versusValue[i] || 0,
            'equity vs his starting range': callContext.priorStrength[i],
            'blocks his value': blocksValue[i],
            'blocks his bluffs': blocksBluffs[i],
            'unblocks his bluffs': -blocksBluffs[i],
            ...(street === 'river' ? {} : { 'has a draw': callClasses.draw[i] ? 1 : 0 }),
            ...extra(callForms, i),
          },
          scores: Object.fromEntries(Object.entries(callScores).map(([name, s]) => [name, s[i]])),
        });
      }
    }
  }

  // Step 3, measured: lock each reassignment into the solver's own strategy and best-respond to it
  if (!args['no-interchange']) {
    await bridge.snapshot(0);
    await bridge.snapshot(1);
    const floor = [0, 0];
    for (const job of jobs) {
      await bridge.reset();
      await bridge.restore(job.seat);
      if (job.flat) await bridge.lock(job.history, job.flat);
      const loss = (gto[job.seat] - (pot - (await bridge.bestResponseEv())[1 - job.seat])) / pot;
      if (!job.flat) floor[job.seat] = loss;
      else ((interchange[job.role] ??= {})[job.width] ??= []).push({ seat: POSITIONS[job.seat], loss: loss - floor[job.seat] });
    }
  }
}
bridge.close();

const percent = (x) => `${(100 * x).toFixed(0)}%`.padStart(4);
const summary = {};
for (const [role, results] of Object.entries(interchange)) {
  if (samples[role]) continue;
  console.log(`\n=== ${role}: interchange test (loss as a share of the pot when every hand of a group gets the group's average strategy)`);
  for (const [width, losses] of Object.entries(results)) {
    const average = (set) => set.reduce((t, x) => t + x.loss, 0) / (set.length || 1);
    console.log(`            ${width.padEnd(40)} ${(100 * average(losses)).toFixed(2).padStart(5)}% on average (out of position ${(100 * average(losses.filter((x) => x.seat === 'oop'))).toFixed(2)}%, in position ${(100 * average(losses.filter((x) => x.seat === 'ip'))).toFixed(2)}%)`);
  }
}
for (const [role, rows] of Object.entries(samples)) {
  const total = rows.reduce((t, r) => t + r.weight, 0);
  const musts = rows.filter((r) => r.frequency >= MUST);
  const cants = rows.filter((r) => r.frequency <= CANT);
  const share = (set) => set.reduce((t, r) => t + r.weight, 0) / total;
  console.log(`\n=== ${role}: ${rows.length} hands over ${new Set(rows.map((r) => r.node)).size} decisions`);
  console.log(`  step 2    must ${percent(share(musts))}, can't ${percent(share(cants))}, optional (the solver mixes) ${percent(1 - share(musts) - share(cants))}`);
  if (interchange[role]) {
    console.log('  step 3    interchange test: every hand given its group\'s average strategy at one decision, inside the solver\'s');
    console.log('            own strategy. Loss to the best response as a share of the pot (0 = the hands are interchangeable):');
    summary.interchange ??= {};
    summary.interchange[role] = {};
    for (const [width, results] of Object.entries(interchange[role])) {
      const average = (set) => set.reduce((t, x) => t + x.loss, 0) / (set.length || 1);
      const bySeat = Object.fromEntries(POSITIONS.map((seat) => [seat, average(results.filter((x) => x.seat === seat))]));
      const worst = Math.max(...results.map((x) => x.loss));
      summary.interchange[role][width] = { average: average(results), ...bySeat, worst, decisions: results.length };
      console.log(`            ${width.padEnd(28)} ${(100 * average(results)).toFixed(2).padStart(5)}% on average (out of position ${(100 * bySeat.oop).toFixed(2)}%, in position ${(100 * bySeat.ip).toFixed(2)}%), ${(100 * worst).toFixed(2)}% at worst`);
    }
  }
  console.log('  step 4-5  characteristic            separates  twins  pooled    must   can\'t');
  console.log('            (separates: a must is above a can\'t from the same decision; twins: the same, among hands within');
  console.log('             2 points of equity; pooled: across every decision. 1.00 = always above, 0.00 = always below, 0.50 = no use)');
  const first = Object.keys(rows[0].features)[0];
  const twins = (r) => Math.round(r.features[first] * 50);
  const features = Object.keys(rows[0].features).map((name) => ({
    name,
    auc: separation(musts, cants, (r) => r.features[name]),
    twin: separation(musts, cants, (r) => r.features[name], twins),
    pooled: separation(musts, cants, (r) => r.features[name], undefined, () => ''),
    must: mean(musts, (r) => r.features[name]), cant: mean(cants, (r) => r.features[name]),
  })).sort((a, b) => Math.abs(b.auc - 0.5) - Math.abs(a.auc - 0.5));
  const two = (x) => (Number.isNaN(x) ? '  - ' : x.toFixed(2));
  for (const f of features) console.log(`            ${f.name.padEnd(30)} ${two(f.auc)}     ${two(f.twin)}   ${two(f.pooled)}    ${f.must.toFixed(2).padStart(5)}  ${f.cant.toFixed(2).padStart(5)}`);
  summary.characteristics ??= {};
  summary.characteristics[role] = Object.fromEntries(features.map((f) => [f.name, { separates: f.auc, twins: f.twin, pooled: f.pooled, must: f.must, cant: f.cant }]));
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
    const rank = (r) => (cants.filter((c) => c.node === r.node && score(c) >= score(r)).reduce((t, c) => t + c.weight, 0));
    const worst = [...musts].map((r) => ({ r, behind: rank(r) })).sort((a, b) => b.behind - a.behind).slice(0, count);
    console.log(`  ${name}: musts ranked behind the most can'ts: ${worst.map(({ r }) => `${r.hand}@${r.board}/${r.seat}`).join(' ')}`);
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

// Step 6: does what the solver does move with how the spot is defined?
console.log('\n=== step 6: the solver\'s play in each spot, and what it moves with');
const spotKeys = Object.keys(spots[0].spot);
const solverKeys = Object.keys(spots[0].solver);
const short = (x) => (Number.isNaN(x) ? '   - ' : x.toFixed(2).padStart(5));
console.log(`  ${'spot'.padEnd(16)} ${[...spotKeys, ...solverKeys].map((k) => k.split(' (')[0].slice(0, 14).padStart(14)).join(' ')}`);
for (const s of spots) {
  console.log(`  ${`${s.board} ${s.seat} ${s.stack}`.padEnd(16)} ${[...spotKeys.map((k) => s.spot[k]), ...solverKeys.map((k) => s.solver[k])].map((x) => short(x).padStart(14)).join(' ')}`);
}
// Seats differ in everything at once (who checked, which sizes are used), so each seat is read apart
const correlations = {};
for (const seat of POSITIONS) {
  const of = spots.filter((s) => s.seat === seat);
  console.log(`\n  ${seat}: correlation over ${of.length} spots (from -1 to 1; under about 0.55 is noise at this sample)`);
  console.log(`  ${''.padEnd(34)} ${spotKeys.map((k) => k.padStart(22)).join(' ')}    mean   range`);
  correlations[seat] = {};
  for (const solverKey of solverKeys) {
    const values = of.map((s) => s.solver[solverKey]).filter(Number.isFinite);
    correlations[seat][solverKey] = Object.fromEntries(spotKeys.map((k) => [k, correlation(of.map((s) => [s.spot[k], s.solver[solverKey]]))]));
    console.log(`  ${solverKey.padEnd(34)} ${spotKeys.map((k) => short(correlations[seat][solverKey][k]).padStart(22)).join(' ')}   ${short(values.reduce((a, b) => a + b, 0) / values.length)}   ${short(Math.min(...values))} to ${short(Math.max(...values)).trim()}`);
  }
}
if (args.rows) {
  // Every hand of every decision, for trying out a rule before building it
  writeFileSync(args.rows, `${JSON.stringify(samples)}\n`);
  console.log(`\n  hands written to ${args.rows}`);
}
if (args.out) {
  writeFileSync(args.out, `${JSON.stringify({ settings: { ...args, boards: boardList.join(','), out: undefined }, ...summary, spots, correlations }, null, 1)}\n`);
  console.log(`\n  written to ${args.out}`);
}

function sumWeights(rows) {
  return rows.reduce((t, r) => t + r.weight, 0);
}
/** The value below which `q` of the weight lies. */
function quantile(rows, value, q) {
  const sorted = rows.filter((r) => r.weight > 0).sort((a, b) => value(a) - value(b));
  let left = q * sumWeights(sorted);
  for (const r of sorted) if ((left -= r.weight) <= 0) return value(r);
  return NaN;
}
function correlation(pairs) {
  const ok = pairs.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const n = ok.length;
  if (n < 3) return NaN;
  const mx = ok.reduce((t, [x]) => t + x, 0) / n;
  const my = ok.reduce((t, [, y]) => t + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of ok) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
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
function separation(musts, cants, value, twin = () => '', decision = (r) => r.node) {
  let above = 0;
  let pairs = 0;
  const byNode = new Map();
  const keyOf = (r) => `${decision(r)}/${twin(r)}`;
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
