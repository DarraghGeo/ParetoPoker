# Pareto

Explains why hands do what they do in a solved poker spot.

A solver tells you that a hand bets 46% of the time. Pareto says why: whether the choice
matters to the hand at all, what it beats, what the price is, what the rest of its strength
does, and whether its cards change anything. Every sentence carries the number behind it and
where that number comes from.

It sits on top of [poker-flopsolve](https://www.npmjs.com/package/poker-flopsolve), which does
the solving, and uses [poker-rangeman](https://www.npmjs.com/package/poker-rangeman) to describe
the spot. It runs in the browser.

River decisions only for now.

## The page

`docs/` is the built page. To publish it: repository Settings, Pages, deploy from a branch,
folder `/docs`.

- **Spot**: a board, two ranges and a bet menu are solved in the browser. Walk the line, pick a
  hand, read why. "Why" opens the full list of reasons.
- **Warp**: no cards. Drag the out-of-position player's equity curve and the game is solved
  again on the two curves, so you can see what a shape of range does.

```bash
npm install
npm run build      # web/ -> docs/
npm test
```

## As a library

```js
import * as solver from 'poker-flopsolve';
import { treeOf, decisionAt, survey, explain } from './src/index.js'; // not on npm: use it from this repository

const spot = solver.defineSpot({ board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, oop: '66+,AJs+', ip: 'QQ-22,AQs-A2s', betSizes: [[0.33, 0.75]] });
const run = solver.createRun(spot, {});
run.step(400);
const solution = run.snapshot();

const nodes = treeOf(solver, spot);                    // the betting tree as plain objects
const decision = decisionAt(solver, solution, nodes, 0); // one decision: every hand's strategy and values
const told = explain(survey(decision), 'AsTs');

told.status;   // 'forced' | 'optional'
told.line;     // one sentence
told.reasons;  // [{ id, basis, text, short }]
```

`line` is the short answer and `reasons` the full one; show either.

### What a reason is

| `basis` | where the number comes from |
|---|---|
| `solver` | read from the solution: what an action is worth to the hand, what he does next |
| `count` | counted from the two ranges: what the hand beats, what its cards remove |
| `formula` | the indifference maths: the price of a call, the folds a bluff needs |
| `spot` | poker-rangeman's comparison of the two ranges (page only) |

The reasons, in the order they are tried:

1. **Forced or optional.** An action that gives up more than 0.5% of the pot is a mistake for
   the hand. One acceptable action: forced. Several: the mix is the range's choice.
2. **The price** (facing a bet). What the hand beats against what a call needs.
3. **Value, bluff or neither** (betting or raising). What it beats of the hands that continue;
   what it would win by checking; the folds the size needs; the bluffs the price allows.
4. **Showdown or protection** (checking). A bet folds out what it beats; or it is strong enough
   to bet and checks so that a check is not always weak.
5. **Its strength level.** Hands of exactly its strength are interchangeable on the river.
   When it plays differently from them, either its cards remove different parts of his range
   (blockers), or they do not and the split between them is arbitrary.

## Where this came from

`research/` holds the earlier work this grew out of: an engine that played from indifference
maths alone, the tests against a solver that showed where that stops working, and the findings
the explainer is built on (a river hand is its strength; must / may / can't describes a hand,
not a range). `research/TUNINGS.md` and `research/diagnosis/HAND-SELECTION-DIAGNOSIS.md` are
the record. Nothing in `src/` depends on it.

## Layout

| | |
|---|---|
| `src/explain/` | the reasons (`river.js`) and the spot sentence (`profile.js`) |
| `src/solver/flopsolve.js` | reads a poker-flopsolve solution into the explainer's shape |
| `src/warp/` | the curve game: two ranges from one drawn curve, solved in milliseconds |
| `web/` | the page's source; `scripts/build.mjs` bundles it into `docs/` |
| `research/` | the earlier engine, tools and records |
