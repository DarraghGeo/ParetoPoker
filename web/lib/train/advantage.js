// Why a range has the advantage, said as what each range has made: who has more top pair or better (the flop and turn),
// two pair or better (the river), or pairs of any kind (the low boards where top pair is scarce).
import { pct } from '../cards.js';
import { counts, mostOf } from './made.js';

const RULE = {
  flop: 'On the flop, count who has more top pair or better, as a share of the range.',
  turn: 'On the turn, the same count, then lean towards whoever has been betting.',
  river: 'On the river the bar rises to two pair or better, and whoever bet usually has it.',
};
const NAME = ['Hero', 'Villain'];
const LABEL = { top: 'Top pair or better', big: 'Two pair or better', pair: 'Any pair or better' };

/** The count that decides it: the one that points at the range ahead, tried in the street's order. */
function deciding(a, b, ahead, street) {
  const order = street === 'river' ? ['big', 'top', 'pair'] : ['top', 'pair', 'big'];
  return order.find((k) => (a[k] - b[k]) * ahead > 0.02) ?? null;
}

/** One count as a sentence: who has more of it, and the hands it mostly is. */
function said(key, spot, board, a, b, w) {
  const level = { top: 1, big: 2, pair: 0.5 }[key]; const hands = mostOf(w === 0 ? spot.hero : spot.villain, board, level);
  const first = `${NAME[w]} has more ${LABEL[key].toLowerCase()}: ${pct([a, b][w][key])}% of the range against ${pct([a, b][1 - w][key])}%${hands.length ? ` (mostly ${hands.join(', ')})` : ''}.`;
  return key === 'pair' ? `${first} Top pair is scarce on this board, so pairs of any kind decide it.` : first;
}

/**
 * The counts behind a range-advantage answer: the lines to say and the bars to draw. `right`: 0 hero, 1 villain, 2 neither.
 */
export function advantageWhy(spot, right) {
  const d = spot.decision; const board = d.boardText; const a = counts(spot.hero, board); const b = counts(spot.villain, board);
  const key = right === 2 ? null : deciding(a, b, right === 0 ? 1 : -1, d.street);
  const keys = d.street === 'river' ? ['top', 'big', 'pair'] : ['top', 'pair'];
  const bars = keys.map((k) => ({ title: LABEL[k], rows: [['Hero', a[k]], ['Villain', b[k]]], decides: k === key }));
  const line = right === 2 ? 'Neither range has made clearly more than the other on this board.' : key ? said(key, spot, board, a, b, right)
    : `${NAME[right]} is ahead without having made more: its unmade hands are the stronger ones.`;
  return { lines: [line, RULE[d.street]], bars };
}
