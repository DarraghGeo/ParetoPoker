// What every action is worth to every hand, at the decisions of real river and turn spots, for the study of how
// precise hand selection needs to be. Spots: the roots of the owner's stored river and turn solves (ranges as play left
// them), solved again here. Values: take the action, then play as well as the hand can against his solved strategy
// (src/explain/best.js), so an action a hand never takes is priced fairly.
//   STORE=<dir> node research/select/collect.mjs <river|turn> [from] [to]   -> STORE/select-<street>.jsonl
// One line a decision: the pot, the price, the actions, and for each hand its weight, how often the solution takes each
// action, each action's value in % of the pot, and what a player can see of the hand.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { frameAt } from '../../src/explain/account.js';
import { evaluator } from '../../src/explain/best.js';

const [street = 'river', from = '0', to = '99999'] = process.argv.slice(2); const STORE = process.env.STORE; const N = fs.COMBOS;
const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1]; const RK = Array.from({ length: 52 }, (_, c) => fs.rankOf(c)); const SU = Array.from({ length: 52 }, (_, c) => fs.suitOf(c)); const ACE = Math.max(...RK); const LOW = Math.min(...RK);
const HIGHER = fs.evaluateCards(fs.parseCards('AsAh2c7d9h')) > fs.evaluateCards(fs.parseCards('3s4h2c7d9h')) ? 1 : -1; const nameOf = (c) => fs.formatCard(CA(c)) + fs.formatCard(CB(c));
const straightTop = (have) => { for (let top = ACE; top >= LOW + 3; top--) { let ok = true; for (let k = 0; k < 5 && ok; k++) { const r = top - k; ok = r < LOW ? have[ACE] : have[r]; } if (ok) return top; } return -1; };
/** Each hand on a board: its row (0 nothing, 1 draw, 2 low pair, 3 middle pair, 4 top pair, 5 overpair, 6 two pair, 7 trips or better), strength now, outs-like count, kicker and what it holds of the board's suits. */
function facts(board) {
  const lv = new Int8Array(N).fill(-1); const come = new Float32Array(N); const str = new Float64Array(N); const kick = new Int8Array(N); const fd = new Uint8Array(N); const river = board.length === 5;
  const bs = [0, 0, 0, 0]; const br = new Uint8Array(16); const taken = new Uint8Array(52); for (const c of board) { bs[SU[c]]++; br[RK[c]]++; taken[c] = 1; }
  const tops = [...new Set(board.map((c) => RK[c]))].sort((x, y) => y - x); const top = tops[0]; const second = tops[1] ?? -1; const have = new Uint8Array(16); for (const c of board) have[RK[c]] = 1; const boardStraight = straightTop(have);
  for (let c = 0; c < N; c++) {
    const a = CA(c), b = CB(c); if (taken[a] || taken[b]) continue; const ra = RK[a], rb = RK[b]; str[c] = HIGHER * fs.evaluateCards([...board, a, b]); const h = Uint8Array.from(have); h[ra] = 1; h[rb] = 1; const st = straightTop(h); let level = 0;
    const flush = [SU[a], SU[b]].some((s) => bs[s] < 5 && bs[s] + (SU[a] === s) + (SU[b] === s) >= 5); const trips = br[ra] + 1 + (ra === rb) >= 3 || br[rb] + 1 + (ra === rb) >= 3;
    if (flush || st > boardStraight || trips) level = 7; else if (ra !== rb && br[ra] && br[rb]) level = 6; else if (ra === rb) level = ra > top ? 5 : ra >= second ? 3 : 2;
    else if (br[ra] || br[rb]) { const hit = br[ra] ? ra : rb; level = hit === top ? 4 : hit === second ? 3 : 2; kick[c] = br[ra] ? rb : ra; } else kick[c] = Math.max(ra, rb);
    if (!river && level < 7) { const f = [SU[a], SU[b]].some((s) => bs[s] + (SU[a] === s) + (SU[b] === s) === 4); let outs = 0; for (let r = LOW; r <= ACE; r++) if (!h[r]) { h[r] = 1; if (straightTop(h) > st) outs += 4; h[r] = 0; } fd[c] = f ? 1 : 0; come[c] = (f ? 9 : 0) + outs; if (level === 0 && (f || outs >= 8)) level = 1; }
    lv[c] = level;
  }
  return { lv, come, str, kick, fd, river };
}
/** On the river, each hand's equity against a weighted range, his hands that share a card left out. */
function riverEquity(F, mine, his) {
  const hs = []; for (let c = 0; c < N; c++) if (his[c] > 0 && F.lv[c] >= 0) hs.push(c); const e = new Float32Array(N);
  for (let c = 0; c < N; c++) { if (!(mine[c] > 0) || F.lv[c] < 0) continue; const a = CA(c), b = CB(c); let win = 0, all = 0; for (const v of hs) { const x = CA(v), y = CB(v); if (x === a || x === b || y === a || y === b) continue; const w = his[v]; all += w; win += F.str[c] > F.str[v] ? w : F.str[c] === F.str[v] ? w / 2 : 0; } e[c] = all > 0 ? win / all : 0.5; }
  return e;
}
/** How much of a part of his range (weights `part`, out of weights `his`) is left once a hand's two cards are removed, against the same share with no cards removed: over 1 the hand leaves him more of that part, under 1 it blocks it. */
function unblock(his, part) {
  const cardAll = new Float64Array(52), cardPart = new Float64Array(52); let all = 0, p = 0; for (let v = 0; v < N; v++) if (his[v] > 0) { all += his[v]; p += part[v]; cardAll[CA(v)] += his[v]; cardAll[CB(v)] += his[v]; cardPart[CA(v)] += part[v]; cardPart[CB(v)] += part[v]; }
  const base = all > 0 ? p / all : 0; return (c) => { const a = CA(c), b = CB(c); const la = all - cardAll[a] - cardAll[b] + his[c]; const lp = p - cardPart[a] - cardPart[b] + part[c]; return base > 1e-9 && la > 1e-9 ? lp / la / base : 1; };
}
const rows = []; for (const t of readFileSync(`${STORE}/${street}-real.jsonl`, 'utf8').split('\n')) { if (!t.includes('"line":"r|"') || !t.includes('"seat":0')) continue; const d = JSON.parse(t); if (d.line === 'r|' && d.seat === 0 && d.toCall === 0) rows.push(d); }
const out = `${STORE}/select-${street}.jsonl`; if (+from === 0) writeFileSync(out, ''); const r4 = (x) => +x.toFixed(4); const tree = street === 'river' ? { betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 } : { betSizes: [[0.33, 0.75, 1.5], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 };
for (let i = +from; i < Math.min(rows.length, +to); i++) {
  const d = rows[i]; const text = (xs, f) => xs.filter(f).map((x) => `${Array.isArray(x) ? x[0] : x.h}:${(Array.isArray(x) ? x[1] : x.w).toFixed(5)}`).join(',');
  let spot; try { spot = fs.defineSpot({ board: d.board.replace(/ /g, ''), pot: d.pot, stack: d.behind, oop: text(d.hands, (h) => h.w > 1e-5), ip: text(d.vr, (v) => v[1] > 1e-5), ...tree }); } catch (err) { console.error(d.spot, String(err).slice(0, 80)); continue; }
  const t0 = Date.now(); const run = fs.createRun(spot, { isomorphism: false, workers: street === 'river' ? 1 : 2 }); let ex = 9; const goal = street === 'river' ? 0.05 : 0.15; while (ex > goal && run.completed < 4000) { run.step(20); ex = run.exploitabilityPercent(); }
  const sol = run.snapshot(); const nodes = treeOf(fs, spot); const valuesOf = evaluator(fs, sol, nodes); const board = Array.from(spot.board); const F = facts(board); const start = [0, 1].map((s) => frameAt(fs, sol, nodes, 0, [])).map((f, s) => (s === f.me ? f.mine : f.his)); const total = [0, 1].map((s) => start[s].reduce((x, y) => x + y, 0));
  for (const n of nodes) {
    if (n.kind !== 'decision' || n.round !== 0) continue; const f = frameAt(fs, sol, nodes, n.id, []); if (!f) continue; const me = f.me; let mt = 0, ht = 0; for (let c = 0; c < N; c++) { mt += f.mine[c]; ht += f.his[c]; }
    if (mt / total[me] < 0.05 || ht / total[1 - me] < 0.05) continue;                      // lines both players take at least 5% of the time
    const vals = valuesOf(f, 'best'); const view = sol.strategyAt(n.id, 0); const k = view.actions.length; const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, j) => { at[c] = j; });
    const kinds = n.edges.map((x) => x.kind); const toCall = n.invested[1 - me] - n.invested[me]; const adds = n.edges.map((x, a) => (nodes[x.child].invested ? nodes[x.child].invested[me] - n.invested[me] : toCall)); const e = F.river ? riverEquity(F, f.mine, f.his) : Float32Array.from(equityVs(fs, board, f.mine, f.his), (x) => (Number.isNaN(x) ? 0 : x));
    const he = F.river ? riverEquity(F, f.his, f.mine) : Float32Array.from(equityVs(fs, board, f.his, f.mine), (x) => (Number.isNaN(x) ? 0 : x));
    // parts of his range a hand may block: his strong hands (80%+ against us), his weak hands (under 30%), and, when we can bet, the hands that fold to and that call or raise the middle bet
    const strong = Float64Array.from(f.his, (w, v) => (he[v] >= 0.8 ? w : 0)); const weak = Float64Array.from(f.his, (w, v) => (he[v] < 0.3 ? w : 0)); const ub = { strong: unblock(f.his, strong), weak: unblock(f.his, weak) };
    const bets = kinds.map((x, a) => (x === 'bet' ? a : -1)).filter((a) => a >= 0);
    if (toCall <= 0 && bets.length) { const a = bets[Math.floor(bets.length / 2)]; const child = nodes[n.edges[a].child]; if (child.kind === 'decision') { const v2 = sol.strategyAt(child.id, 0); const k2 = v2.actions.length; const at2 = new Int32Array(N).fill(-1); Array.from(v2.combos).forEach((c, j) => { at2[c] = j; }); const fi = child.edges.findIndex((x) => x.kind === 'fold');
      const folds = Float64Array.from(f.his, (w, v) => (at2[v] >= 0 && fi >= 0 ? w * v2.probs[at2[v] * k2 + fi] : 0)); const conts = Float64Array.from(f.his, (w, v) => w - folds[v]); ub.folds = unblock(f.his, folds); ub.calls = unblock(f.his, conts); } }
    const beaten = (() => { const hs = []; let all = 0; for (let v = 0; v < N; v++) if (f.his[v] > 0) { hs.push(v); all += f.his[v]; } return (c) => { let b = 0; for (const v of hs) b += F.str[c] > F.str[v] ? f.his[v] : F.str[c] === F.str[v] ? f.his[v] / 2 : 0; return all > 0 ? b / all : 0; }; })();
    const hands = []; for (let c = 0; c < N; c++) { const w = f.mine[c]; if (!(w > mt * 1e-5) || at[c] < 0 || F.lv[c] < 0) continue;
      hands.push({ h: nameOf(c), w: r4(w / mt), p: Array.from({ length: k }, (_, a) => r4(view.probs[at[c] * k + a])), v: vals.map((x) => r4(100 * x[c] / n.pot)), e: r4(e[c]), now: r4(beaten(c)), row: F.lv[c], come: F.come[c], fd: F.fd[c], kick: F.kick[c], pair: CA(c) >> 2 === CB(c) >> 2 ? 1 : 0, hi: Math.max(RK[CA(c)], RK[CB(c)]), ubStrong: r4(ub.strong(c)), ubWeak: r4(ub.weak(c)), ubFolds: ub.folds ? r4(ub.folds(c)) : null, ubCalls: ub.calls ? r4(ub.calls(c)) : null }); }
    let line = []; for (let a2 = n; a2.parent >= 0; a2 = nodes[a2.parent]) line.unshift(nodes[a2.parent].edges[a2.via].kind[0] === 'c' && nodes[a2.parent].edges[a2.via].kind === 'check' ? 'x' : nodes[a2.parent].edges[a2.via].kind[0]);
    appendFileSync(out, JSON.stringify({ spot: d.spot, pre: d.pre, pot0: d.pot, street, board: d.board, seat: me, line: line.join(''), role: d.role, potNow: r4(n.pot), toCall: r4(toCall), behind: r4(d.behind - Math.max(n.invested[0], n.invested[1])), kinds, adds: adds.map(r4), exploit: r4(ex), hisStrong: r4(strong.reduce((x, y) => x + y, 0) / ht), hisWeak: r4(weak.reduce((x, y) => x + y, 0) / ht), hands }) + '\n');
  }
  console.error(`${i + 1}/${rows.length} ${d.spot} ${Date.now() - t0} ms, ${ex.toFixed(3)}`);
}
