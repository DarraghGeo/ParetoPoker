// The whole method, played from the flop. One seat decides everything from what the strength ladder shows (both ranges by
// level, the two advantage lines, the value and price lines, each bar's own line, the street, the seat) and nothing else:
// no equities, no solution. The other seat plays the solution. Scored by what the seat gives up over the full hand.
//   The chart at each decision shows the seat's own range as it has played it, and his range as the solution plays it.
//   Arms: exact (the rule's number), word (the frequency as one of three words, played at its middle), vague (the word up
//   to 20 points either way), loose (vague, and the value and price lines up to 10 points of his range off).
//   node play.mjs [spots] [seed]   -> out/play.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { readFileSync } from 'node:fs';
import { decide, readSpot, RULES } from './engine.mjs';
// The engine (engine.mjs) played over the whole hand in one seat, the solution in the other: what it gives up, and what a perfect answer wins against it.
//   ARMS=engine TREE=raise [CELLS=<solved tables json>] node research/engine/play.mjs [spots] [seed]   -> out/play-engine.jsonl
//   Arms: rules (exact equity), read (equity read off the chart), cells (the solved answers by equity band, rules where they have none), noisy (exact equity up to 10 points off).
const CELLS = process.env.CELLS ? JSON.parse(readFileSync(process.env.CELLS, 'utf8')) : null;
let ENGINE_ARMS = CELLS ? { rules: { rule: 'engine', eq: 'exact' }, read: { rule: 'engine' }, cells: { rule: 'engine', eq: 'exact', cells: true, versus: 'start' }, noisy: { rule: 'engine', eq: 'exact', noise: 0.1 }, rulesFill: { rule: 'engine', eq: 'exact', fill: true } } : { rules: { rule: 'engine', eq: 'exact' }, read: { rule: 'engine' }, rulesFill: { rule: 'engine', eq: 'exact', fill: true }, noisy: { rule: 'engine', eq: 'exact', noise: 0.1 } };
// the rules with every fix adopted so far: the defence fill, the turn and river betting fixes, and in position facing a turn bet the whole minimum defence by equity; out of position 95% of it, three points more or less for each point the range's equity against his bets is over or under 50%; in position against a flop lead every continuing hand raises
const NOW = { rule: 'engine', eq: 'exact', fill: 0.9, turnBySeat: { ip: { from: 0.75, check: 0.25 }, oop: { from: 0.5, check: 0.5 } }, river: { ratio: 1 }, valueUp: 0.05, exact: { turn: [{ times: 1, seat: 'ip' }, { times: 0.95, perEquity: 3, around: 0.5, seat: 'oop' }] }, patch: { flopIpRaisesLeads: true } };
if (process.env.WHERE) {   // WHERE=1: the engine at one kind of decision at a time, the solution's play elsewhere, to find where a perfect answer makes its gain
  const base = { rule: 'engine', eq: 'exact', fill: 0.9 }; for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k];
  Object.assign(ENGINE_ARMS, { all: base, betFlop: { ...base, only: (st, facing) => st === 3 && !facing }, betTurn: { ...base, only: (st, facing) => st === 4 && !facing }, betRiver: { ...base, only: (st, facing) => st === 5 && !facing },
    faceFlop: { ...base, only: (st, facing) => st === 3 && facing }, faceTurn: { ...base, only: (st, facing) => st === 4 && facing }, faceRiver: { ...base, only: (st, facing) => st === 5 && facing } }); }
if (process.env.TURN) {    // TURN=1: versions of the turn betting rule, the engine at turn bets only and the solution's play elsewhere
  const base = { rule: 'engine', eq: 'exact', fill: 0.9, only: (st, facing) => st === 4 && !facing }; for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k];
  Object.assign(ENGINE_ARMS, process.env.TURN === '2' ? { value65: { ...base, turnFrom: 0.65 }, value65check25: { ...base, turn: { check: 0.25 }, turnFrom: 0.65 }, value75: { ...base, turnFrom: 0.75 }, value75check25: { ...base, turn: { check: 0.25 }, turnFrom: 0.75 }, value75bluff1: { ...base, turn: { ratio: 1 }, turnFrom: 0.75 }, check50: { ...base, turn: { check: 0.5 } } }
    : { plain: base, bluff1: { ...base, turn: { ratio: 1 } }, bluff2: { ...base, turn: { ratio: 2 } }, bluff1check25: { ...base, turn: { ratio: 1, check: 0.25 } }, value65bluff1: { ...base, turn: { ratio: 1 }, turnFrom: 0.65 }, value65bluff2: { ...base, turn: { ratio: 2 }, turnFrom: 0.65 } }); }
if (process.env.RIVER) {   // RIVER=1: versions of the river betting rule, the engine at river bets only and the solution's play elsewhere
  const base = { rule: 'engine', eq: 'exact', fill: 0.9, only: (st, facing) => st === 5 && !facing }; for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k];
  Object.assign(ENGINE_ARMS, process.env.RIVER === '2' ? JSON.parse(process.env.RIVER_ARMS).reduce((o, [n, river, extra]) => ({ ...o, [n]: { ...base, river, ...extra } }), {})
    : { plain: base, check25: { ...base, river: { check: 0.25 } }, check50: { ...base, river: { check: 0.5 } }, noBluffs: { ...base, river: { ratio: 0 } }, ratio1: { ...base, river: { ratio: 1 } }, ratio1check25: { ...base, river: { ratio: 1, check: 0.25 } }, value85: { ...base, valueUp: 0.05 } }); }
if (process.env.COMBO) {   // COMBO=1: the rules as they were (with the defence fill) against the rules with every fix found so far
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const before = { rule: 'engine', eq: 'exact', fill: 0.9 };
  const after = { ...before, turnBySeat: { ip: { from: 0.75, check: 0.25 }, oop: { from: 0.5, check: 0.5 } }, river: { ratio: 1 }, valueUp: 0.05 };
  Object.assign(ENGINE_ARMS, { before, after, plain: { rule: 'engine', eq: 'exact' }, afterNoisy: { ...after, noise: 0.1 } }); }
if (process.env.FLOP) {    // FLOP=1: versions of the in-position flop bet, every other fix on, the engine everywhere
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, process.env.FLOP === '2' ? JSON.parse(process.env.FLOP_ARMS).reduce((o, [n, extra]) => ({ ...o, [n]: { ...after, ...extra } }), {})
    : { betAll: after, solverFlop: { ...after, only: (st) => st !== 3 }, value60draws: { ...after, flopFrom: 0.6 }, value60drawsBluffs: { ...after, flopFrom: 0.6, flop: { ratio: 2 } }, betAllHalf: { ...after, flop: { check: 0.5 } }, value50draws: { ...after, flopFrom: 0.5 } }); }
if (process.env.EXCEPT) {  // EXCEPT=1: every fix on and the engine everywhere but one kind of decision, where the solution plays: what each kind of decision still costs
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, { all: after, notTurnBets: { ...after, only: (st, f) => !(st === 4 && !f) }, notTurnFacing: { ...after, only: (st, f) => !(st === 4 && f) }, notRiverBets: { ...after, only: (st, f) => !(st === 5 && !f) }, notRiverFacing: { ...after, only: (st, f) => !(st === 5 && f) }, notFlopFacing: { ...after, only: (st, f) => !(st === 3 && f) }, notTurn: { ...after, only: (st) => st !== 4 }, notRiver: { ...after, only: (st) => st !== 5 } }); }
if (process.env.RAISE) {   // RAISE=1: raising before the river, every other fix on, the engine everywhere
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, process.env.RAISE === '2' ? JSON.parse(process.env.RAISE_ARMS).reduce((o, [n, extra]) => ({ ...o, [n]: { ...after, ...extra } }), {})
    : { noRaises: after, turn85: { ...after, early: { turn: 0.85 } }, turn85draws: { ...after, early: { turn: 0.85 }, draws: { turn: 0.5 } }, turn75draws: { ...after, early: { turn: 0.75 }, draws: { turn: 0.5 } }, both85: { ...after, early: { flop: 0.85, turn: 0.85 } }, both85draws: { ...after, early: { flop: 0.85, turn: 0.85 }, draws: { flop: 0.5, turn: 0.5 } } }); }
