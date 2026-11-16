// Deriving the lines at the table, taken apart. Each rule is played at one kind of decision only (the solution everywhere
// else), so that what it gives up there is seen alone; and beside each loss, how often the rule bets or continues against
// how often the solution does. The kinds: first to act, checked to, facing a bet, facing a raise.
//   RULES=<set> node derive.mjs [spots] [seed]   -> out/derive-<set>.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';

const N = fs.COMBOS; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0);
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => { const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot]; for (let i = 0; i < count; i++) { const p = probsOf(L.memberCombo[L.memberStart[from + i]]); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; } };
}
function copySolved(solved, target, nodes, counts, player) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}
const one = (k, a) => Array.from({ length: k }, (_, x) => (x === a ? 1 : 0));
const mass = (H, pick) => H.w.reduce((t, w, i) => t + (pick(i) ? w : 0), 0);

// ---- the pieces a rule is made of ---------------------------------------------------------------------------------
/** His hands that would continue against a bet of s pots if he keeps the top 1/(1+s) of his range: a range. */
function callers(H, s) { const keep = H.hisTotal / (1 + s); const out = new Float64Array(N); let seen = 0; for (const v of H.hisOrder) { if (seen >= keep) break; const w = Math.min(H.his[v], keep - seen); out[v] = w; seen += w; } return out; }
/** Each hand's equity against a part of his range. */
const against = (H, part) => { const e = equityVs(fs, H.board, H.mineFull, part); return H.ids.map((c) => (Number.isNaN(e[c]) ? 0 : e[c])); };
/** A betting plan: the hands in `value` bet, then bluffs from the bottom of the rest up to `bluffMass`, the rest check. */
function plan(H, value, bluffMass) { let room = bluffMass; return H.byE.reduce((out, i) => { if (value[i]) out[i] = one(H.k, H.betAt); else if (room > 1e-9) { out[i] = one(H.k, H.betAt); room -= H.w[i]; } else out[i] = one(H.k, H.check); return out; }, []); }
const checkAll = (H) => H.ids.map(() => one(H.k, H.check));
/** Value by the ruler: equity against his whole range of 1 - 1/(2(1+s)) or more. */
const byRuler = (H, s = H.betSize, line = 1 - 1 / (2 * (1 + s))) => H.e.map((e) => e >= line);
/** Value by what calls: ahead of half of the top 1/(1+s) of his range, counted hand by hand. */
const byCallers = (H, s = H.betSize) => against(H, callers(H, s)).map((e) => e >= 0.5);
const bluffsFor = (H, value, s = H.betSize, scale = 1) => scale * (s / (1 + s)) * mass(H, (i) => value[i]);
/** Facing a bet: the top `share` of the range continues by calling. */
function topCalls(H, share) { const keep = share * H.total; let seen = 0; const out = []; for (let j = H.byE.length - 1; j >= 0; j--) { const i = H.byE[j]; out[i] = one(H.k, seen < keep ? H.call : H.fold); seen += H.w[i]; } return out; }
/** Facing a bet: every hand with the price continues. */
const priceCalls = (H, extra = 0) => H.e.map((e) => one(H.k, e >= H.faced / (1 + 2 * H.faced) + extra ? H.call : H.fold));

const betRule = (H) => (H.betAt < 0 ? checkAll(H) : plan(H, byRuler(H), bluffsFor(H, byRuler(H))));
const callRule = (H) => topCalls(H, 1 / (1 + H.faced));
const BASE = { first: betRule, checkedTo: betRule, facingBet: callRule, facingRaise: callRule };

