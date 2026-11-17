# Rules that keep the solver's mixing (13146 decisions, 227 flops)

"Differs" is the share of play that is not the solver's, hand by hand, in points (0 = the solver's own strategy). "EV lost" is in percent of the pot per decision. "Frequency miss" is how far the table's overall share of an answer is from the solver's, in points of the range. All on flops the table was not made from.


## river, out of position, facing a bet (818 decisions; the solver: call 36%, raise 10%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin | 6 | 21 | 29 | 1.03 | 2.09 | 9 | 6 |
| the same cells with the solver's exact frequencies | 6 | 22 | 29 | 1.11 | 2.11 | 7 | 5 |
| the same cells, one answer each (least EV lost) | 6 | 25 | 40 | 0.18 | 0.49 | 9 | 5 |
| closest of any size: row x margin x my range | 144 | 20 | 28 | 0.95 | 1.98 | 7 | 6 |

| margin | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|
| 5+ under the price | 21.4% | 100 / 0 / 0 | 99 / 0 / 1 |
| 0-5 under | 32.7% | 75 / 25 / 0 | 75 / 23 / 2 |
| 0-5 over | 27.0% | 25 / 75 / 0 | 33 / 62 / 5 |
| 5-15 over | 3.9% | 0 / 100 / 0 | 0 / 93 / 7 |
| 15-30 over | 2.0% | 0 / 100 / 0 | 0 / 96 / 4 |
| 30+ over | 12.9% | 0 / 50 / 50 | 0 / 45 / 55 |

## river, in position, facing a bet (620 decisions; the solver: call 39%, raise 14%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin | 6 | 25 | 32 | 1.34 | 2.77 | 8 | 7 |
| the same cells with the solver's exact frequencies | 6 | 26 | 33 | 1.46 | 2.72 | 7 | 6 |
| the same cells, one answer each (least EV lost) | 6 | 27 | 40 | 0.33 | 0.85 | 10 | 7 |
| closest of any size: row x margin x my range | 144 | 23 | 30 | 1.04 | 1.97 | 7 | 6 |

| margin | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|
| 5+ under the price | 17.7% | 100 / 0 / 0 | 96 / 0 / 3 |
| 0-5 under | 29.4% | 75 / 25 / 0 | 75 / 22 / 4 |
| 0-5 over | 26.4% | 25 / 75 / 0 | 30 / 64 / 5 |
| 5-15 over | 3.9% | 0 / 100 / 0 | 1 / 95 / 4 |
| 15-30 over | 3.1% | 0 / 100 / 0 | 0 / 97 / 3 |
| 30+ over | 19.5% | 0 / 50 / 50 | 0 / 45 / 55 |

## turn, out of position, facing a bet (2716 decisions; the solver: call 45%, raise 7%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin x what I face | 18 | 22 | 31 | 0.73 | 1.24 | 9 | 5 |
| the same cells with the solver's exact frequencies | 18 | 25 | 33 | 1.11 | 1.72 | 8 | 5 |
| the same cells, one answer each (least EV lost) | 18 | 20 | 31 | 0.55 | 1.20 | 10 | 7 |
| closest of any size: row x margin x draw x what I face | 576 | 21 | 30 | 0.60 | 1.06 | 8 | 4 |

| margin | what I face | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|---|
| 5+ under the price | a bet | 14.0% | 100 / 0 / 0 | 96 / 2 / 2 |
| 5+ under the price | a raise | 3.0% | 100 / 0 / 0 | 95 / 5 / 0 |
| 0-5 under | a bet | 5.4% | 100 / 0 / 0 | 85 / 8 / 7 |
| 0-5 under | a raise | 2.2% | 75 / 25 / 0 | 80 / 20 / 0 |
| 0-5 over | a bet | 7.6% | 75 / 25 / 0 | 81 / 14 / 5 |
| 0-5 over | a raise | 2.1% | 50 / 50 / 0 | 49 / 51 / 0 |
| 5-15 over | a bet | 25.9% | 75 / 25 / 0 | 65 / 32 / 3 |
| 5-15 over | a raise | 2.6% | 25 / 75 / 0 | 18 / 82 / 0 |
| 15-30 over | a bet | 18.4% | 0 / 100 / 0 | 8 / 84 / 8 |
| 15-30 over | a raise | 2.2% | 0 / 100 / 0 | 0 / 100 / 0 |
| 30+ over | a bet | 13.0% | 0 / 75 / 25 | 0 / 73 / 27 |
| 30+ over | a raise | 3.6% | 0 / 100 / 0 | 0 / 100 / 0 |

