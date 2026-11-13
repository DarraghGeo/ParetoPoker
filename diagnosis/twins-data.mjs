// Data for the twins grid: for a few spots and decisions, every hand with the solver's action
// mix and the sorted curve of its equity over the river cards.   node diagnosis/twins-data.mjs out.json
import { writeFileSync } from 'node:fs';
import { Equity, SolverBridge, cards } from '../src/index.js';
import { SPOTS, gameOf } from '../src/solver/spots.js';
const { NUM_COMBOS, COMBO_A, COMBO_B } = cards; const equity = new Equity();
const pick = (set, name) => SPOTS[set].find((s) => s.name === name);
const spots = [pick('turns-tune', 'A Ks7h2d5c 1.5x'), pick('turns-tune', 'C JsTs4h8d 4x'), pick('turns-tune', 'B JsTs4h8d 1.5x'), pick('rivers-tune', 'A Td9d6hQc7s 2x')].filter(Boolean);
const PAIR = { A: 'Mid-strength defender vs wide IP', B: 'Big blind vs button', C: '3-bet pot', D: 'Blind vs blind' };
const out = [];
for (const spot of spots) {
  const bridge = new SolverBridge();
  const info = await bridge.init(gameOf(spot));
  await bridge.solve({ iterations: 2000, target: 0.001 });
  const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
  const spread = (p, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[p][i]] = v; }); return o; };
  const board = cards.parseCards(spot.board);
  const decisions = [];
  const add = async (history, label) => {
    const node = await bridge.node(history); if (node.terminal || node.chance) return;
    const me = node.player; const { strategy, weights } = await bridge.strategy(history); const n = ids[me].length;
    const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
    const strength = equity.against(board, villain, hero);
    const columns = [];
    if (board.length < 5) for (let c = 0; c < 52; c++) if (!board.includes(c)) columns.push({ c, e: equity.against([...board, c], villain, hero) });
    const pot = spot.pot + node.bets[0] + node.bets[1]; const toCall = node.bets[1 - me] - node.bets[me];
    // strata: 0 fold, 1 check or call, 2 small, 3 big, 4 all-in
    const sized = node.actions.map((a, k) => ({ a, k })).filter((x) => x.a.to != null);
    const strata = node.actions.map((a, k) => {
      if (a.type === 'fold') return 0; if (a.to == null) return 1; if (a.type === 'allin') return 4;
      return sized.findIndex((x) => x.k === k) === 0 ? 2 : 3;
    });
    const labels = node.actions.map((a) => (a.to == null ? a.type : `${a.type === 'allin' ? 'all-in' : a.type} ${Math.round((100 * (a.to - node.bets[me])) / (pot + Math.max(0, toCall)))}%`));
    const hands = [];
    ids[me].forEach((id, h) => {
      const w = weights[me][h]; if (!(w > 0.01)) return;
      const mix = [0, 0, 0, 0, 0]; node.actions.forEach((_, k) => { mix[strata[k]] += strategy[k * n + h]; });
      let curve = [strength[id]];
      if (columns.length) {
        const v = columns.filter(({ c, e }) => COMBO_A[id] !== c && COMBO_B[id] !== c && !Number.isNaN(e[id])).map(({ e }) => e[id]).sort((a, b) => a - b);
        curve = Array.from({ length: 12 }, (_, q) => v[Math.min(v.length - 1, Math.round((q / 11) * (v.length - 1)))]);
      }
      hands.push({ h: cards.comboName(id), w: +w.toFixed(3), e: +strength[id].toFixed(4), m: mix.map((x) => +x.toFixed(3)), c: curve.map((x) => +x.toFixed(3)) });
    });
    decisions.push({ label, seat: me === 0 ? 'OOP' : 'IP', facing: toCall > 0, actions: labels, strata, hands });
    return { node, strategy, weights, n, me };
  };
  const main = async (history) => {
    const r = await add(history, history.length ? 'IP first to act' : 'OOP first to act');
    // the bet the solver uses most, and the other seat facing it
    let best = -1, bestF = 0;
    r.node.actions.forEach((a, k) => { if (a.to == null) return; let f = 0; for (let h = 0; h < r.n; h++) f += r.weights[r.me][h] * r.strategy[k * r.n + h]; if (f > bestF) { bestF = f; best = k; } });
    if (best >= 0) await add([...history, best], `${r.me === 0 ? 'IP' : 'OOP'} facing a bet`);
  };
  await main([]); await main([0]);
  bridge.close();
  out.push({ name: `${spot.board.match(/../g).join(' ')} · ${PAIR[spot.pair]} · ${spot.depth} pots behind`, board: spot.board, street: board.length === 4 ? 'turn' : 'river', decisions });
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(out.map((s) => `${s.name}: ${s.decisions.map((d) => `${d.label} ${d.hands.length} [${d.actions.join(', ')}]`).join(' | ')}`).join('\n'));
