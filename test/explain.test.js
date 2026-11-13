import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';
import { explain, survey } from '../src/explain/river.js';

const spot = fs.defineSpot({ board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s', ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
  betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 });
const run = fs.createRun(spot, {});
run.step(400);
const solution = run.snapshot();
const nodes = treeOf(fs, spot);

test('the tree is read with what each player has put in', () => {
  assert.equal(nodes[0].seat, 'oop');
  const bet = nodes[0].edges.find((e) => e.kind === 'bet');
  assert.equal(nodes[bet.child].seat, 'ip');
  assert.deepEqual(nodes[bet.child].invested, [bet.to, 0]);
});

test('facing a bet: hands clear of the price never fold, hands short of it are told why', () => {
  const bet = nodes[0].edges.find((e) => e.kind === 'bet');
  const s = survey(decisionAt(fs, solution, nodes, bet.child));
  assert.ok(Math.abs(s.need - 33 / 166) < 1e-9);
  const strong = s.rows.filter((r) => r.equity - s.need > 0.1);
  assert.ok(strong.length > 20);
  for (const r of strong) assert.ok(r.hand.strategy[0] < 0.05, `${r.hand.name} folds ${r.hand.strategy[0]}`);
  const weak = s.rows.find((r) => r.equity - s.need < -0.1 && r.hand.strategy[0] > 0.95);
  const told = explain(s, weak.hand.name);
  // Calling is a mistake for it (folding and a bluff raise may both be fine)
  assert.ok(weak.gaps[1] > 0.005, `calling costs ${weak.gaps[1]}`);
  assert.ok(told.reasons.some((x) => x.id === 'price' && /short/.test(x.text)));
  // nothing in an explanation only restates the strategy
  assert.ok(!/are worth the same to it\.$|^Indifferent/.test(told.line));
});

test('first to act: every hand gets a status and at least one reason beyond it', () => {
  const s = survey(decisionAt(fs, solution, nodes, 0));
  for (const r of s.rows) {
    const told = explain(s, r.hand.name);
    assert.ok(told.status === 'forced' || told.status === 'optional');
    assert.ok(told.line.length > 10, r.hand.name);
  }
  // Bluffs are close to the share the price allows
  const size = s.sizes.find((x) => x && x.frequency > 0.1);
  assert.ok(Math.abs(size.bluffShare - size.wanted) < 0.12, `${size.bluffShare} against ${size.wanted}`);
});

test('warp: a drawn curve solves and its levels can be explained', async () => {
  const { warpGame } = await import('../src/warp/game.js');
  const n = 40;
  const game = warpGame({ equities: Array.from({ length: n }, (_, i) => (i + 0.5) / n), pot: 100, stack: 200, bets: [0.75], raise: 0 });
  assert.equal(game.nodes[0].seat, 'oop');
  const s = survey(game.decisionAt(0));
  assert.equal(s.rows.length, n);
  // weakest and strongest cards bet more than the middle
  const bet = (i) => 1 - s.rows[i].hand.strategy[0];
  assert.ok(bet(0) > bet(20) && bet(n - 3) > bet(20), `${bet(0)} ${bet(20)} ${bet(n - 3)}`);
  assert.ok(explain(s, s.rows[n - 3].hand.name).line.length > 10);
});

test('the spot profile reads the two ranges', async () => {
  const { RangeManager } = await import('poker-rangeman');
  const { profile } = await import('../src/explain/profile.js');
  const p = await profile(RangeManager, { oop: '66+,A8s+,AJo+,KQs', ip: 'QQ-22,AQs-A2s,KJs+', board: ['Td', '9d', '6h', 'Qc', '7s'] });
  assert.ok(p && typeof p.advantage.range === 'number' && p.text.length > 20);
});

