# Full-hand results for a set of arms: what each gives up, how exploitable, how often it bets.
import json, sys, numpy as np
R = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]; print(len(R), 'spots', {a: sum(r['action'] == a for r in R) for a in sorted({r['action'] for r in R})})
b = lambda r, k: (r['loss']['oop'][k] + r['loss']['ip'][k]) / 2
for k in R[0]['loss']['oop']: print(f'{k:12s}', *(f'{np.mean([r["loss"][s][k] for r in R]):5.2f}' for s in ('oop', 'ip')), f'{np.mean([b(r, k) for r in R]):5.2f}', f'  median {np.median([b(r, k) for r in R]):.2f}')
print('br', {k: round(float(np.mean([(r['br']['oop'][k] + r['br']['ip'][k]) / 2 for r in R])), 1) for k in R[0]['br']['oop']})
for side in ('oop', 'ip'):
    for k in R[0]['freq'][side]: print(side, f'{k:11s}', ' / '.join(f'{100*np.mean([r["freq"][side][k][s] for r in R]):3.0f}%' for s in range(3)))
