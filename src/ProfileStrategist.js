import { NUM_COMBOS } from './cards.js';
import { riverProfile, solveRiver } from './CurveGame.js';
import { solveTurn } from './CurveGame2.js';
import { sumOf } from './HandSelector.js';
import { RangeStrategist } from './RangeStrategist.js';

/**
 * A RangeStrategist whose river play is the profile of the curve game (CurveGame.js): the two
 * ranges as strength curves, the bets and raises on offer, and nothing fitted. On the river it
 * takes the place of all four parts at once, because the profile is frequency, hand choice and
 * mixing together: how often every level of strength takes each action. Before the river the
 * four parts decide as in RangeStrategist.
 *
 * @param {Object} [options] RangeStrategist's, and:
 * @param {{ bet?: number[], raise?: number }} [options.menu] The bets (in pots) and the raise (a
 *   multiple of the bet) taken to be available later in the hand. Default: his bets are like the
 *   ones offered at this decision, and a raise is 2.5 times the bet.
 * @param {number} [options.iterations] Default 300.
 * @param {boolean} [options.blockers] On the river, count card removal (hand by hand) in place of the two curves. Default: off.
 */
export class ProfileStrategist extends RangeStrategist {
  constructor({ menu = null, iterations = 300, turn = false, turnIterations = 300, pure = false, blockers = false, ...rest } = {}) {
    super(rest);
    Object.assign(this, { menu, iterations, turn, turnIterations, pure, blockers });
    // The turn being played, with the rivers behind it: solved once at its first decision
    this.turns = new Map();
    // The river being played: solved once at its first decision, read at the later ones
    this.rivers = new Map();
  }

  decide(node) {
    if (node.board.length === 4 && this.turn) {
      const strategy = this.#turn(node);
      if (strategy) return this.#answer(node, strategy);
    }
    if (node.board.length !== 5) return super.decide(node);
    const { position, spot, board, hero, actions } = node;
    if (this.turn) {
      // A river reached from a solved turn: its profile was found with the turn's
      const [before] = String(node.line ?? '').split(' /');
      const solved = this.turns.get(board.slice(0, 4).join(','));
      const strategy = solved?.river(labelsOf(before), board[4], position === 'oop' ? 0 : 1, spot.invested ?? 0, (spot.invested ?? 0) + (spot.toCall ?? 0), actions);
      if (strategy) return this.#answer(node, strategy);
    }
    let { villain } = node;
    if (node.villainPrior && !(sumOf(villain) > 1e-9)) villain = node.villainPrior;
    const toCall = spot.toCall ?? 0;
    const invested = spot.invested ?? 0;
    const key = `${[...board].sort((a, b) => a - b).join(',')}|${Math.round(spot.streetPot ?? spot.pot)}`;
    const args = { equity: this.equity, board, hero, villain, spot, actions, menu: this.menu, iterations: this.iterations, blockers: this.blockers };
    let strategy = null;
    if (position === 'oop' && toCall === 0 && invested === 0) {
      // The first decision of the street: solve the whole river from here
      const solved = solveRiver(args);
      this.rivers.set(key, solved);
      if (this.rivers.size > 64) this.rivers.delete(this.rivers.keys().next().value);
      strategy = solved.at(0, 0, 0, actions);
    } else {
      strategy = this.rivers.get(key)?.at(position === 'oop' ? 0 : 1, invested, invested + toCall, actions) ?? null;
    }
    // No solved river to read (this decision was reached without its start being seen, or the tree differs): solve from here
    strategy ??= riverProfile({ ...args, checkCloses: position === 'ip' && toCall === 0 });
    return this.#answer(node, strategy);
  }

  #turn(node) {
    const { position, spot, board, hero, actions } = node;
    const toCall = spot.toCall ?? 0;
    const invested = spot.invested ?? 0;
    const key = board.join(',');
    if (position === 'oop' && toCall === 0 && invested === 0) {
      const villain = node.villainPrior && !(sumOf(node.villain) > 1e-9) ? node.villainPrior : node.villain;
      const solved = solveTurn({ equity: this.equity, board, first: hero, second: villain, pot: spot.pot, stack: spot.stack ?? Infinity, actions, menu: this.menu, iterations: this.turnIterations });
      this.turns.set(key, solved);
      if (this.turns.size > 4) this.turns.delete(this.turns.keys().next().value);
      return solved.turn(0, 0, 0, actions);
    }
    return this.turns.get(key)?.turn(position === 'oop' ? 0 : 1, invested, invested + toCall, actions) ?? null;
  }

  #answer({ hero, actions }, strategy) {
    // `pure` (for study): every hand takes its most frequent action outright
    if (this.pure) {
      for (let i = 0; i < NUM_COMBOS; i++) {
        let best = 0;
        for (let a = 1; a < strategy.length; a++) if (strategy[a][i] > strategy[best][i]) best = a;
        for (let a = 0; a < strategy.length; a++) strategy[a][i] = a === best ? 1 : 0;
      }
    }
    const total = sumOf(hero);
    const played = strategy.map((probabilities) => {
      let weight = 0;
      for (let i = 0; i < NUM_COMBOS; i++) weight += hero[i] * probabilities[i];
      return total > 0 ? weight / total : 0;
    });
    return { frequencies: { profile: true }, played, strategy, actions };
  }
}

/** 'check bet 33 call' as ['check', 'bet 33', 'call']. */
function labelsOf(line) {
  const words = line.trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    if (i + 1 < words.length && /^[\d.]+$/.test(words[i + 1])) { out.push(`${words[i]} ${words[i + 1]}`); i++; } else out.push(words[i]);
  }
  return out;
}
