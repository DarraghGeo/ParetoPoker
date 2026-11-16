// What a picture of a strategy is worth. A player who has learned a spot from a chart holds a summary of it: "the range
// bets 40%", "three bands", "the 13x13 grid", "by hand type". Here each summary is turned back into a strategy (every
// hand of a group plays the group's average), played in one seat against the solver's own strategy in the other, and
// scored: how much of the pot it gives up. What a summary keeps is what it is worth teaching.
//   node worth.mjs [spots] [seed]    -> out/worth.jsonl   (turn spots with the preset ranges; the turn and the river scored apart)
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';

const N = fs.COMBOS; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0); const RANKS = '23456789TJQKA';
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => { const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot]; for (let i = 0; i < count; i++) { const p = probsOf(L.memberCombo[L.memberStart[from + i]]); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; } };
}
function copySolved(solved, target, nodes, counts, player) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}

/** Every hand of a group plays the group's average: `key(i)` names hand i's group. */
function grouped(H, key) {
  const sums = new Map();
  H.ids.forEach((c, i) => { const k = key(i); let g = sums.get(k); if (!g) sums.set(k, g = { w: 0, p: new Float64Array(H.k) }); g.w += H.w[i]; for (let a = 0; a < H.k; a++) g.p[a] += H.w[i] * H.P[i][a]; });
  return H.ids.map((c, i) => { const g = sums.get(key(i)); return Array.from(g.p, (x) => x / g.w); });
}
/** The best `K` bands along an order of the hands: the cuts that leave least of what the hands do unexplained. */
function bestBands(H, order, K) {
  const n = order.length; const cw = new Float64Array(n + 1); const ca = Array.from({ length: H.k }, () => new Float64Array(n + 1));
  order.forEach((i, j) => { cw[j + 1] = cw[j] + H.w[i]; for (let a = 0; a < H.k; a++) ca[a][j + 1] = ca[a][j] + H.w[i] * H.P[i][a]; });
  const gain = (i, j) => { const w = cw[j] - cw[i]; if (!(w > 0)) return 0; let g = 0; for (let a = 0; a < H.k; a++) { const s = ca[a][j] - ca[a][i]; g += s * s; } return g / w; };
  let best = new Float64Array(n + 1); for (let j = 0; j <= n; j++) best[j] = gain(0, j); const from = [new Int32Array(n + 1)];
  for (let k = 2; k <= K; k++) { const next = new Float64Array(n + 1).fill(-1); const arg = new Int32Array(n + 1); for (let j = k; j <= n; j++) for (let i = k - 1; i < j; i++) { const v = best[i] + gain(i, j); if (v > next[j]) { next[j] = v; arg[j] = i; } } best = next; from.push(arg); }
  const band = new Int32Array(n); let j = n; for (let k = Math.min(K, n); k >= 1; k--) { const i = k === 1 ? 0 : from[k - 1][j]; for (let x = i; x < j; x++) band[order[x]] = k; j = i; }
  return grouped(H, (i) => band[i]);
}
const classOf = (c) => { const a = fs.rankOf(fs.COMBO_CARDS[2 * c]), b = fs.rankOf(fs.COMBO_CARDS[2 * c + 1]); const s = fs.suitOf(fs.COMBO_CARDS[2 * c]) === fs.suitOf(fs.COMBO_CARDS[2 * c + 1]); return `${RANKS[Math.max(a, b)]}${RANKS[Math.min(a, b)]}${a === b ? '' : s ? 's' : 'o'}`; };
/** A hand's type as a coach names it: what it has made, and its draw. */
const typeOf = (x) => `${x.made >= 2 ? `m${Math.min(x.made, 6)}` : x.own === 1 ? x.pair : 'none'}${x.flushOuts >= 8 ? '+f' : ''}${x.straightOuts >= 8 ? '+s' : x.straightOuts >= 4 ? '+g' : ''}`;