if (process.env.SOLVED) {  // SOLVED=1 CELLS=<file>: the solved answers by equity band at some decisions, the fixed rules at the others
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, { rules: after, cellsFacingTurn: { ...after, cells: true, cellsWhere: (st, f) => st === 4 && f }, cellsFacing: { ...after, cells: true, cellsWhere: (st, f) => f }, cellsTurn: { ...after, cells: true, cellsWhere: (st) => st === 4 }, cellsEverywhere: { ...after, cells: true, cellsWhere: () => true }, cellsAlone: { rule: 'engine', eq: 'exact', cells: true, versus: 'start' } }); }
const FACE = {};           // FACING=1: facing a turn bet or raise, the engine's answers beside the solution's for the same hands, by equity band
if (process.env.FACING) { for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; ENGINE_ARMS.after = NOW; }
if (process.env.FACEFIX) { // FACEFIX=1: versions of facing a turn bet, every other fix on
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  const T = (ip, oop) => ({ callOver: { ...RULES.callOver, turn: { ip, oop } } });
  Object.assign(ENGINE_ARMS, process.env.FACEFIX === '2' ? JSON.parse(process.env.FACE_ARMS).reduce((o, [n, patch, extra]) => ({ ...o, [n]: { ...after, patch, ...extra } }), {})
    : { asNow: after, ipTighter: { ...after, patch: T(0.10, 0.10) }, oopLooser: { ...after, patch: T(0, 0) }, swapped: { ...after, patch: T(0.10, 0) }, swappedDraws: { ...after, patch: { ...T(0.10, 0), drawsCallRaise: true } }, swappedDrawsRaise: { ...after, patch: { ...T(0.10, 0), drawsCallRaise: true, earlyRaiseBand: { turn: { ip: [0.5, 0.8] } } } } }); }
if (process.env.SUB) {     // SUB=1: is it the hands or the frequency? Facing a turn bet, one of them is taken from the solution
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, { asNow: after, solverHands: { ...after, sub: 'hands' }, solverFrequency: { ...after, sub: 'freq' }, solverNoRaises: { ...after, sub: 'noraise' }, solverAll: { ...after, only: (st, f) => !(st === 4 && f) } }); }
if (process.env.EXACT) {   // EXACT=1: facing a turn bet, continue with a set multiple of the minimum defence, the best hands by equity
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; const after = NOW;
  Object.assign(ENGINE_ARMS, process.env.EXACT === '2' ? JSON.parse(process.env.EXACT_ARMS).reduce((o, [n, exact]) => ({ ...o, [n]: { ...after, exact } }), {})
    : { asNow: after, turn90: { ...after, exact: { turn: { times: 0.9 } } }, turn90raises: { ...after, exact: { turn: { times: 0.9, raises: true } } }, turn80: { ...after, exact: { turn: { times: 0.8 } } }, turn100: { ...after, exact: { turn: { times: 1 } } }, flopTurn90: { ...after, exact: { flop: { times: 0.9 }, turn: { times: 0.9 } } } }); }
if (process.env.TRY) {     // TRY='[["name", {changes to the current rules}], ...]': versions of the current rules side by side
  for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; for (const [n, extra] of JSON.parse(process.env.TRY)) ENGINE_ARMS[n] = { ...NOW, ...extra, patch: { ...NOW.patch, ...(extra.patch ?? {}) } }; }
if (process.env.FILLS) { for (const k of Object.keys(ENGINE_ARMS)) delete ENGINE_ARMS[k]; for (const x of process.env.FILLS.split(',')) ENGINE_ARMS[`fill${x.endsWith('a') ? 'All' : ''}${Math.round(100 * parseFloat(x))}`] = { rule: 'engine', eq: 'exact', fill: parseFloat(x), everywhere: x.endsWith('a') }; }   // 1a: out of position before the river as well   // FILLS=0.9,1,1.1: the balance rule at these multiples of the minimum defence

const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1]; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0);
const RK = Array.from({ length: 52 }, (_, c) => fs.rankOf(c)); const SU = Array.from({ length: 52 }, (_, c) => fs.suitOf(c)); const ACE = Math.max(...RK); const LOW = Math.min(...RK);
const HIGHER = fs.evaluateCards(fs.parseCards('AsAh2c7d9h')) > fs.evaluateCards(fs.parseCards('3s4h2c7d9h')) ? 1 : -1;
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => { const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot]; for (let i = 0; i < count; i++) { const p = probsOf(L.memberCombo[L.memberStart[from + i]]); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; } };
}
function copySolved(solved, target, nodes, counts, player) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}

// ---- what the ladder shows of a hand on a board ---------------------------------------------------------------------
const straightTop = (have) => { for (let top = ACE; top >= LOW + 3; top--) { let ok = true; for (let k = 0; k < 5 && ok; k++) { const r = top - k; ok = r < LOW ? have[ACE] : have[r]; } if (ok) return top; } return -1; };
/** Levels: 7 a set, straight or flush and better, 6 two pair, 5 overpair, 4 top pair, 3 middle pair, 2 low pair, 1 a draw, 0 trash. */
function facts(board) {
  const lv = new Int8Array(N).fill(-1); const come = new Float32Array(N); const str = new Float64Array(N); const river = board.length === 5; const flop = board.length === 3;
  const bs = [0, 0, 0, 0]; const br = new Uint8Array(16); const taken = new Uint8Array(52); for (const c of board) { bs[SU[c]]++; br[RK[c]]++; taken[c] = 1; }
  const tops = [...new Set(board.map((c) => RK[c]))].sort((x, y) => y - x); const top = tops[0]; const second = tops[1] ?? -1; const have = new Uint8Array(16); for (const c of board) have[RK[c]] = 1; const boardStraight = straightTop(have);
  for (let c = 0; c < N; c++) {
    const a = CA(c), b = CB(c); if (taken[a] || taken[b]) continue; const ra = RK[a], rb = RK[b]; str[c] = HIGHER * fs.evaluateCards([...board, a, b]);
    const h = Uint8Array.from(have); h[ra] = 1; h[rb] = 1; const st = straightTop(h); let level = 0;
    const flush = [SU[a], SU[b]].some((s) => bs[s] < 5 && bs[s] + (SU[a] === s) + (SU[b] === s) >= 5);
    const trips = br[ra] + 1 + (ra === rb) >= 3 || br[rb] + 1 + (ra === rb) >= 3;
    if (flush || st > boardStraight || trips) level = 7;
    else if (ra !== rb && br[ra] && br[rb]) level = 6;
    else if (ra === rb) level = ra > top ? 5 : ra >= second ? 3 : 2;
    else if (br[ra] || br[rb]) { const hit = br[ra] ? ra : rb; level = hit === top ? 4 : hit === second ? 3 : 2; }
    if (!river && level < 7) {
      const fd = [SU[a], SU[b]].some((s) => bs[s] + (SU[a] === s) + (SU[b] === s) === 4); let outs = 0; for (let r = LOW; r <= ACE; r++) if (!h[r]) { h[r] = 1; if (straightTop(h) > st) outs += 4; h[r] = 0; }
      const back = flop && [SU[a], SU[b]].some((s) => bs[s] + (SU[a] === s) + (SU[b] === s) === 3 && bs[s] < 3); const over = (ra > top) + (rb > top);
      come[c] = (fd ? 9 : 0) + outs + (level < 4 ? 3 * over : 0) + (back ? 1.5 : 0); if (level === 0 && (fd || outs >= 8)) level = 1;
    }
    lv[c] = level;
  }
  // the order of the ladder, weakest first: by level, then along the bar's own line (strength now from top pair up and on the river; what is still to come below)
  const live = []; for (let c = 0; c < N; c++) if (lv[c] >= 0) live.push(c);
  const own = (x, y) => (lv[x] >= 4 || river ? str[x] - str[y] : come[x] - come[y] || str[x] - str[y]);
  const order = Int16Array.from(live.sort((x, y) => lv[x] - lv[y] || own(x, y))); const byCome = Int16Array.from([...order].sort((x, y) => come[y] - come[x] || lv[y] - lv[x] || str[y] - str[x]));
  const byStr = Int16Array.from([...order].sort((x, y) => str[x] - str[y]));
  return { lv, come, str, order, byCome, byStr, river, flop };
}

