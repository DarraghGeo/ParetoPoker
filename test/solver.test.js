import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ParetoEngine, RangeStrategist, SolverBridge, SolverMatch } from '../src/index.js';

const binary = fileURLToPath(new URL('../solver-bridge/target/release/solver-bridge', import.meta.url));
const skip = existsSync(binary) ? false : 'solver bridge not built (npm run build:solver)';

// The textbook game: OOP holds the nuts or air, IP holds a bluff catcher, one pot-sized bet.
const polar = {
  oopRange: 'AA,QQ',
  ipRange: 'KK',
  board: '2s3h4d6c7c',
  pot: 100,
  stack: 100,
  betSizes: { river: { oop: { bet: 'a', raise: '' }, ip: { bet: 'a', raise: '' } } },
};

test('in the nuts-or-air game the engine matches the solver in both seats', { skip }, async () => {
  for (const hero of ['oop', 'ip']) {
    const result = await new SolverMatch(polar).play(hero, { iterations: 2000, target: 0.0005 });
    // OOP bets every AA and half of QQ (2 value : 1 bluff); IP calls half the time
    assert.ok(Math.abs(result.ev.gto - (hero === 'oop' ? 75 : 25)) < 0.5, `gto ${result.ev.gto}`);
    assert.ok(Math.abs(result.loss.versusGto) < 0.005, `${hero} versus GTO: ${result.loss.versusGto}`);
    assert.ok(Math.abs(result.loss.exploited) < 0.005, `${hero} exploited: ${result.loss.exploited}`);
    // OOP's opening bet, and IP's answer to it
    const line = result.lines.find((l) => l.path === (hero === 'oop' ? '' : 'allin 100'));
    line.engine.forEach((frequency, i) => assert.ok(Math.abs(frequency - line.solver[i]) < 0.02, `${hero} ${line.actions[i]}`));
  }
});

test('on a real river the engine is scored against the solver', { skip }, async () => {
  const sizes = { bet: '33%,75%', raise: '2.5x' };
  const game = {
    oopRange: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
    ipRange: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
    board: 'Td9d6hQc7s',
    pot: 100,
    stack: 200,
    betSizes: { river: { oop: sizes, ip: sizes } },
  };
  const strategist = new RangeStrategist({ engine: new ParetoEngine({ maxRaises: 2 }) });
  const result = await new SolverMatch(game, { strategist }).play('ip', { iterations: 300 });
  // It cannot beat equilibrium, and a best response does at least as well against it as GTO does
  assert.ok(result.loss.versusGto > -0.01);
  assert.ok(result.loss.exploited >= result.loss.versusGto - 0.01);
  assert.ok(result.loss.exploited < 0.5);
  // Facing each bet, the engine's fold frequency is the bet's alpha
  const facing = result.lines.find((line) => line.path === 'bet 33');
  assert.ok(Math.abs(facing.engine[0] - 33 / 133) < 1e-6);
});

test('with the solver deciding everywhere, nothing is lost; hand selection can be tested alone', { skip }, async () => {
  const sizes = { bet: '33%,75%', raise: '2.5x' };
  const game = {
    oopRange: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
    ipRange: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
    board: 'Td9d6hQc7s',
    pot: 100,
    stack: 200,
    betSizes: { river: { oop: sizes, ip: sizes } },
  };
  // The engine is asked nowhere: the solver's own strategy is locked and loses only its own error
  const solver = await new SolverMatch(game).play('oop', { iterations: 1000, target: 0.001, ranges: 'solver', where: () => false });
  assert.ok(Math.abs(solver.loss.versusGto) < 0.002 && solver.loss.exploited < 0.005, JSON.stringify(solver.loss));

  // Hand selection alone: the solver's range for the opponent and the solver's frequencies
  const selection = await new SolverMatch(game).play('oop', { iterations: 1000, target: 0.001, ranges: 'solver', frequencies: 'solver' });
  assert.equal(selection.frequencies, 'solver');
  assert.ok(selection.loss.exploited > 0.005 && selection.loss.exploited < 0.5);
  // The engine plays the solver's frequencies, with its own hands
  const root = selection.lines.find((line) => line.path === '');
  root.engine.forEach((frequency, i) => assert.ok(Math.abs(frequency - root.solver[i]) < 0.01, root.actions[i]));
  // Asked only on the first decision, it loses no more than when asked everywhere
  const first = await new SolverMatch(game).play('oop', { iterations: 1000, target: 0.001, ranges: 'solver', frequencies: 'solver', where: (d) => d.depth === 0 });
  assert.ok(first.loss.exploited <= selection.loss.exploited + 0.01);
});

test('reset clears every lock, so a best response is free again', { skip }, async () => {
  const bridge = new SolverBridge();
  try {
    await bridge.init(polar);
    await bridge.solve({ iterations: 2000, target: 0.0005 });
    await bridge.snapshot(1);
    await bridge.reset();
    await bridge.restore(1); // in position pinned to its equilibrium strategy
    assert.ok(Math.abs((await bridge.strategy([0])).strategy[0] - 0.75) < 0.02); // KK checks back 75%
    await bridge.reset();
    // Unlocked and unsolved, its strategy is back to an even split
    assert.ok(Math.abs((await bridge.strategy([0])).strategy[0] - 0.5) < 1e-6);
    // And it can best-respond: against an opponent who never bets it gets more than its equilibrium 25
    await bridge.lock([], [...Array(12).fill(1), ...Array(12).fill(1e-9)]);
    const [, inPosition] = await bridge.bestResponseEv();
    assert.ok(inPosition > 49, `in position gets ${inPosition}`);
  } finally {
    bridge.close();
  }
});
