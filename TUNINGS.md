# Tunings

A record of every number in the engine and the selectors that was chosen rather than derived,
with what it was tuned on and what else was tried. Kept so that later work can ask whether a
tuning depends on how the spot is defined (range advantage, nut advantage, polarization,
capping). Add a row when a number changes; do not delete the old result.

All losses are the share of the pot lost to the solver's best response ("exploited"), both
seats averaged, unless a row says otherwise. Lower is better.

## The diagnosis run of 2026-11-13: `presets.fitted()`

An 8-hour run that split the engine into four parts (fundamentals, tuner, hand selector,
mixer), built a diagnosis for each, and followed the largest loss on each street downward.
The log, with every intermediate number, is `diagnosis/PROGRESS.md`; the variant files tried
are `diagnosis/v*.mjs`. This section is the record of what was adopted and what was not.

Spot sets (`src/solver/spots.js`): four pairs of ranges (A the earlier pair, B a single-raised
pot, C a 3-bet pot, D blind against blind); rivers at 0.75, 2 and 5 pots behind (`rivers-tune`
72 trees, `rivers-held` 48); turns at 1.5 and 4 pots (`turns-tune` 16, `turns-held` 8); bets of
33%, 75%, 150% pot and 2.5x raises. R12, R8-B, T4 and T4-B are the earlier sets, kept as checks.

Loss to the solver's best response as a share of the pot, both seats averaged, whole engine
(loss to its equilibrium in brackets). `equity` and `napkin` are the presets as they stood
before the run, apart from fix 18 below, which applies to every preset.

| Set | `presets.equity()` | `presets.napkin()` | `presets.fitted()` |
|---|---|---|---|
| rivers-tune (72 trees) | 9.01 (1.11) | 4.64 (0.70) | 3.72 (0.66) |
| rivers-held (48) | 9.24 (1.19) | 4.51 (0.73) | 3.79 (0.70) |
| R12 | 9.33 (1.19) | 3.87 (0.61) | 3.31 (0.77) |
| R8-B | 9.89 (1.13) | 4.41 (0.44) | 3.34 (0.45) |
| turns-tune (16) | 29.20 (3.58) | 14.88 (2.65) | 11.98 (2.12) |
| turns-held (8) | 26.14 (4.41) | 12.70 (2.06) | 9.88 (1.85) |
| T4 | 26.09 (3.52) | 11.70 (1.77) | 9.09 (1.73) |
| T4-B | 34.70 (4.69) | 19.37 (1.93) | 13.54 (2.12) |
| F1 (one flop tree, not tuned on) | 26.81 (6.07) | 14.88 (5.60) | 12.35 (5.17) |

`diagnosis/final-table.txt` has the seats apart.

### Where the loss was, street by street

`bin/locate.js`: the engine decides at one kind of decision only, inside the solver's strategy
and on the solver's range. Loss to the best response, out of position / in position, with
`presets.napkin()` at the start of the run:

| Decision | engine | given the solver's frequencies | and its order of hands | reading |
|---|---|---|---|---|
| river, first to act | 6.4 / 6.9 | 8.6 / 1.6 | 4.4 / 3.0 | in position: frequency (size); out of position: mixing |
| river, facing a bet | 2.4 / 9.3 | 0.6 / 3.7 | 0.5 / 0.8 | frequency, then hand order in position |
| river, facing a raise | 2.1 / 2.4 | 0.6 / 0.7 | 0.4 / 0.4 | frequency |
| turn, first to act | 12.5 / 9.3 | 12.3 / 11.3 | 8.0 / 6.8 | mixing |
| turn, facing a bet | 6.2 / 17.5 | 4.7 / 14.0 | 1.8 / 3.8 | hand order in position |
| turn, facing a raise | 7.1 / 7.4 | 2.5 / 2.2 | 0.7 / 0.8 | frequency |
| river inside a turn tree, first to act | 8.0 / 10.0 | 8.8 / 2.4 | 4.9 / 3.6 | as on river trees |
| river inside a turn tree, facing a bet | 11.8 / 12.6 | 1.3 / 3.5 | 0.9 / 1.2 | frequency |

The same decisions with `presets.fitted()` are in `diagnosis/locate-turns-fitted.txt` and
`diagnosis/locate-rivers-fitted.txt`.

### What the solver does, against the fundamentals

`bin/diagnose-tuning.js` (rows in `diagnosis/tuning-*.json`, fits by `diagnosis/fit.mjs`).
RA = range advantage, hero's average equity minus the opponent's.

