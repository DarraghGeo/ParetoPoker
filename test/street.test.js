import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../src/solver/flopsolve.js';
import { frameAt, actionValues, byReply, byCard } from '../src/explain/account.js';
import { evaluator } from '../src/explain/best.js';
import { features, groupOf } from '../src/explain/features.js';
import { study, measure, claims, holds, tolerance, explainStreet, describe } from '../src/explain/street.js';

// A small turn spot, solved finely: quick, and every kind of node is in it
const spot = fs.defineSpot({ board: 'Td9d6hQc', pot: 100, stack: 200, oop: 'AA,KK,QQ,AKs,AQs,KQs,JTs,98s,87s,76s,A5s,KJs,QJs,T9s', ip: 'JJ,TT,99,AQs,AJs,KQs,KJs,QJs,J9s,T8s,97s,65s,AdKd,Ad5d,8d7d', betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
const run = fs.createRun(spot, {}); let exploit = 9; while (exploit > 0.02) { run.step(20); exploit = run.exploitabilityPercent(); }
const solution = run.snapshot(); const nodes = treeOf(fs, spot); const pot0 = nodes[0].pot;
const combo = (text) => { const [a, b] = fs.parseCards(text); for (let c = 0; c < fs.COMBOS; c++) { const x = fs.COMBO_CARDS[2 * c], y = fs.COMBO_CARDS[2 * c + 1]; if ((x === a && y === b) || (x === b && y === a)) return c; } throw new Error(text); };

test('accounting: the splits by his reply and by the next card add back to an action\'s value', () => {
  const bet = nodes[0].edges.findIndex((e) => e.kind === 'bet');
  for (const id of [0, nodes[0].edges[bet].child]) {
    const f = frameAt(fs, solution, nodes, id); const values = actionValues(f);
    f.node.edges.forEach((edge, a) => {
      const replies = byReply(f, a); const cards = byCard(f, a);
      for (let c = 0; c < fs.COMBOS; c++) {
        if (Number.isNaN(values[a][c])) continue;
        if (replies) assert.ok(Math.abs(replies.reduce((t, r) => t + r.value[c], 0) - values[a][c]) < 1e-8);
        if (cards) assert.ok(Math.abs(cards.reduce((t, k) => t + (Number.isNaN(k.value[c]) ? 0 : k.value[c]), 0) - values[a][c]) < 1e-8);
        if (edge.kind === 'fold') assert.ok(Math.abs(values[a][c] + pot0 / 2 + f.node.invested[f.me]) < 1e-8);
      }
    });
  }
});

test('best reply: the same as the solver when the hand follows its strategy, never worse when it plays its best, and equal to the solver\'s own best response at the root', () => {
  const f = frameAt(fs, solution, nodes, 0); const best = evaluator(fs, solution, nodes);
  const solved = actionValues(f); const average = best(f, 'average'); const top = best(f, 'best');
  const raw = Float64Array.from(run.solver.traverseRoot(1, 0, 1)); const slots = run.solver.ctx.players[0].slot; const scale = run.solver.ctx.runoutWeight[0];
  for (let c = 0; c < fs.COMBOS; c++) {
    if (Number.isNaN(solved[0][c])) continue;
    for (let a = 0; a < solved.length; a++) { assert.ok(Math.abs(average[a][c] - solved[a][c]) < 1e-8); assert.ok(top[a][c] >= solved[a][c] - 1e-8); }
    assert.ok(Math.abs(Math.max(...top.map((v) => v[c])) - raw[slots[f.stored[c]]] / (f.mass[c] * scale)) < 1e-8);
  }
  // looked at closely, an action's parts are its whole
  for (let a = 0; a < top.length; a++) { const x = best.closely(f, a, null); for (let c = 0; c < fs.COMBOS; c++) if (!Number.isNaN(top[a][c])) { assert.ok(Math.abs(x.value[c] - top[a][c]) < 1e-8); if (x.replies) assert.ok(Math.abs(x.replies.reduce((t, r) => t + r.value[c], 0) - top[a][c]) < 1e-8); } }
});

test('features: the words for a hand', () => {
  const f = (board, hand) => features(fs, fs.parseCards(board), combo(hand));
  assert.deepEqual([f('Td9d6h', 'AdKd').draw, f('Td9d6h', 'AdKd').flushOuts], ['flush draw', 9]);
  assert.equal(f('Td9d6h', 'QsJs').straightOuts, 8);
  assert.equal(f('Td9d6h', 'JsJc').pair, 'overpair');
  assert.equal(groupOf(f('JhJc5d9s', 'AsKs')), 'nothing');
  assert.equal(describe(f('Td9d6hQc', 'AdKd')), 'a flush draw (9 outs), ace high');
  assert.equal(describe(f('Td9d6hQc', 'KhQd')), 'top pair with a gutshot (4 outs)');
  assert.equal(describe(f('Td9d6hQc', 'ThTs')), 'three of a kind');
});

test('claims: made only where the proof covers, and each one true of the hand it was made about', () => {
  const s = study(fs, solution, nodes, 0);
  assert.equal(tolerance('turn', 0.3, s.lineReach), null);           // too coarse a solve: nothing is claimed
  assert.equal(tolerance('turn', exploit, [1, 0.1]), null);          // too thin a line
  assert.ok(tolerance('turn', exploit, [1, 0.3]).sign > tolerance('turn', exploit, [1, 0.6]).sign); // thinner lines, wider gates
  const T = tolerance('turn', exploit, s.lineReach); assert.ok(T);
  let made = 0;
  for (let c = 0; c < fs.COMBOS; c++) {
    const m = measure(s, c); if (!m) continue;
    for (const claim of claims(s, m, T)) { made++; assert.ok(holds(claim, measure(s, c, { onlyOn: false }), T), `${m.name} ${claim.kind}`); }
    const told = explainStreet(s, m, T); assert.ok(told.line.startsWith('You have ')); assert.equal(told.silent, null);
    const quiet = explainStreet(s, measure(s, c, { worth: false }), null); assert.ok(quiet.silent && quiet.reasons.length === 0);
    // unproven ground: numbers, said as this solution's, and no conclusion
    const plain = explainStreet(s, m, null); assert.ok(plain.silent && plain.claims.every((x) => x.number));
  }
  assert.ok(made > 100);
});

test('river: how often the hand is ahead when called, read off the bet\'s worth, is the count over his calling hands', async () => {
  const { decisionAt } = await import('../src/solver/flopsolve.js');
  const river = fs.defineSpot({ board: 'Td9d6hQc7s', pot: 100, stack: 200, oop: '66+,A8s+,AJo+,KQs,QJs,JTs,98s,87s,76s,65s,54s', ip: 'QQ-22,AQs-A2s,ATo+,KJs+,QTs+,J9s+,T8s+,97s+,86s+', betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
  const r = fs.createRun(river, {}); r.step(600); const sol = r.snapshot(); const tree = treeOf(fs, river);
  const s = study(fs, sol, tree, 0); const d = decisionAt(fs, sol, tree, 0); const bet = d.actions.findIndex((a) => a.kind === 'bet');
  let checked = 0;
  for (const hand of d.hands) {
    const m = measure(s, hand.id, { onlyOn: false }); if (m.actions[bet].aheadWhenCalled == null) continue;
    let calls = 0, ahead = 0;
    for (const v of d.villain) { if (v.cards.some((c) => hand.cards.includes(c))) continue; const p = v.answers[bet].call * v.weight; calls += p; ahead += p * (v.strength < hand.strength ? 1 : v.strength === hand.strength ? 0.5 : 0); }
    assert.ok(Math.abs(m.actions[bet].aheadWhenCalled - ahead / calls) < 1e-6, hand.name); checked++;
  }
  assert.ok(checked > 50);
  // and the river line names the price when a bet is faced
  const facing = study(fs, sol, tree, tree[0].edges[bet].child); const T = tolerance('river', 0.005, [1, 1]);
  const one = [...Array(fs.COMBOS).keys()].map((c) => measure(facing, c)).find(Boolean);
  assert.match(explainStreet(facing, one, T).line, /He has bet 50 into 100, so a call has to win 25% of the time\./);
});
