import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RangeManager } from 'poker-rangeman';
import { Equity, ParetoEngine, Range, RangeStrategist, cards } from '../src/index.js';

const OOP = '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s';
const IP = 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+';

test('river equity matches poker-rangeman hand for hand', async () => {
  const board = ['Td', '9d', '6h', 'Qc', '7s'];
  const villain = Range.from(OOP).without(board);
  const equity = new Equity().against(cards.parseCards(board), villain.weights);
  const reference = await new RangeManager(IP).equityByHand(OOP, board);
  let checked = 0;
  for (const [hand, result] of Object.entries(reference)) {
    if (result.equity == null) continue;
    assert.ok(Math.abs(equity[cards.parseCombo(hand)] - result.equity) < 1e-9, hand);
    checked++;
  }
  assert.ok(checked > 100);
});

test('turn equity of a single hand matches poker-rangeman', async () => {
  const board = ['Td', '9d', '6h', 'Qc'];
  const villain = Range.from(OOP).without(board);
  const equity = new Equity().against(cards.parseCards(board), villain.weights);
  const reference = await new RangeManager(['AhKh']).equity(OOP, board);
  assert.ok(Math.abs(equity[cards.parseCombo('AhKh')] - reference.equity) < 1e-9);
});

function frequencies(strategy, range) {
  const total = range.reduce((a, b) => a + b, 0);
  return strategy.map((p) => p.reduce((sum, x, i) => sum + x * range[i], 0) / total);
}

test('hands are dealt out at exactly the engine frequencies', () => {
  const board = cards.parseCards('Td9d6hQc7s');
  const hero = Range.from(IP).without(board).weights;
  const villain = Range.from(OOP).without(board).weights;
  const strategist = new RangeStrategist({ engine: new ParetoEngine({ sizing: 'mixed' }) });

  const facing = strategist.decide({
    position: 'ip',
    spot: { street: 'river', pot: 175, toCall: 75, stack: 500 },
    board, hero, villain,
    actions: [{ type: 'fold' }, { type: 'call' }, { type: 'raise', to: 190 }, { type: 'allin', to: 500 }],
  });
  const [fold, call, raise, allin] = frequencies(facing.strategy, hero);
  assert.ok(Math.abs(fold - 75 / 175) < 1e-9);
  assert.ok(Math.abs(call - facing.frequencies.call) < 1e-9);
  assert.ok(Math.abs(raise - facing.frequencies.sizes[0].frequency) < 1e-9);
  assert.ok(Math.abs(allin - facing.frequencies.sizes[1].frequency) < 1e-9);
  assert.ok(raise > 0 && allin > 0);

  const open = strategist.decide({
    position: 'ip',
    spot: { street: 'river', pot: 100, stack: 500 },
    board, hero, villain,
    actions: [{ type: 'check' }, { type: 'bet', to: 33 }, { type: 'bet', to: 75 }],
  });
  const [check, small, big] = frequencies(open.strategy, hero);
  assert.ok(Math.abs(check - open.frequencies.check) < 1e-9);
  assert.ok(Math.abs(small - open.frequencies.sizes[0].frequency) < 1e-9);
  assert.ok(Math.abs(big - open.frequencies.sizes[1].frequency) < 1e-9);

  // Every combo's probabilities add up to 1, and the nuts never fold
  for (const { strategy } of [facing, open]) {
    for (let i = 0; i < cards.NUM_COMBOS; i++) {
      assert.ok(Math.abs(strategy.reduce((sum, p) => sum + p[i], 0) - 1) < 1e-9);
    }
  }
  assert.equal(facing.strategy[0][cards.parseCombo('8s8h')], 0); // a straight on Td9d6hQc7s
});

test('act() gives one holding its action probabilities', () => {
  const board = cards.parseCards('Td9d6hQc7s');
  const node = {
    position: 'oop',
    spot: { street: 'river', pot: 200, toCall: 100, stack: 300 },
    board,
    hero: Range.from(OOP).without(board).weights,
    villain: Range.from(IP).without(board).weights,
    actions: [{ type: 'fold' }, { type: 'call' }],
  };
  const strategist = new RangeStrategist();
  const nuts = strategist.act(node, 'KsJs');
  assert.equal(nuts.actions[1].probability, 1);
  assert.equal(nuts.sample().type, 'call');
  assert.equal(strategist.act(node, 'AsKs').sample(() => 0.5).type, 'fold'); // ace high
});
