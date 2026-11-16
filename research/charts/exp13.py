# Experiment 13. Teaching the bet frequency as a word, not a number. The rule of experiment 12 gives a frequency; the
# player keeps only its word (three words: mostly check, mixed, mostly bet; or five), and plays what the word means to
# them, which may be up to 20 points higher or lower than the word's middle. How far from the solution does that leave them,
# and how much of it is the rule, the word, and the vagueness? Cost is read off the errors study (research/value): points
# too passive cost 0.12 (turn) and 0.135 (river) % of the pot each, too aggressive 0.025 and 0.07; the flop is given the turn's.
import numpy as np
src = open('exp12.py').read(); exec(src.split("print('\\nPoints out")[0])
rng = np.random.default_rng(7); REPS = 40; COST = {3: (.12, .025), 4: (.12, .025), 5: (.135, .07)}
def word(p, k): return np.minimum(k - 1, np.floor(np.clip(p, 0, .999) * k)).astype(int)
def played(p, k, vague): mid = (word(p, k)[None, :] + .5) / k; return np.clip(mid + rng.uniform(-vague, vague, (REPS, len(p))), 0, 1)
def cost(d, st): passive, loud = COST[st]; return 100 * np.where(d < 0, -d * passive, d * loud)
print(f'{"":58s}' + ''.join(f'{NAMES[s]:>22s}' for s in (3, 4, 5))); print(f'{"":58s}' + '   points out   cost' * 3)
rule = {s: np.array([sum(r[f'w{k}'] * carried(r)[k] for k in range(3)) for _, r in T[T.street == s].iterrows()]) for s in (3, 4, 5)}
def line(name, f):
    out = []
    for s in (3, 4, 5): t = T[T.street == s]; p = np.atleast_2d(f(s, t)); d = p - t.F.values[None, :]; out.append(f'{100*np.abs(d).mean():11.1f} {cost(d, s).mean():7.2f}')
    print(f'{name:58s}' + ''.join(f'{x:>22s}' for x in out))
line('always the average', lambda s, t: np.full(len(t), t.F.mean()))
line('the rule\'s number, played exactly', lambda s, t: rule[s])
for k, nm in ((3, 'three words'), (5, 'five words')):
    line(f'{nm}: the rule\'s word, played at its middle', lambda s, t: played(rule[s], k, 0))
    line(f'{nm}: the rule\'s word, 10 points either way', lambda s, t: played(rule[s], k, .1))
    line(f'{nm}: the rule\'s word, 20 points either way', lambda s, t: played(rule[s], k, .2))
    line(f'{nm}: the right word, played at its middle', lambda s, t: played(t.F.values, k, 0))
    line(f'{nm}: the right word, 20 points either way', lambda s, t: played(t.F.values, k, .2))
line('a player 20 points either way round the right number', lambda s, t: np.clip(t.F.values[None, :] + rng.uniform(-.2, .2, (REPS, len(t))), 0, 1))
line('leaning to bet: the rule\'s word (three), middle plus 10', lambda s, t: np.clip(played(rule[s], 3, .2) + .1, 0, 1))
print('\nDoes the rule name the solution\'s word? (three words: right | one out | opposite; five words: right | one out | further)')
for s in (3, 4, 5):
    t = T[T.street == s]; a3 = np.abs(word(rule[s], 3) - word(t.F.values, 3)); a5 = np.abs(word(rule[s], 5) - word(t.F.values, 5))
    print(f'  {NAMES[s]:6s} ' + ' | '.join(f'{100*(a3 == k).mean():.0f}%' for k in range(3)) + '     ' + ' | '.join(f'{100*x:.0f}%' for x in ((a5 == 0).mean(), (a5 == 1).mean(), (a5 > 1).mean())) + f'     the solution\'s own words: ' + ', '.join(f'{100*(word(t.F.values, 3) == k).mean():.0f}%' for k in range(3)))
