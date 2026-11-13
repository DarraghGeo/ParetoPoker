// Solves a spot with poker-flopsolve off the main thread and answers questions about it.
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';
import { KNOBS, describe, reshape } from '../src/warp/reshape.js';

let solution = null;
let nodes = null;
let job = 0;
let last = null; // the run before this one, to start the next solve from
let seen = null; // the ranges last previewed, placed once
const strip = (list) => list.map(({ id, kind, seat, pot, edges, parent, via, invested }) => ({ id, kind, seat, pot, edges, parent, via, invested }));

/** Each combination's equity on a finished board against a range, with the cards it removes. */
function equities(board, mine, his) {
  const strength = new Int32Array(fs.COMBOS).fill(-1);
  const dead = new Set(board);
  const cards = (c) => [fs.COMBO_CARDS[2 * c], fs.COMBO_CARDS[2 * c + 1]];
  for (let c = 0; c < fs.COMBOS; c++) { const [a, b] = cards(c); if ((mine[c] > 0 || his[c] > 0) && !dead.has(a) && !dead.has(b)) strength[c] = fs.evaluateCards([...board, a, b]); }
  const theirs = []; for (let c = 0; c < fs.COMBOS; c++) if (his[c] > 0 && strength[c] >= 0) theirs.push(c);
  const out = new Float64Array(fs.COMBOS).fill(NaN);
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(mine[c] > 0) || strength[c] < 0) continue;
    const [a, b] = cards(c); let mass = 0; let win = 0;
    for (const v of theirs) { const [x, y] = cards(v); if (x === a || x === b || y === a || y === b) continue; mass += his[v]; win += his[v] * (strength[c] > strength[v] ? 1 : strength[c] < strength[v] ? 0 : 0.5); }
    if (mass > 0) out[c] = win / mass;
  }
  return out;
}

self.onmessage = async ({ data }) => {
  if (data.type === 'solve') {
    const mine = ++job;
    try {
      const c = data.config;
      const board = fs.parseCards(c.board);
      if (board.length !== 5) throw new Error('Five board cards are needed.');
      // The ranges as given, then as the dials reshape them
      const given = [fs.parseRange(c.oop), fs.parseRange(c.ip)];
      const placed = [equities(board, given[0], given[1]), equities(board, given[1], given[0])];
      const ranges = [reshape(given[0], placed[0], c.dials?.oop), reshape(given[1], placed[1], c.dials?.ip)];
      const stats = { oop: describe(ranges[0], equities(board, ranges[0], ranges[1])), ip: describe(ranges[1], equities(board, ranges[1], ranges[0])) };
      const spot = fs.defineSpot({ board: c.board, pot: c.pot, stack: c.stack, oop: ranges[0], ip: ranges[1], betSizes: [c.bets], raiseSizes: c.raises.length ? c.raises.map((times) => ({ times })) : undefined, maxRaises: c.raises.length ? c.maxRaises : 0, allowAllIn: !!c.allIn });
      // Same board as the solve before: carry its regrets over, which is much quicker than starting cold
      const warm = last && last.board === c.board ? last.run : undefined;
      const run = fs.createRun(spot, warm ? { warmStart: warm } : {});
      const started = Date.now();
      let exploit = Infinity;
      while (mine === job && exploit > 0.05 && run.completed < 3000 && Date.now() - started < 8000) {
        run.step(warm ? 10 : 50);
        exploit = run.exploitabilityPercent();
        self.postMessage({ type: 'progress', job: data.job, iterations: run.completed, exploit });
        await new Promise((resolve) => setTimeout(resolve));
      }
      if (mine !== job) return;
      solution = run.snapshot();
      last = { board: c.board, run };
      nodes = treeOf(fs, spot);
      self.postMessage({ type: 'solved', job: data.job, nodes: strip(nodes), exploit, iterations: run.completed, warm: !!warm, ms: Date.now() - started, stats });
    } catch (error) {
      self.postMessage({ type: 'error', job: data.job, message: String(error?.message ?? error) });
    }
  } else if (data.type === 'preview') {
    // What two ranges look like before anything is solved: each one's curve, numbers and chart cells
    try {
      const c = data.config;
      const key = `${c.board}|${c.oop}|${c.ip}`;
      if (seen?.key !== key) {
        const board = fs.parseCards(c.board);
        const given = [fs.parseRange(c.oop || 'AA:0'), fs.parseRange(c.ip || 'AA:0')];
        seen = { key, board, given, placed: [equities(board, given[0], given[1]), equities(board, given[1], given[0])] };
      }
      const { board, given, placed } = seen;
      const ranges = [reshape(given[0], placed[0], c.dials?.oop), reshape(given[1], placed[1], c.dials?.ip)];
      const after = [equities(board, ranges[0], ranges[1]), equities(board, ranges[1], ranges[0])];
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
    self.postMessage({ type: 'decision', job: data.job, id: data.id, decision: decisionAt(fs, solution, nodes, data.id) });
  }
};
