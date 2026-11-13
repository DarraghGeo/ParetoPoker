import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTree, solveCurves } from '../src/CurveGame.js';
import { riverThresholds, uniformThresholds } from '../src/derived.js';

const uniform = (n) => new Float64Array(n).fill(1 / n);
const mass = (profile, from, to) => { let sum = 0; for (let i = from; i < to; i++) sum += profile[i]; return sum / profile.length; };

test('one bet, no raise, a check ends the hand: the von Neumann thresholds', () => {
  // Pot-size bet (B = 2 antes): bluff below 1/9, value above 7/9
  const n = 450;
  const tree = buildTree({ pot: 2, stack: 10, checkCloses: true, menu: { bet: [1], raise: 0, addAllIn: 0, forceAllIn: 0 }, maxRaises: 0 });
  const [, bet] = solveCurves({ first: uniform(n), second: uniform(n), tree, iterations: 600 });
  const { a, b } = uniformThresholds(1);
  assert.ok(Math.abs(a - 1 / 9) < 1e-9 && Math.abs(b - 7 / 9) < 1e-9);
  assert.ok(Math.abs(mass(bet, 0, n / 2) - 1 / 9) < 0.01, `bluffs ${mass(bet, 0, n / 2)}`);
  assert.ok(Math.abs(mass(bet, n / 2, n) - 2 / 9) < 0.01, `value ${mass(bet, n / 2, n)}`);
  // The very top always bets, the middle never does
  assert.ok(bet[n - 1] > 0.99 && bet[Math.floor(n / 2)] < 0.01);
});

test('acting first with a bet behind: some of the strongest hands check', () => {
  const n = 300;
  const tree = buildTree({ pot: 2, stack: 10, menu: { bet: [1], raise: 0, addAllIn: 0, forceAllIn: 0 }, maxRaises: 0 });
  const [, bet] = solveCurves({ first: uniform(n), second: uniform(n), tree, iterations: 600 });
  const top = mass(bet, n - 15, n) * (n / 15);
  assert.ok(top > 0.2 && top < 0.9, `the top twentieth bets ${top}`);
});

test('riverThresholds with uniform curves agrees with the closed form', () => {
  const n = 1326;
  const hero = new Float64Array(n).fill(1);
  const strength = Float64Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  const cuts = riverThresholds({ hero, strength, villain: hero, villainStrength: strength, bet: 0.75 });
  const exact = uniformThresholds(0.75);
  assert.ok(Math.abs(cuts.value - exact.b) < 0.01 && Math.abs(cuts.bluff - exact.a) < 0.01);
  assert.ok(Math.abs(cuts.fold - exact.c) < 0.01);
});
