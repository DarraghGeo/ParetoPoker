import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const DEFAULT_BINARY = fileURLToPath(new URL('../../solver-bridge/target/release/solver-bridge', import.meta.url));

/**
 * Talks to postflop-solver through the `solver-bridge` binary (build it with `npm run build:solver`).
 * One request at a time: every method resolves with the bridge's reply or rejects with its error.
 */
export class SolverBridge {
  constructor({ binary = process.env.SOLVER_BRIDGE ?? DEFAULT_BINARY } = {}) {
    if (!existsSync(binary)) {
      throw new Error(`solver bridge not found at ${binary}. Run "npm run build:solver" first.`);
    }
    this.child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.pending = [];
    this.closed = null;
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      const { resolve, reject } = this.pending.shift();
      const reply = JSON.parse(line);
      if (reply.ok) resolve(reply);
      else reject(new Error(reply.error));
    });
    this.child.stdin.on('error', () => {}); // a dead bridge is reported by 'exit' below
    this.child.on('exit', (code, signal) => {
      this.closed = new Error(`solver bridge exited (${signal ?? `code ${code}`})`);
      for (const { reject } of this.pending.splice(0)) reject(this.closed);
    });
  }

  request(cmd, args = {}) {
    if (this.closed) return Promise.reject(this.closed);
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ cmd, ...args })}\n`);
    });
  }

  /**
   * Builds the game tree.
   *
   * @param {Object} game
   * @param {string} game.oopRange Range notation, e.g. 'QQ+,AKs'.
   * @param {string} game.ipRange
   * @param {string} game.board 'Td9d6h', 'Td9d6hQc' or 'Td9d6hQc7s'.
   * @param {number} game.pot Starting pot, in chips (whole number).
   * @param {number} game.stack Effective stack behind, in chips (whole number).
   * @param {Object} game.betSizes Per street and player, in postflop-solver's syntax:
   *   `{ turn: { oop: { bet: '50%', raise: '2.5x' }, ip: {...} }, river: {...} }`.
   *   Sizes: '60%' of pot, '2.5x' the previous bet (raises only), '100c' chips, 'e' geometric, 'a' all-in.
   * @returns {Promise<{ hands: number[][][], weights: number[][] }>} Each player's hands as
   *   pairs of card ids, with their starting weights. Index 0 is out of position, 1 in position.
   */
  init({ oopRange, ipRange, board, pot, stack, betSizes, ...thresholds }) {
    return this.request('init', {
      oop_range: oopRange,
      ip_range: ipRange,
      board,
      starting_pot: pot,
      effective_stack: stack,
      bet_sizes: betSizes,
      ...thresholds,
    });
  }

  /** The node reached by `history` (action indices; a card id at a chance node). */
  node(history) { return this.request('node', { history }); }
  /** Fixes the acting player's strategy at `history`: `strategy[action * hands + hand]`. */
  lock(history, strategy) { return this.request('lock', { history, strategy }); }
  /** The acting player's strategy at `history` and both players' reach weights. */
  strategy(history) { return this.request('strategy', { history }); }
  /** Solves, respecting locks. `target` is the exploitability to stop at, as a share of the pot. */
  solve({ iterations = 1000, target = 0.003 } = {}) { return this.request('solve', { iterations, target }); }
  /** Clears every lock and any solution. */
  reset() { return this.request('reset'); }
  /** [OOP, IP] expected values under the strategies as they stand. */
  async currentEv() { return (await this.request('current_ev')).ev; }
  /** [OOP, IP] expected values if that player best-responded to the other's strategy. */
  async bestResponseEv() { return (await this.request('best_response_ev')).ev; }
  /** Remembers `player`'s (0 or 1) whole strategy inside the bridge. */
  snapshot(player) { return this.request('snapshot', { player }); }
  /** Locks `player` to the strategy saved by snapshot(). */
  restore(player) { return this.request('restore', { player }); }

  close() {
    this.child.stdin.end();
  }
}
