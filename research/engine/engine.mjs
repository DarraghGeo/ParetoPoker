// The study method as an engine. It decides from what a player can read at the table and nothing else:
//   - each hand's equity (however the player gets it: exact, estimated, or off by some points),
//   - whether the hand is a strong draw,
//   - a few reads of the spot (seat, street, the price, who is ahead in top pair or better, his strong and weak shares).
// Three layers:
//   1. thresholds on equity against the price (RULES): what to memorise;
//   2. reads that move the thresholds (ahead, his strong hands, the seat);
//   3. optionally, a table of solved answers by equity band (`cells`), used where it has an answer.
// No solver, no file access: it runs in a browser.

export const RULES = {
  // facing a bet: continue with equity at or over the price plus this much
  callOver: { flop: { ip: 0.05, oop: 0.15 }, turn: { ip: 0, oop: 0.10 }, river: { ip: 0, oop: 0 } },
  callOverBigTurnBetOop: 0.05,        // out of position on the turn, more again against over half the pot
  callOverAfterOwnBet: 0.05,          // facing a raise of our own bet, before the river
  callOverOverbet: 0.05,              // against more than the pot
  riverRaiseFrom: 0.75, riverRaiseFromOverbet: 0.80,
  // first to act
  valueFrom: (size) => (size < 0.5 ? 0.75 : size < 1.1 ? 0.80 : 0.85),
  flopOopValue: 0.70, turnBetFrom: 0.50,
  aheadBy: 0.04,                      // top pair or better: our share at least this much over his
  hisStrongAt: 0.80, hisWeakUnder: 0.30, checkAllIfHisStrong: 0.20,
  riverBluffUnderWeakLess: { ip: 0.20, oop: 0.25 },
};
export const EQUITY_CUTS = [0.2, 0.35, 0.5, 0.65, 0.8];
export const ADVANTAGE_CUTS = [0.45, 0.55];
const STREET = { 3: 'flop', 4: 'turn', 5: 'river' }; const LETTER = { 3: 'F', 4: 'T', 5: 'R' };
const band = (x, cuts) => { let k = 0; while (k < cuts.length && x >= cuts[k]) k++; return k; };

/** Where a decision sits: which table, and the reads every hand shares. */
function situation(view) {
  const { ip, toCall, size, raised } = view; const seat = ip ? 'ip' : 'oop'; const shallow = (view.rules ?? RULES).shallowAsRiver;
  const street = shallow && view.street === 4 && view.depth < shallow ? 5 : view.street;      // a turn with little behind is played by the river rules, where asked
  const kind = !(toCall > 0) ? 'first' : raised ? 'facing a raise' : 'facing a bet';
  return { street: STREET[street], seat, kind, table: `${LETTER[street]} ${kind}`, size, price: toCall > 0 ? size / (1 + 2 * size) : 0 };
}

/** Layer 1 and 2: the written rules. Returns 0 the quiet action (check or fold), 1 call, 2 bet or raise. */
function byRules(view, at, e, draw) {
  const R = view.rules ?? RULES; const { ip, raised, canRaise, reads } = view; const { street, seat, size } = at;
  if (at.kind !== 'first') {
    let over = street === 'river' ? 0 : raised ? R.callOverAfterOwnBet : R.callOver[street][seat];
    if (street === 'turn' && !ip && !raised && size > 0.5) over += R.callOverBigTurnBetOop;
    if (size > 1) over += R.callOverOverbet;
    const raiseFrom = size > 1 ? R.riverRaiseFromOverbet : R.riverRaiseFrom;
    if (street === 'river' && canRaise && !raised && e >= raiseFrom) return 2;
    if (street !== 'river' && canRaise && !raised && R.earlyRaiseFrom?.[street] !== undefined && e >= R.earlyRaiseFrom[street]) return 2;   // raising before the river, where asked
    if (R.flopIpRaisesLeads && street === 'flop' && ip && (!R.role?.leads || view.aggressor) && canRaise && !raised && e >= at.price + over) return 2;                 // in position against a flop lead: every hand that continues raises
    const band = R.earlyRaiseBand?.[street]?.[seat]; if (band && canRaise && !raised && e >= band[0] && e < band[1]) return 2;    // a band of equity that raises before the river, where asked
    if (R.drawsCallRaise && raised && street !== 'river' && draw) return 1;                                                  // strong draws do not fold to a raise, where asked
    return e >= at.price + over ? 1 : 0;
  }
  if (street === 'flop' && R.role?.flop) return view.aggressor || (reads.ahead && (e >= R.flopOopValue || draw)) ? 2 : 0;      // by role: the last raiser before the flop bets everything, the caller only when ahead
  if (street === 'flop' && ip && R.flopIpFrom !== undefined) return e >= R.flopIpFrom || draw ? 2 : 0;      // in position on the flop: a threshold in place of betting everything
  if (street === 'flop') return ip || (reads.ahead && (e >= R.flopOopValue || draw)) ? 2 : 0;
  if (street === 'turn' && (R.role?.turn ? !view.aggressor : !ip) && R.turnOopNeedsAhead && !reads.ahead) return 0;      // out of position on the turn: bet only when ahead in top pair or better, where asked
  if (street === 'turn') return e >= R.turnBetFrom || (draw && !R.turnNoDrawBets) ? 2 : 0;
  if (!ip && reads.hisStrong >= R.checkAllIfHisStrong) return 0;
  const bluffUnder = Math.max(0, reads.hisWeak - R.riverBluffUnderWeakLess[seat]);
  return e >= R.valueFrom(size) || e < bluffUnder ? 2 : 0;
}

