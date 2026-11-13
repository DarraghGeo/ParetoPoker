import { riverWorth } from './derived.js';
import { NUM_COMBOS, COMBO_A, COMBO_B } from './cards.js';
import { candidatesInOrder, deal, sumOf } from './HandSelector.js';
import { DRAW, PAIR, classifyHands } from './handClass.js';

/**
 * Hand selection from the napkinpoker hand-selection guide (issue #271): which hands fill the
 * value, bluff, bluff-catching and raise frequencies, from stated poker reasons that were
 * measured against a solver. The guide's sections are marked §1 to §4 below.
 *
 * The guide's words, as used here:
 * - His value: his hands that are ahead of our whole range more often than not. His bluffs: the rest.
 * - His continues: the part of his range that calls or raises our bet, his strongest hands.
 * - Equity spread: how a hand does against his strong hands compared with his weak ones. Flat is
 *   about the same against both; steep only beats the weak ones.
 * - Blocking: holding cards his hands need. What matters is which part of his range we block.
 * - Twins (same class, draws and equity) get the same answer: equal scores are filled evenly.
 *
 * Where the guide gives an order but no numbers, the weights below are this implementation's
 * choice. They are listed in `NapkinSelector.WEIGHTS`.
 */
export class NapkinSelector {
  static WEIGHTS = {
    /**
     * §3 marks, each weighted by how far the guide's table separates must-calls from must-folds
     * on it: margin 0.20 against 0.07, equity against his value 0.19 against 0.06, blocking his
     * value 0.13 against 0.06, good rivers 0.06 against 0.03, bad rivers 0.09 against 0.11.
     */
    catcher: { margin: 0.13, versusValue: 0.13, blocksValue: 0.07, goodRivers: 0.03, badRivers: 0.02 },
    /**
     * Not from the guide: equity against the range he started the hand with, weighted like the
     * margin. The other marks rest on a model of his betting range, and when that model makes two
     * hands look alike (a straight and ace high can both "only beat his bluffs") this keeps the
     * stronger one ahead. Set `priorStrength: 0` in the constructor to turn it off.
     */
    priorStrength: 0.13,
    /** §4 Newman sizes: raise size in pots -> equity needed against his betting range. */
    newman: [[0.5, 0.8], [1, 0.9], [3, 0.97]],
    /** §2 turn: the range-equity gap, and the stack-to-pot ratios, at which the spot fully favours draws or air. */
    rangeGap: 0.05,
    shallow: 1.25,
    deep: 5,
  };

  /**
   * @param {Object} [options]
   * @param {number} [options.valueThreshold] §1: value beats more than this share of his continues.
   *   Default 0.7. The guide says half; measured against the solver's best response, 0.7 loses
   *   about a third less on rivers and turns (the range that really continues is stronger than
   *   the engine's model of it).
   * @param {'classes'|'ehs2'|'ehs2-ip'} [options.turnCalls] 'classes' (default): the guide's class
   *   order. 'ehs2': E[HS^2] plus equity against his value, which matches the solver's turn calls
   *   best (0.99) but lost more when exploited out of position; 'ehs2-ip' uses it in position only,
   *   and only when the stack behind is at least `ehs2Depth` pots.
   * @param {null|'call'|'value'|'both'} [options.worth] With cards to come, order hands by their
   *   river worth (src/derived.js, `riverWorth`: the average over the river cards of what the
   *   hand's equity is worth there) in place of the guide's marks: for calling, for value bets
   *   and raises, or both. Default: off.
   * @param {number} [options.worthBet] The river bet the worth is taken for, in pots. Default 0.75.
   * @param {number} [options.ehs2Depth] Default 2. With less behind the class order does better
   *   (9.9 against 11.7 at 1.5 pots; 18.7 against 16.9 at 4 pots, in position on the turn sets).
   * @param {'weakest'|'air'} [options.riverBluffs] 'weakest' (default): the hand with the least
   *   equity bluffs first, and blockers choose among twins. 'air': the guide's order, air with
   *   blockers to his calls first. Measured on rivers, 'weakest' follows the solver's bluffs better.
   * @param {'draws'|'roles'} [options.turnBluffs] 'draws' (default): turn bluffs by one score,
   *   draw equity minus strength now minus twice the share of his folds the hand blocks. 'roles':
   *   the guide's six roles. Measured on turns, 'draws' follows the solver's bluffs far better.
   * @param {number} [options.twinEquity] How close in equity two river hands must be to count as
   *   twins. Default 0.02.
   * @param {[number, number]} [options.thinValue] §1: equity against his range that counts as thin
   *   value, which checks out of position on the river. Default [0.5, 0.7]. null bets it.
   * @param {number} [options.trapShare] §1: nut hands as a share of the value that checks out of
   *   position on the river (the guide says 1/6). Default 0: checking value is the mixer's job.
   * @param {number} [options.airEquity] §2: equity below which a hand with no pair and no draw is air. Default 0.2.
   * @param {number} [options.callFloor] A hand needs this share of the pot odds in equity to call,
   *   and his continues are assumed to as well (as in EquitySelector). Default 0.5.
   * @param {number} [options.drawBehind] §3: a draw calls ahead of made hands only when at least
   *   this many pots are left behind after the call (a hit has to collect another bet). Default 1.
   * @param {number} [options.priorStrength] Weight, among the bluff-catcher marks, of equity
   *   against the range he started with. See WEIGHTS.priorStrength. 0 uses the guide's marks alone.
   */
  constructor({ valueThreshold = 0.7, thinValue = [0.5, 0.7], trapShare = 0, airEquity = 0.2, callFloor = 0.5, priorStrength = NapkinSelector.WEIGHTS.priorStrength, drawBehind = 1, riverBluffs = 'weakest', twinEquity = 0.02, turnBluffs = 'draws', turnCalls = 'classes', ehs2Depth = 2, worth = null, worthBet = 0.75 } = {}) {
    Object.assign(this, { valueThreshold, thinValue, trapShare, airEquity, callFloor, priorStrength, drawBehind, riverBluffs, twinEquity, turnBluffs, turnCalls, ehs2Depth, worth, worthBet });
    this.worths = new WeakMap();
    this.cache = new WeakMap();
  }

