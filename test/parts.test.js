import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Mixer, ParetoEngine, Range, RangeStrategist, Tuner, cards, presets } from '../src/index.js';

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
});