| | Rivers | Turns |
|---|---|---|
| continues facing a bet, as a share of MDF | 0.84 oop, 0.89 ip; = 1.14 + 1.09 RA (oop, r2 0.67), 1.12 + 0.93 RA (ip, r2 0.45) | 0.89 oop, 1.00 ip |
| continues facing a raise, as a share of MDF | 0.99 oop, 1.01 ip | 1.21 oop, 1.24 ip |
| raises, as a share of continuing (facing a bet) | 0.15 oop; 0.29 ip = -0.25 + 1.47 x polarization (r2 0.66) | 0.23 oop, 0.15 ip |
| bets, out of position | 41% = 0.34 + 1.44 RA - 0.50 nutAdv + 1.07 polAdv (r2 0.91) | 38% = 0.26 + 1.97 RA - 0.64 nutAdv + 2.72 polAdv (r2 0.93) |
| bets, in position | 50% = 0.48 + 0.28 RA (r2 0.41) | 47% |
| size, out of position | 0.53 pots on average, 67% of bets on the smallest size | 0.76 pots |
| size, in position | 0.87 pots; the smallest size only when deep | 0.56 pots |
| bluffs per value bet against balanced, in position | 1.06 | 1.11 |

Mixing curves (`diagnosis/curves.mjs`, the range cut into 20 slices by equity):

- River, out of position, first to act: the weakest 10% bet 60-75%; the next third checks
  about 90%; from the median to 70% equity the bet frequency climbs from 25% to 75%, mostly
  the small size; the strongest 10% bet only about half the time.
- River, in position after a check: polar. Value from about 0.78 equity, the top 30% bet nearly
  always, the bottom 15% bluff about 85%, no traps.
- Turn, out of position: flat. Every slice bets 25-55%, and the level changes a lot from spot
  to spot (sd 0.35).
- Turn, in position: the strongest 15% bet 85-93%, thinner value about half the time.
- Facing a turn bet in position: the strongest hands call 80% and raise 20%.

### Adopted

| # | Part | Setting | Evidence (loss to the best response, whole engine unless said) |
|---|---|---|---|
| 18 | engine | Bluff raises are capped at the defence frequency. | One spot raised 100% of its range (63% of the pot lost). rivers-tune 4.95 -> 4.64. |
| 19 | strategist | With a tuner, frequencies are always filled; the selector's floors (`callFloor`, "weak" hands) no longer veto calls. | In the 3-bet pot the engine folded 83-88% to a river bet. River facing a bet inside turn trees, located: 12.1 -> 6.1. |
| 20 | tuner | `defence` 0.95 facing a river bet. | Located: 0.95 3.36, 0.9 3.37, 0.85 3.65, 1.0 3.75. Whole engine with 0.95: 4.22 against 4.54 at 1.0. |
| 21 | tuner | River raise share of continuing: oop -0.02 + 0.21 polarization + 0.08 SPR; ip -0.25 + 1.47 polarization. | Located, in position facing a bet: 6.89 -> 5.08. |
| 22 | tuner | River, first to act: aim at 0.75 pot, value threshold 0.6. In position always; out of position only when RA >= 0.03. | In position 4.73 -> 3.94 (tune). Out of position the rule gains 1.27 where RA >= 0.1 and loses 0.45 where RA < -0.03 (`diagnosis/delta.mjs`); unconditional it made R8-B worse (4.41 -> 5.54), conditional 3.34. |
| 23 | mixer | River, out of position, first to act: value with 90%+ equity bets 50% of the time, other value 75%. | Out-of-position seat on rivers-tune: no mixing 5.93, flat 80% 4.12, this curve 3.54. The surrounding grid is flat (3.4-3.7). |
| 24 | tuner | `defenceVsRaise` 1.25 on the turn. | Located: 1.0 6.90, 1.1 4.67, 1.2 3.76, 1.35 3.36. Whole engine turns-tune 15.67 -> 14.31. |
| 25 | mixer | Facing a turn bet, a value hand raises 25% of the time. | Located, in position: uncapped 17.85, 50% 14.11, 25% 13.19, 10% 12.86, never 12.68. Whole engine 14.31 -> 13.88. |
| 26 | mixer | Turn, first to act: out of position value bets 45%; in position value with 85%+ equity always, thinner value 55%. | Whole engine turns-tune 13.40 -> 13.20 and -> 12.98. |
| 27 | selector | In position facing a turn bet: calls by E[HS^2] + equity against his value when 2 or more pots are behind, by class otherwise (`turnCalls: 'ehs2-ip'`, `ehs2Depth: 2`). | Located (tune): by class 13.19, E[HS^2] 9.45. Whole engine without the depth condition it helped T4-B (19.4 -> 14.4) and wrecked T4 (9.4 -> 18.0). By depth: class 9.9 against 11.7 at 1.5 pots; 18.7 against 16.9 at 4 pots. By board: E[HS^2] wins on the draw-heavy `JsTs4h8d` (16.2 against 21.2), loses on the two dry boards. |

Entries 1, 2 and 16 (the 0.7 value threshold inside NapkinSelector and the flat
`oopValueChecks`) are superseded where a rule above covers the decision: the threshold is 0.6
for river opens under the tuner, and the mixer's curves replace the flat value-checking shares.

