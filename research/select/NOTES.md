# Hand-selection tolerance study: work log

Question (owner): were we too precise about which hands take an action? If a hand may lose a little (a tolerance band)
instead of nothing, do simple selection rules appear, and what makes a hand better for an action?

## Data

- `collect.mjs`: real river (300) and turn (382) spots from the owner's stored solves (ranges as play left them; data
  stays outside the repo, in `STORE`), solved again here with three bet sizes and one raise. At every decision both
  players reach 5%+ of the time: each hand's weight, the solver's mix, and each action's value (take it, then play as well
  as possible against his solved strategy; `src/explain/best.js`), in % of the pot at the decision, plus what a player
  can see (equity, hand row, outs, kicker, blockers).
- Flop: the engine's nineteen boards with one small bet a street (`collect.mjs flop`).

## Tools

- `band.py`: share of the range with two kinds of action inside a tolerance; what the forced hands want, by equity.
- `features.py`: inside 10-point equity bands, the top third against the bottom third by each characteristic.
- `rules.py`: solver's frequencies, hands chosen by a rule; the loss per hand. `misses.py`: where a rule's loss sits.
- `exploit.mjs` + `exploit_report.py`: one player's whole street rebuilt (tolerance arms, rule arms, class arms, amounts
  off by a factor) and scored against the solver's fixed play and against a perfectly adapting opponent.

## Log

1. First version of the exploitability test scored lines the opponent takes under 2% of the time; action values there
   are noise and the rebuilt play was punished for it (in position 20%+ for every arm). Those lines now keep the
   solver's play (`RARE`).
2. "Each hand takes its own best action" (no tolerance, pure) is 11% exploitable on rivers: zero loss per hand does not
   make a sound strategy. The amounts are what protect it.
3. Class arms (solver's amounts kept inside equity classes, hands random inside a class) are much worse than the rule
   arms (value from the top, folds from the bottom): random choice inside a wide class folds 60% hands and calls 36%
   hands. Order by equity matters; identity inside the order does not.
4. Turn exploitability run took 8 minutes a spot (strategy copies rebuilt for every arm); cached, now 11 s.
5. Tried for the draw bonus when facing a turn bet: 5, 10 and 20 points (and "draws fold last", which was worse than
   plain equity). 10 chosen; 10 and 20 are level in position.
6. Turn exploitability: equity order (22 / 17 with the two rules) is worse than a random pick inside seven classes
   (15 / 15); the floor with hands inside a 0.5% band is 14 / 11. Strict order caps the passive ranges.
7. Amounts-off arms first ran with a guard that treated "bluff x0" as no change; fixed and rerun (11 / 10).
8. Flop collection hit the background time limit at 16 of 19 boards (three single-raised boards missing); not rerun.
9. Write-up: `hand-selection.md`.
