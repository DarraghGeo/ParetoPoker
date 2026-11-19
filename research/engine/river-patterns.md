# River ranges and frequencies: what 30,000 solves show

A study note. Every figure is from 30,000 solved rivers, each with both ranges reshaped in a controlled way, so the
patterns are what stays true as the ranges change.

## How the solves were made

- **Boards:** five random cards.
- **Ranges:** two preflop ranges from one of 47 matchups (single-raised, 3-bet, 4-bet and squeezed pots), then each side
  reshaped by hand row (nothing, low pair, middle pair, top pair, overpair, two pair, trips or better): left as dealt,
  capped (few strong hands), polar (few middle hands), condensed (few weak and few strong), strong, weak, or random.
- **Game:** pot 100, one bet of three quarters of the pot, one raise to three times. Stack behind 40, 75, 125, 250 or
  500 (0.4 to 5 pots).
- **Equity** below always means a hand's equity against the range the other player holds at that decision.

Limits: one bet size; the ranges are reshaped preflop ranges on random boards, not ranges reached by playing a flop and
turn; river only.

## 1. Betting first: the shape is a U

How often each part of the range bets, by its equity.

| Equity | 0-10% | 10-20 | 20-30 | 30-40 | 40-50 | 50-60 | 60-70 | 70-80 | 80-90 | 90-100% |
|---|---|---|---|---|---|---|---|---|---|---|
| In position, checked to | 38% | 35% | 26% | 20% | 16% | 10% | 15% | 37% | 67% | 90% |
| Out of position, first | 29% | 19% | 10% | 9% | 9% | 12% | 20% | 38% | 61% | 68% |

- The middle (40-70% equity) almost never bets. It beats what folds and loses to what calls.
- The bottom bets as a bluff about a third of the time in position and less out of position.
- **Out of position the very best hands check a third of the time.** In position they bet nine times in ten.

## 2. Bluffs are counted off the value bets

Bluffs (hands under 50%) for each value bet (hands over 50%):

| Seat | Median | Middle half of spots | The ratio rule, bet ÷ (1 + bet) |
|---|---|---|---|
| In position | 0.40 | 0.30 to 0.43 | 0.43 |
| Out of position | 0.43 | 0.37 to 0.45 | 0.43 |

This is the most stable number in the whole study. However the ranges were reshaped, the solver kept close to three
bluffs for every seven value bets at this size. Nearly all of those bluffs are hands under 30% equity.

## 3. How thin value goes depends on the stack

How often the 60-70%, 70-80% and 80-90% bands bet, by stack behind.

| Stack behind (pots) | In position: 60-70 / 70-80 / 80-90 | Out of position: 60-70 / 70-80 / 80-90 |
|---|---|---|
| 0.4 | 41% / 71% / 84% | 63% / 71% / 76% |
| 0.75 | 10% / 45% / 73% | 27% / 50% / 64% |
| 1.25 | 6% / 26% / 66% | 6% / 27% / 61% |
| 2.5 | 5% / 15% / 57% | 4% / 21% / 53% |
| 5 | 5% / 15% / 57% | 4% / 20% / 51% |

- **With more than about a pot behind, value starts at roughly 80% equity,** and even the 80-90% band bets only a bit
  over half the time.
- **With less than a pot behind (the bet is all-in or close), value starts around 60-70%.** He cannot raise, so thinner
  hands can bet.
- Beyond about 2.5 pots, more depth changes nothing.

## 4. How often the range bets

| Seat | Average | Spread | Never bets | 
|---|---|---|---|
| In position, checked to | 50% | 33% to 67% in most spots | almost never |
| Out of position, first | 31% | 4% to 57% in most spots | one spot in five |

By stack: in position 63% at 0.4 pots behind, falling to 43% at 2.5 or more. Out of position 46% falling to 24%.

What moves it (correlation with bet frequency):

| Read | In position | Out of position |
|---|---|---|
| Your range's equity | +0.58 | +0.59 |
| Your share of strong hands (80%+) | +0.52 | +0.72 |
| His share of strong hands | -0.55 | -0.66 |
| Your share of weak hands (under 30%) | -0.51 | -0.34 |
| His share of weak hands | +0.45 | +0.36 |

