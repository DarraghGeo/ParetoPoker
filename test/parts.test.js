import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KindMixer, Mixer, ParetoEngine, Range, RangeStrategist, Tuner, cards, fittedTuner, presets } from '../src/index.js';

const board = cards.parseCards('Td9d6hQc7s');
const hero = Range.from('66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s').without(board).weights;
const villain = Range.from('QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+').without(board).weights;
const open = { position: 'oop', spot: { street: 'river', pot: 100, stack: 250 }, board, hero, villain, actions: [{ type: 'check' }, { type: 'bet', to: 33 }, { type: 'bet', to: 150 }] };
const facing = { position: 'oop', spot: { street: 'river', pot: 175, toCall: 75, stack: 250 }, board, hero, villain, actions: [{ type: 'fold' }, { type: 'call' }] };
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('with no tuner and no mixer the engine plays the fundamentals, every hand pure', () => {
  const plain = new RangeStrategist().decide(facing);
  near(plain.frequencies.mdf, 100 / 175);
  near(plain.played[1], 100 / 175);
  // Only the hand on the boundary is mixed
  const mixed = [...hero.keys()].filter((i) => hero[i] > 0 && plain.strategy[1][i] > 1e-9 && plain.strategy[1][i] < 1 - 1e-9);
  assert.ok(new Set(mixed.map((i) => plain.strategy[1][i].toFixed(6))).size <= 1);
});

test('a tuner adjusts the fundamentals for the spot', () => {
  const seen = [];
  const tuner = new Tuner([
    { when: (c) => c.facing, set: (c) => { seen.push(c.profile); return { defence: 0.8 }; } },
    { when: (c) => !c.facing && c.street === 'river', set: { sizing: 'smallest', bluff: 0.5 } },
  ]);
  const strategist = new RangeStrategist({ tuner });
  const defended = strategist.decide(facing);
  near(defended.frequencies.mdf, 0.8 * (100 / 175));
  near(defended.frequencies.fundamental.mdf, 100 / 175); // the fundamental is still reported
  near(defended.played[1], 0.8 * (100 / 175));
  // The profile describes the spot, range against range
  const [profile] = seen;
  assert.equal(profile.street, 'river');
  assert.ok(profile.rangeAdvantage > -0.5 && profile.rangeAdvantage < 0.5);
  assert.ok(profile.nutShare >= 0 && profile.polarization > 0 && profile.polarization <= 1);
  near(profile.spr, 250 / 175);

  // Sizing and the bluff ratio: the fundamentals pick the big bet and balance it
  const fundamental = new RangeStrategist().decide(open).frequencies.sizes;
  assert.equal(fundamental[1].weight, 1);
  const tuned = strategist.decide(open).frequencies.sizes;
  assert.deepEqual(tuned.map((w) => w.weight), [1, 0]);
  near(tuned[0].bluff, 0.5 * tuned[0].value * tuned[0].bluffShare / (1 - tuned[0].bluffShare));
  // Weights per size work too
  const split = new RangeStrategist({ tuner: new Tuner([{ set: { sizing: [3, 1] } }]) }).decide(open).frequencies.sizes;
  assert.deepEqual(split.map((w) => w.weight), [0.75, 0.25]);
});

test('a mixer caps how often a hand takes a role', () => {
  const always = new RangeStrategist().decide(open);
  const mixer = new Mixer([{ role: 'value', when: (c) => !c.facing, share: 0.7 }]);
  const mixed = new RangeStrategist({ mixer }).decide(open);
  const nuts = cards.parseCombo('KsJs');
  near(always.strategy[2][nuts], 1);
  near(mixed.strategy[2][nuts], 0.7);
  near(mixed.strategy[0][nuts], 0.3); // the rest of the time it checks
  // A share per hand, and the lowest share wins where rules overlap
  const perHand = new Float64Array(cards.NUM_COMBOS).fill(1);
  perHand[nuts] = 0.25;
  const both = new Mixer([{ role: 'value', share: 0.7 }, { role: 'value', share: () => perHand }]);
  near(new RangeStrategist({ mixer: both }).decide(open).strategy[2][nuts], 0.25);
  // Other roles are untouched
  assert.equal(mixer.mix({ facing: true }, 'call'), null);
});

test('presets bundle a selector, a mixer and a tuner', () => {
  const napkin = presets.napkin();
  assert.ok(napkin.selector && napkin.mixer && napkin.tuner);
  const turn = cards.parseCards('Td9d6h2c');
  const node = { position: 'oop', spot: { street: 'turn', pot: 100, stack: 400 }, board: turn, hero: Range.from('TT,99,AKs').without(turn).weights, villain: Range.from('QQ-JJ,AQs').without(turn).weights, actions: [{ type: 'check' }, { type: 'bet', to: 75 }] };
  near(new RangeStrategist({ engine: new ParetoEngine(), ...napkin }).decide(node).strategy[0][cards.parseCombo('TsTh')], 0.4);
  // The fitted preset has a tuner and a mixer of its own
  const fitted = presets.fitted();
  assert.ok(fitted.tuner.rules.length > 1 && fitted.mixer.rules.length > 1);
  // On the turn its mixer says outright how often each kind of hand bets
  const turnNode = { ...node, hero: Range.from('TT,99,AKs,KQs,87s,33,A5s').without(turn).weights, villain: Range.from('QQ-JJ,AQs,T9s,98s').without(turn).weights };
  const decided = new RangeStrategist(fitted).decide(turnNode);
  const bet = decided.strategy[1];
  assert.ok(decided.played[1] > 0 && decided.played[1] <= decided.frequencies.bet + 1e-9); // never more than the engine says
  assert.ok(bet[cards.parseCombo('TsTh')] > 0 && bet[cards.parseCombo('TsTh')] < 1); // top set is mixed
  // Every hand's probabilities still add up to 1
  for (let i = 0; i < cards.NUM_COMBOS; i++) near(decided.strategy[0][i] + decided.strategy[1][i], 1);
});