/** The rule sets: each names, for the kinds of decision it covers, what is played there; elsewhere the solution. */
const RULESETS = {
  parts: {
    'base at: first to act': { first: betRule }, 'base at: checked to': { checkedTo: betRule }, 'base at: facing a bet': { facingBet: callRule }, 'base at: facing a raise': { facingRaise: callRule },
    'first to act: check everything': { first: checkAll }, 'checked to: check everything': { checkedTo: checkAll },
    'facing a bet: everything with the price': { facingBet: (H) => priceCalls(H) }, 'facing a raise: everything with the price': { facingRaise: (H) => priceCalls(H) },
    'facing a raise: fold everything but the top fifth': { facingRaise: (H) => topCalls(H, 0.2) },
    'first: value by what calls, hand by hand': { first: (H) => (H.betAt < 0 ? checkAll(H) : plan(H, byCallers(H), bluffsFor(H, byCallers(H)))) },
    'checked to: value by what calls, hand by hand': { checkedTo: (H) => (H.betAt < 0 ? checkAll(H) : plan(H, byCallers(H), bluffsFor(H, byCallers(H)))) },
    'first: value only, no bluffs': { first: (H) => (H.betAt < 0 ? checkAll(H) : plan(H, byRuler(H), 0)) }, 'checked to: value only, no bluffs': { checkedTo: (H) => (H.betAt < 0 ? checkAll(H) : plan(H, byRuler(H), 0)) },
    'base everywhere': BASE,
  },
};
const SET = process.env.RULES ?? 'parts'; if (!RULESETS[SET]) { const more = await import('./rules.mjs'); Object.assign(RULESETS, more.rulesets({ one, mass, callers, against, plan, checkAll, byRuler, byCallers, bluffsFor, topCalls, priceCalls, betRule, callRule, BASE, fs, equityVs, N })); }
const RULES = RULESETS[SET];

