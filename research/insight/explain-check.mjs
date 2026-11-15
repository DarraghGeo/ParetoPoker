// Every explanation the app can give, generated in bulk and checked: no failures, no broken wording, and every claim
// that can be checked against the solution is. Writes what was said to out/explain-samples.txt for reading.
//   node explain-check.mjs [spots] [seed]
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study, measure, explainStreet, explainRange, tolerance, oneMove, RARE } from '../../src/explain/street.js';
import { whatIf } from '../../src/explain/whatif.js';
const [count = '6', seed = '81'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || process.env.ONLY.split(',').includes(p.action)));
// the tree as the app builds it (web/worker.js spotOf), and the same settings as the app holds them
const APP = { bets: [[0.33, 0.75], [0.75], [0.75]], raises: [3], maxRaises: 1, allIn: false };
const TREE = { betSizes: process.env.ROOT === 'turn' ? APP.bets.slice(-2) : APP.bets, raiseSizes: APP.raises.map((times) => ({ times })), maxRaises: 1 + APP.maxRaises, allowAllIn: APP.allIn };
const file = new URL('./out/explain-samples.txt', import.meta.url); writeFileSync(file, ''); const say = (t) => appendFileSync(file, t + '\n');
const problems = []; const flag = (where, what) => { problems.push(`${where}: ${what}`); };
const BAD = [/undefined/, /\bNaN\b/, /\bnull\b/, /  /, /\bof of\b/, /\bon on\b/, /\(\)/, /\b(\w+) \1\b/i, /\. \./, /,\./, /: \./, /\bInfinity\b/, / \./, /\bwith \.|\bwith and\b/];
const lint = (where, text) => { for (const re of BAD) if (re.test(text) && !/that that|had had/.test(text)) flag(where, `wording "${re}" in: ${text}`); if (/^[a-z]/.test(text)) flag(where, `starts lower case: ${text}`); if (!/[.!?]$/.test(text.trim())) flag(where, `no full stop: ${text}`); };
let hands = 0, ranges = 0, changes = 0; const times = []; const gaps = []; const agree = [];
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < (process.env.ROOT === 'turn' ? 4 : 3)) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); } const board = b.join('');
  let spot; try { spot = fs.defineSpot({ board, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; } if (spot.estimate.bytes > +(process.env.MAXMB ?? 900) * 2 ** 20) continue;
  const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.3 && run.completed < 800) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); done++;
  say(`\n################ ${p.action} ${p.oop} v ${p.ip}  ${board}  (stack ${p.stack}, pot ${p.pot})`);
  // decisions to visit: the flop ones, then a turn and a river down the commonest lines
  const visit = []; const seen = new Set();
  const walk = (id, dealt, depth, label) => {
    const n = nodes[id]; if (!n) return;
    if (n.kind === 'chance') { if (dealt.length >= 2) return; const used = [...spot.board, ...dealt]; let card; do { card = rand(52); } while (used.includes(card)); walk(n.edges[0].child, [...dealt, card], depth, `${label} / ${fs.formatCards([card])}`); return; }
    if (n.kind !== 'decision') return; const key = `${id}|${dealt.join(',')}`; if (seen.has(key)) return; seen.add(key); visit.push({ id, dealt, label });
    let st; try { st = study(fs, solution, nodes, id, dealt); } catch { return; } if (!st) return;
    // follow every action taken often enough on the flop, the two commonest after it
    const order = st.actions.map((x, i) => i).sort((x, y) => st.actions[y].freq - st.actions[x].freq).filter((i) => st.actions[i].freq >= 0.08).slice(0, dealt.length ? 2 : 4);
    for (const i of order) walk(n.edges[i].child, dealt, depth + 1, `${label} ${n.edges[i].label}`);
  };
  walk(0, [], 0, '');
  for (const v of visit) {
    let st; try { st = study(fs, solution, nodes, v.id, v.dealt); } catch (e) { flag(`${board} ${v.label}`, `study failed: ${e.message}`); continue; } if (!st) continue;
    const where = `${p.action} ${board}${v.label} [${st.f.me ? 'IP' : 'OOP'}]`; const street = ['flop', 'turn', 'river'][st.f.board.length - 3];
    // the range
    let t0 = Date.now(); let r; try { r = explainRange(st); } catch (e) { flag(where, `range failed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); r = null; }
    if (r) { ranges++; times.push(['range', Date.now() - t0]); say(`\n== ${where}   (${street}, reach ${st.lineReach.map((x) => x.toFixed(2)).join('/')})\nRANGE: ${r.line}`); lint(where, r.line); for (const x of r.reasons) { say(`   - ${x.text}\n        [${x.detail}]`); lint(where, x.text); lint(where, x.detail); }
      // checks on the range claims
      const F = r.facts; if (F.bet != null && F.clearBet != null) { if (F.bet < F.clearBet - 0.15 || F.bet > 1 - F.clearCheck + 0.15) flag(where, `solver bets ${F.bet.toFixed(2)} outside what clearly bets ${F.clearBet.toFixed(2)} .. ${(1 - F.clearCheck).toFixed(2)}`); }
      if (/almost your whole range/.test(r.line) && F.bet != null && F.bet > 0.2 && F.bet < 0.8) flag(where, 'line says whole range, frequency does not');
      // what would change it: the street solved again (turn and river here; the flop is too slow to do for every decision)
      if (Math.min(...st.lineReach) >= 0.05 && (st.f.board.length === 3 || changes < 40 || rnd() < 0.15)) { const lim = st.f.board.length === 3 ? { bytes: 1 } : {};
        t0 = Date.now(); let w; try { w = whatIf(fs, { solution, nodes, config: APP }, v.id, v.dealt, lim); } catch (e) { flag(where, `what-if failed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); w = null; }
        if (w && w.said) { changes++; times.push(['change', Date.now() - t0]); say(`   - ${w.said.text}\n        [${w.said.detail}]`); lint(where, w.said.text); lint(where, w.said.detail); const now = F.bet != null ? F.bet : F.fold; if (now != null && w.base != null) { agree.push(Math.abs(w.base - now)); if (Math.abs(w.base - now) > 0.12) flag(where, `solved again it ${w.facing ? 'folds' : 'bets'} ${w.base.toFixed(2)}, in the solution ${now.toFixed(2)}`); } }
        else if (w && w.skipped && !w.said) say(`   - (what would change it: skipped, ${w.skipped})`); else if (!w) flag(where, 'what-if gave nothing');
      } }
    // hands across the range: by equity, a dozen of them
    if (Math.min(...st.lineReach) < RARE) continue; const eq = st.equity(); const live = []; for (let c = 0; c < fs.COMBOS; c++) if (st.f.mine[c] > 0.05 && !Number.isNaN(eq[c])) live.push(c); live.sort((x, y) => eq[x] - eq[y]);
    const pick = []; for (let k = 0; k < 10 && live.length; k++) pick.push(live[Math.min(live.length - 1, Math.floor(((k + rnd()) / 10) * live.length))]);
    const T = st.f.round === 0 ? tolerance(street, ex, st.lineReach) : tolerance(`${street} after a deal`, ex, st.lineReach);
    for (const c of [...new Set(pick)]) {
      t0 = Date.now(); let told; try { const m = measure(st, c, { worth: !!T || Math.min(...st.lineReach) >= RARE }); told = explainStreet(st, m, T); } catch (e) { flag(`${where} ${fs.formatCombo(c)}`, `hand failed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
      if (!told) continue; hands++; times.push(['hand', Date.now() - t0]); const w2 = `${where} ${fs.formatCombo(c)}`;
      say(`  ${fs.formatCombo(c)} (${Math.round(100 * eq[c])}%, ${told.strategy.map((x, i) => `${st.actions[i].label} ${Math.round(100 * x)}`).filter((x) => !/ 0$/.test(x)).join(' ')}): ${told.line}`); lint(w2, told.line);
      for (const x of told.reasons) { say(`      ${x.id}: ${x.text}${x.detail ? `\n          [${x.detail}]` : ''}`); lint(w2, x.text); if (x.detail) lint(w2, x.detail); }
      // the one-move reason must agree with its own count
      const mv = told.reasons.find((x) => x.id === 'move'); const om = oneMove(st, c); const top = told.strategy.indexOf(Math.max(...told.strategy));
      if (mv && om && /comes out best/.test(mv.text)) {
        // by the solution's own worths where it has them, else by the count
        const mm = measure(st, c, { worth: true }); const ws = mm.actions.map((y) => y.worth); if (ws[top] != null) { const best = Math.max(...ws.filter((y) => y != null)); if (ws[top] < best - 1) flag(w2, `says best, but another action is ${(best - ws[top]).toFixed(1)}% of the pot better in the solution`); }
        else { const best = Math.max(...om.actions.filter((y) => y.kind !== 'fold').map((y) => y.value)); if (om.actions[top].value < best - 3) flag(w2, `says best, but another action is ${(best - om.actions[top].value).toFixed(1)}% of the pot better by the count`); }
      }
      // the count against the solution: how far the one-move figure for betting over checking is from the solution's own
      if (om) { const mm = measure(st, c, { worth: true }); const q = om.actions.findIndex((y) => y.kind === 'check' || y.kind === 'call'); om.actions.forEach((y, i) => { if (i !== q && q >= 0 && y.kind !== 'fold' && mm.actions[i].worth != null && mm.actions[q].worth != null) gaps.push([street, y.value - om.actions[q].value, mm.actions[i].worth - mm.actions[q].worth]); }); }
      if (!mv && told.strategy[top] > 0.5 && !told.silent) flag(w2, 'no one-move reason');
      if (told.reasons.length < 2 && !told.silent) flag(w2, 'fewer than two reasons');
    }
  }
  console.error(`${p.action} ${board}: ${visit.length} decisions; so far ${ranges} range and ${hands} hand explanations, ${problems.length} problems`);
}
const stat = (k) => { const v = times.filter((x) => x[0] === k).map((x) => x[1]).sort((x, y) => x - y); return v.length ? `median ${v[v.length >> 1]}ms, worst tenth ${v[Math.floor(v.length * 0.9)]}ms, worst ${v[v.length - 1]}ms` : 'none'; };
console.log(`${ranges} range explanations (${stat('range')}); ${hands} hand explanations (${stat('hand')}); ${changes} what-would-change answers (${stat('change')}); ${problems.length} problems`);
if (agree.length) console.log(`  the street solved again against the solution on screen: apart by ${(100 * agree.reduce((t, x) => t + x, 0) / agree.length).toFixed(1)} points on average, worst ${(100 * Math.max(...agree)).toFixed(0)}`);
for (const st of ['flop', 'turn', 'river']) { const g = gaps.filter((x) => x[0] === st); if (g.length) { const same = g.filter((x) => Math.sign(x[1]) === Math.sign(x[2]) || Math.abs(x[2]) < 1).length / g.length; const off = g.reduce((t, x) => t + Math.abs(x[1] - x[2]), 0) / g.length; console.log(`  ${st}: the one-move count of a wager against the quiet action, set beside the solution's own: ${g.length} cases, same side in ${(100 * same).toFixed(0)}%, apart by ${off.toFixed(1)}% of the pot on average`); } }
const kinds = new Map(); for (const x of problems) { const k = x.split(': ').slice(1).join(': ').replace(/[0-9.]+/g, '#').slice(0, 70); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
for (const [k, n] of [...kinds.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25)) console.log(`  ${n} x ${k}`);
writeFileSync(new URL('./out/explain-problems.txt', import.meta.url), problems.join('\n'));
