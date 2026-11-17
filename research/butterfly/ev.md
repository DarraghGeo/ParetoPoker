# What the calls cost, and the kinds of error (6731 decisions solved again with each action's worth, 41 spots)

EV lost is in percent of the pot at the decision, summed over the range: Always plays the acting move, Never checks or folds, Mix plays half of each. "The solver's own labels" is the floor of the measure: the right label for every hand, with every mix played half and half.


## flop, out of position, first to act (41 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.06 | 0.06 | 0.15 | 0.16 | 0% |
| rows alone | 57% | 0.16 | 0.14 | 0.29 | 0.31 | 0% |
| the rulebook, nothing fitted | 56% | 0.12 | 0.04 | 0.33 | 0.35 | 0% |
| heuristics and made class, no chart | 64% | 0.18 | 0.07 | 0.32 | 0.72 | 5% |
| the chart alone | 56% | 0.21 | 0.17 | 0.41 | 0.46 | 2% |
| the chart and its 2 heuristics | 68% | 0.16 | 0.11 | 0.34 | 0.50 | 2% |
| the chart and every heuristic | 70% | 0.14 | 0.07 | 0.30 | 0.33 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 57% / 0.03 | 9% / 0.01 | 9% / 0.00 | 11% / 0.02 | 10% / 0.07 | 5% / 0.03 |
| the rulebook, nothing fitted | 56% / 0.01 | 7% / 0.00 | 13% / 0.01 | 16% / 0.04 | 2% / 0.02 | 6% / 0.05 |
| heuristics and made class, no chart | 64% / 0.03 | 9% / 0.01 | 8% / 0.00 | 7% / 0.01 | 9% / 0.07 | 3% / 0.04 |
| the chart alone | 56% / 0.03 | 10% / 0.01 | 8% / 0.00 | 8% / 0.02 | 15% / 0.10 | 4% / 0.05 |
| the chart and its 2 heuristics | 68% / 0.04 | 10% / 0.01 | 5% / 0.00 | 4% / 0.01 | 9% / 0.06 | 3% / 0.03 |
| the chart and every heuristic | 70% / 0.04 | 9% / 0.01 | 6% / 0.00 | 5% / 0.01 | 8% / 0.05 | 1% / 0.02 |

## flop, in position, first to act (41 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.10 | 0.07 | 0.17 | 0.27 | 0% |
| rows alone | 62% | 0.59 | 0.36 | 1.13 | 1.87 | 12% |
| the rulebook, nothing fitted | 29% | 0.30 | 0.21 | 0.40 | 0.51 | 2% |
| heuristics and made class, no chart | 65% | 0.42 | 0.21 | 0.62 | 1.76 | 7% |
| the chart alone | 60% | 0.49 | 0.29 | 1.26 | 1.49 | 15% |
| the chart and its 2 heuristics | 62% | 0.31 | 0.18 | 0.53 | 0.67 | 5% |
| the chart and every heuristic | 66% | 0.31 | 0.17 | 0.42 | 0.67 | 5% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 62% / 0.08 | 9% / 0.06 | 1% / 0.00 | 1% / 0.02 | 25% / 0.41 | 1% / 0.02 |
| the rulebook, nothing fitted | 29% / 0.02 | 8% / 0.03 | 24% / 0.01 | 25% / 0.05 | 3% / 0.05 | 11% / 0.13 |
| heuristics and made class, no chart | 65% / 0.09 | 10% / 0.06 | 3% / 0.01 | 2% / 0.00 | 20% / 0.26 | 0% / 0.01 |
| the chart alone | 60% / 0.07 | 9% / 0.03 | 6% / 0.00 | 5% / 0.01 | 16% / 0.16 | 4% / 0.20 |
| the chart and its 2 heuristics | 62% / 0.08 | 10% / 0.05 | 6% / 0.01 | 5% / 0.01 | 16% / 0.16 | 1% / 0.02 |
| the chart and every heuristic | 66% / 0.08 | 10% / 0.06 | 4% / 0.01 | 3% / 0.01 | 16% / 0.15 | 1% / 0.01 |

