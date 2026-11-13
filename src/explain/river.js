/**
 * Why a hand does what it does on the river.
 *
 * Takes one decision as a solver left it (each hand's strategy and what each action is worth to
 * it, the other range and its answers) and says what decides the hand's play: where it stands
 * against the line that separates one action from another, what happens to it next under each
 * action, and whether its cards set it apart from hands of the same strength.
 *
 * It is written the way a coach would say it across the table: about this hand, in the second
 * person, with the numbers that decide it. Every number is read from the solution (what an action
 * is worth, what he does next), counted from the two ranges (what the hand beats, what its cards
 * remove) or is the indifference maths (the price of a call, the folds a bluff needs).
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

const RANK_WORD = { A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: 'ten', 9: 'nine', 8: 'eight', 7: 'seven', 6: 'six', 5: 'five', 4: 'four', 3: 'three', 2: 'two' };
const ORDER = 'AKQJT98765432';
/** His hands of a made-hand type, as a group. */
const GROUP = { 'high card': 'unpaired hands', pair: 'one-pair hands', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'straights', flush: 'flushes', 'full house': 'full houses', 'four of a kind': 'quads', 'straight flush': 'straight flushes' };
/** One hand of a made-hand type. */
const ONE = { pair: 'a pair', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'a straight', flush: 'a flush', 'full house': 'a full house', 'four of a kind': 'quads', 'straight flush': 'a straight flush' };

/**
 * The reasons for one hand.
 *
 * @param {ReturnType<typeof survey>} s
 * @param {string} name The hand, as the decision names it.
 * @returns {{ name: string, strategy: number[], status: 'forced'|'optional'|'unknown', equity: number, line: string, reasons: { id: string, text: string }[] }}
 *   `line` is the answer in a sentence or two; `reasons` are the paragraphs that follow it.
 */
