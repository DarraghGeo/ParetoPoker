// What would change what a range does at a decision. Not argued: the street is played again with one thing changed, and
// solved. His strongest hands (the top 20% by equity) out of his range; ours out of ours; no raise for him on this
// street; no bet for him when checked to. The same street solved again unchanged is what each is set beside.
import { treeOf, equityVs } from '../solver/flopsolve.js';
import { study, sayChanges, firstOrder } from './street.js';

/** Where the street cannot be played again: what the solution itself says would change it. */
function read(fs, solution, nodes, id, dealt) { let st; try { st = study(fs, solution, nodes, id, dealt); } catch { return null; } const r = st ? firstOrder(st) : null; return r ? { skipped: 'large', facing: r.facing, read: r, said: r.said } : { skipped: 'large' }; }

/** The street the decision is on, played again with one thing changed at a time. Null where that is too large to do here. */
export function whatIf(fs, { solution, nodes, config: c }, id, dealt, limits = {}) {
  if (!c) return null; const N = fs.COMBOS; const { spot } = solution; const equities = (board, mine, his) => equityVs(fs, board, mine, his);
  // the first decision of this street, and the actions from it to the decision asked about
  let root = id; const path = []; while (nodes[root].parent >= 0 && nodes[nodes[root].parent].kind !== 'chance') { const parent = nodes[nodes[root].parent]; path.unshift(parent.edges[nodes[root].via].label); root = parent.id; }
  const round = nodes[root].round; const board = [...spot.board, ...dealt.slice(0, round)]; const found = spot.resolveBoard(board); const sub = solution.subgameAt(root, found.board, {}); const taken = new Set(board);
  const real = (stored) => { const o = new Float64Array(N); for (let k = 0; k < N; k++) if (!taken.has(fs.COMBO_CARDS[2 * k]) && !taken.has(fs.COMBO_CARDS[2 * k + 1])) o[k] = stored[found.combos[k]]; return o; };
  const ranges = [real(solution.reachAt(root, found.board, 0)), real(solution.reachAt(root, found.board, 1))];
  const streets = 6 - board.length; const bets = Array.isArray(c.bets[0]) ? (c.bets.length > 1 ? c.bets.slice(-streets) : c.bets) : [c.bets]; const most = 1 + (c.raises.length ? c.maxRaises : 0);
  const base = { board: fs.formatCards(board).replace(/ /g, ''), pot: sub.pot, stack: sub.stack, oop: ranges[0], ip: ranges[1], betSizes: bets, raiseSizes: c.raises.length ? c.raises.map((times) => ({ times })) : undefined, maxRaises: most, allowAllIn: !!c.allIn };
  let probe; try { probe = fs.defineSpot(base); } catch { return null; } if (probe.estimate.bytes > (limits.bytes ?? 160 * 2 ** 20)) return read(fs, solution, nodes, id, dealt);
  const me = nodes[id].seat === 'ip' || nodes[id].seat === 1 ? 1 : 0; const facing = nodes[id].invested[1 - me] > nodes[id].invested[me]; const first = path.length === 0;
  const target = board.length === 5 ? 0.05 : board.length === 4 ? 0.15 : 0.4; const budget = limits.ms ?? (board.length === 3 ? 20000 : 7000);
  const answer = (cfg) => {
    const sp = fs.defineSpot(cfg); const run = fs.createRun(sp, {}); const t0 = Date.now(); let e = 9; while (e > target && Date.now() - t0 < budget && run.completed < 3000) { run.step(board.length === 5 ? 40 : 10); e = run.exploitabilityPercent(); }
    const tree = treeOf(fs, sp); let at = 0; for (const label of path) { const edge = tree[at].edges.find((x) => x.label === label); if (!edge) return null; at = edge.child; } if (tree[at].kind !== 'decision') return null;
    const st = study(fs, run.snapshot(), tree, at, []); if (!st) return null; const wager = (k) => !['check', 'call', 'fold'].includes(k);
    return facing ? st.actions.reduce((t, x) => t + (x.kind === 'fold' ? x.freq : 0), 0) : st.actions.reduce((t, x) => t + (wager(x.kind) ? x.freq : 0), 0);
  };
  const less = (p) => { const e = equities(board, ranges[p], ranges[1 - p]); const ids = []; let all = 0; for (let k = 0; k < N; k++) if (ranges[p][k] > 0 && !Number.isNaN(e[k])) { ids.push(k); all += ranges[p][k]; } ids.sort((x, y) => e[y] - e[x]); const o = Float64Array.from(ranges[p]); let seen = 0; for (const k of ids) { if (seen >= 0.2 * all) break; seen += ranges[p][k]; o[k] = 0; } return o; };
  const seat = ['oop', 'ip']; const each = (n, v) => Array.from({ length: n }, () => v); const out = { facing, street: ['flop', 'turn', 'river'][board.length - 3] }; const t0 = Date.now();
  out.base = answer(base); if (out.base == null) return null;
  out.hisLess = answer({ ...base, [seat[1 - me]]: less(1 - me) }); out.myLess = answer({ ...base, [seat[me]]: less(me) });
  if (!facing && most > 1) { const cap = each(streets, most); const his = each(streets, most); his[0] = 1; try { out.noRaise = answer({ ...base, maxRaises: { [seat[me]]: cap, [seat[1 - me]]: his } }); } catch { /* the tree does not take it */ } }
  if (!facing && first && me === 0) { try { out.noStab = answer({ ...base, betSizes: { oop: bets, ip: [[], ...bets.slice(1)] } }); } catch { /* the tree does not take it */ } }
  if (facing) { try { const fo = firstOrder(study(fs, solution, nodes, id, dealt)); if (fo) out.close = fo.close; } catch { /* said without it */ } }
  out.ms = Date.now() - t0; out.said = sayChanges(out);
  return out;
}