### Tried and not adopted

| Idea | Why not |
|---|---|
| River bet frequency from the fitted formula (r2 0.91) | Whole engine 4.22 -> 6.23; located 6.63 -> 20.99 with the geometric size. It matches the solver and loses far more. |
| River size from the fitted formula (nut advantage) | Located 6.63 -> 4.90, whole engine 4.22 -> 5.70. |
| Defence falling with range advantage, as the solver's does | Located 3.75 -> 4.94 and whole engine worse than a flat factor. |
| `hisDefence` below 1 (assume he under-defends as the solver does) | Located opens improve (6.63 -> 5.40 at 0.85), whole engine worsens (4.22 -> 4.70 at 0.8). |
| Turn bet frequency out of position from the fitted formula (r2 0.93) | Loss to the equilibrium falls 2.16 -> 1.90, to the best response rises 13.40 -> 13.60. |
| Turn sizes 0.75 / 0.5 pots | 13.40 -> 14.11. |
| Never raising a turn bet | Located it is the best (12.68), but the 25% cap is within half a point and keeps a raising range. |

### What the run says about method

- **Located and whole-engine tests disagree often.** A rule that improves one decision inside
  the solver's strategy can make the whole engine worse, because the engine's other decisions
  are fitted to its own. Located tests found every lead; none was adopted on a located result
  alone.
- **Matching the solver's frequency is not the same as losing less.** Three formulas with r2 of
  0.9 failed. What transferred were small departures from the fundamentals (0.95, 1.25, a size)
  and mixing.
- **Spot definitions matter, and the record now has three cases**: the out-of-position river
  open rule by range advantage (22), the calling order by stack depth and board texture (27),
  and the turn bet frequency by range, nut and polarization advantage (found, not yet usable).
- **Two fixes were not tunings but faults**: unbounded bluff raises (18) and the selector
  vetoing frequency (19). Both were found by listing the worst spots (`diagnosis/worst.mjs`).

## Where the engine loses

`node bin/decompose.js --set <name> --selector <name>` hands each of the engine's jobs to the
solver in turn: its estimate of his range, its frequencies (how often each action, which sizes),
and its choice of hands. Loss to the best response, both seats averaged:

| | his range | frequencies | hands | R12 Napkin | R12 equity | T4 Napkin | T4 equity |
|---|---|---|---|---|---|---|---|
| the engine as it is | engine | engine | engine | 3.9 | 9.3 | 11.7 | 26.1 |
| given his range | solver | engine | engine | 4.7 | 8.0 | 27.4 | 32.7 |
| given the frequencies | engine | solver | engine | 5.1 | 6.5 | 9.6 | 13.8 |
| given both: hand selection alone | solver | solver | engine | 5.3 | 8.4 | 13.3 | 18.1 |
| given the hands, in order | engine | engine | solver, all-or-nothing | 9.8 | 16.9 | 18.1 | 27.8 |
| given the hands, with mixing | engine | engine | solver | 8.7 | 9.1 | 18.1 | 24.8 |
| given his range and the hands | solver | engine | solver | 10.9 | 7.1 | 32.8 | 31.9 |
| the solver, dealt all-or-nothing | solver | solver | solver, all-or-nothing | 4.8 | 4.8 | 10.1 | 10.1 |
| the solver | solver | solver | solver | 0.3 | 0.3 | 0.3 | 0.3 |

"All-or-nothing" is how a selector's order is dealt: hands are taken from the front until the
frequency is filled, so each hand takes one action (only the hand on the boundary is mixed).

Read from the solver down, where each step changes one thing:

1. **Dealing all-or-nothing, even in the solver's own order: 4.5 points on rivers, 9.8 on turns.**
   The largest single loss, and no order can remove it: the solver mixes most hands.
2. **The selector's order instead of the solver's: Napkin 0.5 on rivers and 3.2 on turns; equity
   3.6 and 8.0.** This is what a better order alone could still gain.
3. **The engine's own frequencies and its estimate of his range: Napkin -1.4 on rivers and -1.6
   on turns.** It does better with its own than with the solver's, because its frequencies and
   its hands were tuned together.

What this says about hand selection as a target:

- With an order alone, Napkin is already within half a point of the solver's own order on rivers
  and about 3 points on turns. That is the ceiling for a better order.
- The bigger prize is mixing: up to 4.5 and 9.8 points. A selector can express it (a cap on how
  often a hand takes a role, as `oopValueChecks` does), so it is within reach of hand selection,
  but it means choosing how often as well as which.
- The three jobs are not separable by swapping one at a time from the engine's side: every
  single swap makes the engine worse (rows 2 to 7). The engine's frequencies with the solver's
  hands are the worst pairing of all. Its frequencies are the part furthest from the solver's,
  but they only make sense with its own hands.
