// Questions about the solve on screen: a decision, a street's subgame, and the explanations (a hand, the range, what would
// change it, the analytical look). A decision is studied once; other questions about it then answer at once.
import * as fs from 'poker-flopsolve';
import { decisionAt } from '../../../src/solver/flopsolve.js';
import { study, measure, tolerance, explainStreet, explainRange, analysis, RARE } from '../../../src/explain/street.js';
import { whatIf } from '../../../src/explain/whatif.js';
import { onBoard } from '../../solver/deck.js';
import { dealtOf, firstLine, held, say, spotOf, streetName } from './held.js';

/** A decision studied, once for each node and cards dealt. */
function studied(data) {
  const dealt = dealtOf(data); const key = `${data.id}|${dealt.join(',')}`;
  if (!held.studies.has(key)) held.studies.set(key, study(fs, held.solution, held.nodes, data.id, dealt));
  return held.studies.get(key);
}

/** Answer a question, or say it failed with what the page shows instead. */
function answer(data, type, work, failed) {
  try { say({ type, job: data.job, id: data.id, ...work() }); } catch (error) { say({ type, job: data.job, id: data.id, ...failed, error: firstLine(error) }); }
}

/** Whether a spot can be solved whole, and if not whether lite can take it. */
export function fits(data) {
  let out = { whole: true, lite: false, message: '' };
  const c = data.config;
  try { fs.defineSpot(spotOf(c, c.oop, c.ip)); } catch (error) {
    if (error instanceof fs.SpotTooLargeError) out = { whole: false, lite: liteFits(c), message: firstLine(error) };
  }
  say({ type: 'fits', id: data.id, ...out });
}
function liteFits(c) { try { fs.defineSpot(fs.litePreset(spotOf(c, c.oop, c.ip)).config); return true; } catch { return false; } }

/** The spot that starts at a street's first decision on the cards dealt: the pot and stacks as they stand, the ranges as they arrive. */
function subgameOf(data) {
  const { solution, nodes } = held;
  const board = [...solution.spot.board, ...dealtOf(data).slice(0, nodes[data.id].round)];
  const found = solution.spot.resolveBoard(board);
  const sub = solution.subgameAt(data.id, found.board, {});
  const real = (p) => onBoard(solution.reachAt(data.id, found.board, p), found, board);
  return { spot: { board: fs.formatCards(board), pot: sub.pot, stack: sub.stack, oop: real(0), ip: real(1) } };
}

function told(data) {
  const st = studied(data); const street = streetName(st.f.board);
  const T = tolerance(st.f.round === 0 ? street : `${street} after a deal`, held.current.exploit, st.lineReach);
  const m = measure(st, data.combo, { worth: !!T || Math.min(...st.lineReach) >= RARE });
  const t = explainStreet(st, m, T);
  return { combo: data.combo, told: t && { name: t.name, strategy: t.strategy, line: t.line, detail: t.detail, reasons: t.reasons, silent: t.silent } };
}

/** Every hand of the range to act, by name: how much of his range it beats as the board stands, and how much of its equity
 *  it wins from behind (nothing on the river, where the first is its equity). */
function partsOf(st) {
  const parts = st.drawParts(); const eq = st.equity(); const out = {}; const r3 = (x) => (Number.isNaN(x) ? 0 : Math.round(1e3 * x) / 1e3);
  for (let c = 0; c < fs.COMBOS; c++) if (st.f.mine[c] > 1e-6) out[fs.formatCombo(c)] = parts ? [r3(parts.now[c]), r3(parts.draw[c])] : [r3(eq[c]), 0];
  return out;
}

const asked = {
  subgame: (data) => { try { say({ type: 'subgame', job: data.job, ...subgameOf(data) }); } catch (error) { say({ type: 'error', job: data.job, message: firstLine(error) }); } },
  analysis: (data) => answer(data, 'looked', () => ({ combo: data.combo ?? null, look: analysis(studied(data), data.combo ?? null) }), { combo: data.combo, look: null }),
  whatif: (data) => answer(data, 'whatif', () => ({ said: whatIf(fs, { solution: held.solution, nodes: held.nodes, config: held.current?.config }, data.id, dealtOf(data)) }), { said: null }),
  parts: (data) => answer(data, 'parts', () => ({ key: data.key, parts: partsOf(studied(data)) }), { key: data.key, parts: null }),
  range: (data) => answer(data, 'ranged', () => ({ said: explainRange(studied(data)) }), { said: null }),
  explain: (data) => answer(data, 'told', () => told(data), { combo: data.combo, told: null }),
  decision: (data) => say({ type: 'decision', job: data.job, id: data.id, decision: decisionAt(fs, held.solution, held.nodes, data.id, dealtOf(data)) }),
};

/** A question about the solve on screen; none is answered before there is one. */
export function ask(data) { if (held.solution) asked[data.type](data); }
export const QUESTIONS = Object.keys(asked);
