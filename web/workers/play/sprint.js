// A sprint: a few multiple-choice questions about the spot in front of hero, asked now and then before he acts. Each is
// one of the things his rules read (src/rules), put as a question with its answer worked out exactly from the two ranges
// as they stand: the hand's equity, the price of a call and what the hand needs, who is ahead in top pair or better and
// in the strongest hands, how much of his range is strong or weak, the bluffs a size carries, whether minimum defence
// applies and is met, and which of three butterflies is this spot's. Only the questions the spot calls for are asked.
import * as fs from 'poker-flopsolve';
import { features } from '../../../src/explain/features.js';
import { shapeOf, topShare } from '../../../src/rules/at.js';
import { bothEquities } from '../../../src/solver/equity.js';
import { ROWS, rowOf } from '../../lib/study/butterfly.js';
import { text } from '../../solver/deck.js';
import { rangesOf } from './solved.js';

const pct = (x) => `${Math.round(100 * x)}%`;
const shuffled = (list) => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
const whoIs = (c, seat) => (seat === c.me ? 'You' : 'Villain');
/** A question whose answers are the two players or neither: `mine` and `his` are the shares compared, a point apart to count. */
function whoQuestion(c, id, ask, mine, his, what) {
  const lead = Math.abs(mine - his) < 0.01 ? 2 : mine > his ? 0 : 1;
  return { id, ask, options: ['You', 'Villain', 'Neither (within a point)'], answer: lead, why: `${what} is ${pct(mine)} of your range and ${pct(his)} of his.` };
}

/** How much of each range is in the butterfly's top two rows (two pair, and trips or better). */
function nutShares(c) {
  const share = (range) => { let all = 0, top = 0; for (let k = 0; k < fs.COMBOS; k++) if (range[k] > 0) { all += range[k]; if (rowOf(fs.formatCombo(k), c.boardText) >= 6) top += range[k]; } return all > 0 ? top / all : 0; };
  return [share(c.mine), share(c.his)];
}

const BANDS = [[0.3, 'Under 30%'], [0.5, '30 to 50%'], [0.8, '50 to 80%'], [2, '80% or more']];
function equityQ(c) {
  const what = c.street === 2 ? 'How much of his range does your hand beat?' : 'What is your hand\'s equity against his range?';
  return { id: 'equity', ask: what, options: BANDS.map((b) => b[1]), answer: BANDS.findIndex((b) => c.equity < b[0]), why: `It has ${pct(c.equity)} against his range here${c.draw ? ', with a draw' : ''}.` };
}

const PRICES = [14, 17, 20, 22, 25, 29, 30, 33, 36, 38, 40, 43];
function priceQ(c) {
  const right = Math.round(100 * c.price); const others = PRICES.filter((x) => Math.abs(x - right) >= 3).sort((a, b) => Math.abs(a - right) - Math.abs(b - right)).slice(0, 3);
  const options = [right, ...others].sort((a, b) => a - b);
  return { id: 'price', ask: 'What is the price of this call?', options: options.map((x) => `${x}%`), answer: options.indexOf(right), why: `${c.toCall.toFixed(1)} to call for a pot of ${(c.pot + c.toCall).toFixed(1)}: ${right}%.` };
}

const MARGINS = [0, 0.05, 0.1, 0.15];
function needsQ(c) {
  const where = `${c.raised ? 'facing a raise' : `facing a ${['flop', 'turn'][c.street]} bet`} ${c.ip ? 'in position' : 'out of position'}`;
  return { id: 'needs', ask: 'What does a hand need to continue here?', options: ['The price', 'The price + 5', 'The price + 10', 'The price + 15'], answer: MARGINS.indexOf(c.margin), why: `Your rule ${where}: the price${c.margin ? ` and ${Math.round(100 * c.margin)} points more` : ''}, ${pct(c.price + c.margin)} here.` };
}

function strongQ(c) {
  return { id: 'strong', ask: 'How much of his range is strong (80% or more against yours)?', options: ['Under a fifth', 'A fifth or more'], answer: c.shape.strong >= 0.2 ? 1 : 0, why: `${pct(c.shape.strong)} of his range is strong. At a fifth or more your rule checks everything out of position.` };
}
function weakQ(c) {
  const k = c.shape.weak < 0.25 ? 0 : c.shape.weak < 0.5 ? 1 : 2;
  return { id: 'weak', ask: 'How much of his range is weak (under 30% against yours)?', options: ['Under a quarter', 'A quarter to a half', 'Over half'], answer: k, why: `${pct(c.shape.weak)} of his range is weak: the hands a bluff can fold out.` };
}
function bluffsQ(c) {
  const s = c.betSize; const right = Math.round((10 * s) / (1 + s)); const options = [...new Set([right, Math.max(1, right - 2), right + 2, right + 4])].sort((a, b) => a - b);
  return { id: 'bluffs', ask: `Betting ${pct(s)} of the pot, how many bluffs go with 10 value bets?`, options: options.map((x) => `About ${x}`), answer: options.indexOf(right), why: `Bluffs for each value bet are size / (1 + size): ${s.toFixed(2)} / ${(1 + s).toFixed(2)}, about ${right} for 10.` };
}

