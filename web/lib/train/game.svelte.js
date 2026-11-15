// Train's game: what the page shows (the prefs, the position and question on screen, how far along the next board is) and
// what it keeps behind (the boards solved ahead). The worker deals the boards (workers/train.js); flow.js moves the game on.
import { savedSetup } from '../setup.js';
import { loadPrefs } from './prefs.js';
import { heard, resume, want } from './flow.js';

class TrainState {
  prefs = $state(loadPrefs());
  spot = $state.raw(null);
  q = $state.raw(null);
  progress = $state.raw(null);
  error = $state('');
  failed = $state(0);
  config = savedSetup(); boards = []; board = null; busy = null; id = 0; turn = 0; onExport = () => {};
}

/** A game with its worker, asking for its first board. */
export function createTrainGame() {
  const game = new TrainState();
  game.worker = new Worker(new URL('../../workers/train.js', import.meta.url));
  game.worker.onmessage = ({ data }) => heard(game, data);
  resume(game); want(game);
  return game;
}
