// Play's game: the hand on the table as the worker describes it (workers/play.js), the steps still to be shown, the
// clock running and both time banks, what is being solved and how far along, and the session's chips won from the flop
// on. flow.js takes the worker's messages and paces them.
import { configOf, loadSeating } from './seating.js';
import { BANK, heard, loadSession } from './flow.js';

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
}

/** A game with its worker; nothing is dealt or solved until the table is set up (flow.js, `sitDown`). */
export function createPlayGame() {
  const game = new PlayState();
  game.worker = new Worker(new URL('../../workers/play.js', import.meta.url));
  game.worker.onmessage = ({ data }) => heard(game, data);
  return game;
}