  // --- §1 value bets, §4 value raises ---------------------------------------------------------

  value(context, wager) {
    const view = this.#view(context);
    const sized = this.#sized(context, view, wager);
    // Who qualifies: hands that beat more than half of his continues
    const threshold = context.tuning?.valueThreshold ?? this.valueThreshold;
    const qualifies = (i) => sized.versusContinues[i] > threshold;
    return context.facing ? this.#valueRaises(context, view, wager, qualifies) : this.#valueBets(context, view, sized, qualifies);
  }

  #valueBets(context, view, sized, qualifies) {
    const { hero, strength } = view;
    const thinChecks = context.position === 'oop' && context.street === 'river' && this.thinValue;
    const worth = this.#worth(context, 'value');
    const scores = new Float64Array(NUM_COMBOS).fill(NaN);
    let checked = 0;
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (!(hero[i] > 0) || !qualifies(i)) continue;
      // Thin value checks out of position on the river: worse hands fold and better ones continue
      if (thinChecks && strength[i] >= this.thinValue[0] && strength[i] <= this.thinValue[1]) {
        checked += hero[i];
        continue;
      }
      // Flat value first (equity that holds against his strong hands), then value that does
      // not block the hands that call it
      scores[i] = worth ? worth[i] : sized.flatness[i] - 0.1 * sized.blocksContinues[i];
    }
    if (!thinChecks || !(this.trapShare > 0) || !(checked > 0)) return scores;

    // Some of the nuts check too, to check-raise: taken from the very top, sized so that they
    // are `trapShare` of the value that checks
    const top = scores.map((s, i) => (Number.isNaN(s) ? NaN : strength[i]));
    const trapped = new Float64Array(NUM_COMBOS);
    const target = (checked * this.trapShare) / (1 - this.trapShare);
    deal(candidatesInOrder(top, hero), top, hero, new Float64Array(NUM_COMBOS).fill(1), trapped, target);
    return { hands: scores, limit: trapped.map((t) => 1 - t) };
  }

  #valueRaises(context, view, wager, qualifies) {
    const { hero, strength } = view;
    const scores = new Float64Array(NUM_COMBOS).fill(NaN);
    if (context.street === 'river') {
      // Newman: the more equity against his betting range, the bigger the raise a hand supports
      const { spot } = context;
      const pots = (wager.add - spot.toCall) / (spot.pot + spot.toCall);
      const needed = newmanEquity(pots);
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (hero[i] > 0 && qualifies(i) && strength[i] >= needed) scores[i] = strength[i];
      }
      return scores;
    }
    // Turn and flop: the value hands are close to interchangeable; equity against his value
    // orders them a little
    const worth = this.#worth(context, 'value');
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (hero[i] > 0 && qualifies(i)) scores[i] = worth ? worth[i] : finite(view.versusHisValue[i], strength[i]);
    }
    return scores;
  }

  // --- §2 bluffs, §4 bluff raises -------------------------------------------------------------

  bluff(context, wager) {
    const view = this.#view(context);
    const { hero, strength, classes } = view;
    const scores = new Float64Array(NUM_COMBOS).fill(NaN);

    if (context.facing) {
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (!(hero[i] > 0)) continue;
        // River: hands that would fold, the weakest first (they take the biggest sizes).
        // Turn and flop: a bluff raise is a draw, which can still win when he calls. When the
        // draws run out the weakest hands make up the engine's frequency, as on the river.
        if (context.street !== 'river' && classes.draw[i]) scores[i] = 10 * classes.draw[i] + strength[i];
        else scores[i] = -strength[i];
      }
      return scores;
    }

    const sized = this.#sized(context, view, wager);
    const kept = (i) => finite(sized.versusContinues[i], 0); // equity that survives a call
    const isAir = (i) => !classes.pair[i] && !classes.draw[i] && strength[i] < this.airEquity;

    if (context.street === 'river') {
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (!(hero[i] > 0)) continue;
        if (this.riverBluffs === 'air') {
          // The guide's order: air first, the hands that block his calls ahead; then the weakest
          scores[i] = isAir(i) ? 10 + sized.blocksContinues[i] : -strength[i];
        } else {
          // Measured on the river: the weakest hand bluffs first, whatever it blocks. Blockers
          // only choose among twins (hands within `twinEquity` of each other): block his calls,
          // do not block his folds.
          const twin = Math.round(strength[i] / this.twinEquity);
          scores[i] = -twin + 0.4 * (sized.blocksContinues[i] - sized.blocksFolds[i]);
        }
      }
      return scores;
    }

    const order = this.#roleOrder(context, view);

    if (context.street === 'flop') {
      const drawsFirst = order.nutDraw > order.air;
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (!(hero[i] > 0)) continue;
        // Draws first (two cards to come), then blockers to his strong hands. A pair has
        // showdown value to give up, so pairs come last, the weakest first (as on the river).
        // When the spot favours pure bluffs (see #roleOrder), the blockers go ahead of the draws.
        if (classes.draw[i]) scores[i] = (drawsFirst ? 20 : 0) + classes.draw[i] + kept(i);
        else if (!classes.pair[i]) scores[i] = 10 + sized.blocksContinues[i];
        else scores[i] = -10 - strength[i];
      }
      return scores;
    }

    if (this.turnBluffs === 'draws') {
      // Measured on the turn: the hands the solver must bluff are behind now, win from behind,
      // and do not hold the cards his folding hands hold. One score, no roles.
      const { drawEquity, strengthNow } = context.features;
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (hero[i] > 0) scores[i] = drawEquity[i] - strengthNow[i] - 2 * sized.blocksFolds[i];
      }
      return scores;
    }

    // Turn, the guide's way: six roles, each picked by its own mark. Which roles go first depends on the spot.
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (!(hero[i] > 0)) continue;
      let role;
      let mark;
      if (classes.draw[i] === DRAW.NUT) {
        role = 'nutDraw';
        mark = 0; // the role itself
      } else if (classes.draw[i] === DRAW.STRONG) {
        role = 'draw';
        mark = 0; // about equal
      } else if (classes.draw[i] === DRAW.GUTSHOT) {
        role = 'gutshot';
        mark = kept(i);
      } else if (classes.pair[i]) {
        role = 'made';
        mark = sized.flatness[i] - strength[i]; // flattest spread, least showdown value now
      } else if (isAir(i)) {
        role = 'air';
        mark = sized.blocksContinues[i]; // most blockers to his calls
      } else {
        role = 'overcards';
        mark = kept(i) + 0.5 * sized.blocksContinues[i]; // a flat spread and blockers
      }
      scores[i] = 10 * order[role] + mark;
    }
    return scores;
  }

  /**
   * A rank per bluff role, higher first. When he is ahead in range or stacks are deep,
   * hands that keep equity when called go first; when we are ahead or stacks are shallow, pure
   * bluffs do. Made hands, which have showdown value to lose, go last either way.
   */
  #roleOrder(context, view) {
    const { rangeGap, shallow, deep } = NapkinSelector.WEIGHTS;
    const { spot } = context;
    const heIsAhead = clamp((0.5 - view.rangeEquity) / rangeGap);
    const spr = (spot.stack ?? Infinity) / spot.pot;
    const depth = clamp((2 * Math.log(spr / shallow)) / Math.log(deep / shallow) - 1);
    const drawsFirst = heIsAhead + depth > 0 || (heIsAhead + depth === 0 && heIsAhead > 0);
    return drawsFirst
      ? { nutDraw: 6, draw: 5, gutshot: 4, overcards: 3, air: 2, made: 1 }
      : { air: 6, overcards: 5, gutshot: 4, draw: 3, nutDraw: 2, made: 1 };
  }

  // --- §3 bluff-catching ----------------------------------------------------------------------

  call(context) {
    const view = this.#view(context);
    const { hero, strength, classes } = view;
    const weights = NapkinSelector.WEIGHTS.catcher;
    const floor = context.floor(this.callFloor, context.potOdds);
    const rivers = context.street === 'turn' ? this.#riverSwings(context, view) : null;
    const worth = this.#worth(context, 'call');
    const scores = new Float64Array(NUM_COMBOS).fill(NaN);

    for (let i = 0; i < NUM_COMBOS; i++) {
      if (!(hero[i] > 0) || !(strength[i] >= floor)) continue;
      const versusValue = finite(view.versusHisValue[i], strength[i]);
      // What puts one bluff-catcher ahead of another, strongest mark first: its margin over the
      // price, its equity against his value, blocking his value (blocking his bluffs does not
      // matter), and on the turn the rivers that help against those that hurt
      let marks = weights.margin * (strength[i] - context.potOdds)
        + weights.versusValue * versusValue
        + weights.blocksValue * view.blocksHisValue[i]
        + this.priorStrength * finite(context.priorStrength[i], strength[i]);
      if (rivers) marks += weights.goodRivers * rivers.gain[i] - weights.badRivers * rivers.loss[i];

      // Our roles when he bets: value beats half his value, a bluff-catcher beats half his
      // bluffs, the rest is weak. Value continues first on every street.
      let tier;
      if (worth) {
        // One order for every hand: what its equity is worth over the river cards
        tier = 2;
        marks = worth[i];
      } else if (versusValue >= 0.5) {
        tier = 5;
      } else if (context.street === 'river') {
        const catcher = Number.isNaN(view.versusHisBluffs[i]) || view.versusHisBluffs[i] >= 0.5;
        // Weak hands beat neither. Without a tuner they never call; with one they come last
        if (!catcher && !context.tuning) continue;
        tier = catcher ? 2 : 1;
      } else if (context.street === 'turn' && (this.turnCalls === 'ehs2' || (this.turnCalls === 'ehs2-ip' && context.position === 'ip' && context.profile.spr >= this.ehs2Depth))) {
        // Measured on the turn: the hands the solver must call have the highest E[HS^2] (they
        // end up strong often, whatever they are now) and the most equity against his value
        tier = 2;
        marks = context.features.ehs2[i] + versusValue;
      } else {
        tier = this.#classTier(context, classes, i);
        // Weaker pairs are twins that equity alone orders
        if (tier === 2) marks = strength[i];
      }
      scores[i] = 100 * tier + marks;
    }
    return scores;
  }

  /** The river worth of every hand, when the option asks for it for this role and cards are to come. */
  #worth(context, role) {
    if (context.street === 'river' || !(this.worth === role || this.worth === 'both')) return null;
    let worth = this.worths.get(context);
    if (!worth) this.worths.set(context, worth = riverWorth({ equity: context.calculator, board: context.board, hero: context.hero, villain: context.villain, bet: this.worthBet }));
    return worth;
  }

  /**
   * Turn and flop: who continues first, by hand class. He bets again on the next street, so
   * hands that can stand that go first: 4 draws, 3 top pair or better, 2 weaker pairs, 1 high cards.
   */
  #classTier(context, classes, i) {
    const pair = classes.pair[i];
    if (pair === PAIR.TOP_OR_BETTER) return 3;
    if (classes.draw[i]) {
      // A draw goes first because a hit collects his next bet. With too little behind after
      // the call, or out of position on the turn, it is no better than its equity.
      const { spot } = context;
      const behind = ((spot.stack ?? Infinity) - spot.toCall) / (spot.pot + spot.toCall);
      if (behind < this.drawBehind || (context.street === 'turn' && context.position === 'oop')) return 2;
      return 4;
    }
    if (context.street === 'flop') {
      // With two cards to come, board pairs and pocket pairs above the bottom card move up with top pair
      if (pair === PAIR.BOARD_PAIR || pair === PAIR.POCKET_MIDDLE) return 3;
      return 1; // pocket pairs below the board, and high cards
    }
    return pair ? 2 : 1;
  }

  /** Average equity a hand gains on the rivers that help it and loses on those that hurt. */
  #riverSwings(context, view) {
    const { hero, strength } = view;
    const gain = new Float64Array(NUM_COMBOS);
    const loss = new Float64Array(NUM_COMBOS);
    const count = new Float64Array(NUM_COMBOS);
    for (let card = 0; card < 52; card++) {
      if (context.board.includes(card)) continue;
      const equity = context.calculator.against([...context.board, card], context.villain, hero);
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (!(hero[i] > 0) || Number.isNaN(equity[i])) continue;
        const change = equity[i] - strength[i];
        if (change > 0) gain[i] += change;
        else loss[i] -= change;
        count[i]++;
      }
    }
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (count[i]) {
        gain[i] /= count[i];
        loss[i] /= count[i];
      }
    }
    return { gain, loss };
  }

  // --- What is worked out once per decision, and once per size --------------------------------

  #view(context) {
    let view = this.cache.get(context);
    if (view) return view;
    const { hero, villain, strength, villainStrength } = context;
    // His value is ahead of our whole range more often than not; his bluffs are the rest
    const hisValue = villain.map((w, i) => (villainStrength[i] > 0.5 ? w : 0));
    const hisBluffs = villain.map((w, i) => w - hisValue[i]);
    let equity = 0;
    for (let i = 0; i < NUM_COMBOS; i++) if (hero[i] > 0 && !Number.isNaN(strength[i])) equity += hero[i] * strength[i];
    view = {
      hero,
      strength,
      classes: classifyHands(context.board, hero),
      versusHisValue: context.equityAgainst(hisValue),
      versusHisBluffs: context.equityAgainst(hisBluffs),
      blocksHisValue: blockedShare(hisValue),
      rangeEquity: equity / (sumOf(hero) || 1),
      sized: new Map(),
    };
    this.cache.set(context, view);
    return view;
  }

  /** How each hand does against the part of his range that continues against one size. */
  #sized(context, view, wager) {
    let sized = view.sized.get(wager.to);
    if (sized) return sized;
    const continues = context.continuingRange(wager, context.floor(this.callFloor, wager.potOdds));
    const folds = context.villain.map((w, i) => w - continues[i]);
    const versusContinues = context.equityAgainst(continues);
    const versusFolds = context.equityAgainst(folds);
    sized = {
      versusContinues,
      // 0 is flat (as good against the hands that continue as against those that fold); negative is steep
      flatness: versusContinues.map((e, i) => e - finite(versusFolds[i], e)),
      blocksContinues: blockedShare(continues),
      blocksFolds: blockedShare(folds),
    };
    view.sized.set(wager.to, sized);
    return sized;
  }
}

