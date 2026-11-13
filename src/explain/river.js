/**
 * Why a hand does what it does on the river.
 *
 * Takes one decision as a solver left it (each hand's strategy and what each action is worth to
 * it, the other range and its answers) and says what decides the hand's play: where it stands
 * against the line that separates one action from another, what happens to it next under each
 * action, and whether its cards set it apart from hands of the same strength.
 *
 * Every sentence carries the number behind it and where that number comes from:
 *
 *   solver   read from the solution (what an action is worth, what he does next)
 *   count    counted from the two ranges (what the hand beats, what its cards remove)
 *   formula  the indifference maths (the price of a call, the folds a bluff needs)
 *
 * @typedef {Object} Decision
 * @property {'oop'|'ip'} seat
 * @property {number} pot Everything in the middle, his bet included.
 * @property {number} toCall
 * @property {{ kind: string, label: string, add: number }[]} actions
 * @property {{ id: any, name: string, cards?: number[], weight: number, strength: number, strategy: number[], values: number[]|null }[]} hands
 * @property {{ id: any, cards?: number[], weight: number, strength: number, answers: ({ fold: number, check: number, call: number, more: number }|null)[] }[]} villain
 */

/** An action costing more than this share of the pot is a mistake for the hand. */
export const MISTAKE = 0.005;
const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
const pct = (x) => `${Math.round(100 * x)}%`;
const shares = (a, b) => (a === b ? false : !!a && !!b && (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]));
/** A bluff: a bet that loses to most of what calls, by a hand that would rarely win by checking. */
const BLUFF = 1 / 3;
const isBluff = (row, a) => (row.whenCalled[a] ?? row.equity) < 0.5 && row.equity < BLUFF;

/** What the decision looks like for every hand at once: computed once, read per hand. */
export function survey(decision) {
  const { hands, villain, actions, pot, toCall } = decision;
  const facing = toCall > 0;
  const rows = hands.map((hand) => {
    let mass = 0, win = 0, worse = 0, blockedBetter = 0, blockedWorse = 0, allBetter = 0, allWorse = 0;
    // What he does next against this hand, action by action
    const next = actions.map(() => ({ fold: 0, check: 0, callWorse: 0, callBetter: 0, more: 0, mass: 0, win: 0, cont: 0, showdown: 0, showdownWin: 0 }));
    for (const his of villain) {
      const stronger = his.strength > hand.strength;
      const weaker = his.strength < hand.strength;
      if (stronger) allBetter += his.weight; else if (weaker) allWorse += his.weight;
      if (hand.cards && shares(hand.cards, his.cards)) {
        if (stronger) blockedBetter += his.weight; else if (weaker) blockedWorse += his.weight;
        continue;
      }
      mass += his.weight;
      const result = weaker ? 1 : stronger ? 0 : 0.5;
      win += his.weight * result;
      if (weaker) worse += his.weight;
      his.answers.forEach((answer, a) => {
        if (!answer) return;
        const n = next[a];
        n.mass += his.weight;
        n.fold += his.weight * answer.fold;
        n.check += his.weight * answer.check;
        n.more += his.weight * answer.more;
        n.callWorse += his.weight * answer.call * result;
        n.callBetter += his.weight * answer.call * (1 - result);
        n.cont += his.weight * (1 - answer.fold);
        n.win += his.weight * (1 - answer.fold) * result;
        n.showdown += his.weight * (answer.check + answer.call);
        n.showdownWin += his.weight * (answer.check + answer.call) * result;
      });
    }
    const best = hand.values ? Math.max(...hand.values) : null;
    const gaps = hand.values ? hand.values.map((v) => (best - v) / pot) : null;
    return {
      hand,
      equity: mass > 0 ? win / mass : 0,
      beats: mass > 0 ? worse / mass : 0,
      gaps,
      fine: gaps ? gaps.map((g) => g <= MISTAKE) : actions.map(() => true),
      // per action: what he does next, as shares of the times the hand takes it
      next: next.map((n) => (n.mass > 0 ? { fold: n.fold / n.mass, check: n.check / n.mass, callWorse: n.callWorse / n.mass, callBetter: n.callBetter / n.mass, more: n.more / n.mass, showdownWin: n.showdown > 0 ? n.showdownWin / n.showdown : null } : null)),
      folds: next.map((n) => (n.mass > 0 ? n.fold / n.mass : null)),
      whenCalled: next.map((n) => (n.cont > 1e-9 ? n.win / n.cont : null)),
      removesBetter: allBetter > 0 ? blockedBetter / allBetter : 0,
      removesWorse: allWorse > 0 ? blockedWorse / allWorse : 0,
    };
  });
  const levels = new Map();
  for (const row of rows) {
    let level = levels.get(row.hand.strength);
    if (!level) levels.set(row.hand.strength, level = { rows: [], weight: 0, mix: actions.map(() => 0) });
    level.rows.push(row);
    level.weight += row.hand.weight;
    row.hand.strategy.forEach((p, a) => { level.mix[a] += row.hand.weight * p; });
  }
  for (const level of levels.values()) level.mix = level.mix.map((x) => x / level.weight);
  const total = rows.reduce((t, r) => t + r.hand.weight, 0);
  const mix = actions.map((_, a) => rows.reduce((t, r) => t + r.hand.weight * r.hand.strategy[a], 0) / total);
  const sizes = actions.map((action, a) => {
    if (!AGGRESSIVE.has(action.kind)) return null;
    let all = 0, bluffs = 0;
    for (const row of rows) {
      const w = row.hand.weight * row.hand.strategy[a];
      all += w;
      if (isBluff(row, a)) bluffs += w;
    }
    const s = action.add > toCall ? (action.add - toCall) / (pot + toCall) : 0;
    return { frequency: all / total, bluffShare: all > 0 ? bluffs / all : 0, s, wanted: s / (1 + 2 * s), needsFolds: s / (1 + s) };
  });
  const need = facing ? toCall / (pot + toCall) : 0;
  return { decision, facing, rows, levels, mix, sizes, need, byName: new Map(rows.map((r) => [r.hand.name, r])) };
}

