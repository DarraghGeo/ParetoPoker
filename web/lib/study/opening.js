// Opening a spot an address names: its line walked in the tree once solved (each street after the first solved again for
// the ranges that arrive, where the address says so), and a solve handed over from Train or Play shown before Study's own.
import { readAddress } from './address.js';
import { begin, setHand, solve } from './solving.js';
import { openSetup } from './setup.js';
import { boardCards, conf, configOf, subBetting, version, versionOf } from './versions.svelte.js';
import { savedSetup } from '../setup.js';

/** How long a handover may take before the spot is solved here from its flop. */
const PATIENCE = 4000;
const dealsOn = (nodes, next, dealt) => next.kind === 'chance' && dealt[next.round] && nodes[next.edges[0]?.child]?.kind === 'decision';

/** The decision a line leads to from the first, as far as the tree has it, the cards dealt on the way, and (where a later
 *  street is solved again) the rest of the line, left for that solve. */
export function walk(nodes, { line, dealt, resolve }) {
  let at = 0; const cards = [];
  for (let i = 0; i < line.length; i++) {
    const edge = nodes[at].edges.find((e) => e.label === line[i]); if (!edge) break;
    const next = nodes[edge.child];
    if (dealsOn(nodes, next, dealt)) {
      cards[next.round] = dealt[next.round]; at = next.edges[0].child;
      if (resolve) return { at, cards, rest: { line: line.slice(i + 1), dealt: dealt.slice(next.round + 1) } };
      continue;
    }
    if (next.kind !== 'decision') break;
    at = next.id;
  }
  return { at, cards, rest: null };
}

/** The address's place in a tree just solved; on a street solved again, the next street asked for. */
export function openAt(game) {
  const { at, cards, rest } = walk(game.nodes, game.open);
  version(game).pos = { node: at, dealt: cards };
  if (!rest && game.open.hand) setHand(game, game.open.hand);
  game.open = rest && { ...game.open, ...rest };
  if (rest) game.onward = { id: at, dealt: cards };
}

/** The next street of a line, re-solved on its own for the ranges that arrive. */
export function solveOnward(game) {
  const { id, dealt } = game.onward; game.onward = null;
  const c = conf(game);
  game.sub = subBetting(c, boardCards(c.board).length + dealt.length);
  game.worker.postMessage({ type: 'subgame', job: game.job, id, dealt });
}

/** Open the spot an address names (`awaitHandover`: a solve of its street is on its way); with none, open the setup. */
export function openAddress(game, query, awaitHandover = false) {
  const read = readAddress(query); clearTimeout(game.awaiting); game.awaiting = null; game.panel = '';
  if (!read) { openSetup(game); return; }
  game.config = { ...savedSetup(), ...read.config }; game.open = read.open;
  if (!awaitHandover) { begin(game); return; }
  game.awaiting = setTimeout(() => { game.awaiting = null; begin(game); }, PATIENCE);
}

/** Open a later street on its own: the address's setup, and the street as kept (`s`: its board, pot, stack, the two ranges
 *  that arrived as `[[combination, weight]]`, and the line within it), solved here without its flop. The flop is the
 *  version before it, solved only if it is turned to. */
export function openStreet(game, query, s) {
  const read = readAddress(query); clearTimeout(game.awaiting); game.awaiting = null; game.panel = '';
  if (!read) { openSetup(game); return; }
  game.config = { ...savedSetup(), ...read.config };
  const whole = (list) => { const w = new Float64Array(1326); for (const [c, x] of list) w[c] = x; return w; };
  const own = boardCards(s.board); const c = configOf(game);
  const base = { board: own.join(' '), pot: s.pot, stack: s.stack, ...subBetting(c, own.length), lite: false };
  game.versions = [versionOf(game, { oop: c.oop, ip: c.ip }), versionOf(game, { oop: whole(s.oop), ip: whole(s.ip), base, fixed: true })]; game.at = 1;
  game.open = { line: s.line ?? [], dealt: [], hand: read.open.hand, resolve: false };
  solve(game);
}

/** A flop handed over as it was solved lite elsewhere: shown as it is, with the betting it was solved with, and not solved again. */
function adoptFlop(game, h) {
  game.config = { ...game.config, ...h.betting, lite: true };
  game.versions = [versionOf(game, { oop: game.config.oop, ip: game.config.ip })]; game.at = 0;
  game.open = { ...game.open, resolve: false };
  game.worker.postMessage({ type: 'adopt', key: version(game).id, sums: h.sums, exploit: h.exploit, lite: true }, [h.sums.buffer]);
  solve(game);
}

/** A turn or river handed over: shown at once, then solved finer here (the flop before it only if it is asked for). */
export function handedOver(game, h) {
  if (!game.awaiting) return;
  clearTimeout(game.awaiting); game.awaiting = null;
  if (!h.found) { begin(game); return; }
  if (h.lite) { adoptFlop(game, h); return; }
  const own = boardCards(h.board); const c = configOf(game);
  const base = { board: own.join(' '), pot: h.pot, stack: h.stack, ...subBetting(c, own.length), lite: false };
  game.versions = [versionOf(game, { oop: c.oop, ip: c.ip }), versionOf(game, { oop: h.oop, ip: h.ip, base, fixed: true })]; game.at = 1;
  game.open = { line: h.line ?? [], dealt: [], hand: game.open?.hand ?? null, resolve: false };
  game.worker.postMessage({ type: 'adopt', key: version(game).id, sums: h.sums, exploit: h.exploit }, [h.sums.buffer]);
  solve(game);
}
