/**
 * What an action is really worth to a hand: take it now, then play every later decision as well
 * as that hand can against the other player's solved strategy.
 *
 * The solver's own value walk (`actionValues` in account.js) has the hand follow its solved
 * strategy afterwards. For an action the hand takes, that is the same thing. For one it never
 * takes, its later strategy was never trained (the hand does not get there) and the number means
 * nothing. Here the later play is the best reply instead, so the cost of a deviation is the cost
 * of the deviation and not of playing badly after it.
 *
 * `mode`: 'best' (best reply afterwards), 'average' (the solved strategy afterwards: the same
 * numbers as `actionValues`, kept as a check on this walk).
 *
 * The walk is its own: it reads the strategies, the tree and the cards, and nothing of the
 * solver's value code. Values are chips from splitting the pot the spot started with.
 */
export function evaluator(fs, solution, nodes) {
  const { spot } = solution;
  const N = fs.COMBOS;
  const A = new Uint8Array(N); const B = new Uint8Array(N);
  for (let c = 0; c < N; c++) { A[c] = fs.COMBO_CARDS[2 * c]; B[c] = fs.COMBO_CARDS[2 * c + 1]; }
  const pot0 = nodes[0].pot;

  /** A player's strategy at a node on a real board: calls `each(realCombo, probsRow, offset)` for every hand held. */
  const strategyAt = (id, board) => {
    const found = spot.resolveBoard(board);
    const view = solution.strategyAt(id, found.board);
    const n = view.actions.length;
    const row = new Int32Array(N).fill(-1);
    view.combos.forEach((c, i) => { row[c] = i; });
    return { n, probs: view.probs, rowOf: (c) => row[found.combos[c]] };
  };

  /** Sum of a reach vector and its per-card sums: what a hand can face is total - card(a) - card(b) + own. */
  const tally = (reach, list) => { const per = new Float64Array(52); let all = 0; for (const v of list) { const w = reach[v]; if (w) { all += w; per[A[v]] += w; per[B[v]] += w; } } return { all, per }; };

  /**
   * values[h] = sum over his hands of reach x what hand h nets from this node on.
   * heroes: the hero's combinations still possible on this board; villains likewise.
   */
  let plan = null; // the hero's later choices, hand by hand, when a walk is asked to keep or to follow them
  function walk(id, board, me, heroes, villains, reach, mode, ctx) {
    const node = nodes[id];
    const out = new Float64Array(N);
    if (node.kind === 'fold') {
      const folder = nodes[node.parent].seat === 'oop' ? 0 : 1;
      const net = folder === me ? -(pot0 / 2 + node.invested[me]) : pot0 / 2 + node.invested[1 - me];
      const { all, per } = tally(reach, villains);
      for (const h of heroes) out[h] = net * (all - per[A[h]] - per[B[h]] + reach[h]);
      return out;
    }
    if (node.kind === 'showdown') {
      if (board.length < 5) return deal(id, board, me, heroes, villains, reach, mode, ctx);
      const win = pot0 / 2 + node.invested[1 - me]; const lose = -(pot0 / 2 + node.invested[me]); const tie = (node.invested[1 - me] - node.invested[me]) / 2;
      const s = ctx.strength ?? (ctx.strength = strengths(board));
      const hs = heroes.slice().sort((p, q) => s[p] - s[q]); const vs = villains.filter((v) => reach[v] > 0).sort((p, q) => s[p] - s[q]);
      const below = new Float64Array(52); const upto = new Float64Array(52); const { all, per } = tally(reach, vs);
      let lt = 0, le = 0, sumBelow = 0, sumUpto = 0;
      for (const h of hs) {
        const sh = s[h];
        while (lt < vs.length && s[vs[lt]] < sh) { const v = vs[lt++]; sumBelow += reach[v]; below[A[v]] += reach[v]; below[B[v]] += reach[v]; }
        while (le < vs.length && s[vs[le]] <= sh) { const v = vs[le++]; sumUpto += reach[v]; upto[A[v]] += reach[v]; upto[B[v]] += reach[v]; }
        const own = reach[h];
        const beats = sumBelow - below[A[h]] - below[B[h]];
        const ties = sumUpto - upto[A[h]] - upto[B[h]] + own - beats;
        const faces = all - per[A[h]] - per[B[h]] + own;
        out[h] = win * beats + tie * ties + lose * (faces - beats - ties);
      }
      return out;
    }
    if (node.kind === 'chance') return deal(node.edges[0].child, board, me, heroes, villains, reach, mode, ctx);
    const seat = node.seat === 'oop' ? 0 : 1;
    const st = strategyAt(id, board);
    if (seat !== me) {
      for (let k = 0; k < node.edges.length; k++) {
        const next = new Float64Array(N); let any = false;
        for (const v of villains) { const w = reach[v]; if (!w) continue; const i = st.rowOf(v); if (i < 0) continue; const p = st.probs[i * st.n + k]; if (p > 0) { next[v] = w * p; any = true; } }
        if (!any) continue;
        const part = walk(node.edges[k].child, board, me, heroes, villains, next, mode, ctx);
        for (const h of heroes) out[h] += part[h];
      }
      return out;
    }
    const parts = node.edges.map((edge) => walk(edge.child, board, me, heroes, villains, reach, mode, ctx));
    if (mode === 'average') {
      for (const h of heroes) { const i = st.rowOf(h); if (i < 0) continue; let sum = 0; for (let k = 0; k < parts.length; k++) sum += st.probs[i * st.n + k] * parts[k][h]; out[h] = sum; }
    } else if (mode === 'best') {
      // the best reply, and a note of which it was, so that the same play can be valued against part of his range
      const choice = plan ? new Uint8Array(N) : null;
      for (const h of heroes) { let best = -Infinity; let pick = 0; for (let k = 0; k < parts.length; k++) if (parts[k][h] > best) { best = parts[k][h]; pick = k; } out[h] = best; if (choice) choice[h] = pick; }
      if (plan) plan.set(`${id}|${board.join(',')}`, choice);
    } else {
      const choice = plan.get(`${id}|${board.join(',')}`);
      for (const h of heroes) out[h] = parts[choice[h]][h];
    }
    return out;
  }
  const strengths = (board) => { const s = new Float64Array(N); const five = board.slice(0, 5); for (let c = 0; c < N; c++) if (!five.includes(A[c]) && !five.includes(B[c])) s[c] = fs.evaluateCards([...five, A[c], B[c]]); return s; };

  /** Every next card, each as likely as the others once both hands are known. */
  function deal(id, board, me, heroes, villains, reach, mode) {
    const out = new Float64Array(N);
    const n = 52 - board.length - 4;
    const used = new Uint8Array(52); for (const c of board) used[c] = 1;
    for (let x = 0; x < 52; x++) {
      if (used[x]) continue;
      const hs = heroes.filter((h) => A[h] !== x && B[h] !== x); const vs = villains.filter((v) => A[v] !== x && B[v] !== x);
      const next = new Float64Array(N); for (const v of vs) next[v] = reach[v];
      const part = walk(id, [...board, x], me, hs, vs, next, mode, {});
      for (const h of hs) out[h] += part[h] / n;
    }
    return out;
  }

  const listsOf = (f) => { const heroes = []; const villains = []; for (let c = 0; c < N; c++) { if (f.mine[c] > 0 && f.mass[c] > 0) heroes.push(c); if (f.his[c] > 0) villains.push(c); } return { heroes, villains }; };
  const perHand = (f, heroes, raw) => { const out = new Float64Array(N).fill(NaN); for (const h of heroes) out[h] = raw[h] / f.mass[h]; return out; };

  /**
   * What each action is worth to each hand at a decision: `values[a][combo]`, chips.
   * @param {{ mine: Float64Array, his: Float64Array, mass: Float64Array, board: number[], me: 0|1, node: object }} f A frame from account.js.
   */
  function valuesOf(f, mode = 'best') {
    const { heroes, villains } = listsOf(f);
    const reach = Float64Array.from(f.his);
    plan = null;
    return f.node.edges.map((edge) => perHand(f, heroes, walk(edge.child, f.board, f.me, heroes, villains, reach, mode, {})));
  }

  /**
   * One action looked at closely: its worth with the best play afterwards, and that worth split
   * three ways, the hand's later play held to that best reply throughout so the parts add up.
   *
   * @returns {{
   *   value: Float64Array,
   *   replies: null | { kind, label, share: Float64Array, value: Float64Array }[],   his reply, when the action hands him the move
   *   holdings: Map<string, { share: Float64Array, value: Float64Array }>,           by `groupOf(combo)` of his hand
   *   cards: null | { card, value: Float64Array, then: Float64Array }[],             the next card, when the action ends the street
   * }}
   */
  function closely(f, a, groupOf) {
    const { heroes, villains } = listsOf(f);
    const edge = f.node.edges[a]; const child = nodes[edge.child];
    plan = new Map();
    const kept = plan;
    const value = perHand(f, heroes, walk(edge.child, f.board, f.me, heroes, villains, Float64Array.from(f.his), 'best', {}));
    const fixed = (id, board, hs, vs, reach) => { plan = kept; return walk(id, board, f.me, hs, vs, reach, 'fixed', {}); };
    const shareOf = (reach, vs) => { const { all, per } = tally(reach, vs); const out = new Float64Array(N).fill(NaN); for (const h of heroes) out[h] = (all - per[A[h]] - per[B[h]] + reach[h]) / f.mass[h]; return out; };
    // by what he does next
    let replies = null;
    if (child.kind === 'decision') {
      const st = strategyAt(child.id, f.board);
      replies = child.edges.map((e, k) => {
        const reach = new Float64Array(N);
        for (const v of villains) { const i = st.rowOf(v); if (i >= 0) reach[v] = f.his[v] * st.probs[i * st.n + k]; }
        return { kind: e.kind, label: e.label, share: shareOf(reach, villains), value: perHand(f, heroes, fixed(e.child, f.board, heroes, villains, reach)) };
      });
    }
    // by what he holds
    const holdings = new Map();
    if (groupOf) {
      const groups = new Map();
      for (const v of villains) { const g = groupOf(v); if (g == null) continue; if (!groups.has(g)) groups.set(g, new Float64Array(N)); groups.get(g)[v] = f.his[v]; }
      for (const [g, reach] of groups) holdings.set(g, { share: shareOf(reach, villains), value: perHand(f, heroes, fixed(edge.child, f.board, heroes, villains, reach)) });
    }
    // by the card that comes
    let cards = null;
    if (child.kind === 'chance') {
      const n = 52 - f.board.length - 4; const used = new Uint8Array(52); for (const c of f.board) used[c] = 1;
      cards = [];
      for (let x = 0; x < 52; x++) {
        if (used[x]) continue;
        const hs = heroes.filter((h) => A[h] !== x && B[h] !== x); const vs = villains.filter((v) => A[v] !== x && B[v] !== x);
        const reach = new Float64Array(N); for (const v of vs) reach[v] = f.his[v];
        const raw = fixed(child.edges[0].child, [...f.board, x], hs, vs, reach);
        const { all, per } = tally(reach, vs);
        const part = new Float64Array(N).fill(NaN); const then = new Float64Array(N).fill(NaN);
        for (const h of hs) { part[h] = raw[h] / n / f.mass[h]; const left = all - per[A[h]] - per[B[h]] + reach[h]; then[h] = left > 0 ? raw[h] / left : NaN; }
        cards.push({ card: x, value: part, then });
      }
    }
    plan = null;
    return { value, replies, holdings, cards };
  }
  return Object.assign(valuesOf, { closely });
}