function mdfAppliesQ(c) {
  const yes = c.street === 2 || c.ip;
  return { id: 'mdf-applies', ask: 'Do you defend up to MDF here?', options: ['Yes: fill up to it', 'No: folding more is right'], answer: yes ? 0 : 1, why: yes ? `On the river, and in position on any street, your rule fills up to MDF with the next-best hands.` : 'Out of position before the river, folding more than MDF is right: the threshold is the price and a margin.' };
}
function mdfEnoughQ(c) {
  let all = 0, goes = 0; for (let k = 0; k < fs.COMBOS; k++) if (c.mine[k] > 0 && !Number.isNaN(c.eqMine[k])) { all += c.mine[k]; if (c.eqMine[k] >= c.price + c.margin) goes += c.mine[k]; }
  const share = all > 0 ? goes / all : 0; const mdf = (c.pot - c.toCall) / c.pot; const k = share < mdf - 0.05 ? 1 : share > mdf + 0.05 ? 2 : 0;
  return { id: 'mdf-enough', ask: 'Your rule continues with every hand that has the price. Is that enough of your range?', options: ['About enough', 'Short: add your next-best hands', 'More than enough'], answer: k, why: `The rule continues with ${pct(share)} of your range; MDF against this bet is ${pct(mdf)}.` };
}

/** Both ranges in the butterfly's rows, strongest first, as shares: `[code, out of position's, in position's]`. */
function butterflyOf(c, ranges) {
  const rows = ROWS.map(([code]) => [code, 0, 0]); const total = [0, 0];
  ranges.forEach((range, who) => { for (let k = 0; k < fs.COMBOS; k++) if (range[k] > 0) { rows[rowOf(fs.formatCombo(k), c.boardText)][1 + who] += range[k]; total[who] += range[k]; } });
  return rows.map(([code, a, b]) => [code, a / (total[0] || 1), b / (total[1] || 1)]).filter((r) => r[1] > 0 || r[2] > 0).reverse();
}
/** Two butterflies that are not this spot's: the two ranges on each other's side, and each range a row stronger than it is. */
function decoys(real) {
  const swapped = real.map(([code, a, b]) => [code, b, a]);
  const lifted = real.map(([code], i) => [code, real[i + 1]?.[1] ?? 0, real[i + 1]?.[2] ?? 0]); lifted[lifted.length - 1] = [real.at(-1)[0], real.at(-1)[1] + real[0][1], real.at(-1)[2] + real[0][2]];
  return [swapped, lifted];
}
function butterflyQ(c) {
  const real = butterflyOf(c, c.me === 0 ? [c.mine, c.his] : [c.his, c.mine]); const order = shuffled([0, 1, 2]); const all = [real, ...decoys(real)];
  return { id: 'butterfly', ask: 'Which butterfly is this spot? (out of position on the left)', charts: order.map((k) => all[k]), options: ['A', 'B', 'C'], answer: order.indexOf(0), why: 'The other two have the ranges on the wrong sides, or each range a row stronger than it is.' };
}

/** Everything the questions read at hero's decision. */
function contextOf(p, node) {
  const seg = p.seg; const board = [...seg.solved.cards, ...seg.dealt].slice(0, seg.solved.cards.length + node.round); const ranges = rangesOf(seg, node);
  const mine = ranges[p.me]; const his = ranges[1 - p.me]; const [eqMine] = bothEquities(fs, board, mine, his); const equity = eqMine[p.hand.hero];
  const x = features(fs, board, p.hand.hero); const street = board.length - 3; const ip = p.me === 1; const toCall = node.invested[1 - p.me] - node.invested[p.me];
  const big = toCall / (node.pot - toCall); const raised = toCall > 0 && node.invested[p.me] > 0;
  const margin = toCall <= 0 ? 0 : raised ? (street === 2 ? 0 : 0.05) : street === 2 ? 0 : street === 0 ? (ip ? 0.05 : 0.15) : ip ? 0 : big > 0.5 ? 0.15 : 0.1;
  const bet = node.edges.find((e) => e.kind === 'bet');
  return { p, me: p.me, board, boardText: text(board), mine, his, eqMine, equity, draw: street < 2 && (x.flushOuts >= 8 || x.straightOuts >= 8), street, ip, toCall, pot: node.pot, raised, margin,
    price: toCall > 0 ? toCall / (node.pot + toCall) : 0, betSize: bet ? (bet.to - node.invested[p.me]) / node.pot : 0 };
}

/** The questions this spot calls for, the ones that matter most first. */
function relevant(c) {
  const first = c.toCall <= 0; const list = [equityQ(c)];
  if (!first) { list.push(priceQ(c)); if (c.street < 2) list.push(needsQ(c)); list.push(mdfAppliesQ(c)); if (c.street === 2 || c.ip) list.push(mdfEnoughQ(c)); }
  if (first && c.street < 2 && !c.ip) list.push(whoQuestion(c, 'range-advantage', 'Who has the range advantage (more top pair or better)?', topShare(fs, c.board, c.mine), topShare(fs, c.board, c.his), 'Top pair or better'));
  if (first && c.street === 2) { c.shape = shapeOf(fs, c.board, c.mine, c.his); if (!c.ip) list.push(strongQ(c)); list.push(weakQ(c)); if (c.betSize > 0) list.push(bluffsQ(c)); }
  if (first) { const [mine, his] = nutShares(c); list.push(whoQuestion(c, 'nut-advantage', 'Who has the nut advantage (more two pair or better)?', mine, his, 'Two pair or better')); }
  list.push(butterflyQ(c));
  return list;
}

/** A sprint for hero's decision: three to five of the questions the spot calls for, the equity question always among them. */
export function sprintFor(p, node) {
  try {
    const c = contextOf(p, node); if (Number.isNaN(c.equity)) return null;
    const [first, ...rest] = relevant(c); const picked = shuffled(rest).slice(0, 3 + Math.floor(Math.random() * 2));
    return { questions: [first, ...picked.sort((a, b) => (a.id === 'butterfly') - (b.id === 'butterfly'))] };
  } catch { return null; }
}