/** The summaries: each a strategy for the hands of one decision, from what a picture of it keeps. */
const SUMMARIES = {
  'pure (each hand its commonest action)': (H) => H.P.map((p) => { const top = p.indexOf(Math.max(...p)); return p.map((_, a) => (a === top ? 1 : 0)); }),
  'range frequency only': (H) => grouped(H, () => 0),
  '2 bands by strength': (H) => bestBands(H, H.byE, 2),
  '3 bands by strength': (H) => bestBands(H, H.byE, 3),
  '5 bands by strength': (H) => bestBands(H, H.byE, 5),
  '5 equal fifths by strength (no chosen cuts)': (H) => { const tot = H.w.reduce((t, x) => t + x, 0); const band = new Int32Array(H.ids.length); let seen = 0; for (const i of H.byE) { band[i] = Math.min(4, Math.floor((5 * (seen + H.w[i] / 2)) / tot)); seen += H.w[i]; } return grouped(H, (i) => band[i]); },
  'hand types (about ten groups)': (H) => grouped(H, (i) => H.type[i]),
  'strength in three by settled or drawing (six regions)': (H) => grouped(H, (i) => `${H.e[i] >= 0.7 ? 2 : H.e[i] >= 0.4 ? 1 : 0}${H.outs[i] >= 8 ? 'd' : ''}`),
  '3 bands by strength, each split by drawing or not': (H) => { const b = bestBands(H, H.byE, 3); const id = new Map(); return grouped(H, (i) => { const k = b[i].join(','); if (!id.has(k)) id.set(k, id.size); return `${id.get(k)}${H.outs[i] >= 8 ? 'd' : ''}`; }); },
  'the 13x13 grid (169 hand classes)': (H) => grouped(H, (i) => H.cls[i]),
};

/** Every hand takes its aggressive actions `d` more often (or less, when negative), at the cost of its passive one: the
 *  whole range misjudged by that much, the hands in the right order. Facing a bet the same of continuing against folding. */
function shifted(H, d) {
  return H.P.map((p) => { const quiet = H.kinds.findIndex((k) => k === 'fold' || (k === 'check' && !H.kinds.includes('fold'))); if (quiet < 0) return p; const loud = 1 - p[quiet];
    const to = Math.min(1, Math.max(0, loud + d)); const out = p.map((x, a) => (a === quiet ? 1 - to : loud > 1e-9 ? (x * to) / loud : 0)); if (loud <= 1e-9 && to > 0) { const first = H.kinds.findIndex((k, a) => a !== quiet && k !== 'fold'); out[first] = to; } return out; });
}
/** Every bet or raise made at the commonest size on offer: sizing ignored. */
function oneSize(H) {
  const sized = H.kinds.map((k, a) => (['bet', 'raise', 'allin'].includes(k) ? a : -1)).filter((a) => a >= 0); if (sized.length < 2) return H.P;
  const total = sized.map((a) => H.P.reduce((t, p, i) => t + H.w[i] * p[a], 0)); const top = sized[total.indexOf(Math.max(...total))];
  return H.P.map((p) => { const all = sized.reduce((t, a) => t + p[a], 0); return p.map((x, a) => (a === top ? all : sized.includes(a) ? 0 : x)); });
}
const ERRORS = {
  'every hand 10 points too aggressive': (H) => shifted(H, 0.1), 'every hand 10 points too passive': (H) => shifted(H, -0.1),
  'every hand 20 points too aggressive': (H) => shifted(H, 0.2), 'every hand 20 points too passive': (H) => shifted(H, -0.2),
  'one bet size only (the commonest)': oneSize,
  '3 bands by strength, and one size': (H) => { const P = oneSize(H); return bestBands({ ...H, P }, H.byE, 3); },
};
/**
 * The lines as a player could derive them at the table, from the bet size and where each hand stands against his range.
 *   Facing a bet of s pots: continue with the top 1/(1+s) of the range (so that a bluff does not pay), by calling.
 *   Betting s pots: he continues with the top 1/(1+s) of his range, so a value bet must beat half of that: the hands
 *   with equity of 1 - 1/(2(1+s)) or more (71% for a 75% bet). Bluffs: s/(1+s) of a bluff for each value bet, from the
 *   bottom of the range. Everything else checks. `valueAt` overrides the value line; `bluffs` scales the bluffs.
 */
