// Equity against a range, each next card, and its two parts: numbers recorded from the app's first, hand-written
// implementation, which the poker-bitvaljs one must reproduce.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'poker-flopsolve';
import { bothEquities, equityVs } from '../src/solver/equity.js';
import { drawParts, nextCards } from '../src/explain/street/cards-to-come.js';

const board = fs.parseCards('Ks9d4s'); const mine = fs.parseRange('AA,KQs,T9s:0.5,76s'); const his = fs.parseRange('QQ-TT,AKo,JTs,98s:0.3');
const taken = new Uint8Array(52); for (const c of board) taken[c] = 1; const f = { board, mine, his, taken };
const id = (text) => { const want = text.match(/../g).sort().join(''); for (let c = 0; c < fs.COMBOS; c++) if (fs.formatCombo(c).match(/../g).sort().join('') === want) return c; throw new Error(text); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} against ${b}`);
const REF = {"names":["AhAd","KhQh","Th9h","7s6s"],"eq":[0.8519568444299602,0.693732693732693,0.2266249451032104,0.37572274468826145],"now":[1,0.7945205479452054,0.22330097087378642,0],"first":["2s",0.8157380254154449],"count":49};

test('equity against a range matches the recorded numbers', () => {
  const e = equityVs(fs, board, mine, his);
  REF.names.forEach((name, i) => near(e[id(name)], REF.eq[i]));
  assert.ok(Number.isNaN(e[id('2h2d')]));
});
test('both sides come from one pass and agree with each on its own', () => {
  const [a, b] = bothEquities(fs, board, mine, his); const one = equityVs(fs, board, his, mine);
  near(a[id('AhAd')], equityVs(fs, board, mine, his)[id('AhAd')]); near(b[id('QhQd')], one[id('QhQd')]);
});
test('each next card and the two parts match the recorded numbers', () => {
  const cards = nextCards(fs, f); const parts = drawParts(fs, f); const e = equityVs(fs, board, mine, his);
  assert.equal(cards.length, REF.count);
  near(cards.find((k) => fs.formatCards([k.card]) === REF.first[0]).eq[id('AhAd')], REF.first[1]);
  // how each stands with no more cards dealt, counted by hand: the aces beat everything, seven high nothing, and king-queen
  // beats 19.9 of the 25.9 combinations of his it does not block (QQ 3, JJ 6, TT 6, JTs 4, 98s 0.9 against AKo 6)
  near(parts.now[id('AhAd')], 1); near(parts.now[id('7s6s')], 0); near(parts.now[id('KhQh')], 19.9 / 25.9);
  REF.names.forEach((name) => near(parts.draw[id(name)], e[id(name)] - parts.now[id(name)]));
  assert.equal(drawParts(fs, { ...f, board: fs.parseCards('Ks9d4s7h2c') }), null);
});
