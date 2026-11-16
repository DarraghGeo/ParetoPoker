// What the strength ladder shows of every hand on a board: its level, what is still to come, and its strength now.
import * as fs from 'poker-flopsolve';
const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];
const RK = Array.from({ length: 52 }, (_, c) => fs.rankOf(c)); const SU = Array.from({ length: 52 }, (_, c) => fs.suitOf(c)); const ACE = Math.max(...RK); const LOW = Math.min(...RK);
const HIGHER = fs.evaluateCards(fs.parseCards('AsAh2c7d9h')) > fs.evaluateCards(fs.parseCards('3s4h2c7d9h')) ? 1 : -1;
// ---- what the ladder shows of a hand on a board ---------------------------------------------------------------------
const straightTop = (have) => { for (let top = ACE; top >= LOW + 3; top--) { let ok = true; for (let k = 0; k < 5 && ok; k++) { const r = top - k; ok = r < LOW ? have[ACE] : have[r]; } if (ok) return top; } return -1; };
/** Levels: 7 a set, straight or flush and better, 6 two pair, 5 overpair, 4 top pair, 3 middle pair, 2 low pair, 1 a draw, 0 trash. */
export function facts(board) {
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
  return { lv, come, str, order, byCome, river, flop };
}

