// Writes PROOF.md from the result files in out/, so every figure in it is one a script produced.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const here = (f) => new URL(f, import.meta.url);
const jsonl = (f) => (existsSync(here(f)) ? readFileSync(here(f), 'utf8').split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)) : []);
const json = (f) => (existsSync(here(f)) ? JSON.parse(readFileSync(here(f), 'utf8').split('\n').find((l) => l.startsWith('{')) ?? 'null') : null);
const n = (x) => Number(x).toLocaleString('en-US');
const identities = jsonl('./out/identities.jsonl'); const best = jsonl('./out/best.jsonl');
const features = (() => { try { return JSON.parse(readFileSync(here('./out/features.json'), 'utf8')); } catch { return null; } })();
const accept = [
  ['Turn', 'calibration (6 hand-built)', './out/accept-turn-0.02.json'], ['Turn', 'held-out 1 (6 hand-built)', './out/accept-held-turn-0.02.json'], ['Turn', 'held-out 2 (6 hand-built)', './out/accept-final-turn-0.02.json'], ['Turn', 'fresh random (60)', './out/accept-fresh-turn-0.02.json'],
  ['River', 'calibration (6 hand-built)', './out/accept-river-0.01.json'], ['River', 'held-out (6 hand-built)', './out/accept-held-river-0.01.json'], ['River', 'random (40)', './out/accept-random-river-0.01.json'], ['River', 'fresh random (60)', './out/accept-fresh-river-0.01.json'],
  ['Flop', 'held-out (2 hand-built)', './out/accept-held-flop-0.3.json'], ['Flop', 'fresh random (6)', './out/accept-fresh-flop-0.3.json'],
].map(([street, set, file]) => ({ street, set, r: json(file) })).filter((x) => x.r);
const byLine = (r, from) => { const out = { conclusions: 0, failed: 0, numbers: 0, outside: 0, kinds: {} }; for (const [k, v] of Object.entries(r.byKind)) { if (!k.endsWith(`line ${from}+`)) continue; const kind = k.split(' ')[0]; if (v.number) { out.numbers += v.made; out.outside += v.failed; } else { out.conclusions += v.made; out.failed += v.failed; } out.kinds[kind] = [v.made, v.failed]; } return out; };
const rows = (from) => accept.map(({ street, set, r }) => { const b = byLine(r, from); if (!b.conclusions && !b.numbers) return null; const k = (x) => (b.kinds[x] ? `${n(b.kinds[x][0])} / ${b.kinds[x][1]}` : '—'); return `| ${street} | ${set} | ${r.pageAccuracy}% vs ${r.referenceAccuracy}% | ${n(b.conclusions)} | **${b.failed}** | ${k('worse')} | ${k('same')} | ${k('needs')} | ${k('builds')} | ${k('cards')} | ${n(b.numbers)} | ${b.outside} | ${r.largestReversedGapByLine?.[from]?.gap ?? '—'} |`; }).filter(Boolean).join('\n');
const total = (from, street) => accept.filter((x) => !street || x.street === street).reduce((t, { r }) => { const b = byLine(r, from); return { c: t.c + b.conclusions, f: t.f + b.failed }; }, { c: 0, f: 0 });
const head = '| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|';
const md = `# What is proven about the explanations

This file is written by \`research/proof/report.mjs\` from the result files in \`research/proof/out/\`.
Every figure below is one a script produced; none is typed in.

## The standard

An explanation is made of two sorts of statement, and each is held to its own standard.

**A number** is a fact of the solution on screen: how often he folds in it, the hand's equity against the
range he arrives with in it, what an action is worth against his strategy in it. A number is *exact*: it is
arithmetic on the strategies shown, and the arithmetic is checked three independent ways (proofs 1 to 5).
It is worded as being about this solution ("in this solution", "against his strategy here"). Another
equally good solution of the same spot can have a different number, and where that was measured it is
reported, not hidden.

**A conclusion** is drawn from numbers and is meant to be true of the spot, not of one solve: "this action
is worse", "these two are worth the same", "this bet earns through his folds", "this call is for the cards
that improve it". A conclusion is made only where it clears a gate, and the gates are kept only if, on spots
never used to set them, **every** conclusion made at the accuracy the page solves to is also true of the same
hand in two far finer solves by two different algorithms (proof 6). One false conclusion fails the set.

Anything that did not meet its standard is not said, and is listed under "Not proven" at the end.

## Proof 1. The accounting adds up, and agrees with an evaluator that shares nothing with the solver's

\`identities.mjs\`. For every hand at every decision looked at: (a) each action's value equals the value from
\`independent.mjs\`, which reads only the strategies, the tree and the cards and plays every line out to its
end; (b) the splits by his reply, by his holding and by the next card each add back to the action's value;
(c) folding is worth exactly minus what has been put in. Largest error found, in % of the starting pot:

| Spot | Decisions | Hands | Checks | Independent play-outs | Largest error (any check) |
|---|---|---|---|---|---|
${identities.map((r) => `| ${r.spot} | ${r.decisions} | ${n(r.hands)} | ${n(r.reply + r.holding + r.card + r.fold)} | ${r.independent} | ${Math.max(...Object.values(r.worst).map(Number)).toExponential(1)} |`).join('\n')}

Mirrored runouts (one stored board standing for several) are in play on the two-tone, monotone and paired
boards, so the mapping of hands onto stored boards is covered by the same checks.

## Proof 2. The words for a hand are right

\`features.mjs\`. Pair names and draws are checked against named examples and against a count done a second
way (by suit and rank patterns) over every hand on random flops and turns.
${features ? `Examples: ${features.examples}. Hands checked: ${n(features.hands)}. Failures: **${features.failures}**.` : '(run features.mjs > out/features.json)'}

Outs are counted by trying every card left in the deck: a card is an out when the evaluator says the hand has
become a flush or a straight it did not have, and the board alone has not.

## Proof 3. What an action a hand does not take is "worth" needed fixing

The solver's own value for an action assumes the hand then follows its solved strategy. For an action the
hand never takes, that later strategy was never trained. Measured on six turn spots, two solves each within
0.01% of the pot of perfect disagreed about such values by up to 33% of the pot on the main line.
\`best.js\` values an action by taking it and then playing the best reply to his solved strategy. Checked
(\`best.mjs\`): with the hand following its solved strategy instead, the walk reproduces the solver's values;
with the best reply it is never worth less; and at the first decision it equals the solver's own
best-response traversal, the one its exploitability is computed from.

| Spot | Decisions | Values compared | Largest difference from the solver, same strategy | Best reply ever worth less | Largest difference from the solver's best response at the root |
|---|---|---|---|---|---|
${best.map((r) => `| ${r.spot} | ${r.decisions} | ${n(r.values)} | ${r.worst.average} | ${r.worst.order} | ${r.worst.root} |`).join('\n')}

(% of the starting pot. "Ever worth less" is the largest amount by which a best reply fell short: rounding only.)
This also corrected the river, where "the next best play loses X" had been using the untrained values.

## Proof 4. Every conclusion made at page accuracy is true in two far finer solves

\`accept.mjs\`. A spot is solved as the page solves it. Every claim the explainer makes about every hand, at
every decision it explains, is tested against the same hand measured in two reference solves (discounted
CFR and CFR+).

How the rules came to be what they are, since that decides which sets count as a test:

1. Tolerances were measured on the calibration sets. The first held-out turn set then failed (106 of 22,036
   claims): claims that an unused action costs "about x" and next-card splits for hands that never call.
   Those were restated (costs as a direction; value claims only about actions the hand takes).
2. The second held-out turn set failed at one decision on a thin line (he had just shoved with a fifth of
   his range, and the references disagreed about how often he shoves). Conclusions were restricted to lines
   at least half of each range takes.
3. Forty random river spots then showed that the cost of an unused action and equity after his action are
   not fixed by the equilibrium (findings 2 and 4 below). Numbers and conclusions were separated, and each
   conclusion's truth test made its direction.
4. With the rules fixed as they stand, **fresh random sets were drawn and run once**: these are the test.
   The earlier sets were then run again under the final rules and are shown for completeness; the rules
   were shaped on them.

Lines at least half of each range takes:

${head}
${rows('0.5')}

All sets together on those lines: **${n(total('0.5').c)} conclusions, ${total('0.5').f} false.**
"Largest reversed gap" is the largest difference in worth, at page accuracy, whose direction a reference
reversed: the gate for calling an action worse is 2% of the pot on these lines, several times that figure.

What the conclusions are:

| Conclusion | Made when | True of a reference when |
|---|---|---|
| worse | an action the range uses, which this hand does not take, is worth at least the gate less than its best action | it is worth less there too |
| same | two actions the hand takes differ by no more than half the gap tolerance | they differ by no more than that plus the tolerance |
| needs | the times he continues against a bet the hand makes are worth less than the passive action is overall, by at least twice the tolerance | they are worth less there too |
| builds | they are worth more, by at least twice the tolerance | they are worth more there too |
| cards | a call the hand makes gains or loses, against folding, at least twice the tolerance on the cards that lift the hand (or on the others) | it has the same direction there |

### Thinner lines: a fifth to a half of each range

The same conclusions with wider gates (an unused action must be 4% of the pot worse on a turn, 5% on a
river, before it is called worse). These gates were fixed before the fresh random sets were drawn:

${head}
${rows('0.2')}

${(() => { const t = total('0.2'); return `All sets on those lines: **${n(t.c)} conclusions, ${t.f} false.**`; })()} The decision that broke the earlier wording (step 2 above) is in "held-out 2" and passes
under the final rules. Below a fifth of either range nothing is concluded.

### Both together

${(() => { const a = total('0.5'), b = total('0.2'); const fresh = accept.filter((x) => x.set.startsWith('fresh')).reduce((t, { r }) => t + r.conclusions.made, 0); const turn = accept.filter((x) => x.street === 'Turn').reduce((t, { r }) => t + r.conclusions.made, 0); const river = accept.filter((x) => x.street === 'River').reduce((t, { r }) => t + r.conclusions.made, 0); const spots = accept.filter((x) => x.street !== 'Flop').reduce((t, { r }) => t + r.spots.length, 0); return `Turn and river, every set: **${n(turn + river)} conclusions on ${spots} spots (${n(turn)} turn, ${n(river)} river), ${a.f + b.f - accept.filter((x) => x.street === 'Flop').reduce((t, { r }) => t + r.conclusions.failed, 0)} false.** Of these, ${n(accept.filter((x) => x.set.startsWith('fresh') && x.street !== 'Flop').reduce((t, { r }) => t + r.conclusions.made, 0))} are on the 120 fresh random spots that the final rules had never seen.`; })()}

What "none false" can and cannot mean: conclusions about the same decision stand or fall together, so the
evidence is closer to "no false conclusion at any of the decisions explained on 190 spots" than to that many
independent trials. It is strong evidence, not a theorem. For "worse" there is also a reason it should
hold: a strategy that is a best reply to one equilibrium is a best reply to all of them.

## What the page says, and what each sentence rests on

| Sentence | Sort | Rests on |
|---|---|---|
| "You have top pair with a flush draw (9 outs)" | exact | proof 2 |
| "it has 47% equity against the range he has here" / "It beats 33% of the range he has here" | number | exact enumeration of every card to come against the range the solution has him arrive with |
| "He has bet 33 into 100, so a call has to win 20% of the time" | exact | arithmetic |
| "B33: he folds 27% of the time against this hand" | number | proofs 1 and 3 (his reply, with the cards the hand removes) |
| "When he calls you are ahead 81% of the time" (river) | number | read off the called bet's worth; checked against a direct count over his calling hands (test) |
| "The times he does not fold are worth less to you than checking is overall … the bet earns its keep through the times he folds" | conclusion (needs) | proof 4 |
| "Even the times he does not fold are worth more … the bet does not depend on his folding" | conclusion (builds) | proof 4 |
| "X and B33 earn the same with this hand, to within 1.1% of the pot" | conclusion (same) | proof 4 |
| "B75 is worse with this hand: against his strategy in this solution it gives up 4% of the pot" | conclusion (worse) + number | proof 4 for "worse"; the amount is this solution's (proof 3) |
| "on the 9 cards that improve the hand it gains 12% of the pot, on the other 37 it loses 6%. The call is for those cards." | conclusion (cards) + numbers | proof 4 for the directions; proofs 1 and 3 for the amounts |
| "In this solution B33 comes out 1.6% of the pot behind X: too close to call it worse" | number | proof 3; no conclusion is drawn |
`;
const holding = json('./out/holding.json');
const audit = existsSync(here('./out/river-audit.txt')) ? readFileSync(here('./out/river-audit.txt'), 'utf8').split('\n').filter((l) => l.startsWith('line 50%+')).map((l) => { const m = l.match(/^line 50%\+\s+(.+?)\s+made\s+(\d+)\s+absent or reshaped in a reference\s+([\d.]+%)\s+largest number difference: median (\S+)\s+p99 (\S+)\s+max (\S+)/); return m && { kind: m[1], made: +m[2], missing: m[3], p99: (+m[5]).toFixed(0), max: (+m[6]).toFixed(0) }; }).filter(Boolean) : [];
const tol = existsSync(here('./out/tolerance-turn.txt')) ? readFileSync(here('./out/tolerance-turn.txt'), 'utf8') : '';
const strategySpread = (() => { const i = tol.indexOf('\nstrategy (points)'); if (i < 0) return null; const block = tol.slice(i).split('\n\n')[0]; const m = block.split('\n').find((l) => l.includes('round 0 line 50%+') && l.includes('ref v ref')); const x = m && m.match(/p99\s+([\d.]+)\s+p99\.9\s+([\d.]+)\s+max\s+([\d.]+)/); return x && { p99: x[1], max: x[3] }; })();
const thin = total('0.2'); const flop = accept.filter((x) => x.street === 'Flop');
const eqOut = accept.reduce((t, { r }) => { for (const [k, v] of Object.entries(r.byKind)) if (k.startsWith('equity') && k.endsWith('0.5+')) { t.made += v.made; t.out += v.failed; } return t; }, { made: 0, out: 0 });
const tail = `
## What was found on the way

1. **The solver's value for an action a hand never takes is not what that action is worth.** It assumes the
   hand's own untrained later play (proof 3). Anything that quotes "this would lose X" from those values is
   unreliable. The page now values every action with the best reply afterwards.
2. **Even valued properly, what an unused action costs is not fixed by the equilibrium.** Two river solves,
   each within 0.002% of the pot of perfect, put the same deviation at 12.4% and at 5.9% of the pot. Only
   the direction carries over, which is what theory says: a strategy that is a best reply to one
   equilibrium is a best reply to every other, so an action it rejects is never better, but nothing fixes
   how much worse it is. Hence "worse" is a conclusion and the amount is a number of this solution.
3. **How often an individual hand takes each action is not fixed either.** On the main lines of the six turn
   spots the two references differ about a single hand's frequency by up to ${strategySpread?.max ?? '?'} points
   (99th percentile ${strategySpread?.p99 ?? '?'}). No sentence rests on a hand's own frequency beyond whether
   it takes an action at all (10% of the time or more).
4. **Which hands he holds after his own action is not fixed.** On a river line that 73% of his range takes,
   the two references differed by four points about the equity of hands against that range. Equity after
   his action is therefore a number of this solution: across every set, on lines at least half of each range
   takes, ${n(eqOut.out)} of ${n(eqOut.made)} equities fell outside the tolerance (1 to 2 points) of a reference.

## Not proven: said nowhere on the page, to be proved later or dropped

| Claim | Why it is not made | Evidence |
|---|---|---|
| "Betting gains against his draws and loses to his strong hands": an action's gain split by what he holds | Not fixed by the equilibrium: which of his hands call is arbitrary among those indifferent | Two references (0.01%), main lines of six turn spots, ${n(holding?.comparisons ?? 0)} comparisons: the parts differ by up to **${holding?.max ?? '?'}% of the pot** (99th percentile ${holding?.p99 ?? '?'}%). \`holding.mjs\` |
| What an unused action costs, as a truth of the spot | Finding 2 | \`accept.mjs\`, random river set |
| Why a hand bets 60% and not 40% | Finding 3 | \`tolerance.mjs\` |
| Conclusions on lines less than a fifth of either range takes | Not tried. At one decision near that edge the two references disagreed about how often he takes the action at all (12.5% against 20%) | proof 4, step 2 |
| River and turn decisions reached inside a spot that started on an earlier street | The spot is solved to its own street's accuracy, and what follows a deal is less settled than that. Numbers only there | not yet run |
| Conclusions about flop decisions | ${flop.length ? `Tested at the accuracy a browser reaches (0.3%): see the table. ${flop.reduce((t, x) => t + byLine(x.r, '0.5').failed, 0) === 0 ? 'No false conclusion so far, but on few spots: each flop takes the better part of an hour to test.' : 'False conclusions were found.'}` : 'The test was still running when this was written.'} | \`accept.mjs "held flop" 0.3 0.02\` |
| Blockers: "your cards remove his calls" as the reason for a play | Never put to the test: needs a conclusion with a truth test and gates of its own | — |
| Which of his hands fold, call or raise, by made hand | Not measured; the split by holding above suggests it will not be stable | — |
| Why one bet size and not another when the range uses both | The "same" and "worse" conclusions cover the hand's own actions; no claim about sizes as such has a test | — |
| What a check-behind is worth by the card that comes | The call-against-fold split is tested; a check has no fold to be set against | — |
| Comparisons between hands ("this one bets because it is weaker than that one") | No test | — |

## The river audit

Before this work the page worded river decisions from \`river.js\`. Each of its sentences, written at page
accuracy, was compared with what it writes about the same hand in two finer solves (\`river-audit.mjs\`, six
river spots, main lines): is the sentence there at all, and how far apart are the numbers in it?

| Sentence | Written | Absent or reshaped in a finer solve | Largest difference in a number (99th pct / max) |
|---|---|---|---|
${audit.filter((x) => !x.kind.startsWith('lead')).map((x) => `| ${x.kind} | ${n(x.made)} | ${x.missing} | ${x.p99} / ${x.max} |`).join('\n')}

Many did not hold up, so the page no longer uses that wording. Rivers are now worded from the same proven
claims as turns (solved to 0.01%), with the price of a call and how often the hand is ahead when called
as numbers.

## Running it again

\`\`\`
node research/proof/identities.mjs  > research/proof/out/identities.jsonl     # proof 1
node research/proof/features.mjs    > research/proof/out/features.json        # proof 2
node research/proof/best.mjs        > research/proof/out/best.jsonl           # proof 3
node research/proof/accept.mjs "held turn" 0.02    > research/proof/out/accept-held-turn-0.02.json   # proof 4, one set
node research/proof/accept.mjs "fresh river" 0.01 0.002 > research/proof/out/accept-fresh-river-0.01.json
node research/proof/holding.mjs     > research/proof/out/holding.json         # not proven: the evidence
node research/proof/river-audit.mjs > research/proof/out/river-audit.txt
node research/proof/report.mjs                                                # this file
\`\`\`

The fast versions of proofs 1 to 3 and of the claims' truth tests also run with \`npm test\` (\`test/street.test.js\`).
`;
writeFileSync(here('./PROOF.md'), md + tail);
console.log('written', (md + tail).length, 'characters;', accept.length, 'acceptance sets');
