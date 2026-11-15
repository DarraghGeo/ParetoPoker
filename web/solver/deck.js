// Cards and hands as the workers deal them: combinations drawn from ranges, boards from what is left of the deck.
import * as fs from 'poker-flopsolve';

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const cardsOf = (combo) => [fs.COMBO_CARDS[2 * combo], fs.COMBO_CARDS[2 * combo + 1]];
export const text = (cards) => cards.map((c) => fs.formatCard(c)).join(' ');
const blocked = (combo, dead) => cardsOf(combo).some((c) => dead.has(c));

/** One combination drawn by weight from a range, leaving out the dead cards; -1 when none is left. */
export function drawCombo(weights, dead) {
  let total = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (!blocked(c, dead)) total += weights[c];
  let roll = Math.random() * total;
  for (let c = 0; c < fs.COMBOS; c++) {
    if (blocked(c, dead) || !(weights[c] > 0)) continue;
    roll -= weights[c];
    if (roll <= 0) return c;
  }
  return -1;
}

/** `n` cards drawn at random from the deck less the dead ones. */
export function drawCards(n, dead = new Set()) {
  const deck = [];
  for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);
  const out = [];
  while (out.length < n) out.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
  return out;
}

/** A stored range read as the real one on a board: the solver may keep one board for several that mirror it. */
export function onBoard(stored, found, board) {
  const taken = new Set(board); const out = new Array(fs.COMBOS).fill(0);
  for (let c = 0; c < fs.COMBOS; c++) if (!blocked(c, taken)) out[c] = stored[found.combos[c]];
  return out;
}

export const mass = (weights) => weights.reduce((t, w) => t + w, 0);
