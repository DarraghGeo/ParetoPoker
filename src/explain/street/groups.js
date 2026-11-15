// A range as a coach would describe it: its kinds of hand, biggest first, each with the hands that are most of it.
import { features } from '../features.js';
import { cardsOf } from '../../combos.js';
import { coachKind, pretty } from './hand-words.js';
import { listOf } from './words.js';

/** A hand of this weight joins its group: the two heaviest hands are its examples. */
function join(group, v, w) {
  group.weight += w;
  if (w > group.topW) { group.nextW = group.topW; group.next = group.top; group.topW = w; group.top = v; }
  else if (w > group.nextW) { group.nextW = w; group.next = v; }
}

/** A range as a coach would describe it: its kinds of hand, biggest first, each with the hand that is most of it. `skip`: cards that cannot be in it. */
export function groupsOf(fs, board, range, skip = []) {
  const by = new Map(); let all = 0;
  const out = (card) => skip.includes(card) || board.includes(card);
  for (let v = 0; v < fs.COMBOS; v++) {
    const w = range[v]; if (!(w > 1e-9)) continue; const [a, b] = cardsOf(fs, v); if (out(a) || out(b)) continue;
    const name = coachKind(fs, board, v, features(fs, board, v));
    if (!by.has(name)) by.set(name, { name, weight: 0, top: -1, topW: 0, next: -1, nextW: 0 });
    join(by.get(name), v, w); all += w;
  }
  return [...by.values()].sort((x, y) => y.weight - x.weight)
    .map((g) => ({ name: g.name, share: all > 0 ? g.weight / all : 0, example: pretty(fs.formatCombo(g.top)),
      second: g.next >= 0 ? pretty(fs.formatCombo(g.next)) : null }));
}

/** "top pair (K♥Q♥) and flush draws (J♠T♠)": the main kinds of a range, each with its example. `seen`: examples already given. */
export function sayGroups(groups, n = 2, floor = 0.12, seen = null) {
  const shown = groups.filter((x, i) => i === 0 || x.share >= floor).slice(0, n);
  return listOf(shown.map((x) => {
    const example = seen && seen.has(x.example) && x.second && !seen.has(x.second) ? x.second : x.example;
    if (seen) seen.add(example);
    return `${x.name} (${example})`;
  }));
}
