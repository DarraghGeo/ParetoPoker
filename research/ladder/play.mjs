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
  if (arm.eq === 'exact' || (arm.exactOn && arm.exactOn.includes(street))) { if (street === 5) return [beats(F, mine, his, true), beats(F, his, mine, true)]; const m = equityVs(fs, board, mine, his), h = equityVs(fs, board, his, mine); const fix = (x) => Float32Array.from(x, (y) => (Number.isNaN(y) ? 0 : y)); return [fix(m), fix(h)]; }
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
const ARMS = process.env.ARMS === 'final' ? (process.env.DIAG === '3' ? { v2: { rule: 'final', eq: 'exact' }, turnAlways: { rule: 'final', eq: 'exact', turnOop: 'always' }, turnGate: { rule: 'final', eq: 'exact', turnOop: 'gate' }, turnFace5: { rule: 'final', eq: 'exact', turnFaceOop: 0.05 }, flopAll: { rule: 'final', eq: 'exact', flopOop: 'all' }, flopFace10: { rule: 'final', eq: 'exact', flopFaceOop: 0.10 }, exact: {} } : process.env.DIAG === '2' ? { finalEq: { rule: 'final', eq: 'exact' }, final: { rule: 'final' }, finalNoisy: { rule: 'final', noise: 0.1 }, exact: {} } : process.env.DIAG ? { finalEq: { rule: 'final', eq: 'exact' }, final: { rule: 'final' }, estRiver: { rule: 'final', exactOn: [3, 4] }, finalNoisy: { rule: 'final', noise: 0.1 } } : { final: { rule: 'final' }, finalEq: { rule: 'final', eq: 'exact' }, finalNoisy: { rule: 'final', noise: 0.1 }, exact: {} }) : process.env.ARMS === 'river' ? { exact: {}, vague: { word: true, vague: 0.2 }, rebuilt: { rebuilt: true }, rebuiltVague: { rebuilt: true, word: true, vague: 0.2, lines: 0.1 } } : { exact: {}, word: { word: true }, vague: { word: true, vague: 0.2 }, loose: { word: true, vague: 0.2, lines: 0.1 } }; const NAMES = Object.keys(ARMS);
const [count = '8', seed = '71'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped'); const TREE = process.env.TREE === 'small' ? { betSizes: [[0.33], [0.33, 0.75], [0.75]], maxRaises: 1 } : { betSizes: [[0.33], [0.75], [0.75]], maxRaises: 1 };
const out = new URL(`./out/play${process.env.ARMS ? `-${process.env.ARMS}` : ''}${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, '', { flag: 'a' });
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? 600) * 2 ** 20) continue;
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts); const R = spot.runouts; const pot = spot.potUnits / spot.chipScale;
  const solve = fs.createRun(spot, { isomorphism: false, workers: 4 }); let ex = 9; while (ex > 0.15 && solve.completed < 1500) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); done++;
  const fresh = () => { const r = fs.createRun(spot, { analysisOnly: true, isomorphism: false }); copySolved(solved, r, nodes, counts, 0); copySolved(solved, r, nodes, counts, 1); return r; };
  const start = [0, 1].map((s) => { const w = new Float64Array(N); const pl = spot.players[s]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const base = fresh(); const noise = [0, 1].map((s) => 100 * (solved.ev(s) - base.snapshot().ev(s)) / pot);
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: b.join(''), pot: p.pot, spr: +(p.stack / p.pot).toFixed(1), exploit: +ex.toFixed(3), loss: {}, br: {}, freq: {} };
  for (const hero of [0, 1]) {
    // a run for each arm, and for the exact arm on the flop alone and on the flop and turn
    const runs = { ...Object.fromEntries(NAMES.map((n) => [n, fresh()])), flop: fresh(), flopTurn: fresh() }; const W = Object.fromEntries(Object.entries(runs).map(([n, r]) => [n, writer(r)]));
    const dice = Object.fromEntries(NAMES.map((n, i) => { let s = (977 * (i + 1) + done * 31 + hero) >>> 0; return [n, () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }]; }));
    const tally = Object.fromEntries(NAMES.map((n) => [n, [[0, 0], [0, 0], [0, 0]]])); const sol = [[0, 0], [0, 0], [0, 0]];
    const walk = (id, board, bIndex, F, mine, his) => {
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
      NAMES.forEach((name, j) => W[name](id, bIndex, rowOf(probsBy[j]))); if (n.round === 0) W.flop(id, bIndex, rowOf(probsBy[0])); if (n.round <= 1) W.flopTurn(id, bIndex, rowOf(probsBy[0]));
      n.edges.forEach((edge, a) => { let live = 0; const next = mine.map((w, j) => { const o = new Float64Array(N); const P = probsBy[j]; for (const c of F.order) if (w[c] > 0) { o[c] = w[c] * P[c * k + a]; live += o[c]; } return o; }); if (live > 1e-9) walk(edge.child, board, bIndex, F, next, his); });
    };
    const b0 = Array.from(spot.board); walk(0, b0, 0, facts(b0), NAMES.map(() => start[hero]), start[1 - hero]);
    const lossOf = (r) => +(100 * (solved.ev(hero) - r.snapshot().ev(hero)) / pot - noise[hero]).toFixed(3); const side = hero ? 'ip' : 'oop';
    row.loss[side] = Object.fromEntries(Object.entries(runs).map(([n, r]) => [n, lossOf(r)])); row.br[side] = Object.fromEntries([NAMES[0], NAMES[2]].map((n) => [n, +(100 * runs[n].solver.exploitability() / pot * 2).toFixed(2)]));
    row.freq[side] = { solution: sol.map(([t, all]) => +(t / (all || 1)).toFixed(3)), ...Object.fromEntries(NAMES.map((n) => [n, tally[n].map(([t, all]) => +(t / (all || 1)).toFixed(3))])) };
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n');
  console.error(`${done}/${count} ${row.spot} ${row.board} ${row.seconds}s | oop ${JSON.stringify(row.loss.oop)} | ip ${JSON.stringify(row.loss.ip)}`);
}
