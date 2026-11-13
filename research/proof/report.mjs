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
CFR and CFR+). Gates were set on the calibration sets and then left alone; the held-out and random sets are
the test. Lines at least half of each range takes:

${head}
${rows('0.5')}

All sets together on those lines: **${n(total('0.5').c)} conclusions, ${total('0.5').f} false.**
"Largest reversed gap" is the largest difference in worth, at page accuracy, whose direction a reference
reversed: the gate for calling an action worse is 2% of the pot on turns and rivers, several times that figure.

What the conclusions are:

| Conclusion | Made when | True of a reference when |
|---|---|---|
| worse | an action the range uses, which this hand does not take, is worth at least the gate less than its best action | it is worth less there too |
| same | two actions the hand takes differ by no more than half the gap tolerance | they differ by no more than that plus the tolerance |
| needs | the times he continues against a bet the hand makes are worth less than the passive action is overall, by at least twice the tolerance | they are worth less there too |
| builds | they are worth more, by at least twice the tolerance | they are worth more there too |
| cards | a call the hand makes gains or loses, against folding, at least twice the tolerance on the cards that lift the hand (or on the others) | it has the same direction there |

### On trial: thinner lines

The same conclusions on lines a fifth to a half of each range takes, with wider gates. Not in use on the page.

${head}
${rows('0.2')}

${(() => { const t = total('0.2'); return `All sets: ${n(t.c)} conclusions, ${t.f} false.`; })()} See "Not proven" for why these are not yet adopted.

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
writeFileSync(here('./PROOF.head.md'), md);
console.log('written', md.length, 'characters;', accept.length, 'acceptance sets');
