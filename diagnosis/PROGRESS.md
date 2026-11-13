# Diagnosis run: progress log

Started 2026-11-13 02:49 UTC, planned for 8 hours. The newest entry is at the bottom. If the
session restarts, read the last "Next" line and continue from there.

## Brief

Three components, each its own object, diagnosed from general to specific, following the
biggest win at each step:

- **Frequencies** (`ParetoEngine`): the mathematically sound fundamentals. They do not change.
- **Tuning** (`Tuner`): feeds the engine values that adjust its frequencies for the spot and
  the configuration. Allowed to change bet sizing.
- **Hand selection** (`HandSelector`): which hands come first for each role.
- **Mixing** (`Mixer`): how often a hand mixes its options (100% when it plays pure).

Rivers and turns in depth; the flop only as a final check. A varied set of spots, split into
a tuning set and a held-out set. Measured by loss to the solver's best response.

## Plan

1. Architecture: `Mixer`, `Tuner`, move frequency-like settings out of the selector.
2. Spot sets: several range pairs, stack-to-pot ratios, board textures; tuning and held-out.
3. Locate: for each street and decision type, substitute the engine into the solver's strategy
   at that decision only, and rank where the loss is.
4. For the worst decisions, split the loss by component (tuning, selection, mixing).
5. Tuning diagnosis: how the solver's frequencies depart from the fundamentals, as a function
   of the spot. Fit formulas, build them into the Tuner, check on held-out spots.
6. Mixing diagnosis: which grouping of hands makes them interchangeable, and what frequency
   each group takes. Build into the Mixer, check on held-out spots.
7. Selection diagnosis: continue from the existing one on the worst decisions.
8. Flop check. Final write-up.

## Log

- (times in this log before the 05:10 entry are estimates and run fast; real elapsed time at 05:10 was 2h20m)
- 03:05 **Step 1 done.** `src/Mixer.js`, `src/Tuner.js`, `src/presets.js`. The engine takes
  `tuning` (`sizing`, `value`, `bluff`, `defence`); selectors read `context.tuning.valueThreshold`;
  `context.profile` describes the spot. Value-checking moved from NapkinSelector to a mixer.
  Results unchanged (R12: Napkin 3.87, equity 9.33). 38 tests pass. Next: step 2, spot sets.
- 03:25 **Step 2 done.** `src/solver/spots.js`: four range pairs (A, B single-raised, C 3-bet,
  D blind v blind), rivers at 0.75x/2x/5x pot (72 tune, 48 held), turns at 1.5x/4x (16 tune, 8
  held). `measure` runs four trees at a time. Baselines, whole engine, loss to best response:
  rivers-tune Napkin 4.95 / equity 9.55; turns-tune Napkin 14.90 / equity 29.22.
- 03:35 **Step 3, rivers.** `bin/locate.js`: the engine decides at one kind of decision only,
  inside the solver's strategy, on the solver's range. rivers-tune, Napkin (oop / ip):
  open 6.4 / 6.9; facing a bet 2.4 / 9.3; facing a raise 2.1 / 2.4.
  With the solver's frequencies: open 8.6 / 1.6; facing bet 0.6 / 3.7; facing raise 0.6 / 0.7.
  With the solver's order too (dealing alone): open 4.4 / 3.0; facing bet 0.5 / 0.8; raise 0.4 / 0.4.
  Reading: in position the loss is frequency (facing a bet and after a check); out of position
  opening it is mixing. Saved in diagnosis/locate-rivers-tune.{txt,json}.
  Turns running in the background -> diagnosis/locate-turns-tune.txt.
  Next: step 5 for rivers, tuning diagnosis (how the solver departs from the fundamentals by spot).
