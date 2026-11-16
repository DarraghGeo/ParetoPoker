// The player's rules: which one applies at a decision and what it says.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'poker-flopsolve';
import { follows, ruleFor, RULES } from '../src/rules/rules.js';
import { ruleAt } from '../src/rules/at.js';

const base = { toCall: 0, pot: 10, raised: false, raiser: 'ip', draw: false, topPair: () => ({ mine: 0.3, his: 0.3 }), hisShape: () => ({ strong: 0.1, weak: 0.5 }) };
const at = (c) => ruleFor({ ...base, ...c });

test('first to act: the flop by seat and raiser, the turn by equity or a draw, the river by value and bluffs', () => {
  assert.deepEqual([at({ street: 0, ip: true, equity: 0.1 }).id, at({ street: 0, ip: true, equity: 0.1 }).says], ['flop-ip', 'bet']);
  assert.equal(at({ street: 0, ip: false, raiser: 'oop', equity: 0.1 }).id, 'flop-oop-raiser');
  assert.equal(at({ street: 0, ip: false, equity: 0.9 }).says, 'check');   // no range advantage
  assert.equal(at({ street: 0, ip: false, equity: 0.75, topPair: () => ({ mine: 0.35, his: 0.3 }) }).says, 'bet');
  assert.equal(at({ street: 1, ip: true, equity: 0.45 }).says, 'check'); assert.equal(at({ street: 1, ip: true, equity: 0.45, draw: true }).says, 'bet');
  assert.equal(at({ street: 2, ip: true, equity: 0.85 }).says, 'bet'); assert.equal(at({ street: 2, ip: true, equity: 0.5 }).says, 'check');
  assert.equal(at({ street: 2, ip: true, equity: 0.1 }).says, 'bet');   // under his weak share less 20
  assert.equal(at({ street: 2, ip: false, equity: 0.9, hisShape: () => ({ strong: 0.25, weak: 0.5 }) }).says, 'check');
});
test('facing a bet: the price and the margin of the seat and street, and the river raise', () => {
  const bet = { toCall: 5, pot: 15 };   // half the pot: the price is 25%
  assert.equal(at({ ...bet, street: 0, ip: true, equity: 0.31 }).says, 'continue'); assert.equal(at({ ...bet, street: 0, ip: false, equity: 0.31 }).says, 'fold');
  assert.equal(at({ ...bet, street: 1, ip: true, equity: 0.26 }).says, 'continue'); assert.equal(at({ ...bet, street: 1, ip: false, equity: 0.33 }).says, 'fold');
  assert.equal(at({ ...bet, street: 2, ip: false, equity: 0.26 }).says, 'call'); assert.equal(at({ ...bet, street: 2, ip: false, equity: 0.8 }).says, 'raise');
  assert.equal(at({ ...bet, street: 1, ip: true, raised: true, equity: 0.28 }).id, 'face-raise');
  for (const id of ['flop-ip', 'face-river', 'face-raise', 'turn-oop']) assert.ok(RULES[id]);
});
test('an action follows a rule by its kind', () => {
  assert.ok(follows('continue', 'call', true)); assert.ok(follows('continue', 'raise', true)); assert.ok(!follows('continue', 'fold', true));
  assert.ok(follows('bet', 'bet', false)); assert.ok(follows('bet', 'allin', false)); assert.ok(!follows('check', 'bet', false)); assert.ok(follows('fold', 'fold', true));
});
test('the rule at a decision reads equity and draws off the ranges', () => {
  const board = fs.parseCards('Ks9d4s7h'); const mine = fs.parseRange('AsQs,KdQd,7c6c'); const his = fs.parseRange('QQ-TT,AKo,JTs');
  const id = (text) => { const want = text.match(/../g).sort().join(''); for (let c = 0; c < fs.COMBOS; c++) if (fs.formatCombo(c).match(/../g).sort().join('') === want) return c; throw new Error(text); };
  const d = { board, mine, his, ip: true, toCall: 0, pot: 10, raised: false, raiser: 'ip' };
  const draw = ruleAt(fs, { ...d, combo: id('AsQs') }); assert.equal(draw.id, 'turn-ip'); assert.equal(draw.says, 'bet'); assert.match(draw.why, /a draw/);
  assert.ok(ruleAt(fs, { ...d, combo: id('KdQd') }).equity > 0.5);
});
