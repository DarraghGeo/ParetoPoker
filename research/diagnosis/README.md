# diagnosis/

Working files of the diagnosis runs. `PROGRESS.md` is the log; `../TUNINGS.md` is the record of
what was adopted and what was not.

## Scripts

| Script | What it does |
|---|---|
| `try.mjs <set> <variants.mjs> [setting]` | Loss to the best response for each variant of the parts, on the whole engine or at one kind of decision (`open`, `bet`, `raise`, optionally `turn:open` etc.). |
| `worst.mjs` | The same for one variant, by range pair and stack depth, with the worst spots. |
| `where.mjs <set> <preset> <tuning rows>` | Which kinds of spot a preset loses most in. |
| `delta.mjs`, `bygroup.mjs` | How the gain of one variant over another depends on the spot (range and nut advantage; pair, depth, board). |
| `lines.mjs <set> <seat> <count>` | The engine's and the solver's frequencies at the first decisions of some spots. |
| `fit.mjs <tuning rows>` | Least-squares fits of the solver's departures from the fundamentals. |
| `curves.mjs <tuning rows>` | The solver's mixing curve over hand strength, 20 slices of the range. |
| `open-hands.mjs`, `open-table.mjs` | Every hand at opening decisions with its kind; the solver's bet frequency by kind and how much a kind table explains. |
| `facing-hands.mjs` | The same for facing a first bet. |
| `kinds-fit.py` | Fits kind tables in which each kind's frequency is a line in the bet level. |

The tools in `../bin` (`locate.js`, `diagnose-tuning.js`, `diagnose.js`, `decompose.js`,
`interchange.js`, `compare.js`) are the general ones.

## Data

`tuning-*.json` (rows of `bin/diagnose-tuning.js`), `locate-*.{txt,json}`, `open-hands-turns-tune.json`,
`facing-hands-turns-tune.json`, `turn-kinds-*.json`, `rivers.json` and `turns.json` (the hand
selection diagnosis), `final-table.txt` (every preset on every set).

## Variant files

`v1.mjs` to `v37.mjs` are the experiments in the order they were run; `PROGRESS.md` and
`TUNINGS.md` say what each showed. The early ones build their parts by hand and reflect the
code as it was then: some no longer run unchanged. `v11.mjs` is the three presets.
