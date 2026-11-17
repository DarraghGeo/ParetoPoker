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

## Each scoring spot solved alone with the same tables (no draw column)

| turn spot | pot type | board | stacks behind, in pots | alone: OOP | IP | shared tables: OOP | IP |
|---|---|---|---|---|---|---|---|
| flop-f19-B1725_C-Kd | 3BP-SB-BU | Kh 8c Qh Kd | 1.2 | 3.0 | 2.3 | 10.6 | 11.2 |
| flop-f23-X_B759_C-5s | 3BP-SB-BU | 2d 3h 2c 5s | 2.1 | 3.7 | 3.0 | 9.5 | 12.3 |
| flop-f83-B759_C-2c | 3BP-SB-BU | 2d Kc 5d 2c | 2.1 | 4.6 | 5.2 | 9.5 | 7.5 |
| flop-f54-X_B413_R1239_C-4h | SRP-BB-CO | Ks 9s 4c 4h | 2.8 | 7.0 | 6.1 | 9.7 | 9.4 |
| flop-f33-X_B182_R546_C-7d | SRP-BB-UTG | 9c 2d Ah 7d | 5.6 | 9.4 | 6.9 | 12.9 | 15.7 |
| flop-f65-X_B182_R546_C-7h | SRP-BB-UTG | Tc 3d Kh 7h | 5.6 | 8.9 | 10.1 | 13.8 | 17.3 |
| flop-f89-X_B182_R546_C-Ah | SRP-BB-UTG | 6d Jc 4s Ah | 5.6 | 8.5 | 6.6 | 12.0 | 12.2 |
| flop-f97-B413_C-6s | SRP-BB-UTG | Td 7h 7d 6s | 6.8 | 9.0 | 11.5 | 11.3 | 21.3 |
| **under 3 pots behind (4)** | | | | **4.6** | **4.2** | **9.8** | **10.1** |
| **3 pots or more behind (4)** | | | | **8.9** | **8.8** | **12.5** | **16.6** |