function derived(H, { valueAt = null, bluffs = 1, top = null } = {}) {
  const tot = H.w.reduce((t, x) => t + x, 0); const out = H.P.map((p) => p.map(() => 0)); const kinds = H.kinds;
  if (kinds.includes('fold')) {
    const keep = (top ?? 1 / (1 + H.faced)) * tot; let seen = 0; const call = kinds.indexOf('call'); const fold = kinds.indexOf('fold');
    for (let j = H.byE.length - 1; j >= 0; j--) { const i = H.byE[j]; out[i][seen < keep ? call : fold] = 1; seen += H.w[i]; }
    return out;
  }
  const check = kinds.indexOf('check'); const bet = H.betAt;
  if (bet < 0) return H.P.map((p) => p.map((_, a) => (a === check ? 1 : 0)));
  const line = valueAt ?? 1 - 1 / (2 * (1 + H.betSize)); let value = 0; for (let i = 0; i < H.ids.length; i++) if (H.e[i] >= line) value += H.w[i];
  let room = bluffs * value * (H.betSize / (1 + H.betSize));
  for (const i of H.byE) { if (H.e[i] >= line) out[i][bet] = 1; else if (room > 0) { out[i][bet] = 1; room -= H.w[i]; } else out[i][check] = 1; }
  return out;
}
const DERIVED = {
  'derived: price and half of what calls': (H) => derived(H),
  'derived, no bluffs': (H) => derived(H, { bluffs: 0 }),
  'derived, value from 60% equity': (H) => derived(H, { valueAt: 0.6 }),
  'derived, value from 80% equity': (H) => derived(H, { valueAt: 0.8 }),
  'derived, continuing with ten points more than the price asks': (H) => (H.kinds.includes('fold') ? derived(H, { top: Math.min(1, 1 / (1 + H.faced) + 0.1) }) : derived(H)),
  'derived when betting, the solution when facing a bet': (H) => (H.kinds.includes('fold') ? H.P : derived(H)),
  'the solution when betting, derived when facing a bet': (H) => (H.kinds.includes('fold') ? derived(H) : H.P),
  '3 bands by strength (for reference)': (H) => bestBands(H, H.byE, 3),
};
/** The bet frequency held as a word. Only decisions to bet are changed (the solution facing a bet); the hands keep the
 *  solution's order, the whole range moved until it bets as often as the player thinks it should. */
