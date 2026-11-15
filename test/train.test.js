import assert from 'node:assert/strict';
import { test } from 'node:test';
import { made, className, counts, mostOf } from '../web/lib/train/made.js';
import { rangeAsk, weightsOf, chartHands, RANGE_TYPES } from '../web/lib/train/ranges.js';
import { profile, shapeOf, freqQuestion, shapeQuestion, defendQuestion, twinQuestion } from '../web/lib/train/shape.js';
import { advantageWhy } from '../web/lib/train/advantage.js';

test('made: what the two cards add to the board, by level', () => {
  const cases = [['AsKd', 'Ah7c2d', 1], ['KsKd', 'Qh7c2d', 1.5], ['9s9d', 'Qh7c2d', 0.5], ['7s2s', 'Qh7c2d', 2], ['7s7d', 'Qh7c2d', 3], ['AsKs', 'Qs7s2s', 3], ['JsTd', 'Qh9c8d', 3], ['As5d', '2h3c4d', 3],
    ['AsKd', 'QhQc2d', 0], ['AsQd', 'QhQc2d', 3], ['6s5d', 'Qh7c2d', 0], ['AsKd', '2s3s4s5s6s', 0], ['Kh7h', 'Ah 7c 2d', 0.5]];
  for (const [hand, board, level] of cases) assert.equal(made(hand, board), level, `${hand} on ${board}`);
  assert.deepEqual(['KdAs', '7s7d', '9sTs'].map(className), ['AKo', '77', 'T9s']);
});

test('counts: shares of a range by level, each level inside the one below, and the hands named are of that level', () => {
  const hands = [{ name: 'AsKd', w: 1 }, { name: '7s2s', w: 1 }, { name: '6s5d', w: 2 }, { name: '9s9d', w: 1 }, { name: '7h7d', w: 0.5 }];
  const c = counts(hands, 'Ah7c2d'); assert.ok(c.big <= c.top && c.top <= c.pair && c.pair <= 1);
  assert.ok(Math.abs(c.top - 2.5 / 5.5) < 1e-9 && Math.abs(c.pair - 3.5 / 5.5) < 1e-9 && Math.abs(c.big - 1.5 / 5.5) < 1e-9);
  assert.deepEqual(mostOf(hands, 'Ah7c2d', 2), ['72s', '77']); assert.deepEqual(counts([], 'Ah7c2d'), { top: 0, pair: 0, big: 0 });
});

test('range questions: one right answer among distinct options, drawn from every kind that is on', () => {
  const prefs = { types: Object.fromEntries(RANGE_TYPES.map((t) => [t, true])) }; const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const q = rangeAsk(prefs); if (!q) continue; seen.add(q.type);
    assert.equal(q.right.length, 1); assert.ok(q.right[0] >= 0 && q.right[0] < q.options.length); assert.equal(new Set(q.options.map((o) => o.label)).size, q.options.length);
    assert.equal(q.street, 'preflop'); assert.ok(q.why.length >= 1 && q.why.every((line) => line && !/undefined|NaN/.test(line))); assert.ok(q.show.charts.every((c) => c.hands.length > 0));
  }
  assert.deepEqual([...seen].sort(), [...RANGE_TYPES].sort()); assert.equal(rangeAsk({ types: {} }), null);
});

test('a range text as the chart draws it: weights by chart name, a cell for each one held', () => {
  const held = weightsOf('AA,AKs:0.5,72o:0'); assert.equal(held.get('AA'), 1); assert.equal(held.get('AKs'), 0.5);
  const hands = chartHands(held); assert.deepEqual(hands.map((h) => [h.name, h.w]), [['AsAh', 6], ['AsKs', 2]]);
});