## turn, out of position, first to act (303 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.04 | 0.03 | 0.08 | 0.12 | 0% |
| rows alone | 56% | 0.35 | 0.20 | 0.78 | 1.26 | 7% |
| the rulebook, nothing fitted | 55% | 0.40 | 0.24 | 1.06 | 1.38 | 12% |
| heuristics and made class, no chart | 64% | 0.26 | 0.17 | 0.62 | 0.86 | 4% |
| the chart alone | 56% | 0.43 | 0.30 | 0.90 | 1.27 | 7% |
| the chart and its 3 heuristics | 65% | 0.28 | 0.18 | 0.65 | 0.85 | 4% |
| the chart and every heuristic | 67% | 0.22 | 0.15 | 0.47 | 0.65 | 3% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 56% / 0.00 | 7% / 0.00 | 11% / 0.01 | 11% / 0.02 | 2% / 0.02 | 13% / 0.29 |
| the rulebook, nothing fitted | 55% / 0.01 | 7% / 0.01 | 9% / 0.01 | 10% / 0.02 | 7% / 0.12 | 12% / 0.24 |
| heuristics and made class, no chart | 64% / 0.01 | 9% / 0.01 | 8% / 0.01 | 6% / 0.01 | 10% / 0.14 | 5% / 0.09 |
| the chart alone | 56% / 0.01 | 8% / 0.01 | 9% / 0.01 | 8% / 0.02 | 10% / 0.17 | 9% / 0.23 |
| the chart and its 3 heuristics | 65% / 0.01 | 8% / 0.01 | 7% / 0.01 | 6% / 0.01 | 10% / 0.14 | 5% / 0.10 |
| the chart and every heuristic | 67% / 0.02 | 9% / 0.01 | 7% / 0.01 | 5% / 0.01 | 9% / 0.10 | 4% / 0.07 |

## turn, in position, first to act (307 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.08 | 0.04 | 0.14 | 0.29 | 1% |
| rows alone | 50% | 0.76 | 0.60 | 1.60 | 2.00 | 23% |
| the rulebook, nothing fitted | 44% | 0.73 | 0.59 | 1.33 | 1.83 | 22% |
| heuristics and made class, no chart | 58% | 0.48 | 0.38 | 0.91 | 1.25 | 9% |
| the chart alone | 52% | 0.65 | 0.48 | 1.31 | 1.87 | 18% |
| the chart and its 3 heuristics | 60% | 0.39 | 0.28 | 0.76 | 1.14 | 6% |
| the chart and every heuristic | 62% | 0.34 | 0.26 | 0.69 | 0.90 | 4% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 50% / 0.05 | 9% / 0.03 | 6% / 0.01 | 6% / 0.02 | 20% / 0.41 | 8% / 0.26 |
| the rulebook, nothing fitted | 44% / 0.03 | 7% / 0.01 | 11% / 0.01 | 13% / 0.03 | 9% / 0.16 | 16% / 0.48 |
| heuristics and made class, no chart | 58% / 0.04 | 8% / 0.02 | 7% / 0.01 | 5% / 0.02 | 16% / 0.25 | 6% / 0.14 |
| the chart alone | 52% / 0.04 | 8% / 0.02 | 8% / 0.01 | 8% / 0.02 | 16% / 0.28 | 8% / 0.28 |
| the chart and its 3 heuristics | 60% / 0.04 | 8% / 0.02 | 8% / 0.01 | 7% / 0.02 | 14% / 0.21 | 4% / 0.09 |
| the chart and every heuristic | 62% / 0.04 | 8% / 0.02 | 7% / 0.01 | 5% / 0.01 | 13% / 0.18 | 4% / 0.08 |

