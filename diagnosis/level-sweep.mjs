// Reference points for tuning the turn opening bet frequency: for many turn spots and both seats,
// the engine's loss to the best response at each of several bet frequencies. The target is the
// frequency that loses least, not the solver's. One JSON line per measurement, appended as it
// goes, so a stopped run resumes where it left off.
//   node diagnosis/level-sweep.mjs [out.jsonl] [--pairs A,B] [--limit n]
// Each line: spot (pair, board, depth), seat, level (null = the engine's own frequency), the loss
// to the best response and to the equilibrium, the engine's and the solver's bet frequency at the
// decision, and how the spot is defined as the street begins.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { Equity, KindMixer, Range, RangeStrategist, SelectionContext, SolverMatch, cards, fittedMixer, presets } from '../src/index.js';
import { PAIRS, gameOf, pool } from '../src/solver/spots.js';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'diagnosis/level-sweep.jsonl';
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };

/** Ten pairs of ranges: the four of src/solver/spots.js and six more kinds of pot. */
const MORE = {
  E: { oopRange: '88-22,A9s-A2s,KTs-K6s,Q8s+,J8s+,T7s+,97s+,86s+,75s+,65s,54s,AJo-A9o,KJo+,QJo', ipRange: '22+,A2s+,K8s+,Q9s+,J9s+,T8s+,98s,87s,76s,ATo+,KJo+,QJo' }, // big blind against a cutoff open
  F: { oopRange: 'QQ-77,AQs-ATs,KQs,KJs,QJs,JTs,T9s,AQo', ipRange: 'JJ+,AKs,AQs,A5s-A4s,KQs,76s,65s,AKo' }, // 3-bet pot, the 3-bettor in position
  G: { oopRange: '99-22,A9s-A2s,K9s-K2s,Q2s+,J5s+,T6s+,96s+,85s+,75s+,64s+,54s,A9o-A2o,KTo-K5o,Q8o+,J8o+,T8o+,98o', ipRange: '88-22,A8s-A2s,K9s-K2s,Q2s+,J4s+,T6s+,95s+,85s+,74s+,64s+,53s+,A8o-A2o,KTo-K4o,Q7o+,J7o+,T7o+,97o+,87o' }, // limped pot, two capped ranges
  H: { oopRange: 'QQ+,AKs,A5s,AKo', ipRange: 'KK-TT,AKs,AQs,AKo' }, // 4-bet pot
  I: { oopRange: 'JJ+,AJs+,A5s-A2s,KQs,KJs,K9s,QJs,J9s,T9s,AQo+,KQo', ipRange: 'TT-44,AJs-A8s,KQs-KTs,QJs,QTs,JTs,T9s,98s,87s,AQo,AJo,KQo' }, // 3-bet pot, a polar 3-bettor out of position
  J: { oopRange: '99-22,AJs-A2s,KQs-K8s,Q9s+,J9s+,T8s+,97s+,86s+,76s,65s,AQo-ATo,KQo,KJo', ipRange: '55+,A9s+,A5s-A4s,KTs+,QTs+,JTs,T9s,AJo+,KQo' }, // big blind against an early open
};
const ALL = { ...PAIRS, ...MORE };
const BOARDS = ['Ks7h2d5c', 'JsTs4h8d', 'QsJd6c3h', 'Ac9c5d5h', '7h6h5c2d', 'KdQd4s9h', '9s8s2hAd', 'Th4d4c7s'];
const DEPTHS = [1, 2.5, 5];
const LEVELS = [null, 0.1, 0.3, 0.5, 0.7, 0.9];
const SIZES = { bet: '33%,75%,150%', raise: '2.5x' };

const pairs = (option('pairs') ?? Object.keys(ALL).join(',')).split(',');
let jobs = [];
for (const pair of pairs) for (const board of BOARDS) for (const depth of DEPTHS) for (const seat of ['oop', 'ip']) for (const level of LEVELS) {
  jobs.push({ key: `${pair}|${board}|${depth}|${seat}|${level}`, pair, board, depth, seat, level });
}
// A fixed shuffle of the spots (levels of one spot stay together), so a part of the run is a fair sample
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
jobs.sort((a, b) => hash(`${a.pair}${a.board}${a.depth}${a.seat}`) - hash(`${b.pair}${b.board}${b.depth}${b.seat}`) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);
jobs = jobs.filter((j) => !done.has(j.key));
if (option('limit')) jobs = jobs.slice(0, Number(option('limit')));
console.log(`${jobs.length} measurements to do, ${done.size} already in ${out}`);

const equity = new Equity();
const profiles = new Map();
function profileOf(job) {
  const id = `${job.pair}|${job.board}|${job.seat}`;
  if (!profiles.has(id)) {
    const board = cards.parseCards(job.board);
    const [me, him] = job.seat === 'oop' ? ['oopRange', 'ipRange'] : ['ipRange', 'oopRange'];
    const context = new SelectionContext({ equity, position: job.seat, spot: { street: 'turn', pot: 100, stack: 100 }, board, actions: [], hero: Range.from(ALL[job.pair][me]).without(board).weights, villain: Range.from(ALL[job.pair][him]).without(board).weights });
    const { street, position, facing, spr, ...profile } = context.profile;
    profiles.set(id, profile);
  }
  return profiles.get(id);
}

const turnOpen = (c) => c.street === 'turn' && !c.facing;
let finished = 0;
const started = Date.now();
await pool(jobs, async (job) => {
  const spot = { ...ALL[job.pair], board: job.board, pot: 100, stack: Math.round(100 * job.depth), sizes: SIZES };
  // The engine as fitted, with its turn opening frequency set to `level`; the opponent is pictured
  // as the fitted engine unchanged, so the setting cannot alter hero's estimate of his range
  const base = presets.fitted();
  const mixer = job.level == null ? base.mixer : new KindMixer({ tables: base.mixer.tables, rules: fittedMixer().rules, level: (c, f) => (turnOpen(c) ? job.level : f.bet) });
  try {
    const result = await new SolverMatch(gameOf(spot), { strategist: new RangeStrategist({ ...base, mixer }), opponent: new RangeStrategist(presets.fitted()) }).play(job.seat, { iterations: 300 });
    const line = result.lines.find((l) => l.player === job.seat && l.path === (job.seat === 'oop' ? '' : 'check'));
    const betting = (f) => (f ? 1 - f[line.actions.indexOf('check')] : null);
    appendFileSync(out, `${JSON.stringify({ key: job.key, pair: job.pair, board: job.board, depth: job.depth, seat: job.seat, level: job.level, exploited: result.loss.exploited, versusGto: result.loss.versusGto, engineBets: line ? betting(line.engine) : null, solverBets: line ? betting(line.solver) : null, profile: profileOf(job) })}\n`);
  } catch (error) {
    appendFileSync(`${out}.errors`, `${job.key}\t${error.message}\n`);
  }
  finished++;
  if (finished % 20 === 0) console.log(`${finished} / ${jobs.length} done, ${((Date.now() - started) / 60000).toFixed(1)} min`);
});
console.log(`finished: ${finished} measurements in ${((Date.now() - started) / 60000).toFixed(1)} min`);
