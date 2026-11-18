// Decisions read from solves already stored in poker-huerosolver (read only), in the rows cache.py takes: every hand
// with its weight, its equity against the other range, its draw, the solver's play and what each action is worth.
// These solves allow a raise on every street (fullhand: one raise; handselector-river-real: two, three bet sizes and all-in).
// The ranges come from paid course charts: the rows are written outside this repository and are not committed.
//   node research/butterfly/store.mjs fullhand|river-real|turn-real <out.jsonl> [files from] [files to]
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fs } from '../proof/lib.mjs';
import { bothEquities } from '../../src/solver/equity.js';
const [set = 'fullhand', out = 'store.jsonl', from = '0', to = '9999'] = process.argv.slice(2);
const DIR = `${process.env.HUERO || '/home/user/poker-huerosolver'}/bench/solves/${set === 'fullhand' ? 'fullhand' : set === 'turn-real' ? 'handselector-turn' : 'handselector-river-real'}/`;   // turn-real: the turn spots built from the flop library's street ends
const N = fs.COMBOS; const CARD = new Map(); for (let c = 0; c < 52; c++) CARD.set(fs.formatCards([c]).trim(), c);
const COMBO = new Map(); for (let c = 0; c < N; c++) { const a = fs.COMBO_CARDS[2 * c], b = fs.COMBO_CARDS[2 * c + 1]; COMBO.set(a * 52 + b, c); COMBO.set(b * 52 + a, c); }
const cardsOf = (t) => { const o = []; const s = t.replace(/\s/g, ''); for (let i = 0; i < s.length; i += 2) o.push(CARD.get(s.slice(i, i + 2))); return o; };
const comboOf = (h) => { const [a, b] = cardsOf(h); return COMBO.get(a * 52 + b); };
const RANKS = '23456789TJQKA'; const r4 = (x) => +x.toFixed(4);
const top = (ranks) => { const have = new Set(ranks); if (have.has(12)) have.add(-1); for (let t = 12; t > 2; t--) { let ok = true; for (let k = 0; k < 5; k++) if (!have.has(t - k)) { ok = false; break; } if (ok) return t; } return -1; };
/** Cards that complete a flush using a hole card, and cards that give a better straight than now. */
function draws(hand, board) {
  if (board.length >= 10) return [0, 0];
  const h = [hand.slice(0, 2), hand.slice(2, 4)]; const b = []; for (let i = 0; i < board.length; i += 2) b.push(board.slice(i, i + 2)); const all = [...h, ...b]; let fo = 0;
  for (const s of 'shdc') if (h.some((c) => c[1] === s) && all.filter((c) => c[1] === s).length === 4) fo = 9;
  const ranks = all.map((c) => RANKS.indexOf(c[0])); const now = top(ranks); let n = 0; for (let r = 0; r < 13; r++) if (top([...ranks, r]) > now) n++;
  return [fo, n * 4];
}
const KIND = { F: 'fold', X: 'check', C: 'call', B: 'bet', R: 'raise', A: 'allin' };
/** One decision as a row. `node`: { board (text, no spaces), actor, labels, pot, toCall, behind, adds, s, ev (per pot), reach [2], combos [2] }. */
function row(meta, n) {
  const me = n.actor, him = 1 - me; const mine = new Float64Array(N), his = new Float64Array(N); const mc = n.combos[me], hc = n.combos[him]; const nh = mc.length;
  const bd = cardsOf(n.board); const dead = new Set(bd); const live = (c) => !dead.has(fs.COMBO_CARDS[2 * c]) && !dead.has(fs.COMBO_CARDS[2 * c + 1]);
  const mid = mc.map(comboOf), hid = hc.map(comboOf); let mw = 0, hw = 0;
  mid.forEach((c, i) => { if (n.reach[me][i] > 0 && live(c) && n.ev[i] != null) { mine[c] = n.reach[me][i]; mw += mine[c]; } }); hid.forEach((c, i) => { if (n.reach[him][i] > 0 && live(c)) { his[c] = n.reach[him][i]; hw += his[c]; } });
  if (!(mw > 0) || !(hw > 0)) return null;
  const [em, eh] = bothEquities(fs, bd, mine, his); const hands = []; const A = n.labels.length; const freq = new Array(A).fill(0);
  mid.forEach((c, i) => {
    if (!(mine[c] > 0) || Number.isNaN(em[c])) return; const p = [], q = [];
    for (let a = 0; a < A; a++) { p.push(r4(n.s[a * nh + i] / 1000)); const v = n.ev[a * nh + i]; q.push(v == null ? null : r4(n.scale * v / n.pot)); freq[a] += mine[c] * n.s[a * nh + i] / 1000; }
    const [fo, so] = draws(mc[i], n.board); hands.push({ h: mc[i], w: r4(mine[c] / mw), e: r4(em[c]), fo, so, p, q });
  });
  if (hands.length < 8) return null;
  const vr = []; hid.forEach((c, i) => { if (his[c] / hw > 0.0005 && !Number.isNaN(eh[c])) vr.push([hc[i], r4(his[c] / hw), r4(eh[c])]); });
  const board = n.board.match(/../g).join(' ');
  return { ...meta, line: n.line, seat: me, board, pot: r4(n.pot), toCall: r4(n.toCall), behind: r4(n.behind), role: n.role, set, share: r4(n.share), faced: n.faced,
    actions: n.labels.map((l, a) => ({ kind: KIND[l[0]], label: l, freq: r4(freq[a] / mw), add: r4(n.adds[a]) })), hands, vr };
}
const sum = (a) => { let t = 0; for (const x of a) t += x; return t; }; const SHARE = 0.03;      // a decision is kept when the two players get there, within the street, 3% of the time or more
const hash = (t) => { let h = 2166136261; for (const ch of t) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
writeFileSync(out, ''); const files = readdirSync(DIR).filter((f) => f.endsWith('.json.gz')).sort().slice(+from, +to); let rows = 0;
for (const f of files) {
  const d = JSON.parse(gunzipSync(readFileSync(DIR + f))); if (d.exploitPct > 0.35) { console.error('skip', f, d.exploitPct.toFixed(2)); continue; }
  const sp = d.spot; const meta = { spot: `${set}:${f.replace('.json.gz', '')}`, pre: `${sp.potType}-${sp.seats[0]}-${sp.seats[1]}`, action: sp.potType, exploit: r4(d.exploitPct), stack: sp.stack }; const lines = [];
  if (set === 'fullhand') {
    const at = new Map(d.nodes.map((n) => [n.p, n]));
    for (const n of d.nodes) {
      const toks = n.p ? n.p.split(',') : []; let last = -1; toks.forEach((t, i) => { if (t[0] === 'd') last = i; }); const street = toks.filter((t) => t[0] === 'd').length;
      const start = at.get(toks.slice(0, last + 1).join(',')); if (!start) continue; const base = last < 0 ? 0 : start.inv[0];
      const share = (sum(n.r[0]) / sum(start.r[0])) * (sum(n.r[1]) / sum(start.r[1])); if (!(share >= SHARE)) continue;
      const cur = toks.slice(last + 1); const board = sp.board + toks.filter((t) => t[0] === 'd').map((t) => t.slice(1)).join('');
      // who bet or raised last on the street before: before the flop the raiser; later, the last aggressive action of that street
      let who = null;
      if (street === 0) who = sp.pfr; else { let prev = -1; toks.slice(0, last).forEach((t, i) => { if (t[0] === 'd') prev = i; }); const pt = toks.slice(prev + 1, last); pt.forEach((t, i) => { if ('BRA'.includes(t[0])) who = i % 2; }); }
      const role = who == null ? 'none' : who === n.a ? 'led' : 'followed'; const inv = n.inv; const mx = Math.max(inv[0], inv[1]);
      const adds = n.acts.map((l) => (l[0] === 'C' ? mx - inv[n.a] : 'BRA'.includes(l[0]) ? +l.slice(1) / 100 - (inv[n.a] - base) : 0));
      lines.push(row(meta, { board, actor: n.a, labels: n.acts, pot: sp.pot + inv[0] + inv[1], toCall: mx - inv[n.a], behind: sp.stack - mx, adds, s: n.s, ev: n.ev, scale: sp.pot / 100000, reach: n.r, combos: d.combos, line: `${'ftr'[street]}|${cur.join(',')}`, role, share, faced: cur.some((t) => t[0] === 'R' || (t[0] === 'A' && cur.indexOf(t) > 0 && cur.slice(0, cur.indexOf(t)).some((u) => 'BRA'.includes(u[0])))) ? 'raise' : 'bet' }));
    }
  } else {
    const pr = sp.prior[sp.prior.length - 1].split(' '); let who = null; pr.forEach((t, i) => { if ('BRA'.includes(t[0])) who = i % 2; });
    const root = d.nodes.find((n) => n.path.length === 0);
    for (const n of d.nodes) {
      const share = (sum(n.w[0]) / sum(root.w[0])) * (sum(n.w[1]) / sum(root.w[1])); if (!(share >= SHARE)) continue; const agg = n.path.filter((t) => 'BRA'.includes(t[0])).length;
      const me = n.player; const bet = n.bet; const mx = Math.max(bet[0], bet[1]);
      const adds = n.actions.map((l) => (l[0] === 'C' ? mx - bet[me] : 'BRA'.includes(l[0]) ? +l.slice(1) / 100 - bet[me] : 0));
      lines.push(row(meta, { board: sp.board, actor: me, labels: n.actions, pot: sp.pot + bet[0] + bet[1], toCall: mx - bet[me], behind: sp.stack - mx, adds, s: n.s, ev: n.ev, scale: 1 / 100, reach: n.w, combos: d.combos, line: `r|${n.path.join(',')}`, role: who == null ? 'none' : who === me ? 'led' : 'followed', share, faced: agg >= 2 ? 'raise' : 'bet' }));
    }
  }
  const good = lines.filter(Boolean); if (good.length) appendFileSync(out, good.map((x) => JSON.stringify(x)).join('\n') + '\n'); rows += good.length;
  console.error(`${f}: ${good.length} decisions (${rows})`);
}