export function explain(s, name) {
  const row = s.byName.get(name);
  if (!row) return null;
  const { decision, facing } = s;
  const { actions, pot, toCall } = decision;
  const { hand } = row;
  const level = s.levels.get(hand.strength);
  const reasons = [];
  const say = (id, text) => { if (text) reasons.push({ id, text: text.replace(/\s+/g, ' ').trim() }); };
  const label = (a) => actions[a].label;
  const fold = actions.findIndex((x) => x.kind === 'fold');
  const check = actions.findIndex((x) => x.kind === 'check');
  const bets = actions.map((x, a) => (AGGRESSIVE.has(x.kind) ? a : -1)).filter((a) => a >= 0);
  const betting = bets.reduce((t, a) => t + hand.strategy[a], 0);
  const mainBet = bets.length ? bets.reduce((best, a) => (hand.strategy[a] > hand.strategy[best] ? a : best), bets[0]) : -1;
  const move = (r) => (facing ? 1 - r.hand.strategy[fold] : bets.reduce((t, a) => t + r.hand.strategy[a], 0));
  const total = s.rows.reduce((t, r) => t + r.hand.weight, 0);

  // ---- the hand itself: what it is, and where it stands among the hands you hold here ----
  const names = decision.categories;
  const kind = names && hand.category != null ? String(names[hand.category]).toLowerCase() : null;
  const top = typeof name === 'string' && ORDER.includes(name[0]) && ORDER.includes(name[2]) ? (ORDER.indexOf(name[0]) < ORDER.indexOf(name[2]) ? name[0] : name[2]) : null;
  const what = kind === 'high card' && top ? `${RANK_WORD[top]} high` : kind ? ONE[kind] ?? kind : 'this hand';
  let weaker = 0; let stronger = 0;
  for (const r of s.rows) { if (r.hand.strength < hand.strength) weaker += r.hand.weight; else if (r.hand.strength > hand.strength) stronger += r.hand.weight; }
  weaker /= total; stronger /= total;
  const standing = weaker < 0.1 ? 'one of the weakest hands you get here with' : stronger < 0.1 ? 'one of the strongest hands you get here with' : weaker < 0.35 ? 'in the lower part of your range' : stronger < 0.35 ? 'in the upper part of your range' : 'in the middle of your range';

  // ---- his hands, by what they do: "mostly unpaired hands (60%) and one-pair hands (30%)" ----
  const mostly = (share) => {
    if (!names) return '';
    const by = new Map(); let all = 0;
    for (const his of decision.villain) {
      if (his.category == null || (hand.cards && shares(hand.cards, his.cards))) continue;
      const w = his.weight * share(his);
      if (!(w > 0)) continue;
      all += w; by.set(his.category, (by.get(his.category) ?? 0) + w);
    }
    if (!(all > 0)) return '';
    const list = [...by.entries()].map(([c, w]) => ({ group: GROUP[String(names[c]).toLowerCase()] ?? String(names[c]).toLowerCase(), part: w / all })).sort((a, b) => b.part - a.part).filter((x, k) => k < 2 && x.part >= 0.2);
    return list.length ? list.map((x) => `${x.group} (${pct(x.part)})`).join(' and ') : '';
  };
  const beaten = (his) => his.strength < hand.strength;
  const ahead = (his) => his.strength > hand.strength;
  const with_ = (text, lead = ', mostly ') => (text ? `${lead}${text}` : '');

  // ---- where the line falls: what the hands a little stronger and a little weaker do ----
  const near = (from, to) => { let w = 0, m = 0; for (const r of s.rows) { const d = r.equity - row.equity; if (d > from && d <= to) { w += r.hand.weight; m += r.hand.weight * move(r); } } return w > 0 ? m / w : null; };
  const above = near(0.015, 0.1);
  const below = near(-0.1, -0.015);
  const verb = facing ? 'continue' : 'bet';
  // what he folds to your average hand, to set against what he folds to this one
  const usual = (a) => { let w = 0, f = 0; for (const r of s.rows) if (r.folds[a] != null) { w += r.hand.weight; f += r.hand.weight * r.folds[a]; } return w > 0 ? f / w : null; };
  const cardsHelp = (a) => {
    const mine = row.folds[a]; const avg = usual(a);
    if (mine == null || avg == null || !hand.cards) return '';
    if (mine - avg > 0.015) return `Your cards help: they take some of his calling hands out of his range, so he folds ${pct(mine)} to you against ${pct(avg)} to your average hand.`;
    if (avg - mine > 0.015) return `Your cards are no help here: they take away hands he would have folded, so he folds ${pct(mine)} to you against ${pct(avg)} to your average hand.`;
    return '';
  };
  let line = '';

  if (facing) {
    const edge = row.equity - s.need;
    const price = `He bet ${Math.round(toCall)} into ${Math.round(pot - toCall)}, so a call has to win ${pct(s.need)} of the time.`;
    const raising = mainBet >= 0 && betting > 0.1;
    const called = mainBet >= 0 ? row.whenCalled[mainBet] : null;
    const hisBluffs = mostly((his) => (beaten(his) ? 1 : 0));
    const hisValue = mostly((his) => (ahead(his) ? 1 : 0));
    if (raising && called != null && called >= 0.5) {
      line = `You raise for value with ${what}. Even against the hands that continue against ${label(mainBet)} you are ahead ${pct(called)} of the time.`;
      const n = row.next[mainBet];
      if (n) say('raise', `He folds ${pct(n.fold)} to the raise, calls with worse ${pct(n.callWorse)} and calls with better ${pct(n.callBetter)}${n.more > 0.005 ? `, and raises again ${pct(n.more)}` : ''}. Just calling would win the pot as it stands; the raise gets paid by the worse hands that will not fold.`);
    } else if (raising) {
      line = `You raise as a bluff with ${what}. Calling would win only ${pct(row.equity)} of the time, and he folds ${pct(row.folds[mainBet] ?? 0)} to ${label(mainBet)} where the raise needs ${pct(s.sizes[mainBet].needsFolds)}.`;
      say('raise', cardsHelp(mainBet));
    }
    if (Math.abs(edge) <= 0.02) {
      const continues = 1 - s.mix[fold];
      if (!line) line = `${what.charAt(0).toUpperCase() + what.slice(1)} is a pure bluff-catcher here. ${price} You beat ${pct(row.equity)} of the hands he bets, which is that price almost exactly.`;
      say('price', `You beat his bluffs${with_(hisBluffs, ': ')} and lose to everything he bets for value${with_(hisValue, ': ')}. So calling and folding make the same money with this hand: what it does is not about the hand, it is about how many of your bluff-catchers have to call.`);
      // which bluff-catchers call: the cards they hold
      const peers = s.rows.filter((r) => r !== row && Math.abs(r.equity - s.need) <= 0.02);
      let cards = '';
      if (peers.length && hand.cards) {
        const meanBetter = peers.reduce((t, r) => t + r.removesBetter, 0) / peers.length;
        const meanWorse = peers.reduce((t, r) => t + r.removesWorse, 0) / peers.length;
        const mine = move(row); const theirs = peers.reduce((t, r) => t + r.hand.weight * move(r), 0) / peers.reduce((t, r) => t + r.hand.weight, 0);
        const good = (row.removesBetter - meanBetter) - (row.removesWorse - meanWorse);
        if (Math.abs(good) >= 0.02) cards = ` Yours ${good > 0 ? 'are good ones to call with' : 'are poor ones to call with'}: they take out ${pct(row.removesBetter)} of his value and ${pct(row.removesWorse)} of his bluffs, where your other bluff-catchers take out ${pct(meanBetter)} and ${pct(meanWorse)}. That is why this one continues ${pct(mine)} of the time and they continue ${pct(theirs)}.`;
      }
      say('defence', `If you folded all of them his bluffs would always win, so your range has to continue ${pct(continues)} of the time against this bet. The hands that beat some of his value call first; the bluff-catchers fill the rest.${cards}`);
    } else if (edge > 0) {
      if (!line) line = `You call with ${what}. ${price} You beat ${pct(row.equity)} of the hands he bets${with_(hisBluffs)}: ${Math.round(100 * edge)} points clear.`;
      if (!raising && called != null && row.equity > 0.7 && mainBet >= 0) say('no-raise', `You do not raise. Against ${label(mainBet)} he would fold what you beat and continue with hands that beat you ${pct(1 - called)} of the time: the raise wins nothing more from the worse hands and loses more to the better ones.`);
    } else {
      if (!line) line = `You fold ${what}. ${price} You beat only ${pct(row.equity)} of the hands he bets, ${Math.round(-100 * edge)} points short of the price.`;
      say('price', hisBluffs ? `All you beat is ${hisBluffs.replace(/ \(\d+%\)/g, '')} in his betting range, and there are not enough of them: you are ${Math.round(-100 * edge)} points short.` : '');
    }
    if (above != null && below != null && above - below >= 0.4 && move(row) > 0.02 && move(row) < 0.98) say('line', `You are right at the line: hands a touch stronger continue ${pct(above)} of the time, a touch weaker ${pct(below)}.`);
  } else {
    const called = mainBet >= 0 ? row.whenCalled[mainBet] : null;
    const afterCheck = check >= 0 ? row.next[check] : null;
    const facesBet = afterCheck ? afterCheck.more : null;
    const opening = `You have ${what}, ${standing}: it beats ${pct(row.equity)} of his range.`;
    const checks = check >= 0 ? hand.strategy[check] : 0;
    if (betting > 0.1 && mainBet >= 0) {
      const n = row.next[mainBet];
      const size = s.sizes[mainBet];
      const paysOff = mostly((his) => (beaten(his) ? his.answers[mainBet]?.call ?? 0 : 0));
      const beatsYou = mostly((his) => (ahead(his) ? 1 - (his.answers[mainBet]?.fold ?? 1) : 0));
      if (called != null && called >= 0.45) {
        const thin = called < 0.55;
        line = thin
          ? `${opening} It is about the weakest hand you can bet for value: when he does not fold to ${label(mainBet)} you win ${pct(called)}, a coin flip.`
          : `${opening} You bet it for value: when he does not fold to ${label(mainBet)} you are still ahead ${pct(called)} of the time.`;
        say('value', `He pays you with worse ${pct(n?.callWorse ?? 0)} of the time${with_(paysOff)}, and continues with better ${pct((n?.callBetter ?? 0) + (n?.more ?? 0) * (1 - called))}${with_(beatsYou)}.${thin ? ' Anything weaker is called by better too often to bet for value.' : ''}`);
        // why this size: what calls the other sizes
        const other = bets.filter((a) => a !== mainBet && row.whenCalled[a] != null);
        const bigger = other.filter((a) => actions[a].add > actions[mainBet].add).sort((a, b) => actions[a].add - actions[b].add)[0];
        const smaller = other.filter((a) => actions[a].add < actions[mainBet].add).sort((a, b) => actions[b].add - actions[a].add)[0];
        if (bigger != null && hand.strategy[bigger] < 0.1 && row.whenCalled[bigger] < called - 0.03) say('size', `It does not go bigger: against what continues versus ${label(bigger)} you would be ahead only ${pct(row.whenCalled[bigger])}. The bigger the bet, the stronger the hands that pay it.`);
        else if (smaller != null && hand.strategy[smaller] < 0.1 && row.whenCalled[mainBet] >= 0.6) say('size', `It can take the big size: even the hands that continue against ${label(mainBet)} lose to you ${pct(called)} of the time, so a smaller bet would only win less from them.`);
        if (checks > 0.1) say('trap', `It also checks ${pct(checks)} of the time. He bets ${pct(facesBet ?? 0)} of the time when checked to, and if your checks never held a hand like this he could do that freely.`);
      } else if (isBluff(row, mainBet)) {
        line = row.equity < 0.03
          ? `${opening} You bluff with it: checking never wins, so the bet gives up nothing you would have won.`
          : `${opening} You bluff with it: checking wins only ${pct(row.equity)}, so there is little to lose by betting.`;
        const folded = mostly((his) => his.answers[mainBet]?.fold ?? 0);
        say('bluff', `${label(mainBet)} needs him to fold ${pct(size.needsFolds)} of the time to pay for itself, and against this hand he folds ${pct(n?.fold ?? 0)}${with_(folded)}. ${cardsHelp(mainBet)}`);
        if (checks > 0.1) say('quota', `It does not bluff every time because you hold more hands this weak than you can bluff with. At this size bluffs can be about ${pct(size.wanted)} of your bets before he simply calls you down, and they are ${pct(size.bluffShare)} already; the rest of your weak hands have to give up.`);
      } else {
        line = `${opening} That is too weak to bet for value, since called by ${label(mainBet)} you win only ${pct(called ?? 0)}, and too strong to give up on. You bet small to set the price yourself.`;
        say('block', `If you check he bets ${pct(facesBet ?? 0)} of the time and picks the size, and you are left guessing with a hand that beats ${pct(row.equity)} of his range. Against ${label(mainBet)} he folds ${pct(n?.fold ?? 0)}, calls with worse ${pct(n?.callWorse ?? 0)} and raises only ${pct(n?.more ?? 0)}.`);
        if (checks > 0.1) say('mix', `It checks ${pct(checks)} of the time as well: the two lines are worth the same to it, and your checking range needs some hands that can call a bet.`);
      }
    }
    if (check >= 0 && checks > 0.1 && betting <= 0.1) {
      const probe = mainBet >= 0 ? mainBet : bets[0];
      const wouldWin = probe >= 0 ? row.whenCalled[probe] : null;
      const probeLabel = probe >= 0 ? label(probe) : 'a bet';
      if (row.equity >= 0.75 && wouldWin != null && wouldWin >= 0.5) {
        line = `${opening} It could bet for value and checks instead: he bets ${pct(facesBet ?? 0)} of the time when checked to, straight into it.`;
        say('trap', `Your checks need hands like this. Hands of exactly this strength check ${pct(level.mix[check])} of the time across your range, and that is what stops him betting at every check.`);
      } else if (row.equity >= BLUFF) {
        const foldsOut = probe >= 0 ? mostly((his) => (beaten(his) ? his.answers[probe]?.fold ?? 0 : 0)) : '';
        const callsYou = probe >= 0 ? mostly((his) => (ahead(his) ? 1 - (his.answers[probe]?.fold ?? 1) : 0)) : '';
        line = `${opening} You check and take the showdown, because a bet gets called by the wrong hands: of what continues against ${probeLabel} you beat only ${pct(wouldWin ?? 0)}.`;
        say('showdown', `Betting folds out what you beat${with_(foldsOut, ': ')} and gets paid by what beats you${with_(callsYou, ': ')}. Checked, he checks behind ${pct(afterCheck?.check ?? 0)} of the time and you win your share at showdown; the ${pct(facesBet ?? 0)} he bets is a separate decision.`);
      } else {
        const size = probe >= 0 ? s.sizes[probe] : null;
        // the hands that do the bluffing, to set against this one
        let w = 0, f = 0, e = 0; for (const r of s.rows) { const b = probe >= 0 && isBluff(r, probe) ? r.hand.weight * r.hand.strategy[probe] : 0; if (b > 0 && r.folds[probe] != null) { w += b; f += b * r.folds[probe]; e += b * r.equity; } }
        const theirFold = w > 0 ? f / w : null; const theirEquity = w > 0 ? e / w : null;
        line = `${opening} You give up with it${row.equity >= 0.03 ? `: checked down it still wins ${pct(row.equity)}, and a bluff would throw that away` : ''}.`;
        const mineFold = probe >= 0 ? row.folds[probe] : null;
        let why = '';
        if (size && theirFold != null && mineFold != null) {
          if (theirEquity != null && row.equity - theirEquity > 0.03) why = `The hands you bluff with instead win ${pct(theirEquity)} when checked, less than this one, so they lose nothing by betting.`;
          else if (theirFold - mineFold > 0.015) why = `The hands you bluff with instead have better cards for it: he folds ${pct(theirFold)} to them and ${pct(mineFold)} to this one, because this hand holds cards his folding hands would need.`;
          else why = `Nothing makes it a worse bluff than the hands you do bluff with; there are simply more hands this weak than you can bluff.`;
        }
        say('give-up', `${why}${size ? ` At ${probeLabel} bluffs can be about ${pct(size.wanted)} of your bets, and they are ${pct(size.bluffShare)} already.` : ''}`);
      }
    }
    if (above != null && below != null && Math.abs(above - below) >= 0.4 && betting > 0.02 && betting < 0.98 && row.equity > BLUFF) say('line', `You are right at the line: hands a touch stronger bet ${pct(above)} of the time, a touch weaker ${pct(below)}.`);
  }

  // What the choice costs, from the solver's values
  let status = 'unknown';
  if (row.gaps) {
    const ok = actions.filter((_, a) => row.fine[a]);
    status = ok.length > 1 ? 'optional' : 'forced';
    const worst = row.gaps.map((g, a) => ({ g, a })).filter((x) => x.g > MISTAKE).sort((x, y) => x.g - y.g)[0];
    if (status === 'forced' && worst) say('cost', `It is not close: the next best play, ${label(worst.a)}, loses ${(100 * worst.g).toFixed(1)}% of the pot with this hand.`);
  }

  // Hands of exactly its strength, and what its cards change
  if (level.rows.length > 1 && !(facing && Math.abs(row.equity - s.need) <= 0.02)) {
    const others = level.rows.filter((r) => r !== row);
    const mine = move(row);
    const theirs = others.reduce((t, r) => t + r.hand.weight * move(r), 0) / others.reduce((t, r) => t + r.hand.weight, 0);
    const meanBetter = others.reduce((t, r) => t + r.removesBetter, 0) / others.length;
    const meanWorse = others.reduce((t, r) => t + r.removesWorse, 0) / others.length;
    const differs = Math.abs(row.removesBetter - meanBetter) + Math.abs(row.removesWorse - meanWorse) >= 0.02;
    const n = others.length;
    if (Math.abs(mine - theirs) > 0.15 && hand.cards && differs) {
      say('blockers', `Why this one and not the ${n === 1 ? 'other hand' : `${n} other hands`} of exactly its strength, which ${verb} ${pct(theirs)} of the time against its ${pct(mine)}? The cards: yours take out ${pct(row.removesBetter)} of the hands that beat you and ${pct(row.removesWorse)} of the hands you beat; theirs take out ${pct(meanBetter)} and ${pct(meanWorse)}.`);
    } else if (Math.abs(mine - theirs) > 0.15 && hand.cards) {
      say('arbitrary', `The ${n === 1 ? 'other hand' : `${n} other hands`} of exactly its strength ${verb} ${pct(theirs)} of the time against its ${pct(mine)}, and their cards do nothing different. Read them as one hand: together they ${verb} ${pct(level.mix.reduce((t, x, a) => t + (facing ? (a === fold ? 0 : x) : (bets.includes(a) ? x : 0)), 0))}, and which of them does it is the solver's bookkeeping.`);
    }
  }
  if (!line) { line = reasons[0]?.text ?? ''; reasons.shift(); }
  return { name, strategy: hand.strategy, status, equity: row.equity, line, reasons };
}