## turn, in position, facing a bet (2492 decisions; the solver: call 56%, raise 4%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin x draw | 24 | 23 | 34 | 1.07 | 1.76 | 10 | 4 |
| the same cells with the solver's exact frequencies | 24 | 24 | 33 | 1.01 | 1.57 | 10 | 5 |
| the same cells, one answer each (least EV lost) | 24 | 24 | 42 | 0.42 | 0.96 | 19 | 4 |
| closest of any size: row x margin x draw x top pair or better | 576 | 19 | 30 | 0.61 | 1.09 | 8 | 4 |

| margin | draw | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|---|
| 5+ under the price | no draw | 6.7% | 100 / 0 / 0 | 100 / 0 / 0 |
| 5+ under the price | gutshot | 4.2% | 100 / 0 / 0 | 95 / 5 / 0 |
| 5+ under the price | open-ended | 1.8% | 75 / 25 / 0 | 68 / 30 / 2 |
| 5+ under the price | flush draw | 1.4% | 75 / 25 / 0 | 77 / 22 / 1 |
| 0-5 under | no draw | 3.5% | 100 / 0 / 0 | 95 / 5 / 0 |
| 0-5 under | gutshot | 2.3% | 100 / 0 / 0 | 90 / 9 / 1 |
| 0-5 under | open-ended | 1.0% | 50 / 50 / 0 | 55 / 41 / 4 |
| 0-5 under | flush draw | 1.6% | 50 / 50 / 0 | 49 / 48 / 3 |
| 0-5 over | no draw | 5.2% | 75 / 25 / 0 | 71 / 29 / 0 |
| 0-5 over | gutshot | 2.7% | 75 / 25 / 0 | 72 / 27 / 1 |
| 0-5 over | open-ended | 1.0% | 50 / 50 / 0 | 39 / 57 / 4 |
| 0-5 over | flush draw | 2.3% | 25 / 75 / 0 | 19 / 77 / 4 |
| 5-15 over | no draw | 15.6% | 50 / 50 / 0 | 58 / 41 / 1 |
| 5-15 over | gutshot | 4.5% | 50 / 50 / 0 | 48 / 50 / 2 |
| 5-15 over | open-ended | 1.2% | 25 / 75 / 0 | 19 / 75 / 6 |
| 5-15 over | flush draw | 4.6% | 0 / 100 / 0 | 9 / 86 / 5 |
| 15-30 over | no draw | 15.5% | 25 / 75 / 0 | 12 / 84 / 3 |
| 15-30 over | gutshot | 2.6% | 0 / 100 / 0 | 5 / 88 / 7 |
| 15-30 over | open-ended | 0.7% | 0 / 100 / 0 | 1 / 89 / 10 |
| 15-30 over | flush draw | 4.7% | 0 / 100 / 0 | 0 / 93 / 6 |
| 30+ over | no draw | 12.8% | 0 / 100 / 0 | 0 / 89 / 11 |
| 30+ over | gutshot | 2.3% | 0 / 75 / 25 | 0 / 87 / 13 |
| 30+ over | flush draw | 1.6% | 0 / 100 / 0 | 0 / 91 / 9 |

## flop, out of position, facing a bet (406 decisions; the solver: call 47%, raise 14%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin x draw | 24 | 27 | 35 | 0.72 | 1.06 | 11 | 8 |
| the same cells with the solver's exact frequencies | 24 | 27 | 35 | 0.83 | 1.24 | 9 | 8 |
| the same cells, one answer each (least EV lost) | 24 | 26 | 39 | 0.23 | 0.52 | 21 | 14 |
| closest of any size: row x margin x draw x what I face | 576 | 23 | 32 | 0.66 | 1.03 | 6 | 6 |