// a made-up decision: ten hands, weakest first, betting at both ends
const fake = (bets, { facing = false, street = 'turn', board = 'Ah 7c 2d 9s', fold = null } = {}) => {
  const actions = facing ? [{ kind: 'fold', label: 'F' }, { kind: 'call', label: 'C' }] : [{ kind: 'check', label: 'X' }, { kind: 'bet', label: 'B75' }];
  const names = ['6s5d', '8h3h', 'KhQh', 'JsTd', '4c4d', '9h9d', 'Kc7s', 'AdTc', 'AcKc', '7h7d'];
  const hero = bets.map((p, k) => ({ name: names[k], w: 1, e: 0.05 + 0.1 * k, row: { hand: { name: names[k], weight: 1, strategy: facing ? [fold[k], 1 - fold[k]] : [1 - p, p] } } }));
  const mix = actions.map((_, a) => hero.reduce((t, h) => t + h.row.hand.strategy[a], 0) / hero.length);
  return { decision: { actions, street, boardText: board, toCall: facing ? 50 : 0, pot: 100 }, s: { facing, mix }, hero, villain: hero.map((h) => ({ name: h.name, w: 1, e: 1 - h.e })), asked: {}, seen: new Set() };
};

test('the shape of the betting: the profile is the hands in tenths, and a clear shape is named', () => {
  const ends = fake([1, 0.6, 0.1, 0, 0, 0.2, 0.6, 0.9, 1, 1]); assert.deepEqual(profile(ends).map(Math.round), [100, 60, 10, 0, 0, 20, 60, 90, 100, 100]);
  assert.equal(shapeOf(profile(ends)).index, 2); const q = shapeQuestion(ends); assert.equal(q.options[q.right[0]].label, 'Both ends'); assert.equal(q.options.length, 5);
  assert.equal(shapeQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).right[0], 0); assert.equal(shapeQuestion(fake([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).right[0], 4);
  assert.equal(shapeQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { facing: true, fold: Array(10).fill(0.5) })), null);
});

test('how much bets and how much continues: the right band, and none asked on a boundary', () => {
  assert.equal(freqQuestion(fake([1, 0.6, 0.1, 0, 0, 0.2, 0.6, 0.9, 1, 1])).right[0], 2);            // 54%
  assert.equal(freqQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 1, 1])), null);                            // 20%: on the line
  assert.equal(freqQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])).right[0], 0);
  const d = defendQuestion(fake(Array(10).fill(0), { facing: true, fold: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0] })); assert.equal(d.right[0], 1); assert.match(d.why[1], /A call needs 33% equity/);
  assert.equal(defendQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])), null);
});

test('twins: an unpaired hand that bets and a pair that checks, of the same equity; never on the river', () => {
  const spot = fake([0, 0, 1, 0, 0, 0, 0, 0, 0, 0]); spot.hero[3].e = spot.hero[2].e + 0.01; spot.hero[3].name = spot.hero[3].row.hand.name = '4c4d'; spot.hero[4].e = 0.9;
  const q = twinQuestion(spot); assert.ok(q); assert.deepEqual(q.options.map((o) => o.label).sort(), ['4c4d', 'KhQh']); assert.equal(q.options[q.right[0]].label, 'KhQh');
  assert.equal(twinQuestion({ ...spot, decision: { ...spot.decision, street: 'river' } }), null); assert.equal(twinQuestion(fake([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])), null);
});

test('why a range is ahead: the count that points at it decides, and the bars are the counts', () => {
  const hero = [{ name: 'AsKd', w: 3, e: 0.8 }, { name: '6s5d', w: 1, e: 0.2 }]; const villain = [{ name: 'KsQd', w: 3, e: 0.3 }, { name: 'AcJc', w: 1, e: 0.6 }];
  const out = advantageWhy({ decision: { boardText: 'Ah 7c 2d', street: 'flop' }, hero, villain }, 0);
  assert.match(out.lines[0], /^Hero has more top pair or better: 75% of the range against 25% \(mostly AKo\)/); assert.equal(out.bars.find((b) => b.decides).title, 'Top pair or better');
  assert.deepEqual(out.bars[0].rows, [['Hero', 0.75], ['Villain', 0.25]]); assert.match(advantageWhy({ decision: { boardText: 'Ah 7c 2d', street: 'flop' }, hero, villain }, 2).lines[0], /Neither/);
});
