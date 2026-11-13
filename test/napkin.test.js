import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from 'poker-extval';
import {
  DRAW, Equity, NapkinSelector, PAIR, ParetoEngine, Range, RangeStrategist, SelectionContext, cards, classifyHands,
} from '../src/index.js';

const OOP = '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s';
const IP = 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+';
const id = cards.parseCombo;
const equity = new Equity();

function context({ board, position, spot, hero = position === 'ip' ? IP : OOP, villain = position === 'ip' ? OOP : IP }) {
  const ids = cards.parseCards(board);
  return new SelectionContext({
    equity, position, spot, board: ids, actions: [],
    hero: Range.from(hero).without(ids).weights,
    villain: Range.from(villain).without(ids).weights,
  });
}

test('hands are classified by pair and draw', () => {
  const { pair, draw, highCard } = classifyHands(cards.parseCards('Td9d6h'));
  assert.equal(draw[id('AdKd')], DRAW.NUT);      // nut flush draw
  assert.equal(draw[id('KdQd')], DRAW.NUT);      // flush draw with a gutshot
  assert.equal(draw[id('QsJs')], DRAW.STRONG);   // open-ended
  assert.equal(draw[id('KsJs')], DRAW.GUTSHOT);
  assert.equal(pair[id('8s7s')], PAIR.TOP_OR_BETTER); // a straight
  assert.equal(pair[id('JsJh')], PAIR.TOP_OR_BETTER); // an overpair
  assert.equal(pair[id('AsTs')], PAIR.TOP_OR_BETTER);
  assert.equal(pair[id('As9s')], PAIR.BOARD_PAIR);
  assert.equal(pair[id('8s8h')], PAIR.POCKET_MIDDLE);
  assert.equal(pair[id('5s5h')], PAIR.POCKET_UNDER);
  assert.equal(highCard[id('AsKs')], 1);
  // A pair on the board is nobody's pair
  assert.equal(classifyHands(cards.parseCards('8s8d4c2h')).pair[id('AsKs')], PAIR.NONE);
  // No draws on the river
  assert.equal(classifyHands(cards.parseCards('Td9d6hQc2s')).draw[id('AdKd')], DRAW.NONE);
});

test('draws agree with poker-extval on every hand', () => {
  for (const text of ['Td9d6h', 'Ks7h2d5c', '5h4h3c', 'QsJs9s2d']) {
    const board = text.match(/.{2}/g);
    const { draw } = classifyHands(cards.parseCards(text));
    for (let i = 0; i < cards.NUM_COMBOS; i++) {
      const name = cards.comboName(i);
      const hole = [name.slice(0, 2), name.slice(2)];
      if (hole.some((card) => board.includes(card))) continue;
      const flags = evaluate([...hole, ...board]);
      if (flags.isStraight || flags.isFlush || flags.isFullHouse || flags.isFourOfAKind || flags.isStraightFlush) continue;
      assert.equal(draw[i] > 0, flags.isFlushDraw || flags.isStraightDraw, `${name} on ${text}`);
    }
  }
});

test('thin value and some of the nuts check out of position on the river', () => {
  const board = 'Ks7h2d5c9s';
  const spot = { street: 'river', pot: 100, stack: 250 };
  const actions = [{ type: 'check' }, { type: 'bet', to: 25 }]; // small, so thin hands qualify as value
  const node = (position) => {
    const c = context({ board, position, spot });
    return { position, spot, board: c.board, hero: c.hero, villain: c.villain, actions, strength: c.strength };
  };
  // The guide's own rules, without the measured defaults
  const guide = { valueThreshold: 0.5, oopValueChecks: 0 };
  const decide = (position, options) => new RangeStrategist({ selector: new NapkinSelector({ ...guide, ...options }) }).decide(node(position));

  const oop = node('oop');
  const thin = [...oop.hero.keys()].filter((i) => oop.hero[i] > 0 && oop.strength[i] >= 0.5 && oop.strength[i] <= 0.7);
  assert.ok(thin.length > 5);
  const { strategy } = decide('oop');
  for (const i of thin) assert.equal(strategy[1][i], 0, cards.comboName(i));
  // With the rule off, some of them bet
  const all = decide('oop', { thinValue: null }).strategy;
  assert.ok(thin.some((i) => all[1][i] > 0));

  // The very best hand sometimes checks to check-raise, unless traps are off
  const best = (n) => n.strength.reduce((top, e, i) => (n.hero[i] > 0 && e > n.strength[top] ? i : top), n.hero.findIndex((w) => w > 0));
  const nuts = best(oop);
  assert.ok(strategy[0][nuts] > 0);
  assert.equal(decide('oop', { trapShare: 0 }).strategy[1][nuts], 1);
  // In position nothing is trapped
  assert.equal(decide('ip').strategy[1][best(node('ip'))], 1);
  // By default every value hand keeps a fifth of its combos back out of position, the nuts included
  const defaults = new RangeStrategist({ selector: new NapkinSelector() }).decide(node('oop')).strategy;
  assert.ok(Math.abs(defaults[0][nuts] - 0.2) < 1e-9);
});

