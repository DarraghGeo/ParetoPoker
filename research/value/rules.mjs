// Further rule sets for derive.mjs: the second derivation and its parts, each played where it applies with the solution
// everywhere else. Only river decisions are changed here (`round === 1`); the turn is left to the solution.
export function rulesets(T) {
  const { one, mass, callers, plan, checkAll, byRuler, bluffsFor, topCalls, priceCalls, N, fs } = T;
  const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];
  /** How much of his range sits under (or from) an equity against mine. */
  const hisUnder = (H, x) => { let t = 0; for (const v of H.hisOrder) if (H.hisEq[v] < x) t += H.his[v]; return t / H.hisTotal; };
  const hisFrom = (H, x) => 1 - hisUnder(H, x);
  /** For each of my hands, how much of what is left of his range folds, if he keeps the top 1/(1+s): my cards take hands out of both parts. */
  function foldSeen(H, s = H.betSize) {
    const keep = callers(H, s); const cardAll = new Float64Array(52); const cardCall = new Float64Array(52); let all = 0, call = 0;
    for (const v of H.hisOrder) { const w = H.his[v]; all += w; call += keep[v]; cardAll[CA(v)] += w; cardAll[CB(v)] += w; cardCall[CA(v)] += keep[v]; cardCall[CB(v)] += keep[v]; }
    return H.ids.map((c) => { const goneAll = cardAll[CA(c)] + cardAll[CB(c)] - H.his[c]; const goneCall = cardCall[CA(c)] + cardCall[CB(c)] - keep[c]; const left = all - goneAll; return left > 0 ? 1 - (call - goneCall) / left : 0; });
  }
  /** A betting plan with the bluffs chosen by a score (highest first) among the hands under `under` equity. */
  function chosen(H, value, bluffMass, score, under = 0.3) {
    const out = H.ids.map((_, i) => one(H.k, value[i] ? H.betAt : H.check)); let room = bluffMass;
    const pool = H.ids.map((_, i) => i).filter((i) => !value[i] && H.e[i] < under).sort((x, y) => score[y] - score[x]);
    for (const i of pool) { if (room <= 1e-9) break; out[i] = one(H.k, H.betAt); room -= H.w[i]; }
    return out;
  }
  const river = (rule) => (H) => (H.round === 1 ? rule(H) : H.P);
  const bet = (H, { line = 1 - 1 / (2 * (1 + H.betSize)), needWeak = 0, gate = 1, pick = 'bottom', under = 0.3 } = {}) => {
    if (H.betAt < 0 || hisFrom(H, 0.8) > gate) return checkAll(H);
    const value = H.e.map((e) => e >= line); const bluffs = hisUnder(H, 0.3) >= needWeak ? bluffsFor(H, value) : 0;
    if (pick === 'bottom') return plan(H, value, bluffs);
    const score = pick === 'blockers' ? foldSeen(H) : pick === 'top' ? H.e : H.P.map((p) => 1 - p[H.check]);
    return chosen(H, value, bluffs, score, under);
  };
  const both = (opts) => ({ first: river((H) => bet(H, opts)), checkedTo: river((H) => bet(H, opts)) });
  const second = { first: river((H) => bet(H, { line: 0.85, needWeak: 0.3, gate: 0.25, pick: 'blockers' })), checkedTo: river((H) => bet(H, { line: 0.8, needWeak: 0.2, pick: 'blockers' })) };
  /** The third derivation, river betting. Everything is set against F, the share of his range that is weak (under 30% equity against mine).
   *  Checked to (a check is a showdown): value from 80%; the bluffs are the air (under 15%), s/(1+s) per value bet, and none when he has next to nothing to fold.
   *  First to act (a check is not a showdown): no bet when he holds many strong hands; value from 80%, or 90% when most of his range is weak; every hand
   *  more than a quarter below his folding line bets, since checked it wins nothing. */
  const third = {
    checkedTo: river((H) => { if (H.betAt < 0) return checkAll(H); const value = H.e.map((e) => e >= 0.8); const out = H.ids.map((_, i) => one(H.k, value[i] ? H.betAt : H.check)); if (hisUnder(H, 0.2) < 0.1) return out;
      let room = bluffsFor(H, value); for (const i of H.byE) { if (room <= 1e-9 || H.e[i] >= 0.15) break; out[i] = one(H.k, H.betAt); room -= H.w[i]; } return out; }),
    first: river((H) => { if (H.betAt < 0 || hisFrom(H, 0.8) > 0.3) return checkAll(H); const F = hisUnder(H, 0.3); const line = F >= 0.6 ? 0.9 : 0.8; const under = Math.max(0, F - 0.25);
      return H.ids.map((_, i) => one(H.k, H.e[i] >= line || H.e[i] < under ? H.betAt : H.check)); }),
  };
  /** Facing a river bet: everything with the price calls; the hands that beat half of what would continue against a raise, raise. */
  const facing = river((H) => { const price = H.faced / (1 + 2 * H.faced); const raise = H.kinds.indexOf('raise') >= 0 ? H.kinds.indexOf('raise') : H.kinds.indexOf('allin'); return H.e.map((e) => one(H.k, raise >= 0 && e >= 0.85 ? raise : e >= price ? H.call : H.fold)); });
  /**
   * The fourth derivation, river betting: one quantity, f, how much of his range folds to the bet, and three consequences.
   *   He folds what cannot call: his hands with less than the price, s/(1+2s), against the hands I bet. But never less than
   *   s/(1+s) of his range while I have air to bluff with: I add bluffs until he is indifferent.
   *   Value is what beats half of what continues: equity of (1+f)/2 or more.
   *   A hand that loses to everything that continues is a bluff when f(1+s) - s, what the bet wins outright, beats what
   *   checking keeps: its equity when a check is a showdown (checked to), about half its equity when it is not (first to act).
   * Solved by going round a few times: a guess at f gives the two lines, the two lines give what he folds.
   */
  function fourth(H, { keeps = 1, floor = 0.75, gate = 9, rounds = 6 } = {}) {
    if (H.betAt < 0 || hisFrom(H, 0.8) > gate) return checkAll(H);
    const s = H.betSize; const price = s / (1 + 2 * s); let f = s / (1 + s); let out = null;
    for (let k = 0; k < rounds; k++) {
      const b = Math.max(0, (f * (1 + s) - s) / keeps); const v = Math.min(0.97, Math.max(floor, (1 + f) / 2)); const value = H.e.map((e) => e >= v);
      out = H.ids.map((_, i) => one(H.k, value[i] || H.e[i] < b ? H.betAt : H.check));
      if (b <= 0) { let room = bluffsFor(H, value); for (const i of H.byE) { if (room <= 1e-9 || H.e[i] >= 0.15) break; out[i] = one(H.k, H.betAt); room -= H.w[i]; } }
      const mine = new Float64Array(N); H.ids.forEach((c, i) => { if (out[i][H.betAt] === 1) mine[c] = H.w[i]; }); const he = T.equityVs(fs, H.board, H.his, mine); let folds = 0;
      for (const x of H.hisOrder) if (!(he[x] >= price)) folds += H.his[x];
      f = Math.max(s / (1 + s), folds / H.hisTotal) * 0.5 + f * 0.5;
    }
    return out;
  }
  // ---- the turn: value above a line, then weak hands as a multiple of the value, chosen by a score -----------------------
  const turn = (rule) => (H) => (H.round === 0 ? rule(H) : H.P);
  const tbet = (H, { line = 0.8, mult = 0.43, pick = 'bottom', cap = 1 } = {}) => {
    if (H.betAt < 0) return checkAll(H); const value = H.e.map((e) => e >= line); const out = H.ids.map((_, i) => one(H.k, value[i] ? H.betAt : H.check)); let room = mult * mass(H, (i) => value[i]);
    const score = pick === 'come' ? H.come : pick === 'oracle' ? H.P.map((p) => 1 - p[H.check]) : H.e.map((e) => -e);
    const pool = H.ids.map((_, i) => i).filter((i) => !value[i] && H.e[i] < cap).sort((x, y) => score[y] - score[x]);
    for (const i of pool) { if (room <= 1e-9) break; out[i] = one(H.k, H.betAt); room -= H.w[i]; } return out; };
  const tb = (o) => ({ first: turn((H) => tbet(H, o)), checkedTo: turn((H) => tbet(H, o)) });
  const tface = (line, extra = 0) => turn((H) => { const price = H.faced / (1 + 2 * H.faced) + extra; const raise = H.kinds.indexOf('raise') >= 0 ? H.kinds.indexOf('raise') : H.kinds.indexOf('allin'); return H.e.map((e) => one(H.k, raise >= 0 && e >= line ? raise : e >= price ? H.call : H.fold)); });
  const turnSet = {
    'value 71%, 0.43 weak per value, from the bottom (first derivation)': tb({ line: 0.714 }),
    'value 80%, none': tb({ mult: 0 }), 'value 80%, 0.43 bottom': tb({}), 'value 80%, 0.75 bottom': tb({ mult: 0.75 }), 'value 80%, 1.2 bottom': tb({ mult: 1.2 }), 'value 80%, 2.06 bottom': tb({ mult: 2.06 }),
    'value 80%, 0.75 by still to come': tb({ mult: 0.75, pick: 'come' }), 'value 80%, 1.2 by still to come': tb({ mult: 1.2, pick: 'come' }), 'value 80%, 2.06 by still to come': tb({ mult: 2.06, pick: 'come' }),
    'value 80%, 2.06 by still to come, under 50% only': tb({ mult: 2.06, pick: 'come', cap: 0.5 }), 'value 71%, 2.06 by still to come': tb({ line: 0.714, mult: 2.06, pick: 'come' }),
    'value 80%, 1.2 as the solution picks': tb({ mult: 1.2, pick: 'oracle' }), 'value 80%, 2.06 as the solution picks': tb({ mult: 2.06, pick: 'oracle' }),
    'first to act only: value 80%, 2.06 by still to come': { first: turn((H) => tbet(H, { mult: 2.06, pick: 'come' })) }, 'checked to only: value 80%, 2.06 by still to come': { checkedTo: turn((H) => tbet(H, { mult: 2.06, pick: 'come' })) },
    'facing a bet: top 1/(1+s)': { facingBet: turn((H) => topCalls(H, 1 / (1 + H.faced))) }, 'facing a bet: the price': { facingBet: tface(2) }, 'facing a bet: five points under the price': { facingBet: tface(2, -0.05) },
    'facing a bet: the price, raise from 85%': { facingBet: tface(0.85) }, 'facing a raise: the price': { facingRaise: tface(2) },
  };
  const tcome = (H, line, need, cap = 0.6) => (H.betAt < 0 ? checkAll(H) : H.ids.map((_, i) => one(H.k, H.e[i] >= line || (H.e[i] < cap && H.come[i] >= need) ? H.betAt : H.check)));
  const tc = (line, need, cap) => ({ first: turn((H) => tcome(H, line, need, cap)), checkedTo: turn((H) => tcome(H, line, need, cap)) });
  const turn2 = {
    'value 75%, none': tb({ line: 0.75, mult: 0 }), 'value 80%, none': tb({ mult: 0 }), 'value 85%, none': tb({ line: 0.85, mult: 0 }),
    'value 80%, 0.75 by still to come, under 50%': tb({ mult: 0.75, pick: 'come', cap: 0.5 }), 'value 80%, 1.0 by still to come, under 50%': tb({ mult: 1, pick: 'come', cap: 0.5 }),
    'value 80%, and every hand with 10 points still to come': tc(0.8, 0.1), 'value 80%, and every hand with 15 points still to come': tc(0.8, 0.15), 'value 80%, and every hand with 20 points still to come': tc(0.8, 0.2), 'value 80%, and every hand with 25 points still to come': tc(0.8, 0.25),
    'value 75%, and every hand with 15 points still to come': tc(0.75, 0.15), 'value 75%, and every hand with 20 points still to come': tc(0.75, 0.2),
    'facing a bet: top 1/(1+s)': { facingBet: turn((H) => topCalls(H, 1 / (1 + H.faced))) }, 'facing a bet: eight points over the price': { facingBet: tface(2, 0.08) }, 'facing a bet: fifteen points over the price': { facingBet: tface(2, 0.15) },
    'facing a bet: eight over the price, raise from 90%': { facingBet: tface(0.9, 0.08) },
  };
  return {
    turn2,
    turn: turnSet,
    fourth: {
      'base (river betting only)': both({}),
      'fourth: checked to': { checkedTo: river((H) => fourth(H)) },
      'fourth: checked to, value never under 80%': { checkedTo: river((H) => fourth(H, { floor: 0.8 })) },
      'fourth: first to act (a check keeps half)': { first: river((H) => fourth(H, { keeps: 0.5 })) },
      'fourth: first to act, no bet when he holds many strong hands': { first: river((H) => fourth(H, { keeps: 0.5, gate: 0.3 })) },
      'fourth: first to act, the same, value never under 80%': { first: river((H) => fourth(H, { keeps: 0.5, gate: 0.3, floor: 0.8 })) },
      'fourth: river betting': { checkedTo: river((H) => fourth(H, { floor: 0.8 })), first: river((H) => fourth(H, { keeps: 0.5, gate: 0.3, floor: 0.8 })) },
      'fourth, whole river: with the price and raises from 85% facing a bet': { checkedTo: river((H) => fourth(H, { floor: 0.8 })), first: river((H) => fourth(H, { keeps: 0.5, gate: 0.3, floor: 0.8 })), facingBet: facing, facingRaise: river((H) => priceCalls(H)) },
    },
    third: {
      'base (river betting only)': both({}),
      'third: checked to': { checkedTo: third.checkedTo }, 'third: first to act': { first: third.first }, 'third: river betting': third,
      'river facing a bet: everything with the price': { facingBet: river((H) => priceCalls(H)) },
      'river facing a bet: the price, and raise from 85%': { facingBet: facing },
      'river facing a bet: the price, and raise from 90%': { facingBet: river((H) => { const price = H.faced / (1 + 2 * H.faced); const raise = H.kinds.indexOf('raise') >= 0 ? H.kinds.indexOf('raise') : H.kinds.indexOf('allin'); return H.e.map((e) => one(H.k, raise >= 0 && e >= 0.9 ? raise : e >= price ? H.call : H.fold)); }) },
      'river facing a raise: everything with the price': { facingRaise: river((H) => priceCalls(H)) },
      'third, whole river: betting, facing a bet (raise from 85%), facing a raise': { ...third, facingBet: facing, facingRaise: river((H) => priceCalls(H)) },
    },
    second: {
      'base (river betting only)': both({}),
      'bluffs by blockers: the hands that leave most of his range folding': both({ pick: 'blockers' }),
      'bluffs from the top of the weak hands': both({ pick: 'top' }),
      'bluffs as the solution picks them (the same number)': both({ pick: 'oracle' }),
      'bluff only where he has weak hands to fold (30%+ under 30% equity)': both({ needWeak: 0.3 }),
      'value from 80% equity': both({ line: 0.8 }),
      'checked to: value from 80%, bluff if he has weak hands (20%+)': { checkedTo: river((H) => bet(H, { line: 0.8, needWeak: 0.2 })) },
      'checked to: the same, bluffs by blockers': { checkedTo: second.checkedTo },
      'first to act: bet only if he lacks strong hands, value from 85%, bluff if weak hands (30%+)': { first: river((H) => bet(H, { line: 0.85, needWeak: 0.3, gate: 0.25 })) },
      'first to act: the same, bluffs by blockers': { first: second.first },
      'second derivation, river betting': second,
      'second derivation, with the river facing-a-bet rule (everything with the price)': { ...second, facingBet: river((H) => priceCalls(H)), facingRaise: river((H) => priceCalls(H)) },
      'river facing a bet: top 1/(1+s)': { facingBet: river((H) => topCalls(H, 1 / (1 + H.faced))) },
      'river facing a bet: everything with the price': { facingBet: river((H) => priceCalls(H)) },
      'river facing a bet: the price and three points': { facingBet: river((H) => priceCalls(H, 0.03)) },
    },
  };
}
