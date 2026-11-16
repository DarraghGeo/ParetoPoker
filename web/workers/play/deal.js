// (`given`: a spot and a flop already solved, for a hand dealt onto them.)
// A new hand, dealt whole: its spot (one of those in rotation), hero's seat, both hands drawn from the spot's ranges, then the five board cards from what is
// left of the deck.
import * as fs from 'poker-flopsolve';
import { cardsOf, drawCards, drawCombo } from '../../solver/deck.js';

export function dealHand(setup, id, given = null) {
  // one of the spots in rotation, where the setup has several
  const spot = given?.spot ?? (setup.spots?.length ? setup.spots[Math.floor(Math.random() * setup.spots.length)] : null);
  const config = spot ? { ...setup, oop: spot.oop, ip: spot.ip, pot: spot.pot, stack: spot.stack, raiser: spot.raiser ?? null } : setup;
  const seat = Math.random() < 0.5 ? 'oop' : 'ip';
  const ranges = { oop: fs.parseRange(config.oop), ip: fs.parseRange(config.ip) };
  const dead = new Set(given?.flop ?? []);
  const hero = drawCombo(ranges[seat], dead); cardsOf(hero).forEach((c) => dead.add(c));
  const villain = drawCombo(ranges[seat === 'oop' ? 'ip' : 'oop'], dead); cardsOf(villain).forEach((c) => dead.add(c));
  const board = given ? [...given.flop, ...drawCards(2, dead)] : drawCards(5, dead);
  return { id, seat, hero, villain, board, flop: null, next: new Map(), config, weight: ranges[seat][hero] };   // `weight`: how much of the starting range hero's hand is
}
