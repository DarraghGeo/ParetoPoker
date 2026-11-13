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
   * @param {SolverBridge} [options.bridge]
   */
  constructor(game, { strategist = new RangeStrategist(), bridge = null } = {}) {
    this.game = game;
    this.strategist = strategist;
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
   * @param {(decision: Object) => boolean} [options.where] With `ranges: 'solver'`: which of
   *   hero's decisions the engine makes; the solver's own strategy is kept at the others. Gets
   *   `{ street, position, facing, raises, depth, spot }`.
   * @returns {Promise<Object>} Expected values in chips, losses as a share of the pot, and the
   *   engine's and the solver's action frequencies along the first decisions of the hand.
   */
  async play(hero, { iterations = 1000, target = 0.003, ranges: source = 'engine', frequencies = 'engine', where = null } = {}) {
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
    if (source === 'solver') {
      // 2. The engine decides on the solver's ranges at every node, then all of it is locked
      const decisions = [];
      await this.#walkSolverRanges({ ...start, own: ranges[seat] }, { seat, frequencies, where, decisions, lines });
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
      frequencies: source === 'solver' ? frequencies : 'engine',
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
    const { seat, frequencies, where, decisions, lines } = options;
    const node = await this.bridge.node(state.history);
    if (node.terminal) return;
    if (node.chance) {
      for (const { card } of node.actions) {
        const dead = (range) => range.map((w, i) => (COMBO_A[i] === card || COMBO_B[i] === card ? 0 : w));
        await this.#walkSolverRanges({
          ...state, history: [...state.history, card], own: dead(state.own), priors: state.priors.map(dead),
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
        // The solver's frequencies only mean something where the solver itself gets to
        const reached = weights[me].some((w) => w > 1e-9);
        const decision = this.strategist.decide({
          position: POSITIONS[me], spot, board: node.board, actions: node.actions,
          hero: state.own, villain: spread(this.hands[1 - me], weights[1 - me]), villainPrior: state.priors[1 - me],
          targets: frequencies === 'solver' && reached ? solver : null,
        });
        mine = decision.strategy;
        decisions.push({ history: [...state.history], flat: this.#flatten(me, mine) });
      } else {
        mine = node.actions.map((_, a) => spread(this.hands[me], strategy.slice(a * n, (a + 1) * n)));
        decisions.push({ history: [...state.history], flat: strategy.map((x) => Math.max(x, 1e-9)) });
      }
      if (state.depth < 3 && !state.dealt) {
        lines.push({ history: [...state.history], path: state.path ?? '', player: POSITIONS[me], actions: node.actions.map(label), engine: aggregate(mine, state.own), solver });
      }
    }

    for (const [a, action] of node.actions.entries()) {
      const own = mine ? state.own.map((w, i) => w * mine[a][i]) : state.own;
      if (!own.some((w) => w > 1e-9)) continue; // hero never gets here
      const last = [...state.last];
      let raises = state.raises;
      if (action.to != null) {
        last[me] = action.to - (node.bets[me] - state.streetBase);
        if (spot.toCall > 0) raises++;
      }
      await this.#walkSolverRanges({
        ...state, history: [...state.history, a], path: `${state.path ? `${state.path} ` : ''}${label(action)}`, own, last, raises, depth: state.depth + 1,
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
