import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../src/solver/flopsolve.js';

import { study, measure, explainStreet, explainRange, oneMove, nextStreet, nextBarrel, groupsOf, firstOrder, sayChanges } from '../src/explain/street.js';
import { whatIf } from '../src/explain/whatif.js';

// The small turn spot of street.test.js, with the settings the app would hold for it
const config = { bets: [[0.5]], raises: [3], maxRaises: 1, allIn: false };
const spot = fs.defineSpot({ board: 'Td9d6hQc', pot: 100, stack: 200, oop: 'AA,KK,QQ,AKs,AQs,KQs,JTs,98s,87s,76s,A5s,KJs,QJs,T9s', ip: 'JJ,TT,99,AQs,AJs,KQs,KJs,QJs,J9s,T8s,97s,65s,AdKd,Ad5d,8d7d', betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
const run = fs.createRun(spot, {}); let exploit = 9; while (exploit > 0.02) { run.step(20); exploit = run.exploitabilityPercent(); }
const solution = run.snapshot(); const nodes = treeOf(fs, spot); const N = fs.COMBOS;
const bet = nodes[0].edges.findIndex((e) => e.kind === 'bet'); const facingId = nodes[0].edges[bet].child;
const wager = (k) => !['check', 'call', 'fold'].includes(k);
const live = (s) => { const out = []; for (let c = 0; c < N; c++) if (s.f.mine[c] > 0.05) out.push(c); return out; };
const clean = (text) => { assert.ok(text && /^[A-Z0-9]/.test(text) && /[.!?]$/.test(text), text); assert.ok(!/undefined|NaN|\bnull\b|  |\(\)|Infinity/.test(text), text); };

test('groups: the kinds of a range add to the whole, and each example is a hand of the kind it stands for', () => {
  const s = study(fs, solution, nodes, 0, []); const groups = groupsOf(fs, s.f.board, s.f.his);
  assert.ok(groups.length > 1); assert.ok(Math.abs(groups.reduce((t, g) => t + g.share, 0) - 1) < 1e-9);
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i - 1].share >= groups[i].share);
  for (const g of groups) { assert.match(g.example, /^[2-9TJQKA][♠♥♦♣][2-9TJQKA][♠♥♦♣]$/); assert.notEqual(g.example, g.second); }
  // a card that is skipped is in no example
  const ace = fs.parseCards('Ad')[0]; const without = groupsOf(fs, s.f.board, s.f.his, [ace]); for (const g of without) assert.ok(!g.example.includes('A♦'));
});

test('one move: his replies to a wager add to one, and the count sides with the solution for hands that do one thing', () => {
  const s = study(fs, solution, nodes, 0, []); let same = 0, all = 0;
  for (const c of live(s)) {
    const mv = oneMove(s, c); assert.ok(mv && mv.actions.length === s.actions.length);
    mv.actions.forEach((a) => { if (a.parts.length) assert.ok(Math.abs(a.parts.reduce((t, p) => t + p.share, 0) - 1) < 1e-6); assert.ok(Number.isFinite(a.value)); });
    const pure = s.actions.findIndex((_, a) => s.sigma(c, a) > 0.97); if (pure < 0) continue; all++;
    const top = mv.actions.reduce((b, a, i) => (a.value > mv.actions[b].value ? i : b), 0); if (top === pure) same++;
  }
  assert.ok(all > 5); assert.ok(same / all >= 0.7, `${same} of ${all}`);
});

test('next street: how often he bets and how often the hand bets again are frequencies, and named in words', () => {
  const s = study(fs, solution, nodes, 0, []); let seen = 0;
  for (const c of live(s)) {
    const nb = nextBarrel(s, c, bet); if (nb) { seen++; assert.ok(nb.bets >= 0 && nb.bets <= 1 && nb.share >= 0 && nb.share <= 1); assert.equal(nb.street, 'river'); }
    const xi = s.f.node.edges.findIndex((e) => e.kind === 'check'); const nx = nextStreet(s, c, xi); if (nx) assert.ok(nx.can >= 0 && nx.can <= 1);
  }
  assert.ok(seen > 0);
});