/** Layer 3: the solved answer for the hand's cell, or null where the table has none. */
function byCells(view, at, e, draw) {
  const rows = view.cells?.[at.seat]?.[at.table]; if (!rows) return null;
  let cell = band(e, EQUITY_CUTS) * 2 + (at.street !== 'river' && draw ? 1 : 0);
  if (at.kind === 'first' && at.street !== 'river') cell = cell * 3 + band(view.reads.rangeEquity, ADVANTAGE_CUTS);
  cell = cell * 2 + (view.deep ? 1 : 0);
  const row = rows[cell]; if (!row || row.every((x) => Math.abs(x - 1 / row.length) < 1e-9)) return null;
  return at.kind === 'first' ? [row[0], 0, row[1]] : row.length === 3 ? row : [row[0], row[1], 0];
}

/**
 * view: { street 3|4|5, ip, toCall, size (the bet faced, or the bet on offer, in pots), raised (we already bet or raised this
 *         street), canRaise, deep (a single-raised pot), reads: { ahead, hisStrong, hisWeak, rangeEquity }, cells?, rules? }
 * hands: [{ equity, draw, weight }]; view.fillToDefence turns the balance rule on (true, or a number that scales the minimum defence: 0.9, 1.1)
 * Returns for each hand [quiet, call, bet or raise], summing to 1.
 */
export function decide(view, hands) {
  const at = situation(view);
  const out = hands.map(({ equity, draw }) => {
    const solved = byCells(view, at, equity, draw); if (solved) return solved;
    const a = byRules(view, at, equity, draw); return [a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0];
  });
  if (at.kind === 'first' && at.street === 'flop' && view.ip && view.flopBalance) balanceTurnBets(hands, out, at.size, view.flopBalance);
  if (at.kind === 'first' && at.street === 'turn' && view.turnBalance) balanceTurnBets(hands, out, at.size, view.turnBalance);
  if (at.kind === 'first' && at.street === 'river' && view.riverBalance) balanceRiverBets(hands, out, at.size, view.riverBalance, (view.rules ?? RULES).valueFrom(at.size));
  if (at.kind === 'facing a bet' && at.street !== 'river' && view.canRaise && view.raiseDraws?.[at.street]) hands.forEach((h, i) => { if (!h.draw) return; const o = out[i]; const move = view.raiseDraws[at.street] * (o[0] + o[1]); const fromFold = Math.min(o[0], move); o[0] -= fromFold; o[1] -= move - fromFold; o[2] += move; });   // strong draws raise this share of the time
  const exact = [].concat(view.defendExactly?.[at.street] ?? []).find((x) => !x.seat || x.seat === at.seat);   // `perEquity`: the multiple moves by this much for each point the range's own equity is above `around`     // continue with exactly this multiple of the minimum defence, the best hands by equity (raises kept)
  if (exact && (!exact.seat || exact.seat === at.seat) && at.kind !== 'first' && (exact.raises || at.kind === 'facing a bet')) { let total = 0; hands.forEach((h) => { total += h.weight; }); const times = exact.times + (exact.perEquity ?? 0) * (view.reads.rangeEquity - (exact.around ?? 0.5)); let room = Math.max(0, Math.min(1, times / (1 + at.size))) * total;
    for (const i of hands.map((h, j) => j).sort((x, y) => hands[y].equity - hands[x].equity)) { const take = Math.max(0, Math.min(1, room / hands[i].weight)); const r = Math.min(out[i][2], take); out[i] = [1 - take, take - r, r]; room -= take * hands[i].weight; }
    return out; }
  const fill = view.fillBy?.[at.street]?.[at.seat] ?? (view.fillToDefence === true ? 1 : view.fillToDefence);     // fillBy: the multiple for one street and seat (0 turns the fill off there)
  if (fill && at.kind !== 'first' && (view.fillEverywhere || view.ip || at.street === 'river')) fillToDefence(hands, out, Math.min(1, fill / (1 + at.size)));
  return out;
}