- Nothing here shows that estimating his range is what costs the engine. On rivers the solver's
  range changes little (+0.8 Napkin, -1.3 equity). On turns it makes things much worse, which is
  not believable as a finding: with its own bet sizes the engine takes lines the solver never
  does, where the solver's range for the opponent means little.

Per-board levels in the rows that use the solver's frequencies still move by about 5 points
with the solver's precision; the averages over a set are steadier.

The hand-selection-alone row was first measured without making up calls the selector had no
candidates for, so part of it was under-calling: 21.9 on T4 for Napkin and 26.2 for equity
before, 13.3 and 18.1 after. The two tables in the next section were measured before that fix;
their order of selectors and rules stands, their levels on turns are too high.

## How results are measured

`node bin/compare.js --set <name>` reports three settings (`SolverMatch.play` options):

| Setting | The engine is given | What it measures |
|---|---|---|
| engine | nothing | The whole engine: its own frequencies, its own estimate of his range. |
| his range (`ranges: 'solver'`) | The solver's range for the opponent at every decision. | Unreliable beyond one street: with its own bet sizes the engine takes lines the solver never does, where the solver's range for the opponent is not meaningful. |
| his range + freq (`+ frequencies: 'solver'`) | Also the solver's action frequencies. | **Hand selection alone.** It stays on the solver's lines, and a seat's result no longer depends on a model of the opponent. |

Every result recorded before this section used the first setting. In it, several tunings below
are frequency changes that live in the selector (`valueThreshold` decides how many hands bet,
`oopValueChecks` how often they check); in the third setting they have no effect, by design.

Loss to the best response, both seats averaged (against the equilibrium in brackets):

| Set | Selector | engine | his range | his range + freq |
|---|---|---|---|---|
| R12 | equity | 9.33 (1.19) | 8.05 (0.65) | 8.72 (0.78) |
| R12 | Napkin | 3.87 (0.61) | 4.69 (0.66) | 5.66 (0.82) |
| T4 | equity | 26.09 (3.52) | 32.67 (1.83) | 26.21 (2.01) |
| T4 | Napkin | 11.70 (1.77) | 27.39 (1.58) | 21.89 (1.45) |
| T4-B | equity | 34.85 (4.81) | | 26.44 (1.78) |
| T4-B | Napkin | 19.49 (1.94) | | 23.83 (1.38) |

So Napkin's hand selection, on its own, is worth about 3 points on rivers and 3-4 on turns over
equity's. The rest of its turn result in the first setting (11.7 against 26.1) comes from the
frequency tunings, fitted to the engine's own model.

Hand selection alone, rule by rule:

| Rule | R12 | T4 | T4-B |
|---|---|---|---|
| Napkin as it is | 5.66 | 21.89 | 23.83 |
| river bluffs the guide's way (`riverBluffs: 'air'`) | 6.02 | | |
| turn bluffs the guide's way (`turnBluffs: 'roles'`) | | 23.18 | 24.22 |
| turn calls by E[HS^2] (`turnCalls: 'ehs2'`) | | 22.09 | 22.21 |
| turn calls by E[HS^2] in position only (`'ehs2-ip'`) | | 21.90 | 22.23 |
| no `priorStrength` | 12.54 | 24.57 | 27.86 |

## Interchange tests

