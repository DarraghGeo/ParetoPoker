# The flop runs together (20 scoring flops with the game's value known)

Exploitability over the whole hand from the flop, percent of the pot as the flop starts. One bet size and one raise a street; each flop on a sample of 4 turn cards with 5 river cards each.

| shared tables | flops solved on | scoring flops | OOP: mean | median | worst | IP: mean | median | worst | both |
|---|---|---|---|---|---|---|---|---|---|
| adv+eq+pot-bal | 24 | 20 | 19.7 | 20.7 | 32.4 | 19.1 | 20.4 | 26.5 | 19.4 |
| adv+pot-bal | 24 | 20 | 10.9 | 10.7 | 13.9 | 8.7 | 7.9 | 15.4 | 9.8 |
| bal | 24 | 20 | 11.8 | 11.3 | 16.7 | 9.2 | 8.6 | 14.8 | 10.5 |
| fdraw+pot-bal | 24 | 20 | 11.4 | 10.7 | 15.5 | 8.4 | 7.9 | 14.9 | 9.9 |
| place, strongest third, depth | 6 | 5 | 12.5 | 10.6 | 18.4 | 13.0 | 11.9 | 22.8 | 12.7 |
| place, strongest third, depth | 12 | 20 | 11.4 | 11.1 | 16.6 | 10.0 | 7.9 | 18.2 | 10.7 |
| pot-bal | 24 | 20 | 10.9 | 10.4 | 14.3 | 8.5 | 8.0 | 14.2 | 9.7 |
| tilt-bal | 24 | 20 | 12.4 | 12.3 | 15.4 | 9.0 | 8.6 | 12.7 | 10.7 |

## Flop by flop (shared tables solved on 12 flops: place, strongest third, depth)

| flop | pot | stacks behind | OOP range equity | OOP | IP | alone: OOP | IP |
|---|---|---|---|---|---|---|---|
| 8h Td 5s | 3BP-SB-BU | 3.9 | 51% | 15.3 | 18.2 | - | - |
| 3h 3d 4c | 3BP-SB-BU | 3.9 | 52% | 12.6 | 17.8 | - | - |
| 5d 2s 5c | 3BP-SB-BU | 3.9 | 51% | 11.7 | 17.3 | - | - |
| Ks 3s 6c | 3BP-SB-BU | 3.9 | 56% | 15.1 | 13.4 | - | - |
| 7h Kc Ad | 3BP-SB-BU | 3.9 | 61% | 16.6 | 11.2 | - | - |
| Jc Qs 3s | 3BP-SB-BU | 3.9 | 55% | 11.3 | 15.5 | - | - |
| 5c 8h 6s | 3BP-SB-BU | 3.9 | 48% | 12.7 | 13.2 | - | - |
| 2d 7h 6s | SRP-BB-UTG | 17.7 | 51% | 13.7 | 8.6 | - | - |
| 6c Td Qd | SRP-BB-CO | 17.7 | 46% | 11.7 | 8.1 | - | - |
| Qd Js 7d | SRP-BB-CO | 17.7 | 45% | 11.8 | 7.1 | - | - |
| Kh 7c Jc | SRP-BB-UTG | 17.7 | 40% | 9.9 | 8.4 | - | - |
| 3s 9d Jd | SRP-BB-BU | 17.7 | 47% | 10.2 | 7.6 | - | - |
| 7d 4s Ts | SRP-BB-BU | 17.7 | 48% | 9.7 | 7.3 | - | - |
| Ah 4h Jc | SRP-BB-BU | 17.7 | 46% | 10.9 | 5.9 | - | - |
| 4c Qs Jh | SRP-BB-CO | 17.7 | 44% | 9.1 | 7.3 | - | - |
| 5s Ts Ac | SRP-BB-UTG | 17.7 | 39% | 9.8 | 6.4 | - | - |
| 2s Js Qs | SRP-BB-BU | 17.7 | 47% | 9.4 | 6.6 | - | - |
| 7s 6d 6c | SRP-BB-CO | 17.7 | 48% | 8.7 | 6.8 | - | - |
| 6s 6d 9s | SRP-BB-BU | 17.7 | 47% | 8.6 | 6.9 | - | - |
| Ks Jc 3h | SRP-BB-BU | 17.7 | 44% | 8.5 | 6.4 | - | - |

## What goes with a high figure

| about the flop | correlation with OOP exploitability | with IP |
|---|---|---|
| stacks behind, in pots | -0.71 | -0.92 |
| out of position's range equity | +0.73 | +0.58 |
| OOP strong hands minus IP strong hands | +0.63 | +0.65 |
| OOP share of weak hands | -0.50 | -0.59 |
| IP share of weak hands | +0.65 | +0.43 |
| two or more of a suit | -0.29 | -0.41 |
| paired | -0.21 | +0.26 |
| highest card | -0.03 | -0.48 |
| gap between highest and lowest card | -0.06 | -0.34 |

single-raised pots (13): 10.2 / 7.2

3-bet pots (7): 13.6 / 15.2
