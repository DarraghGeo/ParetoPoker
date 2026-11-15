// One hand read off a studied decision: what each action is worth to it, how he answers, and where it sits in the range.
import { cardsOf } from '../../combos.js';

/** His replies to the action, for this hand: what it is worth each time he does not fold, and on his folds. */
function addReplies(out, x, c, pc) {
  out.reply = x.replies.map((r) => ({ kind: r.kind, label: r.label, share: r.share[c], part: pc(r.value[c]) }));
  let share = 0, part = 0; for (const r of out.reply) if (r.kind !== 'fold') { share += r.share; part += r.part; }
  out.continues = share; out.whenContinued = share > 0 ? part / share : null;
  const folded = out.reply.find((r) => r.kind === 'fold'); out.folds = folded ? folded.share : 0; out.fromFolds = folded ? folded.part : 0;
}

/** On the river a call is a showdown: from what the called bet is worth, how often the hand is ahead of what calls. */
function addShowdown(out, s, x, c, a) {
  const { f } = s; const ci = x.replies.findIndex((r) => r.kind === 'call');
  if (f.board.length !== 5 || ci < 0 || !(x.replies[ci].share[c] > 0.01)) return;
  const end = f.nodes[f.nodes[f.node.edges[a].child].edges[ci].child]; if (end.kind !== 'showdown') return;
  const pot0 = f.nodes[0].pot; const win = pot0 / 2 + end.invested[1 - f.me]; const lose = pot0 / 2 + end.invested[f.me];
  const called = x.replies[ci]; out.calls = called.share[c];
  out.aheadWhenCalled = Math.min(1, Math.max(0, (called.value[c] / called.share[c] + lose) / (win + lose)));
}

/**
 * The cards to come, apart by whether they lift the hand's made category: how many, how often they come (`weight`, the two
 * adding to 1) and how much of the action's worth arrives on them (`part`, likewise adding to the worth).
 */
function liftingCards(s, x, c, pc) {
  const { fs, f } = s; const hand = cardsOf(fs, c); const before = fs.categoryOf(fs.evaluateCards([...f.board, ...hand]));
  const lift = { n: 0, weight: 0, part: 0 }; const rest = { n: 0, weight: 0, part: 0 };
  for (const k of x.cards) {
    if (Number.isNaN(k.value[c])) continue;
    const t = fs.categoryOf(fs.evaluateCards([...f.board, k.card, ...hand])) > before ? lift : rest; t.n++; t.weight += k.weight[c]; t.part += pc(k.value[c]);
  }
  return { lift, rest };
}

function measureAction(s, c, act, a, pc) {
  const x = s.closely(a);
  const out = { ...act, sigma: s.sigma(c, a), worth: pc(x.value[c]) };
  if (x.replies) { addReplies(out, x, c, pc); addShowdown(out, s, x, c, a); }
  out.holding = Object.fromEntries([...x.holdings.entries()].map(([g, r]) => [g, { share: r.share[c], part: pc(r.value[c]) }]));
  if (x.cards) out.cards = liftingCards(s, x, c, pc);
  return out;
}

/** One hand at a studied decision. `onlyOn`: measure only the actions on the path (the others cannot be relied on). */
export function measure(s, c, { onlyOn = true, worth = true } = {}) {
  const { f, fs } = s;
  if (!(f.mine[c] > 0) || !(f.mass[c] > 0)) return null;
  const pc = (chips) => (100 * chips) / s.pot;
  const acts = s.actions.map((act, a) => (!worth || (onlyOn && !act.on) ? { ...act, sigma: s.sigma(c, a), worth: null } : measureAction(s, c, act, a, pc)));
  const fifths = worth ? s.bands() : null;
  return { combo: c, name: fs.formatCombo(c), features: s.featuresOf(c), equity: worth ? s.equity()[c] : null, reach: f.mine[c], actions: acts,
    band: fifths ? fifths.of[c] : null, bands: fifths ? fifths.list : null, near: fifths ? fifths.near(c) : null };
}
