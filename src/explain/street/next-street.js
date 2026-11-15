// The street after this one, card by card, as the solution plays it: how often he bets again and whether a hand can call
// that on its price, or how often the hand bets again after its bet is called.
import { cardsOf } from '../../combos.js';
import { equityVs } from '../../solver/flopsolve.js';
import { study } from './study.js';
import { whichCards } from './card-words.js';
import { sharesCard } from './shared-cards.js';
import { isWager } from './words.js';

function studyOn(s, id, card) {
  try { return study(s.fs, s.solution, s.f.nodes, id, [...(s.dealt ?? []), card]); } catch { return null; }
}

/** On the next street's card, the first decision of `player`: at once if he is first to act, else after the other's check. */
function firstChanceOf(s, root, card, player) {
  const st = studyOn(s, root, card); if (!st || st.f.me === player) return st;
  const x = st.f.node.edges.findIndex((e) => e.kind === 'check');
  if (x < 0 || s.f.nodes[st.f.node.edges[x].child].kind !== 'decision') return null;
  return studyOn(s, st.f.node.edges[x].child, card);
}

/** Every card that can come, apart from the board and the hand's own cards. */
function cardsToCome(s, c) {
  const hand = cardsOf(s.fs, c); const out = [];
  for (let card = 0; card < 52; card++) if (!s.f.board.includes(card) && !hand.includes(card)) out.push(card);
  return out;
}

/** His bets at `at`, from the hands that do not share a card with ours: how often, into what, and at what size. */
function hisBets(s, c, at, bets) {
  const { fs, f } = s; const range = new Float64Array(fs.COMBOS); let total = 0, bet = 0, add = 0;
  for (let v = 0; v < fs.COMBOS; v++) {
    const w = at.f.mine[v]; if (!(w > 0) || sharesCard(fs, v, c)) continue; total += w;
    for (const i of bets) {
      const p = at.sigma(v, i); if (!(p > 0)) continue;
      range[v] += w * p; bet += w * p; add += w * p * (f.nodes[at.f.node.edges[i].child].invested[at.f.me] - at.f.node.invested[at.f.me]);
    }
  }
  return { range, total, bet, add };
}

/** On one card: how often he bets, and whether the hand has the price to call it. Null when the card tells nothing. */
function callingOn(s, c, card, root) {
  const at = firstChanceOf(s, root, card, 1 - s.f.me); if (!at) return null;
  const bets = at.f.node.edges.map((e, i) => (e.kind === 'bet' || e.kind === 'allin' ? i : -1)).filter((i) => i >= 0);
  if (!bets.length) return { card, bets: 0, can: true };
  const { range, total, bet, add } = hisBets(s, c, at, bets);
  if (!(total > 0)) return null; const freq = bet / total; if (freq < 0.01) return { card, bets: freq, can: true };
  const mask = new Float64Array(s.fs.COMBOS); mask[c] = 1;
  const size = add / bet; const e = equityVs(s.fs, at.f.board, mask, range)[c]; const price = size / (at.f.node.pot + 2 * size);
  return { card, bets: freq, can: !Number.isNaN(e) && e >= price, equity: e, price };
}

const streetAfter = (f) => (f.board.length === 3 ? 'turn' : 'river');

/**
 * The street after a call (or a check behind), for one hand: on each card that can come, how often he bets, and whether
 * the hand can call that bet on its price. Read from the solution: his range after this line, his strategy on that card.
 */
export function nextStreet(s, c, edgeIndex) {
  const { fs, f } = s; if (!s.solution || f.board.length >= 5) return null;
  const child = f.nodes[f.node.edges[edgeIndex].child]; if (!child || child.kind !== 'chance') return null;
  const cards = cardsToCome(s, c).map((card) => callingOn(s, c, card, child.edges[0].child)).filter(Boolean);
  if (!cards.length) return null;
  const weight = cards.reduce((t, k) => t + k.bets, 0); const bets = weight / cards.length;
  const can = weight > 0 ? cards.reduce((t, k) => t + (k.can ? k.bets : 0), 0) / weight : 1;
  const all = cards.map((k) => k.card); const good = cards.filter((k) => k.can).map((k) => k.card); const bad = cards.filter((k) => !k.can).map((k) => k.card);
  return { bets, can, good: good.length, of: cards.length, named: whichCards(fs, good, bad, all), street: streetAfter(f) };
}

/** On one card, how often the hand bets at its first chance to. Null when it does not get there. */
function barrelOn(s, c, card, root) {
  const at = firstChanceOf(s, root, card, s.f.me); if (!at || !(at.f.mine[c] > 0)) return null;
  let p = 0; at.f.node.edges.forEach((e, i) => { if (isWager(e.kind)) p += at.sigma(c, i); });
  return { card, bets: p };
}

/**
 * After a bet of ours is called: on each card that can come, how often this hand bets again in the solution (at its
 * first chance to: at once when first to act, else after his check).
 */
export function nextBarrel(s, c, edgeIndex) {
  const { fs, f } = s; if (!s.solution || f.board.length >= 5) return null;
  const his = f.nodes[f.node.edges[edgeIndex].child]; if (!his || his.kind !== 'decision') return null;
  const call = his.edges.find((e) => e.kind === 'call'); const chance = call ? f.nodes[call.child] : null; if (!chance || chance.kind !== 'chance') return null;
  const cards = cardsToCome(s, c).map((card) => barrelOn(s, c, card, chance.edges[0].child)).filter(Boolean);
  if (cards.length < 5) return null;
  const all = cards.map((k) => k.card);
  const good = cards.filter((k) => k.bets >= 0.5).map((k) => k.card); const bad = cards.filter((k) => k.bets < 0.5).map((k) => k.card);
  const bets = cards.reduce((t, k) => t + k.bets, 0) / cards.length;
  return { bets, share: good.length / cards.length, good: good.length, of: cards.length, named: whichCards(fs, good, bad, all), street: streetAfter(f) };
}