## river, out of position, first to act (1436 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.06 | 0.03 | 0.13 | 0.21 | 0% |
| rows alone | 56% | 0.87 | 0.43 | 2.11 | 3.20 | 28% |
| the rulebook, nothing fitted | 59% | 0.64 | 0.40 | 1.61 | 2.14 | 22% |
| heuristics and made class, no chart | 65% | 0.51 | 0.28 | 1.28 | 1.63 | 16% |
| the chart alone | 59% | 0.71 | 0.46 | 1.59 | 2.15 | 24% |
| the chart and its 2 heuristics | 67% | 0.39 | 0.24 | 0.85 | 1.21 | 8% |
| the chart and every heuristic | 69% | 0.33 | 0.22 | 0.74 | 1.03 | 5% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 56% / 0.00 | 5% / 0.00 | 9% / 0.01 | 10% / 0.04 | 0% / 0.00 | 20% / 0.81 |
| the rulebook, nothing fitted | 59% / 0.03 | 7% / 0.02 | 6% / 0.01 | 5% / 0.02 | 15% / 0.34 | 8% / 0.23 |
| heuristics and made class, no chart | 65% / 0.02 | 7% / 0.02 | 7% / 0.01 | 6% / 0.02 | 8% / 0.16 | 7% / 0.28 |
| the chart alone | 59% / 0.01 | 6% / 0.01 | 8% / 0.01 | 8% / 0.03 | 7% / 0.15 | 13% / 0.49 |
| the chart and its 2 heuristics | 67% / 0.02 | 7% / 0.02 | 7% / 0.01 | 5% / 0.02 | 7% / 0.14 | 6% / 0.18 |
| the chart and every heuristic | 69% / 0.02 | 7% / 0.02 | 7% / 0.01 | 5% / 0.02 | 8% / 0.14 | 5% / 0.12 |

## river, in position, first to act (1450 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.11 | 0.04 | 0.22 | 0.44 | 2% |
| rows alone | 59% | 1.99 | 1.37 | 4.52 | 5.85 | 61% |
| the rulebook, nothing fitted | 61% | 1.12 | 0.76 | 2.44 | 3.45 | 37% |
| heuristics and made class, no chart | 65% | 1.39 | 0.76 | 3.54 | 4.92 | 41% |
| the chart alone | 70% | 0.62 | 0.39 | 1.40 | 1.93 | 17% |
| the chart and its 2 heuristics | 74% | 0.43 | 0.27 | 0.90 | 1.28 | 8% |
| the chart and every heuristic | 75% | 0.40 | 0.24 | 0.83 | 1.21 | 7% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 59% / 0.05 | 6% / 0.04 | 5% / 0.01 | 5% / 0.03 | 13% / 0.76 | 12% / 1.10 |
| the rulebook, nothing fitted | 61% / 0.05 | 6% / 0.04 | 4% / 0.01 | 6% / 0.02 | 13% / 0.46 | 10% / 0.53 |
| heuristics and made class, no chart | 65% / 0.04 | 5% / 0.03 | 6% / 0.02 | 6% / 0.03 | 6% / 0.28 | 11% / 0.99 |
| the chart alone | 70% / 0.04 | 6% / 0.03 | 6% / 0.02 | 5% / 0.03 | 8% / 0.26 | 5% / 0.24 |
| the chart and its 2 heuristics | 74% / 0.05 | 6% / 0.03 | 5% / 0.02 | 4% / 0.02 | 7% / 0.18 | 3% / 0.13 |
| the chart and every heuristic | 75% / 0.05 | 6% / 0.03 | 6% / 0.01 | 4% / 0.02 | 6% / 0.16 | 3% / 0.11 |

## flop, out of position, facing a bet (80 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.04 | 0.04 | 0.08 | 0.09 | 0% |
| rows alone | 77% | 0.73 | 0.57 | 1.44 | 2.00 | 24% |
| the rulebook, nothing fitted | 74% | 0.60 | 0.39 | 1.40 | 1.55 | 21% |
| heuristics and made class, no chart | 78% | 0.43 | 0.26 | 0.73 | 1.21 | 9% |
| the chart alone | 76% | 0.56 | 0.43 | 1.07 | 1.64 | 12% |
| the chart and its 3 heuristics | 84% | 0.14 | 0.12 | 0.26 | 0.32 | 0% |
| the chart and every heuristic | 83% | 0.14 | 0.12 | 0.27 | 0.33 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 77% / 0.01 | 2% / 0.00 | 5% / 0.01 | 5% / 0.02 | 0% / 0.00 | 11% / 0.69 |
| the rulebook, nothing fitted | 74% / 0.02 | 2% / 0.01 | 5% / 0.00 | 5% / 0.01 | 5% / 0.16 | 9% / 0.40 |
| heuristics and made class, no chart | 78% / 0.01 | 2% / 0.00 | 5% / 0.01 | 5% / 0.02 | 2% / 0.03 | 8% / 0.35 |
| the chart alone | 76% / 0.02 | 3% / 0.00 | 4% / 0.00 | 4% / 0.01 | 5% / 0.19 | 7% / 0.34 |
| the chart and its 3 heuristics | 84% / 0.02 | 3% / 0.00 | 4% / 0.00 | 3% / 0.01 | 3% / 0.05 | 3% / 0.05 |
| the chart and every heuristic | 83% / 0.02 | 3% / 0.00 | 4% / 0.00 | 4% / 0.01 | 3% / 0.05 | 3% / 0.06 |