// ---- the method ---------------------------------------------------------------------------------------------------------
/** A range on the ladder: the share of it at each level, and each hand's place along its bar (0 the low end, 1 the high end). */
function onLadder(F, w) {
  const share = new Float64Array(8); let total = 0; for (const c of F.order) { share[F.lv[c]] += w[c]; total += w[c]; } const place = new Float32Array(N); const seen = new Float64Array(8);
  if (total > 0) for (const c of F.order) { const k = F.lv[c]; if (w[c] > 0) { place[c] = (seen[k] + w[c] / 2) / share[k]; seen[k] += w[c]; } }
  for (let k = 0; k < 8; k++) share[k] /= total || 1; return { share, place, total };
}
/** The line across the chart under which a share `t` of a range lies: a level and how far up its bar. */
function lineAt(share, t) { let below = 0; for (let k = 0; k < 8; k++) { if (below + share[k] >= t && share[k] > 0) return { k, frac: (t - below) / share[k] }; below += share[k]; } return { k: 8, frac: 0 }; }
const aboveShare = (share, line) => { let t = 0; for (let k = line.k + 1; k < 8; k++) t += share[k]; return t + (line.k < 8 ? share[line.k] * (1 - line.frac) : 0); };
const mid3 = (f) => (Math.min(2, Math.floor(3 * Math.min(Math.max(f, 0), 0.999))) + 0.5) / 3;
/** The rates of experiment 12: how often the value, the middle and the bottom bet. */
function rates(street, ip, adv, strong) {
  let value, middle, bottom;
  if (street === 3 && !ip) { value = [0.35, 0.45, 0.9][adv]; middle = [0.15, 0.35, 0.65][adv]; bottom = [0.1, 0.3, 0.75][adv]; }
  else { value = ip ? (street === 5 ? 1 : 0.8) : street === 5 ? 0.75 : 0.55; middle = street === 5 ? (ip ? 0.25 : 0.4) : 1 / 3; bottom = [0.25, 0.35, 0.55][adv] + (ip ? 0.05 : -0.05); }
  if (strong && !(ip && street === 5)) { value /= 2; bottom /= 2; } if (strong && street === 5 && !ip) middle /= 2;
  return [value, middle, bottom];
}
/** The rebuilt river rule, read off the chart. His strong hands: his share above the line 80% of my range sits under. His weak
 *  hands: his share under the line 30% (or 20%) of my range sits under. First to act: check everything if over 30% of his range
 *  is strong; else value above the 80% line (90% if most of his range is weak) and every hand more than a quarter below his weak
 *  share. Checked to: value above the 80% line; bluffs only from under the 15% line, s/(1+s) per value bet, weakest first, and
 *  none if he has next to nothing weak. */
function riverBet(F, mine, me, him, s, ip, arm, rnd) {
  const bet = new Float32Array(N); const jit = arm.lines ? (2 * rnd() - 1) * arm.lines : 0; const hisOver = (x) => aboveShare(him.share, lineAt(me.share, x));
  const under = (c, l) => !(F.lv[c] > l.k || (F.lv[c] === l.k && me.place[c] >= l.frac));
  if (!ip) { if (hisOver(0.8) > 0.3) return bet; const weak = 1 - hisOver(0.3); const v = lineAt(him.share, Math.min(0.97, (weak >= 0.6 ? 0.9 : 0.8) + jit)); const b = lineAt(him.share, Math.max(0, weak - 0.25 + jit));
    for (const c of F.order) if (mine[c] > 0 && (!under(c, v) || under(c, b))) bet[c] = 1; return bet; }
  const v = lineAt(him.share, Math.min(0.97, 0.8 + jit)); let room = 0; for (const c of F.order) if (mine[c] > 0 && !under(c, v)) { bet[c] = 1; room += mine[c]; }
  room = 1 - hisOver(0.2) >= 0.1 ? room * (s / (1 + s)) : 0; const low = lineAt(him.share, 0.15);
  for (const c of F.order) { if (room <= 1e-12) break; if (mine[c] > 0 && under(c, low)) { const part = Math.min(1, room / mine[c]); bet[c] = part; room -= mine[c] * part; } }
  return bet;
}
/** How often each hand bets, when nothing is owed. */
function betting(F, mine, his, s, street, ip, arm, rnd) {
  const me = onLadder(F, mine); const him = onLadder(F, his); const bet = new Float32Array(N); if (!(me.total > 0) || !(him.total > 0)) return bet;
  if (arm.rebuilt && F.river) return riverBet(F, mine, me, him, s, ip, arm, rnd);
  const t = Math.min(0.95, Math.max(0.5, 1 - 1 / (2 * (1 + s)) + 0.08 + (arm.lines ? (2 * rnd() - 1) * arm.lines : 0))); const line = lineAt(him.share, t);
  const top = (sh) => sh[4] + sh[5] + sh[6] + sh[7]; const gap = top(me.share) - top(him.share); const adv = gap < -0.04 ? 0 : gap < 0.04 ? 1 : 2; const strong = aboveShare(him.share, lineAt(me.share, 0.8)) > 0.2;
  const zone = (c) => (F.lv[c] > line.k || (F.lv[c] === line.k && me.place[c] >= line.frac) ? 0 : F.lv[c] <= 1 ? 2 : 1); const size = [0, 0, 0]; for (const c of F.order) if (mine[c] > 0) size[zone(c)] += mine[c] / me.total;
  const rate = rates(street, ip, adv, strong); const freq = rate.reduce((x, r, z) => x + r * size[z], 0); let scale = 1;
  if (arm.word && freq > 0) scale = Math.min(1, Math.max(0, mid3(freq) + (arm.vague ? (2 * rnd() - 1) * arm.vague : 0))) / freq;
  const room = rate.map((r, z) => Math.min(1, r * scale) * size[z] * me.total); const n = F.order.length;
  const take = (c) => { if (!(mine[c] > 0)) return; const z = zone(c); if (room[z] <= 1e-12) return; const part = Math.min(1, room[z] / mine[c]); bet[c] = part; room[z] -= mine[c] * part; };
  // value from the top down; the bottom from the draws down (the weakest first on the river); the middle by what is still to come (the strongest first on the river)
  for (let i = n - 1; i >= 0; i--) { const c = F.order[i]; if (zone(c) === 0 || (zone(c) === 2 && !F.river) || (zone(c) === 1 && F.river)) take(c); }
  if (F.river) { for (let i = 0; i < n; i++) if (zone(F.order[i]) === 2) take(F.order[i]); } else for (const c of F.byCome) if (zone(c) === 1) take(c);
  return bet;
}
/** Facing a bet of s pots: 0 fold, 1 call, 2 raise, by the price line on his betting range. */
function facing(F, mine, his, s, arm, rnd, canRaise) {
  const me = onLadder(F, mine); const him = onLadder(F, his); const act = new Int8Array(N); if (!(me.total > 0) || !(him.total > 0)) return act;
  const price = Math.min(0.9, Math.max(0.02, s / (1 + 2 * s) + (F.river ? 0 : 0.08) + (arm.lines ? (2 * rnd() - 1) * arm.lines : 0))); const line = lineAt(him.share, price); const best = lineAt(him.share, 0.85);
  const over = (c, l) => F.lv[c] > l.k || (F.lv[c] === l.k && me.place[c] >= l.frac);
  for (const c of F.order) if (mine[c] > 0) act[c] = canRaise && F.river && over(c, best) ? 2 : over(c, line) || (!F.river && F.lv[c] === 1) ? 1 : 0;
  return act;
}