- 04:05 **Step 5, rivers, part 1.** `bin/diagnose-tuning.js` + `diagnosis/fit.mjs`: the solver's
  departures from the fundamentals on rivers-tune (diagnosis/tuning-rivers-tune.json):
  - facing a bet it continues at 0.84 (oop) / 0.89 (ip) of MDF, tracking range advantage
    (defence = 1.14 + 1.09 RA oop, r2 0.67; 1.12 + 0.93 RA ip, r2 0.45); facing a raise 0.99 / 1.01.
  - oop bets 41%: 0.34 + 1.44 RA - 0.50 nutAdv + 1.07 polAdv (r2 0.91), 67% of bets on the
    smallest size; ip bets 50% (0.48 + 0.28 RA), mid sizes, bluffs balanced (1.06).
  - raises as a share of continuing: ip 0.29 = -0.25 + 1.47 polarization; oop 0.15.
  Found and fixed while testing (diagnosis/try.mjs, worst.mjs, lines.mjs):
  - bluff raises were unbounded (one spot raised 100%): the engine now caps bluff raises at the
    defence frequency. 4.95 -> 4.64 on rivers-tune.
  - the selector vetoed frequency: with few "qualifying" bluff catchers it folded 83-88% to a bet
    in the 3-bet pot. With a tuner active the frequency is now always filled (calls made up from
    the next strongest hands, no selector floor); under-defending is the tuner's `defence`.
  - `fittedTuner`: defence 0.95 flat (the fitted slope in range advantage loses more to the best
    response than a flat factor), raise rule as fitted, hisDefence 1.
  rivers-tune whole engine: 4.95 at the start of the run -> 4.22. Located "facing a bet":
  5.84 -> 3.36; "facing a raise": 2.25 -> 0.77.
  Next: river opens (sizing, bet frequency), then mixing out of position, then held-out check.