const freqOf = (H) => { const q = H.kinds.indexOf('check'); let t = 0, all = 0; H.w.forEach((w, i) => { t += w * (1 - H.P[i][q]); all += w; }); return t / all; };
function ruleFreq(H) {
  const tot = H.w.reduce((t, x) => t + x, 0); const z = [0, 0, 0]; let eq = 0; H.w.forEach((w, i) => { z[H.e[i] >= 0.8 ? 0 : H.e[i] >= 0.4 ? 1 : 2] += w / tot; eq += (w * H.e[i]) / tot; });
  const adv = eq - 0.5 < -0.04 ? 0 : eq - 0.5 < 0.04 ? 1 : 2; const ip = H.ip === 1; const river = H.round === 1; const hs = H.strong > 0.2;
  let value = ip ? (river ? 1 : 0.8) : river ? 0.75 : 0.55; let middle = river ? (ip ? 0.25 : 0.4) : 1 / 3; let bottom = [0.25, 0.35, 0.55][adv] + (ip ? 0.05 : -0.05);
  if (hs && !(ip && river)) { value /= 2; bottom /= 2; } if (hs && river && !ip) middle /= 2;
  return z[0] * value + z[1] * middle + z[2] * bottom;
}
const mid3 = (f) => (Math.min(2, Math.floor(3 * Math.min(f, 0.999))) + 0.5) / 3;
const at = (target) => (H) => (H.kinds.includes('fold') || !H.kinds.includes('check') ? H.P : shifted(H, Math.min(1, Math.max(0, target(H))) - freqOf(H)));
const WORDS = {
  'always 40%': at(() => 0.4),
  'the rule\'s number': at(ruleFreq), 'the rule\'s word, at its middle': at((H) => mid3(ruleFreq(H))), 'the rule\'s word, 20 points low': at((H) => mid3(ruleFreq(H)) - 0.2), 'the rule\'s word, 20 points high': at((H) => mid3(ruleFreq(H)) + 0.2),
  'the rule\'s word, 10 points low': at((H) => mid3(ruleFreq(H)) - 0.1), 'the rule\'s word, 10 points high': at((H) => mid3(ruleFreq(H)) + 0.1),
  'the right word, at its middle': at((H) => mid3(freqOf(H))), 'the right word, 20 points low': at((H) => mid3(freqOf(H)) - 0.2), 'the right word, 20 points high': at((H) => mid3(freqOf(H)) + 0.2),
  'the right word, 10 points low': at((H) => mid3(freqOf(H)) - 0.1), 'the right word, 10 points high': at((H) => mid3(freqOf(H)) + 0.1),
};
const SETS = { errors: [ERRORS, './out/errors.jsonl'], derived: [DERIVED, './out/derived.jsonl'], words: [WORDS, './out/words.jsonl'] }; const [SET, FILE] = SETS[process.env.SET] ?? [SUMMARIES, './out/worth.jsonl'];
const [count = '12', seed = '21'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped'); const out = new URL(FILE, import.meta.url); writeFileSync(out, '', { flag: 'a' });
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 4) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.33, 0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 }); } catch { continue; }
  if (spot.estimate.bytes > 500 * 2 ** 20) continue;
  const t0 = Date.now(); const solve = fs.createRun(spot, { isomorphism: false, workers: 4 }); let ex = 9; while (ex > 0.15 && solve.completed < 2000) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts); const pot = spot.potUnits / spot.chipScale; const board = Array.from(spot.board); done++;
  // every decision on every board, read once: the hands that reach it, what they do, and what a picture would know of them
  const seen = [];
  for (const n of nodes) {
    if (n.kind !== 'decision') continue;
    const deals = n.round === 0 ? [[]] : Array.from({ length: 52 }, (_, c) => c).filter((c) => !board.includes(c)).map((c) => [c]);
    for (const dealt of deals) {
      let st; try { st = study(fs, solved, nodes, n.id, dealt); } catch { st = null; } if (!st) continue;
      const f = st.f; const eq = st.equity(); const ids = []; for (let c = 0; c < N; c++) if (f.mine[c] > 1e-9 && !Number.isNaN(eq[c])) ids.push(c); if (ids.length < 4) continue;
      const k = n.edges.length; const feats = ids.map((c) => st.featuresOf(c));
      const H = { ids, k, kinds: n.edges.map((x) => x.kind), w: ids.map((c) => f.mine[c]), e: ids.map((c) => eq[c]), P: ids.map((c) => Array.from({ length: k }, (_, a) => st.sigma(c, a))), cls: ids.map(classOf), type: feats.map(typeOf), outs: feats.map((x) => (f.board.length < 5 ? x.flushOuts + x.straightOuts : 0)) };
      H.byE = ids.map((_, i) => i).sort((x, y) => H.e[x] - H.e[y]);
      // the bet a player would make here (the biggest plain bet on offer) and its size in pots; the bet he faces, in pots of the pot before it
      const me = seatOf(n); const sizes = n.edges.map((x, a) => (x.kind === 'bet' ? (nodes[x.child].invested[me] - n.invested[me]) / n.pot : -1)); H.betSize = Math.max(...sizes); H.betAt = H.betSize > 0 ? sizes.indexOf(H.betSize) : -1;
      H.faced = st.toCall > 0 ? st.toCall / (st.pot - st.toCall) : 0;
      if (process.env.SET === 'words' && st.toCall <= 0) { const he = equityVs(fs, f.board, f.his, f.mine); let all = 0, strong = 0; for (let v = 0; v < N; v++) if (f.his[v] > 1e-9 && !Number.isNaN(he[v])) { all += f.his[v]; if (he[v] >= 0.8) strong += f.his[v]; } H.strong = strong / all; H.ip = me; H.round = n.round; }
      seen.push({ node: n.id, seat: seatOf(n), round: n.round, bindex: n.round === 0 ? 0 : spot.resolveBoard([...board, dealt[0]]).board, H });
    }
  }
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: b.join(''), spr: +(p.stack / p.pot).toFixed(1), exploit: +ex.toFixed(3), loss: {} };
  const fresh = () => { const r = fs.createRun(spot, { analysisOnly: true, isomorphism: false }); copySolved(solved, r, nodes, counts, 0); copySolved(solved, r, nodes, counts, 1); return r; };
  const base = fresh(); const noise = [0, 1].map((s) => 100 * (solved.ev(s) - base.snapshot().ev(s)) / pot); row.copied = noise.map((x) => +x.toFixed(3));
  for (const [name, make] of Object.entries(SET)) {
    const made = seen.map((d) => make(d.H)); row.loss[name] = {};
    for (const [scope, rounds] of [['turn', [0]], ['river', [1]]]) {
      let total = 0;
      for (const seat of [0, 1]) {
        const run = fresh(); const write = writer(run);
        seen.forEach((d, j) => { if (d.seat !== seat || !rounds.includes(d.round)) return; const at = new Map(d.H.ids.map((c, i) => [c, i])); const flat = Array.from({ length: d.H.k }, () => 1 / d.H.k); write(d.node, d.bindex, (c) => (at.has(c) ? made[j][at.get(c)] : flat)); });
        total += 100 * (solved.ev(seat) - run.snapshot().ev(seat)) / pot - noise[seat];
      }
      row.loss[name][scope] = +(total / 2).toFixed(3);
    }
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n');
  console.error(`${done}/${count} ${row.spot} ${row.board} (${row.seconds}s, copy ${row.copied}): ` + Object.entries(row.loss).map(([k, v]) => `${k.split(' (')[0].slice(0, 22)} ${v.turn}/${v.river}`).join(' | '));
}