test('bluff raises never take the range past the defence frequency', () => {
  const engine = new ParetoEngine();
  // Nearly everything counts as value-raise material: the bluffs on top are trimmed, the value is not
  const spot = { street: 'river', pot: 175, toCall: 75, stack: 600 };
  const answer = engine.inPositionFacingBet(spot, { valueShare: 0.5 });
  near(answer.raise, answer.mdf);
  near(answer.sizes.reduce((t, w) => t + w.value, 0), 0.5);
  near(engine.inPositionFacingBet(spot, { valueShare: 0.7 }).raise, 0.7); // value alone may exceed it
  assert.ok(engine.inPositionFacingBet(spot, { valueShare: 0.1 }).raise < answer.mdf);
});

test('with a tuner the frequency is always filled; without one the selector may refuse', () => {
  // Hero holds only hands that beat nothing in his betting range
  const river = cards.parseCards('2s3h4d6c7c');
  const node = {
    position: 'oop', spot: { street: 'river', pot: 200, toCall: 100, stack: 300 }, board: river,
    hero: Range.from('QQ').without(river).weights, villain: Range.from('KK').without(river).weights,
    actions: [{ type: 'fold' }, { type: 'call' }],
  };
  near(new RangeStrategist().decide(node).played[1], 0);                                  // no bluff catcher: no call
  near(new RangeStrategist({ tuner: new Tuner([{ set: {} }]) }).decide(node).played[1], 0.5); // the fundamental, filled
  near(new RangeStrategist({ tuner: new Tuner([{ set: { defence: 0 } }]) }).decide(node).played[1], 0); // the tuner's call
});

test('the fitted tuner follows the spot', () => {
  const tuner = fittedTuner();
  const context = (overrides) => ({ street: 'river', position: 'oop', facing: false, spot: { raises: 0, facing: 0, pot: 100 }, profile: { rangeAdvantage: 0.1, nutAdvantage: 0, polarization: 0.5, spr: 2 }, ...overrides });
  // Out of position on the river the smaller, thinner bet is only used when ahead in range
  assert.equal(tuner.tune(context({})).valueThreshold, 0.6);
  assert.equal(tuner.tune(context({ profile: { rangeAdvantage: -0.1, nutAdvantage: 0, polarization: 0.5, spr: 2 } })).valueThreshold, undefined);
  assert.equal(tuner.tune(context({ position: 'ip', profile: { rangeAdvantage: -0.1, nutAdvantage: 0, polarization: 0.5, spr: 2 } })).valueThreshold, 0.6);
  // Facing a river bet: a little under the fundamental. Facing a turn raise: over it.
  const level = { rangeAdvantage: 0, nutAdvantage: 0, polarization: 0.5, spr: 2 };
  near(tuner.tune(context({ facing: true, spot: { raises: 0, facing: 75, pot: 175 }, profile: level })).defence, 0.95);
  near(tuner.tune(context({ facing: true, spot: { raises: 0, facing: 75, pot: 175 } })).defence, 1); // ahead by 0.1: the fundamental
  // Far behind in range the raise rule steps aside
  assert.ok(tuner.tune(context({ facing: true, spot: { raises: 0, facing: 75, pot: 175 }, profile: level })).frequency > 0);
  assert.equal(tuner.tune(context({ facing: true, spot: { raises: 0, facing: 75, pot: 175 }, profile: { ...level, rangeAdvantage: -0.3 } })).frequency, undefined);
  near(tuner.tune(context({ street: 'turn', facing: true, spot: { raises: 1, facing: 150, pot: 300 } })).defence, 1.25);
  // It always answers, so frequencies are always filled
  assert.ok(tuner.tune(context({ street: 'flop' })) !== null);
});

test('a kind mixer says how often each kind of hand bets', () => {
  const turn = cards.parseCards('Td9d6h2c');
  const node = {
    position: 'ip', spot: { street: 'turn', pot: 100, stack: 300 }, board: turn,
    hero: Range.from('QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+').without(turn).weights,
    villain: Range.from('66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s').without(turn).weights,
    actions: [{ type: 'check' }, { type: 'bet', to: 75 }],
  };
  // Only the strongest fifth and the weakest fifth of hands with no draw bet, and draws never do
  const table = [[1, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
  const mixer = new KindMixer({ tables: { turn: { ip: table } }, level: () => 0.2 });
  const { strategy, played } = new RangeStrategist({ mixer }).decide(node);
  near(played[1], 0.2, 1e-4);                                   // the level asked for
  assert.equal(strategy[1][cards.parseCombo('QsJs')], 0);       // an open-ender
  assert.ok(strategy[1][cards.parseCombo('9s9h')] > 0);         // a set, among the strongest
  assert.equal(strategy[1][cards.parseCombo('As9s')], 0);       // a middling pair
  // Outside its tables it is an ordinary mixer
  assert.equal(new KindMixer({ tables: {} }).direct({ facing: false, street: 'turn', position: 'ip' }, {}), null);
});
