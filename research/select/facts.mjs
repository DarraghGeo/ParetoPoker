// What a player can see of each hand on a board (shared by the hand-selection study's tools).
import * as fs from 'poker-flopsolve';

const N = fs.COMBOS;
export const CA = (c) => fs.COMBO_CARDS[2 * c]; export const CB = (c) => fs.COMBO_CARDS[2 * c + 1]; export const RK = Array.from({ length: 52 }, (_, c) => fs.rankOf(c)); const SU = Array.from({ length: 52 }, (_, c) => fs.suitOf(c)); const ACE = Math.max(...RK); const LOW = Math.min(...RK);
export const HIGHER = fs.evaluateCards(fs.parseCards('AsAh2c7d9h')) > fs.evaluateCards(fs.parseCards('3s4h2c7d9h')) ? 1 : -1; export const nameOf = (c) => fs.formatCard(CA(c)) + fs.formatCard(CB(c));
const straightTop = (have) => { for (let top = ACE; top >= LOW + 3; top--) { let ok = true; for (let k = 0; k < 5 && ok; k++) { const r = top - k; ok = r < LOW ? have[ACE] : have[r]; } if (ok) return top; } return -1; };
/** Each hand on a board: its row (0 nothing, 1 draw, 2 low pair, 3 middle pair, 4 top pair, 5 overpair, 6 two pair, 7 trips or better), strength now, outs-like count, kicker and what it holds of the board's suits. */
export function facts(board) {
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

/** The made hand a player holds with the board, by name: quads, full, flush, straight, set (a pocket pair with one on the board), trips, twopair, pair, high. */
export function madeType(board, a, b) {
  const cards = [...board, a, b]; const n = new Uint8Array(16); const su = [0, 0, 0, 0]; const have = new Uint8Array(16); for (const c of cards) { n[RK[c]]++; su[fs.suitOf(c)]++; have[RK[c]] = 1; }
  const counts = Array.from(n).filter((x) => x > 0).sort((x, y) => y - x);
  if (counts[0] === 4) return 'quads'; if (counts[0] === 3 && counts[1] >= 2) return 'full'; if (su.some((x) => x >= 5)) return 'flush'; if (straightTop(have) >= 0) return 'straight';
  if (counts[0] === 3) return RK[a] === RK[b] ? 'set' : 'trips'; if (counts[0] === 2 && counts[1] === 2) return 'twopair'; return counts[0] === 2 ? 'pair' : 'high';
}