## flop, in position, facing a bet (75 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.03 | 0.01 | 0.06 | 0.09 | 0% |
| rows alone | 72% | 1.05 | 0.87 | 2.06 | 3.28 | 40% |
| the rulebook, nothing fitted | 79% | 0.38 | 0.25 | 0.88 | 1.20 | 7% |
| heuristics and made class, no chart | 78% | 0.41 | 0.32 | 0.89 | 0.94 | 4% |
| the chart alone | 77% | 0.39 | 0.28 | 0.91 | 1.17 | 8% |
| the chart and its 2 heuristics | 82% | 0.16 | 0.11 | 0.36 | 0.50 | 0% |
| the chart and every heuristic | 84% | 0.14 | 0.09 | 0.33 | 0.41 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 72% / 0.01 | 2% / 0.00 | 5% / 0.00 | 5% / 0.01 | 0% / 0.00 | 16% / 1.03 |
| the rulebook, nothing fitted | 79% / 0.02 | 2% / 0.00 | 5% / 0.00 | 4% / 0.01 | 5% / 0.13 | 6% / 0.22 |
| heuristics and made class, no chart | 78% / 0.01 | 2% / 0.00 | 5% / 0.00 | 5% / 0.01 | 2% / 0.03 | 9% / 0.35 |
| the chart alone | 77% / 0.01 | 2% / 0.00 | 5% / 0.00 | 4% / 0.01 | 4% / 0.10 | 7% / 0.26 |
| the chart and its 2 heuristics | 82% / 0.02 | 2% / 0.00 | 5% / 0.00 | 4% / 0.01 | 3% / 0.05 | 4% / 0.08 |
| the chart and every heuristic | 84% / 0.02 | 2% / 0.00 | 5% / 0.00 | 3% / 0.01 | 3% / 0.05 | 3% / 0.07 |

## turn, out of position, facing a bet (289 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.03 | 0.02 | 0.07 | 0.10 | 0% |
| rows alone | 71% | 0.77 | 0.41 | 1.88 | 2.88 | 23% |
| the rulebook, nothing fitted | 80% | 0.17 | 0.08 | 0.39 | 0.59 | 2% |
| heuristics and made class, no chart | 77% | 0.48 | 0.17 | 1.04 | 2.06 | 11% |
| the chart alone | 84% | 0.19 | 0.10 | 0.42 | 0.63 | 2% |
| the chart and its 2 heuristics | 88% | 0.11 | 0.07 | 0.22 | 0.32 | 0% |
| the chart and every heuristic | 88% | 0.08 | 0.06 | 0.18 | 0.26 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 71% / 0.00 | 3% / 0.00 | 9% / 0.01 | 7% / 0.02 | 0% / 0.00 | 10% / 0.74 |
| the rulebook, nothing fitted | 80% / 0.01 | 4% / 0.00 | 7% / 0.00 | 4% / 0.01 | 3% / 0.05 | 2% / 0.09 |
| heuristics and made class, no chart | 77% / 0.01 | 4% / 0.01 | 6% / 0.01 | 4% / 0.01 | 4% / 0.18 | 5% / 0.27 |
| the chart alone | 84% / 0.02 | 4% / 0.01 | 4% / 0.00 | 2% / 0.00 | 4% / 0.07 | 2% / 0.09 |
| the chart and its 2 heuristics | 88% / 0.02 | 3% / 0.01 | 3% / 0.00 | 2% / 0.00 | 3% / 0.04 | 1% / 0.04 |
| the chart and every heuristic | 88% / 0.02 | 3% / 0.01 | 3% / 0.00 | 2% / 0.00 | 3% / 0.03 | 1% / 0.02 |