/**
 * The reasons for one hand.
 *
 * @param {ReturnType<typeof survey>} s
 * @param {string} name The hand, as the decision names it.
 * @returns {{ name: string, strategy: number[], status: 'forced'|'optional'|'unknown', equity: number, line: string, reasons: { id: string, text: string, basis: 'solver'|'count'|'formula' }[] }}
 */
export function explain(s, name) {
  const row = s.byName.get(name);
  if (!row) return null;
  const { decision, facing } = s;
  const { actions, pot, toCall } = decision;
  const { hand } = row;
  const level = s.levels.get(hand.strength);
  const reasons = [];
  const say = (id, basis, text) => reasons.push({ id, basis, text });
  const label = (a) => actions[a].label;
  const fold = actions.findIndex((x) => x.kind === 'fold');
  const call = actions.findIndex((x) => x.kind === 'call');
  const check = actions.findIndex((x) => x.kind === 'check');
  const bets = actions.map((x, a) => (AGGRESSIVE.has(x.kind) ? a : -1)).filter((a) => a >= 0);
  const betting = bets.reduce((t, a) => t + hand.strategy[a], 0);
  const mainBet = bets.length ? bets.reduce((best, a) => (hand.strategy[a] > hand.strategy[best] ? a : best), bets[0]) : -1;
  const move = (r) => (facing ? 1 - r.hand.strategy[fold] : bets.reduce((t, a) => t + r.hand.strategy[a], 0));
  // What the hands a little stronger and a little weaker do: where the line falls
  const near = (from, to) => { let w = 0, m = 0; for (const r of s.rows) { const d = r.equity - row.equity; if (d > from && d <= to) { w += r.hand.weight; m += r.hand.weight * move(r); } } return w > 0 ? m / w : null; };
  const above = near(0.015, 0.1);
  const below = near(-0.1, -0.015);
  const verb = facing ? 'continue' : 'bet';
  const around = above != null && below != null ? `Hands a little stronger ${verb} ${pct(above)} of the time; a little weaker, ${pct(below)}.` : '';
  const whatNext = (a) => {
    const n = row.next[a];
    if (!n) return '';
    if (actions[a].kind === 'check') return `After ${label(a)} he checks behind ${pct(n.check)} of the time and bets ${pct(n.more)}.`;
    return `Against ${label(a)} he folds ${pct(n.fold)}, calls with worse ${pct(n.callWorse)}, calls with better ${pct(n.callBetter)}${n.more > 0.005 ? ` and raises ${pct(n.more)}` : ''}.`;
  };
  let line = '';

  if (facing) {
    const edge = row.equity - s.need;
    const price = `it beats ${pct(row.equity)} of his betting range and a call needs ${pct(s.need)}`;
    const raising = mainBet >= 0 && betting > 0.1;
    const called = mainBet >= 0 ? row.whenCalled[mainBet] : null;
    if (raising && called != null && called >= 0.5) {
      line = `Raises for value: it still beats ${pct(called)} of what continues against ${label(mainBet)}.`;
      say('raise', 'solver', `${line} ${whatNext(mainBet)}`);
    } else if (raising) {
      line = `Raises as a bluff: he folds ${pct(row.folds[mainBet] ?? 0)} to ${label(mainBet)}, and calling would win only ${pct(row.equity)}.`;
      say('raise', 'solver', `${line} A raise this size needs him to fold ${pct(s.sizes[mainBet].needsFolds)}.`);
    }
    if (Math.abs(edge) <= 0.02) {
      const continues = 1 - s.mix[fold];
      const text = `A bluff-catcher at the price: ${price}. It beats his bluffs and loses to his value, so calling and folding are worth the same.`;
      if (!line) line = `At the price: ${price}.`;
      say('price', 'count', text);
      say('defence', 'formula', `His bluffs must not profit, so the range continues ${pct(continues)} in all. Bluff-catchers make up the difference after the hands that always continue, which is why some call and some fold.`);
    } else if (edge > 0) {
      if (!line) line = `Calls: ${price}.`;
      say('price', 'count', `It is ${Math.round(100 * edge)} points clear of the price: ${price}.`);
      if (!raising && called != null && row.equity > 0.7) say('no-raise', 'solver', `It does not raise. Against ${label(mainBet)} he would continue with hands that beat it ${pct(1 - called)} of the time: a raise folds out what it beats.`);
    } else {
      if (!line) line = `Folds: ${price}.`;
      say('price', 'count', `It is ${Math.round(-100 * edge)} points short of the price: ${price}.`);
    }
    if (around) say('line', 'count', around);
  } else {
    const called = mainBet >= 0 ? row.whenCalled[mainBet] : null;
    const afterCheck = check >= 0 ? row.next[check] : null;
    const facesBet = afterCheck ? afterCheck.more : null;
    if (betting > 0.1 && mainBet >= 0) {
      const n = row.next[mainBet];
      const size = s.sizes[mainBet];
      if (called != null && called >= 0.55) {
        line = `Value bet: called by ${label(mainBet)}, it wins ${pct(called)} of the time.`;
        say('value', 'solver', `${line} ${whatNext(mainBet)}`);
      } else if (called != null && called >= 0.45) {
        line = `On the value line: called by ${label(mainBet)}, it wins ${pct(called)}, a coin flip. That is where betting stops paying.`;
        say('value', 'solver', `${line} ${whatNext(mainBet)}`);
      } else if (isBluff(row, mainBet)) {
        line = `Bluff: checked, it wins ${pct(row.equity)}; he folds ${pct(n?.fold ?? 0)} to ${label(mainBet)} and the bet needs ${pct(size.needsFolds)}.`;
        say('bluff', 'solver', line);
        say('quota', 'formula', `Bluffs are ${pct(size.bluffShare)} of the range's ${label(mainBet)} bets; the price he is laid allows ${pct(size.wanted)}. The weakest hands bluff first because they give up nothing by not checking.`);
      } else {
        // A bet that is neither: what does checking expose it to?
        line = `Bets so as not to face a bet: after ${check >= 0 ? label(check) : 'a check'} he bets ${pct(facesBet ?? 0)} of the time. Called, it wins only ${pct(called ?? 0)}.`;
        say('block', 'solver', `${line} ${whatNext(mainBet)}`);
        say('block-why', 'solver', `Betting sets the price itself: he raises ${label(mainBet)} ${pct(n?.more ?? 0)} of the time, where after a check he bets ${pct(facesBet ?? 0)} and picks the size.`);
      }
    }
    if (check >= 0 && hand.strategy[check] > 0.1) {
      const probe = mainBet >= 0 ? mainBet : bets[0];
      const wouldWin = probe >= 0 ? row.whenCalled[probe] : null;
      if (row.equity >= 0.75 && wouldWin != null && wouldWin >= 0.5) {
        const text = `Checks a hand strong enough to bet: after ${label(check)} he bets ${pct(facesBet ?? 0)} of the time, into it. Hands of its strength check ${pct(level.mix[check])} in all, which is what stops him betting freely.`;
        if (!line) line = `Checks to let him bet: after ${label(check)} he bets ${pct(facesBet ?? 0)} of the time.`;
        say('trap', 'solver', text);
      } else if (row.equity >= BLUFF) {
        const text = `Checks for showdown: it beats ${pct(row.equity)} of his range but only ${pct(wouldWin ?? 0)} of what would call ${probe >= 0 ? label(probe) : 'a bet'}. A bet folds out what it beats and is called by what beats it.`;
        if (!line) line = `Checks for showdown: beats ${pct(row.equity)} of his range but only ${pct(wouldWin ?? 0)} of what would call.`;
        say('showdown', 'count', `${text} ${whatNext(check)}`);
      } else {
        const size = probe >= 0 ? s.sizes[probe] : null;
        if (!line) line = `Gives up: it wins ${pct(row.equity)} at showdown and the range has its bluffs already.`;
        say('give-up', 'formula', `Gives up: it wins ${pct(row.equity)} at showdown.${size ? ` The range already bluffs with ${pct(size.bluffShare)} of its ${label(probe)} bets, against the ${pct(size.wanted)} the price allows, and weaker hands than this one go first.` : ''}`);
      }
    }
    if (around) say('line', 'count', around);
  }

  // What the choice costs, from the solver's values
  let status = 'unknown';
  if (row.gaps) {
    const ok = actions.filter((_, a) => row.fine[a]);
    status = ok.length > 1 ? 'optional' : 'forced';
    const worst = row.gaps.map((g, a) => ({ g, a })).filter((x) => x.g > MISTAKE).sort((x, y) => x.g - y.g)[0];
    if (status === 'forced' && worst) say('cost', 'solver', `The next best action, ${label(worst.a)}, gives up ${(100 * worst.g).toFixed(1)}% of the pot.`);
    else if (status === 'optional' && worst) say('cost', 'solver', `${ok.map((x) => x.label).join(' and ')} are worth the same to it; ${label(worst.a)} would give up ${(100 * worst.g).toFixed(1)}% of the pot.`);
  }

  // Hands of exactly its strength, and what its cards change
  if (level.rows.length > 1) {
    const others = level.rows.filter((r) => r !== row);
    const mine = move(row);
    const theirs = others.reduce((t, r) => t + r.hand.weight * move(r), 0) / others.reduce((t, r) => t + r.hand.weight, 0);
    const meanBetter = others.reduce((t, r) => t + r.removesBetter, 0) / others.length;
    const meanWorse = others.reduce((t, r) => t + r.removesWorse, 0) / others.length;
    const differs = Math.abs(row.removesBetter - meanBetter) + Math.abs(row.removesWorse - meanWorse) >= 0.02;
    if (Math.abs(mine - theirs) > 0.15 && hand.cards && differs) {
      say('blockers', 'count', `Its cards set it apart from the ${others.length} other hands of its strength, which ${verb} ${pct(theirs)} against its ${pct(mine)}: it removes ${pct(row.removesBetter)} of the hands that beat it (they remove ${pct(meanBetter)}) and ${pct(row.removesWorse)} of the hands it beats (they remove ${pct(meanWorse)}).`);
    } else if (Math.abs(mine - theirs) > 0.15 && hand.cards) {
      say('arbitrary', 'count', `The ${others.length} other hands of its strength ${verb} ${pct(theirs)} against its ${pct(mine)}, yet their cards remove the same parts of his range. The split between them carries no meaning: any of them could take the other's share.`);
    }
  }
  return { name, strategy: hand.strategy, status, equity: row.equity, line, reasons };
}
