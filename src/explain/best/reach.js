// His reach, summed: in all and on each card, so that what a hand can face is the total less what shares its cards.

/** Sum of a reach vector and its per-card sums. */
export function tally(g, reach, list) {
  const { A, B } = g;
  const per = new Float64Array(52); let all = 0;
  for (const v of list) { const w = reach[v]; if (w) { all += w; per[A[v]] += w; per[B[v]] += w; } }
  return { all, per };
}

/** A tally less what shares a card with hand `h`, its own combination taken out twice. */
export const apart = (g, t, h) => t.all - t.per[g.A[h]] - t.per[g.B[h]];
/** What hand `h` can face of a tallied reach: all of it but what shares a card with the hand. */
export const faces = (g, t, reach, h) => apart(g, t, h) + reach[h];

export const nanArray = (N) => new Float64Array(N).fill(NaN);

/** Raw sums turned into each hand's value per unit of what it faces. */
export function perHand(g, f, heroes, raw) {
  const out = nanArray(g.N);
  for (const h of heroes) out[h] = raw[h] / f.mass[h];
  return out;
}

/** How much of his range, by `reach`, each hand faces, as a share of all it faces. */
export function shareOf(g, f, heroes, reach, villains) {
  const t = tally(g, reach, villains);
  const out = nanArray(g.N);
  for (const h of heroes) out[h] = faces(g, t, reach, h) / f.mass[h];
  return out;
}

/** The hands a frame holds (with some of his range left to face) and his hands. */
export function listsOf(g, f) {
  const heroes = []; const villains = [];
  for (let c = 0; c < g.N; c++) { if (f.mine[c] > 0 && f.mass[c] > 0) heroes.push(c); if (f.his[c] > 0) villains.push(c); }
  return { heroes, villains };
}

export const addInto = (into, raw, hands, scale = 1) => { for (const h of hands) into[h] += raw[h] * scale; };
