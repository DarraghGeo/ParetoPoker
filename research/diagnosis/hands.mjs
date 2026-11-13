// Hand selection diagnosis, the data: every hand at every decision of the first street of each
// tree (first to act, facing a bet, facing a raise), with the solver's strategy, what each action
// is worth to the hand, the hand's features and the spot's.
//   node diagnosis/hands.mjs <set> <out.jsonl>
import { appendFileSync, writeFileSync } from 'node:fs';
import { Equity, SolverBridge, cards, classifyHands, handFeatures } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const [set, out] = process.argv.slice(2);
const POSITIONS = ['oop', 'ip'];
const { NUM_COMBOS, COMBO_A, COMBO_B } = cards;
const sum = (xs) => { let t = 0; for (const x of xs) t += x; return t; };
const round = (x, d = 4) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

/** Share of `set` (weights per combo) that shares a card with each hand of `ids`. */
function removal(ids, weights) {
  const byCard = new Float64Array(52); let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0) { byCard[COMBO_A[i]] += weights[i]; byCard[COMBO_B[i]] += weights[i]; total += weights[i]; }
  const o = new Float64Array(NUM_COMBOS);
  for (const id of ids) o[id] = total > 0 ? (byCard[COMBO_A[id]] + byCard[COMBO_B[id]] - weights[id]) / total : 0;
  return o;
}
/** The part of `weights` between two quantiles of `score` (by weight). */
function slice(weights, score, from, to) {
  const ids = []; let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0 && !Number.isNaN(score[i])) { ids.push(i); total += weights[i]; }
  ids.sort((a, b) => score[a] - score[b]);
  const o = new Float64Array(NUM_COMBOS); let seen = 0;
  for (const i of ids) { const mid = (seen + weights[i] / 2) / total; seen += weights[i]; if (mid >= from && mid < to) o[i] = weights[i]; }
  return o;
}
function ranks(ids, weights, score) {
  const order = ids.filter((i) => !Number.isNaN(score[i])).sort((a, b) => score[a] - score[b]);
  const total = sum(order.map((i) => weights[i])); const o = new Float64Array(NUM_COMBOS).fill(NaN); let seen = 0;
  for (const i of order) { o[i] = (seen + weights[i] / 2) / total; seen += weights[i]; }
  return o;
}
function deciles(weights, score) {
  const ids = []; for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0 && !Number.isNaN(score[i])) ids.push(i);
  ids.sort((a, b) => score[a] - score[b]);
  const total = sum(ids.map((i) => weights[i])); const o = []; let seen = 0; let k = 0;
  for (const i of ids) { seen += weights[i]; while (k < 11 && seen / total >= (k + 0.5) / 11) { o.push(round(score[i], 3)); k++; } }
  return o;
}
function texture(board) {
  const rk = board.map((c) => c >> 2); const suits = [0, 0, 0, 0]; board.forEach((c) => suits[c & 3]++);
  const distinct = [...new Set(rk)].sort((a, b) => a - b);
  let straighty = 0; // most ranks inside any five-rank window
  for (let low = -1; low <= 8; low++) { const n = distinct.filter((r) => (r >= low && r <= low + 4) || (low === -1 && r === 12)).length; straighty = Math.max(straighty, n); }
  return { paired: distinct.length < board.length ? 1 : 0, maxSuit: Math.max(...suits), straighty, high: Math.max(...rk) };
}

