// Play's game: the hand on the table as the worker describes it (workers/play.js), the steps still to be shown, the
// clock running and both time banks, what is being solved and how far along, and the session's chips won from the flop
// on. flow.js takes the worker's messages and paces them.
import { configOf, loadSeating } from './seating.js';
import { BANK, broke, heard, loadSession, setup, startHelpers } from './flow.js';

class PlayState {
  state = $state.raw(null);
  status = $state.raw(null);
  progress = $state.raw(null);
  error = $state('');
  session = $state(loadSession());
  study = $state.raw(null);
  clock = $state.raw({ who: null, left: 0, total: 1, bank: false });
  bank = $state.raw({ hero: BANK, villain: BANK });
  timedOut = $state(false);
  seating = $state.raw(loadSeating());
  config = $state.raw(configOf(loadSeating()));
  seated = $state(false);
  queue = []; busy = false; lastKey = ''; tick = null; timer = null; onExport = () => {};
  helpers = []; needs = []; holding = false; epoch = 0; counted = ''; shownAt = 0;
}

/** A game with its worker. Hands for the seating last used are solved from the start, behind the set-up, so that Deal with
 *  it unchanged plays at once; nothing is dealt until then (flow.js, `sitDown`). */
export function createPlayGame() {
  const game = new PlayState();
  game.worker = new Worker(new URL('../../workers/play.js', import.meta.url), { type: 'module' });
  game.worker.onmessage = ({ data }) => heard(game, data);
  game.worker.onerror = (ev) => { ev.preventDefault?.(); broke(game); };
  startHelpers(game); setup(game);
  return game;
}
