# The river by hand category: policy and which hands matter

300 real rivers from the library, three bet sizes (a third, three quarters, one and a half pots) and a raise. Tolerance:
a hand may lose 0.5% of the pot. "Loss" is per hand against its best action.

Three reads are used throughout:

- **Strength here:** the hand's equity against his range at this decision. A category is not a strength: trips+ averages
  85% out of position but runs from under 50% to 100% depending on the board.
- **Nut advantage:** you hold a larger share of 80%+ hands than he does ("ahead"), or a smaller one ("behind").
- **Value per air:** your share of 80%+ hands divided by your share of hands under 30%.

## The short answer to "what do we coach per category"

1. **The category does not pick the hands. Strength here picks the action, and the spot picks whether the category bets
   at all.** In most category-and-strength cells one action fits nearly every hand inside the tolerance.
2. **Blockers decide little when betting first.** They matter in the few spots where a category splits, and for air.
3. **Blockers are the selection rule when facing a bet.** Inside a category, continue with the hands that hold cards
   from his value range and fold the ones that hold cards from his bluffs.
4. **Bet size is the costly choice for strong hands.** A wrong size costs 1.5 to 10% of the pot; bet or check about 1%.

## 1. Out of position, first to act

Always checking everything costs 0.56 per hand on average. That is how close this seat is to "check".

| Category | Share of range | Policy | Loss if followed |
|---|---|---|---|
| **Trips+** | 23% | Behind in nut advantage: check all of it. Ahead: bet, sized by strength (below) | 0.2-0.3; 0.9 for the 85-95% hands |
| **Two pair** | 7% | Check, except ahead with 70-85% (small) or 95%+ (big) | 0.1-0.5 |
| **Overpair** | 2% | Small with 70-85%; big with 85%+ when ahead | 0.1-0.6 |
| **Top pair** | 16% | Check under 70%. Small with 70-95% when ahead; behind, check under 85% | 0.0-0.3 |
| **Mid pair** | 12% | Check. Small only at 70%+ | 0.0-0.3 |
| **Low pair** | 16% | Check | 0.0-0.1; 0.6 when weak and ahead |
| **Air** | 24% | Behind: check. Ahead: bluff by count (below) | 0.2 behind; 1.0 ahead |

**Size ladder for value, any category:** 95%+ big; 85-95% three quarters; 70-85% small; under 70% check. Using the small
size with a 95%+ hand costs 9-13% of the pot; using the big size with a 70-85% hand costs 6-7%.

**Which hands inside the category, and how much it is worth:**

| Category | Spots where it splits | Hands that bet | Loss: that rule / random pick |
|---|---|---|---|
| Trips+ | 15% | The ones that do not hold cards from the hands he would bet after your check, and do not block his calls | 0.34 / 0.58 |
| Two pair | 11% | Same | 0.41 / 0.82 |
| Top pair | 6% | Best kicker | 0.13 / 0.78 |
| Mid pair | 9% | Highest equity (kicker, pair rank) | 0.13 / 0.65 |
| Low pair | 11% | **Lowest** cards: the ones with least showdown value become bluffs | 0.20 / 0.69 |
| Air | 36% | **Lowest** cards first; then those holding no card from his folding range | 0.43 / 1.40 |

So your example is right in direction for trips+ ("check the ones that block his calls, bet the ones that don't"), but
it is worth about a quarter of a percent of the pot, in one spot in seven. The stronger version: **check the strong
hands that leave him his betting range; they are the ones that get paid by checking.**

**What moves the policy from spot to spot:**

| Read | Effect |
|---|---|
| Nut advantage | The main one for trips+, two pair and top pair. Cuts the table's loss from 0.50 to 0.30 |
| Value per air | Decides air. Under 0.7: check it all. About 1: either. Over 1.3: bluff most of it. Over 2: bluff all |
| How often he bets after a check | Second for strong hands: the more he bets, the more they check |
| Range equity | Matters for air only |
| Stack depth, pot type | Nothing measurable |

The one cell no rule resolves: **trips+ with 85-95% when ahead** (5% of the range). Every single action loses about 0.9,
and no characteristic improves it by more than 0.15. It is a true mix.