async function collect(spot) {
  const equity = new Equity(); const bridge = new SolverBridge(); const rows = [];
  try {
    const info = await bridge.init(gameOf(spot));
    await bridge.solve({ iterations: 2000, target: 0.0015 });
    const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
    const start = info.weights.map((w) => sum(w));
    const spread = (player, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[player][i]] = v; }); return o; };
    const board = cards.parseCards(spot.board);
    const street = { 3: 'flop', 4: 'turn', 5: 'river' }[board.length];
    const visit = async (history, labels, raises) => {
      const node = await bridge.node(history);
      if (node.terminal || node.chance) return;
      const me = node.player; const n = ids[me].length;
      const { strategy, weights, evs } = await bridge.strategy(history, { evs: true });
      const reach = [sum(weights[0]) / start[0], sum(weights[1]) / start[1]];
      if (Math.min(...reach) < 0.03) return; // a line the solver hardly takes
      const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
      const pot = spot.pot + node.bets[0] + node.bets[1]; const toCall = node.bets[1 - me] - node.bets[me];
      const behind = spot.stack - Math.max(...node.bets);
      const f = handFeatures({ equity, board, hero, villain, pot, behind });
      const classes = classifyHands(board, hero);
      const his = equity.against(board, hero, villain); // his hands' equity against hero's range
      const top = slice(villain, his, 0.75, 1.01); const bottom = slice(villain, his, 0, 0.25);
      const live = ids[me].filter((id, h) => weights[me][h] > 1e-4);
      const blockTop = removal(live, top); const blockBottom = removal(live, bottom); const blockAll = removal(live, villain);
      const equityTop = equity.against(board, top, hero);
      // What he does next against each bet or raise: who folds, who continues
      const sized = [];
      for (const [a, action] of node.actions.entries()) {
        if (action.to == null) continue;
        const next = await bridge.node([...history, a]);
        if (next.terminal || next.chance) { sized.push(null); continue; }
        const answer = await bridge.strategy([...history, a]);
        const fold = next.actions.findIndex((x) => x.type === 'fold'); const m = ids[1 - me].length;
        const folds = spread(1 - me, weights[1 - me].map((w, v) => w * answer.strategy[fold * m + v]));
        const continues = spread(1 - me, weights[1 - me].map((w, v) => w * (1 - answer.strategy[fold * m + v])));
        sized.push({ a, blockFold: removal(live, folds), blockContinue: removal(live, continues), equityCalled: equity.against(board, continues, hero), folds: sum(folds) / sum(villain) });
      }
      const total = sum(weights[me]);
      const rankEquity = ranks(live, hero, f.equity);
      const rankNow = f.strengthNow ? ranks(live, hero, f.strengthNow) : rankEquity;
      const frequencies = node.actions.map((_, a) => { let t = 0; for (let h = 0; h < n; h++) t += weights[me][h] * strategy[a * n + h]; return round(t / total); });
      const aggressive = node.actions.flatMap((x, a) => (x.to != null ? [a] : []));
      const main = aggressive.reduce((best, a) => (best == null || frequencies[a] > frequencies[best] ? a : best), null);
      const mainSized = sized[aggressive.indexOf(main)] ?? null;
      const hands = [];
      ids[me].forEach((id, h) => {
        const w = weights[me][h]; if (!(w > 1e-4)) return;
        const s = node.actions.map((_, a) => strategy[a * n + h]);
        const ev = node.actions.map((_, a) => evs[a * n + h]);
        const best = Math.max(...ev);
        hands.push({
          hand: cards.comboName(id), w: round(w), s: s.map((x) => round(x, 3)), gap: ev.map((x) => round((best - x) / pot, 4)),
          eq: round(f.equity[id]), rank: round(rankEquity[id]), rankNow: round(rankNow[id]), now: round(f.strengthNow?.[id] ?? f.equity[id]),
          drawEq: round(f.drawEquity?.[id] ?? 0), swing: round(f.swing?.[id] ?? 0), ehs2: round(f.ehs2?.[id] ?? f.equity[id] ** 2), best: round(f.bestCard?.[id] ?? f.equity[id]),
          up: round(f.upside?.[id] ?? 0), down: round(f.downside?.[id] ?? 0), implied: round(f.impliedOdds?.[id] ?? 0), spread: round(f.spread[id]), slope: round(f.slope[id]),
          pair: classes.pair[id], draw: classes.draw[id], eqTop: round(equityTop[id]),
          bTop: round(blockTop[id]), bBot: round(blockBottom[id]), bAll: round(blockAll[id]),
          bFold: mainSized ? round(mainSized.blockFold[id]) : null, bCont: mainSized ? round(mainSized.blockContinue[id]) : null, eqCalled: mainSized ? round(mainSized.equityCalled[id]) : null,
        });
      });
      const heroEq = sum(live.map((id) => hero[id] * f.equity[id])) / total;
      const share = (weights, score, from) => { let t = 0, all = 0; for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0 && !Number.isNaN(score[i])) { all += weights[i]; if (score[i] >= from) t += weights[i]; } return all > 0 ? t / all : 0; };
      rows.push({
        set, spot: spot.name, pair: spot.pair, depth: spot.depth, board: spot.board, street, position: POSITIONS[me],
        kind: toCall > 0 ? (raises > 0 ? 'facing-raise' : 'facing-bet') : 'open', line: labels.join(' '),
        actions: node.actions.map((x) => ({ type: x.type, size: x.to != null ? round((x.to - node.bets[me]) / (pot + (toCall > 0 ? toCall : 0)), 3) : null })),
        main, pot, faced: round(toCall / (pot - toCall)), spr: round(behind / pot), reach: reach.map((x) => round(x)), frequencies,
        folds: sized.map((x) => (x ? round(x.folds) : null)),
        rangeEquity: round(heroEq), nutShare: round(share(hero, f.equity, 0.8)), hisNutShare: round(share(villain, his, 0.8)),
        airShare: round(1 - share(hero, f.equity, 0.25)), hisAirShare: round(1 - share(villain, his, 0.25)),
        curve: deciles(hero, f.equity), hisCurve: deciles(villain, his), ...texture(board), hands,
      });
      if (history.length >= 3) return;
      for (const [a, action] of node.actions.entries()) {
        if (action.type === 'fold' || action.type === 'call') continue;
        await visit([...history, a], [...labels, action.to != null ? `${action.type}${Math.round((100 * (action.to - node.bets[me])) / (pot + Math.max(0, toCall)))}` : action.type], toCall > 0 && action.to != null ? raises + 1 : raises);
      }
    };
    await visit([], [], 0);
  } catch (error) { console.error(spot.name, error.message); } finally { bridge.close(); }
  appendFileSync(out, rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
  return rows.length;
}
writeFileSync(out, '');
const counts = await pool(SPOTS[set], collect);
console.log(`${set}: ${counts.reduce((t, x) => t + x, 0)} decisions -> ${out}`);
