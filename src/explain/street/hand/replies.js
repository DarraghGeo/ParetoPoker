// His answers to one of the hand's actions counted one move ahead (`oneMove`): how much of his range gives each, the
// hand's equity against those hands, and what those hands are; and where the hand stands, in words.

export const isFold = (p) => p.kind === 'fold';
export const isCall = (p) => p.kind === 'call' || p.kind === 'check';
export const isPush = (p) => !isFold(p) && !isCall(p);

/** How much of his range answers so. */
export const shareOf = (x, pick) => x.parts.filter(pick).reduce((t, p) => t + p.share, 0);

/** The hand's equity against the hands that answer so. Null when there are none with an equity. */
export function equityAgainst(x, pick) {
  const ps = x.parts.filter((p) => pick(p) && p.equity != null); const w = ps.reduce((t, p) => t + p.share, 0);
  return w > 0 ? ps.reduce((t, p) => t + p.share * p.equity, 0) / w : null;
}

function addGroup(by, g, weight) {
  const k = by.get(g.name) ?? { name: g.name, share: 0, example: g.example, second: g.second, best: 0 };
  k.share += weight; if (weight > k.best) { k.best = weight; k.example = g.example; k.second = g.second; }
  by.set(g.name, k);
}

/** The kinds of hand that answer so, as one list over all those answers, biggest first; each example from where it weighs most. */
export function groupsAmong(x, pick) {
  const by = new Map();
  for (const part of x.parts.filter(pick)) for (const g of part.groups ?? []) addGroup(by, g, part.share * g.share);
  const all = [...by.values()].reduce((t, g) => t + g.share, 0) || 1;
  return [...by.values()].map((g) => ({ ...g, share: g.share / all })).sort((a, b) => b.share - a.share);
}

/** What his folding hands had against this one. */
export const had = (e) => (e < 0.2 ? 'almost nothing' : e < 0.35 ? 'some equity' : e < 0.5 ? 'a good deal of equity' : 'the better of it');
/** Where this hand stands against some of his hands. */
export const stand = (e) => (e >= 0.6 ? 'well ahead' : e >= 0.5 ? 'ahead' : e >= 0.4 ? 'a little behind' : e >= 0.25 ? 'behind' : 'far behind');
/** "ahead of the hands that bet", "behind the hands that bet". */
export const against = (e) => (e >= 0.5 ? `${stand(e)} of` : stand(e));
