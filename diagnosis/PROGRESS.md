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