`node bin/interchange.js` takes the solver's own strategy, reassigns which hands of a group take
which action at the first decision (same totals), and measures what the best response gains.
Out of position, value hands by equity against his range, average loss as a share of the pot
(the solver's own strategy loses 0.07%):

| Group | Turns (T4): even | strongest first | weakest first | Rivers (first 6 of R12): even | strongest first | weakest first |
|---|---|---|---|---|---|---|
| 0.7-1.0 | 4.18 | 7.57 | 13.17 | 4.75 | 9.17 | 16.05 |
| 0.7-0.8 | 0.80 | 1.40 | 1.65 | 0.14 | 0.23 | 0.09 |
| 0.8-0.9 | 1.50 | 3.48 | 5.81 | 0.94 | 1.61 | 1.92 |
| 0.9-1.0 | 0.28 | 0.82 | 0.44 | 0.43 | 0.90 | 1.40 |

The diagnosis now runs this test as its step 3, at every decision it covers and for both seats.
Every hand of a group is given the group's average strategy; loss as a share of the pot:

| Role | Rivers (R12): whole role | within 10 points of equity | within 2 points | Turns (D-T8): whole role | within 10 points | within 2 points |
|---|---|---|---|---|---|---|
| value bets | 9.5 | 1.8 | 0.7 | 10.0 | 3.6 | 1.4 |
| bluff bets | 2.4 | 0.5 | 0.1 | 9.3 | 6.0 | 3.4 |
| calls | 22.8 | 2.3 | 0.9 | 36.2 | 5.9 | 2.2 |

Hands of the same equity are close to interchangeable only for river bluffs. On the turn, bluffs
within 2 points of equity of each other still cost 3.4% when mixed: equity does not make turn
hands twins.

A first version of this step reported losses near zero. The bridge's `reset` kept earlier
locks, and the solver's best response treats the responder's locked nodes as fixed, so once
both seats had been pinned in one session nothing could be exploited. `reset` now rebuilds the
game. Results recorded before this were not affected: each used one seat per solver.

## Solver precision

`bin/compare.js` and `SolverMatch` stop solving at 0.3% of the pot (at most 300 iterations in
`compare.js`); the diagnosis and the interchange test at 0.1%. Measured on one river, two turns
and one flop tree at targets of 0.1%, 0.3%, 1% and 5%:

- Solving is a small part of a run: 0.8 of 3.1 seconds on a turn tree, 3.6 of 42 on the flop.
  Stopping at 1% saves about 0.4 seconds a turn tree.
- The whole-engine result barely moves: 8.06, 8.04, 7.92, 7.49 on a turn.
- Hand selection alone moves a lot, and not in one direction: 26.4, 30.5, 17.2, 20.1 on the same
  turn, and 13.8 to 18.5 in one seat between 0.03% and 0.3%. It is given the solver's ranges and
  frequencies, which keep changing long after the value has settled. Napkin beat equity in all 16
  seat-by-precision cells measured, so the order of two selectors holds; the level does not.
- The share of first-decision hands the solver plays pure falls from 38% to 14% on a turn between
  0.1% and 5%: the diagnosis loses its musts and can'ts.

Value hands are **not** interchangeable across the value range: mixing them evenly costs 4-5% of
the pot, and betting the strongest first (what both selectors do) costs 8-9%. Within a band of
10 points of equity they are closer to it (0.1-1.5%). Which hand takes which action and size
depends on its strength in a way no characteristic measured so far explains (best correlation
with the solver's bet frequency out of position on the turn: 0.26).

## Test sets

| Name | Trees | Ranges | Stack | Bets / raises |
|---|---|---|---|---|
| R12 | 12 rivers: `Td9d6hQc7s Ks7h2d5c9s AhJh8c3d2h 8s8d4c2hKd QsJd6c3h2s Ac9c5d5hTs 7h6h5c2dKs KdQd4s9h3c Jc8c3c6dAh Ts7s4d2hQh AdKh7c7d2s 9s8h3d2cJd` | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| R4 | the first 4 rivers of R12 | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| R8-B | 8 rivers: `Kh8s4d2cJs As7d6d3hTc QdTd5s9c2h 9h9c4s7dAd JsTh2c5dKd 6s5s2h8cQs Ad5c3h9sQc Th8h7c2sAc` | B | 4x pot | 50%, 100% / 3x |
| T4 | 4 turns: `Ks7h2d5c JsTs4h8d Td9d6hQc Ah8c3d6s` | A | 2.5x pot | 33%, 75%, 150% / 2.5x |
| T4-B | 4 turns: `Kh8s4d2c QdTd5s9c 9h9c4s7d 6s5s2h8c` | B | 5x pot | 50%, 100% / 3x |
| D-T8 | diagnosis only: 8 turns (`Ks7h2d5c JsTs4h8d Td9d6hQc Ah8c3d6s QsJd6c3h Ac9c5d5h 7h6h5c2d KdQd4s9h`) | A | 2.5x and 6x pot | 33%, 75%, 150% / 2.5x |
| F1 | 1 flop: `Td9d6h` | A | 1.5x pot | 75% / 3x |
| M6 | 4 rivers and 2 turns (R4 plus `Ks7h2d5c JsTs4h8d`) | A | 2.5x pot | 33%, 75%, 150% / 2.5x |

Ranges A: OOP `66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s`, IP
`QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+`.
Ranges B: OOP `99-22,A9s-A2s,K2s+,Q5s+,J7s+,T7s+,96s+,86s+,75s+,64s+,54s,AJo-A2o,K9o+,Q9o+,J9o+,T9o`,
IP `22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QTo+,JTo`.

Every set uses a pot of 100 and the engine's defaults (geometric sizing, 3 raises). Nothing has
been run with other engine settings, other pot sizes, or preflop.

## Summary

| # | Tuning | Where | Value | From | Tuned on | Checked on | Spot-dependence |
|---|---|---|---|---|---|---|---|
| 1 | `valueThreshold` | NapkinSelector | 0.7 | guide: 0.5 | R12 | R8-B, T4 | not tested; see note |
| 2 | `oopValueChecks.river` | NapkinSelector | 0.2 | new | R12 | R8-B, T4 | likely; see note |
| 3 | `riverBluffs` | NapkinSelector | `'weakest'` | guide: `'air'` | R12 | - | not tested |
| 4 | `twinEquity` | NapkinSelector | 0.02 | chosen | R12 (no effect) | - | not tested |
| 5 | `priorStrength` | NapkinSelector | 0.13 | new | R4 | R12 | not tested |
| 6 | bluff-catcher weights | `WEIGHTS.catcher` | 0.13, 0.13, 0.07, 0.03, 0.02 | guide's table | R4 (no effect) | - | not tested |
| 7 | `drawBehind` | NapkinSelector | 1 pot | new | F1 | T4 | by construction (stack depth) |
| 8 | flop bluff role order | NapkinSelector | the turn's rule | guide: draws first | F1 | - | by construction (depth, range advantage) |
| 9 | role-order thresholds | `WEIGHTS.rangeGap/shallow/deep` | 0.05, 1.25, 5 | chosen | never tuned | - | by construction |
| 10 | `valueThreshold` | EquitySelector | 0.5 | theory | M6 (flat) | R12 | not tested |
| 11 | `callFloor` | both selectors | 0.5 | new | M6 (flat) | - | not tested |
| 12 | `barrelSize` | ParetoEngine | 0.75 pot | chosen | never tuned | - | not tested |
| 13 | `sizing` | ParetoEngine | `'geometric'` | theory | never tuned | - | not tested |
| 14 | untuned guide numbers | NapkinSelector | see below | guide | never tuned | - | not tested |
| 15 | `turnBluffs` | NapkinSelector | `'draws'` | guide: `'roles'` | D-T8, T4 | T4-B | held across seats and depths |
| 16 | `oopValueChecks.turn` | NapkinSelector | 0.4 | new | T4 | T4-B | not tested |
| 17 | `turnCalls` | NapkinSelector | `'classes'` (guide) | `'ehs2'` tried, not adopted | T4 | T4-B | differs by seat |

## Each tuning

### 1. Napkin `valueThreshold` = 0.7

A hand bets or raises for value when it beats more than this share of the range that continues.

| Set | 0.5 | 0.55 | 0.6 | 0.7 | 0.75 | 0.8 | 0.85 | 0.9 |
|---|---|---|---|---|---|---|---|---|
| R12, `oopValueChecks` 0 | 6.77 | 6.25 | 5.52 | 3.93 | 4.22 | 4.77 | 5.22 | |
| R12, `oopValueChecks` 0.2 | | | | 3.87 | 4.25 | 4.73 | 5.19 | |
| R8-B, `oopValueChecks` 0.2 | 5.86 | | 5.07 | 4.41 | | 4.49 | | 5.52 |
| T4, `oopValueChecks` 0.2 | 21.79 | | 18.13 | 14.32 | | 12.25 | | 13.34 |

Loss against the solver's equilibrium on T4: 3.2% at 0.5, 2.3% at 0.7, 2.8% at 0.8, 3.8% at 0.9.
One value is used on every street. Turns alone would pick 0.8 on exploited loss and 0.7 on loss
against equilibrium.

Spot note: the solver's own thinnest value bet (10th percentile, equity against the hands that
really call) is 0.52-0.73 out of position and 0.51-0.63 in position across R12. It moves little
with any spot measure out of position (strongest: 0.48 with our polarization) and falls with nut
advantage in position (-0.65). The tuned 0.7 is higher than the solver's because the engine's
model of the range that continues is weaker than the real one, so whether the best threshold
moves with the spot has to be measured per spot, which has not been done.

### 2. Napkin `oopValueChecks` = 0.2

Out of position on the river, every value hand checks this share of the time.

| Set | 0 | 0.15 | 0.2 | 0.3 | 0.35 | 0.45 |
|---|---|---|---|---|---|---|
| R12, `valueThreshold` 0.5 | 6.77 | 5.54 | | 4.56 | | 4.11 |
| R12, `valueThreshold` 0.7 | 3.93 | | 3.87 | | 3.94 | |
| R8-B, `valueThreshold` 0.7 | 4.52 | | 4.41 | | | |
| T4, `valueThreshold` 0.7 | 14.68 | | 14.32 | | | |

Most of its effect disappears once `valueThreshold` is 0.7: the two overlap. It replaces the
guide's `thinValue` and `trapShare` rules, which changed nothing on R12 (6.77 with or without)
because thin hands are not value at the engine's bet sizes.

Spot note: the solver checks 34-65% of its strong value (80%+ equity) out of position across
R12, and about 3% in position. Out of position that share rises when we are capped (0.52) and
falls with range advantage (-0.51), nut advantage (-0.48) and polarization advantage (-0.54).
All sit at the edge of noise for 12 spots but point the same way, so this is the tuning most
likely to want a spot-dependent value.

### 3. Napkin `riverBluffs` = `'weakest'`

| | `'air'` (guide: air first, by blockers) | `'weakest'` (least equity first, blockers among twins) |
|---|---|---|
| R12, `valueThreshold` 0.5 | 7.24 | 6.77 |
| Diagnosis on R12: must-bluffs ranked above can't-bluffs | 0.78 | 0.91 |

Among twins the blocker term is `0.4 x (blocks his calls - blocks his folds)`; the 0.4 only has
to keep the term inside one twin band and was not tuned. In the diagnosis, among in-position
bluffs of equal equity, blocking his calls separates musts from can'ts at 0.60 and not blocking
his folds at 0.66. Out of position equity alone decided every case.

### 4. Napkin `twinEquity` = 0.02

0.02 and 0.05 both give 6.77 on R12.

### 5. Napkin `priorStrength` = 0.13

Weight, among the bluff-catcher marks, of equity against the range he started the hand with.

| Set | 0 | 0.13 | 0.3 |
|---|---|---|---|
| R4 (when added) | 15.16 | 6.71 | |
| R12, `valueThreshold` 0.5 | | 6.77 | 6.68 |

In the diagnosis it separates must-calls from must-folds on R12 at 0.97 (0.82 among twins of
equal equity against his bets), just behind equity against his bets itself at 0.99. An earlier
version of the diagnosis compared hands across bet sizes on the same board and reported 0.94
against 0.83, and scored the equity selector's calls at 0.83 against Napkin's 0.96; compared
within one bet size the two selectors score 0.99 and 0.98. Napkin's gain on river calls in the
exploited results is therefore not explained by this score.

### 6. Bluff-catcher weights

Margin 0.13, equity against his value 0.13, blocks his value 0.07, good rivers 0.03, bad rivers
0.02: each mark's gap between must-calls and must-folds in the guide's table. The first version
used 3, 2, 2, 1, 1. Both gave 15.16 on R4 before `priorStrength` was added.

Tried and left out: not blocking his bluffs as a mark. Weight 0.07 gave 6.73 and 0.2 gave 6.78
on R12, against 6.77 without, although the diagnosis rates it 0.64-0.85 among twins.

### 7. Napkin `drawBehind` = 1

A draw calls ahead of made hands only when this many pots are left behind after the call.

| Set | 0 | 0.5 | 1 | 2 |
|---|---|---|---|---|
| F1, out of position / in position | 27.2 / 31.7 | 26.4 / 28.4 | 26.4 / 28.4 | 26.4 / 28.4 |
| T4 (`valueThreshold` 0.5) | 25.50 | | 23.82 | |

F1 cannot tell 0.5, 1 and 2 apart: its stacks are too shallow for any call to leave half a pot.

### 8. Flop bluff role order

The guide puts draws first on the flop. Using the turn's rule (pure bluffs first when we are
ahead in range or stacks are shallow) and putting pairs last moved F1 from 29.6 / 39.9 to
27.2 / 31.7 (out of position / in position). F1 has shallow stacks only; the draws-first branch
has not been measured.

