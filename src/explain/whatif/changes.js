// The one-thing changes the street is solved again with: a range without its strongest hands, no raise for him on
// this street, no bet for him when checked to.
import { equityVs } from '../../solver/flopsolve.js';
import { answer } from './answer.js';

const SEAT = ['oop', 'ip'];
const each = (n, v) => Array.from({ length: n }, () => v);

/** A range without its strongest hands: the top 20% of its weight by equity against the other range. */
function withoutTop(fs, board, ranges, p) {
  const e = equityVs(fs, board, ranges[p], ranges[1 - p]);
  const ids = []; let all = 0;
  for (let k = 0; k < fs.COMBOS; k++) if (ranges[p][k] > 0 && !Number.isNaN(e[k])) { ids.push(k); all += ranges[p][k]; }
  ids.sort((x, y) => e[y] - e[x]);
  const range = Float64Array.from(ranges[p]); let seen = 0;
  for (const k of ids) { if (seen >= 0.2 * all) break; seen += ranges[p][k]; range[k] = 0; }
  return range;
}

/** His strongest hands out of his range, then ours out of ours. */
export function withoutStrongest(fs, street, play, out) {
  const { base, board, ranges } = street; const { me } = play;
  out.hisLess = answer(fs, play, { ...base, [SEAT[1 - me]]: withoutTop(fs, board, ranges, 1 - me) });
  out.myLess = answer(fs, play, { ...base, [SEAT[me]]: withoutTop(fs, board, ranges, me) });
}

/** No raise for him on this street, where the street allows one. */
export function withoutHisRaise(fs, { base, streets, most }, play, out) {
  if (play.facing || !(most > 1)) return;
  const cap = each(streets, most); const his = each(streets, most); his[0] = 1;
  const maxRaises = { [SEAT[play.me]]: cap, [SEAT[1 - play.me]]: his };
  try { out.noRaise = answer(fs, play, { ...base, maxRaises }); } catch { /* the tree does not take it */ }
}

/** No bet for him when checked to, at the street's first decision when we are first to act. */
export function withoutHisStab(fs, { base, bets }, play, out) {
  if (play.facing || !play.first || play.me !== 0) return;
  try { out.noStab = answer(fs, play, { ...base, betSizes: { oop: bets, ip: [[], ...bets.slice(1)] } }); } catch { /* the tree does not take it */ }
}
