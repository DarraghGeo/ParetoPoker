import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RangeManager } from 'poker-rangeman';
import { ParetoEngine, math } from '../src/index.js';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} != ${expected}`);

test('alpha, mdf and pot odds agree with poker-rangeman', () => {
  const reference = new RangeManager('AA').bettingMath({ pot: 100, bet: 75 });
  near(math.alpha(75, 100), reference.alpha);
  near(math.mdf(75, 100), reference.mdf);
  near(math.potOdds(75, 175), reference.potOdds);
  const wager = new ParetoEngine().wager('ip', { street: 'river', pot: 100, stack: 500 }, 75);
  near(wager.bluffShare, reference.bluffShare);
  near(wager.valueToBluff, reference.valueToBluff);
});

test('geometric sizing gets all-in on the last street', () => {
  for (const streets of [1, 2, 3]) {
    let pot = 100;
    let stack = 900;
    const fraction = math.geometricFraction(pot, stack, streets);
    for (let i = 0; i < streets; i++) {
      const bet = fraction * pot;
      stack -= bet;
      pot += 2 * bet;
    }
    near(stack, 0);
  }
});

test('facing a bet, the engine continues exactly the minimum defence frequency', () => {
  const engine = new ParetoEngine();
  for (const bet of [25, 50, 100, 200]) {
    const spot = { street: 'river', pot: 100 + bet, toCall: bet, stack: 1000 };
    for (const answer of [engine.inPositionFacingBet(spot), engine.outOfPositionFacingBet(spot)]) {
      near(answer.fold, bet / (100 + bet));
      near(answer.call + answer.raise, 100 / (100 + bet));
      // A pure bluff of `bet` into 100 makes nothing: it wins 100 when we fold and loses `bet` otherwise
      near(answer.fold * 100 - (1 - answer.fold) * bet, 0);
    }
  }
});

test('facing a raise, the fold frequency is priced on the chips the raiser added', () => {
  // Pot 100, hero bets 50, villain raises to 150: they risk 150 to win 150
  const answer = new ParetoEngine().outOfPositionFacingRaise({
    street: 'river', pot: 300, toCall: 100, invested: 50, stack: 400, raises: 1,
  });
  near(answer.fold, 0.5);
  near(answer.potOdds, 0.25);
  // A 4-bet: hero bet 50, villain 150, hero 400, villain 900. Villain added 750 to win 100 + 400 + 150
  const fourBet = new ParetoEngine().outOfPositionFacingRaise({
    street: 'river', pot: 100 + 400 + 900, toCall: 500, invested: 400, facing: 750, stack: 2000, raises: 3,
  });
  near(fourBet.fold, 750 / 1400);
});

test('river bets and raises make a bluff catcher indifferent to calling', () => {
  const engine = new ParetoEngine({ sizing: 'mixed' });
  const bets = engine.inPositionFacingCheck({ street: 'river', pot: 100, stack: 400 }, { valueShare: 0.2 });
  const raises = engine.inPositionFacingBet({ street: 'river', pot: 150, toCall: 50, stack: 400 }, { valueShare: 0.1 });
  for (const [pot, invested, wagers] of [[100, 0, bets.sizes], [150, 50, raises.sizes]]) {
    for (const w of wagers) {
      assert.ok(w.value > 0 && w.bluff > 0);
      const toCall = w.to - invested;
      const callEv = (w.bluff * (pot + w.add) - w.value * toCall) / w.frequency;
      near(callEv, 0, `calling a bet to ${w.to}`);
    }
  }
  near(bets.check + bets.bet, 1);
});

test('earlier streets carry more bluffs, since a bluff can fire again', () => {
  const engine = new ParetoEngine();
  const share = (street) => engine.wager('ip', { street, pot: 100, stack: 1000 }, 75).bluffShare;
  assert.ok(share('flop') > share('turn') && share('turn') > share('river'));
  near(share('river'), 75 / 250);
  near(share('turn'), 1 - (175 / 250) * (1.75 / 2.5)); // two streets of 75% pot
  const flat = new ParetoEngine({ multiStreetBluffs: false });
  near(flat.wager('ip', { street: 'flop', pot: 100, stack: 1000 }, 75).bluffShare, 75 / 250);
});

test('the raise cap turns raises off', () => {
  const engine = new ParetoEngine({ maxRaises: 2 });
  const spot = { street: 'turn', pot: 300, toCall: 100, invested: 50, stack: 800 };
  assert.ok(engine.inPositionFacingRaise({ ...spot, raises: 1 }).raise > 0);
  const capped = engine.inPositionFacingRaise({ ...spot, raises: 2 });
  assert.equal(capped.raise, 0);
  near(capped.call, capped.mdf);
  // Nothing behind after a call: no raise either
  assert.equal(engine.inPositionFacingBet({ street: 'river', pot: 200, toCall: 100, stack: 100 }).raise, 0);
});

test('raise frequency, sizes and per-position settings are configurable', () => {
  const engine = new ParetoEngine({ raiseFrequency: 0.25, raiseSizes: [3, 'allin'], sizing: 'smallest', outOfPosition: { sizing: 'largest' } });
  const spot = { street: 'river', pot: 150, toCall: 50, stack: 600 };
  const ip = engine.inPositionFacingBet(spot);
  near(ip.raise, 0.25 * ip.mdf);
  assert.deepEqual(ip.sizes.map((w) => w.to), [150, 600]);
  assert.equal(ip.sizes[0].weight, 1);
  assert.equal(engine.outOfPositionFacingBet(spot).sizes[1].weight, 1);
  // Options from the spot win over the configured sizes
  assert.deepEqual(engine.inPositionFacingBet({ ...spot, options: [120] }).sizes.map((w) => w.to), [120]);
});

test('geometric sizing picks the option nearest the geometric bet', () => {
  const engine = new ParetoEngine();
  // Pot 100, stack 400, turn: two streets, so bet the pot twice
  near(engine.geometricTarget({ street: 'turn', pot: 100, stack: 400 }), 100);
  const answer = engine.outOfPositionOpen({ street: 'turn', pot: 100, stack: 400, options: [33, 75, 110, 400] });
  assert.deepEqual(answer.sizes.map((w) => w.weight), [0, 0, 1, 0]);
});