| margin | draw | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|---|
| 5+ under the price | no draw | 6.5% | 100 / 0 / 0 | 100 / 0 / 0 |
| 0-5 under | no draw | 4.9% | 100 / 0 / 0 | 98 / 1 / 0 |
| 0-5 under | gutshot | 0.7% | 50 / 25 / 25 | 54 / 32 / 15 |
| 0-5 over | no draw | 6.4% | 100 / 0 / 0 | 92 / 6 / 2 |
| 0-5 over | gutshot | 1.2% | 50 / 25 / 25 | 45 / 39 / 16 |
| 5-15 over | no draw | 15.5% | 75 / 25 / 0 | 81 / 16 / 4 |
| 5-15 over | gutshot | 3.2% | 25 / 50 / 25 | 17 / 58 / 25 |
| 5-15 over | open-ended | 0.9% | 0 / 50 / 50 | 0 / 60 / 40 |
| 5-15 over | flush draw | 0.6% | 0 / 75 / 25 | 1 / 79 / 20 |
| 15-30 over | no draw | 26.2% | 25 / 75 / 0 | 27 / 63 / 9 |
| 15-30 over | gutshot | 3.2% | 0 / 75 / 25 | 10 / 69 / 21 |
| 15-30 over | open-ended | 1.4% | 0 / 50 / 50 | -0 / 55 / 45 |
| 15-30 over | flush draw | 2.5% | 0 / 75 / 25 | 0 / 66 / 34 |
| 30+ over | no draw | 21.9% | 0 / 75 / 25 | 0 / 76 / 24 |
| 30+ over | gutshot | 1.3% | 0 / 75 / 25 | 0 / 68 / 32 |
| 30+ over | open-ended | 0.5% | 0 / 75 / 25 | 0 / 72 / 28 |
| 30+ over | flush draw | 2.9% | 0 / 75 / 25 | 0 / 68 / 32 |

## flop, in position, facing a bet (352 decisions; the solver: call 63%, raise 6%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: call | raise |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: margin x what I face | 18 | 24 | 36 | 1.16 | 2.27 | 7 | 5 |
| the same cells with the solver's exact frequencies | 18 | 25 | 37 | 1.21 | 2.16 | 6 | 4 |
| the same cells, one answer each (least EV lost) | 18 | 26 | 47 | 0.47 | 1.08 | 21 | 6 |
| closest of any size: margin x half x draw x what I face | 144 | 21 | 34 | 0.64 | 1.15 | 6 | 4 |

| margin | what I face | share | fold / call / raise (quarters) | the solver |
|---|---|---|---|---|
| 5+ under the price | a bet | 2.1% | 100 / 0 / 0 | 94 / 6 / 0 |
| 5+ under the price | a raise | 0.9% | 100 / 0 / 0 | 98 / 2 / 0 |
| 0-5 under | a bet | 2.2% | 75 / 25 / 0 | 80 / 18 / 2 |
| 0-5 under | a raise | 2.3% | 100 / 0 / 0 | 93 / 7 / 0 |
| 0-5 over | a bet | 3.9% | 75 / 25 / 0 | 68 / 27 / 4 |
| 0-5 over | a raise | 5.0% | 75 / 25 / 0 | 80 / 20 / 0 |
| 5-15 over | a bet | 11.7% | 50 / 50 / 0 | 57 / 36 / 7 |
| 5-15 over | a raise | 14.4% | 50 / 50 / 0 | 48 / 52 / 0 |
| 15-30 over | a bet | 15.9% | 25 / 75 / 0 | 17 / 68 / 15 |
| 15-30 over | a raise | 13.6% | 0 / 100 / 0 | 5 / 95 / 0 |
| 30+ over | a bet | 11.5% | 0 / 75 / 25 | 0 / 73 / 27 |
| 30+ over | a raise | 16.3% | 0 / 100 / 0 | 0 / 100 / 0 |

