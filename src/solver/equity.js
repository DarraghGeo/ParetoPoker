// Each hand's equity against a range on a board of three, four or five cards, every card still to come dealt out, with
// the cards each hand removes from the other range. For each way the board can finish, both ranges are sorted by strength
// and swept once, with what his hands sharing a card with ours hold taken back out.

/** The combinations still live (held by either range and clear of the board), with each one's two cards. */
function liveCombos(fs, board, mine, his) {
  const taken = new Uint8Array(52); for (const c of board) taken[c] = 1;
  const A = new Uint8Array(fs.COMBOS); const B = new Uint8Array(fs.COMBOS); const live = [];
  for (let c = 0; c < fs.COMBOS; c++) {
    A[c] = fs.COMBO_CARDS[2 * c]; B[c] = fs.COMBO_CARDS[2 * c + 1];
    if ((mine[c] > 0 || his[c] > 0) && !taken[A[c]] && !taken[B[c]]) live.push(c);
  }
  const deck = []; for (let c = 0; c < 52; c++) if (!taken[c]) deck.push(c);
  return { A, B, live, deck };
}

/** Each live hand's strength on one finished board (x and y the cards to come, -1 for none), both ranges sorted by it. */
function ranked(fs, ctx, x, y) {
  const { board, A, B, live, mine, his, strength, cards } = ctx;
  const full = board.length + (x >= 0) + (y >= 0); if (x >= 0) cards[board.length] = x; if (y >= 0) cards[board.length + 1] = y;
  const heroes = []; const others = [];
  for (const c of live) {
    if (A[c] === x || A[c] === y || B[c] === x || B[c] === y) continue;
    cards[full] = A[c]; cards[full + 1] = B[c]; strength[c] = fs.evaluateCards(cards.slice(0, full + 2));
    if (mine[c] > 0) heroes.push(c);
    if (his[c] > 0) others.push(c);
  }
  const order = (p, q) => strength[p] - strength[q];
  return { heroes: heroes.sort(order), others: others.sort(order) };
}

/** His weight added to a running total and to the per-card totals of its two cards. */
function count(ctx, perCard, v) { const w = ctx.his[v]; perCard[ctx.A[v]] += w; perCard[ctx.B[v]] += w; return w; }

/** One finished board: each hand of ours against his hands below it and level with it, less those sharing a card. */
function deal(fs, ctx, x, y) {
  const { A, B, his, strength, win, mass, below, upto, every } = ctx;
  const { heroes, others } = ranked(fs, ctx, x, y);
  below.fill(0); upto.fill(0); every.fill(0);
  let all = 0; for (const v of others) all += count(ctx, every, v);
  let lt = 0; let le = 0; let sumBelow = 0; let sumUpto = 0;
  for (const h of heroes) {
    while (lt < others.length && strength[others[lt]] < strength[h]) sumBelow += count(ctx, below, others[lt++]);
    while (le < others.length && strength[others[le]] <= strength[h]) sumUpto += count(ctx, upto, others[le++]);
    // the same two cards in his range were taken out twice, once for each card
    const own = his[h] > 0 ? his[h] : 0;
    const beats = sumBelow - below[A[h]] - below[B[h]]; const ties = sumUpto - upto[A[h]] - upto[B[h]] + own - beats;
    win[h] += beats + ties / 2; mass[h] += all - every[A[h]] - every[B[h]] + own;
  }
}

/** Every way the board can finish: as it is, each river, or each turn and river. */
function everyRunout(board, deck, play) {
  if (board.length === 5) { play(-1, -1); return; }
  if (board.length === 4) { for (const x of deck) play(x, -1); return; }
  for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) play(deck[i], deck[j]);
}

/**
 * @param {number[]} board
 * @param {ArrayLike<number>} mine Weights, one per combination.
 * @param {ArrayLike<number>} his
 * @returns {Float64Array} NaN where a hand is not held or has nothing to face.
 */
export function equityVs(fs, board, mine, his) {
  const N = fs.COMBOS; const { A, B, live, deck } = liveCombos(fs, board, mine, his);
  const ctx = { board, A, B, live, mine, his, strength: new Float64Array(N), cards: [...board, 0, 0, 0, 0].slice(0, 7), win: new Float64Array(N), mass: new Float64Array(N), below: new Float64Array(52), upto: new Float64Array(52), every: new Float64Array(52) };
  everyRunout(board, deck, (x, y) => deal(fs, ctx, x, y));
  const out = new Float64Array(N).fill(NaN);
  for (const h of live) if (mine[h] > 0 && ctx.mass[h] > 0) out[h] = ctx.win[h] / ctx.mass[h];
  return out;
}