/** For each combo, the share of a range (weights per combo) that holds one of its cards. */
function blockedShare(range) {
  const perCard = new Float64Array(52);
  let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) {
    if (range[i] > 0) {
      total += range[i];
      perCard[COMBO_A[i]] += range[i];
      perCard[COMBO_B[i]] += range[i];
    }
  }
  const out = new Float64Array(NUM_COMBOS);
  if (total > 0) {
    for (let i = 0; i < NUM_COMBOS; i++) out[i] = (perCard[COMBO_A[i]] + perCard[COMBO_B[i]] - range[i]) / total;
  }
  return out;
}

/** Equity against his betting range needed to raise by `pots` pots, between Newman's points. */
function newmanEquity(pots) {
  const points = NapkinSelector.WEIGHTS.newman;
  if (pots >= points.at(-1)[0]) return points.at(-1)[1];
  for (let k = points.length - 2; k >= 0; k--) {
    const [x0, y0] = points[k];
    const [x1, y1] = points[k + 1];
    // Below the smallest point the first segment is carried on down
    if (pots >= x0 || k === 0) return y0 + ((pots - x0) * (y1 - y0)) / (x1 - x0);
  }
  return points[0][1];
}

const clamp = (x) => Math.max(-1, Math.min(1, x));
const finite = (x, otherwise) => (Number.isNaN(x) ? otherwise : x);
