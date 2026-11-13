# ParetoPoker

A small Node.js engine that plays heads-up postflop poker at game-theory frequencies without
solving anything, and a harness that scores it exactly against
[postflop-solver](https://github.com/b-inary/postflop-solver).

The engine gets the *how often* right from indifference math: how often to bet, what share of a
bet is bluffs, how often to continue against a bet or raise, and how much of that is a raise.
It does not get the *which hands* right. Hands are ranked by equity and dealt into those
frequencies, which is reasonable but is not what a solver would choose, so it loses to one.

## Setup

```bash
npm install
npm run build:solver   # builds the Rust bridge to postflop-solver (needs cargo)
npm test
npm run play           # engine vs solver on a river spot
```

## The engine

`ParetoEngine` has one method per situation. Each takes the price of the spot and returns
frequencies. It never looks at cards.

```js
import { ParetoEngine } from './src/index.js';

const engine = new ParetoEngine({ maxRaises: 3 });

// Pot was 100, villain bet 50, we have 500 behind
engine.inPositionFacingBet({ street: 'river', pot: 150, toCall: 50, stack: 500 });
// { fold: 0.333, call: 0.565, raise: 0.102, alpha: 0.333, mdf: 0.667, potOdds: 0.25,
//   sizes: [{ to: 125, value: 0.08, bluff: 0.022, bluffShare: 0.214, ... }] }
```

| Method | Situation | Returns |
|---|---|---|
| `outOfPositionOpen(spot)` | first to act | `check`, `bet`, `sizes` |
| `inPositionFacingCheck(spot)` | checked to | `check`, `bet`, `sizes` |
| `inPositionFacingBet(spot)`, `outOfPositionFacingBet(spot)` | facing a bet | `fold`, `call`, `raise`, `sizes` |
| `inPositionFacingRaise(spot)`, `outOfPositionFacingRaise(spot)` | facing a raise or re-raise | `fold`, `call`, `raise`, `sizes` |
| `respond(position, spot)` | picks one of the above | |

A spot is `{ street, pot, stack, toCall, invested, facing, raises, options }`. `pot` is every
chip in the middle; `invested` is what hero already put in on this street; `facing` is the
chips the opponent added with their last action (needed for a 3-bet or later; otherwise it is
worked out); `raises` is the number of raises so far on the street; `options` are the sizes
hero may use, as street totals.

### The math

- **Defence.** A wager that risks `r` to win what is already in the middle, `P`, breaks even
  as a pure bluff when it folds out `alpha = r / (r + P)`. The engine continues `1 - alpha`
  (the minimum defence frequency), for bets and raises alike.
- **Bluffs.** A bet or raise that leaves the opponent needing `potOdds` equity to call is
  bluffs for exactly `potOdds` of its range on the river, which makes a bluff catcher's call
  worth zero. On the flop and turn a called bluff can bet again, so the value share is
  multiplied by `(1 + s) / (1 + 2s)` for each later bet of pot fraction `s` (`barrelSize`).
- **Bet frequency.** Value hands times `1 / (1 - bluffShare)`. The share of the range that is
  value is an input (`{ valueShare }`); `RangeStrategist` works it out from equity.
- **Raises.** Come out of the continuing range, each size balanced with its own bluffs, and
  stop at `maxRaises` per street.
- **Sizing.** By default the option nearest the geometric size, the bet that gets stacks in
  by the river with equal pot fractions. Also `'smallest'`, `'largest'`, `'mixed'` or a function.

### Settings

`betSizes`, `raiseSizes` (used when a spot has no `options`), `maxRaises`, `sizing`,
`raiseFrequency` (fixes raises as a share of the continuing range), `betValueShare`,
`raiseValueShare`, `barrelSize`, `multiStreetBluffs`. Any of them can be set per position:

```js
new ParetoEngine({ maxRaises: 2, raiseSizes: [3, 'allin'], inPosition: { sizing: 'largest' } });
```

## Choosing hands

`RangeStrategist` turns the frequencies into a strategy for every combo, given both ranges
and the board. Equity comes from `Equity` (exact, built on
[poker-bitvaljs](https://www.npmjs.com/package/poker-bitvaljs)); ranges are parsed with
[poker-rangeman](https://www.npmjs.com/package/poker-rangeman).

```js
import { Range, RangeStrategist, cards } from './src/index.js';

const board = cards.parseCards('Td9d6hQc7s');
const node = {
  position: 'ip',
  spot: { street: 'river', pot: 175, toCall: 75, stack: 500 },
  board,
  hero: Range.from('QQ-22,AQs-A2s,KJo+').without(board).weights,
  villain: Range.from('66+,A8s+,AJo+,KQo').without(board).weights,
  actions: [{ type: 'fold' }, { type: 'call' }, { type: 'raise', to: 190 }],
};
const strategist = new RangeStrategist();
strategist.decide(node);              // { frequencies, strategy[action][combo] }
strategist.act(node, 'KsJs').sample(); // one action for one holding
```

By default hands are chosen on equity alone: the hands with the most equity (ahead of the
range that continues) bet or raise for value, the next best call, the hands with the least
equity bluff, the rest check or fold. Hands on a boundary are mixed so the totals equal the
engine's frequencies. `played` in the result is the share of the range that ends up taking
each action.

### Sending it your own hands

The hand selector is the connector for this. Pass a `selector` with any of three methods;
each returns the hands that may take that role, and the engine's frequencies are dealt out
over them. Whatever you leave out (or return `null` for) is still chosen on equity.

```js
const strategist = new RangeStrategist({
  selector: {
    // Hands that may bet or raise this size for value
    value: (context, wager) => (context.street === 'river' ? 'KJs,J8s,TT-99' : null),
    // Hands that may call
    call: (context) => ['QQ', 'JJ', 'AQs', '88:0.5'],
    // Hands that may bluff with this size
    bluff: (context, wager) => 'A5s-A2s,K5s',
  },
});
```

An answer can be:

| Form | Meaning |
|---|---|
| `'QQ+,AKs,JTs:0.5'` | Range notation. A weight caps how often the hand takes the role. Taken in equity order. |
| `{ AhKh: 1, QsQd: 0.5 }` | The same, as an object of weights. |
| `['AhKh', 'QQ', '76s']` | A priority list: earlier entries are taken first. |
| `Float64Array(1326)` | A score per combo id: higher is taken first, `NaN` is not a candidate. |
| `{ hands, share }` | Any of the above, plus the share of the range that takes the role, instead of the engine's number. |

How the frequencies follow from the hands:

- **Value**: every candidate is value, so the candidates set the value frequency. The engine
  then adds the bluffs that much value supports at the size.
- **Calls**: the engine's call frequency is taken from the front of the candidates. If there
  are too few, the range calls less.
- **Bluffs**: the engine's bluff frequency is taken from the front of the candidates.

`context` describes the decision: `position`, `street`, `spot`, `board`, `actions`, `facing`,
`potOdds`, `hero` and `villain` (weights per combo id), `frequencies` (the engine's answer,
available in `call` and `bluff`), and equity helpers: `strength` (each combo's equity against
villain's range), `villainStrength`, `equityAgainst(range)`, `continuingRange(wager)` and
`equityVersusContinuing(wager)`. `wager` is the size being filled: `to`, `add`, `potOdds`,
`mdf`, `bluffShare`. Combo ids and names convert with `cards.parseCombo('AhKd')` and
`cards.comboName(id)`.

### The selectors

A selector is its own object, passed to the strategist. Two are included:

```js
import { EquitySelector, NapkinSelector, RangeStrategist } from './src/index.js';

new RangeStrategist({ engine, selector: new EquitySelector() }); // the default
new RangeStrategist({ engine, selector: new NapkinSelector() });
```

**`NapkinSelector`** follows the napkinpoker hand-selection guide (issue #271):

| Role | Rule |
|---|---|
| Value bets | Hands that beat more than half of his continues. Flat value first (equity that holds against his strong hands), then value that does not block his calls. Out of position on the river, thin value (50-70% against his range) checks, and so do some of the nuts, taken from the very top, as a sixth of the value that checks. |
| River bluffs | Air first (no pair, under 20% equity), the hands that block his calls ahead; then the weakest of the rest. |
| Turn bluffs | Six roles (air, overcards, made, gutshot, draw, nut draw), each ordered by its own mark. Draws go first when he is ahead in range or stacks are deep, pure bluffs when we are ahead or stacks are shallow. |
| Flop bluffs | Draws first, then blockers to his strong hands, pairs last. When we are ahead in range or stacks are shallow, the blockers go ahead of the draws, as on the turn. |
| River calls | Hands that beat half his value, then bluff-catchers (beat half his bluffs) by the marks below. Hands that beat neither fold. |
| Turn and flop calls | By class: draws (when a hit can collect another bet), top pair or better, weaker pairs by equity, high cards last. On the flop, board pairs and pocket pairs above the bottom card move up with top pair. |
| Bluff-catcher marks | Margin of equity over the price, equity against his value, blocking his value, and on the turn the rivers that help against those that hurt. |
| River raises | Newman: 80% against his betting range for half a pot, 90% for a pot, 97% for three pots. Bluff raises are the weakest hands. |
| Turn and flop raises | Value by equity against his value; bluff raises are draws first. |

Three things in it are not in the guide, and are marked in the code:

- The weights that combine the marks. The bluff-catcher weights are each mark's gap between
  must-calls and must-folds in the guide's table; the rest are in `NapkinSelector.WEIGHTS`.
- `priorStrength`: one more bluff-catcher mark, equity against the range he started the hand
  with. Without it the engine called a river raise with ace high and folded straights, because
  both "only beat his bluffs" in its model of his range. `new NapkinSelector({ priorStrength: 0 })`
  uses the guide's marks alone.
- A draw only calls ahead of made hands when at least a pot is left behind after the call
  (`drawBehind`): the guide's reason is that a hit collects his next bet.
- Flop bluffs use the turn's rule for which roles go first. The guide says draws first on the
  flop; with shallow stacks that cost up to 12% of the pot when exploited.
- Bluff raises fall back to the weakest hands when the draws run out, so the raise keeps the
  engine's frequency.

Not implemented: "avoid hands that leave him raises" and implied odds as a mark (both need a
model of his raising range), and the order inside the made role, which the guide lists as open.

Loss when fully exploited, as a share of the pot, over 4 rivers and 4 turns, both seats
(bets 33%, 75%, 150% pot, 2.5x raises, stack 2.5x pot, one pair of ranges):

| Selector | Rivers | Turns |
|---|---|---|
| `EquitySelector` | 10.7% | 26.1% |
| `NapkinSelector` | 6.7% | 23.8% |
| `NapkinSelector({ priorStrength: 0 })` | 15.2% | 25.2% |

Against the solver's equilibrium the two are level: 1.4% and 1.5% on rivers, 3.5% and 3.4% on
turns. On one flop tree (`Td9d6h`, one bet size, stack 1.5x pot) equity loses 27.0% out of
position and 26.6% in position when exploited, and Napkin 26.4% and 28.4%.
`node bin/play.js --selector napkin` runs one spot.

`EquitySelector` takes the two equity settings, which can also be passed straight to
`RangeStrategist`: `valueThreshold` (default 0.5) and `callFloor` (default 0.5: a
hand needs half the pot odds in equity to count as a bluff catcher). The same selector is
used when playing the solver: `new SolverMatch(game, { strategist })`.

## Against the solver

`SolverMatch` writes the engine's strategy into the solver's game tree (node locking) and
reads back exact expected values, so there is no sampling noise:

```js
import { SolverMatch } from './src/index.js';

const sizes = { bet: '33%,75%,150%', raise: '2.5x' };
const result = await new SolverMatch({
  oopRange: '66+,A8s+,AJo+,KQo', ipRange: 'QQ-22,AQs-A2s,KJo+',
  board: 'Td9d6hQc7s', pot: 100, stack: 200,
  betSizes: { river: { oop: sizes, ip: sizes } },
}).play('ip');
// result.ev   { gto, versusGto, exploited }   in chips
// result.loss { versusGto, exploited }         as a share of the pot
// result.lines  engine and solver frequencies on the first decisions
```

- `gto`: both players at equilibrium.
- `versusGto`: the engine against the solver's equilibrium strategy.
- `exploited`: the engine against the solver's best response to it, the worst case.

Bet sizes use postflop-solver's syntax (`60%`, `2.5x`, `100c`, `e` geometric, `a` all-in).
`node bin/play.js` takes `--board --oop --ip --pot --stack --hero --bet --raise
--max-raises --sizing --selector --iterations`.

### What to expect

In the textbook nuts-or-air game (AA and QQ against KK, one pot-sized bet) the engine matches
the solver in both seats: zero loss against equilibrium and zero when exploited. That is a test.

With real ranges, default settings, bets of 33%, 75% and 150% pot and 2.5x raises:

| Spot | Loss vs solver's GTO | Loss when fully exploited |
|---|---|---|
| River `Td9d6hQc7s`, stack 2x pot | 0.5% (IP), 2.4% (OOP) of the pot | 7.1%, 5.9% |
| Turn `Td9d6hQc`, bets 50%/100%, stack 3x pot | 2.3%, 3.2% | 21.3%, 19.6% |
| Average of 4 rivers and 2 turns, both seats, stack 2.5x pot | about 2% | about 17% |

The gap is hand selection, as intended: the frequencies hold, but a best-responding solver
finds the hands the engine puts in the wrong bucket (it traps the engine's thin value bets
and folds exactly the hands the engine's bluffs beat).

### Limits

- The engine tracks the opponent's range by assuming they play the engine's own strategy.
- Flop trees work but grow fast: one bet size and one raise size takes about 15 seconds.
- No rake, heads-up only, postflop only.
- postflop-solver is AGPL-3.0 and no longer maintained by its author; `solver-bridge` links it
  and is AGPL-3.0 as well. The JavaScript only talks to it over a pipe.
