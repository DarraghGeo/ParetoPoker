/**
 * Why a hand does what it does on the river.
 *
 * Takes one decision as a solver left it (each hand's strategy and what each action is worth to
 * it, the other range and its answers) and returns reasons, each with the number behind it and
 * where that number comes from:
 *
 *   solver   read straight from the solution (what an action is worth, what he does next)
 *   count    counted from the two ranges (what the hand beats, what its cards remove)
 *   formula  the indifference maths (the price of a call, the folds a bluff needs)
 *
 * A hand on the river is its strength: hands of equal strength are interchangeable unless their
 * cards remove different parts of his range. So the explanation is built from four things: the
 * price, what the hand beats, what the rest of its strength level does, and its blockers.
 *
 * @typedef {Object} Decision
 * @property {'oop'|'ip'} seat
 * @property {number} pot Everything in the middle, his bet included.
 * @property {number} toCall
 * @property {{ kind: string, label: string, add: number }[]} actions
 * @property {{ id: any, name: string, cards?: number[], weight: number, strength: number, strategy: number[], values: number[]|null }[]} hands
 * @property {{ id: any, cards?: number[], weight: number, strength: number, answers: ({ fold: number, check: number }|null)[] }[]} villain
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
    // Against every hand of his that it can face: what it beats, in all and among what continues
    let mass = 0, win = 0, better = 0, worse = 0, blockedBetter = 0, blockedWorse = 0, allBetter = 0, allWorse = 0;
    const called = actions.map(() => ({ mass: 0, win: 0, folds: 0 }));
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
      if (stronger) better += his.weight; else if (weaker) worse += his.weight;
      his.answers.forEach((answer, a) => {
        if (!answer) return;
        called[a].folds += his.weight * answer.fold;
        called[a].mass += his.weight * (1 - answer.fold);
        called[a].win += his.weight * (1 - answer.fold) * result;
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
      folds: called.map((c, a) => (villain[0]?.answers[a] && mass > 0 ? c.folds / mass : null)),
      whenCalled: called.map((c) => (c.mass > 1e-9 ? c.win / c.mass : null)),
      // How much of what beats it, and of what it beats, its own cards take out of his range
      removesBetter: allBetter > 0 ? blockedBetter / allBetter : 0,
      removesWorse: allWorse > 0 ? blockedWorse / allWorse : 0,
    };
  });
  // Strength levels: the hands that tie
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
  // Each bet or raise: how much of it is a bluff (a hand that loses to most of what calls)
  const sizes = actions.map((action, a) => {
    if (!AGGRESSIVE.has(action.kind)) return null;
    let all = 0, bluffs = 0;
    for (const row of rows) {
      const w = row.hand.weight * row.hand.strategy[a];
      all += w;
      if (isBluff(row, a)) bluffs += w;
    }
    const s = action.add > toCall ? (action.add - toCall) / (pot + toCall) : 0; // the bet as a share of the pot it is made into
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
 * @returns {{ name: string, strategy: number[], status: 'forced'|'optional'|'unknown', line: string, reasons: { id: string, text: string, basis: 'solver'|'count'|'formula' }[] }}
 */
