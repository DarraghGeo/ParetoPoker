import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ParetoEngine, Range, RangeStrategist, cards } from '../src/index.js';

const board = cards.parseCards('Td9d6hQc7s');
const hero = Range.from('QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+').without(board).weights;
const villain = Range.from('66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s').without(board).weights;
const total = hero.reduce((a, b) => a + b, 0);
const open = {
  position: 'ip',
  spot: { street: 'river', pot: 100, stack: 500 },
  board, hero, villain,
  actions: [{ type: 'check' }, { type: 'bet', to: 75 }],
};
const facing = {
  position: 'ip',
  spot: { street: 'river', pot: 175, toCall: 75, stack: 500 },
  board, hero, villain,
  actions: [{ type: 'fold' }, { type: 'call' }, { type: 'raise', to: 190 }],
};
const weightOf = (probabilities, notation) => {
  const { weights } = Range.from(notation).without(board);
  return weights.reduce((sum, w, i) => sum + (w > 0 ? hero[i] * probabilities[i] : 0), 0);
};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('the selector decides which hands bet for value and which bluff', () => {
  const seen = [];
  const strategist = new RangeStrategist({
    selector: {
      value: (context, wager) => { seen.push([context.position, context.street, wager.to]); return 'KJs,J8s'; }, // straights
      bluff: () => 'A2s-A5s',
    },
  });
  const { strategy, played, frequencies } = strategist.decide(open);
  const bet = strategy[1];
  assert.deepEqual(seen, [['ip', 'river', 75]]);

  // Every straight bets, and nothing else bets for value
  const straights = weightOf(hero.map(() => 1), 'KJs,J8s');
  near(weightOf(bet, 'KJs,J8s'), straights);
  near(frequencies.sizes[0].value, straights / total);
  // The engine still sets how many bluffs that value supports (75 into 100: 3 bluffs per 7 value)
  near(weightOf(bet, 'A2s-A5s'), (straights * 3) / 7);
  near(played[1] * total, straights * (1 + 3 / 7));
  near(weightOf(bet, 'QQ-22'), 0);
});

test('a priority list is taken in order and weights cap a hand', () => {
  const strategist = new RangeStrategist({
    engine: new ParetoEngine({ raiseFrequency: 0 }),
    selector: { call: () => ['QQ', 'JJ', '88:0.5', 'AQs'] },
  });
  const { strategy, frequencies, played } = strategist.decide(facing);
  const call = strategy[1];
  // Not enough listed hands to reach the defence frequency: all of them call, 88 half the time
  for (const combo of ['QsQh', 'JsJh']) assert.equal(call[cards.parseCombo(combo)], 1);
  assert.equal(call[cards.parseCombo('8s8h')], 0.5);
  assert.equal(call[cards.parseCombo('KsJs')], 0);
  assert.ok(played[1] < frequencies.call);

  // With a small target, only the front of the list is used
  const few = new RangeStrategist({ engine: new ParetoEngine({ raiseFrequency: 0 }), selector: { call: () => ({ hands: ['QQ', 'JJ', 'AQs'], share: 3 / total }) } });
  const picked = few.decide(facing).strategy[1];
  near(weightOf(picked, 'QQ'), 3);
  near(weightOf(picked, 'JJ,AQs'), 0);
});

test('scores per combo and a share override are accepted, and null falls back to equity', () => {
  const byEquity = new RangeStrategist().decide(open);
  const same = new RangeStrategist({ selector: { value: () => null, bluff: () => undefined } }).decide(open);
  assert.deepEqual(same.played, byEquity.played);

  // Scores: bluff the hands with the highest card ids first, whatever their equity
  const scores = Float64Array.from({ length: cards.NUM_COMBOS }, (_, i) => i);
  const custom = new RangeStrategist({ selector: { bluff: () => scores } }).decide(open);
  near(custom.played[1], byEquity.played[1]);
  let last = cards.NUM_COMBOS - 1;
  while (!(hero[last] > 0) || byEquity.strategy[1][last] > 0) last--; // the top-scored hand that is not a value bet
  assert.equal(custom.strategy[1][last], 1);

  // A value share of 10% of the range, taken from the selector's hands
  const fixed = new RangeStrategist({ selector: { value: (context) => ({ hands: context.strength, share: 0.1 }) } }).decide(open);
  near(fixed.frequencies.sizes[0].value, 0.1);
  near(fixed.played[1], 0.1 / 0.7);
});

test('the context gives a selector the spot and equity to work with', () => {
  let context;
  new RangeStrategist({ selector: { call: (c) => { context = c; return null; } } }).decide(facing);
  assert.equal(context.facing, true);
  near(context.potOdds, 75 / 250);
  near(context.frequencies.fold, 75 / 175);
  assert.ok(context.strength[cards.parseCombo('KsJs')] > 0.95); // the nut straight
  assert.equal(context.actions.length, 3);
});