## river, out of position, first to act (300 decisions; the solver: bet 27%, bet big 7%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: equity x who bet last street | 18 | 26 | 43 | 0.78 | 1.52 | 12 | 6 |
| the same cells with the solver's exact frequencies | 18 | 26 | 41 | 0.82 | 1.45 | 12 | 6 |
| the same cells, one answer each (least EV lost) | 18 | 32 | 63 | 0.53 | 1.23 | 25 | 7 |
| closest of any size: row x equity x who bet last street | 144 | 26 | 42 | 0.76 | 1.47 | 12 | 6 |

| equity | who bet last street | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| under 20% | nobody | 11.1% | 75 / 25 / 0 | 66 / 24 / 9 |
| under 20% | I did | 8.7% | 50 / 25 / 25 | 58 / 26 / 16 |
| under 20% | he did | 3.5% | 75 / 25 / 0 | 87 / 12 / 1 |
| 20-35% | nobody | 3.4% | 75 / 25 / 0 | 84 / 12 / 4 |
| 20-35% | I did | 2.3% | 75 / 25 / 0 | 85 / 10 / 4 |
| 20-35% | he did | 6.2% | 100 / 0 / 0 | 98 / 2 / 0 |
| 35-50% | nobody | 3.8% | 100 / 0 / 0 | 94 / 5 / 1 |
| 35-50% | I did | 2.2% | 75 / 25 / 0 | 80 / 19 / 1 |
| 35-50% | he did | 8.1% | 100 / 0 / 0 | 99 / 1 / 0 |
| 50-65% | nobody | 4.7% | 75 / 25 / 0 | 80 / 20 / 0 |
| 50-65% | I did | 3.0% | 75 / 25 / 0 | 67 / 33 / 1 |
| 50-65% | he did | 5.8% | 100 / 0 / 0 | 96 / 4 / 0 |
| 65-80% | nobody | 5.9% | 25 / 75 / 0 | 32 / 66 / 1 |
| 65-80% | I did | 3.7% | 25 / 75 / 0 | 21 / 78 / 1 |
| 65-80% | he did | 4.0% | 75 / 25 / 0 | 81 / 19 / 0 |
| 80%+ | nobody | 10.1% | 25 / 50 / 25 | 28 / 53 / 19 |
| 80%+ | I did | 7.8% | 25 / 50 / 25 | 19 / 49 / 32 |
| 80%+ | he did | 5.6% | 75 / 25 / 0 | 78 / 19 / 2 |

## river, in position, first to act (300 decisions; the solver: bet 34%, bet big 13%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: equity x his weak hands | 18 | 36 | 50 | 1.97 | 3.37 | 14 | 12 |
| the same cells with the solver's exact frequencies | 18 | 36 | 47 | 2.13 | 3.16 | 14 | 12 |
| the same cells, one answer each (least EV lost) | 18 | 35 | 59 | 0.62 | 1.28 | 24 | 13 |
| closest of any size: row x equity x his weak hands | 144 | 32 | 43 | 1.31 | 2.34 | 14 | 10 |

