const OUT = 'Out of position';
const IN = 'In position';
const pts = (x) => `${Math.abs(Math.round(100 * x))} points`;
const pct = (x) => `${Math.round(100 * (x ?? 0))}%`;
const who = (x) => (x >= 0 ? OUT : IN);

/** Who has more equity, who holds more of the strongest hands, each range's shape, and which is capped. */
function sentencesOf({ advantage, hero, villain }) {
  const parts = [];
  const same = Math.abs(advantage.range) < 0.01;
  parts.push(same ? 'The two ranges have the same equity.' : `${who(advantage.range)} has more equity, by ${pts(advantage.range)}.`);
  if (advantage.nut != null && Math.abs(advantage.nut) >= 0.02) {
    const [more, less] = advantage.nut >= 0 ? [hero, villain] : [villain, hero];
    parts.push(`${who(advantage.nut)} holds more of the strongest hands: ${pct(more.nuts.share)} of its range against ${pct(less.nuts.share)}.`);
  }
  const shape = (side, name) => (side.shape?.dominant ? `${name}'s range is ${side.shape.dominant}` : null);
  const shapes = [shape(hero, OUT), shape(villain, IN)].filter(Boolean);
  if (shapes.length) parts.push(`${shapes.join('; ')}.`);
  const capped = (side, name) => ((side.capped?.relative ?? 0) >= 0.4 ? `${name} is capped: it is missing much of the top of what it could hold.` : null);
  for (const text of [capped(hero, OUT), capped(villain, IN)]) if (text) parts.push(text);
  return parts;
}

/** The shape that scores highest; when rangeman calls none of them dominant it is marked as mixed. */
function shapeOf(sh) {
  if (!sh) return 'mixed';
  const best = ['polarized', 'linear', 'condensed'].reduce((b, k) => ((sh[k] ?? 0) > (sh[b] ?? 0) ? k : b), 'polarized');
  return sh.dominant ?? `${best} (mixed)`;
}

/** The same comparison as rows, for the page's range view: [label, out of position, in position]. */
function factsOf(hero, villain) {
  return [
    ['Hands', `${Math.round(hero.weight)}`, `${Math.round(villain.weight)}`],
    ['Equity', pct(hero.equity), pct(villain.equity)],
    ['Strong (75%+)', pct(hero.buckets?.strong?.share), pct(villain.buckets?.strong?.share)],
    ['Good (50-75%)', pct(hero.buckets?.good?.share), pct(villain.buckets?.good?.share)],
    ['Weak (33-50%)', pct(hero.buckets?.weak?.share), pct(villain.buckets?.weak?.share)],
    ['Trash (under 33%)', pct(hero.buckets?.trash?.share), pct(villain.buckets?.trash?.share)],
    ['Nut hands', pct(hero.nuts?.share), pct(villain.nuts?.share)],
    ['Shape', shapeOf(hero.shape), shapeOf(villain.shape)],
    ['Capped', pct(hero.capped?.relative), pct(villain.capped?.relative)],
  ];
}

// Only the equity sentence is put on the page: it is checked against an exact count (research/proof/profile.mjs).
// The rest are poker-rangeman's own measures and labels, kept here as `detail` until their definitions are checked too.
function profileOf(report) {
  const { advantage, hero, villain } = report;
  if (advantage.range == null) return null;
  const sentences = sentencesOf(report);
  return {
    text: sentences[0], detail: sentences.join(' '), sentences, facts: factsOf(hero, villain),
    advantage: { range: advantage.range, nut: advantage.nut, polarization: advantage.polarization },
    shapes: { oop: hero.shape?.dominant ?? null, ip: villain.shape?.dominant ?? null },
    capped: { oop: hero.capped?.relative ?? 0, ip: villain.capped?.relative ?? 0 },
  };
}

/**
 * The spot in a sentence, from poker-rangeman's comparison of the two ranges on the board:
 * who has more equity, who holds more of the strongest hands, and each range's shape.
 *
 * @param {typeof import('poker-rangeman').RangeManager} RangeManager
 * @param {{ oop: string, ip: string, board: string[] }} spot Ranges in notation, board as card names.
 * @returns {Promise<{ text: string, advantage: { range: number, nut: number, polarization: number },
 *   shapes: { oop: string|null, ip: string|null }, capped: { oop: number, ip: number } } | null>}
 */
export async function profile(RangeManager, { oop, ip, board }) {
  try {
    return profileOf(await new RangeManager(oop).against(ip, board).compare());
  } catch {
    return null;
  }
}
