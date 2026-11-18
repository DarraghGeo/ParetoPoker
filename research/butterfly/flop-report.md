# The flop runs together (10 scoring flops with the game's value known)

Exploitability over the whole hand from the flop, percent of the pot as the flop starts. One bet size and one raise a street; each flop on a sample of turn and river cards.

| shared tables | flops solved on | scoring flops | OOP: mean | median | worst | IP: mean | median | worst | both |
|---|---|---|---|---|---|---|---|---|---|
| place, strongest third, depth | 6 | 5 | 12.2 | 11.3 | 16.4 | 13.5 | 13.6 | 21.3 | 12.8 |
| place, strongest third, depth | 12 | 10 | 11.5 | 11.6 | 17.5 | 11.8 | 11.8 | 22.9 | 11.6 |

## Flop by flop (shared tables solved on 12 flops: place, strongest third, depth)

| flop | pot | stacks behind | OOP range equity | OOP | IP | alone: OOP | IP |
|---|---|---|---|---|---|---|---|
| 8h Td 5s | 3BP-SB-BU | 3.9 | 51% | 13.5 | 22.9 | - | - |
| Jc Qs 3s | 3BP-SB-BU | 3.9 | 55% | 12.8 | 18.7 | - | - |
| 5d 2s 5c | 3BP-SB-BU | 3.9 | 51% | 17.5 | 7.9 | - | - |
| Ks 3s 6c | 3BP-SB-BU | 3.9 | 56% | 13.6 | 11.7 | - | - |
| 3s 9d Jd | SRP-BB-BU | 17.7 | 47% | 10.5 | 12.0 | 9.1 | 6.6 |
| 2s Js Qs | SRP-BB-BU | 17.7 | 47% | 5.9 | 14.2 | - | - |
| Kh 7c Jc | SRP-BB-UTG | 17.7 | 40% | 7.9 | 11.9 | - | - |
| 7s 6d 6c | SRP-BB-CO | 17.7 | 48% | 10.5 | 7.7 | - | - |
| Ks Jc 3h | SRP-BB-BU | 17.7 | 44% | 9.5 | 8.6 | - | - |
| Qd Js 7d | SRP-BB-CO | 17.7 | 45% | 12.9 | 2.8 | - | - |

On the 1 flops also solved alone: alone 9.1 / 6.6, shared 10.5 / 12.0.

## What goes with a high figure

| about the flop | correlation with OOP exploitability | with IP |
|---|---|---|
| stacks behind, in pots | -0.75 | -0.51 |
| out of position's range equity | +0.60 | +0.38 |
| OOP strong hands minus IP strong hands | +0.62 | +0.30 |
| OOP share of weak hands | -0.79 | +0.02 |
| IP share of weak hands | +0.53 | +0.30 |
| two or more of a suit | -0.33 | +0.01 |
| paired | +0.40 | -0.37 |
| highest card | -0.54 | +0.16 |
| gap between highest and lowest card | -0.38 | +0.29 |

single-raised pots (6): 9.5 / 9.5

3-bet pots (4): 14.4 / 15.3
