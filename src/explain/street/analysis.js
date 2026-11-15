/**
 * The analytical look at one hand: every hand type in the range with what it does and whether this
 * hand is one of them, and (before the river) how the hand's equity is spread over the cards that
 * can come next, beside the same for the range as a whole.
 */

/** A weighted average over `hands`, leaving out the values that are not numbers. Null when nothing is left. */
function averageOver(hands, weight, value) {
  let w = 0, t = 0; for (const h of hands) if (!Number.isNaN(value[h])) { w += weight[h]; t += weight[h] * value[h]; }
  return w > 0 ? t / w : null;
}

/** On each card that can come: the hand's equity, and the range's, weakest card first. */
function byNextCard(s, c, one, cards) {
  const { fs, f } = s; const hand = []; const range = []; const inRange = [];
  for (let h = 0; h < fs.COMBOS; h++) if (f.mine[h] > 0) inRange.push(h);
  for (const k of cards) {
    if (one && !Number.isNaN(k.eq[c])) hand.push({ card: fs.formatCards([k.card]), eq: k.eq[c] });
    const eq = averageOver(inRange, f.mine, k.eq); if (eq != null) range.push({ card: fs.formatCards([k.card]), eq });
  }
  return { hand: hand.sort((x, y) => x.eq - y.eq), range: range.sort((x, y) => x.eq - y.eq) };
}

/** Equity, and its two parts: what the hand beats as the board stands, and what it wins from behind. */
function equitySpread(s, c, one, b, cards) {
  const { f } = s; const eq = s.equity(); const parts = s.drawParts();
  // the range's own equity now: its hands' equities by weight
  const part = (v) => (parts ? (one ? v[c] : averageOver(b.hands, f.mine, v)) : null);
  const { hand, range } = byNextCard(s, c, one, cards);
  let w = 0, t = 0; for (const h of b.hands) { w += f.mine[h]; t += f.mine[h] * eq[h]; }
  return { hand, range, now: one ? eq[c] : t / w, equityNow: part(parts?.now), drawEquity: part(parts?.draw), street: f.board.length === 3 ? 'turn' : 'river' };
}

/** Every hand's own spread, weakest card first, for drawing small: { combo: [equity on each next card] }. */
function curvesOf(b, cards) {
  const curves = {};
  for (const h of b.hands) {
    const list = []; for (const k of cards) if (!Number.isNaN(k.eq[h])) list.push(Math.round(k.eq[h] * 100) / 100);
    curves[h] = list.sort((x, y) => x - y);
  }
  return curves;
}

export function analysis(s, c) {
  const { fs, f } = s;
  const one = c != null && f.mine[c] > 0;
  const b = s.bands(); const mine = one ? new Set(b.tagsFor[c] ?? []) : new Set();
  // every name some hand in the range carries; with a hand given, `has` marks the ones it carries
  const types = b.tagList.map((k) => ({ name: k.name, share: k.share, equity: k.eq, mix: k.mix, has: mine.has(k.name), ids: k.ids }));
  const cards = s.spread();
  return { name: one ? fs.formatCombo(c) : null, types, spread: cards ? equitySpread(s, c, one, b, cards) : null, curves: cards ? curvesOf(b, cards) : null };
}