## turn, in position, facing a bet (242 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.11 | 0.02 | 0.11 | 0.23 | 1% |
| rows alone | 70% | 0.74 | 0.49 | 1.68 | 2.31 | 24% |
| the rulebook, nothing fitted | 75% | 0.55 | 0.37 | 1.35 | 1.57 | 17% |
| heuristics and made class, no chart | 74% | 0.43 | 0.18 | 0.94 | 1.35 | 10% |
| the chart alone | 78% | 0.30 | 0.19 | 0.62 | 0.82 | 2% |
| the chart and its 3 heuristics | 80% | 0.20 | 0.11 | 0.36 | 0.56 | 1% |
| the chart and every heuristic | 82% | 0.17 | 0.08 | 0.30 | 0.49 | 1% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 70% / 0.06 | 3% / 0.00 | 8% / 0.02 | 8% / 0.02 | 0% / 0.00 | 11% / 0.63 |
| the rulebook, nothing fitted | 75% / 0.04 | 3% / 0.01 | 7% / 0.01 | 5% / 0.01 | 3% / 0.09 | 6% / 0.39 |
| heuristics and made class, no chart | 74% / 0.05 | 4% / 0.01 | 7% / 0.02 | 6% / 0.02 | 4% / 0.12 | 6% / 0.22 |
| the chart alone | 78% / 0.04 | 4% / 0.01 | 5% / 0.01 | 4% / 0.01 | 6% / 0.11 | 3% / 0.12 |
| the chart and its 3 heuristics | 80% / 0.05 | 4% / 0.01 | 5% / 0.01 | 4% / 0.01 | 5% / 0.08 | 2% / 0.05 |
| the chart and every heuristic | 82% / 0.05 | 4% / 0.01 | 5% / 0.00 | 3% / 0.01 | 5% / 0.07 | 2% / 0.04 |

## river, out of position, facing a bet (1386 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.08 | 0.04 | 0.17 | 0.27 | 0% |
| rows alone | 64% | 0.89 | 0.37 | 2.08 | 3.34 | 22% |
| the rulebook, nothing fitted | 81% | 0.24 | 0.21 | 0.47 | 0.53 | 0% |
| heuristics and made class, no chart | 72% | 0.81 | 0.31 | 1.98 | 3.20 | 19% |
| the chart alone | 82% | 0.26 | 0.09 | 0.59 | 1.04 | 5% |
| the chart and its 1 heuristics | 91% | 0.06 | 0.04 | 0.13 | 0.17 | 0% |
| the chart and every heuristic | 91% | 0.06 | 0.04 | 0.13 | 0.18 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 64% / 0.02 | 5% / 0.01 | 10% / 0.02 | 8% / 0.03 | 7% / 0.35 | 7% / 0.45 |
| the rulebook, nothing fitted | 81% / 0.07 | 6% / 0.03 | 0% / 0.00 | 0% / -0.00 | 13% / 0.14 | 0% / 0.00 |
| heuristics and made class, no chart | 72% / 0.04 | 5% / 0.02 | 5% / 0.01 | 4% / 0.02 | 8% / 0.39 | 5% / 0.32 |
| the chart alone | 82% / 0.04 | 5% / 0.01 | 4% / 0.00 | 3% / 0.01 | 4% / 0.10 | 2% / 0.10 |
| the chart and its 1 heuristics | 91% / 0.04 | 5% / 0.01 | 2% / 0.00 | 1% / 0.00 | 2% / 0.01 | 0% / 0.00 |
| the chart and every heuristic | 91% / 0.04 | 5% / 0.01 | 2% / 0.00 | 1% / 0.00 | 2% / 0.01 | 0% / 0.00 |

## river, in position, facing a bet (1081 decisions)

| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |
|---|---|---|---|---|---|---|
| the solver's own labels | 100% | 0.16 | 0.05 | 0.31 | 0.56 | 3% |
| rows alone | 65% | 1.27 | 0.45 | 3.29 | 5.17 | 32% |
| the rulebook, nothing fitted | 82% | 0.22 | 0.20 | 0.40 | 0.47 | 0% |
| heuristics and made class, no chart | 73% | 0.90 | 0.29 | 2.08 | 3.75 | 20% |
| the chart alone | 84% | 0.27 | 0.09 | 0.69 | 1.07 | 6% |
| the chart and its 1 heuristics | 89% | 0.11 | 0.05 | 0.20 | 0.32 | 1% |
| the chart and every heuristic | 90% | 0.09 | 0.05 | 0.19 | 0.28 | 0% |

The kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):

| the call | right | near the line | pure, on the majority side of a mix | pure, on the minority side of a mix | mixed where the solver is pure | the opposite |
|---|---|---|---|---|---|---|
| rows alone | 65% / 0.05 | 5% / 0.02 | 8% / 0.03 | 6% / 0.05 | 10% / 0.80 | 5% / 0.32 |
| the rulebook, nothing fitted | 82% / 0.08 | 6% / 0.03 | 1% / 0.00 | 0% / 0.00 | 10% / 0.11 | 0% / -0.00 |
| heuristics and made class, no chart | 73% / 0.07 | 5% / 0.03 | 6% / 0.02 | 5% / 0.03 | 7% / 0.48 | 3% / 0.26 |
| the chart alone | 84% / 0.06 | 5% / 0.02 | 4% / 0.01 | 2% / 0.01 | 4% / 0.11 | 1% / 0.06 |
| the chart and its 1 heuristics | 89% / 0.06 | 5% / 0.01 | 2% / 0.00 | 1% / 0.00 | 2% / 0.02 | 0% / 0.02 |
| the chart and every heuristic | 90% / 0.06 | 5% / 0.01 | 2% / 0.00 | 1% / 0.00 | 2% / 0.01 | 0% / -0.00 |

## Summary: EV lost, mean (P90), percent of the pot

| situation | the solver's own labels | rows alone | the rulebook, nothing fitted | heuristics and made class, no chart | the chart alone | the chart and its few | the chart and every heuristic |
|---|---|---|---|---|---|---|---|
| flop, out of position, first to act | 0.06 (0.15) | 0.16 (0.29) | 0.12 (0.33) | 0.18 (0.32) | 0.21 (0.41) | 0.16 (0.34) | 0.14 (0.30) |
| flop, in position, first to act | 0.10 (0.17) | 0.59 (1.13) | 0.30 (0.40) | 0.42 (0.62) | 0.49 (1.26) | 0.31 (0.53) | 0.31 (0.42) |
| turn, out of position, first to act | 0.04 (0.08) | 0.35 (0.78) | 0.40 (1.06) | 0.26 (0.62) | 0.43 (0.90) | 0.28 (0.65) | 0.22 (0.47) |
| turn, in position, first to act | 0.08 (0.14) | 0.76 (1.60) | 0.73 (1.33) | 0.48 (0.91) | 0.65 (1.31) | 0.39 (0.76) | 0.34 (0.69) |
| river, out of position, first to act | 0.06 (0.13) | 0.87 (2.11) | 0.64 (1.61) | 0.51 (1.28) | 0.71 (1.59) | 0.39 (0.85) | 0.33 (0.74) |
| river, in position, first to act | 0.11 (0.22) | 1.99 (4.52) | 1.12 (2.44) | 1.39 (3.54) | 0.62 (1.40) | 0.43 (0.90) | 0.40 (0.83) |
| flop, out of position, facing a bet | 0.04 (0.08) | 0.73 (1.44) | 0.60 (1.40) | 0.43 (0.73) | 0.56 (1.07) | 0.14 (0.26) | 0.14 (0.27) |
| flop, in position, facing a bet | 0.03 (0.06) | 1.05 (2.06) | 0.38 (0.88) | 0.41 (0.89) | 0.39 (0.91) | 0.16 (0.36) | 0.14 (0.33) |
| turn, out of position, facing a bet | 0.03 (0.07) | 0.77 (1.88) | 0.17 (0.39) | 0.48 (1.04) | 0.19 (0.42) | 0.11 (0.22) | 0.08 (0.18) |
| turn, in position, facing a bet | 0.11 (0.11) | 0.74 (1.68) | 0.55 (1.35) | 0.43 (0.94) | 0.30 (0.62) | 0.20 (0.36) | 0.17 (0.30) |
| river, out of position, facing a bet | 0.08 (0.17) | 0.89 (2.08) | 0.24 (0.47) | 0.81 (1.98) | 0.26 (0.59) | 0.06 (0.13) | 0.06 (0.13) |
| river, in position, facing a bet | 0.16 (0.31) | 1.27 (3.29) | 0.22 (0.40) | 0.90 (2.08) | 0.27 (0.69) | 0.11 (0.20) | 0.09 (0.19) |
