# Were we too precise about hand selection?

**Yes.** Which exact hand takes an action matters far less than we treated it. What matters, in this order:

1. **The amounts:** how much of the range takes each action.
2. **The strength mix:** how much of each strength class goes into each action.
3. **The identity of the hand inside its class:** almost nothing, with three exceptions listed in section 5.

The catch: a tolerance band on its own is not a strategy. "Any action that costs this hand under X" is safe only when
the amounts are held. Let every hand drift freely inside the band and the strategy falls apart, even at a tiny band.

## What was measured

- **Spots:** 300 real rivers and 196 real turns from the stored library (ranges as play left them), solved again with
  three bet sizes and a raise; and 16 of the engine's 19 flops with one bet size a street and a raise.
- **Per hand:** what every action is worth (take it, then play as well as possible against the solver), in % of the pot
  at that decision. "Loss" is the gap to the hand's best action.
- **Two scores for a rebuilt strategy:** what it gives up against the solver's fixed play, and what a perfectly adapting
  opponent wins from it ("exploitable"). Both in % of the pot on that street.
- On turns only the turn decisions were rebuilt (the river stayed the solver's). Flops have per-hand losses only, no
  exploitability score.

## 1. How much of a range is "close to arbitrary"

Share of the range where a second kind of action (bet or check; fold, call or raise) costs no more than the tolerance.

| Decision | Solver mixes | 0.1% | 0.5% | 1% | 2% | 5% |
|---|---|---|---|---|---|---|
| Flop, betting first, in position | 71% | 55% | 84% | 89% | 94% | 98% |
| Flop, betting first, out of position | 46% | 48% | 75% | 82% | 89% | 96% |
| Flop, facing a bet, in position | 26% | 14% | 30% | 39% | 50% | 62% |
| Flop, facing a bet, out of position | 40% | 32% | 54% | 61% | 69% | 80% |
| Turn, betting first, in position | 52% | 32% | 64% | 73% | 83% | 93% |
| Turn, betting first, out of position | 47% | 23% | 64% | 76% | 86% | 97% |
| Turn, facing a bet | 26% | 12% | 31% | 38% | 45% | 58% |
| River, betting first, in position | 21% | 12% | 27% | 35% | 46% | 63% |
| River, betting first, out of position | 28% | 16% | 41% | 51% | 66% | 89% |
| River, facing a bet | 35% | 18% | 38% | 44% | 50% | 61% |

- **Betting first on the flop and turn is close to arbitrary per hand.** At half a percent of the pot, two thirds to
  five sixths of the range can do either.
- **Facing a bet is not.** Even at 5% of the pot, about 40% of the range has one right answer. Those are the clear folds
  (under 20% equity) and the clear continues (over 50%).
- **The river is the least free street when betting first:** the top must bet and the middle must check.

## 2. A band alone is not safe; a band with the amounts held is

Each player's whole river (or turn) rebuilt in different ways. Exploitable, out of position / in position.

| How the hands were chosen | River | Turn |
|---|---|---|
| Every hand takes its own best action (zero loss per hand) | 11 / 11 | 20 / 15 |
| Free choice inside a 0.5% band, picked at random | 13 / 12 | 20 / 15 |
| Free choice inside a 2% band, picked at random | 20 / 19 | 32 / 27 |
| Free choice inside a 2% band, always the aggressive one | 37 / 40 | - |
| **Solver's amounts held,** random hands inside a 0.5% band | 5 / 5 | 14 / 11 |
| **Solver's amounts held,** random hands inside a 2% band | 5 / 5 | 14 / 12 |
| **Solver's amounts held,** the costliest hands inside a 2% band | 6 / 6 | 17 / 16 |
| **Solver's amounts held,** the costliest hands inside a 5% band | 7 / 7 | - |

- **Zero loss per hand is not the test of a good strategy.** Every hand playing its own best action is 11% exploitable.
- **With the amounts held, the band can be very wide.** Deliberately picking the worst hands that lose up to 5% of the
  pot each costs two points on the river.
- So the precision we chased (which hand, to the last fraction) was aimed at the wrong thing.

## 3. Selection by plain rules, with the amounts held

| Rule for filling the solver's amounts | River | Turn |
|---|---|---|
| Hands fully at random | 37 / 35 | 65 / 64 |
| Random inside two classes (above or below 50% equity) | 20 / 26 | - |
| Random inside the manual's four classes | 15 / 20 | 26 / 26 |
| Random inside seven classes | 8 / 10 | 15 / 15 |
| Equity order: value from the top, folds from the bottom, bluffs from the weakest | 7 / 4 | 25 / 23 |
| The same, bluffs from **any** weak hand (under 35%), value from any strong hand (70%+) | 7 / 5 | 21 / 18 |
| Equity order with the two fixes in section 5 | 6 / 5 | 22 / 17 |

Seven classes: under 20%, 20-35, 35-50, 50-65, 65-80, 80-90, 90%+. Four: under 35, 35-65, 65-80, 80%+.

- **River: equity order is enough.** Random bluffs from the weak hands and random value from the strong hands score the
  same as the strict order.
- **Four classes are too coarse.** The 35-65% class straddles the calling price, so folding at random inside it folds
  hands that had to call. The fine cuts are needed around the price (20-50%) and at the top (80%+).
- **Turn: strict order is worse than a random pick inside seven classes** (22 / 17 against 15 / 15). On the turn the
  solver gives each action a share of every class. Strict order puts all the best hands into the bet or raise and
  leaves the check and call ranges capped. This is the "don't always raise your best hands" finding again.
- A turn floor of about 14 remains even with hands inside a 0.5% band. Turn hands carry on to the river, so the mix
  matters more there than on the river.

## 4. How exact the amounts need to be (river, equity order)

| Amount off by | Exploitable, OOP / IP |
|---|---|
| Right | 6 / 5 |
| Folds 15% fewer | 8 / 5 |
| Folds 30% fewer | 11 / 7 |
| Folds 15% more | 11 / 10 |
| Folds 30% more | 19 / 20 |
| Bets 30% fewer (value and bluffs) | 6 / 4 |
| Bets 30% more | 8 / 16 |
| Bluffs halved | 8 / 6 |
| No bluffs at all | 11 / 10 |
| Bluffs doubled | 10 / 14 |
| Value bets 30% more (thinner) | 8 / 15 |

- **Overfolding is the expensive error.** Folding 30% too little costs 5 points out of position and 2 in position; folding 30% too much costs 13 and 15.
- **Betting too little is nearly free; betting too much in position is not.**
- Bluff counts are forgiving: half or one and a half times the right number costs 1 to 4 points.

## 5. What makes one hand better than another of the same strength

Hands were compared inside 10-point equity bands in the same spot: the best third against the worst third by each
characteristic, in % of the pot per hand.

| Decision | Characteristic | Worth |
|---|---|---|
| Facing a flop bet, 30-70% equity | Has 8+ outs (flush draw or open-ender) | +10 |
| Facing a flop bet, 30-70% equity | Is a pair rather than a draw or overcards | -3 to -6 |
| Facing a turn bet, any hand under 70% | Has 8+ outs | +5 to +7 |
| Facing a turn bet, under 30% | Is a weak pair | -3 to -4 |
| Facing a river bet, 30-70% | Blocks his strong hands | +2.5 to +3 |
| Facing a river bet, 30-70% | Blocks his weak hands (his bluffs) | -2 to -3 |
| River bluff, betting first | Blocks the hands that call, leaves him the hands that fold | +2.5 to +4 |
| River bluff, betting first | Has a pair (some showdown value) | -2 (in position) |
| Raising a river bet as a bluff | Blocks his strong hands | +3 |
| Betting first on the flop or turn | Anything | under 1 |

Three selection rules came out of this, each tested on per-hand loss with the solver's amounts held:

1. **Bluff-raise with the best hands you would otherwise fold, not with your weakest.** Loss on the bluff-raising hands
   falls from 8-11% of the pot to 2-3% on the turn, from 5-8% to about 2.5% on the river, and from 6-8% to under 2% on
   the flop.
2. **Facing a bet before the river, count a hand with 8+ outs as about 10 points stronger than its equity.** Loss on the
   folded hands falls from 1.2% to 0.4% in position on the turn. I tried 5, 10 and 20 points and kept 10; "draws are
   always the last to fold" was worse than plain equity.
3. **River bluffs: prefer weak hands with no pair that hold a card from his calling range.** Real in money per hand, but
   it did not change the exploitable score.

Mean loss per hand of the whole range under these rules (solver's amounts held): 0.1-0.15% of the pot betting first on
the flop, 0.2-0.4% everywhere else. For comparison, the solver's own figure is 0.02-0.05%.

## 6. What this means for the method

- **Stop teaching hand lists.** Teach, per situation: how much to bet, call and fold; and what share of each strength
  class goes into each action.
- **Sort hands into about seven strength classes, fine around the price and at the top.** Inside a class, any hand will
  do, with the three exceptions above.
- **Flop and turn, betting first:** per-hand choice is free. Only the amount and the spread across classes matter.
- **River:** thresholds by equity. Value from the top, any weak hand as a bluff, call above the price.
- **Pure or mixed:** both. Every rule arm here is pure except the hand at each boundary. Mixing is one way to get the
  right share of a class into an action; picking some hands of the class to do it always is another, and scores the
  same.

## Limits

- Every test here used the **solver's amounts**. The open problem is unchanged: stating those amounts as rules a person
  can carry. This study says that is where the remaining precision belongs.
- Turn scores rebuild the turn only; flops have no exploitable score.
- Rivers and turns used three bet sizes, flops one. Sixteen flops is a small sample (15 to 24 decisions per row of the
  first table).
- The blocker figures use the solver's own calling and folding ranges, which a player has to estimate.
- The 10-point draw bonus was chosen among three values on the same turns it is reported on.

Tools: `collect.mjs` (values), `band.py` (section 1), `exploit.mjs` and `exploit_report.py` (2-4), `features.py`,
`rules.py`, `misses.py` (5). Work log: `NOTES.md`.
