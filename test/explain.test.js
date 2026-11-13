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
