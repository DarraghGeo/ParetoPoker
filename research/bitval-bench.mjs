// Bitval against the app's own equity code: the same numbers? how much faster? On a flop and a turn with wide ranges.
import { createRequire } from 'node:module';
import * as fs from 'poker-flopsolve';
import { equityVs } from '../src/solver/flopsolve.js';
import { drawParts, nextCards } from '../src/explain/street/cards-to-come.js';
import { TYPES } from '../web/lib/study/presets.js';
const BitVal = createRequire(import.meta.url)('poker-bitvaljs'); const bitval = new BitVal(); const N = fs.COMBOS;
const T = Object.fromEntries(TYPES.map((t) => [t[0], t])); const time = (f) => { const t = performance.now(); const out = f(); return [out, performance.now() - t]; };
for (const boardText of ['Ks9d4s', 'Ks9d4s7h', 'Ks9d4s7h2c']) {
  const board = fs.parseCards(boardText); const dead = new Set(board);
  const weights = (text) => { const w = fs.parseRange(text); const out = new Float64Array(N); for (let c = 0; c < N; c++) if (!dead.has(fs.COMBO_CARDS[2 * c]) && !dead.has(fs.COMBO_CARDS[2 * c + 1])) out[c] = w[c] * (0.3 + ((c * 7) % 10) / 10); return out; };   // uneven weights, as after a solve
  const mine = weights(T.Rec[2]); const his = weights(T.Reg[1]);
  const entries = (w) => { const ids = []; const list = []; for (let c = 0; c < N; c++) if (w[c] > 0) { ids.push(c); list.push({ hand: fs.formatCombo(c), weight: w[c] }); } return { ids, list }; };
  const H = entries(mine); const V = entries(his); const cards = boardText.match(/../g);
  const [own, tOwn] = time(() => equityVs(fs, board, mine, his));
  const [r, tBit] = time(() => bitval.compareRangeHandsSync(H.list, V.list, cards));
  const eq = (side, i) => { const n = side.win[i] + side.tie[i] + side.lose[i]; return n > 0 ? (side.win[i] + side.tie[i] / 2) / n : NaN; };
  let worst = 0; H.ids.forEach((c, i) => { const d = Math.abs(eq(r.hero, i) - own[c]); if (d > worst) worst = d; });
  console.log(`\n${boardText}: ${H.ids.length} hands against ${V.ids.length} | same order kept: ${r.hero.hands.length === H.ids.length && r.hero.hands[0] === H.list[0].hand}`);
  console.log(`  equity: the app ${tOwn.toFixed(0)} ms, bitval ${tBit.toFixed(0)} ms (both sides at once) | largest difference ${worst.toExponential(1)}`);
  if (board.length < 5) {
    const f = { board, mine, his, taken: (() => { const t = new Uint8Array(52); for (const c of board) t[c] = 1; return t; })() };
    const [spread, tSpread] = time(() => nextCards(fs, f)); const [parts, tParts] = time(() => drawParts(fs, f));
    const [rc, tCard] = time(() => bitval.compareRangeHandsSync(H.list, V.list, cards, [], 5, 1, true, { byCard: true }));
    let worstCard = 0; const k0 = spread[0]; const ci = bitval.cardIndex(fs.formatCards([k0.card]));
    H.ids.forEach((c, i) => { const w = rc.hero.byCard.win[i * 52 + ci], t = rc.hero.byCard.tie[i * 52 + ci], l = rc.hero.byCard.lose[i * 52 + ci]; const e = (w + t / 2) / (w + t + l); if (!Number.isNaN(k0.eq[c]) && !Number.isNaN(e)) worstCard = Math.max(worstCard, Math.abs(e - k0.eq[c])); });
    console.log(`  each next card: the app ${tSpread.toFixed(0)} ms, bitval with byCard ${tCard.toFixed(0)} ms | largest difference on the first card ${worstCard.toExponential(1)}`);
    let now = null, tNow = 0, err = '';
    try { [now, tNow] = time(() => bitval.compareRangeHandsSync(H.list, V.list, cards, [], board.length)); } catch (e) { err = String(e.message).slice(0, 80); }
    if (now) { let worstNow = 0; H.ids.forEach((c, i) => { const d = Math.abs(eq(now.hero, i) - parts.now[c]); if (d > worstNow) worstNow = d; }); console.log(`  ahead now: the app's parts ${tParts.toFixed(0)} ms (with still to come), bitval on the board as it stands ${tNow.toFixed(0)} ms | largest difference ${worstNow.toExponential(1)}`); }
    else console.log(`  ahead now: the app's parts ${tParts.toFixed(0)} ms; bitval on the board as it stands: ${err}`);
    // "still to come": the app's (won from behind) against equity less ahead now
    let gap = 0, n = 0; H.ids.forEach((c) => { if (!Number.isNaN(parts.draw[c])) { gap += Math.abs(parts.draw[c] - (own[c] - parts.now[c])); n++; } });
    const rank = (v) => { const o = H.ids.map((c, i) => [v(c), i]).sort((a, b) => a[0] - b[0]); const r2 = []; o.forEach(([, i], k) => { r2[i] = k; }); return r2; };
    const a = rank((c) => parts.draw[c]), b2 = rank((c) => own[c] - parts.now[c]); const m = (a.length - 1) / 2; let sxy = 0, sxx = 0; a.forEach((x, i) => { sxy += (x - m) * (b2[i] - m); sxx += (x - m) ** 2; });
    console.log(`  still to come: "won from behind" against "equity less ahead now": ${(100 * gap / n).toFixed(1)} points apart on average, rank correlation ${(sxy / sxx).toFixed(3)}`);
  }
}
