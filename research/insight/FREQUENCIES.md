# Range frequencies: the base formula and what corrects it

How often a range bets, folds to a bet and raises a bet, from a formula rather than a solve. The base is the derived one from the earlier engine (`research/src/derived.js`) and is never refitted. Corrections are added from facts about the two ranges, chosen on one set of flops and tried once on flops never seen.

## Verdict

- **Folding to a bet: accurate.** 4 to 5 points off on every street on unseen flops, which is close to the solver's own noise (about 3).
- **Betting on the river in position: close with the base alone.** 7 points off. No correction improves it.
- **Betting elsewhere: not accurate.** 12 to 16 points off on unseen flops, down from 16 to 28 for the base alone. A flexible model on the same facts reaches 7 to 10, so the limit is the facts, not the fitting.
- **Raising a bet on the flop: rough.** 10 points off. It has no derived base.

## Data

126 flops on the realistic ranges, solved whole to 0.3%: 8,250 decisions with both ranges recorded hand by hand (each hand's weight and its equity against the other range). 111 flops to choose and fit on, 15 fresh flops (2,182 decisions) for the final test.

**How settled the target is.** Six spots solved to 0.3% and again to 0.03% by two algorithms: the flop bet frequency moves 1.4 points on average, the turn bet frequency 2.6, the fold frequency 2.8, the raise frequency 3.1. A formula cannot be expected to do better than that.

## The base

The von Neumann thresholds on the bettor's real equity curve, for a bet of `s` pots:

- he folds `c = (s + a) / (1 + s)`, where `a` is the equity of the best bluff;
- the thinnest value bet beats half of what calls: `b = (1 + c) / 2`;
- bluffs are `s / (1 + s)` of the value bets.

So the range bets `v × (1 + s/(1+s))`, with `v` the share of it above `b`, and the defender folds `c`.

**Two repairs to how it was computed, not to the formula.** It is now solved by how much of the range bets for value rather than by the equity level, so that many hands of one strength (the board playing, the same flush) are shared out; before, a lump of equal hands could all be counted as bluffs. With several sizes offered the smallest is used.

## How close each formula is

Mean miss in percentage points of frequency. "Chosen on" is with whole flops left out in turn; "unseen" is the 15 fresh flops.

| Decision | Base alone (unseen) | With corrections (chosen on) | With corrections (unseen) | Within 5 points (unseen) | Flexible model, same facts |
|---|---|---|---|---|---|
| Fold, flop | 12.2 | 4.1 | 5.4 | 56% | 3.4 |
| Fold, turn | 9.3 | 5.5 | 5.3 | 56% | 3.7 |
| Fold, river | 3.9 | 3.7 | 4.0 | 76% | 2.6 |
| Bet, river, in position after a check | 7.2 | 6.6 | 7.5 | 45% | 4.0 |
| Bet, river, out of position | 15.7 | 10.0 | 11.8 | 39% | 6.8 |
| Bet, turn, in position after a check | 19.9 | 11.3 | 12.7 | 30% | 7.3 |
| Bet, turn, out of position | 18.0 | 11.8 | 12.5 | 35% | 10.1 |
| Bet, flop, in position after a check | 19.8 (chosen on) | 8.8 | too few | | 9.5 |
| Bet, flop, out of position | 28.4 | 11.6 | 15.9 | 13% | 9.6 |
| Raise, flop | no base | 6.8 | 9.6 | 37% | |

## The corrections

Each is `frequency = expit(logit(base) + constant + Σ slope × factor)`. The slopes are in `out/freq-formulas.txt` and `out/freq-formulas.json`. What matters, in words:

**Folding to a bet**
- **Seat.** In position folds less than the base says, on every street.
- **The bettor's range advantage before he bet** (flop). The further ahead he was, the more the defender folds.
- **How much air the bettor holds** (flop). More air in his range goes with more folding than the base, not less.
- **The defender's share of strong hands** (turn). More of them, less folding.
- The river needs almost nothing: the base is already within 4 points.

**Betting**
- **Share of strong hands against his** ("strong advantage": hands with 65% equity or more, mine less his). The largest single factor on every street. Plain range advantage and nut advantage (80% or more) carry less once this is in.
- **How spread out his range is.** A polarised opponent range cuts betting sharply; a condensed one invites it.
- **Swing** (turn). The more the river card moves the range's hands, the more it bets. Drawn equity pulls the other way once swing is counted.
- **Stack depth** (flop, out of position). Deeper stacks, less betting.
- **What he does when checked to** (flop and turn, out of position; known only from the solve). The more he bets after a check, the less the range leads. It adds under one point of accuracy.
- How often he folds or raises in the solution adds nothing once the ranges are known.

**Where the base is structurally wrong**
- **Flop and turn bluffs.** Value bets are about as many as the base says (flop 20% against 20%, turn 19% against 18%). Bluffs are three times as many: 0.7 bluffs for every value bet against the 0.25 to 0.43 the price allows. Draws and thin protection bets are not in a one-street formula. On the river the ratio is right (0.40 against 0.42).
- **Out of position.** The base treats a check as a showdown. Out of position it is not, and the river base over-bets by 7 points there.
- **Value bets are not a threshold.** Only 45% to 54% of the hands that are ahead bet. Which strong hands check is the part no summary of the range recovers.

## What would get betting frequency accurate

- **Adding up hands.** A model of each hand's own chance of betting (its equity, its place in the range, its draws, the spot), summed over the range, reaches 9.4 on the flop and 8.1 on the turn on flops left out (`freq_hand.py`). Better than any summary, not a formula one can write down.
- **The level game.** `research/src/CurveGame.js` solves the one-street game on both real curves with the real bet menu in milliseconds. On the river that is nearly the solve itself. It has no shared order of hands on the flop and turn.
- **More flops.** Only 214 flop betting decisions were available to fit on; the flop numbers are the least certain here.

## Files

`collect.mjs` (solves and records), `rebuild.mjs` (his range at each decision of the first collection), `freq_lib.py` (the base and the factors), `freq_final.py` (choosing, fitting, the test), `freq_two.py` (value and bluffs fitted apart), `freq_hand.py` (hands added up), `noise.mjs` (how settled the target is).
