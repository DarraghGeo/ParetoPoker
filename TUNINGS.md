# Tunings

A record of every number in the engine and the selectors that was chosen rather than derived,
with what it was tuned on and what else was tried. Kept so that later work can ask whether a
tuning depends on how the spot is defined (range advantage, nut advantage, polarization,
capping). Add a row when a number changes; do not delete the old result.

All losses are the share of the pot lost to the solver's best response ("exploited"), both
seats averaged, unless a row says otherwise. Lower is better.

## Test sets

| Name | Trees | Ranges | Stack | Bets / raises |
|---|---|---|---|---|
| R12 | 12 rivers: `Td9d6hQc7s Ks7h2d5c9s AhJh8c3d2h 8s8d4c2hKd QsJd6c3h2s Ac9c5d5hTs 7h6h5c2dKs KdQd4s9h3c Jc8c3c6dAh Ts7s4d2hQh AdKh7c7d2s 9s8h3d2cJd` | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| R4 | the first 4 rivers of R12 | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| R8-B | 8 rivers: `Kh8s4d2cJs As7d6d3hTc QdTd5s9c2h 9h9c4s7dAd JsTh2c5dKd 6s5s2h8cQs Ad5c3h9sQc Th8h7c2sAc` | B | 4x pot | 50%, 100% / 3x |
| T4 | 4 turns: `Ks7h2d5c JsTs4h8d Td9d6hQc Ah8c3d6s` | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| F1 | 1 flop: `Td9d6h` | A | 1.5x pot | 75% / 3x |
| M6 | 4 rivers and 2 turns (R4 plus `Ks7h2d5c JsTs4h8d`) | A | 2.5x pot | 33%, 75%, 150% / 2.5x |

Ranges A: OOP `66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s`, IP
`QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+`.
Ranges B: OOP `99-22,A9s-A2s,K2s+,Q5s+,J7s+,T7s+,96s+,86s+,75s+,64s+,54s,AJo-A2o,K9o+,Q9o+,J9o+,T9o`,
IP `22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QTo+,JTo`.

Every set uses a pot of 100 and the engine's defaults (geometric sizing, 3 raises). Nothing has
been run with other engine settings, other pot sizes, or preflop.

## Summary

| # | Tuning | Where | Value | From | Tuned on | Checked on | Spot-dependence |
|---|---|---|---|---|---|---|---|
| 1 | `valueThreshold` | NapkinSelector | 0.7 | guide: 0.5 | R12 | R8-B, T4 | not tested; see note |
| 2 | `oopValueChecks` | NapkinSelector | 0.2 | new | R12 | R8-B, T4 | likely; see note |
| 3 | `riverBluffs` | NapkinSelector | `'weakest'` | guide: `'air'` | R12 | - | not tested |
| 4 | `twinEquity` | NapkinSelector | 0.02 | chosen | R12 (no effect) | - | not tested |
| 5 | `priorStrength` | NapkinSelector | 0.13 | new | R4 | R12 | not tested |
| 6 | bluff-catcher weights | `WEIGHTS.catcher` | 0.13, 0.13, 0.07, 0.03, 0.02 | guide's table | R4 (no effect) | - | not tested |
| 7 | `drawBehind` | NapkinSelector | 1 pot | new | F1 | T4 | by construction (stack depth) |
| 8 | flop bluff role order | NapkinSelector | the turn's rule | guide: draws first | F1 | - | by construction (depth, range advantage) |
| 9 | role-order thresholds | `WEIGHTS.rangeGap/shallow/deep` | 0.05, 1.25, 5 | chosen | never tuned | - | by construction |
| 10 | `valueThreshold` | EquitySelector | 0.5 | theory | M6 (flat) | R12 | not tested |
| 11 | `callFloor` | both selectors | 0.5 | new | M6 (flat) | - | not tested |
| 12 | `barrelSize` | ParetoEngine | 0.75 pot | chosen | never tuned | - | not tested |
| 13 | `sizing` | ParetoEngine | `'geometric'` | theory | never tuned | - | not tested |
| 14 | untuned guide numbers | NapkinSelector | see below | guide | never tuned | - | not tested |