## 2. In position, checked to

Here checking is expensive (2.7 per hand on average). The policy is the same ladder; nut advantage adds nothing because
his check has already capped him.

| Category | Policy | Loss if followed |
|---|---|---|
| **Trips+** | Bet. 95%+ big, 85-95% three quarters, 70-85% small, under 70% check | 0.2-0.4 |
| **Two pair** | Same ladder | 0.3-0.75 |
| **Overpair** | 70-85% small, 85-95% three quarters | 0.5-0.6 |
| **Top pair** | Check under 70%. Small with 70-95% | 0.0-0.7 |
| **Mid pair** | Check under 85%. Small above | 0.0-0.7 |
| **Low pair** | Check with 30%+. Under 30% it is a bluff candidate | 0.1-0.6; 2.9 if the weak ones always check |
| **Air** | Bluff by count | 1.3 as one action |

| Category | Spots where it splits | Hands that bet | Loss: that rule / random pick |
|---|---|---|---|
| Trips+ | 9% | Highest equity | 0.03 / 3.70 |
| Two pair | 15% | Highest equity; among equals, those holding no card from his folding range | 0.36 / 1.64 |
| Top pair | 18% | Best kicker | 0.12 / 1.12 |
| Mid pair | 13% | Highest equity | 0.31 / 0.89 |
| Low pair | 20% | Lowest cards | 0.37 / 1.36 |
| Air | 51% | Lowest cards | 0.38 / 2.19 |

- In position the selection rule is **strength order, then kicker**. Blockers add little.
- **Air and weak low pairs are decided by value per air:** under 0.7 the solver bluffs a quarter of them and checking is
  fine for 90%; from 1.2 to 2.8 it bluffs 70%; above 2.9 it bluffs all of them.
- Thin value (top or mid pair at 70-85%) is the soft cell: bet or check both cost about 0.7, and no clean read splits it.

## 3. Facing a bet

The category adds nothing once strength here and the bet size are known (loss 0.12-0.13 with or without it).

| Your equity against his betting range | Small bet | Three quarters | Big |
|---|---|---|---|
| Under 20% | Fold | Fold | Fold |
| 20-30% | Call | Fold | Fold |
| 30-40% | Call | Call | Fold |
| 40-70% | Call | Call | Call |
| 70-85% | Raise | Call or raise | Call |
| 85%+ | Raise | Raise | Raise |

Just calling with 95%+ costs 14-25% of the pot. It is the largest single mistake in the whole study.

**Which hands inside a category continue** (the category splits in 10-30% of spots):

| Rule | Loss per hand |
|---|---|
| Random pick | 0.7-1.1 |
| Those that block his strong hands most | 0.08-0.36 |
| Those that block his weak hands least | 0.09-0.23 |
| Best kicker (top pair and air only) | 0.4-0.7 |

Here your instinct holds fully: **among hands of the same category, call with the ones holding cards from his value
hands and fold the ones holding cards from his bluffs.** That is what separates two hands of the same made strength.

Bluff raises are 1-5% of the hands under the price and inside the tolerance for only 10-25% of them. When made, they
are the hands that block his strong hands. Leaving them out is the simple policy.

## 4. Does the table stand up when played?

Tables fitted on half the spots, scored on the other half (73-150 rivers). Exploitable is what a perfectly adapting
opponent wins, % of the pot, out of position / in position.

| Strategy | Gives up | Exploitable |
|---|---|---|
| Table alone, one action per cell | 0.5 / 0.7 | 22 / 26 |
| Table, bluffs counted off value bets (bet / (1 + bet) each), lowest cards first | 0.45 / 0.45 | 17 / 24 |
| That at first-to-act decisions only (solver elsewhere) | 0.3 / 0.4 | 7 / 11 |
| Facing-a-bet table only (solver elsewhere) | 0.1 / 0.1 | 11 / 20 |
| Facing a bet: the table, then call the best folds up to 90% of minimum defence | 0.4 / 0.2 | 6 / 7 |
| **Everything together** | 0.8 / 0.6 | **11 / 11** |
| Each cell plays the solver's average mix | 1.3 / 1.6 | 11 / 11 |

