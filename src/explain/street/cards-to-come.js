// A hand's equity and the cards still to come: how much of it is won from behind, and how it spreads over the next card.
import { cardsOf, holds } from '../../combos.js';
import { equityVs } from '../../solver/flopsolve.js';
import { sharesCard } from './shared-cards.js';

const score = (mine, his) => (mine > his ? 1 : mine === his ? 0.5 : 0);

/** How much of his range each hand beats as the board stands. */
function beatsNow(fs, f, heroes, villains, strength) {
  const now = new Float64Array(fs.COMBOS).fill(NaN);
  for (const h of heroes) {
    let w = 0, t = 0;
    for (const v of villains) { if (sharesCard(fs, h, v)) continue; w += f.his[v]; t += f.his[v] * score(strength[h], strength[v]); }
    if (w > 0) now[h] = t / w;
  }
  return now;
}

/** One board the cards to come make (`y` < 0: one card to come): each hand's weight against his, and what it wins from behind. */
function deal(k, x, y) {
  const { fs, f, current, strength } = k; const full = y < 0 ? [...f.board, x] : [...f.board, x, y];
  const out = (c) => holds(fs, c, x) || holds(fs, c, y); const hs = k.heroes.filter((c) => !out(c)); const vs = k.villains.filter((c) => !out(c));
  for (const c of new Set([...hs, ...vs])) strength[c] = fs.evaluateCards([...full, ...cardsOf(fs, c)]);
  for (const h of hs) {
    for (const v of vs) {
      if (sharesCard(fs, h, v)) continue;
      k.mass[h] += f.his[v]; if (current[v] > current[h]) k.won[h] += f.his[v] * score(strength[h], strength[v]);
    }
  }
}

/** Over the boards the cards to come can make: of his hands that beat each hand now, how much it wins against. */
function wonFromBehind(fs, f, heroes, villains, current) {
  const k = { fs, f, heroes, villains, current, strength: new Float64Array(fs.COMBOS), won: new Float64Array(fs.COMBOS), mass: new Float64Array(fs.COMBOS) };
  const deck = []; for (let x = 0; x < 52; x++) if (!f.taken[x]) deck.push(x);
  if (f.board.length === 4) for (const x of deck) deal(k, x, -1);
  else for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) deal(k, deck[i], deck[j]);
  const draw = new Float64Array(fs.COMBOS).fill(NaN);
  for (const h of heroes) if (k.mass[h] > 0) draw[h] = k.won[h] / k.mass[h];
  return draw;
}

/**
 * A hand's equity in two parts. `now`: how much of his range it beats as the board stands. `draw`: the part of its equity
 * that it wins from behind, against hands that beat it now, on the cards still to come. Null on the river.
 */
export function drawParts(fs, f) {
  if (f.board.length === 5) return null;
  const heroes = []; const villains = []; for (let c = 0; c < fs.COMBOS; c++) { if (f.mine[c] > 0) heroes.push(c); if (f.his[c] > 0) villains.push(c); }
  const current = new Float64Array(fs.COMBOS);
  for (const c of new Set([...heroes, ...villains])) current[c] = fs.evaluateCards([...f.board, ...cardsOf(fs, c)]);
  return { now: beatsNow(fs, f, heroes, villains, current), draw: wonFromBehind(fs, f, heroes, villains, current) };
}

/** Every card that can come next, and each hand's equity once it has: how a hand's strength is spread over the next street. */
export function nextCards(fs, f) {
  if (f.board.length === 5) return null;
  const cards = [];
  for (let x = 0; x < 52; x++) {
    if (f.taken[x]) continue;
    const mine = Float64Array.from(f.mine); const his = Float64Array.from(f.his);
    for (let c = 0; c < fs.COMBOS; c++) if (holds(fs, c, x)) { mine[c] = 0; his[c] = 0; }
    cards.push({ card: x, eq: equityVs(fs, [...f.board, x], mine, his) });
  }
  return cards;
}
