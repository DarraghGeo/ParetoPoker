# Make the player answer before reading

The largest gap between the tool and the learning research is that Study mode shows the solved answer and its explanation together for the user to read, and that is the one arrangement the research on learning from machine advice found does not teach. The second gap is that Train mode never brings a missed idea back days later on a board the user has not seen, which is where the two best-supported techniques in the whole literature (answering from memory, and spreading practice over time) do their work. The tool's raw material is unusually good: explanations of why, measured "what would change it" results, quiz questions about the range instead of one hand, and boards dealt fresh each time are all things the research favours and most competing products lack. The recommended path therefore keeps the two modes and changes how the user meets them: ask for a prediction and a reason before the reveal, re-ask missed ideas on new boards after a gap of days, turn the existing twins, neighbouring flops and counterfactuals into "what changed?" drills, and make the headline score accuracy on unseen boards after a delay. Expect gains of a fraction of a standard deviation each, not a transformation. Three caveats apply throughout. The researchers worked from abstracts and search summaries, not full papers. Some figures are second-hand and are marked so. No peer-reviewed study of how people learn from a poker solver or trainer was found, so every step from the research to the tool is an inference and is labelled as one.

## What the learning research shows, and how far to trust it

### How to read the numbers

Most results below are "effect sizes", written d or g. An effect of 0.5 means, as a rule of thumb, that the typical learner taught the better way ends up ahead of about seven in ten learners taught the other way; 0.2 is small and 0.8 is large. Two effect sizes are only comparable when the comparison group is the same, and these often are not. Nearly all of this evidence comes from school and university subjects, memory tasks, perceptual categories and motor skills. The meta-analysis that re-examined ten study techniques across 242 studies found that most of them tested recall of facts, so applying them to deeper understanding takes care ([Donoghue & Hattie 2021](https://www.frontiersin.org/articles/10.3389/feduc.2021.581216/full)).

| Technique | Compared with | Reported size | Main caveat |
|---|---|---|---|
| Answering from memory | Re-reading | g = 0.50; 0.73 with feedback, 0.39 without (second-hand) | Mostly factual material |
| Feedback that explains why | No feedback | 0.49; showing the answer 0.32; right/wrong only 0.05 | 40 studies of computer feedback, wide spread |
| Mixing similar problem types | One type at a time | g = 0.42 overall; +0.67 to -0.39 by material | Reverses when categories are easy to tell apart |
| Comparing cases side by side | Other case formats | d = 0.50 | Largest on immediate tests |
| Attempting before being taught | Being taught first | g = 0.36 | Conceptual content, older learners |
| Guessing before seeing the answer | No guess | 0.54 for the thing guessed; 0.04 for everything else | Benefit does not spread |
| Explaining it to yourself | No prompt | g = 0.55 | Smaller when a good explanation is already supplied |
| Worked examples for novices | Unaided problem solving | g = 0.48 | Fades or reverses as knowledge grows |
| Tutoring software that checks each step | No tutoring | d = 0.76 | About 0.4 against other teaching |
| Game-like features | None | 0.49 learning, 0.36 motivation, 0.25 behaviour | Only the first held up in rigorous studies |

### Answering beats reading, and learners cannot feel the difference

A major review rated ten study techniques and put two at the top: practice testing and practice spread over time. Re-reading was rated low ([Dunlosky 2013](https://www.aft.org/ae/fall2013/dunlosky)). Testing beats re-study by **g = 0.50** ([Pan & Sana 2021, citing Rowland 2014](https://sc-pan.github.io/pdf/PS_2021.pdf)), and by more when the answer is followed by feedback (0.73 against 0.39, a second-hand figure not checked against the original) ([secondary summary](https://studycardsai.com/blog/active-recall-statistics)). The uncomfortable companion finding is that learners misjudge this. In a well-known experiment, students' predictions of their later performance bore no relation to their actual performance ([Karpicke & Roediger 2008](https://www.brucehayes.org/Teaching/papers/2008_Roediger_Karpicke_Science.pdf)), and a review concluded that performance during practice is an unreliable guide to learning ([Soderstrom & Bjork 2015](https://pubmed.ncbi.nlm.nih.gov/25910388/)). When people learned painters' styles from mixed or grouped examples, mixing produced better recognition of new paintings, yet participants still rated grouping as the better method after seeing their own results ([Kornell & Bjork 2008](https://pubmed.ncbi.nlm.nih.gov/18578849/)). The practical meaning is that the mode a user says "feels effective" is weak evidence about which mode teaches.

One dispute matters for poker. Some researchers argue the testing benefit shrinks when the material has many interdependent parts ([van Gog & Sweller 2015](https://link.springer.com/article/10.1007/s10648-015-9310-x)); others reply that this claim left out contrary studies and never measured complexity ([Karpicke & Aue 2015](https://link.springer.com/10.1007/s10648-015-9309-3)). The dispute is unresolved.

### Explanations do the teaching; a tick or a cross does almost nothing

In computer-based learning, feedback that explains was worth **0.49**, feedback that only shows the right answer 0.32, and feedback that only says right or wrong **0.05**, with the explained kind especially ahead on higher-order outcomes ([Van der Kleij et al. 2015](https://scinapse.io/papers/2110661236)). A later analysis reached the same ordering ([Mertens et al. 2022](https://www.leibniz-ipn.de/en/research/publications/effects-of-computer-based-feedback-on-lower-and-higher-order-learning-outcomes)). Feedback is not safe by default: across 607 effects it helped on average (d = 0.41) but **more than a third of feedback interventions made performance worse** ([Kluger & DeNisi 1996](https://swov.nl/nl/publicatie/effects-feedback-interventions-performance-historical-review-meta-analysis-and)), and a newer synthesis puts the average at 0.48 with the information in the feedback as the main driver ([Wisniewski et al. 2020](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/full)). Tutoring software shows a related pattern: systems that respond to each step of the reasoning came close to human tutors (d = 0.76 against 0.79, both against no tutoring), while systems that respond only to the final answer did much less (about 0.31, a figure from a search summary) ([VanLehn 2011](https://eric.ed.gov/?id=EJ946764)). The famous claim that one-to-one tutoring is worth two standard deviations has not survived re-examination ([von Hippel 2024](https://www.educationnext.org/wp-content/uploads/2024/03/ednext_XIV_2_von_hippel.pdf)); realistic gains from adaptive software against other teaching are around 0.4 ([Ma et al. 2014](https://www.cs.uky.edu/~sgware/reading/papers/ma2014intelligent.pdf)).

### Coming back after days matters more than the scheduling formula

Spreading practice over time is the other top-rated technique. The best gap grows with how long the knowledge must last, roughly 20% of the delay for a test a few weeks away and about 5% for a year away, and **a gap that is too short costs much more than one that is too long** ([Cepeda et al. 2008](https://pubmed.ncbi.nlm.nih.gov/19076480/)). The idea that gaps must expand, which underlies flashcard schedulers, is not established: expanding and equal gaps gave the same recall eight weeks later ([Kang et al. 2014](https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/KangLindseyMozerPashler2014.pdf)). The claim that the newer FSRS scheduler beats the older SM-2 rests on how well each predicts recall in flashcard logs, published by its own community, not on a trial of learning ([benchmark write-up](https://expertium.github.io/Benchmark.html)). Spacing is not only for facts. In a classroom trial with 787 students, mixing and spacing maths problem types gave 61% against 38% on a surprise test a month later, **d = 0.83** ([What Works Clearinghouse review of Rohrer et al. 2020](https://ies.ed.gov/ncee/wwc/Study/88770)).

### Similar-looking cases should be set against each other

Mixing problem types beats practising one type at a time by g = 0.42 overall, but the result depends on the material: it is largest when the categories are easy to confuse and it reverses when they are easy to tell apart ([Brunmair & Richter 2019](https://pubmed.ncbi.nlm.nih.gov/31556629/)). Experiments confirm the mechanism. Mixing helps when the hard part is telling categories apart; grouping helps when the hard part is seeing what members of one category share ([Carvalho & Goldstone 2014](https://link.springer.com/content/pdf/10.3758/s13421-013-0371-0.pdf)). Putting two cases side by side and asking the learner to compare them is worth **d = 0.50** across 57 experiments, with the largest effects when the principle is stated after the comparison instead of before, and on immediate tests ([Alfieri et al. 2013](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)). An older result explains why: one example rarely transfers to a new problem, but describing what two analogous examples have in common often produces a general rule, and the quality of that rule predicts transfer ([Gick & Holyoak 1983](https://deepblue.lib.umich.edu/items/196ea13e-fb69-4a74-a6f9-864c81aed465/full)).

### Attempt first, explain after, and withdraw help as skill grows

Trying a problem before being taught beats being taught first by g = 0.36 for conceptual understanding and transfer, but not for young children or for routine procedures ([Sinha & Kapur 2021](https://ouci.dntb.gov.ua/works/4KnMgZq7)). Guessing before seeing an answer helps memory for the thing guessed (g = 0.54) and does almost nothing for the rest of the material (**g = 0.04**) ([St. Hilaire et al. 2023](https://www.bohrium.com/paper-details/guessing-as-a-learning-intervention-a-meta-analytic-review-of-the-prequestion-effect/903820706179973241-12382)). Prompting learners to explain material to themselves is worth g = 0.55 on average ([Bisra et al. 2018](https://doi.org/10.1007/s10648-018-9434-x)), but a maths review records numerous cases where it failed or harmed, usually when it displaced practice or the explanations were poor ([Rittle-Johnson et al. 2017](https://link.springer.com/article/10.1007/s11858-017-0834-z)), and one meta-analysis found that adding such prompts to worked examples reduced the benefit of the examples ([Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)).

The opposing camp holds that novices learn best from fully worked examples, which beat unaided problem solving by g = 0.48 in maths ([Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)). The two camps meet in the "expertise reversal" finding: help that serves a novice gets in the way of someone who already knows the material ([Kalyuga 2007](https://link.springer.com/article/10.1007%2Fs10648-007-9054-3)), and tutoring software that removed worked steps as each learner showed understanding beat both fixed removal and plain problem solving ([Salden et al. 2010](https://link.springer.com/doi/10.1007/s11251-009-9107-8)).

### The evidence closest to solver study warns against showing the answer and the reason together

Three small bodies of work come nearest to the tool's situation. First, in three experiments on decisions made with simulated machine advice, showing a recommendation with its explanation produced no more learning than no help at all. Showing only the explanation and leaving the person to reach the decision did produce learning. Making people decide first and then showing the recommendation improved their decisions but not their learning ([Gajos & Mamykina 2022](https://arxiv.org/pdf/2202.05402)). A companion study found that designs which force the user to think reduce blind reliance on the machine, and that **users rated the most effective designs least favourably** ([Buçinca et al. 2021](https://arxiv.org/pdf/2102.09692.pdf)). These were short online tasks about nutrition, not weeks of skill-building. Second, the one chess experiment on this question had novices learn an endgame by watching the computer's moves, predicting them, or predicting and explaining them. The explaining group understood the principles better and won more often; **predicting alone was no better than watching** ([de Bruin et al. 2007](https://pure.eur.nl/en/publications/the-effect-of-self-explanation-and-prediction-on-the-development-/)). Third, professional Go players' decisions improved measurably after superhuman programs appeared, most for younger and weaker players and most in the opening ([Choi et al. 2025](https://arxiv.org/abs/2310.08704v2)), and four top chess grandmasters picked up new concepts from an engine through curated puzzle positions alone ([Schut et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12002201)). Those programs give moves without reasons, so they show that people learn from superhuman play but not whether explanation adds to it. That question is open.

### Poker results teach the wrong lessons; pattern recognition can be drilled

People judge a decision by how it turned out even when they hold all the information the decider had ([Baron & Hershey 1988](https://bear.warrington.ufl.edu/brenner/mar7588/Papers/baron-hershey-jpsp1988.pdf)), and in online poker skill only dominates chance once results are measured over about 1,500 hands ([Potter van Loon et al. 2015](https://eprints.nottingham.ac.uk/30839)). In tasks where several cues predict an uncertain outcome, the feedback that improves judgement is information about how the cues truly relate to the outcome, not the outcomes themselves ([Sulsky et al.](https://researchwith.montclair.edu/en/publications/task-information-cognitive-information-or-functional-validity-inf/)). On the recognition side, chess research holds that skill rests on a large store of familiar patterns that suggest moves ([Gobet & Simon 1996](https://link.springer.com/content/pdf/10.3758%2FBF03200937.pdf)); speed-chess results explained up to 81% of the variation in standard ratings ([Burns 2004](https://www.psychologicalscience.org/journals/psychological-science/j.0956-7976.2004.00699.x/)), though slower thought still adds decision quality on top of the first idea ([Moxley et al., as summarised](https://pmc.ncbi.nlm.nih.gov/articles/PMC10497664/)). One laboratory has shown that such recognition can be trained directly with many short classification trials on varied examples, immediate feedback, and scheduling by both accuracy and speed, with gains in algebra holding two weeks later ([Kellman & Krasne 2018](https://kellmanlab.psych.ucla.edu/files/kellman_krasne_2018.pdf); [Bufford et al. 2014](https://kellmanlab.psych.ucla.edu/files/bufford_mettler_geller_kellman_2014.pdf)). Almost all of that evidence is from the originating lab and none is from games. In poker itself, a think-aloud study of 45 players found the gap between experts and novices was largest on later streets ([St. Germain & Tenenbaum 2011](https://cris.iucc.ac.il/en/publications/decision-making-and-thought-processes-among-poker-players/)).

### Study beats play, and game-like features add little

A 2026 study of 44,213 chess players found that study activities (puzzles, lessons, game reviews) were associated with about 3.6 times the rating gain per unit of effort that playing was, while players spent roughly 90% of their time playing; the authors caution that this is an association ([Southwick et al. 2026](https://doi.org/10.1177/09567976261452568)). Practice of the deliberate kind explains about a quarter of skill differences in games, important but not everything ([Macnamara et al. 2014](https://www.psychologicalscience.org/news/releases/becoming-an-expert-takes-more-than-practice.html)). On motivation, tracking one's own progress reliably improves goal attainment across 138 randomised studies ([Harkin et al. 2016](https://eprints.whiterose.ac.uk/id/eprint/87431/)). Game-like features give small gains, and only the learning effect held up in rigorous studies ([Sailer & Homner 2020](https://link.springer.com/article/10.1007/s10648-019-09498-w)). Streaks keep people coming back, but a visibly broken streak reduces the behaviour, less so when the streak can be repaired ([Silverman & Barasch 2023](https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb)).

## The current modes hold the right material in the wrong order

Everything in this section is inference: it applies the findings above to the tool as the owner described it.

### Study mode is an excellent worked example that never asks the user to work

Study mode's content matches what the research rewards. It explains why, which is the kind of feedback worth 0.49 against 0.05. It gives the true relations between the features of a spot and the strategy (who holds the strong hands, where the bet earns from), which is the "task information" the probability-learning research identifies as the part that improves judgement. Its "what would change it" results are measured contrasts, and its twins are minimal pairs, the two devices the comparison research supports. Leading with words and keeping numbers behind a tap follows the best-supported screen-design rule, which is to cut everything not needed for the point being made (a median effect of 0.86 in short laboratory lessons) ([Mayer, Cambridge Handbook](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/CD5B7AE1279A9AB81F8EEBB53DBEC86E)). It is also what coaches recommend, which is to learn the logic and not memorise frequencies, although that advice is opinion and untested ([PokerStrategy](https://www.pokerstrategy.com/news/world-of-poker/Why-everyone-argues-about-GTO_125115/)).

The weakness is the delivery. Answer and explanation arrive together and the user reads. That is re-reading (rated low), it is the arrangement that produced no learning in the machine-advice experiments, and it matches the "watching" condition that lost in the chess endgame study. It also feels productive, which is exactly the illusion the research describes. Two further points follow. The mode suits a player meeting a kind of spot for the first time, where a worked example is the right start, and suits an experienced player least, since forced explanation of what he already knows costs him something. And the explanation is generated text about a correct strategy: the strategy is right by construction, but the words describing it can be incomplete, a risk the machine-advice studies do not cover.

### Train mode asks good questions but never comes back to them

Train mode gets several things right that mainstream trainers do not. It makes the user answer before seeing anything, which is the testing effect. It asks about the range (who has the advantage, how big the range bets), and since guessing helps only the thing guessed, asking about the idea worth learning is the right target. No mainstream product found in this review quizzes those ideas directly; they quiz the action for one hand. It deals fresh boards, so the user cannot memorise answers, which is the standard criticism of chess opening trainers ([Matuschak notes](https://notes.andymatuschak.org/z8MgFD7B7QRqqGZXsJqeGpm5PJhroPwb6BW2V)). Its groups of a flop and two neighbours one card away put confusable cases next to each other, which is where mixing pays. It drops questions that are too close to call, which avoids marking a mixed-strategy coin flip as wrong. Its daily score and five-day history are progress tracking, the motivational device with the best randomised evidence.

What it lacks is everything that turns a quiz into lasting skill. Nothing missed returns after days, so the tool forgoes spacing entirely. The score is same-day accuracy, which the research calls an unreliable guide to learning. There is no test on unseen spots after a delay, so neither the user nor the owner can tell whether anything is sticking. There is no confidence rating, so the tool cannot find the confident errors that are easiest to fix or the lucky guesses that are likely to fail next time. There is no map of which ideas are weak, so the tool cannot play the coach's part of choosing what to practise next, and novices are poor judges of that themselves: in a chess learning study, novices' accuracy in judging their own understanding was close to zero ([de Bruin dissertation](https://repub.eur.nl/pub/8144/proefschrift_de_bruin_final2.pdf)). Checked in the code: at the moment of answering Train shows a tick or cross and one line of numbers (for example the two equities); the full "why" appears only in the later review of the day's questions. So at the point where explanation is worth most, the mode is giving close to right/wrong feedback.

## Ten options, from a one-screen change to a new mode

Effort estimates are inferences from the owner's description of the tool, not from reading its code. The summary table comes first; each option is then set out in full.

| Option | Main evidence | Effort | Main risk |
|---|---|---|---|
| 1. Predict and say why before the reveal | Testing 0.50; machine-advice and chess endgame studies | Small | Slower; users like it less |
| 2. Explain at the moment of answering in Train | Explained feedback 0.49 vs 0.05 | Small | Slows the quiz |
| 3. Come-back queue on fresh boards | Spacing; d = 0.83 classroom trial | Medium | Board families are a judgement call |
| 4. "What changed?" contrast drill | Comparison 0.50; mixing 0.42 | Medium | Two spots on a phone; slow flop solves |
| 5. Confidence tap | Confident errors correct best | Small | Useless unless it drives practice |
| 6. Delayed unseen-board score and skill map | Practice scores mislead; tracking helps | Medium | Small samples per cell |
| 7. Explanations that step back | Worked examples 0.48; expertise reversal | Small to medium | No threshold in the research |
| 8. Fast reps | One lab's perceptual training; speed chess | Medium | Untested in games |
| 9. Hand quiz scored by cost | Product practice; task information | Small to medium | Solver noise; teaches hands not ranges |
| 10. Guided path with toy games | Mastery learning about 0.5 (second-hand) | Large | Thin evidence, heavy authoring |

### Option 1: ask for a prediction and a reason before the reveal

What it is: in Study mode, before the grid and explanation appear, the user answers one or two short questions about the spot, such as how often the range bets, which size it prefers, or who holds the strong hands. On tapping a hand, he chooses its action and picks the main reason from a short list before the explanation opens. The reveal then shows where his answer and the solver's differ. A second variant shows the reasoning facts first (what a bet meets, who holds the strong hands) with the action hidden, and asks him to work out the action. The current read-only view stays as a lookup setting.

Evidence: testing beats re-reading by about 0.5. Attempting before instruction is worth 0.36 for conceptual content with adult learners. The chess endgame study says the "why" step is the part that matters, since prediction alone did not beat watching. The machine-advice experiments found learning only in the explanation-first variant, which is why both variants are worth having. The tension is real and should be stated: one line of work says committing first helps memory for the answer (0.54), another found it did not produce learning. The safest reading is that predict-then-reveal is well supported for remembering the specific answer, and that reasoning toward the answer is the stronger candidate for understanding.

What it takes: the answers and explanations already exist, so this is mostly a change of order and one new prompt screen. The reason list needs plausible wrong reasons, which the explanation engine's material (where the bet earns from, what the opponent replies with by hand type) can supply.

Risks: it is slower and users will like it less, as the forcing-design study found. Picking a reason from a list is probably the weakest form of self-explanation (a second-hand finding), and one meta-analysis found such prompts reduced the value of worked examples, so prompts must be short and must not crowd out practice. Since the tool already supplies a good explanation, expect a smaller gain than the 0.55 headline.

### Option 2: explain at the moment of answering in Train

What it is: every Train answer is followed at once by a short "why", with a link that opens the same spot in Study. Wrong answers and low-confidence right answers get it by default; others can skip it.

Evidence: explained feedback 0.49, answer-only 0.32, right/wrong 0.05; testing with feedback 0.73 against 0.39 without (second-hand). One user review of a competing trainer complained that it gave no explanation of why an action was an error ([App listing](https://apps.appfollow.io/ios/dto-mtt-gto-poker-trainer/1458491856?country=us)).

What it takes: little. The full reason is already built for each question and held for the review screen; today only its first line, a number, is shown at answer time.

Risks: it slows the quiz, and feedback timing is a contested area, with laboratory studies sometimes favouring delay and applied studies favouring immediacy ([Smith & Kimball 2010](https://www.ou.edu/memorylab/pdfs/SmithKimball_2010_LearningFromFeedback_ms.pdf)). Immediate explanation plus a later return (option 3) covers both.

### Option 3: a come-back queue that re-asks the idea on a new board

What it is: when the user misses a question, the tool schedules the same idea (for example, nut advantage on paired boards) to return on a different board after about two days, then a week, then longer. The unit that gets scheduled is the idea, never the board.

Evidence: spacing is one of the two top-rated techniques; too-short gaps cost more than too-long ones; practising to a correct answer and then relearning in later sessions raised course results by about a letter grade in one study (second-hand) ([SecEd guide](https://www.sec-ed.co.uk/content/best-practice/a-teacher-s-guide-to-retrieval-practice-successive-relearning)); the d = 0.83 classroom result shows this works for skills. Re-asking on a new board answers the memorisation criticism and matches the perceptual-learning rule of never repeating an example.

What it takes: a saved history of results per idea, a way to sort boards into families, and a way to deal a board from a named family. Train already deals random boards, so the new part is the family labels and the history. A simple fixed ladder of gaps is enough; the research gives no reason to build an optimised scheduler.

Risks: the board families are the owner's judgement and a poor grouping weakens everything built on it. One answer is weak evidence of knowing an idea, so promotion should need several right answers. A user who skips days will face a backlog, which needs a cap. No study has tested spaced scheduling of ideas with varying examples; this is an open question, not a settled one.

### Option 4: a "what changed?" contrast drill

What it is: three drill types built from things the tool already produces. Two boards one card apart with different answers, asking which one the range bets bigger on, or where the nut advantage switches, and why. A twin pair, asking which of two hands differing only in suit bets. A counterfactual, asking the user to predict the direction of the change ("his strongest hands are removed: does our range bet more often, less often, or bigger?") before the measured result is shown. The principle is stated after the user answers.

Evidence: case comparison d = 0.50, strongest when the principle comes after; mixing is most useful for confusable categories; two compared examples produce a transferable rule where one does not. The chess finding that experts fixate on a familiar good idea and miss a better one ([Bilalić et al. 2010](https://journals.sagepub.com/doi/abs/10.1177/0963721410363571)) argues for near-miss spots where the usual rule fails. Coaches use the same technique by hand with node-locking, as opinion.

What it takes: the neighbouring flops, twins and counterfactual solves exist. The work is a compact two-spot layout for a phone and a filter that keeps only pairs whose answers differ clearly, which can reuse the too-close-to-call check. Counterfactuals need a second solve, so on a phone they belong on turn and river spots, where solving is quick, unless flop results are prepared in advance.

Risks: comparison gains were largest on immediate tests, so this should feed the come-back queue and not stand alone. No study has tested software "what-if" variation as a teaching method; the link to case comparison is an inference. Nothing is known about showing two grids on a phone screen.

### Option 5: a one-tap confidence rating

What it is: before the reveal, the user taps "sure", "think so" or "guess".

Evidence: errors made with high confidence are the most likely to be corrected after feedback ([Butterfield & Metcalfe 2006](https://link.springer.com/article/10.1007/s11409-006-6894-z)); correct answers given with low confidence tend to fail later without feedback ([review citing Butler et al. 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC3970786)); in a classroom study overconfidence fell and results rose only for students who received feedback on both their performance and their judgements ([Callender et al. 2016](https://link.springer.com/doi/10.1007/s11409-015-9142-6)).

What it takes: one tap and one stored value. It is useful only when it changes what happens next: confident errors go to the front of the come-back queue, unsure correct answers get the explanation, and a simple line shows how often "sure" answers were right.

Risks: an extra tap on every question slows practice. Asking learners to judge their own learning improved their study choices but not their performance in one chess study ([de Bruin et al. 2005](https://zendy.io/title/10.1002/acp.1109)), so the rating alone does nothing. No poker or chess product was found that does this, so there is no precedent to copy.

### Option 6: make delayed accuracy on unseen boards the headline, with a skill map

What it is: the main progress figure becomes accuracy on boards the user has never seen, on ideas last practised days ago. Beneath it sits a grid of question type against board family showing strong and weak areas, which also steers what Train asks next. Today's score, days practised and question counts stay as secondary information, with a plain note that harder practice scores lower on the day.

Evidence: practice performance misleads; learners' own predictions do not track results; progress tracking improves goal attainment; deliberate practice depends on someone diagnosing the weakness to work on, which is the coach's job the tool can take over ([Ericsson & Harwell 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411)). For choosing questions, simple counts of right and wrong answers per idea are defensible for a small tool; the elaborate skill-tracking models are compared on prediction accuracy, not learning gains.

What it takes: the same saved history as option 3, plus the display. Options 3, 5 and 6 share one record and are best built together.

Risks: a single user answers few questions per cell, so the map will be noisy and should show uncertainty or stay coarse. The research gives no tested pass mark for adult conceptual learning. The often-quoted "85% rule" comes from simulations of simple classifiers, and its author declines to extend it to conceptual learning ([ScienceDaily](https://www.sciencedaily.com/releases/2019/11/191105113457.htm)).

### Option 7: explanations that step back as the user improves, and fit the phone

What it is: two changes. For ideas the user has shown he knows, the explanation is collapsed by default and the prediction is all he sees until he asks; for new ideas the full explanation leads. Separately, the explanation is presented in short steps at the user's pace (the range, then the hand group, then the hand, then what would change it), the grid stays pinned in view while the text scrolls, and tapping a hand group named in the text highlights its cells.

Evidence: worked examples help novices (0.48) and lose value or backfire for the knowledgeable; adaptive withdrawal of steps beat fixed withdrawal. For layout, the median effects in short laboratory lessons are 0.41 for highlighting what the text refers to, 1.10 for placing words next to the part of the picture they describe, and about 0.77 for learner-paced segments ([Mayer, Cambridge Handbook](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/CD5B7AE1279A9AB81F8EEBB53DBEC86E); [Chartered College summary](https://my.chartered.college/?p=6958)).

What it takes: the layout changes stand alone and are modest. The adaptive part needs the skill record from option 6.

Risks: the research gives a direction (withdraw help as knowledge grows) but no threshold. The layout figures change between editions of the source and come from short lessons; no study of these rules on phone screens or dense hand grids was found.

### Option 8: fast reps for pattern recognition

What it is: a timed run of quick classification questions using the existing Train question types, with the answer and a one-line reason shown at once, both speed and accuracy recorded, and no board repeated.

Evidence: the perceptual-learning work (one lab, not in games); the speed-chess result that fast recognition carries most of skill, with the counter-evidence that deliberation still adds; and the poker think-aloud study's unexpected finding that novices improved most under a time limit.

What it takes: Train's questions are already of this kind, so the additions are a timer, response-time records and a tighter loop. Fresh flop solves are slow in the browser, so the mode needs either turn and river spots or flop answers prepared beforehand. Favouring later streets also fits the finding that the expert gap is widest there.

Risks: whether quick classification drills improve whole-hand decisions is untested. Time pressure can reward guessing. The mode trades away explanation, so it complements the slower modes and cannot replace them.

### Option 9: a hand quiz scored by cost, not right or wrong

What it is: "what does this hand do here?", scored by how much value the chosen action gives up, with the solver's frequency shown alongside ("cost: nothing; the solver does this 30% of the time").

Evidence: this is the mainstream trainer format. Products split between scoring by value lost and scoring by frequency, and users are confused when two actions of equal value get different labels ([App Store listing](https://apps.apple.com/us/app/-/id1488850006)). Scoring by cost never punishes a choice the equilibrium is indifferent to. That mixed strategies make single right/wrong marks uninformative is an inference from the feedback research, untested in poker.

What it takes: the engine already produces each hand's value for each action, and Train already asks what a hand can do.

Risks: value differences smaller than the solver's own accuracy are noise, a limit one vendor's manual acknowledges ([DriveGTO manual](https://drivehud.com/dh2-knowledge-base/drivegto-manual-new/)). Hand-by-hand quizzing pulls toward memorising hands, and the guessing research says a single-hand prediction does little for understanding of the rest of the range. This is the option that makes the tool most like its competitors and least like itself.

### Option 10: a guided path from simple spots to complex ones

What it is: an ordered sequence of ideas, starting with toy games small enough to reason through and with river spots, each unlocked by showing mastery of the one before and each revisited later.

Evidence: mastery learning averages about 0.5 (the figure is second-hand) ([Kulik et al. 1990](https://typeset.io/pdf/effectiveness-of-mastery-learning-programs-a-meta-analysis-45bgwh1byb.pdf)); a model that orders whole realistic tasks from simple to complex has positive support from only 12 studies ([Costa et al. 2022](https://link.springer.com/10.1007/s10984-021-09373-y)); toy games are a favoured teaching device of poker authors, as opinion ([OnlinePokerStrategy review](https://www.onlinepokerstrategy.com/poker-books/play-optimal-poker/)).

What it takes: the most of any option, because the sequence and its content must be written. The list of ideas it requires is the same list options 3 and 6 need, so that part is not wasted.

Risks: thin evidence, heavy authoring, and little value to players who are already strong.

### What to keep small or leave out

A streak, if added, should count days practised per week and allow repair, since a visibly broken chain lowers return visits. Leaderboards and ratings of the player are poorly supported: the behavioural effect of game-like features is small and unstable, and it is an inference from the feedback research that scores drawing attention to the player's standing and away from the decision are among the kinds that backfire. Dealing out the remaining cards or showing who won the pot after a quiz answer should be avoided, because outcomes colour judgement of the decision. A mode for exploiting human mistakes has a real rationale: chess players who trained against computers improved but did not learn to exploit human errors ([Gaessler & Piezunka 2023](https://ideas.repec.org/a/bla/stratm/v44y2023i11p2724-2750.html)). It is a different product goal from mastering equilibrium play, and the counterfactual engine is its natural seed, so it belongs later.

## The recommended order starts with the cheapest fix for the biggest gap

First, options 1 and 2 together. They close the largest gap, cost the least, and use only what exists. Study gains a prediction and a reason before the reveal; Train gives its "why" at the moment of answering. The read-only view remains for looking things up.

Second, options 3, 5 and 6 as one piece of work, because they share a single saved record of results per idea. This adds the most strongly supported technique the tool lacks (spacing), on fresh boards, and replaces the same-day score with one that measures retained, transferable skill. The confidence tap is nearly free once the record exists and tells the queue what to prioritise.

Third, option 4. It is the most distinctive use of what the tool can already compute, and no competing product found in this review offers it, but it needs layout work and benefits from the queue being in place to carry its gains past the same session.

Fourth, option 7. The layout half can be done at any time; the adaptive half depends on the skill record.

Last, options 8, 9 and 10, in that order of confidence. Fast reps rest on one laboratory's work outside games. The hand quiz is familiar but pulls away from the tool's strength. The guided path costs the most for the thinnest evidence.

The order is a judgement, and its main uncertainty is user tolerance: every step in the first two stages makes study more effortful, and the research is consistent that effortful modes are both the ones that work and the ones users rate lowest. Labelling them plainly as the training setting, keeping them short, and keeping the easy lookup view available is the mitigation.

## Conclusion

The review changes the question. The owner asked whether the modes are the best approaches; the evidence says the content of both modes is close to what learning research would prescribe, and that what is missing is a set of demands on the user: commit, give a reason, come back later, face a new board. None of those needs a new engine. The tool's unusual assets, explanations of why and solves on demand, are the ones the research values and the ones a library of precomputed answers cannot match, because only a tool that generates fresh spots can test an idea without re-showing the same board.

The second implication is that the tool can settle what the literature cannot. No published study shows how people learn from a solver, so every recommendation here is carried over from classrooms and laboratories. Once delayed accuracy on unseen boards is recorded, the tool holds the measurement needed to check each change on its own users: whether predicting first, the come-back queue or the contrast drill moves that number. Building that measure early turns the remaining options from bets into experiments.
