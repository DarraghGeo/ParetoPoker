// Who holds the strong hands: 65% equity or better against the other range.
import { equityVs } from '../../../solver/flopsolve.js';
import { groupsOf, sayGroups } from '../groups.js';
import { percent } from '../words.js';

/** The strong part of a range: its share of the range, and the hands. */
function strongPart(fs, range, e) {
  let t = 0, w = 0; const r = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(range[c] > 0) || Number.isNaN(e[c])) continue;
    w += range[c]; if (e[c] >= 0.65) { t += range[c]; r[c] = range[c]; }
  }
  return { share: w > 0 ? t / w : 0, range: r };
}

/** Your range's equity against his, by weight. */
function rangeEquity(fs, f, e) {
  let t = 0, w = 0; for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0 && !Number.isNaN(e[c])) { t += f.mine[c] * e[c]; w += f.mine[c]; }
  return w > 0 ? t / w : 0.5;
}

/** Both ranges' strong hands, and how far your range is ahead. */
export function strongHands(s) {
  const { fs, f } = s; const eMine = s.equity(); const eHis = equityVs(fs, f.board, f.his, f.mine);
  return { mine: strongPart(fs, f.mine, eMine), his: strongPart(fs, f.his, eHis), ahead: rangeEquity(fs, f, eMine) };
}

function strengthText(fs, board, { mine, his, ahead }) {
  const d = mine.share - his.share; const g1 = groupsOf(fs, board, mine.range); const g2 = groupsOf(fs, board, his.range);
  if (d >= 0.07) return `You hold more of the strong hands: ${g1.length ? sayGroups(g1) : 'the best of them'}. He has fewer.`;
  if (d <= -0.07) return `He holds more of the strong hands here: ${g2.length ? sayGroups(g2) : 'the best of them'}.`;
  const overall = ahead >= 0.54 ? ', though your range is ahead overall' : ahead <= 0.46 ? ', though his range is ahead overall' : '';
  return `Neither of you holds clearly more of the strong hands${overall}.`;
}

export function strengthReason(fs, board, strong) {
  const { mine, his, ahead } = strong;
  const detail = `Hands with 65% equity or more: ${percent(mine.share)} of your range, ${percent(his.share)} of his. Your range has ${percent(ahead)} equity.`;
  return { id: 'strong', text: strengthText(fs, board, strong), detail };
}