// ---- the rules of research/rules: thresholds on a hand's equity, which the player reads off the chart -----------------------
/** How much of `his` each hand of `mine` beats as the board stands (ties half). With `removal`, his hands that share a card are left out: on the river that is the exact equity. */
function beats(F, mine, his, removal) {
  const out = new Float32Array(N); const cardBelow = new Float64Array(52); const cardAll = new Float64Array(52); let all = 0, below = 0, i = 0; const hs = []; for (const v of F.byStr) if (his[v] > 0) { hs.push(v); all += his[v]; if (removal) { cardAll[CA(v)] += his[v]; cardAll[CB(v)] += his[v]; } }
  if (!(all > 0)) return out;
  for (let j = 0; j < F.byStr.length;) {
    const s0 = F.str[F.byStr[j]]; while (i < hs.length && F.str[hs[i]] < s0) { const v = hs[i++]; below += his[v]; if (removal) { cardBelow[CA(v)] += his[v]; cardBelow[CB(v)] += his[v]; } }
    let tie = 0, k = i; const cardTie = removal ? new Map() : null; while (k < hs.length && F.str[hs[k]] === s0) { const v = hs[k++]; tie += his[v]; if (removal) { cardTie.set(CA(v), (cardTie.get(CA(v)) ?? 0) + his[v]); cardTie.set(CB(v), (cardTie.get(CB(v)) ?? 0) + his[v]); } }
    for (; j < F.byStr.length && F.str[F.byStr[j]] === s0; j++) { const c = F.byStr[j]; if (!(mine[c] > 0)) continue; const a = CA(c), b = CB(c);
      if (!removal) { out[c] = (below + tie / 2) / all; continue; }
      const live = all - cardAll[a] - cardAll[b] + his[c]; const lo = below - cardBelow[a] - cardBelow[b]; const t = tie - (cardTie.get(a) ?? 0) - (cardTie.get(b) ?? 0) + his[c]; out[c] = live > 0 ? (lo + t / 2) / live : 0; }
  }
  return out;
}
const EST = { 3: [0.09, 0.73, 0.05, 0.18], 4: [0.05, 0.84, 0, 0.10], 5: [0, 1, 0, 0] };
/** Each hand's equity as the player has it: read off the chart (what it beats now, more for a draw), or exact. */
function equities(F, board, mine, his, arm, rnd) {
  const street = board.length; const [a, b, g, d] = EST[street]; const read = (w, v) => { const now = beats(F, w, v, false); const e = new Float32Array(N); for (const c of F.order) if (w[c] > 0) e[c] = a + b * now[c] + (F.come[c] >= 8 ? d : F.come[c] >= 4 ? g : 0); return e; };
  if (arm.eq === 'exact' || (arm.exactOn && arm.exactOn.includes(street))) { if (street === 5) { const mm = beats(F, mine, his, true); if (arm.noise) for (const c of F.order) if (mine[c] > 0) mm[c] += (2 * rnd() - 1) * arm.noise; return [mm, beats(F, his, mine, true)]; } const m = equityVs(fs, board, mine, his), h = equityVs(fs, board, his, mine); const fix = (x) => Float32Array.from(x, (y) => (Number.isNaN(y) ? 0 : y)); const mm = fix(m); if (arm.noise) for (const c of F.order) if (mine[c] > 0) mm[c] += (2 * rnd() - 1) * arm.noise; return [mm, fix(h)]; }
  const m = read(mine, his); if (arm.noise) for (const c of F.order) if (mine[c] > 0) m[c] += (2 * rnd() - 1) * arm.noise; return [m, read(his, mine)];
}
const valueFrom = (s) => (s < 0.5 ? 0.75 : s < 1.1 ? 0.8 : 0.85);
/** The final rules. Returns, for every hand, 0 the quiet action (check or fold), 1 call, 2 bet or raise. */
function finalRule(F, board, mine, his, ctx, arm, rnd) {
  const act = new Int8Array(N); let mt = 0, ht = 0; for (const c of F.order) { mt += mine[c]; ht += his[c]; } if (!(mt > 0) || !(ht > 0)) return act;
  const street = board.length; const [e, he] = equities(F, board, mine, his, arm, rnd); const { ip, s, toCall, raised, canRaise } = ctx;
  if (toCall > 0) {
    const price = s / (1 + 2 * s); const extra = street === 5 ? 0 : raised ? 0.05 : street === 4 ? (ip ? 0 : (arm.turnFaceOop ?? 0.10) + (s > 0.5 ? 0.05 : 0)) : ip ? 0.05 : (arm.flopFaceOop ?? 0.15); const t = price + extra + (s > 1 ? 0.05 : 0); const rz = s > 1 ? 0.8 : 0.75;
    for (const c of F.order) if (mine[c] > 0) act[c] = street === 5 && canRaise && !raised && e[c] >= rz ? 2 : e[c] >= t ? 1 : 0;
    return act; }
  let strong = 0, weak = 0, topMe = 0, topHim = 0; for (const c of F.order) { if (he[c] >= 0.8) strong += his[c]; if (he[c] < 0.3) weak += his[c]; if (F.lv[c] >= 4) { topMe += mine[c]; topHim += his[c]; } } strong /= ht; weak /= ht;
  const ahead = topMe / mt - topHim / ht > 0.04;
  if (street === 3) { for (const c of F.order) if (mine[c] > 0) act[c] = ip || (ahead && (arm.flopOop === 'all' || e[c] >= 0.7 || F.come[c] >= 8)) ? 2 : 0; return act; }
  if (street === 4) { const mode = ip ? 'always' : arm.turnOop ?? 'always'; if (mode === 'gate') { if (strong < 0.2) for (const c of F.order) if (mine[c] > 0) act[c] = e[c] >= valueFrom(s) ? 2 : 0; return act; }
    if (mode === 'always' || ahead) for (const c of F.order) if (mine[c] > 0) act[c] = e[c] >= 0.5 || F.come[c] >= 8 ? 2 : 0; return act; }
  if (!ip && strong >= 0.2) return act;
  const v = valueFrom(s); const bl = street === 5 ? Math.max(0, weak - (ip ? 0.2 : 0.25)) : 0;
  for (const c of F.order) if (mine[c] > 0) act[c] = e[c] >= v || e[c] < bl ? 2 : 0;
  return act;
}
/** The owner's written strategy (16 Nov), as read for this test. Returns, per hand, the chance of each of: small bet or raise, big bet, call.
 *  First to act out of position: check, unless the range is well ahead (top pair or better 10 points over his); then every hand bets half the time but the middling ones with no draw.
 *  Checked to in position: bet a third. The top two rows always; other value (75 / 80 / 85% by size) more often the more it can improve; bluffs by the ratio
 *  s/(1+s), times 4 on the flop and 2 on the turn, taken from the weak hands by what is still to come, each half the time. With more two pair or better than
 *  him the top two rows use the bigger size where there is one.
 *  Facing a bet: raise the top row, and bluff-raise the biggest draws half the time; call with ten points over the price; then fill to 1/(1+s) of the range with draws. */
