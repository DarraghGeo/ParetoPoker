// Solves a spot with poker-flopsolve off the main thread and answers questions about it.
import * as fs from 'poker-flopsolve';
import { decisionAt, equityVs, treeOf } from '../src/solver/flopsolve.js';
import { KNOBS, describe, isNeutral, reshape } from '../src/warp/reshape.js';

let solution = null;
let nodes = null;
let job = 0;
let halt = false;
let last = null; // the run before this one, to start the next solve from
let seen = null; // the ranges last previewed, placed once
/** Solves kept by version, so that going back to one is immediate. The oldest are dropped when memory runs short. */
const kept = new Map();
const ROOM = 420 * 2 ** 20;
const strip = (list) => list.map(({ id, kind, round, seat, pot, edges, parent, via, invested }) => ({ id, kind, round, seat, pot, edges, parent, via, invested }));
const equities = (board, mine, his) => equityVs(fs, board, mine, his);
const weights = (range) => (typeof range === 'string' ? fs.parseRange(range) : Float64Array.from(range));
function keep(key, entry) {
  kept.delete(key); kept.set(key, entry);
  let total = 0; for (const e of kept.values()) total += e.bytes;
  for (const [k, e] of kept) { if (total <= ROOM || k === key) continue; kept.delete(k); total -= e.bytes; }
}
const use = (entry) => { solution = entry.solution; nodes = entry.nodes; last = { board: entry.board, run: entry.run }; };