| equity | his weak hands | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| under 20% | under 20% | 15.1% | 75 / 25 / 0 | 69 / 17 / 13 |
| under 20% | 20-45% | 5.5% | 50 / 50 / 0 | 44 / 41 / 15 |
| under 20% | over 45% | 3.7% | 25 / 50 / 25 | 17 / 59 / 24 |
| 20-35% | under 20% | 1.5% | 100 / 0 / 0 | 98 / 1 / 1 |
| 20-35% | 20-45% | 2.4% | 100 / 0 / 0 | 85 / 9 / 6 |
| 20-35% | over 45% | 1.6% | 25 / 50 / 25 | 40 / 41 / 19 |
| 35-50% | under 20% | 1.4% | 100 / 0 / 0 | 97 / 2 / 1 |
| 35-50% | 20-45% | 2.5% | 100 / 0 / 0 | 95 / 4 / 1 |
| 35-50% | over 45% | 2.4% | 75 / 25 / 0 | 66 / 23 / 11 |
| 50-65% | under 20% | 2.0% | 100 / 0 / 0 | 98 / 2 / 0 |
| 50-65% | 20-45% | 2.3% | 100 / 0 / 0 | 95 / 4 / 1 |
| 50-65% | over 45% | 4.1% | 100 / 0 / 0 | 90 / 7 / 3 |
| 65-80% | under 20% | 4.7% | 75 / 25 / 0 | 72 / 25 / 3 |
| 65-80% | 20-45% | 2.8% | 75 / 25 / 0 | 78 / 20 / 1 |
| 65-80% | over 45% | 6.1% | 75 / 25 / 0 | 86 / 12 / 2 |
| 80%+ | under 20% | 10.7% | 25 / 50 / 25 | 11 / 56 / 33 |
| 80%+ | 20-45% | 9.4% | 0 / 75 / 25 | 14 / 67 / 19 |
| 80%+ | over 45% | 21.8% | 25 / 50 / 25 | 39 / 47 / 15 |

## turn, out of position, first to act (2372 decisions; the solver: bet 29%, bet big 0%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: equity x who bet last street | 18 | 27 | 41 | 0.42 | 0.80 | 16 | 0 |
| the same cells with the solver's exact frequencies | 18 | 28 | 40 | 0.52 | 0.91 | 16 | 1 |
| the same cells, one answer each (least EV lost) | 18 | 26 | 51 | 0.16 | 0.41 | 18 | 0 |
| closest of any size: row x equity x draw x who bet last street | 576 | 24 | 39 | 0.34 | 0.68 | 14 | 0 |

| equity | who bet last street | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| under 20% | nobody | 2.8% | 75 / 25 / 0 | 80 / 20 / 0 |
| under 20% | I did | 5.6% | 75 / 25 / 0 | 75 / 25 / 0 |
| under 20% | he did | 1.4% | 75 / 25 / 0 | 86 / 14 / 0 |
| 20-35% | nobody | 4.1% | 75 / 25 / 0 | 63 / 37 / 0 |
| 20-35% | I did | 11.1% | 50 / 50 / 0 | 57 / 42 / 0 |
| 20-35% | he did | 6.3% | 75 / 25 / 0 | 82 / 18 / 0 |
| 35-50% | nobody | 3.0% | 75 / 25 / 0 | 80 / 20 / 0 |
| 35-50% | I did | 6.8% | 75 / 25 / 0 | 66 / 34 / 1 |
| 35-50% | he did | 11.0% | 100 / 0 / 0 | 91 / 9 / 0 |
| 50-65% | nobody | 2.7% | 100 / 0 / 0 | 90 / 10 / 0 |
| 50-65% | I did | 4.9% | 75 / 25 / 0 | 75 / 24 / 1 |
| 50-65% | he did | 9.6% | 100 / 0 / 0 | 92 / 8 / 0 |
| 65-80% | nobody | 2.5% | 75 / 25 / 0 | 71 / 29 / 0 |
| 65-80% | I did | 5.9% | 50 / 50 / 0 | 45 / 53 / 2 |
| 65-80% | he did | 5.9% | 75 / 25 / 0 | 83 / 17 / 0 |
| 80%+ | nobody | 3.0% | 50 / 50 / 0 | 44 / 56 / 0 |
| 80%+ | I did | 7.6% | 25 / 75 / 0 | 35 / 64 / 0 |
| 80%+ | he did | 5.7% | 75 / 25 / 0 | 68 / 31 / 0 |

## turn, in position, first to act (2323 decisions; the solver: bet 40%, bet big 0%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: row x half | 16 | 31 | 39 | 0.54 | 0.91 | 11 | 0 |
| the same cells with the solver's exact frequencies | 16 | 31 | 38 | 0.55 | 0.95 | 10 | 0 |
| the same cells, one answer each (least EV lost) | 16 | 36 | 51 | 0.26 | 0.51 | 29 | 0 |
| closest of any size: row x equity x draw x range equity | 576 | 28 | 34 | 0.42 | 0.74 | 9 | 0 |