function userRule(F, board, mine, his, ctx, arm, rnd) {
  const small = new Float32Array(N), big = new Float32Array(N), call = new Float32Array(N); let mt = 0, ht = 0; for (const c of F.order) { mt += mine[c]; ht += his[c]; } if (!(mt > 0) || !(ht > 0)) return { small, big, call };
  const street = board.length; const [e] = equities(F, board, mine, his, arm, rnd); const { ip, s, toCall, canRaise, hasBig } = ctx; const live = []; for (const c of F.order) if (mine[c] > 0) live.push(c);
  const byCome = [...live].sort((x, y) => F.come[y] - F.come[x] || e[x] - e[y]);
  if (toCall > 0) {
    const price = s / (1 + 2 * s); let cont = 0, rz = 0;
    for (const c of live) { if (canRaise && F.lv[c] === 7) { small[c] = 1; rz += mine[c]; cont += mine[c]; } else if (e[c] >= price + 0.1) { call[c] = 1; cont += mine[c]; } }
    if (canRaise && street < 5) { let room = (s / (1 + s)) * rz; for (const c of byCome) { if (room <= 1e-9 || F.come[c] < 12) break; if (small[c] || call[c]) continue; small[c] = 0.5; room -= 0.5 * mine[c]; cont += 0.5 * mine[c]; } }
    let need = mt / (1 + s) - cont; for (const c of byCome) { if (need <= 1e-9 || F.come[c] < 8) break; if (small[c] || call[c]) continue; const p = F.come[c] >= 9 ? 1 : 0.5; call[c] = p; need -= p * mine[c]; }
    return { small, big, call }; }
  let topMe = 0, topHim = 0, nutMe = 0, nutHim = 0; for (const c of F.order) { if (F.lv[c] >= 4) { topMe += mine[c]; topHim += his[c]; } if (F.lv[c] >= 6) { nutMe += mine[c]; nutHim += his[c]; } }
  const v = valueFrom(s);
  if (!ip) { if (topMe / mt - topHim / ht < 0.10) return { small, big, call }; for (const c of live) small[c] = e[c] >= 0.4 && e[c] < v && F.come[c] < 4 ? 0 : 0.5; return { small, big, call }; }
  const useBig = hasBig && nutMe / mt > nutHim / ht; let value = 0;
  for (const c of live) { if (F.lv[c] >= 6) { (useBig ? big : small)[c] = 1; value += mine[c]; } else if (e[c] >= v) { const p = street === 5 ? 0.75 : 0.6 + 0.4 * Math.min(1, F.come[c] / 9); small[c] = p; value += p * mine[c]; } }
  let room = (s / (1 + s)) * (street === 3 ? 4 : street === 4 ? 2 : 1) * value; const pool = street === 5 ? [...live].sort((x, y) => e[x] - e[y]) : byCome;
  for (const c of pool) { if (room <= 1e-9) break; if (small[c] || big[c] || e[c] >= 0.4) continue; small[c] = 0.5; room -= 0.5 * mine[c]; }
  return { small, big, call };
}
/** The owner's updated strategy (the rewrite with three sizes in position and raises on every street), exact equities. Returns the chance of every action for every hand.
 *  Out of position first to act: check, unless ahead (any more top pair or better than him): flop, a third with 70%+ or a draw; turn, a third with 50%+ or a draw;
 *  river, check all if a fifth of his range is strong, else three quarters with 80%+ and bluffs by s/(1+s) from the weakest hands.
 *  In position checked to: a third with the whole range (flop), with 50%+ or a draw (turn), with 75%+ and bluffs by the ratio (river; none if he has few weak hands).
 *  With more two pair or better than him the second row may bet three quarters; with more overpairs or better, the top row may bet one and a half pots; each uses
 *  its bigger size half the time (no blockers are modelled), with bluffs added to the bigger sizes by the ratio, the best draws first (the weakest hands on the river).
 *  Facing a bet: raise the top row (on the river anything that beats three quarters of his bets), bluff-raise the biggest draws half the time; continue with the
 *  price in position (5 more on the flop), 10 to 15 more out of position before the river, the price on the river; flush draws continue; on the river and in
 *  position, fill up to 1/(1+s) of the range with the next-best hands. */
