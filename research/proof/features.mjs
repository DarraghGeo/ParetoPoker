// PROOF 2. The words for a hand are right. Each is checked two ways: named examples a player would
// recognise, and a count done differently (by suit and rank patterns) over every hand on many boards.
import assert from 'node:assert/strict';
import * as fs from 'poker-flopsolve';
import { features, groupOf } from '../../src/explain/features.js';
const combo = (text) => { const [a, b] = fs.parseCards(text); for (let c = 0; c < fs.COMBOS; c++) { const x = fs.COMBO_CARDS[2 * c], y = fs.COMBO_CARDS[2 * c + 1]; if ((x === a && y === b) || (x === b && y === a)) return c; } throw new Error(text); };
const f = (board, hand) => features(fs, fs.parseCards(board), combo(hand));
// ---- named examples ----
const cases = [
  ['Td9d6h', 'AdKd', { draw: 'flush draw', flushOuts: 9, pair: null, group: 'flush draw' }],
  ['Td9d6h', '8s7s', { made: 4, group: 'strong', draw: null }],
  ['Td9d6h', 'QsJs', { draw: 'open-ended', straightOuts: 8, group: 'straight draw' }],
  ['Td9d6h', 'KsQs', { draw: 'gutshot', straightOuts: 4, group: 'nothing' }],
  ['Td9d6h', 'AsTs', { pair: 'top pair', group: 'top pair', own: 1 }],
  ['Td9d6h', 'JsJc', { pair: 'overpair', group: 'top pair' }],
  ['Td9d6h', '8s8c', { pair: 'middle pair', group: 'lower pair', straightOuts: 4 }],
  ['Td9d6h', '2s2c', { pair: 'underpair', group: 'lower pair' }],
  ['Td9d6h', 'As6s', { pair: 'bottom pair', group: 'lower pair' }],
  ['Td9d6h', 'Ts9s', { made: 2, own: 2, group: 'strong' }],
  ['Td9d6h', '6s6c', { made: 3, group: 'strong' }],
  ['Td9d6h', 'AsKc', { pair: null, draw: null, group: 'nothing', own: 0 }],
  ['JhJc5d9s', 'AsKs', { made: 1, own: 0, group: 'nothing' }],           // the board's pair is not the hand's
  ['JhJc5d9s', 'As9c', { made: 2, own: 1, pair: 'middle pair', group: 'lower pair' }],
  ['JhJc5d9s', 'AsJs', { made: 3, own: 2, group: 'strong' }],
  ['JhJc5d9s', 'QsQc', { made: 2, own: 1, pair: 'overpair', group: 'top pair' }],
  ['As9s4s8h', 'KsQd', { draw: 'flush draw', flushOuts: 9 }],
  ['As9s4s8h', 'KsQs', { made: 5, group: 'strong', flushOuts: 0 }],
  ['As9s4s8h', 'KdQd', { flushOuts: 0, draw: null }],
  ['8h7h5c2c', '6h4h', { made: 4, group: 'strong' }],
  ['8h7h5c2c', 'Th9h', { flushOuts: 9, straightOuts: 6, draw: 'flush draw' }], // a jack or a six, less the two that are hearts
  ['QhTh4c2d', 'KhJh', { flushOuts: 9, straightOuts: 6, draw: 'flush draw' }],
  ['QhTh4c2d', 'KsJs', { straightOuts: 8, draw: 'open-ended' }],
  ['QhTh4c2d', 'AsKs', { straightOuts: 4, draw: 'gutshot' }],
  ['Td9d6hQc7s', 'AdKd', { flushOuts: 0, straightOuts: 0, draw: null }],   // nothing to come on the river
];
for (const [board, hand, want] of cases) {
  const got = f(board, hand); const all = { ...got, group: groupOf(got) };
  for (const [k, v] of Object.entries(want)) assert.equal(all[k], v, `${hand} on ${board}: ${k} is ${all[k]}, expected ${v}`);
}
// ---- counted another way, over every hand on many boards ----
let state = 11; const rand = (n) => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state % n; };
let checked = 0;
for (let trial = 0; trial < 400; trial++) {
  const n = 3 + (trial % 2); const board = []; while (board.length < n) { const c = rand(52); if (!board.includes(c)) board.push(c); }
  for (let c = 0; c < fs.COMBOS; c++) {
    const a = fs.COMBO_CARDS[2 * c], b = fs.COMBO_CARDS[2 * c + 1]; if (board.includes(a) || board.includes(b)) continue;
    const got = features(fs, board, c); checked++;
    // flush outs by counting suits: four of a suit with a hole card among them leaves nine (thirteen less four)
    const suits = [0, 0, 0, 0]; for (const x of [...board, a, b]) suits[fs.suitOf(x)]++;
    const boardSuits = [0, 0, 0, 0]; for (const x of board) boardSuits[fs.suitOf(x)]++;
    let want = 0;
    if (got.made < 5) for (let s = 0; s < 4; s++) if (suits[s] === 4 && boardSuits[s] < 4) want = 9;
    // a card that pairs the board can make a full house instead of a flush only if the hand is already trips or two pair: then it is not a flush out
    if (got.made < 2) assert.equal(got.flushOuts, want, `flush outs ${fs.formatCombo(c)} on ${fs.formatCards(board)}`);
    else assert.ok(got.flushOuts <= want, `flush outs at most ${want}`);
    // straight outs by ranks: a rank is an out when adding it gives five in a row (ace low too)
    if (got.made < 4) {
      const have = new Set([...board, a, b].map((x) => fs.rankOf(x)));
      const runs = (set) => { for (let lo = -1; lo <= 8; lo++) { let ok = true; for (let k = 0; k < 5; k++) { const r = lo + k; if (!set.has(r === -1 ? 12 : r)) { ok = false; break; } } if (ok) return true; } return false; };
      const boardRanks = new Set(board.map((x) => fs.rankOf(x)));
      let outs = 0;
      for (let x = 0; x < 52; x++) {
        if (board.includes(x) || x === a || x === b) continue;
        const r = fs.rankOf(x); if (!runs(new Set([...have, r]))) continue;
        if (runs(new Set([...boardRanks, r])) && board.length === 4) continue;           // the board's own straight
        const flushy = suits[fs.suitOf(x)] === 4;                                         // it makes a flush instead
        const next = fs.categoryOf(fs.evaluateCards([...board, x, a, b]));
        if (!flushy && next === 4) outs++;
      }
      assert.equal(got.straightOuts, outs, `straight outs ${fs.formatCombo(c)} on ${fs.formatCards(board)}`);
    }
    // a pair name implies the facts behind it
    const top = Math.max(...board.map((x) => fs.rankOf(x))); const low = Math.min(...board.map((x) => fs.rankOf(x)));
    const ra = fs.rankOf(a), rb = fs.rankOf(b); const onBoard = (r) => board.some((x) => fs.rankOf(x) === r);
    if (got.pair === 'overpair') assert.ok(ra === rb && ra > top);
    if (got.pair === 'underpair') assert.ok(ra === rb && ra < low);
    if (got.pair === 'top pair') assert.ok(ra !== rb && ((ra === top) || (rb === top)));
    if (got.pair === 'bottom pair') assert.ok(ra !== rb && (ra === low || rb === low));
    if (got.pair) assert.ok(got.own === 1 && (ra === rb || onBoard(ra) || onBoard(rb)));
    // and every hand whose cards pair it once is named
    if (got.own === 1 && got.made <= 2 && (ra === rb || onBoard(ra) !== onBoard(rb))) assert.ok(got.pair, `unnamed pair ${fs.formatCombo(c)} on ${fs.formatCards(board)}`);
  }
}
console.log(JSON.stringify({ proof: 'features', examples: cases.length, hands: checked, failures: 0 }));
