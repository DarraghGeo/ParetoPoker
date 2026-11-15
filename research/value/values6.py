import json, numpy as np
R = [json.loads(l) for l in open('out/values.jsonl')]; n = 20
rows = [r for r in R if r['what'] == 'first' and r['round'] == 1 and r['s'] > 0 and r['reply']]
f = lambda v: ' '.join(f'{x:5.1f}' for x in v)
def groups(key, cuts, label):
    print(f'\nfirst to act on the river, by {label}:')
    for lo, hi in zip(cuts[:-1], cuts[1:]):
        G = [r for r in rows if lo <= key(r) < hi]
        if len(G) < 15: continue
        W = np.zeros(n); S = np.zeros(n); RB = np.zeros(n); RQ = np.zeros(n); stab = []
        for r in G:
            B = np.array(r['bins']); W += B[:, 0] * r['reach']; S += B[:, 1] * r['reach']; RB += B[:, 2] * r['reach']; RQ += B[:, 3] * r['reach']
        act = S / np.maximum(W, 1e-9); better = np.where(RB < RQ, 'B', 'x')
        print(f'  {lo:.2f}-{hi:.2f} (n {len(G)}, weight {W.sum():.0f}): range bets {100*S.sum()/W.sum():3.0f}%')
        print('     solution bets % by step', f(100 * act)); print('     better on the whole    ', '     '.join(better))
groups(lambda r: sum(r['his'][16:]), [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.01], 'his share of hands with 80%+ equity')
groups(lambda r: sum(r['his'][:6]), [0, 0.1, 0.2, 0.3, 0.45, 0.6, 1.01], 'his share of hands under 30% equity')
groups(lambda r: sum(np.array(r['bins'])[18:, 0]) / sum(np.array(r['bins'])[:, 0]) - sum(r['his'][18:]), [-1, -0.1, -0.03, 0.03, 0.1, 1], 'nut gap (my 90%+ share less his)')
