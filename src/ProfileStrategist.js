import { NUM_COMBOS } from './cards.js';
import { riverProfile, solveRiver } from './CurveGame.js';
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
 */
export class ProfileStrategist extends RangeStrategist {
  constructor({ menu = null, iterations = 300, ...rest } = {}) {
    super(rest);
    Object.assign(this, { menu, iterations });
    // The river being played: solved once at its first decision, read at the later ones
    this.rivers = new Map();
  }

  decide(node) {
    if (node.board.length !== 5) return super.decide(node);
    const { position, spot, board, hero, actions } = node;
    let { villain } = node;
    if (node.villainPrior && !(sumOf(villain) > 1e-9)) villain = node.villainPrior;
    const toCall = spot.toCall ?? 0;
    const invested = spot.invested ?? 0;
    const key = `${[...board].sort((a, b) => a - b).join(',')}|${Math.round(spot.streetPot ?? spot.pot)}`;
    const args = { equity: this.equity, board, hero, villain, spot, actions, menu: this.menu, iterations: this.iterations };
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
    const total = sumOf(hero);
    const played = strategy.map((probabilities) => {
      let weight = 0;
      for (let i = 0; i < NUM_COMBOS; i++) weight += hero[i] * probabilities[i];
      return total > 0 ? weight / total : 0;
    });
    return { frequencies: { profile: true }, played, strategy, actions };
  }
}
