// Least-squares fits on the rows written by bin/diagnose-tuning.js.
//   node diagnosis/fit.mjs diagnosis/tuning-rivers-tune.json
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2]));
export function fit(set, y, xs) {
  // weighted least squares with an intercept, by normal equations
  const ok = set.filter((r) => Number.isFinite(y(r)) && xs.every((x) => Number.isFinite(x(r))));
  const k = xs.length + 1;
  const A = Array.from({ length: k }, () => new Float64Array(k)); const b = new Float64Array(k);
  for (const r of ok) { const v = [1, ...xs.map((x) => x(r))]; for (let i = 0; i < k; i++) { b[i] += r.reach * v[i] * y(r); for (let j = 0; j < k; j++) A[i][j] += r.reach * v[i] * v[j]; } }
  for (let i = 0; i < k; i++) { let p = i; for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let j = i + 1; j < k; j++) { const f = A[j][i] / A[i][i]; b[j] -= f * b[i]; for (let c = i; c < k; c++) A[j][c] -= f * A[i][c]; } }
  const beta = new Float64Array(k); for (let i = k - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < k; j++) s -= A[i][j] * beta[j]; beta[i] = s / A[i][i]; }
  const W = ok.reduce((t, r) => t + r.reach, 0); const my = ok.reduce((t, r) => t + r.reach * y(r), 0) / W;
  let sse = 0, sst = 0; for (const r of ok) { const p = beta[0] + xs.reduce((t, x, i) => t + beta[i + 1] * x(r), 0); sse += r.reach * (y(r) - p) ** 2; sst += r.reach * (y(r) - my) ** 2; }
  return { beta: [...beta].map((x) => +x.toFixed(3)), r2: +(1 - sse / sst).toFixed(2), n: ok.length, mean: +my.toFixed(3) };
}
const P = (k) => (r) => r.profile[k];
const show = (label, f) => console.log(label.padEnd(64), JSON.stringify(f));
for (const position of ['oop', 'ip']) {
  for (const kind of ['facing a bet', 'facing a raise']) {
    const set = rows.filter((r) => r.kind === kind && r.position === position);
    if (!set.length) continue;
    show(`${position} ${kind}: defence ~ rangeAdvantage`, fit(set, (r) => r.defence, [P('rangeAdvantage')]));
    show(`${position} ${kind}: defence ~ rangeAdv + nutAdv`, fit(set, (r) => r.defence, [P('rangeAdvantage'), P('nutAdvantage')]));
    show(`${position} ${kind}: defence ~ rangeAdv + price`, fit(set, (r) => r.defence, [P('rangeAdvantage'), (r) => r.price]));
    show(`${position} ${kind}: raiseOfContinue ~ polarization + spr`, fit(set, (r) => r.raiseOfContinue, [P('polarization'), P('spr')]));
  }
  const open = rows.filter((r) => r.kind === 'first to act' && r.position === position);
  show(`${position} open: bet ~ rangeAdvantage`, fit(open, (r) => r.bet, [P('rangeAdvantage')]));
  show(`${position} open: bet ~ rangeAdv + nutAdv + polarizationAdv`, fit(open, (r) => r.bet, [P('rangeAdvantage'), P('nutAdvantage'), P('polarizationAdvantage')]));
  show(`${position} open: averageSize ~ nutAdvantage + spr`, fit(open, (r) => r.averageSize, [P('nutAdvantage'), P('spr')]));
  for (const depth of [...new Set(open.map((r) => r.depth))].sort((a, b) => a - b)) {
    const set = open.filter((r) => r.depth === depth); const W = set.reduce((t, r) => t + r.reach, 0);
    const sizes = set[0].sizes.map((_, i) => set.reduce((t, r) => t + r.reach * (r.sizes[i]?.frequency ?? 0), 0) / W);
    const pots = set[0].sizes.map((x) => x.pots.toFixed(2));
    const bluff = set[0].sizes.map((_, i) => { const ok = set.filter((r) => Number.isFinite(r.sizes[i]?.bluffRatio) && r.sizes[i].frequency > 0.03); return ok.length ? (ok.reduce((t, r) => t + r.sizes[i].bluffRatio, 0) / ok.length).toFixed(2) : '-'; });
    console.log(`${position} open, stack ${depth}x pot: bets ${(set.reduce((t, r) => t + r.reach * r.bet, 0) / W).toFixed(2)}; sizes (pots) ${pots.join(', ')} used ${sizes.map((x) => x.toFixed(2)).join(', ')}; bluffs vs balanced per size ${bluff.join(', ')}`);
  }
}