export function explain(s, name) {
  const row = s.byName.get(name);
  if (!row) return null;
  const { decision, facing } = s;
  const { actions, pot, toCall } = decision;
  const { hand } = row;
  const main = hand.strategy.indexOf(Math.max(...hand.strategy));
  const level = s.levels.get(hand.strength);
  const reasons = [];
  const say = (id, basis, text, short = null) => reasons.push({ id, basis, text, short });
  const label = (a) => actions[a].label;
  const fold = actions.findIndex((x) => x.kind === 'fold');
  const call = actions.findIndex((x) => x.kind === 'call');
  const check = actions.findIndex((x) => x.kind === 'check');
  const bets = actions.map((x, a) => (AGGRESSIVE.has(x.kind) ? a : -1)).filter((a) => a >= 0);
  const betting = bets.reduce((t, a) => t + hand.strategy[a], 0);
  const mainBet = bets.length ? bets.reduce((best, a) => (hand.strategy[a] > hand.strategy[best] ? a : best), bets[0]) : -1;

  // 1. Does the choice matter to this hand?
  let status = 'unknown';
  if (row.gaps) {
    const allowed = row.fine.filter(Boolean).length;
    status = allowed > 1 ? 'optional' : 'forced';
    if (status === 'forced') {
      const next = Math.min(...row.gaps.filter((g, a) => a !== main && g > MISTAKE));
      say('forced', 'solver', `Only ${label(main)} is right for this hand. The next best action gives up ${(100 * next).toFixed(1)}% of the pot.`);
    } else {
      const ok = actions.filter((_, a) => row.fine[a]).map((x) => x.label);
      const list = ok.join(', ').replace(/, ([^,]*)$/, ' and $1');
      say('optional', 'solver', `${list} are worth the same to this hand (within ${(100 * MISTAKE).toFixed(1)}% of the pot). Its mix is the range's choice, not the hand's.`, `Indifferent: ${list} are worth the same to it.`);
    }
  }

  if (facing) {
    // 2. The price
    const edge = row.equity - s.need;
    const price = `It beats ${pct(row.equity)} of his range here. Calling ${fmt(toCall)} to win ${fmt(pot)} needs ${pct(s.need)}.`;
    const short = `Beats ${pct(row.equity)} of his range; a call needs ${pct(s.need)}.`;
    if (Math.abs(edge) <= 0.02) {
      const continues = 1 - s.mix[fold];
      say('catcher', 'count', `${price} That is the price almost exactly: a bluff-catcher.`, `Bluff-catcher: beats ${pct(row.equity)}, and a call needs ${pct(s.need)}.`);
      const bet = toCall / (pot - toCall);
      if (status !== 'forced') say('defence', 'formula', `The range continues ${pct(continues)} of the time in all. Hands like this one supply whatever share keeps his bluffs from profiting; the plain rule of thumb for a bet this size is ${pct(1 / (1 + bet))}.`);
    } else if (edge > 0) say('price', 'count', `${price} It is ${Math.round(100 * edge)} points clear, so it never folds.`, short);
    else say('price', 'count', `${price} It is ${Math.round(-100 * edge)} points short, so calling loses.`, short);

    // 3. Raising
    if (mainBet >= 0) {
      const called = row.whenCalled[mainBet];
      if (betting > 0.1 && called != null) {
        if (called >= 0.5) say('raise-value', 'solver', `It raises for value: against ${label(mainBet)} he continues with hands it beats ${pct(called)} of the time.`, `Raises for value: beats ${pct(called)} of what continues.`);
        else say('raise-bluff', 'solver', `It raises as a bluff: he folds ${pct(row.folds[mainBet] ?? 0)} to ${label(mainBet)}, and the hand gives up little, since calling wins only ${pct(row.equity)}.`);
      } else if (betting <= 0.1 && row.equity > 0.7 && called != null && called < 0.5) {
        say('no-raise', 'solver', `It does not raise: what continues against ${label(mainBet)} beats it more often than not (it wins ${pct(called)}).`);
      }
    }
  } else {
    // First to act
    if (betting > 0.1 && mainBet >= 0) {
      const size = s.sizes[mainBet];
      const called = row.whenCalled[mainBet] ?? row.equity;
      if (called >= 0.5) {
        say('value', 'solver', `It bets for value: it beats ${pct(called)} of what calls ${label(mainBet)}.`, `Bets for value: beats ${pct(called)} of what calls.`);
      } else if (!isBluff(row, mainBet)) {
        say('merged', 'solver', `It bets ${label(mainBet)} with a middling hand: it beats ${pct(row.equity)} of his range, and ${pct(called)} of what calls. That is neither a value bet nor a bluff; the bet is worth what a check is, and the range uses hands like this to fill out the size.`, `Bets a middling hand: beats ${pct(row.equity)} of his range and ${pct(called)} of what calls.`);
      } else {
        say('bluff', 'solver', `It bets as a bluff: checked, it wins ${pct(row.equity)} at showdown; he folds ${pct(row.folds[mainBet] ?? 0)} to ${label(mainBet)}, and a bluff of this size needs ${pct(size.needsFolds)}.`, `Bluffs: wins ${pct(row.equity)} if checked; he folds ${pct(row.folds[mainBet] ?? 0)}, and it needs ${pct(size.needsFolds)}.`);
        say('quota', 'formula', `Bluffs are ${pct(size.bluffShare)} of the range's ${label(mainBet)}. The price he gets to call allows ${pct(size.wanted)}.`);
      }
    }
    if (check >= 0 && hand.strategy[check] > 0.1) {
      const probe = mainBet >= 0 ? mainBet : bets[0];
      const called = probe >= 0 ? row.whenCalled[probe] : null;
      if (row.equity >= 0.75 && called != null && called >= 0.5) {
        const after = decision.villain.reduce((t, v) => t + v.weight * (1 - (v.answers[check]?.check ?? 1)), 0) / decision.villain.reduce((t, v) => t + v.weight, 0);
        say('protect', 'solver', `It is strong enough to bet, and it checks ${pct(hand.strategy[check])} of the time. Hands of its strength check ${pct(level.mix[check])} in all, so that a check is not always weak. ${decision.villain[0]?.answers[check] ? `After a check he bets ${pct(after)} of the time.` : ''}`.trim(), 'Strong enough to bet; it also checks, so that a check is not always weak.');
      } else if (called != null && row.equity >= 0.35) {
        say('showdown', 'count', `It checks: it beats ${pct(row.equity)} of his range but only ${pct(called)} of what would call ${label(probe)}. A bet folds out the hands it beats.`, `Checks: beats ${pct(row.equity)} of his range but only ${pct(called)} of what would call.`);
      } else if (row.equity < 0.35) {
        const size = probe >= 0 ? s.sizes[probe] : null;
        say('give-up', 'formula', `It checks and gives up: it wins ${pct(row.equity)} at showdown.${size ? ` The range already bluffs ${pct(size.bluffShare)} of its ${label(probe)}, against the ${pct(size.wanted)} the price allows.` : ''}`, `Checks and gives up: wins ${pct(row.equity)} at showdown.`);
      }
    }
  }

  // 4. Its strength level, and its blockers
  if (level.rows.length > 1) {
    const mine = facing ? 1 - hand.strategy[fold] : betting;
    const others = level.rows.filter((r) => r !== row);
    const theirs = others.reduce((t, r) => t + r.hand.weight * (facing ? 1 - r.hand.strategy[fold] : bets.reduce((x, a) => x + r.hand.strategy[a], 0)), 0) / others.reduce((t, r) => t + r.hand.weight, 0);
    const what = facing ? 'continues' : 'bets';
    const meanBetter = others.reduce((t, r) => t + r.removesBetter, 0) / others.length;
    const meanWorse = others.reduce((t, r) => t + r.removesWorse, 0) / others.length;
    const differs = Math.abs(row.removesBetter - meanBetter) + Math.abs(row.removesWorse - meanWorse) >= 0.02;
    if (Math.abs(mine - theirs) > 0.15 && hand.cards && !differs) {
      say('arbitrary', 'count', `${others.length} other hands have exactly its strength and ${what === 'continues' ? 'continue' : 'bet'} ${pct(theirs)}; it ${what} ${pct(mine)}. Its cards remove the same parts of his range as theirs, so which of them supplies the share does not matter.`);
    } else if (Math.abs(mine - theirs) > 0.15 && hand.cards) {
      say('blockers', 'count', `${others.length} other hands have exactly its strength and ${what === 'continues' ? 'continue' : 'bet'} ${pct(theirs)}; it ${what} ${pct(mine)}. The difference is its cards: they remove ${pct(row.removesBetter)} of the hands that beat it (the others remove ${pct(meanBetter)}) and ${pct(row.removesWorse)} of the hands it beats (the others ${pct(meanWorse)}).`);
    } else {
      say('level', 'count', `It plays like the ${others.length} other hands of exactly its strength, which ${what === 'continues' ? 'continue' : 'bet'} ${pct(theirs)}. On the river a hand is its strength; these are interchangeable.`);
    }
  }

  // The one-line answer: the reason for what the hand mostly does
  const wanted = AGGRESSIVE.has(actions[main].kind) ? ['raise-value', 'raise-bluff', 'value', 'bluff'] : [];
  const mixed = status === 'optional' && Math.max(...hand.strategy) < 0.85;
  const first = (mixed ? reasons.find((r) => r.id === 'optional') : null) ?? reasons.find((r) => r.short && wanted.includes(r.id)) ?? reasons.find((r) => r.short && r.id !== 'optional') ?? reasons[0];
  return { name, strategy: hand.strategy, status, equity: row.equity, line: first ? first.short ?? first.text : '', reasons };
}

function fmt(chips) {
  return Number.isInteger(chips) ? String(chips) : chips.toFixed(1);
}