| row | half | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| air | lower half of its row | 12.5% | 50 / 50 / 0 | 58 / 42 / 0 |
| air | upper half of its row | 12.5% | 75 / 25 / 0 | 72 / 28 / 0 |
| draw | lower half of its row | 6.1% | 50 / 50 / 0 | 51 / 49 / 0 |
| draw | upper half of its row | 6.1% | 50 / 50 / 0 | 46 / 54 / 0 |
| low pair | lower half of its row | 6.1% | 75 / 25 / 0 | 73 / 27 / 0 |
| low pair | upper half of its row | 6.1% | 75 / 25 / 0 | 79 / 21 / 0 |
| middle pair | lower half of its row | 6.4% | 75 / 25 / 0 | 84 / 16 / 0 |
| middle pair | upper half of its row | 6.4% | 75 / 25 / 0 | 72 / 28 / 0 |
| top pair | lower half of its row | 8.6% | 75 / 25 / 0 | 71 / 29 / 0 |
| top pair | upper half of its row | 8.7% | 50 / 50 / 0 | 45 / 55 / 0 |
| overpair | lower half of its row | 2.5% | 50 / 50 / 0 | 49 / 51 / 0 |
| overpair | upper half of its row | 2.5% | 50 / 50 / 0 | 49 / 51 / 0 |
| two pair | lower half of its row | 1.9% | 50 / 50 / 0 | 49 / 51 / 0 |
| two pair | upper half of its row | 1.9% | 50 / 50 / 0 | 40 / 60 / 0 |
| trips or better | lower half of its row | 5.8% | 25 / 75 / 0 | 36 / 64 / 0 |
| trips or better | upper half of its row | 5.8% | 25 / 75 / 0 | 31 / 69 / 0 |

## flop, out of position, first to act (226 decisions; the solver: bet 19%, bet big 0%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: equity x stack to pot | 18 | 11 | 33 | 0.05 | 0.15 | 9 | 0 |
| the same cells with the solver's exact frequencies | 18 | 13 | 33 | 0.07 | 0.14 | 10 | 0 |
| the same cells, one answer each (least EV lost) | 18 | 15 | 50 | 0.03 | 0.10 | 11 | 0 |
| closest of any size: equity x half x draw x top pair or better | 144 | 11 | 27 | 0.04 | 0.13 | 8 | 0 |

| equity | stack to pot | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| under 20% | over 6 | 7.3% | 100 / 0 / 0 | 100 / 0 / 0 |
| 20-35% | 2 to 6 | 6.2% | 50 / 50 / 0 | 48 / 52 / 0 |
| 20-35% | over 6 | 17.7% | 100 / 0 / 0 | 94 / 6 / 0 |
| 35-50% | 2 to 6 | 6.0% | 50 / 50 / 0 | 44 / 56 / 0 |
| 35-50% | over 6 | 21.8% | 100 / 0 / 0 | 96 / 4 / 0 |
| 50-65% | 2 to 6 | 4.7% | 50 / 50 / 0 | 52 / 48 / 0 |
| 50-65% | over 6 | 14.1% | 100 / 0 / 0 | 93 / 7 / 0 |
| 65-80% | 2 to 6 | 5.2% | 25 / 75 / 0 | 28 / 72 / 0 |
| 65-80% | over 6 | 9.2% | 100 / 0 / 0 | 94 / 6 / 0 |
| 80%+ | 2 to 6 | 3.0% | 25 / 75 / 0 | 29 / 71 / 0 |
| 80%+ | over 6 | 4.7% | 100 / 0 / 0 | 90 / 10 / 0 |

## flop, in position, first to act (221 decisions; the solver: bet 54%, bet big 0%)

| table | cells | differs | P90 | EV lost | P90 | frequency miss: bet | bet big |
|---|---|---|---|---|---|---|---|
| **kept**, in quarters: equity x range equity | 18 | 23 | 28 | 0.09 | 0.15 | 10 | 0 |
| the same cells with the solver's exact frequencies | 18 | 22 | 28 | 0.09 | 0.15 | 9 | 0 |
| the same cells, one answer each (least EV lost) | 18 | 40 | 50 | 0.06 | 0.13 | 23 | 0 |
| closest of any size: row x half x draw x range equity | 192 | 21 | 27 | 0.08 | 0.13 | 9 | 0 |

