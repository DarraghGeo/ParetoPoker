# Mixing only where it is free (13146 decisions, 227 flops)

Each cell plays its best answer, plus any answer within the gap of it, in the solver's proportions. Gap 0 is one answer a cell; "all" plays every cell as the solver mixes it. "Differs" is the share of play that is not the solver's; "frequency miss" is the distance of the overall share of the second and third answers from the solver's, in points.


## river, out of position, facing a bet: margin (818 decisions; the solver: call 36%, raise 10%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.18 | 0.49 | 25 | 9 / 5 | 33% / 13% |
| 0.2 | 0.18 | 0.49 | 25 | 9 / 5 | 33% / 13% |
| 0.5 | 0.18 | 0.49 | 25 | 9 / 5 | 33% / 13% |
| 1.0 | 0.18 | 0.49 | 25 | 9 / 5 | 33% / 13% |
| all | 1.03 | 2.09 | 21 | 9 / 6 | 41% / 6% |

## river, in position, facing a bet: margin (620 decisions; the solver: call 39%, raise 14%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.33 | 0.85 | 27 | 10 / 7 | 33% / 20% |
| 0.2 | 0.33 | 0.85 | 27 | 10 / 7 | 33% / 20% |
| 0.5 | 0.33 | 0.85 | 27 | 10 / 7 | 33% / 20% |
| 1.0 | 0.33 | 0.85 | 27 | 10 / 7 | 33% / 20% |
| all | 1.34 | 2.77 | 25 | 8 / 7 | 44% / 10% |

## turn, out of position, facing a bet: margin x draw (2716 decisions; the solver: call 45%, raise 7%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.37 | 0.78 | 22 | 13 / 7 | 39% / 5% |
| 0.2 | 0.37 | 0.79 | 21 | 12 / 7 | 42% / 2% |
| 0.5 | 0.39 | 0.80 | 22 | 13 / 6 | 39% / 5% |
| 1.0 | 0.40 | 0.82 | 22 | 13 / 7 | 40% / 6% |
| all | 0.86 | 1.45 | 25 | 11 / 6 | 42% / 7% |

## turn, in position, facing a bet: margin x draw (2492 decisions; the solver: call 56%, raise 4%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.42 | 0.96 | 24 | 19 / 4 | 72% / 0% |
| 0.2 | 0.43 | 0.95 | 23 | 18 / 4 | 72% / 0% |
| 0.5 | 0.44 | 0.91 | 21 | 14 / 4 | 64% / 0% |
| 1.0 | 0.45 | 0.91 | 21 | 14 / 4 | 63% / 1% |
| all | 1.07 | 1.76 | 23 | 10 / 4 | 58% / 1% |

## flop, out of position, facing a bet: margin x draw (406 decisions; the solver: call 47%, raise 14%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.23 | 0.52 | 26 | 21 / 14 | 66% / 0% |
| 0.2 | 0.24 | 0.52 | 25 | 15 / 9 | 58% / 8% |
| 0.5 | 0.24 | 0.52 | 24 | 14 / 8 | 56% / 10% |
| 1.0 | 0.25 | 0.52 | 24 | 14 / 8 | 55% / 10% |
| all | 0.72 | 1.06 | 27 | 11 / 8 | 51% / 11% |

## flop, in position, facing a bet: margin x draw (352 decisions; the solver: call 63%, raise 6%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.26 | 0.54 | 20 | 12 / 6 | 63% / 0% |
| 0.2 | 0.26 | 0.54 | 20 | 12 / 7 | 63% / 0% |
| 0.5 | 0.26 | 0.54 | 20 | 11 / 7 | 63% / 0% |
| 1.0 | 0.31 | 0.58 | 21 | 12 / 7 | 68% / 0% |
| all | 0.83 | 1.23 | 24 | 9 / 7 | 64% / 0% |

## river, out of position, first to act: equity x range equity (300 decisions; the solver: bet 27%, bet big 7%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.50 | 0.93 | 30 | 18 / 7 | 32% / 0% |
| 0.2 | 0.49 | 0.94 | 28 | 17 / 7 | 26% / 0% |
| 0.5 | 0.53 | 0.95 | 26 | 14 / 7 | 23% / 1% |
| 1.0 | 0.54 | 0.92 | 26 | 14 / 7 | 24% / 1% |
| all | 0.77 | 1.26 | 28 | 15 / 8 | 27% / 7% |

## river, in position, first to act: equity x his weak hands (300 decisions; the solver: bet 34%, bet big 13%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.62 | 1.28 | 35 | 24 / 13 | 53% / 0% |
| 0.2 | 0.62 | 1.28 | 35 | 24 / 13 | 53% / 0% |
| 0.5 | 0.61 | 1.22 | 35 | 24 / 13 | 53% / 0% |
| 1.0 | 0.66 | 1.26 | 35 | 24 / 13 | 56% / 2% |
| all | 1.97 | 3.37 | 36 | 14 / 12 | 37% / 12% |

## turn, out of position, first to act: equity x who bet last street (2372 decisions; the solver: bet 29%, bet big 0%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.16 | 0.41 | 26 | 18 / 0 | 11% / 0% |
| 0.2 | 0.16 | 0.40 | 24 | 20 / 0 | 10% / 0% |
| 0.5 | 0.16 | 0.41 | 24 | 19 / 0 | 11% / 0% |
| 1.0 | 0.20 | 0.50 | 24 | 16 / 0 | 16% / 0% |
| all | 0.42 | 0.80 | 27 | 16 / 0 | 28% / 0% |

## turn, in position, first to act: equity (2323 decisions; the solver: bet 40%, bet big 0%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.22 | 0.45 | 34 | 23 / 0 | 18% / 0% |
| 0.2 | 0.22 | 0.45 | 34 | 23 / 0 | 18% / 0% |
| 0.5 | 0.26 | 0.51 | 34 | 18 / 0 | 25% / 0% |
| 1.0 | 0.38 | 0.72 | 32 | 12 / 0 | 44% / 0% |
| all | 0.57 | 0.95 | 32 | 12 / 0 | 47% / 0% |

## flop, out of position, first to act: row x stack to pot (226 decisions; the solver: bet 19%, bet big 0%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.03 | 0.08 | 16 | 11 / 0 | 9% / 0% |
| 0.2 | 0.04 | 0.13 | 12 | 9 / 0 | 17% / 0% |
| 0.5 | 0.05 | 0.14 | 11 | 9 / 0 | 16% / 0% |
| 1.0 | 0.05 | 0.14 | 11 | 9 / 0 | 16% / 0% |
| all | 0.05 | 0.14 | 11 | 9 / 0 | 16% / 0% |

## flop, in position, first to act: equity (221 decisions; the solver: bet 54%, bet big 0%)

| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table's own shares: second / third answer |
|---|---|---|---|---|---|
| 0 | 0.06 | 0.11 | 44 | 22 / 0 | 32% / 0% |
| 0.2 | 0.08 | 0.14 | 25 | 10 / 0 | 56% / 0% |
| 0.5 | 0.09 | 0.16 | 24 | 11 / 0 | 53% / 0% |
| 1.0 | 0.09 | 0.16 | 24 | 11 / 0 | 53% / 0% |
| all | 0.09 | 0.16 | 24 | 11 / 0 | 53% / 0% |