test('reshaping a range: the dials move its equity, its nuts, its shape and its ceiling', async () => {
  const { describe, reshape, NEUTRAL } = await import('../src/warp/reshape.js');
  const n = 200;
  const weights = new Float64Array(n).fill(1);
  const equity = Float64Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  const base = describe(weights, equity);
  assert.deepEqual(Array.from(reshape(weights, equity, NEUTRAL)), Array.from(weights));
  assert.ok(describe(reshape(weights, equity, { ...NEUTRAL, edge: 0.8 }), equity).equity > base.equity + 0.05);
  assert.ok(describe(reshape(weights, equity, { ...NEUTRAL, polar: 0.8 }), equity).polar > base.polar + 0.05);
  assert.ok(describe(reshape(weights, equity, { ...NEUTRAL, nuts: 0 }), equity).nuts < 0.001);
  assert.ok(describe(reshape(weights, equity, { ...NEUTRAL, cap: 0.7 }), equity).top <= 0.7);
});

test('bending the curve: lifting the middle moves weight up, and no hand gains weight', async () => {
  const { bend, describe, KNOBS } = await import('../src/warp/reshape.js');
  const n = 200;
  const weights = new Float64Array(n).fill(1);
  const equity = Float64Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  const flat = bend(weights, equity, KNOBS.map(() => 0));
  assert.ok(Math.abs(describe(flat, equity).equity - 0.5) < 0.01);
  const lifted = bend(weights, equity, [0, 0.15, 0.2, 0.15, 0]);
  assert.ok(describe(lifted, equity).equity > 0.55);
  for (let i = 0; i < n; i++) assert.ok(lifted[i] <= 1 + 1e-9);
  // the median hand of the new range has about the equity asked for
  const order = [...lifted.keys()]; let seen = 0; const total = lifted.reduce((a, b) => a + b, 0); let median = 0;
  for (const i of order) { seen += lifted[i]; if (seen >= total / 2) { median = equity[i]; break; } }
  assert.ok(Math.abs(median - 0.7) < 0.04, `median ${median}`);
});

test('a flop spot is read on every street, on the cards dealt', async () => {
  const fs = await import('poker-flopsolve');
  const { treeOf, decisionAt, equityVs } = await import('../src/solver/flopsolve.js');
  const { outline } = await import('../src/explain/outline.js');
  const spot = fs.defineSpot({ board: 'Td9d6h', pot: 100, stack: 200, oop: 'AA,KK,76s,A5s,QJs', ip: 'QQ,JJ,98s,KQs,87s', betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
  const run = fs.createRun(spot, {}); run.step(40);
  const solution = run.snapshot(); const nodes = treeOf(fs, spot);
  const flop = decisionAt(fs, solution, nodes, 0);
  assert.equal(flop.street, 'flop');
  assert.ok(flop.hands.every((h) => h.strength === null && h.equity >= 0 && h.equity <= 1 && h.values === null));
  const laid = outline(flop);
  assert.ok(Math.abs(laid.mix.reduce((t, x) => t + x, 0) - 1) < 1e-9);
  // check, check, and a turn is dealt
  const deal = nodes[nodes[nodes[0].edges[0].child].edges[0].child];
  assert.equal(deal.kind, 'chance');
  const next = deal.edges[0].child;
  assert.equal(decisionAt(fs, solution, nodes, next, []), null);
  // two turns that mirror each other are one stored board: the same range arrives, suits swapped
  const [a, b] = ['2c', '2s'].map((card) => decisionAt(fs, solution, nodes, next, fs.parseCards(card)));
  assert.equal(a.street, 'turn');
  assert.ok(a.hands.every((h) => !h.cards.some((c) => a.board.includes(c))));
  const weight = (d) => d.hands.reduce((t, h) => t + h.weight, 0);
  assert.ok(Math.abs(weight(a) - weight(b)) < 1e-9);
  // and the river under it has made hands and action values again
  const turn = nodes[next];
  const river = decisionAt(fs, solution, nodes, nodes[nodes[turn.edges[0].child].edges[0].child].edges[0].child, fs.parseCards('2c 7s'));
  assert.equal(river.street, 'river');
  assert.ok(river.hands.every((h) => h.strength > 0 && h.values));
  // equity on a finished board against one hand is a plain comparison
  const board = fs.parseCards('Td9d6h2c7s');
  const eq = equityVs(fs, board, fs.parseRange('AA,54s'), fs.parseRange('KK'));
  const held = [...eq].filter((x) => !Number.isNaN(x));
  assert.equal(held.filter((x) => x === 1).length, 6); assert.equal(held.filter((x) => x === 0).length, 4); assert.equal(held.length, 10);
});