test('river bluffs are the weakest hands, with blockers choosing among twins', () => {
  const c = context({ board: 'Td9d6hQc7s', position: 'ip', spot: { street: 'river', pot: 100, stack: 250 } });
  const wager = new ParetoEngine().wager('ip', c.spot, 75);
  const weakest = new NapkinSelector().bluff(c, wager);
  // Less equity always comes first
  assert.ok(weakest[id('Ks5s')] > weakest[id('As2s')] && weakest[id('As2s')] > weakest[id('AsKh')]);
  assert.ok(weakest[id('AsKh')] > weakest[id('4s4h')]);
  // Two ace-high hands with the same equity are twins: only their blockers tell them apart
  const twins = [id('As2s'), id('Ah3h')];
  assert.ok(Math.abs(c.strength[twins[0]] - c.strength[twins[1]]) < 0.02);

  // The guide's order: air first, by what it blocks
  const scores = new NapkinSelector({ riverBluffs: 'air' }).bluff(c, wager);
  // Both are air, but a king blocks the nut straight (KJ); a small pair has showdown value and waits
  assert.ok(scores[id('Ks5s')] > scores[id('As2s')]);
  assert.ok(scores[id('As2s')] > scores[id('4s4h')]);
});

test('on the turn, draws and top pair call before weak pairs and high cards', () => {
  const selector = new NapkinSelector({ callFloor: 0 }); // the order alone, whatever the price
  const hero = `${IP},AdKd,Ah4h`;
  const facing = (position, stack) => context({
    board: 'Td9d6h2c', position, hero, villain: 'TT-99,66,AA,KK,QQ,JJ,ATs,KTs,QTs,8d7d,AdQd,KdQd,KsQs,AsKs,AsQs',
    spot: { street: 'turn', pot: 150, toCall: 50, stack },
  });
  const [draw, topPair, weakPair, aceHigh] = [id('KdQd'), id('AsTs'), id('3s3h'), id('Ah4h')];
  const ip = selector.call(facing('ip', 400));
  assert.ok(ip[draw] > ip[topPair] && ip[topPair] > ip[weakPair] && ip[weakPair] > ip[aceHigh]);
  // With nothing behind, or out of position, a draw is worth its equity and top pair goes first
  const allIn = selector.call(facing('ip', 50));
  assert.ok(allIn[topPair] > allIn[draw]);
  const oop = selector.call(facing('oop', 400));
  assert.ok(oop[topPair] > oop[draw]);
});

test('river raises need more equity the bigger they are', () => {
  const c = context({ board: 'Td9d6hQc7s', position: 'ip', spot: { street: 'river', pot: 150, toCall: 50, stack: 1000 } });
  const engine = new ParetoEngine();
  const selector = new NapkinSelector({ valueThreshold: 0.5 }); // Newman's sizes alone
  const count = (to, least) => {
    const scores = selector.value(c, engine.wager('ip', c.spot, to));
    const hands = [...scores.keys()].filter((i) => !Number.isNaN(scores[i]));
    for (const i of hands) assert.ok(c.strength[i] >= least - 1e-9, cards.comboName(i));
    return hands.length;
  };
  // Pot after a call is 200: a raise to 150 is half a pot more, to 250 a pot, to 650 three pots
  const half = count(150, 0.8);
  const pot = count(250, 0.9);
  const three = count(650, 0.97);
  assert.ok(half > pot && pot >= three && three > 0);
});

test('turn bluff raises are draws first, and every hand is a candidate after them', () => {
  const c = context({ board: 'Td9d6h2c', position: 'ip', spot: { street: 'turn', pot: 150, toCall: 50, stack: 400 } });
  const scores = new NapkinSelector().bluff(c, new ParetoEngine().wager('ip', c.spot, 150));
  assert.ok(scores[id('Ad5d')] > scores[id('QsJs')]);  // nut flush draw, then an open-ender
  assert.ok(scores[id('QsJs')] > scores[id('KsJs')]);  // then a gutshot
  assert.ok(scores[id('KsJs')] > scores[id('3s3h')]);  // then hands with no draw
  assert.ok([...scores.keys()].every((i) => !(c.hero[i] > 0) || !Number.isNaN(scores[i])));
});
