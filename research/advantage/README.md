# What makes range advantage readable

`collect.mjs` computes each range's equity against the other on sampled flops for every preset matchup (no solving). `analyse.py` sets that beside things a player can count at the table. First run: 672 flops over 30 matchups (the collection was stopped part way).

Range advantage varies by 5.6 points of equity across these flops, 4.4 within one matchup.

| What you know | Off by | Names the player with the advantage (where it is over 1.5 points) |
|---|---|---|
| The matchup alone: who usually has it | 3.6 pts | 78% |
| + who has more pairs or better | 3.3 | 80% |
| + who has more overpairs | 3.5 | 79% |
| + who has more top pair or better (top pair, overpairs, two pair, sets) | **2.4** | **85%** |
| Top pair or better, without knowing the matchup | 2.9 | 81% |
| All the counts with the matchup | 1.3 | 96% |

- One count carries most of it: **how much of each range has top pair or better on this board** (correlation with the advantage 0.78; 0.80 inside a matchup).
- Any pair at all is a poor guide across matchups (0.20): small pairs are not an advantage. Overpairs alone are too rare to decide it (0.37). Flush draws do not move it (-0.05).
- Who has more strong hands (75%+ equity) is mostly a property of the matchup (92% from the matchup alone); the board adds less.