## Each tuning

### 1. Napkin `valueThreshold` = 0.7

A hand bets or raises for value when it beats more than this share of the range that continues.

| Set | 0.5 | 0.55 | 0.6 | 0.7 | 0.75 | 0.8 | 0.85 | 0.9 |
|---|---|---|---|---|---|---|---|---|
| R12, `oopValueChecks` 0 | 6.77 | 6.25 | 5.52 | 3.93 | 4.22 | 4.77 | 5.22 | |
| R12, `oopValueChecks` 0.2 | | | | 3.87 | 4.25 | 4.73 | 5.19 | |
| R8-B, `oopValueChecks` 0.2 | 5.86 | | 5.07 | 4.41 | | 4.49 | | 5.52 |
| T4, `oopValueChecks` 0.2 | 21.79 | | 18.13 | 14.32 | | 12.25 | | 13.34 |

Loss against the solver's equilibrium on T4: 3.2% at 0.5, 2.3% at 0.7, 2.8% at 0.8, 3.8% at 0.9.
One value is used on every street. Turns alone would pick 0.8 on exploited loss and 0.7 on loss
against equilibrium.

Spot note: the solver's own thinnest value bet (10th percentile, equity against the hands that
really call) is 0.52-0.73 out of position and 0.51-0.63 in position across R12. It moves little
with any spot measure out of position (strongest: 0.48 with our polarization) and falls with nut
advantage in position (-0.65). The tuned 0.7 is higher than the solver's because the engine's
model of the range that continues is weaker than the real one, so whether the best threshold
moves with the spot has to be measured per spot, which has not been done.

### 2. Napkin `oopValueChecks` = 0.2

Out of position on the river, every value hand checks this share of the time.

| Set | 0 | 0.15 | 0.2 | 0.3 | 0.35 | 0.45 |
|---|---|---|---|---|---|---|
| R12, `valueThreshold` 0.5 | 6.77 | 5.54 | | 4.56 | | 4.11 |
| R12, `valueThreshold` 0.7 | 3.93 | | 3.87 | | 3.94 | |
| R8-B, `valueThreshold` 0.7 | 4.52 | | 4.41 | | | |
| T4, `valueThreshold` 0.7 | 14.68 | | 14.32 | | | |

Most of its effect disappears once `valueThreshold` is 0.7: the two overlap. It replaces the
guide's `thinValue` and `trapShare` rules, which changed nothing on R12 (6.77 with or without)
because thin hands are not value at the engine's bet sizes.

Spot note: the solver checks 34-65% of its strong value (80%+ equity) out of position across
R12, and about 3% in position. Out of position that share rises when we are capped (0.52) and
falls with range advantage (-0.51), nut advantage (-0.48) and polarization advantage (-0.54).
All sit at the edge of noise for 12 spots but point the same way, so this is the tuning most
likely to want a spot-dependent value.

### 3. Napkin `riverBluffs` = `'weakest'`

| | `'air'` (guide: air first, by blockers) | `'weakest'` (least equity first, blockers among twins) |
|---|---|---|
| R12, `valueThreshold` 0.5 | 7.24 | 6.77 |
| Diagnosis on R12: must-bluffs ranked above can't-bluffs | 0.78 | 0.91 |

Among twins the blocker term is `0.4 x (blocks his calls - blocks his folds)`; the 0.4 only has
to keep the term inside one twin band and was not tuned. In the diagnosis, among in-position
bluffs of equal equity, blocking his calls separates musts from can'ts at 0.60 and not blocking
his folds at 0.66. Out of position equity alone decided every case.

### 4. Napkin `twinEquity` = 0.02

0.02 and 0.05 both give 6.77 on R12.

### 5. Napkin `priorStrength` = 0.13

Weight, among the bluff-catcher marks, of equity against the range he started the hand with.

| Set | 0 | 0.13 | 0.3 |
|---|---|---|---|
| R4 (when added) | 15.16 | 6.71 | |
| R12, `valueThreshold` 0.5 | | 6.77 | 6.68 |

In the diagnosis it is the best single separator of must-calls from must-folds on R12 (0.94, and
0.83-0.88 among twins of equal equity against his bets).

