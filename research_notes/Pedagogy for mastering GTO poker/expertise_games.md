# Expertise acquisition in strategy games (chess, poker, Go) and implications for training GTO poker

Evidence labels used below: **[PR]** peer-reviewed primary study or meta-analysis; **[PR-secondary]** peer-reviewed finding reached through an abstract, press release or a later paper's summary rather than the full text; **[PREPRINT]**; **[PRACTITIONER]** coach, vendor or blog opinion or data. Most findings were read from abstracts, repository records and summaries, not full texts; exact effect sizes should be checked against the originals before being quoted in a final report.

## 1. Deliberate practice: Ericsson's claims, the Macnamara et al. (2014) meta-analysis, and the debate

### Takeaway
Practice is the largest single measured predictor of skill in games (about a quarter to a third of rating variance, r about .5), but it is clearly not the whole story, and the size of the effect depends on how narrowly "deliberate practice" is defined. The contested part is the magnitude; nobody in the debate disputes that structured, effortful, feedback-rich solitary work beats play alone.

### Cited Findings
- [PR-secondary] Macnamara, Hambrick & Oswald (2014, Psychological Science) meta-analysed 88 studies (more than 11,000 participants). Deliberate practice explained 26% of performance variance in games, 21% in music, 18% in sports, 4% in education and under 1% in professions; authors' conclusion: "important, but not as important as has been argued." — [APS press release](https://www.psychologicalscience.org/news/releases/becoming-an-expert-takes-more-than-practice.html); [Princeton news](https://www.princeton.edu/news/2014/07/03/becoming-expert-takes-more-practice)
- [PR] Ericsson & Harwell (2019, Frontiers in Psychology) reply that Macnamara et al. used a much broader definition ("structured activities created specifically to improve performance"), which they relabel "structured practice". The original 1993 definition requires individualised instruction from a teacher who designs and guides solitary practice. Restricting to studies meeting the original criteria with objective performance measures, practice explained 29% of variance (61% after correction for attenuation), versus 14% in the comparable Macnamara subset. — [Ericsson & Harwell 2019, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411)
- CONTESTED: the 61% figure is an attenuation-corrected estimate from a reanalysis written by the originator of the theory; the 26% figure pools heterogeneous definitions of practice and relies on retrospective self-report. No independent adjudication was found. — [Ericsson & Harwell 2019, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411)
- [PR-secondary] Hambrick et al. (2014, Intelligence) reanalysed chess and music studies: deliberate practice explained about 34% of variance in chess performance after correcting for measurement error (assuming reliability .80). "Necessary but not sufficient." — [BPS Research Digest](https://www.bps.org.uk/research-digest/exploding-10000-hours-myth-its-no-guarantee-greatness)
- [PR-secondary] Huge spread in hours to reach a level: in the Gobet & Campitelli chess sample, masters averaged 10,530 hours of deliberate practice (SD 7,414) and intermediates 3,179 (SD 4,615); some players reached master with far fewer hours than others who never did. — [reproduction of Hambrick et al. data](https://www.betonit.ai/p/your_big_doubtshtml)
- [PR-secondary] Starting age matters independently of hours: partial correlation between serious starting age and national rating, controlling for practice hours, r = -.40; about 1 in 4 who started serious play before 13 became international-level versus 1 in 55 who started later (Gobet & Campitelli 2007, as reported in Burgoyne et al. 2019). — [Burgoyne et al. 2019](https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf)
- Defining features of deliberate practice on Ericsson's account: individualised tasks set by a teacher, aimed at a specific aspect of performance, with immediate feedback, done alone, repeated with refinement; distinct from play, competition and work. — [Ericsson & Harwell 2019, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411)

### Inferences
- For a study tool the defensible claim is "the type of practice matters more than total volume, and volume of the right type explains roughly a third of skill differences in chess-like games"; do not promise that hours alone produce mastery.
- A solver-backed trainer naturally supplies three of the four deliberate-practice ingredients (specific task, immediate objective feedback, repetition). The missing one is the coach's function: diagnosing which weakness to work on next and keeping the difficulty at the edge of ability. That diagnostic function is where a tool can add most.
- Poker's noisy outcome feedback makes natural play an unusually poor form of practice compared with chess (a correct decision is often punished), which strengthens the case for solver-scored drills where feedback is on decision quality, not results. This is an inference; no study was found testing it.

### Gaps
- No meta-analytic estimate of practice effects specifically for poker was found; "games" in Macnamara et al. is dominated by chess (and some Scrabble etc.).
- No study was found measuring poker study hours by type (solver work, hand review, coaching, play) against objective win rate.

## 2. Chess expertise: chunking, templates, pattern recognition versus calculation, and what kinds of study predict skill

### Takeaway
Chess skill rests on a very large store of recognised patterns that cue plausible moves and guide a selective search; recognition and calculation both scale with skill and work together. Among practice activities, serious solitary study is the strongest predictor of rating, ahead of coaching and tournament play. Evidence for specific drills (repeat-the-same-puzzle methods, engine study) is thin and mostly practitioner-level.

### Cited Findings
- [PR] Chase & Simon proposed that masters hold a vocabulary of familiar piece configurations ("chunks") with an order-of-magnitude estimate of 50,000; Gobet & Simon revisited the recall evidence. — [Gobet & Simon 1996](https://link.springer.com/content/pdf/10.3758%2FBF03200937.pdf)
- [PR] Template theory (Gobet & Simon): with exposure to many games, frequently recurring chunks grow into larger "templates" with a fixed core and variable slots, which link to plans, moves and evaluations; this explains masters' fast encoding of whole positions. — [Springer, Memory & Cognition 2017 discussion](https://link.springer.com/article/10.3758/s13421-017-0768-2)
- [PR] Gobet & Simon's pattern-recognition theory of search holds that recognition and look-ahead are interleaved (patterns suggest moves at each node of the search), and accounts for the modest skill differences in raw search depth. — [Gobet, pattern-recognition theory of search](https://core.ac.uk/works/345132)
- [PR-secondary] Burns (2004, Psychological Science): performance in blitz (under 5% of normal thinking time) accounted for up to 81% of the variance in standard chess rating, read as evidence that fast recognition processes carry most of skill; the dependence was strongest among higher-rated players. — [Psychological Science abstract page](https://www.psychologicalscience.org/journals/psychological-science/j.0956-7976.2004.00699.x/)
- [PR-secondary] CONTESTED counterweight: in Moxley, Ericsson & Charness's think-aloud work, the quality of the first move considered explained 7.8% of variance in skill while the quality of the move finally chosen explained 15.2%, i.e. deliberation adds beyond first intuition even for experts. — [2023 paper summarising Moxley et al., PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10497664/)
- [PR-secondary] Charness, Tuffiash, Krampe, Reingold & Vasyukova (2005, Applied Cognitive Psychology): in two large samples of rated players, serious study alone was the strongest predictor of chess skill among the activities measured; a combination of chess activities accounted for about 40% of rating variance. — [Charness et al. 2005 record](https://zendy.io/title/10.1002/acp.1106)
- [PR] Burgoyne, Nye, Macnamara, Charness & Hambrick (2019) reanalysis: confirmed serious study predicts rating more strongly than formal instruction or tournament competition; the claim that formal instruction boosts the effectiveness of serious study was not supported. — [Burgoyne et al. 2019](https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf)
- Limitation: these are retrospective self-reports of hours; Charness et al. acknowledge they cannot check over- or under-estimation, and Howard has argued recall error undermines such findings. — [Burgoyne et al. 2019](https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf)
- [PR-secondary] A cost of pattern-driven expertise: the Einstellung effect (Bilalić, McLeod & Gobet 2008). Experts who had found a familiar good solution said they were looking for a better one, but eye tracking showed they kept looking at squares related to the first idea; the effect could temporarily lower masters to the level of much weaker players. It was easier to resist when the familiar move was a blunder than when it was merely good-but-suboptimal. — [Bilalić, McLeod & Gobet, Current Directions 2010](https://journals.sagepub.com/doi/abs/10.1177/0963721410363571)
- [PRACTITIONER] Woodpecker method (solve a fixed set of tactics, then re-solve the whole set in repeatedly shorter cycles): no controlled peer-reviewed study was found. Support is anecdotal (co-author Hans Tikkanen earned three GM norms in seven weeks after using it). A vendor of a Woodpecker app reports 431,899 puzzle attempts from 1,952 users: by cycle 5 users solve the set about 2.5x more efficiently, with smaller gains above 1600; these are gains on the trained puzzles, and the linked rating gain reported is modest. — [Disco Chess vendor analysis on Lichess blog](https://lichess.org/@/DiscoChessApp/blog/woodpecker-method-training-431000-puzzles-60000-rated-games-and-35-elo/yrWsFF1N); [Zwischenzug review](https://zwischenzug.substack.com/p/the-woodpecker-method-revisited)
- [PRACTITIONER] Critiques of Woodpecker: it shortens intervals between repetitions whereas spaced repetition lengthens them; tactics are an effectively unbounded set, so memorising specific positions may not generalise; even favourable sources say it does not replace solving fresh puzzles. — [Zwischenzug review](https://zwischenzug.substack.com/p/the-woodpecker-method-revisited); [Lichess user data analysis](https://lichess.org/@/zig_zag_zug_zwang/blog/a-data-driven-approach-to-chess-improvement-part-1-srs--woodpecker-method/i2k8ZqAn)
- [PR-secondary] Training against machines helps but is an imperfect substitute for human opponents: Gaessler & Piezunka (2023, Strategic Management Journal), using the staggered diffusion of chess computers in the 1970s-80s (over 20,000 players, over 500,000 games), found computers improved players by substituting for scarce human training partners, but players trained this way "were not exposed to and thus did not learn to exploit idiosyncratic (human) mistakes". — [Gaessler & Piezunka 2023](https://ideas.repec.org/a/bla/stratm/v44y2023i11p2724-2750.html)

### Inferences
- Poker analogues of chunks/templates are plausibly board-texture classes, range-shape archetypes (who has the nut advantage, who has the range advantage, capped versus uncapped) and stack-to-pot configurations, each cueing a default strategy "with slots" (sizing, frequency) to be filled in. This mapping is an inference from the chess theory, not a tested finding.
- Burns versus Moxley implies a tool should train both: fast classification drills to build the recognition base, and slower "work it out and justify it" modes, since deliberate analysis still adds decision quality on top of intuition.
- The Einstellung result is a warning for GTO drilling: a memorised "standard" line that is good-but-suboptimal is exactly the kind of prior that blocks seeing a better one. Drills that deliberately include near-miss spots, where the usual heuristic fails, should counter this.
- Gaessler & Piezunka maps directly onto poker: training only against equilibrium play teaches the baseline but not how to exploit the specific mistakes humans make. A separate exploit/"node-locked population" mode is the analogue.
- Repeating a fixed set of solved spots will reliably make the user faster on that set; whether it transfers is unproven. A mixed design (re-test missed spots, but also serve fresh variants of the same structure) hedges that risk.

### Gaps
- No controlled study was found on whether studying with a chess engine helps or harms understanding compared with engine-free study. Claims that engine use breeds passivity or shallow memorisation are practitioner opinion only.
- No peer-reviewed trial of tactics-puzzle training volume versus rating gain was located in this search.
- The commonly quoted larger estimates of chunk/template counts (e.g. several hundred thousand) could not be confirmed from the sources retrieved.

## 3. Perceptual learning and perceptual-adaptive learning modules (Kellman)

### Takeaway
Expert pattern recognition can be trained directly, and faster than by explanation, through many short classification trials over varied examples with immediate feedback and adaptive, response-time-based spacing. The evidence comes mainly from Kellman's own lab (maths, medical image reading) and has not been tested in card or board games.

### Cited Findings
- [PR] Perceptual learning "grows from many classification episodes and feedback and from encountering sufficient variation within and between categories"; conventional declarative/procedural instruction does little for it. PLMs use brief interactive classification trials rather than explanation. — [Kellman & Krasne 2018](https://kellmanlab.psych.ucla.edu/files/kellman_krasne_2018.pdf)
- [PR] Perceptual and adaptive learning modules (PALMs) add the ARTS system (Adaptive Response Time-based Sequencing), which uses both accuracy and speed on each category to schedule when it recurs, and applies objective mastery criteria (accurate and fast over consecutive presentations) before retiring a category. — [PALM paper, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6124487)
- [PR] Application domains reported: ECG interpretation, dermatology, histology, radiology, aviation, and mathematics. — [Kellman lab: perceptual and adaptive learning in medicine](https://kellmanlab.psych.ucla.edu/research-perceptual-and-adaptive-learning-in-medicine.php)
- [PR] Kellman et al. (2008) reported significant and persisting gains for students using PLMs in fractions and algebra, targeting failures of retention, transfer, fluency and knowing when a piece of knowledge applies. — [Kellman et al. 2008](https://kellmanlab.psych.ucla.edu/wp-content/uploads/sites/357/2025/09/kellman_et_al_2008.pdf)
- [PR] An algebra-transformation PLM raised both accuracy and speed, with gains fully maintained at a two-week delay. — [Bufford, Mettler, Geller & Kellman 2014](https://kellmanlab.psych.ucla.edu/files/bufford_mettler_geller_kellman_2014.pdf)
- [PR] Adaptive spacing by response time outperformed fixed schedules in the lab's sequencing studies. — [Mettler & Kellman 2014](https://kellmanlab.psych.ucla.edu/files/mettler_kellman_2014.pdf)
- Caveat: almost all evidence is from the originating lab; no independent meta-analysis or replication was found in this search.

### Inferences
- Poker has natural PALM targets: classify a flop by texture family, say which player has range or nut advantage, pick the solver's dominant sizing family, or classify a range heat-map shape (linear, polar, merged, capped). Each is a quick many-example classification with an objectively correct answer from the solver.
- Key design rules to copy: never show the same example twice (force learning of the invariant, not the instance); mix contrasting categories; score speed as well as accuracy; retire a category only when fast and correct several times with spacing; bring slow or wrong categories back sooner.
- This directly addresses the Woodpecker critique: perceptual learning theory predicts that varied instances of a category transfer, while repeated identical instances get memorised.

### Gaps
- No study applies perceptual learning modules to poker, chess or Go. Transfer from "classify the texture" drills to better whole-hand decisions is untested.
- Effect sizes and the delayed-test results for the medical PALMs were not retrieved in detail.

## 4. Poker-specific research on skill, expertise, tilt and learning

### Takeaway
Poker skill is real, persistent and measurable, and experts differ from novices in what they attend to (situational and opponent cues, later-street reasoning), in mathematical accuracy and in emotion regulation. The academic literature says almost nothing about how players acquire skill, and nothing peer-reviewed was found on learning from solvers.

### Cited Findings
- [PR] Levitt & Miles (NBER 2011; Journal of Sports Economics): 720 players identified in advance as highly skilled earned about +30% return on investment at the 2010 World Series of Poker versus about -15% for all other players. — [NBER working paper 17023](https://www.nber.org/system/files/working_papers/w17023/w17023.pdf)
- [PR] Potter van Loon, van den Assem & van Dolder (2015, PLoS ONE): in hundreds of millions of online player-hand observations, players in the top (bottom) profitability decile in one period perform better (worse) and are much more likely to be in the top (bottom) decile next period; simulations suggest skill dominates chance once performance is measured over about 1,500 hands. — [Nottingham ePrints record](https://eprints.nottingham.ac.uk/30839)
- [PR] St. Germain & Tenenbaum (2011, High Ability Studies): 45 players (15 expert, 15 intermediate, 15 novice) played 60 simulated no-limit hold'em hands while thinking aloud. Experts and intermediates made better decisions than novices, with the gap largest on later streets; experts verbalised more thoughts; experts and intermediates attended to situation-relevant cues while novices focused on basic considerations and irrelevant cues. Unexpectedly, novices improved most under a time limit. — [St. Germain & Tenenbaum 2011 record](https://cris.iucc.ac.il/en/publications/decision-making-and-thought-processes-among-poker-players/)
- [PR-secondary] Helsinki group (Palomäki, Laakasuo, Salmela): in an online study of 354 players, experienced players made mathematically better decisions in fictitious poker scenarios than inexperienced players. — [International Gambling Studies 2013 record](https://econpapers.repec.org/RePEc:taf:intgms:v:13:y:2013:i:2:p:255-270)
- [PR-secondary] Same group, Journal of Gambling Studies: experienced players engage in more self-reflection and less self-rumination; the probability of a correct decision in poker tasks rose with both self-reflection and poker experience; the study introduced a Poker Experience Scale. — [Palomäki doctoral thesis summary, CORE](https://core.ac.uk/download/33734863.pdf)
- [PR-secondary] Tilt: defined as losing control due to strong negative emotions elicited by the game, with reduced decision quality. Experienced players report better emotion regulation over losses, yet in "Losing more by losing it" (2014) also reported more severe tilting in absolute terms, which the authors reconcile as lower tilt risk per hand but more lifetime exposure. — [Journal of Gambling Studies 2014](https://link.springer.com/doi/10.1007/s10899-014-9454-5); [PokerNews coverage](https://www.pokernews.com/news/2013/12/jussi-palomaki-tilt-study-17032.htm)
- [PR-secondary] Induced negative emotion (moral anger) reduced mathematical accuracy of poker decisions in a 459-participant study by the same group. — [Palomäki thesis, Helsinki repository](https://helda.helsinki.fi/server/api/core/bitstreams/0dc51648-89ac-4a2d-b376-d4a9784b0e75/content)
- [PR-secondary] "Experienced Poker Players Are Emotionally Stable" (2014, Cyberpsychology, Behavior, and Social Networking): among 478 online players, lower HEXACO emotionality was associated with more poker experience. Correlational, self-selected sample. — [Medical Xpress summary](https://m.medicalxpress.com/news/2014-10-emotional-stability-affect-success-online.html)
- [PRACTITIONER] Coaches' consensus on solver study: extract general patterns and heuristics rather than memorise frequencies; simplify to a manageable number of bet sizes; beginners should ignore fine mixing; use node locking to study responses to realistic opponent errors. — [PokerStrategy: why everyone argues about GTO](https://www.pokerstrategy.com/news/world-of-poker/Why-everyone-argues-about-GTO_125115/); [Deuces Cracked study guide](https://www.deucescracked.com/blog/gto-wizard-2026-overhaul-poker-study-guide)

### Inferences
- St. Germain & Tenenbaum's finding that the expert-novice gap is largest on later streets suggests turn and river spots, where ranges are narrowest and reasoning chains longest, deserve disproportionate drill time for improving players.
- The self-reflection result supports building structured post-session review into the tool (reflective, analytic review of decisions), as distinct from brooding on results.
- The 1,500-hand figure for skill to show through noise quantifies why learners cannot rely on results as feedback and need decision-level scoring.
- Tilt research implies a tool measuring decision quality could also detect state-dependent degradation (accuracy after a run of losses or errors), though no study tested such an intervention.

### Gaps
- No peer-reviewed study was found on how humans learn from poker solvers, on the effectiveness of GTO trainers, or comparing memorising solver outputs with learning heuristics. All such guidance is practitioner opinion.
- The exact mapping of the Helsinki group's individual papers (titles, sample sizes, journals) was pieced together from abstracts and thesis summaries and should be verified before citation.
- Poker expertise studies use self-reported experience or small groups; none track learning longitudinally.

## 5. Humans learning from superhuman AI (Go after AlphaGo, chess engines): does "why" matter?

### Takeaway
Access to superhuman AI measurably improved professional human play in Go, mainly in the opening, most for younger and weaker players, and with more novel moves rather than pure imitation. The studies cannot say whether explanations matter, because Go and chess engines give moves and evaluations without reasons; the small amount of direct evidence on explanation comes from elsewhere (see section 6).

### Cited Findings
- [PR] Shin, Kim, van Opheusden & Griffiths (2023, PNAS): over 5.8 million moves by professional Go players, 1950-2021, scored against a superhuman AI. Decision quality rose significantly after the advent of superhuman AI; novel moves (previously unobserved) became more frequent and became associated with higher quality. The authors suggest AI prompted players to break from tradition; the design is observational. — [arXiv 2303.07462](https://arxiv.org/abs/2303.07462)
- [PR] Choi, Kang, Kim & Kim (Strategic Management Journal 2025; preprint 2023): about 750,000 professional moves; after an AI Go program became available, move quality rose, moves aligned more with AI recommendations, and errors became fewer and less severe. Gains were largest in the early game (highest uncertainty), translated into wins, were larger for younger players, and larger for less skilled players. — [arXiv 2310.08704](https://arxiv.org/abs/2310.08704v2)
- [PR] Schut, Tomašev, McGrath, Hassabis, Paquet & Kim (2025, PNAS): concepts mined from AlphaZero's internal representations, filtered for novelty and teachability, were presented to four top grandmasters (world-champion level) purely as puzzle-and-solution prototype positions; all four improved on held-out positions for the concept after the learning phase. The authors call it a preliminary study. Notably, learning occurred from examples alone, without verbal explanation. — [Schut et al. 2025, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12002201)
- [PR/PREPRINT] The Maia project trains engines to predict human moves at given skill levels (about 53% exact-move prediction versus roughly 43% for Leela and 38% for Stockfish), motivated by the view that superhuman engines' moves are often not the most instructive for a given human level. Maia-2 finds skill-dependent concepts represented differently across levels. — [Lichess: introducing Maia](https://lichess.org/blog/X9PUixUAANCqFRSh/introducing-maia-a-human-like-neural-network-chess-engine); [Maia-2, arXiv](https://arxiv.org/pdf/2409.20553)
- [PR-secondary] Gaessler & Piezunka (2023): chess computers improved players, especially those lacking strong human sparring partners, but did not teach exploitation of human errors. — [Gaessler & Piezunka 2023](https://ideas.repec.org/a/bla/stratm/v44y2023i11p2724-2750.html)

### Inferences
- The Go pattern (largest gains early in the game, where positions recur and AI lines can be studied in advance) predicts that solver study pays off fastest in high-frequency, low-branching poker spots: preflop and common flop continuation-bet situations. Later streets require transferable understanding rather than stored lines.
- Weaker players gaining most suggests a solver tool need not be reserved for advanced users, provided the output is digestible.
- Schut et al. show strong players can acquire an unnamed concept from a curated set of examples with solutions. Curated "concept packs" of spots sharing one underlying idea may teach as much as prose explanation, at least for experts; novices likely need the idea stated (section 6).
- The Maia rationale suggests grading feedback by the size of the mistake relative to the learner's level, and showing the simplest strong strategy before the exact mixed equilibrium.

### Gaps
- No study was found that experimentally compares "show the best move" against "show the best move plus reasons" for humans learning from game AI. This is the central open question for a solver-based tool.
- No evidence was found on whether AI access reduces human understanding or creates dependence in chess or Go; Shin et al.'s rise in novelty points, if anything, the other way.
- Whether the Go improvements reflect memorised AI openings or deeper understanding is not resolved by these studies.

## 6. Conceptual understanding versus memorisation; schemas, transfer and explanations

### Takeaway
Experts organise knowledge around deep principles, and learners who generate explanations or compare multiple examples form schemas that transfer to new problems; in the one chess experiment on this, self-explaining beat both watching and predicting. Transfer remains narrow: skills generalise to structurally similar situations within the domain, not broadly.

### Cited Findings
- [PR] Chi, Feltovich & Glaser (1981, Cognitive Science): experts sort physics problems by deep structure (the governing principle); novices sort by surface features. — [Chi, Feltovich & Glaser technical report](https://apps.dtic.mil/sti/pdfs/ADA100301.pdf)
- [PR] Gick & Holyoak (1983, Cognitive Psychology): a single prior example rarely transferred spontaneously; when learners described the similarities between two analogous examples they often induced a general schema, and the quality of that schema predicted transfer to a new problem. — [Gick & Holyoak 1983](https://deepblue.lib.umich.edu/items/196ea13e-fb69-4a74-a6f9-864c81aed465/full)
- [PR] de Bruin, Rikers & Schmidt (2007, Contemporary Educational Psychology): novices learning the king-and-rook versus king endgame either observed the computer's moves, predicted them, or predicted and self-explained them. The self-explanation group understood the endgame principles better and checkmated more often at test. Prediction alone was no better than observation. — [de Bruin et al. 2007](https://pure.eur.nl/en/publications/the-effect-of-self-explanation-and-prediction-on-the-development-/)
- [PR] Sala & Gobet (2017, Current Directions in Psychological Science): across meta-analyses of chess, music and working-memory training, effects on general cognitive or academic outcomes shrink toward zero as study quality rises; far transfer is weakly supported at best. — [Sala & Gobet 2017, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5724589)
- [PR] Template theory links recognised patterns to plans and evaluations, i.e. expert "pattern memory" is not bare memorisation but patterns bound to meaning. — [Springer, Memory & Cognition 2017](https://link.springer.com/article/10.3758/s13421-017-0768-2)
- [PRACTITIONER] Poker coaches near-unanimously advise learning the logic behind solver outputs and extracting heuristics rather than memorising frequencies. — [PokerStrategy](https://www.pokerstrategy.com/news/world-of-poker/Why-everyone-argues-about-GTO_125115/)

### Inferences
- The de Bruin result is the closest experimental analogue to solver study: watching solver output, or even guessing it and seeing the answer, may teach little principle unless the learner must also say why. A "predict, then explain, then compare with a reference explanation" mode is the best-supported design for conceptual learning.
- Gick & Holyoak supports a "compare two spots" mode: show two structurally similar spots with different surface cards (or two similar-looking spots with different answers) and ask what drives the strategy.
- Chi et al. suggests an assessment: have users sort spots by the principle that governs them; improvement in sorting by structure rather than surface is a marker of growing expertise.
- Memorisation and understanding are complements, not rivals: memorisation is efficient where spots recur exactly (preflop ranges), principles are required where the state space explodes (turn and river). The research does not rank them in general.
- Narrow transfer implies training content should match the user's actual game format, stack depths and positions; skill built in one format should not be assumed to carry to another.

### Gaps
- No experiment compares principle-based with output-memorisation training in poker or any imperfect-information game.
- Evidence that self-explanation helps at expert level (as opposed to novices) in games was not found.
- The role of causal mental models in expert poker play specifically has not been studied.

## 7. Metacognition and self-regulated learning (reviewing own games, error analysis, leak finding)

### Takeaway
Novices are poor judges of what they have learned, experts are better calibrated, and reflective (not ruminative) self-review is associated with better poker decisions. Direct causal evidence that reviewing one's own games drives improvement is weak; the support is correlational or practitioner tradition.

### Cited Findings
- [PR] de Bruin and colleagues (2007, European Journal of Cognitive Psychology): when learning a chess endgame, experienced players showed higher monitoring (metacomprehension) accuracy and better self-regulation than novices, whose monitoring accuracy was close to zero. — [de Bruin dissertation, Erasmus repository](https://repub.eur.nl/pub/8144/proefschrift_de_bruin_final2.pdf)
- [PR] In a 2005 study by the same group, asking learners to make judgments of learning improved self-regulatory behaviour (choosing what to restudy) but produced no, or even negative, performance differences. — [de Bruin et al. 2005 record](https://zendy.io/title/10.1002/acp.1109)
- [PR-secondary] Poker: correct-decision probability increased with self-reflection and experience; experienced players ruminate less. — [Palomäki thesis summary, CORE](https://core.ac.uk/download/33734863.pdf)
- [PR-secondary] Serious solitary study, which in chess includes analysing games and positions, is the strongest practice predictor of rating. — [Burgoyne et al. 2019](https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf)
- [PR] Deliberate practice presupposes a diagnosis of the specific weakness to be trained, traditionally supplied by a teacher. — [Ericsson & Harwell 2019, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411)

### Inferences
- Because novices cannot tell what they do not know, a tool should not rely on users choosing what to study; it should diagnose leaks from the user's drill results or imported hands and steer practice, playing the coach's role.
- Confidence ratings before the answer is revealed would expose miscalibration (confidently wrong spots are the highest-value review items), but the 2005 result warns that prompting self-monitoring alone does not improve performance; it has to feed into what gets practised.
- Review prompts should be framed analytically (what information did I miss, what principle applies) rather than around outcomes, consistent with the reflection-versus-rumination distinction.

### Gaps
- No controlled study was found on the effect of hand-history review, database leak finding or coaching on poker win rate.
- No study isolates "analysing one's own games" from other forms of solitary chess study.
- Evidence on error-focused review (studying one's mistakes versus new material) in games was not located.
