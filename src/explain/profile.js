/**
 * The spot in a sentence, from poker-rangeman's comparison of the two ranges on the board:
 * who has more equity, who holds more of the strongest hands, and each range's shape.
 *
 * @param {typeof import('poker-rangeman').RangeManager} RangeManager
 * @param {{ oop: string, ip: string, board: string[] }} spot Ranges in notation, board as card names.
 * @returns {Promise<{ text: string, advantage: { range: number, nut: number, polarization: number }, shapes: { oop: string|null, ip: string|null }, capped: { oop: number, ip: number } } | null>}
 */
export async function profile(RangeManager, { oop, ip, board }) {
  try {
    const report = await new RangeManager(oop).against(ip, board).compare();
    const { advantage, hero, villain } = report;
    if (advantage.range == null) return null;
    const pts = (x) => `${Math.abs(Math.round(100 * x))} points`;
    const pct = (x) => `${Math.round(100 * (x ?? 0))}%`;
    const who = (x) => (x >= 0 ? 'Out of position' : 'In position');
    const parts = [];
    parts.push(Math.abs(advantage.range) < 0.01 ? 'The two ranges have the same equity.' : `${who(advantage.range)} has more equity, by ${pts(advantage.range)}.`);
    if (advantage.nut != null && Math.abs(advantage.nut) >= 0.02) parts.push(`${who(advantage.nut)} holds more of the strongest hands: ${pct(advantage.nut >= 0 ? hero.nuts.share : villain.nuts.share)} of its range against ${pct(advantage.nut >= 0 ? villain.nuts.share : hero.nuts.share)}.`);
    const shape = (side, name) => (side.shape?.dominant ? `${name}'s range is ${side.shape.dominant}` : null);
    const shapes = [shape(hero, 'Out of position'), shape(villain, 'In position')].filter(Boolean);
    if (shapes.length) parts.push(`${shapes.join('; ')}.`);
    const capped = (side, name) => ((side.capped?.relative ?? 0) >= 0.4 ? `${name} is capped: it is missing much of the top of what it could hold.` : null);
    for (const text of [capped(hero, 'Out of position'), capped(villain, 'In position')]) if (text) parts.push(text);
    // Only the equity sentence is put on the page: it is checked against an exact count (research/proof/profile.mjs).
    // The rest are poker-rangeman's own measures and labels, kept here as `detail` until their definitions are checked too.
    return { text: parts[0], detail: parts.join(' '), advantage: { range: advantage.range, nut: advantage.nut, polarization: advantage.polarization }, shapes: { oop: hero.shape?.dominant ?? null, ip: villain.shape?.dominant ?? null }, capped: { oop: hero.capped?.relative ?? 0, ip: villain.capped?.relative ?? 0 } };
  } catch {
    return null;
  }
}