### 6. Bluff-catcher weights

Margin 0.13, equity against his value 0.13, blocks his value 0.07, good rivers 0.03, bad rivers
0.02: each mark's gap between must-calls and must-folds in the guide's table. The first version
used 3, 2, 2, 1, 1. Both gave 15.16 on R4 before `priorStrength` was added.

Tried and left out: not blocking his bluffs as a mark. Weight 0.07 gave 6.73 and 0.2 gave 6.78
on R12, against 6.77 without, although the diagnosis rates it 0.64-0.85 among twins.

### 7. Napkin `drawBehind` = 1

A draw calls ahead of made hands only when this many pots are left behind after the call.

| Set | 0 | 0.5 | 1 | 2 |
|---|---|---|---|---|
| F1, out of position / in position | 27.2 / 31.7 | 26.4 / 28.4 | 26.4 / 28.4 | 26.4 / 28.4 |
| T4 (`valueThreshold` 0.5) | 25.50 | | 23.82 | |

F1 cannot tell 0.5, 1 and 2 apart: its stacks are too shallow for any call to leave half a pot.

### 8. Flop bluff role order

The guide puts draws first on the flop. Using the turn's rule (pure bluffs first when we are
ahead in range or stacks are shallow) and putting pairs last moved F1 from 29.6 / 39.9 to
27.2 / 31.7 (out of position / in position). F1 has shallow stacks only; the draws-first branch
has not been measured.

### 9. Role-order thresholds (never tuned)

`rangeGap` 0.05: the range-equity gap at which the spot fully favours one order. `shallow` 1.25
and `deep` 5: stack-to-pot ratios. Draws go first when the two terms sum above zero.

### 10. Equity `valueThreshold` = 0.5

| Set | 0.5 | 0.55 | 0.6 | 0.65 | 0.7 | 0.75 | 0.8 |
|---|---|---|---|---|---|---|---|
| M6 | 16.72 | 16.12 | 14.94 | 12.38 | 13.71 | | 14.09 |
| R12 | 9.33 | | | | | 9.35 | |

Flat, unlike Napkin's: a higher threshold only pays with Napkin's calling order behind it.

### 11. `callFloor` = 0.5

A hand needs this share of the pot odds in equity to call, and his continuing range is assumed
to as well. On M6 with the equity selector: 0 gives 16.73, 0.25 16.63, 0.5 16.62, 0.75 16.61,
1 gives 18.09. It exists for ranges with no bluff-catchers: without it the engine lost 12.5% in
the nuts-or-air game by calling with hands that beat nothing.

### 12-13. Engine: `barrelSize` 0.75 and `sizing` `'geometric'`

Never tuned. One early run on the turn `Td9d6hQc` (stack 3x pot, equity selector, before later
changes): `multiStreetBluffs: false` 27.7 / 21.9 against 24.2 / 21.7; `sizing: 'smallest'`
27.2 / 21.8. The diagnosis shows the solver's main river size out of position is 33% pot on
every R12 board, while the engine's geometric choice is the largest size. This is the most
obvious untested lever.

### 14. Guide numbers never tuned

`airEquity` 0.2, Newman's points (0.8 at half a pot, 0.9 at a pot, 0.97 at three pots),
`thinValue` 0.5-0.7 and `trapShare` 1/6 (both inactive by default), the 0.1 blocker weight in
the value order, and the diagnosis's must and can't cut-offs (85% and 15%).

## Spot data

`node bin/diagnose.js --out diagnosis/rivers.json` writes, for every opening decision, how the
spot is defined (range advantage, nut advantage, polarization advantage, capping, from
poker-rangeman's `compare()`) next to what the solver does there (how often it bets, its main
size, how much strong value it checks, its thinnest value bet, its strongest bluff, the bluff
share of its bets), and the correlations between the two for each seat. `diagnosis/rivers.json`
holds the R12 run.

What that file does not yet answer: whether the *best tuning* changes with the spot. It shows
whether the solver's play does. Answering the first needs each tuning swept per spot and the
per-spot optimum compared with the spot's measures.