Out-of-position bet frequency by the two strongest reads:

| His strong hands | You: under 10% strong | 10-25% | 25-40% | over 40% |
|---|---|---|---|---|
| Under 10% | 40% | 31% | 43% | 66% |
| 10-20% | 32% | 30% | 42% | 57% |
| 20-30% | 23% | 27% | 38% | 45% |
| Over 30% | 7% | 13% | 27% | - |

- **Out of position, bet when you hold the strong hands and he doesn't.** When over 30% of his range is strong, mostly
  check, whatever you hold.
- In position the frequency moves much less; it only drops sharply when over 30% of his range is strong (21-36%).

A simple count gets within about 14 points: bet frequency ≈ (your share of hands at 80%+ equity) × 1.43. That is "value
plus its bluffs". Nothing simple gets closer than about 10 points.

## 5. Facing a bet: the line is the price

Price of calling a three-quarter-pot bet: 30% equity. How often each part of the range folds:

| Equity | 0-10% | 10-20 | 20-30 | 30-40 | 40-50 | 50%+ |
|---|---|---|---|---|---|---|
| In position | 94% | 89% | 75% | 30% | 6% | 0-2% |
| Out of position | 99% | 99% | 81% | 27% | 0% | 0% |

- Hands with clearly more than the price never fold. Hands clearly under it almost always do.
- **The band that straddles the price (30-40%) is the mixed one:** it calls about 70% of the time.
- A fifth to a quarter of the 20-30% band still calls. Those are the hands whose cards block his value.
- This table is the same at every stack depth.

## 6. Facing a bet: how much of the range continues

| Seat | Continues | Minimum defence (MDF) |
|---|---|---|
| In position | 53% | 57% |
| Out of position | 44% | 57% |

The solver does not defend a fixed share. It tracks **your range's equity against his betting range**:

| Range equity against his bets | Under 30% | 30-40% | 40-50% | 50-60% | Over 60% |
|---|---|---|---|---|---|
| In position continues | 37% | 53% | 57% | 63% | 77% |
| Out of position continues | 28% | 50% | 56% | 75% | 92% |

- With 40-50% range equity it defends about MDF.
- Below that it folds more than MDF; above, it defends more.
- As a line: in position ≈ 19% + 0.89 × range equity; out of position ≈ -7% + 1.58 × range equity (both within about 6
  points).
- Plain MDF misses by 7 points in position and 13 out of position. "The share of hands with more equity than the price"
  misses by 7-8 in both seats, which says the same thing as section 5.

## 7. Raising a river bet

Where a raise is possible:

| Equity | Under 40% | 40-50 | 50-60 | 60-70 | 70-80 | 80-90 | 90-100% |
|---|---|---|---|---|---|---|---|
| In position raises | 3-6% | 14% | 21% | 26% | 46% | 79% | 97% |
| Out of position raises | 1-4% | 2% | 4% | 14% | 54% | 98% | 100% |

- In position raises 17% of the time, out of position 9%.
- Out of position the raise is the top of the range and little else. In position it reaches down into the 50-70% band.
- Bluff raises are few: a few percent of the weak hands.

## Rules of thumb

1. **Bet the top and the bottom, check the middle.**
2. **Count your bluffs off your value: about three bluffs for seven value bets at three quarters of the pot.**
3. **Value starts near 80% equity with a pot or more behind, and near 65% when the bet is all-in.**
4. **Out of position, check a third of your best hands; in position, bet nearly all of them.**
5. **Out of position, how much you bet follows who has the strong hands. If he has many, check.**
6. **Facing a bet, call with more equity than the price and fold with less; the hands at the price are the ones that mix.**
7. **Defend about MDF only when your range is level with his betting range. Behind it, fold more; ahead of it, call more.
   Out of position this swings twice as hard.**
8. **Raise the river with 80%+; in position also raise some hands from 50% up.**

Made with `research/engine/sweep.mjs` (the solves), `sweep_bets.py` and `sweep_defence.py` (the tables).