- The betting table with counted bluffs is sound.
- **The facing-a-bet table passes the per-hand tolerance and still leaks 11-20%.** A fixed equity line folds the wrong
  total. Adding "fill to the minimum defence" fixes it. Per-hand loss alone would not have shown this.

## Limits

- "Strength here", nut advantage and value per air were computed exactly. A player estimates them; nothing here
  measures the cost of estimating.
- The blocker rules use the solver's own calling, folding and betting ranges.
- Overpairs are 2% of the range; their rows rest on few hands.
- Thresholds (70 / 85 / 95%, value per air 0.7 / 1.3) are where the data changes action in bands I chose in advance,
  not searched values. The 90% defence fill is the engine's existing number.
- Rivers only, 300 spots, one library.

Tools: `category.py`, `deep.py`, `lookup.py`, `split.py`, `cellspots.py`, `facing.py`, `facing_inside.py`,
`export_lookup.py`, and the `LOOKUP` arms in `exploit.mjs`.

## 5. Which actual hands: selection by what is on the cards

Sections 1-3 say how much of a category acts. This section holds that amount fixed (the solver's share for the category
in each spot where it mixes, 10-90%) and asks which hands fill it, using only features visible on the cards
(`which.py`). Loss per hand in % of the pot; "random" is picking any hands of the category; the best possible pick is
0.00-0.02 everywhere.

**Out of position, first to act: which hands bet**

| Category | Random | Pick | Loss with that pick | Worst pick |
|---|---|---|---|---|
| Trips+ | 0.36 | The ones holding a card of the flush suit, when three of a suit are out; otherwise any | 0.27 | Pocket-pair sets first: 0.42 |
| Two pair | 0.28 | Any (lowest side cards marginally) | 0.23 | 0.43 |
| Top pair | 0.24 | Best kicker | 0.12 | Worst kicker: 0.41 |
| Mid pair | 0.33 | Highest cards (kicker, pair rank) | 0.13 | 0.54 |
| Low pair | 0.37 | **Lowest** cards | 0.17 | Highest cards: 0.51 |
| Air | 0.94 | **Lowest high card**; no ace | 0.36 | Ace-high first: 1.37 |

Out of position a random pick is already inside the 0.5 tolerance for every made-hand category. Only air needs a rule.
Missed draws were not better bluffs than other air (0.82 against 0.94 random).

**In position, checked to: which hands bet**

| Category | Random | Pick | Loss with that pick | Worst pick |
|---|---|---|---|---|
| Trips+ | 3.40 | Strongest first (nut flush over low flush, top set over bottom set) | 0.03 | Weakest first: 7.7 |
| Two pair | 1.14 | Strongest first | 0.38 | 1.9 |
| Top pair | 0.79 | Best kicker | 0.12 | Worst kicker: 1.33 |
| Mid pair | 0.58 | Best kicker / higher pair | 0.16 | 0.95 |
| Low pair | 0.97 | **Lowest** cards | 0.33 | Highest: 1.25 |
| Air | 1.76 | **Lowest high card**; no ace | 0.43 | Ace-high first: 2.9 |

**Facing a bet: which hands continue**

| Category | Random | Ranked by strength inside the category | Visible shortcuts |
|---|---|---|---|
| Trips+ | 7.6-7.7 | 0.00-0.01 | Holding the flush-suit card: 4.4-4.8 (not enough; rank them) |
| Two pair | 0.8-0.9 | 0.01-0.02 | Pairing the top board card: 0.29 |
| Top pair | 0.6-0.7 | 0.01 | Best kicker 0.40; holding a flush-suit card 0.25 (in position) |
| Mid pair | 0.5-0.6 | 0.01-0.02 | Holding a flush-suit card 0.27-0.32; best kicker 0.23 (in position) |
| Low pair | 0.5-0.6 | 0.02 | Holding a flush-suit card 0.31-0.32 |
| Air | 0.6-1.0 | 0.02-0.07 | Highest card / an ace: 0.29-0.35 |

Facing a bet, "strength inside the category" is the hand's rank among his betting hands: how many of them it beats
after removing the hands your own cards make impossible. Kicker and the flush-suit card are the visible parts of that,
and each gets about halfway from random to exact.
