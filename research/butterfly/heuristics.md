# The chart with heuristics and calculations (9667 solved decisions, 132 spots)

## 1. How often the range acts: how close each estimate comes

Typical miss in points of the range (mean), with the P90 in brackets. Learnt estimates are made on other spots (five folds by spot).

| first to act | decisions | bets on average | one figure for the situation | by who led | book share (calculated) | world reading | small tree: what is seen | small tree: seen + range and nut advantage | small tree: seen + book share and lead | strong learner: everything |
|---|---|---|---|---|---|---|---|---|---|---|
| flop, out of position | 132 | 37% | 28 (58) | 24 (48) | 27 (72) | 21 (40) | 19 (44) | 16 (34) | 18 (38) | 13 (27) |
| flop, in position | 132 | 46% | 13 (28) | 11 (27) | 20 (40) | 13 (26) | 10 (20) | 10 (22) | 10 (20) | 8 (18) |
| turn, out of position | 1020 | 31% | 20 (37) | 16 (32) | 24 (51) | 22 (45) | 15 (32) | 15 (33) | 15 (33) | 10 (24) |
| turn, in position | 1028 | 47% | 15 (32) | 14 (29) | 17 (35) | 19 (38) | 13 (27) | 13 (27) | 12 (25) | 8 (17) |
| river, out of position | 1691 | 32% | 23 (36) | 18 (37) | 20 (45) | - | 17 (36) | 15 (33) | 13 (30) | 9 (20) |
| river, in position | 1713 | 54% | 9 (21) | 9 (19) | 12 (32) | - | 8 (17) | 6 (13) | 6 (13) | 4 (9) |

Flop, the raiser's bet by the c-bet ramp (15% at 52% range equity to 100% at 58%): out of position 23 (51), in position 26 (44)

| facing a bet | decisions | continues on average | one figure | minimum defence | min. defence x min(1, 2 x range equity) | small tree: price, size, who led | strong learner: everything |
|---|---|---|---|---|---|---|---|
| flop, out of position | 224 | 57% | 12 (22) | 11 (24) | 8 (16) | 7 (15) | 7 (14) |
| flop, in position | 203 | 66% | 9 (16) | 6 (13) | 7 (14) | 5 (10) | 4 (10) |
| turn, out of position | 338 | 49% | 8 (14) | 9 (20) | 5 (10) | 5 (12) | 4 (11) |
| turn, in position | 276 | 62% | 7 (16) | 8 (17) | 12 (22) | 7 (15) | 5 (12) |
| river, out of position | 1653 | 46% | 14 (30) | 14 (37) | 9 (18) | 6 (14) | 3 (7) |
| river, in position | 1257 | 54% | 9 (23) | 8 (22) | 10 (20) | 6 (13) | 4 (9) |

## 2. A rulebook with nothing fitted

First to act: the range bets its book share (in position), or its lead over his (out of position; the whole range on the flop once the lead reaches the small bet's price). Value is a hand that beats 71% of his range; bluffs come from the hands under 20%, as many as the ratio allows; the rest check. Facing a bet: on the river continue with the price; before it continue with the top of the range down to minimum defence (in position) or minimum defence x min(1, 2 x range equity) (out of position), and never below the price. A hand within 3 points of a line is called a mix.

| situation | decisions | mixing | rows alone (learnt) | the rulebook | severe | error per decision: median | P90 | P95 |
|---|---|---|---|---|---|---|---|---|
| flop, out of position, first to act | 132 | 43% | 50% | 51% | 7% | 53 | 96 | 100 |
| flop, in position, first to act | 132 | 66% | 66% | 29% | 9% | 73 | 89 | 90 |
| turn, out of position, first to act | 1020 | 28% | 58% | 55% | 12% | 49 | 81 | 89 |
| turn, in position, first to act | 1028 | 39% | 51% | 44% | 16% | 55 | 72 | 78 |
| river, out of position, first to act | 1691 | 22% | 57% | 60% | 8% | 41 | 80 | 88 |
| river, in position, first to act | 1713 | 24% | 58% | 62% | 9% | 37 | 62 | 69 |
| flop, out of position, facing a bet | 224 | 16% | 71% | 73% | 8% | 27 | 39 | 44 |
| flop, in position, facing a bet | 203 | 15% | 70% | 75% | 7% | 23 | 39 | 46 |
| turn, out of position, facing a bet | 338 | 16% | 72% | 82% | 2% | 14 | 35 | 44 |
| turn, in position, facing a bet | 276 | 20% | 70% | 74% | 6% | 26 | 41 | 44 |
| river, out of position, facing a bet | 1653 | 27% | 62% | 80% | 0% | 19 | 41 | 48 |
| river, in position, facing a bet | 1257 | 26% | 67% | 81% | 0% | 17 | 38 | 45 |

## 3. The chart, then the heuristic that helps most, then the next

A strong learner, on spots it has not seen (three folds by spot). "Right" is the share of the range called right as Always / Mix / Never; "severe" is a hand that always acts called never, or the reverse.


### flop, out of position, first to act (132 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 67% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 72% | | |
| **the chart alone** (row, equity, place on the bar) | 50% | | 7% |
| + 1. top pair+ and two pair+ lead, off the butterfly (read) | 66% | +15.4 | |
| + 2. stack to pot (counted) | 72% | +5.7 | |
| + 3. nut advantage and strong hands of both (read) | 74% | +2.0 | |
| the chart and those 3 | 74% | | 1% |
| the chart and every heuristic | 75% | | 0% |
| the rulebook, nothing fitted | 51% | | |

Error per decision, median / P90 / P95: chart alone 50 / 75 / 82; chart and those 3: 25 / 56 / 64; everything: 23 / 53 / 63.

### flop, in position, first to act (132 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 63% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 68% | | |
| **the chart alone** (row, equity, place on the bar) | 64% | | 2% |
| + 1. stack to pot (counted) | 67% | +3.9 | |
| + 2. the hand's draw (seen) | 70% | +2.2 | |
| + 3. the bet sizes on offer (seen) | 71% | +1.0 | |
| the chart and those 3 | 71% | | 1% |
| the chart and every heuristic | 70% | | 1% |
| the rulebook, nothing fitted | 29% | | |

Error per decision, median / P90 / P95: chart alone 36 / 59 / 63; chart and those 3: 28 / 48 / 56; everything: 30 / 50 / 60.

### turn, out of position, first to act (1020 decisions)

