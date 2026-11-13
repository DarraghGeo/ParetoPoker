# Pareto

Explains why hands do what they do in a solved poker spot.

A solver tells you that a hand bets 46% of the time. Pareto says what stands behind that: what
the hand is, what each action is worth to it against the strategy he plays, whether a bet earns
through his folds or does not need them, which cards a call is for, and which actions are worth
the same.

It says only what has been proven. A **number** is a fact of the solution on screen and is worded
as that. A **conclusion** is drawn only where it has held, without exception, in two far finer
solves of every spot it was tried on. [`research/proof/PROOF.md`](research/proof/PROOF.md) has the
proofs, the figures, and the list of what is not proven and so not said.

It sits on top of [poker-flopsolve](https://www.npmjs.com/package/poker-flopsolve), which does
the solving, and uses [poker-rangeman](https://www.npmjs.com/package/poker-rangeman) to describe
the spot. It runs in the browser.

Spots can start on the flop, the turn or the river, and are solved and walked street by street (choose the card dealt; re-solve a street on its own with more bet sizes). The reasons are written for river decisions only for now: earlier streets show the strategy without them.

## The page

`docs/` is the built page. To publish it: repository Settings, Pages, deploy from a branch,
folder `/docs`.

The page opens on a choice between the two:

- **Study** (`study.html`): a board of three, four or five cards, two ranges and a bet menu are
  solved in the browser. Walk the line, pick a hand, read what it does and why. The pen edits the
  ranges; each save is a version you can slide back to.
  A spot too big to solve whole in a browser (most flops with several sizes, raises and all-in) is
  offered as Solve (Lite): the first street's betting as given, one bet size on the later ones.
- **Train** (`train.html`): questions on boards dealt at random, with the ranges, pot and bet sizes set up in
  Study. Who has the range advantage, who has the nut advantage (hands with 90% equity or more),
  the biggest bet or raise the range takes, and what a given hand can do. The two ranges sit side
  by side, hero in ink and villain faded, or as the two equity curves. Settings choose the kinds
  of question and the streets; each shows its last five days played. The day's score opens the
  last questions with the answer given, the right one and why. A question whose answer is too
  close to call is not asked.
  A flop is solved with poker-flopsolve's lite preset (`litePreset`): the flop's betting as set up,
  one bet size on the turn and river, stopped when the first decisions stop moving.
  Solves run in the background until three boards wait behind the one on screen. A board is asked
  about from several positions, and with nothing waiting it is gone round again with other hands.
  Every third flop is dealt new; the two after it are each one card away from the flop before, and
  start from its solve (`warmStart` with `warmCards`), which settles in about half the iterations.

```bash
npm install
npm run build      # web/ -> docs/
npm test
```

## As a library

```js
import * as solver from 'poker-flopsolve';
import { treeOf } from './src/index.js'; // not on npm: use it from this repository
import { study, measure, tolerance, explainStreet } from './src/explain/street.js';

const spot = solver.defineSpot({ board: 'Td 9d 6h Qc', pot: 100, stack: 200, oop: '66+,AJs+,KQs,JTs', ip: 'QQ-22,AQs-A2s,KJs+', betSizes: [[0.33, 0.75]] });
const run = solver.createRun(spot, {});
while (run.exploitabilityPercent() > 0.02) run.step(20);   // conclusions are proven for turns solved this finely
const solution = run.snapshot();
const nodes = treeOf(solver, spot);                         // the betting tree as plain objects

const decision = study(solver, solution, nodes, 0);         // one decision, studied once
const gates = tolerance('turn', run.exploitabilityPercent(), decision.lineReach); // null where nothing is proven
const hand = measure(decision, 1234);                        // one hand (a combination index), read off it
const told = explainStreet(decision, hand, gates);

told.line;     // what the hand is, and its equity
told.reasons;  // [{ id, text }]: numbers of this solution, and the conclusions that passed their gates
told.claims;   // the same, as data: what each sentence commits to
```

Actions are named in shorthand everywhere: `X` check, `C` call, `F` fold, `B33` a bet of 33% of the
pot, `R2.5x` a raise to 2.5 times the bet faced, `All-in`.

### What is said

| | sort | |
|---|---|---|
| what the hand is: pair names, draws with their outs | exact | counted card by card |
| equity against the range he has here; how often he folds; how often the hand is ahead when called | number | a fact of this solution |
| an action the hand does not take is **worse** | conclusion | the amount is this solution's; that it is worse carries over |
| two actions the hand takes are worth **the same** | conclusion | |
| a bet **earns through his folds**, or **does not depend on them** | conclusion | the times he continues, set against the passive action |
| a call is **for the cards that improve it** | conclusion | flop and turn |

Where conclusions are proven: rivers solved to 0.01% of the pot and turns to 0.02%, on lines at
least half of each range takes. Elsewhere the page gives the numbers and says they are only that.
Flop spots are solved and walked; their conclusions are on trial (see the proof file).

## Where this came from

`research/` holds the earlier work this grew out of: an engine that played from indifference
maths alone, the tests against a solver that showed where that stops working, and the findings
the explainer is built on (a river hand is its strength; must / may / can't describes a hand,
not a range). `research/TUNINGS.md` and `research/diagnosis/HAND-SELECTION-DIAGNOSIS.md` are
the record. Nothing in `src/` depends on it.

## Layout

| | |
|---|---|
| `src/explain/` | `street.js` (measure a decision, claims, wording), `account.js` and `best.js` (what actions are worth), `features.js` (what a hand is), `profile.js` (the spot sentence) |
| `research/proof/` | the proofs and their results; `PROOF.md` is written from them |
| `src/solver/flopsolve.js` | reads a poker-flopsolve solution into the explainer's shape |
| `src/warp/` | the curve game: two ranges from one drawn curve, solved in milliseconds |
| `web/` | the page's source; `scripts/build.mjs` bundles it into `docs/` |
| `research/` | the earlier engine, tools and records |