test('the range: what it says it does is what the solution does, at a first decision and facing a bet', () => {
  for (const id of [0, facingId]) {
    const s = study(fs, solution, nodes, id, []); const r = explainRange(s); assert.ok(r); clean(r.line); assert.ok(r.reasons.length >= 3);
    for (const x of r.reasons) { clean(x.text); if (x.detail) clean(x.detail); }
    assert.ok(r.reasons.some((x) => x.id === 'why')); assert.ok(r.reasons.some((x) => x.id === 'strong'));
    let w = 0, did = 0; for (let c = 0; c < N; c++) { const m = s.f.mine[c]; if (!(m > 0)) continue; w += m; s.f.node.edges.forEach((e, a) => { if (id === 0 ? wager(e.kind) : e.kind === 'fold') did += m * s.sigma(c, a); }); }
    assert.ok(Math.abs((id === 0 ? r.facts.bet : r.facts.fold) - did / w) < 1e-6);
    if (id === 0) assert.ok(Math.abs(r.facts.folds + r.facts.calls + r.facts.raises - 1) < 1e-6);
  }
});

test('what would change it, read off the solution: shares of the betting, and every hand that mixes is one that a few folds would move', () => {
  const s = study(fs, solution, nodes, 0, []); const r = firstOrder(s); assert.ok(r && !r.facing); clean(r.said.text); clean(r.said.detail);
  for (const k of ['folds', 'free', 'stop', 'start', 'bet']) assert.ok(r[k] >= 0 && r[k] <= 1, k);

  const facing = firstOrder(study(fs, solution, nodes, facingId, [])); assert.ok(facing && facing.facing && facing.close >= 0 && facing.close <= 1); clean(facing.said.text);
});

test('what would change it, solved again: the street as it is comes back as the solution, and each change is a frequency', () => {
  const s = study(fs, solution, nodes, 0, []); const r = explainRange(s);
  const w = whatIf(fs, { solution, nodes, config }, 0, []); assert.ok(w && !w.facing && w.street === 'turn');
  assert.ok(Math.abs(w.base - r.facts.bet) < 0.05, `${w.base} against ${r.facts.bet}`);
  for (const k of ['hisLess', 'myLess', 'noRaise', 'noStab']) assert.ok(w[k] >= 0 && w[k] <= 1, k);
  clean(w.said.text); clean(w.said.detail); assert.match(w.said.text, /^What would change it\./);
  const f = whatIf(fs, { solution, nodes, config }, facingId, []); assert.ok(f && f.facing && f.close != null); assert.ok(Math.abs(f.base - explainRange(study(fs, solution, nodes, facingId, [])).facts.fold) < 0.05);
  // too large to solve again: the reading from the solution instead
  const big = whatIf(fs, { solution, nodes, config }, 0, [], { bytes: 1 }); assert.equal(big.skipped, 'large'); assert.match(big.said.text, /^What would change it\./);
  assert.equal(whatIf(fs, { solution, nodes }, 0, []), null);
});

test('saying the changes: the biggest first, small ones said to be none, and no awkward extremes', () => {
  const a = sayChanges({ facing: false, base: 0.5, hisLess: 0.9, myLess: 0.02, noRaise: 0.52, noStab: 0.3 });
  assert.ok(a.text.indexOf('strongest fifth of hands out of his range') < a.text.indexOf('could not bet when checked to')); assert.match(a.text, /hardly bet at all/); assert.match(a.text, /much the same if he could not raise/); assert.ok(!/only almost/.test(a.text));
  const none = sayChanges({ facing: false, base: 0.5, hisLess: 0.52, myLess: 0.48 }); assert.match(none.text, /Nothing tried moves it/);
  const f = sayChanges({ facing: true, base: 0.4, hisLess: 0.41, myLess: 0.42, close: 0.5 }); assert.match(f.text, /set by the price/); assert.match(f.text, /A bigger bet would/);
  assert.equal(sayChanges(null), null); assert.equal(sayChanges({ facing: false, base: null }), null);
});

test('every hand at both decisions gets an explanation that reads cleanly, with a reason for its move', () => {
  for (const id of [0, facingId]) {
    const s = study(fs, solution, nodes, id, []);
    for (const c of live(s)) {
      const told = explainStreet(s, measure(s, c), null); if (!told || told.silent) continue; clean(told.line);
      for (const x of told.reasons) { clean(x.text); if (x.detail) clean(x.detail); }
      assert.ok(told.reasons.some((x) => x.id === 'move'), `${fs.formatCombo(c)} at ${id}: ${told.reasons.map((x) => x.id)}`);

    }
  }
});
