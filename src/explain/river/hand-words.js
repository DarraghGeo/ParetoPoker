// The words for a hand: what it is ("a pair", "king high"), and where it stands among the hands held here.
import { weightOf } from '../rows.js';

const RANK_WORD = {
  A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: 'ten', 9: 'nine', 8: 'eight', 7: 'seven', 6: 'six', 5: 'five', 4: 'four', 3: 'three', 2: 'two',
};
const ORDER = 'AKQJT98765432';
/** His hands of a made-hand type, as a group. */
const GROUP = {
  'high card': 'unpaired hands', pair: 'one-pair hands', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'straights',
  flush: 'flushes', 'full house': 'full houses', 'four of a kind': 'quads', 'straight flush': 'straight flushes',
};
/** One hand of a made-hand type. */
const ONE = {
  pair: 'a pair', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'a straight', flush: 'a flush',
  'full house': 'a full house', 'four of a kind': 'quads', 'straight flush': 'a straight flush',
};

/** A made-hand type named as a group of his hands. */
export const groupName = (category) => GROUP[String(category).toLowerCase()] ?? String(category).toLowerCase();

/** The higher of a hand name's two ranks ("AdKd" gives "A"), or null for a name that is not two cards. */
function topRank(name) {
  if (typeof name !== 'string' || !ORDER.includes(name[0]) || !ORDER.includes(name[2])) return null;
  return ORDER.indexOf(name[0]) < ORDER.indexOf(name[2]) ? name[0] : name[2];
}

/** The hand in a word or two: "a pair", "king high", or "this hand" when its type is unknown. */
export function whatOf(decision, hand, name) {
  const names = decision.categories;
  const kind = names && hand.category != null ? String(names[hand.category]).toLowerCase() : null;
  const top = topRank(name);
  if (kind === 'high card' && top) return `${RANK_WORD[top]} high`;
  return kind ? ONE[kind] ?? kind : 'this hand';
}

/** Where the hand stands among the hands you hold here, by the weight weaker and stronger than it. */
export function standingOf(rows, hand) {
  const total = weightOf(rows);
  let weaker = 0; let stronger = 0;
  for (const r of rows) {
    if (r.hand.strength < hand.strength) weaker += r.hand.weight;
    else if (r.hand.strength > hand.strength) stronger += r.hand.weight;
  }
  weaker /= total; stronger /= total;
  if (weaker < 0.1) return 'one of the weakest hands you get here with';
  if (stronger < 0.1) return 'one of the strongest hands you get here with';
  if (weaker < 0.35) return 'in the lower part of your range';
  if (stronger < 0.35) return 'in the upper part of your range';
  return 'in the middle of your range';
}