const [count = '12', seed = '22'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped'); const out = new URL(`./out/derive-${SET}.jsonl`, import.meta.url); writeFileSync(out, '');
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 4) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.33, 0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 }); } catch { continue; }
  if (spot.estimate.bytes > 500 * 2 ** 20) continue;
  const t0 = Date.now(); const solve = fs.createRun(spot, { isomorphism: false, workers: 4 }); let ex = 9; while (ex > 0.15 && solve.completed < 2000) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts); const pot = spot.potUnits / spot.chipScale; const board = Array.from(spot.board); done++;
  const row0 = `${p.action}-${p.oop}-${p.ip} ${b.join('')}`;
  const kindOf = (n) => { const acts = []; let at = n; while (at.parent >= 0 && nodes[at.parent].kind !== 'chance') { const par = nodes[at.parent]; acts.unshift(par.edges[at.via].kind); at = par; } const last = acts[acts.length - 1]; return !acts.length ? 'first' : last === 'check' ? 'checkedTo' : last === 'bet' ? 'facingBet' : 'facingRaise'; };
  const seen = [];
  for (const n of nodes) {
    if (n.kind !== 'decision') continue; const what = kindOf(n);
    const deals = n.round === 0 ? [[]] : Array.from({ length: 52 }, (_, c) => c).filter((c) => !board.includes(c)).map((c) => [c]);
    for (const dealt of deals) {
      let st; try { st = study(fs, solved, nodes, n.id, dealt); } catch { st = null; } if (!st) continue;
      const f = st.f; const eq = st.equity(); const ids = []; for (let c = 0; c < N; c++) if (f.mine[c] > 1e-9 && !Number.isNaN(eq[c])) ids.push(c); if (ids.length < 4) continue;
      const k = n.edges.length; const kinds = n.edges.map((x) => x.kind); const me = seatOf(n); const hisEq = equityVs(fs, f.board, f.his, f.mine);
      const hisOrder = []; let hisTotal = 0; for (let v = 0; v < N; v++) if (f.his[v] > 1e-9 && !Number.isNaN(hisEq[v])) { hisOrder.push(v); hisTotal += f.his[v]; } hisOrder.sort((x, y) => hisEq[y] - hisEq[x]);
      // the bet a player would make: the biggest plain bet on offer, or all-in where that is the only bet there is
      const sized = (kind) => n.edges.map((x) => (x.kind === kind && st.toCall <= 0 ? (nodes[x.child].invested[me] - n.invested[me]) / n.pot : -1));
      const plain = sized('bet'); const sizes = Math.max(...plain) > 0 ? plain : sized('allin'); const betSize = Math.max(...sizes);
      const H = { ids, k, kinds, what, seat: me, round: n.round, board: f.board, mineFull: f.mine, his: f.his, hisEq, hisOrder, hisTotal, w: ids.map((c) => f.mine[c]), e: ids.map((c) => eq[c]), P: ids.map((c) => Array.from({ length: k }, (_, a) => st.sigma(c, a))),
        betSize, betAt: betSize > 0 ? sizes.indexOf(betSize) : -1, check: kinds.indexOf('check'), fold: kinds.indexOf('fold'), call: kinds.indexOf('call'), faced: st.toCall > 0 ? st.toCall / (st.pot - st.toCall) : 0, pot: st.pot, behind: (spot.stackUnits ?? 0), spr: null, feats: null, st };
      if (n.round === 0) { const pr = st.drawParts(); H.come = ids.map((c) => pr.draw[c] || 0); H.now = ids.map((c) => pr.now[c] || 0); }
      H.total = H.w.reduce((t, x) => t + x, 0); H.byE = ids.map((_, i) => i).sort((x, y) => H.e[x] - H.e[y]);
      seen.push({ node: n.id, dealt, seat: me, round: n.round, bindex: n.round === 0 ? 0 : spot.resolveBoard([...board, dealt[0]]).board, H });
    }
  }
  if (process.env.DUMP === 'values') {
    // per decision, by equity in twenty steps: how much of the range is there, how often the solution acts, and what always
    // acting and never acting would each give up there (first order: everything after as the solution has it)
    for (const d of seen) { const H = d.H; const st = H.st; if (H.total * H.hisTotal < 1) continue; const quiet = H.fold >= 0 ? H.fold : H.check; const loudA = H.fold >= 0 ? H.call : H.betAt; if (loudA < 0 || quiet < 0) continue;
      const vals = H.kinds.map((_, a) => st.closely(a).value); const B = 20; const bins = Array.from({ length: B }, () => [0, 0, 0, 0]);
      H.ids.forEach((c, i) => { const best = H.P[i].reduce((t, pr, a) => t + pr * (Number.isNaN(vals[a][c]) ? 0 : vals[a][c]), 0); if (Number.isNaN(vals[quiet][c]) || Number.isNaN(vals[loudA][c])) return; const k = Math.min(B - 1, Math.floor(B * H.e[i])); const w = H.w[i]; bins[k][0] += w; bins[k][1] += w * (1 - H.P[i][quiet]); bins[k][2] += w * (best - vals[loudA][c]); bins[k][3] += w * (best - vals[quiet][c]); });
      const hb = Array(B).fill(0); H.hisOrder.forEach((v) => { hb[Math.min(B - 1, Math.floor(B * H.hisEq[v]))] += H.his[v]; });
      // what he does against the bet, by his own strength in twenty steps: [folds, calls, raises] as shares of his range
      let reply = null; if (H.fold < 0) { try { const child = nodes[d.node].edges[loudA].child; const s2 = study(fs, solved, nodes, child, d.dealt); if (s2) { const kk = nodes[child].edges.map((x) => x.kind); reply = Array.from({ length: B }, () => [0, 0, 0]); let all = 0; for (let v = 0; v < N; v++) { const w = s2.f.mine[v]; if (!(w > 1e-9) || Number.isNaN(H.hisEq[v])) continue; all += w; const k = Math.min(B - 1, Math.floor(B * H.hisEq[v])); kk.forEach((kind, a) => { reply[k][kind === 'fold' ? 0 : kind === 'call' ? 1 : 2] += w * s2.sigma(v, a); }); } reply = reply.map((x) => x.map((y) => +(y / all).toFixed(4))); } } catch { reply = null; } }
      appendFileSync(new URL('./out/values.jsonl', import.meta.url), JSON.stringify({ reply, spot: row0, action: p.action, what: H.what, round: H.round, seat: H.seat, s: +H.betSize.toFixed(2), faced: +H.faced.toFixed(2), reach: +(H.hisTotal).toFixed(3), tot: +H.total.toFixed(3), nodePot: +(H.pot / pot).toFixed(3), bins: bins.map(([w, l, rb, rq]) => [+(w).toFixed(4), +(l).toFixed(4), +(100 * rb / pot).toFixed(4), +(100 * rq / pot).toFixed(4)]), his: hb.map((x) => +(x / H.hisTotal).toFixed(3)) }) + '\n'); }
    console.error(done); continue; }
  for (const d of seen) d.H.st = null;
  if (process.env.DUMP) { for (const d of seen) { const H = d.H; const bins = Array.from({ length: 10 }, () => [0, 0]); H.e.forEach((e, i) => { const k = Math.min(9, Math.floor(10 * e)); bins[k][0] += H.w[i]; bins[k][1] += H.w[i] * (1 - (H.fold >= 0 ? H.P[i][H.fold] : H.P[i][H.check])); });
      const hb = Array(10).fill(0); H.hisOrder.forEach((v) => { hb[Math.min(9, Math.floor(10 * H.hisEq[v]))] += H.his[v]; });
      appendFileSync(new URL('./out/dump.jsonl', import.meta.url), JSON.stringify({ spot: p.action, what: H.what, round: H.round, seat: H.seat, s: +H.betSize.toFixed(2), faced: +H.faced.toFixed(2), tot: +H.total.toFixed(2), bins: bins.map(([w, l]) => [+(w / H.total).toFixed(3), w > 0 ? +(l / w).toFixed(3) : 0]), his: hb.map((x) => +(x / H.hisTotal).toFixed(3)) }) + '\n'); } continue; }
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: b.join(''), spr: +(p.stack / p.pot).toFixed(1), loss: {}, does: {} };
  const fresh = () => { const r = fs.createRun(spot, { analysisOnly: true, isomorphism: false }); copySolved(solved, r, nodes, counts, 0); copySolved(solved, r, nodes, counts, 1); return r; };
  const base = fresh(); const noise = [0, 1].map((s) => 100 * (solved.ev(s) - base.snapshot().ev(s)) / pot);
  const loud = (H, P) => { let t = 0; H.w.forEach((w, i) => { t += w * (1 - (H.fold >= 0 ? P[i][H.fold] : P[i][H.check])); }); return t / H.total; };
  for (const [name, rule] of Object.entries(RULES)) {
    const made = seen.map((d) => (rule[d.H.what] ? rule[d.H.what](d.H) : null)); row.loss[name] = {}; row.does[name] = {};
    for (const [scope, round] of [['turn', 0], ['river', 1]]) {
      let total = 0; let mine = 0, his = 0, n = 0;
      for (const seat of [0, 1]) {
        const run = fresh(); const write = writer(run);
        seen.forEach((d, j) => { if (!made[j] || d.seat !== seat || d.round !== round) return; const at = new Map(d.H.ids.map((c, i) => [c, i])); const flat = one(d.H.k, 0); write(d.node, d.bindex, (c) => (at.has(c) ? made[j][at.get(c)] : flat)); mine += loud(d.H, made[j]); his += loud(d.H, d.H.P); n++; });
        total += 100 * (solved.ev(seat) - run.snapshot().ev(seat)) / pot - noise[seat];
      }
      row.loss[name][scope] = +(total / 2).toFixed(3); row.does[name][scope] = n ? [+(mine / n).toFixed(3), +(his / n).toFixed(3)] : null;
    }
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); console.error(`${done}/${count} ${row.spot} ${row.board} ${row.seconds}s`);
}
