# The turn test: a draw column on the turn tables

Turn and river solved together; one bet size (75% of the pot) and one raise (to three times) on each street. Our side plays both streets by shared tables; the adaptive strategy plays the best reply over both. Solved on 30 turn spots, scored on 16 from other flops. Percent of the pot as the turn starts.

| seat | turn tables | on the spots solved on (raw) | exploitability on other spots: mean | median | worst spot |
|---|---|---|---|---|---|
| OOP | place x weak share | 61.2 | 11.6 | 10.8 | 18.8 |
| OOP | place x weak share x draw | 61.0 | 12.6 | 11.4 | 21.7 |
| OOP | gain from the draw column, spot by spot | | -1.0 | -0.0 | better on 7 of 16 |
| IP | place x weak share | 59.3 | 14.1 | 12.5 | 22.0 |
| IP | place x weak share x draw | 58.2 | 14.5 | 13.9 | 22.7 |
| IP | gain from the draw column, spot by spot | | -0.4 | +0.4 | better on 9 of 16 |

The scoring spots solved with no restriction: the two sides' values sum to 100.08% of the pot on average (100 is exact).
