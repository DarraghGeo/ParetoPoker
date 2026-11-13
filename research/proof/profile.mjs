// The spot sentence: is poker-rangeman's "equity advantage" the difference in equity between the two ranges,
// counted exactly here (every card to come, every pair of hands that can be held together)?
import * as fs from 'poker-flopsolve';
import { RangeManager } from 'poker-rangeman';
import { profile } from '../../src/explain/profile.js';
import { equityVs } from '../../src/solver/flopsolve.js';
import { TURNS, FLOPS, RIVERS, HELD_TURNS, HELD_RIVERS } from './spots.mjs';
const rows = [];
for (const s of [...RIVERS, ...HELD_RIVERS, ...TURNS, ...HELD_TURNS, ...FLOPS]) {
  const board = fs.parseCards(s.board); const names = s.board.match(/[2-9TJQKA][shdc]/g);
  const a = fs.parseRange(s.oop), b = fs.parseRange(s.ip);
  // equity of a range: its hands' equities weighted by how often each can face the other range
  const side = (mine, his) => { const eq = equityVs(fs, board, mine, his); let w = 0, e = 0; const taken = new Set(board); for (let c = 0; c < fs.COMBOS; c++) { if (!(mine[c] > 0) || Number.isNaN(eq[c])) continue; const x = fs.COMBO_CARDS[2 * c], y = fs.COMBO_CARDS[2 * c + 1]; let m = 0; for (let v = 0; v < fs.COMBOS; v++) { if (!(his[v] > 0)) continue; const p = fs.COMBO_CARDS[2 * v], q = fs.COMBO_CARDS[2 * v + 1]; if (p === x || p === y || q === x || q === y || taken.has(p) || taken.has(q)) continue; m += his[v]; } w += mine[c] * m; e += mine[c] * m * eq[c]; } return e / w; };
  const exact = side(a, b) - side(b, a);
  const p = await profile(RangeManager, { oop: s.oop, ip: s.ip, board: names });
  rows.push({ spot: s.name, exact: +(100 * exact).toFixed(2), rangeman: p ? +(100 * p.advantage.range).toFixed(2) : null });
}
const worst = Math.max(...rows.map((r) => (r.rangeman == null ? 99 : Math.abs(r.exact - r.rangeman))));
console.log(JSON.stringify({ check: 'equity advantage, points: exact count against poker-rangeman', spots: rows.length, largestDifference: +worst.toFixed(2), rows }));
