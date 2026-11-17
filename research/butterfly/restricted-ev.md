# Exploitability and EV lost to sound play, side by side (24 river spots the tables were not solved on)

Percent of the pot, for the whole river (every decision on the street together). "Best reply wins" is the most any opponent can take; "gives up to the solver" is what the solver's own equilibrium play takes.

| river tables | seat | best reply wins: mean | worst spot | gives up to the solver: mean | P90 | worst spot |
|---|---|---|---|---|---|---|
| the two pages' tables (one answer a cell, built against the solver) | OOP | 18.8 | 38.3 | 0.70 | 0.95 | 1.86 |
| the two pages' tables (one answer a cell, built against the solver) | IP | 35.4 | 99.9 | 0.45 | 0.75 | 1.18 |
| solved: equity bands, exact | OOP | 6.5 | 9.7 | 1.96 | 2.57 | 4.16 |
| solved: equity bands, exact | IP | 7.0 | 10.7 | 2.58 | 3.49 | 4.19 |
| solved: equity bands, 10% steps | OOP | 7.5 | 11.6 | 1.72 | 2.44 | 3.28 |
| solved: equity bands, 10% steps | IP | 7.4 | 11.0 | 2.44 | 3.41 | 4.21 |
| solved: equity bands, 25% steps | OOP | 8.9 | 14.4 | 1.63 | 2.46 | 3.01 |
| solved: equity bands, 25% steps | IP | 9.6 | 13.7 | 2.50 | 3.56 | 4.38 |
| solved: place in own range x own weak hands, exact | OOP | 4.4 | 9.0 | 1.85 | 2.54 | 3.93 |
| solved: place in own range x own weak hands, exact | IP | 4.2 | 7.6 | 1.37 | 2.30 | 3.65 |
| solved: place in own range x own weak hands, 10% steps | OOP | 5.5 | 8.4 | 1.63 | 2.27 | 3.36 |
| solved: place in own range x own weak hands, 10% steps | IP | 4.6 | 8.6 | 1.26 | 2.17 | 3.85 |
| solved: place in own range x own weak hands, 25% steps | OOP | 8.2 | 15.7 | 1.55 | 2.28 | 3.43 |
| solved: place in own range x own weak hands, 25% steps | IP | 7.8 | 12.2 | 1.26 | 2.56 | 3.17 |
| solved: place x equity, exact | OOP | 4.7 | 8.5 | 1.69 | 2.20 | 3.70 |
| solved: place x equity, exact | IP | 3.9 | 8.5 | 1.32 | 1.99 | 2.91 |
| solved: place x equity, 10% steps | OOP | 6.4 | 9.0 | 1.43 | 2.04 | 3.02 |
| solved: place x equity, 10% steps | IP | 4.6 | 9.0 | 1.22 | 1.84 | 2.69 |
| solved: place x equity, 25% steps | OOP | 6.1 | 8.9 | 1.39 | 2.16 | 2.80 |
| solved: place x equity, 25% steps | IP | 7.1 | 14.5 | 1.28 | 2.24 | 3.62 |
| the solver's own play (check) | OOP | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 |
| the solver's own play (check) | IP | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 |
