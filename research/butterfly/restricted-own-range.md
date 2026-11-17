# Shared river tables with cells on the player's own range (36 river spots to solve on, 18 others to score on, from 23 flops)

What the best reply wins over the value of the game, percent of the pot, averaged over spots. Four tables a seat (first to act; facing a bet; facing a big bet; facing a raise), shared by every board. "Place" is where the hand stands in the player's own range by equity: bottom 15%, 15-35, 35-55, 55-75, 75-90, top 10%.

| rows | columns (a read of the spot) | cells a table | seat | on the spots solved on | on other spots: exact | in 10% steps | in 25% steps | worst spot |
|---|---|---|---|---|---|---|---|---|
| equity | - | 6 | OOP | 6.6 | 6.4 | 7.3 | 7.3 | 14.6 |
| equity | - | 6 | IP | 7.2 | 7.5 | 8.3 | 8.9 | 9.2 |
| place | - | 6 | OOP | 5.0 | 5.7 | 5.8 | 6.9 | 9.3 |
| place | - | 6 | IP | 5.3 | 7.5 | 8.3 | 8.9 | 27.3 |
| place | my strong hands | 18 | OOP | 3.9 | 5.2 | 6.0 | 7.8 | 8.7 |
| place | my strong hands | 18 | IP | 4.6 | 7.8 | 8.5 | 9.3 | 21.5 |
| place | my weak hands | 18 | OOP | 4.2 | 4.0 | 4.5 | 7.9 | 6.7 |
| place | my weak hands | 18 | IP | 3.8 | 4.8 | 5.2 | 7.1 | 10.0 |
| place | my strong to weak | 18 | OOP | 4.1 | 4.9 | 5.4 | 8.3 | 8.6 |
| place | my strong to weak | 18 | IP | 4.0 | 5.5 | 5.5 | 6.4 | 17.6 |
| equity | my strong to weak | 18 | OOP | 5.7 | 7.4 | 8.0 | 11.7 | 17.0 |
| equity | my strong to weak | 18 | IP | 5.3 | 6.5 | 6.9 | 6.8 | 12.0 |
| equity | my strong hands | 18 | OOP | 5.1 | 6.3 | 7.8 | 8.2 | 14.2 |
| equity | my strong hands | 18 | IP | 5.6 | 7.2 | 7.7 | 7.8 | 10.0 |
| place x equity | - | 18 | OOP | 4.1 | 4.8 | 4.9 | 6.0 | 7.9 |
| place x equity | - | 18 | IP | 4.1 | 4.6 | 5.2 | 5.2 | 12.3 |
| place x equity | my strong to weak | 54 | OOP | 3.7 | 5.2 | 5.8 | 7.4 | 11.5 |
| place x equity | my strong to weak | 54 | IP | 3.3 | 4.0 | 4.4 | 4.7 | 9.0 |

(1064 s)