self.onmessage = async ({ data }) => {
  if (data.type === 'stop') { halt = true; return; }
  if (data.type === 'solve') {
    const mine = ++job;
    halt = false;
    try {
      const c = data.config;
      const held = kept.get(data.key);
      if (held) { use(held); self.postMessage({ type: 'solved', job: data.job, nodes: strip(nodes), exploit: held.exploit, iterations: 0, ms: 0 }); return; }
      const board = fs.parseCards(c.board);
      if (board.length < 3 || board.length > 5) throw new Error('Three, four or five board cards are needed.');
      // The ranges as given, then as the dials reshape them
      const given = [weights(c.oop), weights(c.ip)];
      const turned = !isNeutral(c.dials?.oop) || !isNeutral(c.dials?.ip);
      const placed = turned ? [equities(board, given[0], given[1]), equities(board, given[1], given[0])] : null;
      const ranges = turned ? [reshape(given[0], placed[0], c.dials?.oop), reshape(given[1], placed[1], c.dials?.ip)] : given;
      // One list of bet sizes plays on every street; several, one for each street from the board's own
      const perStreet = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
      // The solver counts the bet as the first raise
      const spot = fs.defineSpot({ board: c.board, pot: c.pot, stack: c.stack, oop: ranges[0], ip: ranges[1], betSizes: perStreet, raiseSizes: c.raises.length ? c.raises.map((times) => ({ times })) : undefined, maxRaises: 1 + (c.raises.length ? c.maxRaises : 0), allowAllIn: !!c.allIn });
      // Same board as the solve before: carry its regrets over, which is quicker than starting cold
      const warm = last && last.board === c.board ? last.run : undefined;
      const run = fs.createRun(spot, warm ? { warmStart: warm } : {});
      const started = Date.now();
      const river = board.length === 5;
      // A river is cheap enough to solve finely; earlier streets stop at the usual 0.3% of the pot, or when told to
      const target = river ? 0.05 : 0.3; const patience = river ? 8000 : board.length === 4 ? 45000 : 180000;
      const chunk = river ? (warm ? 10 : 50) : board.length === 4 ? 10 : 2;
      let exploit = Infinity;
      while (mine === job && !halt && exploit > target && run.completed < 3000 && Date.now() - started < patience) {
        run.step(chunk);
        exploit = run.exploitabilityPercent();
        self.postMessage({ type: 'progress', job: data.job, iterations: run.completed, exploit });
        await new Promise((resolve) => setTimeout(resolve));
      }
      if (mine !== job) return;
      if (!run.completed) { run.step(1); exploit = run.exploitabilityPercent(); }
      const entry = { solution: run.snapshot(), nodes: treeOf(fs, spot), run, board: c.board, exploit, bytes: spot.estimate.bytes };
      use(entry); keep(data.key, entry);
      self.postMessage({ type: 'solved', job: data.job, nodes: strip(nodes), exploit, iterations: run.completed, warm: !!warm, ms: Date.now() - started });
    } catch (error) {
      self.postMessage({ type: 'error', job: data.job, message: String(error?.message ?? error).split('\n')[0] });
    }
  } else if (data.type === 'subgame' && solution) {
    // The spot that starts at a street's first decision on the cards dealt: the pot and stacks as they stand, the ranges as they arrive
    try {
      const { spot } = solution;
      const board = [...spot.board, ...fs.parseCards(data.dealt.join(' ')).slice(0, nodes[data.id].round)];
      const found = spot.resolveBoard(board);
      const sub = solution.subgameAt(data.id, found.board, {});
      const taken = new Set(board);
      const real = (stored) => { const out = new Array(fs.COMBOS).fill(0); for (let c = 0; c < fs.COMBOS; c++) if (!taken.has(fs.COMBO_CARDS[2 * c]) && !taken.has(fs.COMBO_CARDS[2 * c + 1])) out[c] = stored[found.combos[c]]; return out; };
      self.postMessage({ type: 'subgame', job: data.job, spot: { board: fs.formatCards(board), pot: sub.pot, stack: sub.stack, oop: real(solution.reachAt(data.id, found.board, 0)), ip: real(solution.reachAt(data.id, found.board, 1)) } });
    } catch (error) {
      self.postMessage({ type: 'error', job: data.job, message: String(error?.message ?? error).split('\n')[0] });
    }
  } else if (data.type === 'preview') {
    // What two ranges look like before anything is solved: each one's curve, numbers and chart cells
    try {
      const c = data.config;
      const key = `${c.board}|${c.oop}|${c.ip}`;
      if (seen?.key !== key) {
        const board = fs.parseCards(c.board);
        const given = [weights(c.oop || 'AA:0'), weights(c.ip || 'AA:0')];
        seen = { key, board, given, placed: [equities(board, given[0], given[1]), equities(board, given[1], given[0])] };
      }
      const { board, given, placed } = seen;
      const ranges = [reshape(given[0], placed[0], c.dials?.oop), reshape(given[1], placed[1], c.dials?.ip)];
      // Before the river, placing every hand again on each move is too slow to follow a drag: the hands keep the equity they were given
      const after = board.length === 5 ? [equities(board, ranges[0], ranges[1]), equities(board, ranges[1], ranges[0])] : placed;
      const curveOf = (weights, equity) => { const list = []; for (let i = 0; i < fs.COMBOS; i++) if (weights[i] > 1e-6 && !Number.isNaN(equity[i])) list.push([Math.round(weights[i] * 1000) / 1000, Math.round(equity[i] * 1000) / 1000]); return list.sort((a, b) => a[1] - b[1]); };
      const at = (list, x) => { const total = list.reduce((t, r) => t + r[0], 0); let seen = 0; for (const r of list) { seen += r[0] / total; if (seen >= x) return r[1]; } return list.length ? list[list.length - 1][1] : 0; };
      const cellsOf = (weights) => {
        const sum = {}; const dead = new Set(board);
        for (let i = 0; i < fs.COMBOS; i++) {
          const a = fs.COMBO_CARDS[2 * i]; const b = fs.COMBO_CARDS[2 * i + 1];
          if (dead.has(a) || dead.has(b)) continue;
          const ra = 12 - fs.rankOf(a); const rb = 12 - fs.rankOf(b); const hi = Math.min(ra, rb); const lo = Math.max(ra, rb);
          const key = ra === rb ? `${hi},${hi}` : fs.suitOf(a) === fs.suitOf(b) ? `${hi},${lo}` : `${lo},${hi}`;
          (sum[key] ??= [0, 0])[0] += weights[i]; sum[key][1] += 1;
        }
        const out = {}; for (const [key, [w, n]] of Object.entries(sum)) if (w > 0) out[key] = Math.round((100 * w) / n) / 100;
        return out;
      };
      const side = (p) => ({ curve: curveOf(ranges[p], after[p]), base: curveOf(given[p], placed[p]), knobs: KNOBS.map((x) => at(curveOf(given[p], placed[p]), x)), stats: describe(ranges[p], after[p]), cells: cellsOf(ranges[p]) });
      self.postMessage({ type: 'preview', id: data.id, sides: { oop: side(0), ip: side(1) } });
    } catch (error) {
      self.postMessage({ type: 'preview', id: data.id, error: String(error?.message ?? error) });
    }
  } else if (data.type === 'decision' && solution) {
    self.postMessage({ type: 'decision', job: data.job, id: data.id, decision: decisionAt(fs, solution, nodes, data.id, fs.parseCards((data.dealt ?? []).join(' '))) });
  }
};