function userRule2(F, board, mine, his, ctx, arm, rnd) {
  const { ip, toCall, s, k, fi, ci, xi, ri, bets } = ctx; const P = new Float32Array(N * k); const quiet = toCall > 0 ? (fi >= 0 ? fi : ci) : xi; let mt = 0, ht = 0; const live = [];
  for (const c of F.order) { P[c * k + quiet] = 1; ht += his[c]; if (mine[c] > 0) { live.push(c); mt += mine[c]; } } if (!(mt > 0) || !(ht > 0)) return P;
  const street = board.length; const [e, he] = equities(F, board, mine, his, arm, rnd); const put = (c, a, p) => { const room = P[c * k + quiet]; const x = Math.min(p, room); P[c * k + quiet] -= x; P[c * k + a] += x; };
  const byCome = [...live].sort((x, y) => F.come[y] - F.come[x] || e[x] - e[y]); const byE = [...live].sort((x, y) => e[x] - e[y]);
  if (toCall > 0) {
    const price = s / (1 + 2 * s); const extra = street === 5 ? 0 : ip ? (street === 3 ? 0.05 : 0) : s > 0.5 ? 0.15 : 0.10; let rz = 0, cont = 0;
    for (const c of live) { if (ri >= 0 && (F.lv[c] === 7 || (street === 5 && e[c] >= 0.75))) { put(c, ri, 1); rz += mine[c]; cont += mine[c]; } else if (e[c] >= price + extra || (street < 5 && F.come[c] >= 9)) { put(c, ci, 1); cont += mine[c]; } }
    if (ri >= 0 && street < 5) { let room = (s / (1 + s)) * rz; for (const c of byCome) { if (room <= 1e-9 || F.come[c] < 12) break; if (P[c * k + ri] > 0) continue; const was = P[c * k + ci]; P[c * k + ci] = was * 0.5; P[c * k + quiet] += 0; P[c * k + ri] += 0.5 * (was + P[c * k + quiet]); P[c * k + quiet] *= 0.5; room -= 0.5 * mine[c]; cont += 0.5 * mine[c] * (1 - was); } }
    if (street === 5 || ip) { let need = mt / (1 + s) - cont; for (let j = byE.length - 1; j >= 0 && need > 1e-9; j--) { const c = byE[j]; const q = P[c * k + quiet]; if (q <= 0 || fi < 0) continue; const x = Math.min(q, need / mine[c]); put(c, ci, x); need -= x * mine[c]; } }
    return P; }
  if (!bets.length) return P; const near = (want) => bets.reduce((b, x) => (Math.abs(x[1] - want) < Math.abs(b[1] - want) ? x : b)); const b33 = near(0.33), b75 = near(0.75), b150 = near(1.5);
  let topMe = 0, topHim = 0, nutMe = 0, nutHim = 0, strMe = 0, strHim = 0, strong = 0, weak = 0; for (const c of F.order) { if (F.lv[c] >= 4) { topMe += mine[c]; topHim += his[c]; } if (F.lv[c] >= 6) { nutMe += mine[c]; nutHim += his[c]; } if (F.lv[c] >= 5) { strMe += mine[c]; strHim += his[c]; } if (he[c] >= 0.8) strong += his[c]; if (he[c] < 0.3) weak += his[c]; }
  strong /= ht; weak /= ht; const ratio = (z) => z / (1 + z);
  const bluff = (a, mass, pool) => { let room = mass; for (const c of pool) { if (room <= 1e-9) break; if (P[c * k + quiet] < 1 || e[c] >= 0.4) continue; put(c, a, 1); room -= mine[c]; } };
  if (!ip) {
    if (street === 5) { if (strong >= 0.2) return P; let v = 0; for (const c of live) if (e[c] >= 0.8) { put(c, b75[0], 1); v += mine[c]; } bluff(b75[0], ratio(b75[1]) * v, byE); return P; }
    if (arm.raiserBets && street === 3 && ctx.raiser) { for (const c of live) put(c, b33[0], 1); return P; }
    if (topMe / mt - topHim / ht < (arm.raiserBets ? 0.01 : 1e-12)) return P; for (const c of live) if (e[c] >= (street === 3 ? 0.7 : 0.5) || F.come[c] >= 8) put(c, b33[0], 1); return P; }
  const sized = !arm.riverSizesOnly || street === 5; const can75 = sized && b75[0] !== b33[0] && nutMe / mt > nutHim / ht; const can150 = sized && b150[0] !== b75[0] && strMe / mt > strHim / ht; let v33 = 0, v75 = 0, v150 = 0;
  const valueLine = street === 3 ? 0.7 : street === 4 ? 0.5 : 0.75;
  for (const c of live) { const big = F.lv[c] === 7 ? (can150 ? b150 : can75 ? b75 : null) : F.lv[c] === 6 ? (can75 ? b75 : null) : null;
    if (big) { put(c, big[0], 0.5); put(c, b33[0], 0.5); if (big === b150) v150 += 0.5 * mine[c]; else v75 += 0.5 * mine[c]; v33 += 0.5 * mine[c]; } else if (e[c] >= valueLine || F.lv[c] >= 6) { put(c, b33[0], 1); v33 += mine[c]; } }
  const pool = street === 5 ? byE : byCome; if (v150 > 0) bluff(b150[0], ratio(b150[1]) * v150, pool); if (v75 > 0) bluff(b75[0], ratio(b75[1]) * v75, pool);
  if (street === 3) { for (const c of live) put(c, b33[0], 1); return P; }
  if (street === 4) { for (const c of live) if (F.come[c] >= 8) put(c, b33[0], 1); return P; }
  if (weak >= 0.1) bluff(b33[0], ratio(b33[1]) * v33, byE);
  return P;
}
const ARMS = process.env.ARMS === 'engine' ? ENGINE_ARMS : process.env.ARMS === 'final' ? (process.env.DIAG === '7' ? { user3: { rule: 'user2', eq: 'exact', riverSizesOnly: true, raiserBets: true } } : process.env.DIAG === '6' ? { user2: { rule: 'user2', eq: 'exact' } } : process.env.DIAG === '5' ? { finalEq: { rule: 'final', eq: 'exact' }, user: { rule: 'user', eq: 'exact' }, userChart: { rule: 'user' }, final: { rule: 'final' } } : process.env.DIAG === '4' ? { finalEq: { rule: 'final', eq: 'exact' }, soft5: { rule: 'final', eq: 'exact', noise: 0.05 }, soft10: { rule: 'final', eq: 'exact', noise: 0.1 }, soft3: { rule: 'final', eq: 'exact', noise: 0.03 } } : process.env.DIAG === '3' ? { v2: { rule: 'final', eq: 'exact' }, turnAlways: { rule: 'final', eq: 'exact', turnOop: 'always' }, turnGate: { rule: 'final', eq: 'exact', turnOop: 'gate' }, turnFace5: { rule: 'final', eq: 'exact', turnFaceOop: 0.05 }, flopAll: { rule: 'final', eq: 'exact', flopOop: 'all' }, flopFace10: { rule: 'final', eq: 'exact', flopFaceOop: 0.10 }, exact: {} } : process.env.DIAG === '2' ? { finalEq: { rule: 'final', eq: 'exact' }, final: { rule: 'final' }, finalNoisy: { rule: 'final', noise: 0.1 }, exact: {} } : process.env.DIAG ? { finalEq: { rule: 'final', eq: 'exact' }, final: { rule: 'final' }, estRiver: { rule: 'final', exactOn: [3, 4] }, finalNoisy: { rule: 'final', noise: 0.1 } } : { final: { rule: 'final' }, finalEq: { rule: 'final', eq: 'exact' }, finalNoisy: { rule: 'final', noise: 0.1 }, exact: {} }) : process.env.ARMS === 'river' ? { exact: {}, vague: { word: true, vague: 0.2 }, rebuilt: { rebuilt: true }, rebuiltVague: { rebuilt: true, word: true, vague: 0.2, lines: 0.1 } } : { exact: {}, word: { word: true }, vague: { word: true, vague: 0.2 }, loose: { word: true, vague: 0.2, lines: 0.1 } }; const NAMES = Object.keys(ARMS);
const [count = '8', seed = '71'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ACTIONS || process.env.ACTIONS.split(',').includes(p.action))); const TREE = process.env.TREE === 'three' ? { betSizes: [[0.33, 0.75, 1.5], [0.33, 0.75, 1.5], [0.33, 0.75, 1.5]], maxRaises: 1 } : process.env.TREE === 'raise' ? { betSizes: [[0.33], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 } : process.env.TREE === 'small' ? { betSizes: [[0.33], [0.33, 0.75], [0.75]], maxRaises: 1 } : { betSizes: [[0.33], [0.75], [0.75]], maxRaises: 1 };
const out = new URL(`./out/play${process.env.ARMS ? `-${process.env.ARMS}` : ''}${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, '', { flag: 'a' });
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? 600) * 2 ** 20) continue;
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts); const R = spot.runouts; const pot = spot.potUnits / spot.chipScale;
  const solve = fs.createRun(spot, { isomorphism: false, workers: 4 }); let ex = 9; while (ex > 0.15 && solve.completed < 1500) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); done++;
  const raiserSeat = (p.line ?? '').split(',').pop().trim().split(' ')[0] === p.oop ? 1 : 0;   // the seat that put in the last raise before the flop (the other one called)
  const fresh = () => { const r = fs.createRun(spot, { analysisOnly: true, isomorphism: false }); copySolved(solved, r, nodes, counts, 0); copySolved(solved, r, nodes, counts, 1); return r; };
  const start = [0, 1].map((s) => { const w = new Float64Array(N); const pl = spot.players[s]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const base = fresh(); const noise = [0, 1].map((s) => 100 * (solved.ev(s) - base.snapshot().ev(s)) / pot);
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: b.join(''), pot: p.pot, spr: +(p.stack / p.pot).toFixed(1), exploit: +ex.toFixed(3), loss: {}, br: {}, freq: {} };
  for (const hero of [0, 1]) {
    // a run for each arm, and for the exact arm on the flop alone and on the flop and turn
    const runs = process.env.NODECOMP ? Object.fromEntries(NAMES.map((n) => [n, fresh()])) : { ...Object.fromEntries(NAMES.map((n) => [n, fresh()])), flop: fresh(), flopTurn: fresh() }; const W = Object.fromEntries(Object.entries(runs).map(([n, r]) => [n, writer(r)]));
    const dice = Object.fromEntries(NAMES.map((n, i) => { let s = (977 * (i + 1) + done * 31 + hero) >>> 0; return [n, () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }]; }));
    const tally = Object.fromEntries(NAMES.map((n) => [n, [[0, 0], [0, 0], [0, 0]]])); const sol = [[0, 0], [0, 0], [0, 0]];
    const startRange = {}; const walk = (id, board, bIndex, F, mine, his) => {
      const n = nodes[id];
      if (n.kind === 'chance') {
        const next = board.length - 2; const w = R.width[next];
        for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) {
          const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c)); const drop = (r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; };
          const nb = [...board, card]; walk(n.edges[0].child, nb, k, facts(nb), mine.map(drop), drop(his));
        }
        return;
      }
      if (n.kind !== 'decision') return; const seat = seatOf(n); const kinds = n.edges.map((x) => x.kind); const k = kinds.length;
      if (seat !== hero) { const view = solved.strategyAt(id, bIndex); const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, i) => { at[c] = i; }); let any = 0;
        n.edges.forEach((edge, a) => { const next = new Float64Array(N); let t = 0; for (let c = 0; c < N; c++) if (his[c] > 0 && at[c] >= 0) { next[c] = his[c] * view.probs[at[c] * k + a]; t += next[c]; } if (t > 1e-9) { any++; walk(edge.child, board, bIndex, F, mine, next); } });
        return; }
      const toCall = n.invested[1 - seat] - n.invested[seat]; const street = board.length; const fi = kinds.indexOf('fold'), ci = kinds.indexOf('call'), xi = kinds.indexOf('check'); const bi = kinds.indexOf('bet') >= 0 ? kinds.indexOf('bet') : kinds.indexOf('allin'); const ri = kinds.indexOf('raise') >= 0 ? kinds.indexOf('raise') : toCall > 0 ? kinds.indexOf('allin') : -1;
      const probsBy = NAMES.map((name, j) => {
        const P = new Float32Array(N * k); const w = mine[j];
        if (ARMS[name].rule === 'user2') {
          const bets = kinds.map((x, a) => (x === 'bet' ? [a, (nodes[n.edges[a].child].invested[seat] - n.invested[seat]) / n.pot] : null)).filter(Boolean); if (!bets.length && kinds.indexOf('allin') >= 0 && toCall <= 0) bets.push([kinds.indexOf('allin'), (nodes[n.edges[kinds.indexOf('allin')].child].invested[seat] - n.invested[seat]) / n.pot]);
          const P2 = userRule2(F, board, w, his, { raiser: seat === raiserSeat, ip: seat === 1, toCall, s: toCall > 0 ? toCall / (n.pot - toCall) : 0, k, fi, ci, xi, ri, bets }, ARMS[name], dice[name]);
          if (toCall <= 0 && bets.length) { let t = 0, all = 0; for (const c of F.order) { t += w[c] * (1 - P2[c * k + xi]); all += w[c]; } tally[name][street - 3][0] += t; tally[name][street - 3][1] += all; }
          return P2; }
        if (ARMS[name].rule === 'user') {
          const bets = kinds.map((x, a) => (x === 'bet' ? a : -1)).filter((a) => a >= 0); const b1 = bets.length ? bets[0] : kinds.indexOf('allin'); const b2 = bets.length > 1 ? bets[bets.length - 1] : b1;
          const size = toCall > 0 ? toCall / (n.pot - toCall) : b1 >= 0 ? (nodes[n.edges[b1].child].invested[seat] - n.invested[seat]) / n.pot : 0;
          const u = userRule(F, board, w, his, { ip: seat === 1, s: size, toCall, canRaise: ri >= 0, hasBig: b2 !== b1 }, ARMS[name], dice[name]); let t = 0, all = 0;
          for (const c of F.order) { if (toCall > 0) { const r = ri >= 0 ? u.small[c] : 0; const cl = Math.min(1 - r, u.call[c] + (ri >= 0 ? 0 : u.small[c])); if (ri >= 0) P[c * k + ri] = r; P[c * k + ci] = cl; if (fi >= 0) P[c * k + fi] = 1 - r - cl; else P[c * k + ci] += 1 - r - cl; }
            else if (b1 < 0) P[c * k + xi] = 1; else { P[c * k + b1] += u.small[c]; P[c * k + b2] += u.big[c]; P[c * k + xi] = 1 - u.small[c] - u.big[c]; t += w[c] * (u.small[c] + u.big[c]); all += w[c]; } }
          if (toCall <= 0 && b1 >= 0) { tally[name][street - 3][0] += t; tally[name][street - 3][1] += all; }
          return P; }
        if (ARMS[name].rule === 'engine') {
          const arm = ARMS[name];
          if (arm.only && !arm.only(street, toCall > 0)) {      // the solution's own play where this arm leaves the engine out
            const view = solved.strategyAt(id, bIndex); const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, i) => { at[c] = i; });
            for (const c of F.order) { if (at[c] >= 0) for (let a = 0; a < k; a++) P[c * k + a] = view.probs[at[c] * k + a]; else P[c * k + (toCall > 0 ? (fi >= 0 ? fi : ci) : xi)] = 1; }
            return P; }
          let raised = false; for (let at = n; at.parent >= 0 && nodes[at.parent].kind !== 'chance'; at = nodes[at.parent]) { const par = nodes[at.parent]; if (seatOf(par) === seat && ['bet', 'raise', 'allin'].includes(par.edges[at.via].kind)) raised = true; }
          const bet = bi >= 0 ? (nodes[n.edges[bi].child].invested[seat] - n.invested[seat]) / n.pot : 0; const quiet = toCall > 0 ? (fi >= 0 ? fi : ci) : xi;
          const useCells = !!arm.cells && (!arm.cellsWhere || arm.cellsWhere(street, toCall > 0)); let hs = his; if (arm.versus === 'start' || (arm.cellsWhere && useCells)) { hs = Float64Array.from(start[1 - hero]); for (let c = 0; c < N; c++) if (board.includes(CA(c)) || board.includes(CB(c))) hs[c] = 0; }
          const [e, he] = equities(F, board, w, hs, arm, dice[name]); const mineH = [], hisH = [];
          for (const c of F.order) { if (w[c] > 0) mineH.push({ c, weight: w[c], equity: e[c], draw: F.come[c] >= 8, topPairPlus: F.lv[c] >= 4 }); else P[c * k + quiet] = 1; if (hs[c] > 0) hisH.push({ weight: hs[c], equity: he[c], topPairPlus: F.lv[c] >= 4 }); }
          const reads = readSpot(mineH, hisH); let t = 0, all = 0;
          const tb = arm.turnBySeat?.[seat === 1 ? 'ip' : 'oop']; const turnFrom = tb?.from ?? arm.turnFrom;
          const out = reads ? decide({ street, ip: seat === 1, toCall, size: toCall > 0 ? toCall / (n.pot - toCall) : bet, raised, canRaise: ri >= 0, deep: p.stack / p.pot > 8, reads, cells: useCells ? CELLS : null, turnBalance: tb ? { check: tb.check } : arm.turn ?? null, riverBalance: arm.river ?? null, flopBalance: arm.flop ?? null, raiseDraws: arm.draws ?? null, fillBy: arm.fillBy ?? null, defendExactly: arm.exact ?? null, rules: turnFrom || arm.valueUp || arm.flopFrom !== undefined || arm.early || arm.patch ? { ...RULES, ...(arm.patch ?? {}), flopIpFrom: arm.flopFrom, earlyRaiseFrom: arm.early, turnBetFrom: turnFrom ?? RULES.turnBetFrom, valueFrom: (x) => RULES.valueFrom(x) + (arm.valueUp ?? 0) } : undefined, fillToDefence: arm.fill ?? false, fillEverywhere: !!arm.everywhere }, mineH) : mineH.map(() => [1, 0, 0]);
          if (arm.sub && toCall > 0 && street === 4) {     // facing a turn bet: the solution's hands at the engine's frequency ('hands'), the engine's hands at the solution's frequency ('freq'), or the solution's folds and calls with its raises as calls ('noraise')
            const view = solved.strategyAt(id, bIndex); const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, i) => { at[c] = i; }); const cont = mineH.map((h) => (at[h.c] >= 0 && fi >= 0 ? 1 - view.probs[at[h.c] * k + fi] : at[h.c] >= 0 ? 1 : 0));
            if (arm.sub === 'noraise') mineH.forEach((h, i) => { out[i] = [1 - cont[i], cont[i], 0]; });
            else { let target = 0; mineH.forEach((h, i) => { target += h.weight * (arm.sub === 'hands' ? 1 - out[i][0] : cont[i]); });
              const order = mineH.map((h, i) => i).sort((x, y) => (arm.sub === 'hands' ? cont[y] - cont[x] : 0) || mineH[y].equity - mineH[x].equity);     // pure continues first, then the mixes by how often, then by equity
              for (const i of order) { const take = Math.max(0, Math.min(1, target / mineH[i].weight)); out[i] = [1 - take, take, 0]; target -= take * mineH[i].weight; } } }
          if (process.env.FACING && toCall > 0 && street === +(process.env.FACING_STREET ?? 4)) {
            const view = solved.strategyAt(id, bIndex); const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, i) => { at[c] = i; }); let ht = 0; for (const c of F.order) ht += his[c];
            const size = toCall / (n.pot - toCall); const key = `${seat === 1 ? 'ip' : 'oop'} ${raised ? 'facing a raise' : 'facing a bet'}`; const D = (FACE[key] ??= { bands: Array.from({ length: 6 }, () => [0, 0, 0, 0, 0, 0, 0]), w: 0, mdf: 0, price: 0 });
            mineH.forEach((h, i) => { if (at[h.c] < 0) return; const wt = h.weight * ht; const b = h.equity < 0.2 ? 0 : h.equity < 0.35 ? 1 : h.equity < 0.5 ? 2 : h.equity < 0.65 ? 3 : h.equity < 0.8 ? 4 : 5; const sp = (a) => (a >= 0 ? view.probs[at[h.c] * k + a] : 0); const row = D.bands[b];
              row[0] += wt; row[1] += wt * out[i][0]; row[2] += wt * sp(fi); row[3] += wt * out[i][2]; row[4] += wt * sp(ri); row[5] += wt * (h.draw ? 1 : 0); row[6] += wt * (h.draw ? sp(fi) : 0); D.w += wt; D.mdf += wt / (1 + size); D.price += wt * size / (1 + 2 * size); });
            if (process.env.FACING_NODES) {      // one record a decision: what the solution continues with over the engine's range there, beside what a player could read
              const price = size / (1 + 2 * size); let w0 = 0, eng = 0, sol = 0, eq = 0, over = 0, over10 = 0, half = 0, strong = 0, weak = 0, dr = 0; const line = []; for (let a2 = n; a2.parent >= 0; a2 = nodes[a2.parent]) { const par = nodes[a2.parent]; line.unshift(par.kind === 'chance' ? '|' : par.edges[a2.via].kind[0]); }
              mineH.forEach((h, i) => { if (at[h.c] < 0) return; const x = h.weight; w0 += x; eng += x * (1 - out[i][0]); sol += x * (1 - (fi >= 0 ? view.probs[at[h.c] * k + fi] : 0)); eq += x * h.equity; if (h.equity >= price) over += x; if (h.equity >= price + 0.1) over10 += x; if (h.equity >= 0.5) half += x; if (h.equity >= 0.8) strong += x; if (h.equity < 0.2) weak += x; if (h.draw) dr += x; });
              let start = 0; for (const c of F.order) start += startRange[c] ?? 0;
              if (w0 > 0) (D.nodes ??= []).push({ line: line.join(''), card: board[board.length - 1], rank: RK[board[board.length - 1]], suit: SU[board[board.length - 1]], size: +size.toFixed(2), reach: w0 * ht, eng: eng / w0, sol: sol / w0, eq: eq / w0, over: over / w0, over10: over10 / w0, half: half / w0, strong: strong / w0, weak: weak / w0, draws: dr / w0, his: ht }); } }
          mineH.forEach((h, i) => { const [q, cl, ag] = out[i]; const c = h.c;
            if (toCall > 0) { P[c * k + quiet] += q; P[c * k + ci] += cl; P[c * k + (ri >= 0 ? ri : ci)] += ag; }
            else { P[c * k + xi] += q + cl; P[c * k + (bi >= 0 ? bi : xi)] += ag; if (bi >= 0) { t += h.weight * ag; all += h.weight; } } });
          if (toCall <= 0 && bi >= 0) { tally[name][street - 3][0] += t; tally[name][street - 3][1] += all; }
          return P; }
        if (ARMS[name].rule === 'final') {
          let raised = false; for (let at = n; at.parent >= 0 && nodes[at.parent].kind !== 'chance'; at = nodes[at.parent]) { const par = nodes[at.parent]; if (seatOf(par) === seat && ['bet', 'raise', 'allin'].includes(par.edges[at.via].kind)) raised = true; }
          const bet = bi >= 0 ? (nodes[n.edges[bi].child].invested[seat] - n.invested[seat]) / n.pot : 0; const act = finalRule(F, board, w, his, { ip: seat === 1, s: toCall > 0 ? toCall / (n.pot - toCall) : bet, toCall, raised, canRaise: ri >= 0 }, ARMS[name], dice[name]);
          let t = 0, all = 0; for (const c of F.order) { const a = toCall > 0 ? (act[c] === 2 ? ri : act[c] === 1 ? ci : fi >= 0 ? fi : ci) : act[c] === 2 && bi >= 0 ? bi : xi; P[c * k + a] = 1; if (toCall <= 0 && bi >= 0) { t += w[c] * (a === bi); all += w[c]; } }
          if (toCall <= 0 && bi >= 0) { tally[name][street - 3][0] += t; tally[name][street - 3][1] += all; }
          return P; }
        if (toCall > 0) { const act = facing(F, w, his, toCall / (n.pot - toCall), ARMS[name], dice[name], ri >= 0); for (const c of F.order) P[c * k + (act[c] === 2 ? ri : act[c] === 1 ? ci : fi >= 0 ? fi : ci)] = 1; }
        else if (bi < 0) { for (const c of F.order) P[c * k + xi] = 1; }
        else { const bet = betting(F, w, his, (nodes[n.edges[bi].child].invested[seat] - n.invested[seat]) / n.pot, street, seat === 1, ARMS[name], dice[name]); let t = 0, all = 0; for (const c of F.order) { P[c * k + bi] = bet[c]; P[c * k + xi] = 1 - bet[c]; t += w[c] * bet[c]; all += w[c]; } tally[name][street - 3][0] += t; tally[name][street - 3][1] += all; }
        return P; });
      if (toCall <= 0 && bi >= 0) { const view = solved.strategyAt(id, bIndex); const combos = Array.from(view.combos); let t = 0, all = 0; combos.forEach((c, i) => { const w = mine[0][c]; all += w; t += w * (1 - view.probs[i * k + xi]); }); sol[street - 3][0] += t; sol[street - 3][1] += all; }
      const passive = Array.from({ length: k }, (_, a) => (a === 0 ? 1 : 0)); const rowOf = (P) => (c) => (F.lv[c] < 0 ? passive : Array.from({ length: k }, (_, a) => P[c * k + a]));
      NAMES.forEach((name, j) => W[name](id, bIndex, rowOf(probsBy[j]))); if (W.flop && n.round === 0) W.flop(id, bIndex, rowOf(probsBy[0])); if (W.flopTurn && n.round <= 1) W.flopTurn(id, bIndex, rowOf(probsBy[0]));
      n.edges.forEach((edge, a) => { let live = 0; const next = mine.map((w, j) => { const o = new Float64Array(N); const P = probsBy[j]; for (const c of F.order) if (w[c] > 0) { o[c] = w[c] * P[c * k + a]; live += o[c]; } return o; }); if (live > 1e-9) walk(edge.child, board, bIndex, F, next, his); });
    };
    const b0 = Array.from(spot.board); walk(0, b0, 0, facts(b0), NAMES.map(() => start[hero]), start[1 - hero]);
    const lossOf = (r) => +(100 * (solved.ev(hero) - r.snapshot().ev(hero)) / pot - noise[hero]).toFixed(3); const side = hero ? 'ip' : 'oop';
    row.loss[side] = Object.fromEntries(Object.entries(runs).map(([n, r]) => [n, lossOf(r)])); row.br[side] = Object.fromEntries((process.env.ARMS === 'engine' ? NAMES.filter((x) => !['read', 'noisy', 'afterNoisy'].includes(x)) : [NAMES[0], NAMES[2]]).filter(Boolean).map((n) => [n, +(100 * runs[n].solver.exploitability() / pot * 2).toFixed(2)]));
    row.freq[side] = { solution: sol.map(([t, all]) => +(t / (all || 1)).toFixed(3)), ...Object.fromEntries(NAMES.map((n) => [n, tally[n].map(([t, all]) => +(t / (all || 1)).toFixed(3))])) };
  }
  if (process.env.FACING) row.facing = FACE;
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n');
  console.error(`${done}/${count} ${row.spot} ${row.board} ${row.seconds}s | oop ${JSON.stringify(row.loss.oop)} | ip ${JSON.stringify(row.loss.ip)}`);
}
