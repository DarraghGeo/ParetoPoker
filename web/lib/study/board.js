// The board on screen changed: a card of the spot's own board swapped (a new spot), the turn or river added or taken off,
// or a card dealt along the line changed (the same solve).
import { randomCards } from '../cards.js';
import { begin, clearHand, go, solve } from './solving.js';
import { START, boardCards, conf, remember, version } from './versions.svelte.js';

export const roundOf = (game) => game.nodes?.[game.node]?.round ?? 0;
export const ownBoard = (game) => boardCards(conf(game).board);
/** The board as shown: the spot's own cards and those dealt along the line to the decision on screen. */
export const shownBoard = (game) => [...ownBoard(game), ...game.dealt.slice(0, roundOf(game))];

/** The spot's own board changes: a new spot, solved again (a re-solved street's version keeps its place in the list). */
export function setBoard(game, own) {
  const v = version(game); clearHand(game);
  if (v.base) { game.versions = game.versions.with(game.at, { ...v, base: { ...v.base, board: own.join(' ') }, id: ++game.versionId, pos: START() }); solve(game); return; }
  game.config.board = own.join(' '); remember(game); game.node = 0;
  begin(game);
}

function dealCard(game, round, card) {
  const dealt = [...game.dealt]; dealt[round] = card;
  game.dealt = dealt; clearHand(game); go(game, game.node);
}

/** A card put at board place `i` (`adding`: the next card of the spot's own board). */
export function placeCard(game, i, adding, card) {
  const own = ownBoard(game);
  if (adding) { setBoard(game, [...own, card]); return; }
  if (i >= own.length) { dealCard(game, i - own.length, card); return; }
  own[i] = card; setBoard(game, own);
}

/** The street the card at place `i` belongs to, dealt at random: all three cards of a flop, or the one turn or river card. */
export function placeRandom(game, i, adding) {
  const all = shownBoard(game);
  if (i < 3) { setBoard(game, [...randomCards(3, new Set(all.slice(3))), ...ownBoard(game).slice(3)]); return; }
  const [card] = randomCards(1, new Set(all)); if (card) placeCard(game, i, adding, card);
}

/** The card dealt at a deal (a chance node) on the way to the next street's first decision. */
export function dealAt(game, card) {
  const chance = game.nodes[game.pick];
  game.dealt = [...game.dealt.slice(0, chance.round), card]; clearHand(game);
  go(game, chance.edges[0].child);
}
/** The cards out of the deck at a deal: the spot's own board and those dealt before it. */
export const goneAt = (game, chance) => new Set([...ownBoard(game), ...game.dealt.slice(0, chance.round)]);
export function dealRandom(game) { const [card] = randomCards(1, goneAt(game, game.nodes[game.pick])); if (card) dealAt(game, card); }