### 9. Role-order thresholds (never tuned)

`rangeGap` 0.05: the range-equity gap at which the spot fully favours one order. `shallow` 1.25
and `deep` 5: stack-to-pot ratios. Draws go first when the two terms sum above zero.

### 10. Equity `valueThreshold` = 0.5

| Set | 0.5 | 0.55 | 0.6 | 0.65 | 0.7 | 0.75 | 0.8 |
|---|---|---|---|---|---|---|---|
| M6 | 16.72 | 16.12 | 14.94 | 12.38 | 13.71 | | 14.09 |
| R12 | 9.33 | | | | | 9.35 | |

Flat, unlike Napkin's: a higher threshold only pays with Napkin's calling order behind it.

### 11. `callFloor` = 0.5

A hand needs this share of the pot odds in equity to call, and his continuing range is assumed
to as well. On M6 with the equity selector: 0 gives 16.73, 0.25 16.63, 0.5 16.62, 0.75 16.61,
1 gives 18.09. It exists for ranges with no bluff-catchers: without it the engine lost 12.5% in
the nuts-or-air game by calling with hands that beat nothing.

### 12-13. Engine: `barrelSize` 0.75 and `sizing` `'geometric'`

Never tuned. One early run on the turn `Td9d6hQc` (stack 3x pot, equity selector, before later
changes): `multiStreetBluffs: false` 27.7 / 21.9 against 24.2 / 21.7; `sizing: 'smallest'`
27.2 / 21.8. The diagnosis shows the solver's main river size out of position is 33% pot on
every R12 board, while the engine's geometric choice is the largest size. This is the most
obvious untested lever.

