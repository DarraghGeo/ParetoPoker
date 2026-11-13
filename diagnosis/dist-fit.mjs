// Fits the distribution mixer's tables: for each measure of spread and grid size, how often each
// cell bets relative to how often the range bets, averaged over the tuning decisions, per seat.
//   node diagnosis/dist-fit.mjs <in.jsonl> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { cards, gridCells } from '../src/index.js';
const [input, output] = process.argv.slice(2);
const { NUM_COMBOS } = cards;
const decisions = readFileSync(input, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const BY = { sd: 4, best: 5, high: 6 };
const tables = {};
for (const by of Object.keys(BY)) for (const [cols, rows] of [[6, 3], [8, 3], [10, 3], [8, 4], [8, 2], [12, 3]]) {
  const entry = {}; let sse = 0, sst = 0;
  for (const position of ['oop', 'ip']) {
    const sum = Array.from({ length: rows }, () => new Float64Array(cols)); const count = Array.from({ length: rows }, () => new Float64Array(cols));
    const mine = decisions.filter((d) => d.position === position);
    const prepared = mine.map((d) => {
      const hero = new Float64Array(NUM_COMBOS); const column = new Float64Array(NUM_COMBOS).fill(NaN); const row = new Float64Array(NUM_COMBOS).fill(NaN); const bet = new Float64Array(NUM_COMBOS);
      for (const h of d.hands) { hero[h[0]] = h[1]; bet[h[0]] = h[2]; column[h[0]] = h[3]; row[h[0]] = h[BY[by]]; }
      const cells = gridCells(hero, column, row, cols, rows);
      let total = 0, bets = 0; const cw = Array.from({ length: rows }, () => new Float64Array(cols)); const cb = Array.from({ length: rows }, () => new Float64Array(cols));
      for (const h of d.hands) { const i = h[0]; total += hero[i]; bets += hero[i] * bet[i]; cw[cells.row[i]][cells.col[i]] += hero[i]; cb[cells.row[i]][cells.col[i]] += hero[i] * bet[i]; }
      return { d, hero, bet, cells, level: bets / total, cw, cb };
    });
    for (const p of prepared) {
      if (p.level < 0.03) continue; // a range that hardly bets says nothing about who bets
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (p.cw[r][c] > 0) { sum[r][c] += p.cb[r][c] / p.cw[r][c] / p.level; count[r][c]++; }
    }
    const table = sum.map((row, r) => Array.from(row, (x, c) => +(count[r][c] ? x / count[r][c] : 1).toFixed(2)));
    entry[position] = { by, table };
    // how much of the solver's choice the table reproduces, at the solver's own level
    for (const p of prepared) {
      let mean = p.level;
      for (const h of p.d.hands) { const i = h[0]; const guess = Math.min(1, table[p.cells.row[i]][p.cells.col[i]] * p.level); sse += p.hero[i] * (p.bet[i] - guess) ** 2; sst += p.hero[i] * (p.bet[i] - mean) ** 2; }
    }
  }
  tables[`${by} ${cols}x${rows}`] = { turn: entry, r2: +(1 - sse / sst).toFixed(3) };
}
writeFileSync(output, `${JSON.stringify(tables, null, 1)}\n`);
console.log(`${decisions.length} decisions`);
for (const [name, t] of Object.entries(tables)) console.log(`${name.padEnd(12)} explains ${t.r2}`);
