import { COMBO_A, COMBO_B, NUM_COMBOS, comboId } from '../cards.js';
import { RangeStrategist } from '../RangeStrategist.js';
import { SolverBridge } from './SolverBridge.js';

const STREETS = { 3: 'flop', 4: 'turn', 5: 'river' };
const POSITIONS = ['oop', 'ip'];

/**
 * Plays the engine against postflop-solver on one game tree and scores it exactly.
 *
 * Rather than dealing hands, the engine's strategy is written into the solver's tree (node
 * locking), which gives expected values with no sampling noise:
 *
 * - `gto`: both players at equilibrium. The baseline.
 * - `versusGto`: the engine against the solver's equilibrium strategy.
 * - `exploited`: the engine against the solver's best response to it, the worst case.
 *
 * The engine models the opponent as another copy of itself to track their range down the tree.
 */
export class SolverMatch {
  /**
   * @param {Object} game See SolverBridge#init: oopRange, ipRange, board, pot, stack, betSizes.
   * @param {Object} [options]
   * @param {RangeStrategist} [options.strategist]
   * @param {RangeStrategist} [options.opponent] The parts used to model the opponent's play when
   *   tracking his range. Default: the same as `strategist`. Giving another keeps a rule for one
   *   seat from changing the other seat's picture of its opponent.
   * @param {SolverBridge} [options.bridge]
   */
  constructor(game, { strategist = new RangeStrategist(), opponent = null, bridge = null } = {}) {
    this.game = game;
    this.strategist = strategist;
    // How the engine pictures the other seat's play when tracking his range. By default a copy of itself.
    this.opponent = opponent ?? strategist;
    this.bridge = bridge;
    this.ownsBridge = !bridge;
  }

  /**
   * @param {'oop'|'ip'} hero The seat the engine plays.
   * @param {Object} [options]
   * @param {number} [options.iterations] Solver iterations for the equilibrium.
   * @param {number} [options.target] Exploitability to stop at, as a share of the pot.
   * @param {'engine'|'solver'} [options.ranges] 'engine' (default): the engine tracks both ranges
   *   itself, modelling the opponent as a copy of itself. 'solver': at every decision it is given
   *   the solver's equilibrium range for the opponent, which takes estimating his range out of
   *   the result. Its own range is still the one its own play has produced.
   * @param {'engine'|'solver'} [options.frequencies] With `ranges: 'solver'`: 'solver' also gives
   *   it the solver's action frequencies at the decision, so that only the choice of hands is
   *   the engine's.
   * @param {'engine'|'solver'|'solver-mixed'} [options.hands] Whose choice of hands fills the
   *   frequencies. 'solver': the solver's order (the hands it takes each action with most often,
   *   first), dealt the way a selector's order is, each hand all or nothing. 'solver-mixed': the
   *   solver's hands with its own mixing, scaled to the frequencies. With the other two options
   *   this separates what the engine does: estimate his range, set frequencies, choose hands,
   *   and deal them out. All three from the solver with 'solver-mixed' is the solver's strategy.
   *   'solver-by-order': the solver's frequencies and mixing laid along the selector's order, in
   *   `orderBands` slices of the range (default 20).
   * @param {boolean} [options.kinds] With given frequencies: let the mixer's kind tables (its
   *   `direct` answer) spread them over the hands, as they do in the engine's own play.
   * @param {(decision: Object) => boolean} [options.where] Which of
   *   hero's decisions the engine makes; the solver's own strategy is kept at the others. Gets
   *   `{ street, position, facing, raises, depth, spot }`.
   * @returns {Promise<Object>} Expected values in chips, losses as a share of the pot, and the
   *   engine's and the solver's action frequencies along the first decisions of the hand.
   */
  async play(hero, { iterations = 1000, target = 0.003, ranges: source = 'engine', frequencies = 'engine', hands = 'engine', orderBands = 20, kinds = false, where = null } = {}) {
    const seat = POSITIONS.indexOf(hero);
    if (seat < 0) throw new Error(`hero must be 'oop' or 'ip', got ${hero}`);
    const bridge = (this.bridge ??= new SolverBridge());
    const info = await bridge.init(this.game);
    this.hands = info.hands.map((hands) => hands.map(([a, b]) => comboId(a, b)));
    const ranges = info.weights.map((weights, p) => {
      const range = new Float64Array(NUM_COMBOS);
      weights.forEach((w, i) => { range[this.hands[p][i]] = w; });
      return range;
    });

    // 1. Equilibrium, and the solver's side of it kept for later
    const { exploitability } = await bridge.solve({ iterations, target });
    const gto = await bridge.currentEv();
    await bridge.snapshot(1 - seat);
    const lines = [];
    const start = { history: [], ranges, priors: ranges, streetBase: 0, last: [0, 0], raises: 0, depth: 0 };
    let locked = 0;
    if (source === 'solver' || frequencies === 'solver' || hands !== 'engine' || where || this.opponent !== this.strategist) {
      // 2. The engine decides at every node with whatever it is given from the solver, then all of it is locked
      const decisions = [];
      await this.#walkSolverRanges({ ...start, own: ranges[seat], model: ranges[1 - seat] }, { seat, source, frequencies, hands, orderBands, kinds, where, decisions, lines });
      await bridge.reset();
      for (const { history, flat } of decisions) await bridge.lock(history, flat);
      locked = decisions.length;
    } else {
      await this.#walk(start, {
        visit: async (node, state, decision) => {
          if (state.depth < 3) {
            lines.push({
              history: [...state.history],
              path: state.path ?? '',
              player: POSITIONS[node.player],
              actions: node.actions.map(label),
              engine: aggregate(decision.strategy, state.ranges[node.player]),
            });
          }
        },
        dryRun: true,
      });
      for (const line of lines) {
        const { player, strategy, weights } = await bridge.strategy(line.history);
        line.solver = this.#solverFrequencies(player, strategy, weights, line.actions.length);
      }

