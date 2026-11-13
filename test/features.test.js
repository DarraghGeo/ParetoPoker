import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Equity, Range, cards, handFeatures } from '../src/index.js';

const OOP = '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s';
const IP = 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+';
const id = cards.parseCombo;
const equity = new Equity();
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('matchups give one hand against another, runout by runout', () => {
  const river = equity.matchups(cards.parseCards('2s3h4d6c7c'), [id('AsAh'), id('QsQh')], [id('KsKh'), id('AsKd')]);
  assert.equal(river[0], 1);            // AA beats KK
  assert.ok(Number.isNaN(river[1]));    // AsAh and AsKd share a card
  assert.equal(river[2], 0);            // QQ loses to KK
  // On the turn KK needs a king (2 cards); a five puts a straight on the board for a tie (4 cards)
  const turn = equity.matchups(cards.parseCards('2s3h4d6c'), [id('AsAh')], [id('KsKh')]);
  near(turn[0], (38 + 4 * 0.5) / 44);
});

test('the matchup average is the equity against the range', () => {
  const board = cards.parseCards('Td9d6h2c');
  const hero = Range.from(IP).without(board).weights;
  const villain = Range.from(OOP).without(board).weights;
  const villainIds = [...villain.keys()].filter((i) => villain[i] > 0);
  const hand = id('AsTs');
  const row = equity.matchups(board, [hand], villainIds);
  let sum = 0;
  let count = 0;
  row.forEach((e) => { if (!Number.isNaN(e)) { sum += e; count++; } });
  // Close but not identical: a blocked river card removes different runouts for different villain hands
  near(sum / count, equity.against(board, villain, hero)[hand], 0.01);
});

test('spread and slope describe equity against his enumerated range', () => {
  const board = cards.parseCards('Td9d6h2c');
  const hero = Range.from(`${IP},AdKd`).without(board).weights;
  const villain = Range.from(OOP).without(board).weights;
  const f = handFeatures({ equity, board, hero, villain });
  // A draw has about the same equity against everything; a small pair crushes or is crushed
  assert.ok(f.spread[id('QsJs')] > f.spread[id('3s3h')]);
  assert.ok(f.slope[id('QsJs')] < f.slope[id('3s3h')]);
  for (const i of [id('QsJs'), id('3s3h'), id('8s7s')]) {
    assert.ok(f.spread[i] >= 0 && f.spread[i] <= 1 && f.slope[i] >= 0 && f.slope[i] <= 1);
  }
  // On the river every matchup is won, lost or tied: a hand that beats some and loses to others jumps
  const river = cards.parseCards('Td9d6h2c7s');
  const r = handFeatures({ equity, board: river, hero: Range.from(IP).without(river).weights, villain: Range.from(OOP).without(river).weights });
  assert.ok(r.slope[id('JsJh')] > 0.95);
  assert.equal(r.drawEquity, undefined);
});

test('with cards to come: draw equity, swing, E[HS^2] and implied odds', () => {
  const board = cards.parseCards('Td9d6h2c');
  const hero = Range.from(`${IP},AdKd`).without(board).weights;
  const villain = Range.from(OOP).without(board).weights;
  const f = handFeatures({ equity, board, hero, villain, pot: 100, behind: 300 });
  const [draw, set, straight] = [id('QsJs'), id('9s9h'), id('8s7s')];
  // An open-ender is behind now and wins by improving; a set is ahead and does not need to
  assert.ok(f.strengthNow[draw] < 0.2 && f.strengthNow[set] > 0.9);
  assert.ok(f.drawEquity[draw] > 0.15 && f.drawEquity[set] < 0.02);
  assert.ok(f.swing[draw] > f.swing[set]);
  assert.ok(f.bestCard[draw] > 0.9 && f.upside[draw] > f.upside[straight]);
  // E[HS^2] is equity squared plus the variance of the river equity
  for (const i of [draw, set, straight]) assert.ok(f.ehs2[i] >= f.equity[i] ** 2 - 1e-9);
  near(f.ehs2[draw] - f.equity[draw] ** 2, f.swing[draw] ** 2, 0.01);
  // Implied odds: nothing behind, nothing to win; more behind, more to win, with less each time
  const at = (behind) => handFeatures({ equity, board, hero, villain, pot: 100, behind }).impliedOdds[draw];
  assert.equal(at(0), 0);
  assert.ok(at(300) > at(100) && at(300) - at(100) < at(100));
  near(at(100), 0.5 * (f.bestCard[draw] - f.equity[draw]));
  assert.ok(f.impliedOdds[draw] > f.impliedOdds[set]);
});