### 14. Guide numbers never tuned

`airEquity` 0.2, Newman's points (0.8 at half a pot, 0.9 at a pot, 0.97 at three pots),
`thinValue` 0.5-0.7 and `trapShare` 1/6 (both inactive by default), the 0.1 blocker weight in
the value order, and the diagnosis's must and can't cut-offs (85% and 15%).

### 15. Napkin `turnBluffs` = `'draws'`

Turn bluffs ordered by `draw equity - strength now - 2 x (share of his folds the hand blocks)`,
in place of the guide's six roles. Found by scoring candidate rules on D-T8 for how often they
rank a must-bluff above a can't-bluff from the same decision:

| Rule | All | Out of position | In position | Stack 2.5x | Stack 6x |
|---|---|---|---|---|---|
| guide's roles | 0.70 | 0.60 | 0.73 | 0.59 | 0.80 |
| equity selector (weakest first) | 0.70 | 0.83 | 0.67 | 0.75 | 0.66 |
| draw equity | 0.83 | 0.98 | 0.79 | 0.79 | 0.87 |
| low strength now | 0.83 | 0.92 | 0.80 | 0.83 | 0.82 |
| equity spread | 0.85 | 0.93 | 0.84 | 0.84 | 0.87 |
| draw equity - strength now | 0.86 | 0.94 | 0.84 | 0.84 | 0.87 |
| equity spread - blocks his folds | 0.90 | 0.94 | 0.89 | 0.88 | 0.92 |
| **draw equity - strength now - 2 x blocks his folds** | 0.92 | 0.97 | 0.90 | 0.91 | 0.93 |

