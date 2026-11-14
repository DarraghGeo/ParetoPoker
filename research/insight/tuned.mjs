// The fitted corrections (out/tuned.json, from freq_export.py), worked out at a decision from the two ranges.
// Unlike formulas.mjs, the numbers here were fitted to solver output: they are measurements, not derivations.
import { readFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { dist, base } from './formulas.mjs';
const T = JSON.parse(readFileSync(new URL('./out/tuned.json', import.meta.url), 'utf8')); const N = fs.COMBOS;
const logit = (p) => { const q = Math.min(0.99, Math.max(0.01, p)); return Math.log(q / (1 - q)); }; const expit = (z) => 1 / (1 + Math.exp(-z));
function shape(e, w, ids) {
  let W = 0, m = 0; const live = ids.filter((c) => w[c] > 0 && !Number.isNaN(e[c])); for (const c of live) { W += w[c]; m += w[c] * e[c]; } m /= W || 1; let v = 0, nut = 0, strong = 0, mid = 0, air = 0;
  for (const c of live) { v += w[c] * (e[c] - m) ** 2; if (e[c] >= 0.8) nut += w[c]; if (e[c] >= 0.65) strong += w[c]; if (e[c] >= 0.35 && e[c] < 0.65) mid += w[c]; if (e[c] < 0.25) air += w[c]; }
  return { eq: m, sd: Math.sqrt(v / (W || 1)), nut: nut / (W || 1), strong: strong / (W || 1), mid: mid / (W || 1), air: air / (W || 1) };
}
/** The facts the corrections use, at one decision. `e`, `eHis`: each range's equity against the other. */
export function facts(board, mine, his, e, eHis, ids, extra = {}) {
  const a = shape(e, mine, ids); const b = shape(eHis, his, ids); const ranks = board.map((c) => fs.rankOf(c)); const suits = [0, 1, 2, 3].map((s) => board.filter((c) => fs.suitOf(c) === s).length); const most = Math.max(...suits);
  const uniq = [...new Set(ranks)]; let conn = 0; for (let lo = -1; lo <= 8; lo++) { let k = 0; for (let j = 0; j < 5; j++) if (uniq.includes(lo + j === -1 ? 12 : lo + j)) k++; conn = Math.max(conn, k); }
  return { adv: a.eq - 0.5, nut_adv: a.nut - b.nut, strong_adv: a.strong - b.strong, air_adv: a.air - b.air, sd_adv: a.sd - b.sd, my_sd: a.sd, his_sd: b.sd, my_nut: a.nut, his_nut: b.nut, my_air: a.air, his_air: b.air, my_mid: a.mid, his_mid: b.mid,
    two_tone: +(most === 2), monotone: +(most >= 3), paired: +(uniq.length < ranks.length), connected: +(conn >= 3), high: +(Math.max(...ranks) >= 11), ...extra };
}
const apply = (model, baseValue, f) => (model ? expit(logit(baseValue) + model.const + Object.entries(model.slopes).reduce((t, [k, s]) => t + s * (f[k] ?? 0), 0)) : null);
/** How much of the range bets, corrected: the base is the one-size thresholds on equity at the smallest size, as it was fitted. */
export function tunedBet(street, first, e, mine, ids, smallest, f) { const live = ids.filter((c) => mine[c] > 0 && !Number.isNaN(e[c])); const rho = smallest / (1 + smallest); const t = base(dist(e, mine, live), smallest, rho); return apply(T.bet[`${street}|${first ? 1 : 0}`], t.v * (1 + rho), f); }
/** The thresholds' fold frequency for a bet of `s` from a range with equities `e`: the base the fold correction was fitted on. */
export function foldBase(e, mine, ids, s) { const live = ids.filter((c) => mine[c] > 0 && !Number.isNaN(e[c])); return base(dist(e, mine, live), s, s / (1 + s)).fold; }
export const tunedFold = (street, thr, f) => apply(T.fold[String(street)], thr, f);
export const tunedRaise = (street, f) => apply(T.raise[String(street)], 0.5, f);
void N;
