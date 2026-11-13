// An evaluator that shares nothing with the solver's own value walk: it reads only the strategies
// (strategyAt), the tree and the cards, and plays every line out to its end. If it agrees with
// `actionValues`, then the scale, the board mapping, the chips put in and the meaning of a value are right.
import { fs } from './lib.mjs';
const A = (c) => fs.COMBO_CARDS[2 * c]; const B = (c) => fs.COMBO_CARDS[2 * c + 1];

export function independent(g) {
  const { spot, solution, nodes } = g;
  const pot0 = nodes[0].pot;
  const cache = new Map();
  /** One player's strategy at a node on a real board: probs[k][realCombo]. */
  const strategy = (id, board) => {
    const key = `${id}|${board.join(',')}`; let hit = cache.get(key); if (hit) return hit;
    const found = spot.resolveBoard(board); const view = solution.strategyAt(id, found.board); const n = view.actions.length;
    const row = new Int32Array(fs.COMBOS).fill(-1); view.combos.forEach((c, i) => { row[c] = i; });
    hit = { n, of: (k, c) => { const i = row[found.combos[c]]; return i < 0 ? 0 : view.probs[i * n + k]; } };
    cache.set(key, hit); return hit;
  };
  const strength = new Map();
  const made = (board, c) => { const key = `${board.join(',')}|${c}`; let s = strength.get(key); if (s === undefined) { s = fs.evaluateCards([...board, A(c), B(c)]); strength.set(key, s); } return s; };
  /**
   * Sum over his hands of reach x what the hero's hand nets from `id` on, chips from splitting the first pot.
   * `list`: his combinations still possible; `reach`: aligned weights.
   */
  const value = (id, board, h, me, list, reach) => {
    const node = nodes[id];
    if (node.kind === 'fold') {
      // the player who acted last gave up
      const folder = nodes[node.parent].seat === 'oop' ? 0 : 1;
      const net = folder === me ? -(pot0 / 2 + node.invested[me]) : pot0 / 2 + node.invested[1 - me];
      let sum = 0; for (let i = 0; i < list.length; i++) sum += reach[i]; return sum * net;
    }
    if (node.kind === 'showdown') {
      if (board.length < 5) return dealOut(id, board, h, me, list, reach);
      const win = pot0 / 2 + node.invested[1 - me]; const lose = -(pot0 / 2 + node.invested[me]); const tie = (node.invested[1 - me] - node.invested[me]) / 2;
      const mine = made(board, h); let sum = 0;
      for (let i = 0; i < list.length; i++) { if (!reach[i]) continue; const s = made(board, list[i]); sum += reach[i] * (mine > s ? win : mine < s ? lose : tie); }
      return sum;
    }
    if (node.kind === 'chance') return dealOut(node.edges[0].child, board, h, me, list, reach);
    const seat = node.seat === 'oop' ? 0 : 1; const st = strategy(id, board);
    let sum = 0;
    if (seat === me) { for (let k = 0; k < node.edges.length; k++) { const p = st.of(k, h); if (p > 0) sum += p * value(node.edges[k].child, board, h, me, list, reach); } return sum; }
    for (let k = 0; k < node.edges.length; k++) {
      const next = new Float64Array(list.length); let any = false;
      for (let i = 0; i < list.length; i++) if (reach[i]) { next[i] = reach[i] * st.of(k, list[i]); if (next[i]) any = true; }
      if (any) sum += value(node.edges[k].child, board, h, me, list, next);
    }
    return sum;
  };
  /** Every next card, each as likely as the others once both hands are known. */
  const dealOut = (id, board, h, me, list, reach) => {
    const used = new Set([...board, A(h), B(h)]); const n = 52 - board.length - 4; let sum = 0;
    for (let x = 0; x < 52; x++) {
      if (used.has(x)) continue;
      const next = Float64Array.from(reach, (w, i) => (A(list[i]) === x || B(list[i]) === x ? 0 : w));
      sum += value(id, [...board, x], h, me, list, next) / n;
    }
    return sum;
  };
  /** What an action is worth to one hand at a decision, chips, by playing it out. */
  return (id, dealt, a, h) => {
    const node = nodes[id]; const me = node.seat === 'oop' ? 0 : 1; const board = [...spot.board, ...dealt.slice(0, node.round)];
    const found = spot.resolveBoard(board); const his = solution.reachAt(id, found.board, 1 - me);
    const used = new Set([...board, A(h), B(h)]); const list = []; const reach = []; let mass = 0;
    for (let c = 0; c < fs.COMBOS; c++) { const w = his[found.combos[c]]; if (!(w > 0) || used.has(A(c)) || used.has(B(c))) continue; list.push(c); reach.push(w); mass += w; }
    return value(node.edges[a].child, board, h, me, list, Float64Array.from(reach)) / mass;
  };
}