| equity | range equity | share | check / bet / bet big (quarters) | the solver |
|---|---|---|---|---|
| under 20% | under 45% | 1.1% | 75 / 25 / 0 | 69 / 31 / 0 |
| under 20% | 45-55% | 0.9% | 50 / 50 / 0 | 53 / 47 / 0 |
| 20-35% | under 45% | 0.8% | 75 / 25 / 0 | 71 / 29 / 0 |
| 20-35% | 45-55% | 12.5% | 50 / 50 / 0 | 51 / 49 / 0 |
| 20-35% | over 55% | 4.1% | 25 / 75 / 0 | 32 / 68 / 0 |
| 35-50% | 45-55% | 19.8% | 50 / 50 / 0 | 59 / 41 / 0 |
| 35-50% | over 55% | 8.0% | 25 / 75 / 0 | 33 / 67 / 0 |
| 50-65% | under 45% | 0.4% | 75 / 25 / 0 | 67 / 33 / 0 |
| 50-65% | 45-55% | 14.7% | 50 / 50 / 0 | 57 / 43 / 0 |
| 50-65% | over 55% | 5.4% | 50 / 50 / 0 | 39 / 61 / 0 |
| 65-80% | under 45% | 0.9% | 50 / 50 / 0 | 42 / 58 / 0 |
| 65-80% | 45-55% | 12.0% | 50 / 50 / 0 | 46 / 54 / 0 |
| 65-80% | over 55% | 7.6% | 25 / 75 / 0 | 35 / 65 / 0 |
| 80%+ | under 45% | 0.3% | 25 / 75 / 0 | 23 / 77 / 0 |
| 80%+ | 45-55% | 6.2% | 25 / 75 / 0 | 29 / 71 / 0 |
| 80%+ | over 55% | 5.1% | 25 / 75 / 0 | 14 / 86 / 0 |

## Summary

| situation | the kept table | cells | differs | EV lost | P90 | frequency miss (second answer / third) | one answer a cell: differs | EV lost |
|---|---|---|---|---|---|---|---|---|
| river, out of position, facing a bet | margin | 6 | 21 | 1.03 | 2.09 | 9 / 6 | 25 | 0.18 |
| river, in position, facing a bet | margin | 6 | 25 | 1.34 | 2.77 | 8 / 7 | 27 | 0.33 |
| turn, out of position, facing a bet | margin x what I face | 18 | 22 | 0.73 | 1.24 | 9 / 5 | 20 | 0.55 |
| turn, in position, facing a bet | margin x draw | 24 | 23 | 1.07 | 1.76 | 10 / 4 | 24 | 0.42 |
| flop, out of position, facing a bet | margin x draw | 24 | 27 | 0.72 | 1.06 | 11 / 8 | 26 | 0.23 |
| flop, in position, facing a bet | margin x what I face | 18 | 24 | 1.16 | 2.27 | 7 / 5 | 26 | 0.47 |
| river, out of position, first to act | equity x who bet last street | 18 | 26 | 0.78 | 1.52 | 12 / 6 | 32 | 0.53 |
| river, in position, first to act | equity x his weak hands | 18 | 36 | 1.97 | 3.37 | 14 / 12 | 35 | 0.62 |
| turn, out of position, first to act | equity x who bet last street | 18 | 27 | 0.42 | 0.80 | 16 / 0 | 26 | 0.16 |
| turn, in position, first to act | row x half | 16 | 31 | 0.54 | 0.91 | 11 / 0 | 36 | 0.26 |
| flop, out of position, first to act | equity x stack to pot | 18 | 11 | 0.05 | 0.15 | 9 / 0 | 15 | 0.03 |
| flop, in position, first to act | equity x range equity | 18 | 23 | 0.09 | 0.15 | 10 / 0 | 40 | 0.06 |