(Built into the selector it scores 0.89, because the selector sees each bet size's folding range
and the table used the main size's.) The weight of 2 on blockers was the only value tried.

| Set | `'roles'` | `'draws'` |
|---|---|---|
| T4, exploited / against equilibrium | 14.32 / 2.31 | 13.26 / 1.93 |
| T4-B | 21.52 / 2.86 | 20.39 / 2.09 |

The gain is out of position (12.7 to 10.5 on T4, 18.4 to 15.5 on T4-B); in position it is flat.

### 16. Napkin `oopValueChecks.turn` = 0.4

On D-T8 no characteristic separates the solver's out-of-position turn value bets from its value
checks (best 0.53), and it bets 36-65% of every band and 28% of the nuts. This was first recorded
as "the hands are interchangeable". The interchange test above shows they are not (an even mix
costs 4.2% of the pot); what is true is that nothing measured so far tells them apart. The
tuning is a frequency applied evenly, and it is a stand-in for a rule that has not been found.

| Set | 0 | 0.2 | 0.4 |
|---|---|---|---|
| T4, exploited / against equilibrium | 13.26 / 1.93 | 12.18 / 1.82 | 11.70 / 1.77 |
| T4-B | 20.39 / 2.09 | 22.67 / 2.03 | 19.49 / 1.94 |

The out-of-position seat improves steadily on both sets (10.5, 9.8, 9.1 and 15.5, 14.2, 13.1).
The in-position seat's result moves by several points with no pattern (25.3, 31.2, 25.9 on
T4-B), although only its model of the opponent changed. Differences of that size on four boards
should be read as noise.

### 17. Napkin `turnCalls`: `'ehs2'` tried, not adopted

Ordering turn calls by `E[HS^2] + equity against his value` ranks must-calls above must-folds at
0.99 on D-T8, against 0.96 for the guide's classes and 0.94 for equity. Against the best
response it did not carry over:

| Set | classes | `'ehs2'` | `'ehs2-ip'` (in position only) |
|---|---|---|---|
| T4, out of position / in position | 10.5 / 16.0 | 30.5 / 14.2 | 10.9 / 14.2 |
| T4-B | 15.5 / 25.3 | 20.2 / 19.6 | 17.7 / 20.2 |

That was the engine setting, where a seat's result also depends on its model of the opponent.
With hand selection alone (table at the top) `'ehs2'` is level on T4 and 1.6 points better on
T4-B, and never worse in either seat. The out-of-position collapse above came from the model,
not from the calls. Still off by default: the gain is on one set.

## Not yet used

On D-T8 the solver's must-calls on the turn are also marked by equity swing (0.93 among twins)
and draw equity (0.90 among twins). Bluff raises and value raises are not covered by the
diagnosis on any street. The turn rules have not been tried on the flop, where only one shallow
tree has been diagnosed.

## Spot data

`node bin/diagnose.js --out diagnosis/rivers.json` writes, for every opening decision, how the
spot is defined (range advantage, nut advantage, polarization advantage, capping, from
poker-rangeman's `compare()`) next to what the solver does there (how often it bets, its main
size, how much strong value it checks, its thinnest value bet, its strongest bluff, the bluff
share of its bets), and the correlations between the two for each seat. `diagnosis/rivers.json`
holds the R12 run and `diagnosis/turns.json` 8 turns at stacks of 2.5x and 6x pot.

What that file does not yet answer: whether the *best tuning* changes with the spot. It shows
whether the solver's play does. Answering the first needs each tuning swept per spot and the
per-spot optimum compared with the spot's measures.
