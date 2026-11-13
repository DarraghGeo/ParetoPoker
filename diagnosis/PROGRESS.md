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

