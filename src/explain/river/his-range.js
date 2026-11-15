// His hands, by what they do against this hand: "mostly unpaired hands (60%) and one-pair hands (30%)".
import { groupName } from './hand-words.js';
import { pct, shares } from './terms.js';

export const weakerThanYou = (view, his) => his.strength < view.hand.strength;
export const strongerThanYou = (view, his) => his.strength > view.hand.strength;
/** A list of his hands put after a sentence, when there is one. */
export const withList = (text, lead = ', mostly ') => (text ? `${lead}${text}` : '');

/** His weight that does `share` against this hand, by made-hand type (the hands its cards block left out). */
function byCategory(view, share) {
  const by = new Map(); let all = 0;
  for (const his of view.decision.villain) {
    if (his.category == null || (view.hand.cards && shares(view.hand.cards, his.cards))) continue;
    const w = his.weight * share(his);
    if (!(w > 0)) continue;
    all += w; by.set(his.category, (by.get(his.category) ?? 0) + w);
  }
  return { by, all };
}

/** The one or two types that make up most of his hands doing `share`, each with its part. */
export function mostly(view, share) {
  const names = view.decision.categories;
  if (!names) return '';
  const { by, all } = byCategory(view, share);
  if (!(all > 0)) return '';
  const parts = [...by.entries()].map(([c, w]) => ({ group: groupName(names[c]), part: w / all }));
  const list = parts.sort((a, b) => b.part - a.part).filter((x, k) => k < 2 && x.part >= 0.2);
  return list.length ? list.map((x) => `${x.group} (${pct(x.part)})`).join(' and ') : '';
}
