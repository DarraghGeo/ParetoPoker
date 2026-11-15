# Instructional design and intelligent tutoring evidence for software that teaches a complex cognitive skill

Reading note for the report writer. Figures below come from search-result abstracts and snippets of the named papers, not from full-text reads; where a number came only from a secondary summary (blog, press, third-party page) it is marked "(secondary)". Effect sizes across meta-analyses are not comparable without checking the control condition (no instruction vs. conventional instruction vs. an alternative active method). Almost all of this evidence is from school/university maths, science and reading; none of it is from poker or other games of incomplete information, so every transfer to the poker tool is an inference.

## 1. Worked-example effect, faded/completion examples, and the expertise-reversal effect

### Takeaway
Studying worked examples beats unsupported problem solving for novices by roughly g = 0.4 to 0.5, and fading the worked-out steps is the best-supported bridge to independent solving (reliable on near transfer, not on far transfer unless combined with principle-naming prompts). The benefit shrinks and can reverse as the learner gains knowledge, so the amount of worked-out support should fall with demonstrated skill.

### Cited Findings
- Barbieri et al. (2023, Educational Psychology Review) meta-analysis of worked examples in mathematics: average effect g = 0.48 (p = .01) on maths performance; the effect held whether examples were used for practice or for initial skill acquisition. — [Barbieri et al. 2023, Springer PDF](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)
- In the same meta-analysis, adding self-explanation prompts to worked examples was a significant moderator in the negative direction (examples with self-explanation prompts did worse relative to examples without them). This conflicts with the generally positive self-explanation literature in section 2. — [Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf); contrast [Bisra et al. 2018](https://doi.org/10.1007/s10648-018-9434-x)
- An earlier conference poster from the same group reported 185 effect sizes ranging from -1.80 to 4.66, mean g = 0.43, with no significant moderators; the sample differs from the published version. — [University of Delaware poster](https://www.cehd.udel.edu/wp-content/uploads/2022/02/Worked-Examples-Meta-Poster_022722_SC.pdf)
- A 2010 Educational Psychology Review meta-analysis concluded that the concrete effectiveness of worked examples "heavily depends on further moderating factors". — [Springer, 2010](https://link.springer.com/doi/10.1007/s10648-010-9136-5)
- Fading defined: worked-out steps are removed one at a time for the learner to complete until the whole problem is solved independently; with growing knowledge, fading leads from example study to problem solving (Renkl et al. 2002). — [Frontiers in Education 2024 review](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1293516/pdf)
- Renkl, Atkinson, Maier & Staley (2002, J. Experimental Education 70(4), 293-315): fading worked-out steps beat traditional example-problem pairs, mainly on near transfer; removing the last steps first (backward fading) worked better than removing the first steps first. — [From Example Study to Problem Solving: Smooth Transitions](https://typeset.io/pdf/from-example-study-to-problem-solving-smooth-transitions-15tfd8h0l4.pdf)
- Atkinson, Renkl & Merrill (2003, J. Educational Psychology 95(4)): the fading effect is reliable for near transfer but not for far transfer, so they added prompts asking learners to name the principle behind each worked step; a secondary summary reports that prompted backward fading improved far transfer over backward fading alone. — [record of the paper](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_614387414); [secondary summary](https://alwaysformative.blogspot.com/2011/05/ed-research-from-studying-examples-to.html)
- Backward vs. forward fading is not settled: a later study found forward fading with adaptive feedback produced better near transfer than backward fading. — [Moreno, Reisslein & Ozogul 2009](https://faculty.engineering.asu.edu/mre/wp-content/uploads/sites/31/2020/02/MoRO09.pdf)
- Adaptive fading inside a tutoring system (fade each step when the learner's own explanations show they understand it) led to higher transfer on delayed post-tests than fixed fading or plain tutored problem solving. — [Aleven/Renkl group paper, eScholarship](https://escholarship.org/content/qt7sh872dd/qt7sh872dd.pdf?t=op2lvy)
- Expertise reversal: Tetzlaff, Simonsmeier, Peters & Brod (2025, Learning and Instruction 98, 102142), "A cornerstone of adaptivity", meta-analysed 60 studies, 176 effect sizes, almost 6,000 participants; supports that help novices interfere with learning for more knowledgeable learners, effects in the "medium" range, larger for older learners and strongest in higher education, varying by discipline (secondary summary; pooled d not retrieved). — [Learning and the Brain summary](https://www.learningandthebrain.com/blog/one-size-doesnt-fit-all-teaching-experts-and-novices/)
- Kalyuga (2007, Educational Psychology Review) reviews the expertise-reversal findings within cognitive load theory and their link to aptitude-treatment interaction research. — [Kalyuga 2007](https://link.springer.com/article/10.1007%2Fs10648-007-9054-3)
- A 2011 study abstract describes the effect as "supported by numerous experiments, indicating an overall large effect size", and found novices given additional explanatory text scored higher on retention and transfer while the result reversed for experts. — [PubMed 21443379](https://pubmed.ncbi.nlm.nih.gov/21443379/)
- Kirschner, Sweller & Clark (2006) argue from working-memory limits and expert-novice differences (citing chess expertise) that minimally guided instruction is "significantly less effective and efficient" than guidance designed to support the cognitive processing needed for learning. — [Kirschner, Sweller & Clark 2006 PDF](https://www.davidlewisphd.com/courses/EDD8121/readings/2006-Kirschner_et_al.pdf)

### Inferences
- The tool's existing "solved strategy plus plain-English why" screen is a worked example. The evidence says this is the right starting mode for a new spot type, and the wrong permanent mode for a learner who already knows the spot.
- A faded mode is directly buildable: show the solved range with some decisions blanked (e.g. the last street, or one hand class) for the learner to fill, then blank more. Evidence slightly favours blanking the final steps first, but that is contested.
- Fade per skill, not per session: the adaptive-fading result suggests withdrawing the explanation for a concept only once the learner has shown they can supply it.
- Offer a "skip the explanation" path or collapse explanations by default for spots the learner has mastered; the expertise-reversal evidence says forced redundant explanation costs strong players something.

### Gaps
- Exact pooled effect size from Tetzlaff et al. (2025) was not retrieved; only a secondary summary was found.
- No explicit numeric criterion for "when to shift from examples to problems" was found. The literature gives a rule of direction (fade as knowledge grows; adapt to performance) not a threshold.
- I recall but did not verify in this session: Sweller & Cooper (1985) as the original worked-example study; Kalyuga, Ayres, Chandler & Sweller (2003) as the first expertise-reversal review; Salden, Aleven, Schwonke & Renkl (2010) on adaptive fading in Cognitive Tutors. The Crissman (2006) worked-example meta-analysis could not be found.

## 2. Self-explanation and prompted explanation

### Takeaway
Prompting learners to explain material to themselves has a medium average effect (g = 0.55 across 64 reports), but it is not uniformly helpful: it can fail or harm when it displaces practice or when learners produce poor explanations, and one worked-example meta-analysis found prompts reduced the example benefit.

### Cited Findings
- Bisra, Liu, Nesbit, Salimi & Winne (2018, Educational Psychology Review): 69 effect sizes from 64 reports, random-effects weighted mean g = 0.55. — [Bisra et al. 2018 PDF](https://www.Gwern.net/doc/psychology/spaced-repetition/2018-bisra.pdf); [DOI](https://doi.org/10.1007/s10648-018-9434-x)
- Prompt-format moderator in Bisra et al. (as tabulated by the TUM Clearing House): interrogative prompts g = 0.56 (k = 36), imperative prompts g = 0.40 (k = 12), "predirected" prompts g = 0.70 (k = 8). — [Clearing House Unterricht table](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/KR_25_ENG_Table.pdf)
- Same table: where the comparison group received no additional explanation, g = 0.67 (k = 41); i.e. self-explanation's advantage is largest against no explanation and smaller against being given an instructional explanation. — [Clearing House Unterricht table](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/KR_25_ENG_Table.pdf); [review summary](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf)
- Benefits were largely steady across content type, test type and timing of the prompt; there was some evidence that multiple-choice explanation prompts were less effective, plausibly because learners pick from a list instead of generating (secondary, journalistic). — [Tes](https://www.tes.com/magazine/archive/your-students-should-explain-themselves-literally); [BPS Research Digest](https://www.bps.org.uk/research-digest/self-explanation-powerful-learning-technique-according-meta-analysis-64-studies)
- Rittle-Johnson, Loehr & Durkin (2017, ZDM 49, 599-611): meta-analysis in mathematics found prompted self-explanation gives a small-to-moderate improvement in procedural knowledge, conceptual knowledge and procedural transfer, but notes "numerous cases where prompting for self-explanation did not improve, or even harmed, learning"; recommends scaffolding high-quality explanations by training or by structuring the response. — [Rittle-Johnson, Loehr & Durkin 2017](https://link.springer.com/article/10.1007/s11858-017-0834-z)
- Barbieri et al. (2023): self-explanation prompts attached to worked examples moderated the example effect negatively. — [Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)
- Wittwer & Renkl (2010) meta-analysed instructional explanations in example-based learning; where control participants were already prompted to self-explain, adding instructional explanations showed no effect (six studies). — [cited in NSF-hosted paper](https://par.nsf.gov//servlets/purl/10472800)

### Inferences
- The tool already supplies the instructional explanation. The comparison that matters for it is therefore "explain it yourself, then read ours" versus "just read ours" — the weaker of the Bisra contrasts, so expect a smaller gain than 0.55.
- Best-supported prompt shape for a phone: a short question ("Why does this hand bet here?") or a structured/partially-filled explanation the learner completes, followed by the tool's explanation as feedback. Free typing on a phone is costly; a structured response is supported by Rittle-Johnson's scaffolding recommendation, but pure multiple choice may be the weakest format.
- Risk to state in the report: self-explanation takes time. If it replaces practice items rather than adding to them, the net effect can be nil or negative.

### Gaps
- The primary Bisra moderator tables were not read directly; the multiple-choice finding is from press coverage.
- Wittwer & Renkl's overall effect size was not retrieved (a figure of about d = 0.16 is from memory and unverified).
- Chi et al.'s original self-explanation studies (1989, 1994) were not retrieved in this session.
- No meta-analytic evidence found on learner-generated explanations judged or answered by an AI (e.g. the learner explains, the system grades the explanation).

## 3. Productive failure versus explicit instruction; predict-then-explain and the pretesting effect

### Takeaway
Having learners attempt a problem before being taught beats teaching first by about g = 0.36 on conceptual understanding and transfer, more when the design follows Productive Failure closely, but the advantage reverses for young children and domain-general skills and does not appear for procedural fluency. Guessing before seeing the answer (prequestions) reliably helps memory for the questioned content (g = 0.54) and does almost nothing for the rest (g = 0.04).

### Cited Findings
- Sinha & Kapur (2021, Review of Educational Research): 53 studies, 166 comparisons; problem-solving-then-instruction (PS-I) beat instruction-then-problem-solving (I-PS), Hedges' g = 0.36, 95% CI [0.20, 0.51]. — [Sinha & Kapur 2021 record](https://ouci.dntb.gov.ua/works/4KnMgZq7); [DOI 10.3102/00346543211019105](https://www.x-mol.com/paper/1406031499744456704)
- Effects were stronger (g between 0.37 and 0.58) with high fidelity to Productive Failure principles; estimated effect after publication-bias adjustment g = 0.87 (abstract figure; treat cautiously, adjustments normally shrink effects). — [Sinha & Kapur 2021 record](https://ouci.dntb.gov.ua/works/4KnMgZq7)
- Moderators: grade level, intervention time span and (quasi-)experimental design; effects favoured instruction first for grades 2-5 and for domain-general skills. — [Sinha & Kapur 2021 record](https://ouci.dntb.gov.ua/works/4KnMgZq7)
- Follow-up meta-analysis from the same group: scaffolded problem solving before instruction did not differ from unscaffolded PS-I (g = -0.08, 95% CI [-0.20, 0.04]). — [ETH Research Collection](https://research-collection.ethz.ch/handle/20.500.11850/492056)
- Schwartz, Chase, Oppezzo & Chin (2011, J. Educational Psychology 103(4), 759-775): students told the formula first and students who had to invent it from contrasting cases were equally proficient on word problems, but inventors learned the deep structure better and transferred it to an unrelated problem weeks later; benefit held for low and high achievers. — [paper PDF](https://ece.northeastern.edu/edsnu/mcgruer/USC/PracticingVersusInventing2011-edu-103-4-759.pdf); [Stanford AAA Lab](https://aaalab.stanford.edu/research/inventive-learning/contrasting-cases/)
- A replication with student teachers and eighth graders was mixed: only 28% of students successfully invented an index, versus 80% in the Schwartz study (secondary). — [TIE summary](https://www.tieonline.com/article/2135/inventing-a-solution-vs-studying-a-worked-solution-which-better-prepares-students-for-learning-)
- Opposing position: Kirschner, Sweller & Clark (2006) hold that for novices guided instruction is more effective and efficient than minimally guided discovery; rebuttals by Schmidt et al. and Hmelo-Silver et al. (2007) appeared in the same journal. — [Kirschner et al. 2006 PDF](https://www.davidlewisphd.com/courses/EDD8121/readings/2006-Kirschner_et_al.pdf); [Downes summary](https://www.downes.ca/post/53538)
- Prequestion/pretesting effect: St. Hilaire, Chan & Ahn (2023, Psychonomic Bulletin & Review), preregistered meta-analysis: specific effect on prequestioned content g = 0.54 (97 studies); general effect on non-questioned content g = 0.04 (91 studies). — [meta-analytic review record](https://www.bohrium.com/paper-details/guessing-as-a-learning-intervention-a-meta-analytic-review-of-the-prequestion-effect/903820706179973241-12382)
- Pan & Carpenter (2023, Educational Psychology Review) review prequestioning and pretesting across text, video and lecture materials. — [Springer](https://link.springer.com/10.1007/s10648-023-09814-5)
- One 2023 study reported pretesting gave a memory advantage of d = 0.30 over retrieval practice (post-study testing). — [Pan & Sana 2023 PDF](https://sc-pan.github.io/pdf/PR_2023.pdf)

### Inferences
- The two camps disagree less than the headlines suggest. Both end in explicit instruction; the dispute is whether an attempt should come first. The productive-failure advantage is on conceptual understanding and transfer, with older learners, on domain-specific content — which matches adult poker players learning why a range is built as it is. The explicit-instruction case is strongest for complete novices and for procedures.
- "Predict the action (or the frequency, or the range shape), then reveal the solver's answer and the explanation" is the cheapest productive-failure-style mode the tool can add, because the answer and the explanation already exist. The prequestion evidence says it helps for exactly the thing predicted, so the prediction target should be the thing worth learning (the reason or the range-level pattern), not an incidental detail.
- Because the general effect is near zero, predicting one hand should not be expected to improve understanding of the rest of the range; predictions should be asked at the level the learner needs (range-level and principle-level questions, not only single combos).
- Fidelity matters: Productive Failure designs ask for multiple attempts at a problem that is hard but approachable with prior knowledge, then instruction that builds on the learner's own attempts. Showing the learner how their prediction differed from the solution, and why, is closer to that than showing the solution alone.

### Gaps
- Ashman, Kalyuga & Sweller (2020) and Loibl, Roll & Rummel (2017) were searched for and not retrieved. From memory, unverified: the cognitive-load camp argues the PS-I advantage is limited to low element-interactivity material, and Loibl et al. attribute PS-I gains to prior-knowledge activation, awareness of knowledge gaps and recognition of deep features, especially when instruction builds on typical student solutions.
- Whether the PS-I advantage holds for self-paced adult learners on an app (rather than classroom lessons) was not found.
- No study found on prediction-before-reveal specifically with solver or engine outputs (chess or poker).

## 4. Contrasting cases, analogical comparison and counterfactual variation

### Takeaway
Comparing cases side by side has a moderate, well-replicated effect (d = 0.50) on learning the underlying structure, and it works best when learners look for what the cases share and are given the principle after comparing rather than before.

### Cited Findings
- Alfieri, Nokes-Malach & Schunn (2013, Educational Psychologist 48(2), 87-113): 57 experiments, 336 tests; case comparison vs. other case-study formats and traditional instruction d = 0.50, 95% CI [0.44, 0.56]. — [Alfieri et al. 2013 PDF](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)
- Reliable moderators: the objective of the comparison, whether and when a principle is presented, content type, and the lag to testing. Largest effects when learners were asked to find similarities, when principles were given after the comparison, with perceptual content, and on immediate tests. — [Alfieri et al. 2013 PDF](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)
- Schwartz et al. (2011): inducing a ratio structure across contrasting cases (speed, density) produced transfer to a semantically unrelated problem (spring constant) several weeks later; being told the procedure first "can inadvertently undermine the learning of deep structures". — [Stanford AAA Lab](https://aaalab.stanford.edu/research/inventive-learning/contrasting-cases/); [paper PDF](https://ece.northeastern.edu/edsnu/mcgruer/USC/PracticingVersusInventing2011-edu-103-4-759.pdf)
- Schwartz & Bransford (1998) "A Time for Telling" is cited in later reviews as support for using case comparisons to prepare learners to grasp a new concept. — [Frontiers in Education 2024](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1374793/pdf)

### Inferences
- The tool's counterfactuals ("what would change this") are contrasting cases in prose. The evidence suggests showing them as an actual pair on screen — the same hand or range in two spots that differ in one feature (stack depth, board texture, position, bet size) — with the learner asked what differs and why before the explanation appears.
- Minimal pairs (one feature changed, action flips) isolate the feature that matters; pairs that look different but play the same support the "find the similarity" objective that had the largest effects.
- Order implied by the moderators: compare first, state the principle after. That is the same ordering the productive-failure evidence supports.
- The immediate-test moderator is a caution: comparison gains were largest right away, so comparison should be combined with later spaced review rather than relied on alone.

### Gaps
- Rittle-Johnson & Star's work on comparing solution methods (side-by-side worked examples improving procedural flexibility, with a prior-knowledge requirement) was searched for and not retrieved; recalled from memory only.
- Gentner's structure-mapping and analogical-encoding studies were not retrieved in this session.
- No direct evidence found on "what-if"/counterfactual variation presented by software as a learning method, as distinct from case comparison generally; the link is an inference.
- No evidence found on how many pairs are needed or on phone-sized presentation of two grids at once.

## 5. Mastery learning, the 2-sigma claim, tutoring systems, knowledge tracing and adaptive difficulty

### Takeaway
Mastery learning (about 0.5 SD) and step-level intelligent tutoring (about 0.4 to 0.8 SD depending on the comparison) are both real, moderate effects; Bloom's 2-sigma is not a credible target. The granularity that matters is feedback on each reasoning step rather than only on the final answer. The "85% rule" is a result about simple classifiers, not evidence for a quiz pass-rate.

### Cited Findings
- Kulik, Kulik & Bangert-Drowns (1990, Review of Educational Research 60(2), 265-299): meta-analysis of 108 controlled evaluations; mastery learning programs had positive effects on exam performance in colleges, high schools and upper elementary grades. — [paper PDF](https://typeset.io/pdf/effectiveness-of-mastery-learning-programs-a-meta-analysis-45bgwh1byb.pdf)
- The average effect in that meta-analysis is reported as 0.52 SD, with larger effects for weaker students (secondary, unverified page). — [Academia.edu summary](https://www.academia.edu/81783373/Effectiveness_of_Mastery_Learning_Programs_A_Meta_Analysis)
- Reappraisal of 2-sigma: von Hippel (Education Next, 2024) shows the two dissertations Bloom relied on (Anania; Burke) combined tutoring with mastery learning, extra time, frequent testing, corrective feedback and retesting, and tutors had extra training; he estimates the extra testing and feedback explain about half of the effect. — [von Hippel 2024, Education Next PDF](https://www.educationnext.org/wp-content/uploads/2024/03/ednext_XIV_2_von_hippel.pdf); independent review reaching a similar verdict: [Nintil](https://nintil.com/bloom-sigma/)
- A 2024 meta-analysis by Nickow, Oreopoulos & Quan is cited as putting tutoring at roughly 0.3 SD (secondary). — [Justin Math summary](https://justinmath.com/blooms-two-sigma-problem/)
- VanLehn (2011, Educational Psychologist): versus no tutoring, human tutoring d = 0.79, step-based tutoring systems d = 0.76, substep-based d = 0.40, answer-based about 0.31; i.e. human tutoring is far below 2 sigma and step-based systems nearly match it. — [ERIC EJ946764](https://eric.ed.gov/?id=EJ946764); [paper record](https://typeset.io/papers/the-relative-effectiveness-of-human-tutoring-intelligent-272v6hxk15)
- Kulik & Fletcher (2016, Review of Educational Research 86, 42-78): 50 controlled evaluations; median effect 0.66 SD over conventional instruction; effects were much smaller on standardised tests than on locally developed tests, and depended on the control treatment and implementation quality. — [IDA publication page](https://www.ida.org/research-and-publications/publications/all/e/ef/effectiveness-of-intelligent-tutoring-systems-a-meta-analytic-review); [DTIC PDF](https://apps.dtic.mil/sti/pdfs/AD1030353.pdf)
- Ma, Adesope, Nesbit & Liu (2014, J. Educational Psychology): 107 effect sizes from 73 studies; ITS vs. instruction of other kinds g = 0.41; ITS vs. no instruction g = 1.23 (per search summary; the paper's own breakdown should be checked); no significant difference from one-to-one human tutoring (g = -0.11). — [Ma et al. 2014 PDF](https://www.cs.uky.edu/~sgware/reading/papers/ma2014intelligent.pdf)
- A 2025 meta-analysis of K-12 ITS in the US reports step-based and substep-based effects versus regular instruction of g = 0.60 and 0.63. — [arXiv 2511.04997](https://arxiv.org/pdf/2511.04997)
- Knowledge tracing and mastery thresholds: Bayesian knowledge tracing (BKT) conventionally declares mastery at P(known) = 0.95; a 2025 EDM paper finds the best threshold is a trade-off between wasted practice and premature mastery and varies by skill from about 0.90 to 0.97. — [EDM 2025 short paper](https://educationaldatamining.org/edm2025/proceedings/2025.EDM.short-papers.4/2025.EDM.short-papers.4.pdf)
- A randomized experiment comparing mastery thresholds found students on the higher threshold forgot less, with the difference shrinking over time. — [JEDM, Using a Randomized Experiment to Compare Mastery Learning Thresholds](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/900)
- Over-practice (continuing after mastery) can account for up to 58% of practice in an untuned system. — [EDM 2021 paper 144](https://educationaldatamining.org/EDM2021/virtual/static/pdf/EDM21_paper_144.pdf)
- A simulation study reports a fundamental limitation of deep knowledge tracing that prevents it supporting mastery learning on multi-step problems. — [EDM 2021 paper 144](https://educationaldatamining.org/EDM2021/virtual/static/pdf/EDM21_paper_144.pdf)
- Performance Factors Analysis is a logistic alternative that counts prior successes and failures separately per knowledge component. — [The math behind knowledge tracing](https://www.mindomax.com/the-math-behind-knowledge-tracing)
- Conceptual treatment of mastery criteria (simple rules such as N-in-a-row versus model-based thresholds). — [Pelánek, Conceptual Issues in Mastery Criteria](https://www.fi.muni.cz/~xpelanek/publications/mastery-modeling.pdf)
- 85% rule: Wilson, Shenhav, Straccia & Cohen (2019, Nature Communications 10:4646) derive an optimal training error rate of about 15.87% for binary classification learned by stochastic gradient descent under Gaussian noise; demonstrated on small artificial neural networks and a computational model of perceptual learning, not in human experiments. — [PMC6831579](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579)
- Wilson himself says the rule most likely applies to perceptual learning from repetition and declines to extend it to conceptual learning or to "aim for a B average". — [ScienceDaily](https://www.sciencedaily.com/releases/2019/11/191105113457.htm)

### Inferences
- A realistic expectation for a well-built adaptive study mode over a plain quiz is a fraction of a standard deviation, not a transformation. The report should not cite 2-sigma as a benchmark.
- VanLehn's granularity result is the most transferable design rule: feedback on the steps of the reasoning (what range each side has, who has the advantage, what the hand needs to accomplish, then the action) should do more than feedback on the final action alone. The tool's per-hand and whole-range explanations give it the material for step-level feedback.
- A skill model needs a list of knowledge components (the concepts that explain actions), each quiz item tagged with the components it exercises. For a single-owner tool with little data, a simple per-concept success/failure count (PFA-style) or an N-correct-in-a-row rule is defensible; deep knowledge tracing needs far more data and has a reported weakness on multi-step problems.
- Mastery gating by concept, with a threshold near but not at certainty and spaced re-checks, is supported; stopping practice at mastery avoids the large over-practice waste.
- Poker actions are mixed strategies, so "correct/incorrect" is itself a modelling choice (e.g. scoring by expected-value loss rather than match to the highest-frequency action). The knowledge-tracing literature assumes binary correctness; no source found addresses graded or probabilistic answers.
- Use the 85% figure, if at all, as a rough heuristic for keeping quizzes neither trivial nor demoralising; it is not evidence about the right pass rate for conceptual learning.

### Gaps
- The Kulik 1990 0.52 figure was seen only on a secondary page; Bloom's (1984) original paper was not retrieved.
- The Ma et al. no-instruction figure and the exact VanLehn answer-based figure come from search summaries with noted inconsistencies; verify before quoting.
- No head-to-head evidence found that one knowledge-tracing model produces larger learning gains than another; comparisons are on prediction accuracy.
- No meta-analytic evidence found on hint design (on-demand vs. automatic, hint abuse/"gaming the system"); known from memory as an Aleven/Baker line of work, unverified here.
- No evidence found on adaptive-difficulty targets for adult conceptual learning.

## 6. Cognitive load and multimedia principles for a phone screen with a strategy grid plus text

### Takeaway
The best-supported screen-design rules are to cut non-essential material (coherence), highlight what the text is talking about (signalling), put explanatory words next to the part of the graphic they describe (spatial contiguity) and break content into learner-paced segments; median effects in Mayer's compilations are large (roughly 0.4 to 1.1) but come mostly from short lab lessons.

### Cited Findings
- Mayer's 2014 Cambridge Handbook compilation, median effect sizes and tests supporting: coherence 0.86 (23 of 23), signalling 0.41 (24 of 28), spatial contiguity 1.10 (22 of 22), temporal contiguity 1.22 (9 of 9). — [Cambridge Handbook of Multimedia Learning, extraneous-processing chapter](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/CD5B7AE1279A9AB81F8EEBB53DBEC86E)
- Segmenting: median 0.77 (10 of 10) in a 2014-era table; 0.67 (7 of 7) in a later table. — [Chartered College summary](https://my.chartered.college/?p=6958); [EdTechBooks, The Future of Multimedia Learning](https://edtechbooks.org/docx/10349)
- Mayer's later (2021-based) table: coherence 0.86 (18 of 19), signalling 0.70 (26 of 28), spatial contiguity 0.82 (9 of 9), temporal contiguity 1.31 (8 of 8), redundancy 0.10 (8 of 12). The numbers shift between editions, so cite the edition. — [Mayer handout hosted by UNH](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf)
- A separate 2017 review reports coherence d = 0.70, signalling d = 0.46, spatial contiguity d = 0.79 (per search summary of the article). — [Journal of Computer Assisted Learning record](https://zendy.io/title/10.1111/jcal.12197)
- Expertise reversal applies here too: added explanatory text helped novices on retention and transfer and hurt experts. — [PubMed 21443379](https://pubmed.ncbi.nlm.nih.gov/21443379/)

### Inferences
- On a phone the grid and its explanation rarely fit together, which creates the split-attention problem (the reader must hold the grid in mind while reading text below it, or the reverse). Options consistent with the evidence: keep a small pinned grid visible while the text scrolls; make hand names and hand classes in the text tappable so they highlight the matching cells (signalling plus contiguity); put short labels on the grid itself rather than in a distant legend.
- Segmenting: present the explanation in learner-paced steps (range-level story first, then hand classes, then the specific hand, then counterfactuals) instead of one long page.
- Coherence: every number or caveat that is not needed for the point being taught is a cost for a novice; detail belongs behind a tap.
- Redundancy has the weakest support (0.10), so reading the same words in two places is a minor issue compared with the others.

### Gaps
- No study found on these principles on small phone screens specifically, or for dense matrix displays like a 13x13 hand grid.
- Modality-principle evidence (spoken rather than written explanation alongside a graphic) was not retrieved; it may be relevant to an audio explanation option.
- Sweller's split-attention studies were not retrieved directly; the term is used here as the cognitive-load-theory counterpart of Mayer's spatial contiguity principle.

## 7. Principles before examples or examples before principles; prerequisite ordering; part-task versus whole-task training

### Takeaway
For novices the default is example and principle together with heavy support, but when the aim is deep structure and transfer, the comparison and productive-failure evidence both favour giving the principle after the learner has worked with cases. For complex skills the 4C/ID model recommends whole, realistic tasks ordered simple to complex, with part-task drill reserved for components that must become automatic; its meta-analytic support is positive but thin.

### Cited Findings
- Case-comparison meta-analysis: providing the principle after the comparison gave larger effects than providing it before. — [Alfieri et al. 2013 PDF](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)
- Telling the formula before practice with contrasting cases gave equal procedural skill but weaker learning of deep structure and transfer than inventing first, then being told. — [Schwartz et al. 2011 PDF](https://ece.northeastern.edu/edsnu/mcgruer/USC/PracticingVersusInventing2011-edu-103-4-759.pdf)
- PS-I beat I-PS overall (g = 0.36) but instruction first was better for young learners and domain-general skills. — [Sinha & Kapur 2021 record](https://ouci.dntb.gov.ua/works/4KnMgZq7)
- Counter-position: for novices, explicit guidance first is more effective and efficient than minimally guided exploration. — [Kirschner et al. 2006 PDF](https://www.davidlewisphd.com/courses/EDD8121/readings/2006-Kirschner_et_al.pdf)
- 4C/ID has four components: learning tasks (whole tasks), supportive information, procedural (just-in-time) information and part-task practice. — [Frontiers in Education 2025 on 4C/ID](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1631375/full)
- Costa, Miranda & Melo (2022, Learning Environments Research 25(2), 445-463): meta-analysis of 12 studies of 4C/ID-based instruction; academic area and grade level moderated effects (stronger in college/university), while study design and outcome type did not. — [Costa et al., Springer](https://link.springer.com/10.1007/s10984-021-09373-y); [repository copy](https://repositorio.iscte-iul.pt/bitstream/10071/23015/1/article_81383.pdf)
- The pooled effect in Costa et al. is reported as d = 0.79 (secondary). — [Learning and the Brain summary](https://www.learningandthebrain.com/blog/putting-it-all-together-4c-id/)

### Inferences
- A sensible default sequence for one concept: a brief orienting statement of what to look for, then cases or a prediction, then the full principle and explanation, then faded practice. That sits between the two camps and is consistent with all the findings above.
- 4C/ID maps onto the tool as: whole tasks = complete spots or hands played through, in classes ordered from simple to complex (e.g. fewer streets, simpler boards, fewer bet sizes first); supportive information = the range-level and concept explanations, available before and during a task class; just-in-time information = the per-hand explanation shown at the moment of decision; part-task practice = rapid drills on recurrent components that should be automatic (e.g. recognising board texture, range advantage, pot odds).
- A curriculum or concept map with prerequisite ordering would also give the knowledge-component list needed for mastery tracking in section 5, so one artefact serves both.

### Gaps
- No whole-task versus part-task effect size was found; Lim, Reiser & Olina (2009) is the usual direct comparison and was not retrieved.
- Costa et al.'s pooled effect was not verified from the paper, and 12 studies is a small base.
- No meta-analytic evidence was retrieved on prerequisite ordering, concept maps as curricula, or on interleaving versus blocking of problem types (interleaving is likely relevant and was outside the searches run).
- van Merriënboer's own statements of the model were not retrieved directly.

## 8. Explanations from AI and expert systems: learning versus over-reliance

### Takeaway
Showing a recommendation together with an explanation tends not to produce learning and raises acceptance of the recommendation whether or not it is right; people learn when they must do the cognitive work themselves, either by committing to an answer first or, better in the one study that measured learning, by receiving the explanation without the answer. The designs that reduce over-reliance most are the ones users like least.

### Cited Findings
- Gajos & Mamykina (2022, IUI, pp. 794-806), three experiments on nutrition decisions with simulated AI: showing an AI recommendation plus explanation produced no more learning than no AI help. — [arXiv 2202.05402](https://arxiv.org/pdf/2202.05402); [author page](https://www.eecs.harvard.edu/~kgajos/papers/2022/gajos2022people.shtml)
- Same paper: showing only the explanation, leaving the person to reach the decision, improved decision accuracy and produced learning; the authors attribute this to the deeper engagement needed to get from explanation to decision. — [arXiv 2202.05402](https://arxiv.org/pdf/2202.05402)
- Same paper: making people decide first and then showing the recommendation and explanation improved decisions but produced no learning. — [arXiv 2202.05402](https://arxiv.org/pdf/2202.05402)
- Buçinca, Malaya & Gajos (2021, CSCW), 199 participants: explanations alone do not reduce over-reliance and may increase it; three cognitive forcing designs significantly reduced over-reliance compared with simple explainable-AI designs; participants rated the most effective designs least favourably; people higher in Need for Cognition benefited more. — [author page](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca2021trust.shtml); [arXiv 2102.09692](https://arxiv.org/pdf/2102.09692.pdf)
- Bansal et al. (2021, CHI): explanations did not improve human-AI team accuracy beyond simpler aids such as showing confidence; they increased the chance that people accepted the AI's recommendation regardless of its correctness. — [arXiv 2006.14779](https://arxiv.org/abs/2006.14779); [Microsoft Research](https://www.microsoft.com/en-us/research/?p=728173)

### Inferences
- The tool's default view (solved answer plus explanation, read passively) is the configuration these studies found does not teach. This is the single most actionable finding for the report.
- Two alternatives with direct support: (a) explanation-first, answer hidden — show the reasoning about the range and the hand, ask the learner to derive the action, then reveal; (b) commit-first — the learner chooses, then sees answer and explanation. In Gajos & Mamykina only (a) produced learning; (b) improved decisions but not learning, which is in tension with the prequestion evidence in section 3 (g = 0.54 for questioned content). The difference may be the task and the measure; the report should present predict-then-reveal as well supported for memory of the specific answer and explanation-then-derive as the stronger candidate for understanding.
- Expect friction: forcing designs are disliked, and benefit motivated users more. For a study tool used voluntarily, make effortful modes optional or clearly labelled as the "training" setting, with the passive browse mode kept for lookup.
- A solver's output is correct by construction in a way the AI in these studies was not, so over-reliance on a wrong answer matters less. Two reliance risks do remain: the written explanation is a generated rationalisation of the solution and can be wrong or incomplete even when the strategy is right; and the learner's goal is to perform without the tool at the table, so dependence on reading the answer is the failure mode regardless of accuracy.

### Gaps
- These are short online decision tasks (nutrition, sentiment, question answering), not multi-week skill learning; no long-term or expert-domain replication was found.
- Sample sizes and statistics for Gajos & Mamykina were not retrieved.
- No study found on learning from chess-engine or poker-solver explanations, or on whether natural-language explanations of a solved strategy improve human play.
- No evidence retrieved on showing confidence or uncertainty in the explanation as a way to calibrate learners' trust in the explanation text itself.