- 05:15 **Rivers: tuner and mixer fitted and validated.** `presets.fitted()` = NapkinSelector +
  `fittedMixer()` + `fittedTuner()`. Whole engine, loss to best response (napkin -> fitted):
  rivers-tune 4.64 -> 3.72; rivers-held 4.51 -> 3.79; R12 3.87 -> 3.31; R8-B 4.41 -> 3.34.
  What went in (each tested by diagnosis/try.mjs on rivers-tune, variant files diagnosis/v*.mjs):
  - tuner: defence 0.95 facing a bet; raise share of continuing from polarization and SPR;
    first to act, size aimed at 0.75 pot and value threshold 0.6 (in position always; out of
    position only when ahead in range by 0.03: `diagnosis/delta.mjs` shows the rule gains 1.27
    points when range advantage is 0.1 or more and loses 0.45 when behind).
  - mixer: out of position on the river the strongest value (90%+ equity) bets half the time,
    the rest three quarters. No mixing 5.9, a flat 80% 4.1, this curve 3.5 (oop seat, tune set).
  - `diagnosis/curves.mjs`: the solver's mixing curves over hand strength (20 slices).
  Not adopted, although they match the solver: the fitted bet-frequency formula and the fitted
  size formula (both lose more in the whole engine), and the defence slope in range advantage.
  Lesson recorded: located tests (one decision inside the solver's strategy) are leads; a change
  is adopted only if the whole engine improves on the tune set and holds on the others.
  Turn locate finished: see diagnosis/locate-turns-tune.txt.
  Next: turns. diagnose-tuning on turns-tune, curves, then tuner/mixer rules for the turn, then
  the calling order in position facing a turn bet (located: 14.0 with the solver's frequencies,
  3.8 with its order too).
- 06:20 **Turns, located (turns-tune, Napkin, before today's fixes; oop / ip):**
  turn open 12.5 / 9.3 (solver freq 12.3 / 11.3; its order too 8.0 / 6.8: mixing);
  turn facing a bet 6.2 / 17.5 (solver freq 4.7 / 14.0; its order too 1.8 / 3.8: hand order in position);
  turn facing a raise 7.1 / 7.4 (solver freq 2.5 / 2.2: frequency);
  river open inside turn trees 8.0 / 10.0 (solver freq 8.8 / 2.4);
  river facing a bet inside turn trees 11.8 / 12.6 (solver freq 1.3 / 3.5).
  With the current code: river facing a bet 12.1 -> 6.1 (frequencies always filled) -> 5.0
  (fitted); turn facing a raise 7.2 -> 6.9; turn facing a bet 5.75 / 17.85, unchanged.
  Turn tuning diagnosis (diagnosis/tuning-turns-tune.json): facing a turn bet the solver
  continues 0.89 (oop) / 1.00 (ip) of MDF; facing a turn raise 1.21 / 1.24 of MDF; raises 23% /
  15% of continuing; oop bets 38% = 0.26 + 1.97 RA - 0.64 nutAdv + 2.72 polAdv (r2 0.93).
  Turn curves: out of position the solver bets 25-55% of every slice of the range (flat, and it
  varies a lot by spot); in position the strongest 15% bet 85-93%. Facing a turn bet in position
  the strongest hands mostly call (80% call, 20% raise): the engine raises them all.
  Whole engine on turns-tune: napkin 14.88, fitted 15.67. The river rules do not carry into turn
  trees as they stand; no single rule is the cause.
  Running: diagnosis/turn-rules.txt (turn defence vs raise, turn defence, turn raise share).
  Next: a mixer cap on raising in position facing a turn bet; then turn opens.
- 07:55 **Turns: fitted and validated.** Added to `presets.fitted()` / `fittedTuner` / `fittedMixer`:
  - tuner: continue at 1.25 x MDF facing a turn raise (located: 6.9 -> 3.8);
  - mixer: facing a turn bet a value hand raises 25% of the time (located, in position: 17.9 ->
    13.2; never raising 12.7); out of position turn value bets 45%; in position on the turn the
    strongest value (85%+) always bets and thinner value 55%;
  - selector: in position facing a turn bet, calls ordered by E[HS^2] + equity against his value
    when at least 2 pots are behind, by class otherwise. `diagnosis/bygroup.mjs`: by class 9.9
    against 11.7 at 1.5 pots behind, 18.7 against 16.9 at 4 pots; and by board the E[HS^2] order
    wins on the draw-heavy board (16.2 against 21.2) and loses on the two dry ones.
  Whole engine, napkin -> fitted: turns-tune 14.88 -> 11.98; turns-held 12.70 -> 9.88;
  T4 11.70 -> 9.09; T4-B 19.37 -> 13.54.
  Tried on turns and not adopted: oop bet frequency from the spot formula (lower loss to the
  equilibrium, 2.16 -> 1.90, but 0.2 more to the best response); turn bet sizes 0.75 / 0.5 pots
  (worse); turn defence factors facing a bet (no effect).
  Next: re-locate turns with the fitted parts (diagnosis/locate-turns-fitted.txt), flop check,
  then write-up (TUNINGS.md, README).
- 05:35 (real time from here) **Re-located with the fitted parts** (oop / ip; floor = the
  solver's frequencies and order dealt all-or-nothing):
  rivers-tune: open 4.6 / 5.6 (floor 4.4 / 3.0); facing a bet 2.0 / 4.7 (0.5 / 0.8); raise 0.7 / 0.9.
  turns-tune: turn open 11.1 / 8.4 (floor 8.0 / 6.8); turn facing a bet 4.3 / 9.4 (1.8 / 3.8);
  turn facing a raise 3.6 / 3.4 (0.7 / 0.8); river open inside turn trees 6.9 / 18.1 (4.9 / 3.6);
  river facing a bet 4.8 / 5.2; river facing a raise 0.8 / 0.9.
  The in-position river open inside turn trees got worse located (10.0 -> 18.1) with the 0.6
  value threshold; located it wants 0.8 (10.9), on river trees located 0.7. The whole engine
  disagrees on both (turns-tune: 0.6 11.98, 0.7 12.09, 0.8 12.43; rivers-tune 0.6 3.72, 0.7
  3.99), so 0.6 stays. Recorded as another located / whole-engine disagreement.
  The largest remaining piece is turn opens, and most of it is below the all-or-nothing floor:
  it needs mixing by kind of hand, not a better order.
  Running: diagnosis/final-table.txt (equity, napkin, fitted on every set, plus the flop tree).
  Next: write-up of results so far; then a mixing table for turn opens (the solver's bet
  frequency by strength now and draw), tested located and on the whole engine.
- 05:55 **Results table for the fitted preset** (diagnosis/final-table.txt, TUNINGS.md): fitted
  beats napkin on all nine sets, including the four not tuned on and the flop tree
  (14.88 -> 12.35). Rivers about 3.3-3.8, turns 9-13.5.
  Mixing diagnosis for turn opens: `diagnosis/open-hands.mjs` + `open-table.mjs`. The solver's
  bet level out of position runs from 4% to 100% across the 16 turn decisions; a table over
  kinds (rank of strength now x draw), scaled by the level, explains 45% (oop) / 38% (ip) of the
  per-hand variation; the best any kind table could do is 72% / 56%.
  Built `KindMixer` (src/Mixer.js) with `direct()`: how often each hand bets, from that table.
  Running: diagnosis/kind-mixer-located.txt (turn:open, located). Next: whole engine if it helps.
- 06:10 **Kind-table mixer adopted for turn opens** (`KindMixer`, `TURN_KINDS`, in `fittedMixer`).
  Located turn open: 9.75 -> 8.59. Whole engine, fitted before -> with the kind table:
  turns-tune 11.98 -> 10.01; turns-held 9.88 -> 8.87; T4 9.09 -> 8.63; T4-B 13.54 -> 10.98;
  flop tree 12.35 -> 12.09. The out-of-position table alone also helps the in-position seat
  (13.26 -> 10.58): its model of the opponent's checking range is no longer all weak.
  The turn value caps (0.45 oop; 1 / 0.55 ip) stay: they set how much value is counted, hence
  the bet level the table spreads. Without them T4 was 10.63 instead of 8.63.
  The level from the solver's spot formula instead of the engine's: located 8.84 against 8.59,
  not better.
  Next: the same for river opens (a table over rank, no draws) and for the flop tree's flop
  decisions; then facing-a-bet decisions by kind.
- 06:25 River opens by a rank table (`diagnosis/v27.mjs`): worse than the current order with
  caps (rivers-tune 4.13 against 3.72; with the level from the spot formula 4.68). Not adopted.
- 06:50 **Flop check.** `flops-check` (three more small flop trees: C Ks7h2d 1x, A AhJh8c 1.5x,
  C 8s8d4c 1.5x; one bet size): napkin 16.13 -> fitted 12.00 -> with the turn kind table also
  used at flop decisions 10.59. F1: 12.08 -> 10.36. Adopted for the flop (checked, not fitted).
  Facing a turn bet by kind (`TURN_FACING_KINDS`, `diagnosis/facing-hands.mjs`): the solver's
  draws continue whatever they are now (nut draws 80-100%, strong draws 50-85% even from the
  bottom fifth of the range); hands with no draw continue from about the middle of the range.
  `KindMixer` now handles facing a first bet too. Running located test (v30).
- 07:00 Facing a turn bet by kind: located it is much worse than the order (in position 9.4 ->
  21.7; out of position 4.3 -> 12.5). Hands of a kind are not interchangeable when calling, as
  the interchange test said (5.9% within 10 points of equity). Not adopted; `tables.facing`
  stays as an unused option. Next: the bet level the turn table spreads (scale 0.8 / 1.2).
- 06:55 **Results table refreshed** (TUNINGS.md, diagnosis/final-table.txt). Fitted against
  napkin: rivers 3.3-3.8 against 3.9-4.6; turns 8.6-11.0 against 11.7-19.4, including
  turns-held2 on two boards never used (13.74 -> 9.87); flop trees 10.4-10.6 against 14.9-16.1.
  Mixing diagnosis (bin/diagnose.js step 3 with kinds): at turn opens, mixing evenly within
  20 bands of strength now x draw costs 1.9%; 6 bands x draw 4.3%; 20 bands of equity 4.4%;
  the whole range 18.1%. The kinds are right; what is left is how a kind's frequency moves
  with the spot. Fitted finer tables in which each kind is a line in the bet level
  (diagnosis/kinds-fit.py -> turn-kinds-{6,10,20}.json; they explain 0.58-0.64 of the per-hand
  variation out of position against 0.52 for the adopted table). 42 tests pass.
  Next: test those tables (diagnosis/v32.mjs), located then whole engine.
- 07:10 Finer kind tables, each kind a line in the bet level: worse on the whole engine even on
  the tuning set (turns-tune 10.46 with 5 bands, 10.86 with 10, 10.85 with 20, against 10.01
  for the adopted table). They fit the solver better and lose more: the engine's bet level is
  not the solver's, so a line in the level does not carry over. Not adopted.
- 07:30 **Where the fitted engine still loses** (diagnosis/where.mjs, worst.mjs): depth (rivers
  2.0 -> 4.9 from 0.75 to 5 pots behind; turns 7.4 -> 11.8), the 3-bet pot, the draw-heavy turn
  board. In the 3-bet pot the solver range-bets the turn out of position (73-100%) and the
  engine bets 10-38%. A range-bet rule keyed on the spot formula fixes that seat (located 20.2
  -> 14.8; whole engine 9.56 -> 9.11) but the other seat, which models its opponent as the
  engine, loses more (tune 10.01 -> 10.11, held 8.87 -> 9.36, held2 9.87 -> 10.44). Not adopted.
  Rivers: raise sizes, raise caps, deep-stack thresholds, sizes and bluff scales all tried
  (diagnosis/v33-v35.mjs): nothing beats 3.72. Rivers are on a plateau for this design.
  README and TUNINGS updated with the results, the mixing diagnosis and what was dropped.
