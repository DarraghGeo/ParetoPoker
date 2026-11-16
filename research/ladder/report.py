# What the whole method gives up over the full hand, from out/play.jsonl.
import json, numpy as np
R = [json.loads(l) for l in open('out/play.jsonl') if l.strip()]; print(len(R), 'flop spots:', {a: sum(r['action'] == a for r in R) for a in sorted({r['action'] for r in R})})
m = lambda f: np.mean([f(r) for r in R]); both = lambda r, k: (r['loss']['oop'][k] + r['loss']['ip'][k]) / 2
print('\nGiven up over the hand, % of the starting pot (out of position | in position | both), and in big blinds per 100 hands')
for k, nm in (('exact', 'the rule\'s number'), ('word', 'the frequency as a word'), ('vague', 'the word, 20 points either way'), ('loose', 'the same, lines 10 points off')):
    print(f'  {nm:34s} {m(lambda r: r["loss"]["oop"][k]):5.2f} | {m(lambda r: r["loss"]["ip"][k]):5.2f} | {m(lambda r: both(r, k)):5.2f}   median {np.median([both(r, k) for r in R]):5.2f}   {m(lambda r: both(r, k) * r["pot"]):5.1f} bb/100')
f, ft, all_ = m(lambda r: both(r, 'flop')), m(lambda r: both(r, 'flopTurn')), m(lambda r: both(r, 'exact'))
print(f'\nWhere it goes (the rule\'s number): flop {f:.2f}, turn {ft - f:.2f}, river {all_ - ft:.2f}')
print('By pot type (the word, 20 points either way):', {a: round(float(np.mean([both(r, 'vague') for r in R if r['action'] == a])), 2) for a in sorted({r['action'] for r in R})})
print(f'To an opponent who answers perfectly: exact {m(lambda r: (r["br"]["oop"]["exact"] + r["br"]["ip"]["exact"]) / 2):.1f}, vague {m(lambda r: (r["br"]["oop"]["vague"] + r["br"]["ip"]["vague"]) / 2):.1f} % of the pot')
print('\nHow often it bets, flop / turn / river (the solution on the same ranges first):')
for side in ('oop', 'ip'):
    for k in ('solution', 'exact', 'vague'): print(f'  {side:4s}{k:9s} ' + ' / '.join(f'{100*np.mean([r["freq"][side][k][s] for r in R]):3.0f}%' for s in range(3)))
