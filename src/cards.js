/**
 * Card and combo ids. A card is `rank * 4 + suit` with ranks 2..A = 0..12 and suits c, d, h, s =
 * 0..3 (the same ids postflop-solver uses). A combo is two cards, low id first, numbered 0..1325.
 */

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const NUM_COMBOS = 1326;

export function cardId(card) {
  const rank = RANKS.indexOf(card[0].toUpperCase());
  const suit = SUITS.indexOf(card[1].toLowerCase());
  if (rank < 0 || suit < 0 || card.length !== 2) throw new Error(`not a card: ${card}`);
  return rank * 4 + suit;
}

export function cardName(id) {
  return RANKS[id >> 2] + SUITS[id & 3];
}

/** 'Td9d6h' or ['Td', '9d', '6h'] or card ids -> card ids. */
export function parseCards(cards) {
  if (typeof cards === 'string') cards = cards.replace(/[\s,]/g, '').match(/.{2}/g) ?? [];
  return Array.from(cards, (c) => (typeof c === 'number' ? c : cardId(c)));
}

/** First and second card of every combo. */
export const COMBO_A = new Uint8Array(NUM_COMBOS);
export const COMBO_B = new Uint8Array(NUM_COMBOS);
const INDEX = new Int16Array(52 * 52);
for (let a = 0, i = 0; a < 52; a++) {
  for (let b = a + 1; b < 52; b++, i++) {
    COMBO_A[i] = a;
    COMBO_B[i] = b;
    INDEX[a * 52 + b] = INDEX[b * 52 + a] = i;
  }
}

export function comboId(a, b) {
  if (a === b) throw new Error('a combo needs two different cards');
  return INDEX[a * 52 + b];
}

/** 'AhKd' -> combo id. */
export function parseCombo(hand) {
  return comboId(cardId(hand.slice(0, 2)), cardId(hand.slice(2, 4)));
}

/** Combo id -> 'AhKd', high card first. */
export function comboName(id) {
  return cardName(COMBO_B[id]) + cardName(COMBO_A[id]);
}
