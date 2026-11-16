// A new hand, dealt whole: its spot (one of those in rotation), hero's seat, both hands drawn from the spot's ranges, then the five board cards from what is
// left of the deck.
import * as fs from 'poker-flopsolve';
import { cardsOf, drawCards, drawCombo } from '../../solver/deck.js';

export function dealHand(setup, id) {
  // one of the spots in rotation, where the setup has several
  const spot = setup.spots?.length ? setup.spots[Math.floor(Math.random() * setup.spots.length)] : null;
  const config = spot ? { ...setup, oop: spot.oop, ip: spot.ip, pot: spot.pot, stack: spot.stack } : setup;
  const seat = Math.random() < 0.5 ? 'oop' : 'ip';
  const ranges = { oop: fs.parseRange(config.oop), ip: fs.parseRange(config.ip) };
  const dead = new Set();
  const hero = drawCombo(ranges[seat], dead); cardsOf(hero).forEach((c) => dead.add(c));
  const villain = drawCombo(ranges[seat === 'oop' ? 'ip' : 'oop'], dead); cardsOf(villain).forEach((c) => dead.add(c));
  return { id, seat, hero, villain, board: drawCards(5, dead), flop: null, next: new Map(), config };
}