      // 2. Write the engine's strategy into every node hero can reach
      await bridge.reset();
      await this.#walk(start, {
        visit: async (node, state, decision) => {
          if (node.player !== seat) return;
          await bridge.lock(state.history, this.#flatten(seat, decision.strategy));
          locked++;
        },
        prune: seat,
      });
    }

    // 3. Worst case: the solver best-responds to the engine
    const exploited = (await bridge.bestResponseEv())[1 - seat];
    // 4. The engine against the equilibrium strategy
    await bridge.restore(1 - seat);
    const versusGto = await bridge.currentEv();

    if (this.ownsBridge) this.close();
    const pot = info.starting_pot;
    return {
      hero,
      pot,
      stack: info.effective_stack,
      lockedNodes: locked,
      ranges: source,
      frequencies,
      hands,
      solverExploitability: exploitability,
      ev: { gto: gto[seat], versusGto: versusGto[seat], exploited: pot - exploited },
      loss: {
        versusGto: (gto[seat] - versusGto[seat]) / pot,
        exploited: (gto[seat] - (pot - exploited)) / pot,
      },
      lines: lines.map(({ history, ...line }) => line),
    };
  }

  close() {
    this.bridge?.close();
    this.bridge = null;
  }

  /** A strategy per combo id as the bridge wants it: `flat[action * hands + hand]`. */
  #flatten(seat, strategy) {
    const hands = this.hands[seat];
    const flat = new Array(strategy.length * hands.length);
    strategy.forEach((probabilities, a) => {
      // The bridge leaves a hand unlocked unless one entry is positive
      hands.forEach((combo, h) => { flat[a * hands.length + h] = Math.max(probabilities[combo], 1e-9); });
    });
    return flat;
  }

  /** The share of the acting player's range that takes each action in the solver's strategy. */
  #solverFrequencies(player, strategy, weights, actions) {
    const n = this.hands[player].length;
    const all = weights[player].reduce((t, w) => t + w, 0);
    return Array.from({ length: actions }, (_, a) => {
      let hit = 0;
      for (let h = 0; h < n; h++) hit += weights[player][h] * strategy[a * n + h];
      return all > 0 ? hit / all : 0;
    });
  }

  #spot(node, state) {
    const me = node.player;
    const them = 1 - me;
    return {
      street: STREETS[node.board.length],
      pot: this.game.pot + node.bets[0] + node.bets[1],
      stack: this.game.stack - node.bets[me],
      toCall: node.bets[them] - node.bets[me],
      invested: node.bets[me] - state.streetBase,
      facing: state.last[them],
      raises: state.raises,
      streetPot: this.game.pot + 2 * state.streetBase,
    };
  }

  /**
   * Visits hero's decisions in the solved game and has the engine decide there against the
   * solver's range for the opponent. Hero's own range is the one its own play has produced, as
   * at a table: a player knows what they did, and has to estimate what the opponent did. Must run
   * while the equilibrium is still in the bridge.
   */
  async #walkSolverRanges(state, options) {
    const { seat, source, frequencies, hands, orderBands, kinds, where, decisions, lines } = options;
    const node = await this.bridge.node(state.history);
    if (node.terminal) return;
    if (node.chance) {
      for (const { card } of node.actions) {
        const dead = (range) => range.map((w, i) => (COMBO_A[i] === card || COMBO_B[i] === card ? 0 : w));
        await this.#walkSolverRanges({
          ...state, history: [...state.history, card], own: dead(state.own), model: dead(state.model), priors: state.priors.map(dead),
          streetBase: node.bets[0], last: [0, 0], raises: 0, dealt: true,
        }, options);
      }
      return;
    }

    const me = node.player;
    const spot = this.#spot(node, state);
    let mine = null; // hero's strategy here, per combo id
    if (me === seat) {
      const { strategy, weights } = await this.bridge.strategy(state.history);
      const n = this.hands[me].length;
      const spread = (hands, values) => {
        const range = new Float64Array(NUM_COMBOS);
        values.forEach((w, h) => { range[hands[h]] = w; });
        return range;
      };
      const solver = this.#solverFrequencies(me, strategy, weights, node.actions.length);
      const asked = !where || where({ street: spot.street, position: POSITIONS[me], facing: spot.toCall > 0, raises: spot.raises, depth: state.depth, spot });
      if (asked) {
        const solved = node.actions.map((_, a) => spread(this.hands[me], strategy.slice(a * n, (a + 1) * n)));
        const base = {
          position: POSITIONS[me], spot, board: node.board, actions: node.actions, hero: state.own, villainPrior: state.priors[1 - me],
          // His range: the solver's, or the engine's own model of it
          villain: source === 'solver' ? spread(this.hands[1 - me], weights[1 - me]) : state.model,
        };
        // The solver's frequencies only mean something where the solver itself gets to
        const reached = weights[me].some((w) => w > 1e-9);
        let targets = frequencies === 'solver' && reached ? solver : null;
        let strategist = this.strategist;
        if (hands === 'solver-by-order') {
          // The solver's frequencies and its mixing, laid along the selector's order: the range is
          // cut into bands by that order and every hand of a band plays the band's average of the
          // solver's strategy. What the order cannot tell apart is all that is lost.
          mine = alongOrder(solved, state.own, strategist.order(base), orderBands);
          decisions.push({ history: [...state.history], flat: this.#flatten(me, mine) });
        } else {
        if (hands !== 'engine') {
          // The engine's frequencies are whatever it would play here with its own hands
          targets ??= strategist.decide(base).played;
          strategist = new RangeStrategist({ engine: strategist.engine, equity: strategist.equity, selector: solverOrder(node.actions, solved, spot) });
        }
        mine = hands === 'solver-mixed'
          ? rescaled(solved, state.own, targets, node.actions.findIndex((a) => a.type === (spot.toCall > 0 ? 'fold' : 'check')), node.actions.flatMap((a, k) => (a.to != null ? [k] : [])))
          : strategist.decide({ ...base, targets, direct: kinds }).strategy;
        decisions.push({ history: [...state.history], flat: this.#flatten(me, mine) });
        }
      } else {
        mine = node.actions.map((_, a) => spread(this.hands[me], strategy.slice(a * n, (a + 1) * n)));
        decisions.push({ history: [...state.history], flat: strategy.map((x) => Math.max(x, 1e-9)) });
      }
      if (state.depth < 3 && !state.dealt) {
        lines.push({ history: [...state.history], path: state.path ?? '', player: POSITIONS[me], actions: node.actions.map(label), engine: aggregate(mine, state.own), solver });
      }
    }

    // The engine's model of him: he plays the engine's own strategy against hero's range
    let his = null;
    if (me !== seat && source !== 'solver') {
      his = this.opponent.decide({
        position: POSITIONS[me], spot, board: node.board, actions: node.actions, hero: state.model, villain: state.own, villainPrior: state.priors[seat],
      }).strategy;
    }

    for (const [a, action] of node.actions.entries()) {
      const own = mine ? state.own.map((w, i) => w * mine[a][i]) : state.own;
      if (!own.some((w) => w > 1e-9)) continue; // hero never gets here
      const model = his ? state.model.map((w, i) => w * his[a][i]) : state.model;
      const last = [...state.last];
      let raises = state.raises;
      if (action.to != null) {
        last[me] = action.to - (node.bets[me] - state.streetBase);
        if (spot.toCall > 0) raises++;
      }
      await this.#walkSolverRanges({
        ...state, history: [...state.history, a], path: `${state.path ? `${state.path} ` : ''}${label(action)}`, own, model, last, raises, depth: state.depth + 1,
      }, options);
    }
  }

  /**
   * Visits every decision node, carrying both players' ranges as the engine would play them.
   * Subtrees hero's range never enters are skipped: nothing there affects the result.
   */
  async #walk(state, { visit, dryRun = false, prune = null }) {
    const node = await this.bridge.node(state.history);
    if (node.terminal) return;

    if (node.chance) {
      if (dryRun) return; // the frequency report covers the first street only
      for (const { card } of node.actions) {
        const dead = (range) => range.map((w, i) => (COMBO_A[i] === card || COMBO_B[i] === card ? 0 : w));
        await this.#walk({
          ...state,
          history: [...state.history, card],
          ranges: state.ranges.map(dead),
          priors: state.priors.map(dead),
          streetBase: node.bets[0],
          last: [0, 0],
          raises: 0,
        }, { visit, dryRun, prune });
      }
      return;
    }

    const me = node.player;
    const them = 1 - me;
    const spot = this.#spot(node, state);
    const { toCall } = spot;
    const decision = this.strategist.decide({
      position: POSITIONS[me],
      spot,
      board: node.board,
      hero: state.ranges[me],
      villain: state.ranges[them],
      villainPrior: state.priors[them],
      actions: node.actions,
    });
    await visit(node, state, decision);

    for (const [a, action] of node.actions.entries()) {
      const ranges = [...state.ranges];
      ranges[me] = state.ranges[me].map((w, i) => w * decision.strategy[a][i]);
      if (prune != null && !ranges[prune].some((w) => w > 1e-9)) continue;
      const last = [...state.last];
      let raises = state.raises;
      if (action.to != null) {
        last[me] = action.to - (node.bets[me] - state.streetBase);
        if (toCall > 0) raises++;
      }
      await this.#walk({
        ...state,
        history: [...state.history, a],
        path: `${state.path ? `${state.path} ` : ''}${label(action)}`,
        ranges,
        last,
        raises,
        depth: state.depth + 1,
      }, { visit, dryRun, prune });
    }
  }
}

