// Train's questions on a decision: who has the range advantage, who has the nut advantage, the biggest bet or raise the
// range takes, and what a given hand can do. A question whose answer is too close to call is not asked.
import { explain } from '../../../src/explain/river.js';
import { pct } from '../cards.js';
import { NUTS } from './spot.js';

const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
/** How often a hand has to take an action for it to count as one it takes; under LOW it does not. Hands between are not asked about. */
const TAKES = 0.16; const LOW = 0.04;
/** A made-hand type as a group of hands. */
const GROUP = { 'high card': 'unpaired hands', pair: 'one-pair hands', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'straights', flush: 'flushes', 'full house': 'full houses', 'four of a kind': 'quads', 'straight flush': 'straight flushes' };
/** How many times a hand is asked about on one position, each time round the board: earlier streets cost more to solve. */
const HANDS = { river: 1, turn: 2, flop: 2 };
const share = (x) => (x > 0 && x < 0.095 ? (100 * x).toFixed(1) : pct(x));
const SIDES = [{ label: 'Hero' }, { label: 'Villain' }, { label: 'Neither' }];
/** Hero, villain or neither, by a difference: too small is neither, and one that could be read either way is not asked. */
const whose = (diff, small, clear) => (Math.abs(diff) < small ? 2 : Math.abs(diff) >= clear ? (diff > 0 ? 0 : 1) : null);
/** A mix of actions said in words: "B33 40%, X 60%". */
const mixText = (actions, mix) => actions.map((a, k) => (mix[k] > 0.004 ? `${a.label} ${pct(mix[k])}%` : '')).filter(Boolean).join(', ');

function rangeQuestion(spot) {
  const right = whose(spot.mine.equity - spot.his.equity, 0.02, 0.04);
  if (right == null) return null;
  return { text: 'Who has the range advantage?', options: SIDES, right: [right], why: [`Hero's range has ${pct(spot.mine.equity)}% equity, villain's ${pct(spot.his.equity)}%.${right === 2 ? ' Under two points apart is neither\'s.' : ''}`] };
}

function nutsQuestion(spot) {
  const right = whose(spot.mine.nuts - spot.his.nuts, 0.01, 0.025);
  if (right == null) return null;
  return { text: 'Who has the nut advantage?', options: SIDES, right: [right], why: [`Hands with ${pct(NUTS)}% equity or more are ${share(spot.mine.nuts)}% of hero's range and ${share(spot.his.nuts)}% of villain's.${right === 2 ? ' Under one point apart is neither\'s.' : ''}`] };
}

/** The bets and raises offered, smallest first. */
const sizedActions = (d) => d.actions.map((a, k) => k).filter((k) => AGGRESSIVE.has(d.actions[k].kind)).sort((a, b) => d.actions[a].add - d.actions[b].add);

/** What the biggest size the range takes is made of, on the river: its two main kinds of hand and its share of bluffs. */
function topSizeWhy(spot, top) {
  const { decision: d, s } = spot; const by = new Map(); let all = 0;
  for (const { hand } of s.rows) { const w = hand.weight * hand.strategy[top]; if (w > 0) { all += w; by.set(hand.category, (by.get(hand.category) ?? 0) + w); } }
  const groups = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, w]) => w / all >= 0.15)
    .map(([c, w]) => { const name = String(d.categories[c]).toLowerCase(); return `${GROUP[name] ?? name} (${pct(w / all)}%)`; });
  return `${d.actions[top].label} is taken ${groups.length ? `mostly by ${groups.join(' and ')}` : 'by many kinds of hand'}; ${pct(s.sizes[top].bluffShare)}% of it is bluffs, where the size allows about ${pct(s.sizes[top].wanted)}%.`;
}

function sizeQuestion(spot) {
  const { decision: d, s } = spot; const sized = sizedActions(d);
  if (!sized.length) return null;
  const used = sized.filter((k) => s.mix[k] >= LOW); const top = used.length ? used[used.length - 1] : -1;
  // a bigger size the range takes now and then: neither used nor unused
  if (sized.some((k) => s.mix[k] > 0.015 && s.mix[k] < LOW && (top < 0 || d.actions[k].add > d.actions[top].add))) return null;
  const verb = s.facing ? 'raise' : 'bet';
  const why = [`Across your range: ${mixText(d.actions, s.mix)}.`, ...(top >= 0 && d.street === 'river' ? [topSizeWhy(spot, top)] : []), `Nut hands are ${share(spot.mine.nuts)}% of your range and ${share(spot.his.nuts)}% of his.`];
  return { text: `What's your maximum ${verb} size?`, options: [{ label: `No ${verb}` }, ...sized.map((k) => ({ label: d.actions[k].label, action: k }))], right: [top < 0 ? 0 : 1 + sized.indexOf(top)], why };
}

/** A hand to ask about: one with a clear strategy not asked yet, half the time one with a choice to make. */
function pickHand(spot) {
  const clear = spot.s.rows.filter((r) => r.hand.weight >= 0.25 && !spot.seen.has(r.hand.name) && r.hand.strategy.every((p) => p <= LOW || p >= TAKES));
  if (!clear.length) return null;
  const mixed = clear.filter((r) => r.hand.strategy.filter((p) => p >= TAKES).length > 1);
  const pool = mixed.length && Math.random() < 0.5 ? mixed : clear;
  let roll = Math.random() * pool.reduce((t, r) => t + r.hand.weight, 0);
  return (pool.find((r) => (roll -= r.hand.weight) <= 0) ?? pool[pool.length - 1]).hand;
}

function handQuestion(spot) {
  const { decision: d, s } = spot; if (d.actions.length < 2) return null;
  const hand = pickHand(spot); if (!hand) return null;
  spot.seen.add(hand.name);
  const told = d.street === 'river' ? explain(s, hand.name) : null;
  const why = [`It plays ${mixText(d.actions, hand.strategy)}.`, ...(told ? [told.line, ...told.reasons.map((r) => r.text)].filter(Boolean) : [])];
  return { text: 'What actions can it take?', hand: hand.name, multi: true, options: d.actions.map((a, k) => ({ label: a.label, action: k })), right: d.actions.map((a, k) => k).filter((k) => hand.strategy[k] >= TAKES), why };
}

const BUILD = { range: rangeQuestion, nuts: nutsQuestion, size: sizeQuestion, hand: handQuestion };

/** The next question on a position this time round the board, of the kinds and streets chosen; null when it has none left. */
export function ask(spot, round, prefs) {
  const street = spot.decision.street;
  if (!prefs.streets[street]) return null;
  for (const type of Object.keys(BUILD)) {
    if (!prefs.types[type] || (spot.asked[type] ?? 0) >= (type === 'hand' ? HANDS[street] * (round + 1) : 1)) continue;
    spot.asked[type] = (spot.asked[type] ?? 0) + 1;
    const q = BUILD[type](spot);
    if (q) return { ...q, type, street, chosen: [], done: false, ok: null };
  }
  return null;
}

/** Whether the answers chosen are exactly the right ones. */
export const isRight = (q) => q.chosen.length === q.right.length && q.right.every((k) => q.chosen.includes(k));
/** The answers in a set, by name. */
export const namesOf = (q, list) => [...list].sort((a, b) => a - b).map((k) => q.options[k].label).join(', ') || 'Nothing';