/** Balance when betting the turn (and, where asked, in position on the flop): the hands that bet keep back a share to check (`check`), and the weakest hands that would
 *  check bet as bluffs, `ratio` x bet / (1 + bet) of a bluff for each bet made. */
function balanceTurnBets(hands, out, size, { ratio = 0, check = 0 }) {
  let betting = 0; hands.forEach((h, i) => { if (out[i][2] > 0) { const keep = out[i][2] * check; out[i][2] -= keep; out[i][0] += keep; betting += h.weight * out[i][2]; } });
  let room = ratio * (size / (1 + size)) * betting;
  const order = hands.map((h, i) => i).filter((i) => out[i][0] === 1).sort((x, y) => hands[x].equity - hands[y].equity);
  for (const i of order) { if (room <= 1e-9) break; const take = Math.min(1, room / hands[i].weight); out[i][0] -= take; out[i][2] += take; room -= take * hands[i].weight; }
}
/** Balance when betting the river: value bets keep back a share to check (`check`); with `ratio` given, the rule's own bluffs
 *  are replaced by the weakest hands, `ratio` x bet / (1 + bet) of a bluff for each value bet made. */
function balanceRiverBets(hands, out, size, { ratio, check = 0 }, valueFrom) {
  let value = 0; hands.forEach((h, i) => { if (!(out[i][2] > 0)) return;
    if (h.equity >= valueFrom) { const keep = out[i][2] * check; out[i][2] -= keep; out[i][0] += keep; value += h.weight * out[i][2]; }
    else if (ratio !== undefined) { out[i][0] += out[i][2]; out[i][2] = 0; } });
  if (ratio === undefined) return; let room = ratio * (size / (1 + size)) * value;
  const order = hands.map((h, i) => i).filter((i) => out[i][0] === 1).sort((x, y) => hands[x].equity - hands[y].equity);
  for (const i of order) { if (room <= 1e-9) break; const take = Math.min(1, room / hands[i].weight); out[i][0] -= take; out[i][2] += take; room -= take * hands[i].weight; }
}
/** Balance when facing a bet or raise: if the range continues less than the minimum defence, 1 / (1 + bet), the next-best
 *  hands by equity call until it does. In position on any street, and on the river in either seat. */
function fillToDefence(hands, out, defence) {
  let total = 0, cont = 0; hands.forEach((h, i) => { total += h.weight; cont += h.weight * (1 - out[i][0]); });
  let short = defence * total - cont; if (!(short > 1e-9)) return;
  const order = hands.map((h, i) => i).filter((i) => out[i][0] > 0).sort((x, y) => hands[y].equity - hands[x].equity);
  for (const i of order) { if (short <= 1e-9) break; const take = Math.min(out[i][0], short / hands[i].weight); out[i][0] -= take; out[i][1] += take; short -= take * hands[i].weight; }
}

/** The reads of the spot from both ranges as the player sees them: weights, equities and who holds top pair or better. */
export function readSpot(mine, his) {
  const R = RULES; let mt = 0, ht = 0, strong = 0, weak = 0, topMe = 0, topHim = 0, eq = 0;
  for (const h of mine) { mt += h.weight; eq += h.weight * h.equity; if (h.topPairPlus) topMe += h.weight; }
  for (const h of his) { ht += h.weight; if (h.equity >= R.hisStrongAt) strong += h.weight; if (h.equity < R.hisWeakUnder) weak += h.weight; if (h.topPairPlus) topHim += h.weight; }
  if (!(mt > 0) || !(ht > 0)) return null;
  return { ahead: topMe / mt - topHim / ht > R.aheadBy, hisStrong: strong / ht, hisWeak: weak / ht, rangeEquity: eq / mt };
}