/**
 * A selector that fills frequencies the way the solver does: for each action, the hands the
 * solver takes it with most often come first. `solved[a][combo]` is the solver's strategy.
 */
function solverOrder(actions, solved, spot) {
  const most = (spot.invested ?? 0) + (spot.stack ?? Infinity);
  const sized = (wager) => solved[actions.findIndex((a) => a.to != null && Math.min(a.to, most) === wager.to)];
  return {
    value: (context, wager) => sized(wager),
    bluff: (context, wager) => sized(wager),
    call: () => solved[actions.findIndex((a) => a.type === 'call')],
  };
}

/** The solver's strategy averaged within `bands` equal slices of `range` taken along `order`. */
function alongOrder(solved, range, order, bands) {
  const hands = [];
  let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (range[i] > 1e-9) { hands.push(i); total += range[i]; }
  hands.sort((a, b) => order[a] - order[b]);
  const sums = Array.from({ length: bands }, () => ({ weight: 0, strategy: solved.map(() => 0) }));
  const bandOf = new Map();
  let seen = 0;
  for (const i of hands) {
    const band = Math.min(bands - 1, Math.floor((bands * (seen + range[i] / 2)) / total));
    seen += range[i];
    bandOf.set(i, band);
    sums[band].weight += range[i];
    solved.forEach((probabilities, a) => { sums[band].strategy[a] += range[i] * probabilities[i]; });
  }
  // Hands outside hero's range keep the solver's own strategy
  const out = solved.map((probabilities) => Float64Array.from(probabilities));
  for (const i of hands) {
    const band = sums[bandOf.get(i)];
    solved.forEach((_, a) => { out[a][i] = band.strategy[a] / band.weight; });
  }
  return out;
}

