// Play's game: the hand on screen as the worker describes it (workers/play.js), what is being solved and how far along,
// and the session's chips won from the flop on. flow.js takes the worker's messages.
import { savedSetup } from '../setup.js';
import { heard, loadSession } from './flow.js';

class PlayState {
  state = $state.raw(null);
  status = $state.raw(null);
  progress = $state.raw(null);
  error = $state('');
  session = $state(loadSession());
  study = $state.raw(null);
  config = savedSetup(); onExport = () => {};
}

/** A game with its worker, set up with the setup's ranges, pot and bet sizes. */
export function createPlayGame() {
  const game = new PlayState();
  game.worker = new Worker(new URL('../../workers/play.js', import.meta.url));
  game.worker.onmessage = ({ data }) => heard(game, data);
  game.worker.postMessage({ type: 'setup', config: JSON.parse(JSON.stringify(game.config)) });
  return game;
}
