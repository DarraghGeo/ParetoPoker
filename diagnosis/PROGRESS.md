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