/**
 * The solver's hands and mixing at someone else's frequencies: each action is taken with
 * `targets[a]` of `range`, by the hands the solver takes it with. A hand's probability p becomes
 * p f / (1 - p + p f), with f set so the target is met: hands the solver plays pure stay pure and
 * the mixed ones move first. Bets and raises are scaled as one (how often the hand is
 * aggressive at all) and split over the sizes by the solver's preference for each, so that a
 * size the solver hardly uses is still filled with its betting hands. Probabilities under half a
 * percent are taken as the solver's noise and left at zero. The passive action takes what is left.
 */
function rescaled(solved, range, targets, passive, aggressive) {
  const now = aggregate(solved, range);
  if (!now) return solved.map((probabilities) => Float64Array.from(probabilities));
  let total = 0;
  for (const w of range) total += w;
  const shifted = (from, target) => {
    const p = from.map((x) => (x < 0.005 ? 0 : Math.min(1, x)));
    const at = (f) => { let got = 0; for (let i = 0; i < NUM_COMBOS; i++) if (range[i] > 0) got += range[i] * (p[i] * f) / (1 - p[i] + p[i] * f); return got / total; };
    let low = -12; let high = 12;
    for (let pass = 0; pass < 50; pass++) { const mid = (low + high) / 2; if (at(Math.exp(mid)) < target) low = mid; else high = mid; }
    const f = Math.exp((low + high) / 2);
    return p.map((x) => (x * f) / (1 - x + x * f));
  };
  const out = solved.map(() => new Float64Array(NUM_COMBOS));
  const pooled = new Float64Array(NUM_COMBOS);
  for (const a of aggressive) for (let i = 0; i < NUM_COMBOS; i++) pooled[i] += solved[a][i];
  const wanted = aggressive.reduce((sum, a) => sum + targets[a], 0);
  const used = aggressive.reduce((sum, a) => sum + now[a], 0);
  const often = wanted > 1e-6 ? shifted(pooled, wanted) : pooled.map(() => 0);
  for (let i = 0; i < NUM_COMBOS; i++) {
    let sum = 0;
    const weights = aggressive.map((a) => { const w = (targets[a] * (solved[a][i] + 0.02 * pooled[i] + 1e-9)) / (now[a] + 0.02 * used + 1e-9); sum += w; return w; });
    aggressive.forEach((a, k) => { out[a][i] = sum > 0 ? (often[i] * weights[k]) / sum : 0; });
  }
  for (let a = 0; a < solved.length; a++) {
    if (a === passive || aggressive.includes(a)) continue;
    const calls = targets[a] > 1e-6 ? shifted(solved[a], targets[a]) : solved[a].map(() => 0);
    for (let i = 0; i < NUM_COMBOS; i++) out[a][i] = Math.min(calls[i], 1 - often[i]);
  }
  for (let i = 0; i < NUM_COMBOS; i++) {
    let sum = 0;
    for (let a = 0; a < solved.length; a++) if (a !== passive) sum += out[a][i];
    out[passive][i] = Math.max(0, 1 - sum);
  }
  return out;
}

function aggregate(strategy, range) {
  let all = 0;
  for (const w of range) all += w;
  if (!(all > 1e-9)) return null; // the engine never takes this line
  return strategy.map((probabilities) => {
    let hit = 0;
    for (let i = 0; i < NUM_COMBOS; i++) hit += range[i] * probabilities[i];
    return hit / all;
  });
}

function label(action) {
  return action.to != null ? `${action.type} ${action.to}` : action.type;
}
