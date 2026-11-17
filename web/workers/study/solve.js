// Solving a version of the spot: from the solves kept, else from scratch (warmed by the last run on the same board), with a
// solve handed over from Train shown first. A lite solve stops once its first decisions stop moving; any other, once it
// reaches its street's accuracy or runs out of time.
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../../src/solver/flopsolve.js';
import { isNeutral, reshape } from '../../../src/warp/reshape.js';
import { along, pause } from '../../solver/progress.js';
import { equities, firstLine, held, keep, say, spotOf, streetName, tree, use, weights } from './held.js';

/** Exploitability aimed for (% of the pot), time allowed and iterations a chunk: conclusions are proven for rivers solved
 *  to 0.01% and turns to 0.02%, so each is taken that far; a flop stops at the usual 0.3%. */
const PLAN = {
  flop: { target: 0.3, patience: 180000, chunk: 2, warmChunk: 2 },
  turn: { target: 0.02, patience: 90000, chunk: 10, warmChunk: 10 },
  river: { target: 0.01, patience: 15000, chunk: 50, warmChunk: 10 },
};
const LITE_PATIENCE = 300000; const MAX_ITERATIONS = 3000;
const wanted = (mine) => mine === held.job && !held.halt;

/** The ranges as given, then as the editor's dials reshape them. */
function rangesFor(c, board) {
  const given = [weights(c.oop), weights(c.ip)];
  if (isNeutral(c.dials?.oop) && isNeutral(c.dials?.ip)) return given;
  const placed = [equities(board, given[0], given[1]), equities(board, given[1], given[0])];
  return [reshape(given[0], placed[0], c.dials?.oop), reshape(given[1], placed[1], c.dials?.ip)];
}

/** The spot to solve and, for one too big to solve whole, its lite preset. */
function defined(c, board) {
  const [oop, ip] = rangesFor(c, board);
  const whole = spotOf(c, oop, ip);
  const preset = c.lite ? fs.litePreset(whole) : null;
  return { spot: fs.defineSpot(preset ? preset.config : whole), preset };
}

/** A solve handed over for this version, read as it is (never stepped) and shown at once: 'shown' for a street that is then
 *  solved finer here, 'final' for a lite flop, which is kept as it came; false when there is none or it does not fit. */
function showAdopted(data, spot, preset) {
  const adopted = held.adopted?.key === data.key ? held.adopted : null;
  if (adopted) held.adopted = null;
  if (!adopted || !!preset !== adopted.lite) return false;
  try {
    const read = fs.createRun(spot, { ...(preset?.options ?? {}), analysisOnly: true }); const sums = read.solver.ctx.strategySum;
    if (!(sums instanceof Float32Array) || sums.length !== adopted.sums.length) return false;
    sums.set(adopted.sums);
    const entry = { solution: read.snapshot(), nodes: treeOf(fs, spot), run: null, board: data.config.board, exploit: adopted.exploit, lite: adopted.lite, bytes: spot.estimate.bytes, config: data.config };
    use(entry); if (adopted.lite) keep(data.key, entry);
    say({ type: 'solved', job: data.job, nodes: tree(), exploit: adopted.exploit, lite: adopted.lite, provisional: !adopted.lite });
    return adopted.lite ? 'final' : 'shown';
  } catch { return false; }
}

/** Everything a solve from scratch starts with. */
function prepare(data, mine) {
  const c = data.config; const board = fs.parseCards(c.board);
  if (board.length < 3 || board.length > 5) throw new Error('Three, four or five board cards are needed.');
  const { spot, preset } = defined(c, board);
  const warm = held.last && held.last.board === c.board && !!held.last.lite === !!c.lite ? held.last.run : undefined;
  const shown = showAdopted(data, spot, preset);
  if (shown === 'final') return { final: true };
  const run = fs.createRun(spot, { ...(preset?.options ?? {}), ...(warm ? { warmStart: warm } : {}) });
  const plan = PLAN[streetName(board)];
  const progress = (extra) => say({ type: 'progress', job: data.job, refine: !!shown, street: streetName(board), ...extra });
  return { mine, spot, preset, warm, run, plan, progress, chunk: warm ? plan.warmChunk : plan.chunk, started: Date.now() };
}

async function solveLite({ run, preset, mine, started, progress }) {
  const options = preset.options.settle ?? {}; const settle = fs.trackSettle(options); let settled = false;
  while (wanted(mine) && !settled && run.completed < preset.options.iterations && Date.now() - started < LITE_PATIENCE) {
    run.step(5);
    if (run.completed % (options.every ?? 20) === 0) settled = settle.check(run.snapshot(), run.completed);
    progress({ lite: true, iterations: run.completed, moving: settle.movement, done: along(0.35, settle.movement, options.tolerance ?? 0.01) });
    await pause();
  }
  return mine === held.job && run.completed ? run.exploitabilityPercent() : Infinity;
}

async function solveFine({ run, plan, chunk, mine, started, progress }) {
  let exploit = Infinity;
  while (wanted(mine) && exploit > plan.target && run.completed < MAX_ITERATIONS && Date.now() - started < plan.patience) {
    run.step(chunk); exploit = run.exploitabilityPercent();
    progress({ iterations: run.completed, exploit, target: plan.target });
    await pause();
  }
  return exploit;
}

function finish(data, s, exploit) {
  const entry = { solution: s.run.snapshot(), nodes: treeOf(fs, s.spot), run: s.run, board: data.config.board, exploit, lite: !!s.preset, bytes: s.spot.estimate.bytes, config: data.config };
  use(entry); keep(data.key, entry);
  say({ type: 'solved', job: data.job, nodes: tree(), exploit, lite: !!s.preset, iterations: s.run.completed, warm: !!s.warm, ms: Date.now() - s.started });
}

async function fromScratch(data, mine) {
  const s = prepare(data, mine);
  if (s.final) return;
  s.progress({ iterations: 0, exploit: Infinity, target: s.plan.target });
  await pause();
  let exploit = s.preset ? await solveLite(s) : await solveFine(s);
  if (mine !== held.job) return;
  if (!s.run.completed) { s.run.step(1); exploit = s.run.exploitabilityPercent(); }
  finish(data, s, exploit);
}

export async function solve(data) {
  const mine = ++held.job; held.halt = false;
  if (held.adopting) { await held.adopting; if (mine !== held.job) return; }   // a handed-over flop being read from the device
  const kept = held.kept.get(data.key);
  if (kept) { use(kept); say({ type: 'solved', job: data.job, nodes: tree(), exploit: kept.exploit, lite: kept.lite }); return; }
  try { await fromScratch(data, mine); } catch (error) { say({ type: 'error', job: data.job, message: firstLine(error) }); }
}
