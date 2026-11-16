// The player's rules for a decision after the flop (research/STRATEGY.md, with the thresholds found in research/rules):
// which rule applies, what it says to do with the hand, and why. A rule reads only what a player can work out at the
// table: the street, the seat, who raised before the flop, the price of a call, the hand's equity against his range,
// whether it has a draw, and a few shares of the two ranges. Each rule has a name, so that how often it agrees with the
// solver can be counted rule by rule.

/** Each rule in a sentence. */
export const RULES = {
  'flop-ip': 'On the flop in position, bet a third of the pot with your whole range.',
  'flop-oop-raiser': 'On the flop out of position as the preflop raiser, bet a third of the pot with your whole range.',
  'flop-oop': 'On the flop out of position, check. With range advantage (your share of top pair or better at least a point above his), bet a third with 70% equity or a draw.',
  'turn-ip': 'On the turn in position, bet a third with 50% equity or a draw, and check the rest.',
  'turn-oop': 'On the turn out of position, check. With range advantage, bet a third with 50% equity or a draw.',
  'river-ip': 'On the river in position, bet with 80% equity, bluff your weakest hands when he has weak hands to fold, and check the rest.',
  'river-oop': 'On the river out of position, check everything when a fifth or more of his range is strong. Otherwise bet with 80% equity and bluff your weakest hands.',
  'face-flop-ip': 'Facing a flop bet in position, continue with the price of the call and 5 points more.',
  'face-flop-oop': 'Facing a flop bet out of position, continue with the price of the call and 15 points more.',
  'face-turn-ip': 'Facing a turn bet in position, continue with the price of the call.',
  'face-turn-oop': 'Facing a turn bet out of position, continue with the price and 10 points more (15 against more than half the pot).',
  'face-river': 'Facing a river bet, call with the price; raise with 75% against his betting range (80% against more than the pot).',
  'face-raise': 'Facing a raise, continue with the price and 5 points more (the price alone on the river).',
};

const pct = (x) => `${Math.round(100 * x)}%`;
const STREET = ['flop', 'turn', 'river'];
const strength = (c) => `${pct(c.equity)} equity${c.draw ? ' and a draw' : ''}`;

/** First to act before the river, where the rule bets a hand that clears `bar` or has a draw. */
function betOrCheck(id, c, bar) {
  const bets = c.equity >= bar || c.draw;
  return { id, says: bets ? 'bet' : 'check', why: `this hand has ${strength(c)}; the rule bets with ${pct(bar)} or a draw` };
}

/** Out of position before the river: a check, unless the range is ahead in top pair or better. */
function outOfPosition(id, c, bar) {
  const { mine, his } = c.topPair(); const ahead = mine >= his + 0.01;
  const shares = `top pair or better is ${pct(mine)} of your range and ${pct(his)} of his`;
  if (!ahead) return { id, says: 'check', why: `${shares}, so there is no range advantage` };
  const bets = c.equity >= bar || c.draw;
  return { id, says: bets ? 'bet' : 'check', why: `${shares}, a range advantage; this hand has ${strength(c)} against the ${pct(bar)} it needs` };
}

/** The river, first to act: value from 80%, bluffs from the bottom where he has weak hands to fold. */
function river(id, c) {
  const { strong, weak } = c.hisShape();
  if (!c.ip && strong >= 0.2) return { id, says: 'check', why: `${pct(strong)} of his range is strong (80% or more against yours), a fifth or more` };
  const under = weak - (c.ip ? 0.2 : 0.25);
  if (c.equity >= 0.8) return { id, says: 'bet', why: `this hand beats ${pct(c.equity)} of his range, a value bet` };
  if (c.equity < under) return { id, says: 'bet', why: `this hand beats ${pct(c.equity)} of his range and ${pct(weak)} of his range is weak: it is among the hands that bluff` };
  return { id, says: 'check', why: `this hand beats ${pct(c.equity)} of his range: too weak for value, too strong to bluff` };
}

/** Facing a bet or raise: the hand's equity against the price of the call and the margin its seat and street ask for. */
function facing(c) {
  const price = c.toCall / (c.pot + c.toCall); const big = c.toCall / (c.pot - c.toCall);
  const riverRaise = c.street === 2 && !c.raised && c.equity >= (big > 1 ? 0.8 : 0.75);
  const id = c.raised ? 'face-raise' : c.street === 2 ? 'face-river' : `face-${STREET[c.street]}-${c.ip ? 'ip' : 'oop'}`;
  const margin = c.raised ? (c.street === 2 ? 0 : 0.05) : c.street === 2 ? 0 : c.street === 0 ? (c.ip ? 0.05 : 0.15) : c.ip ? 0 : big > 0.5 ? 0.15 : 0.1;
  const needs = price + margin; const says = riverRaise ? 'raise' : c.equity >= needs ? (c.street === 2 ? 'call' : 'continue') : 'fold';
  const bar = margin ? `${pct(price)} for the price and ${Math.round(100 * margin)} more, ${pct(needs)}` : `${pct(price)}, the price`;
  return { id, says, why: riverRaise ? `this hand beats ${pct(c.equity)} of what he bets, enough to raise` : `this hand has ${pct(c.equity)} against what he bets; it needs ${bar}` };
}

/**
 * The rule for a decision and what it says.
 * @param {{ street: 0|1|2, ip: boolean, toCall: number, pot: number, raised: boolean, raiser: 'oop'|'ip'|null,
 *   equity: number, draw: boolean, topPair: () => { mine: number, his: number }, hisShape: () => { strong: number, weak: number } }} c
 *   `pot` with every bet in it; `raised`: hero faces a raise of his own bet; the two shares are asked for only where a rule reads them.
 * @returns {{ id: string, says: 'bet'|'check'|'call'|'continue'|'raise'|'fold', why: string }}
 */
export function ruleFor(c) {
  if (c.toCall > 0) return facing(c);
  if (c.street === 2) return river(c.ip ? 'river-ip' : 'river-oop', c);
  if (c.street === 1) return c.ip ? betOrCheck('turn-ip', c, 0.5) : outOfPosition('turn-oop', c, 0.5);
  if (c.ip) return { id: 'flop-ip', says: 'bet', why: 'the rule bets every hand' };
  if (c.raiser === 'oop') return { id: 'flop-oop-raiser', says: 'bet', why: 'you raised before the flop; the rule bets every hand' };
  return outOfPosition('flop-oop', c, 0.7);
}

/** Whether an action of a kind is what a rule says: a bet or raise counts as going on where the rule says to continue. */
export function follows(says, kind, facingBet) {
  const wager = !['check', 'call', 'fold'].includes(kind);
  if (says === 'continue') return kind === 'call' || wager;
  if (says === 'bet' || says === 'raise') return wager;
  return kind === says && !(facingBet && says === 'check');
}
