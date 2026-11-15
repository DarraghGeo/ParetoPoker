# A second derivation, searched on the first-order values: bluff only when enough of his range has to fold; first to
# act, bet at all only when he does not hold many strong hands himself. Each rule's loss, relative to the base rule's.
import json, numpy as np, itertools
R = [json.loads(l) for l in open('out/values.jsonl')]
n = 20
def prep(what):
    out = []
    for r in R:
        if r['what'] != what or r['round'] != 1 or r['s'] <= 0: continue
        B = np.array(r['bins']); his = np.array(r['his']); reach = r['reach']
        out.append(dict(w=B[:, 0], RB=B[:, 2] * reach, RQ=B[:, 3] * reach, s=r['s'], his=his, hb=lambda x, his=his: float(his[:int(round(x * n))].sum()), ht=lambda x, his=his: float(his[int(round(x * n)):].sum()), my=B[:, 0] / B[:, 0].sum()))
    return out
def plan(d, t, ratio, bluff=True, bet=True):
    loud = np.zeros(n)
    if not bet: return loud
    k0 = int(np.ceil(t * n - 1e-9)); loud[k0:] = 1
    if bluff:
        room = ratio * d['w'][k0:].sum()
        for k in range(k0):
            if room <= 0: break
            take = min(1, room / d['w'][k]) if d['w'][k] > 0 else 0; loud[k] = take; room -= d['w'][k] * take
    return loud
def loss(D, rule): return sum((lambda p: (p * d['RB'] + (1 - p) * d['RQ']).sum())(rule(d)) for d in D)
for what in ('checkedTo', 'first'):
    D = prep(what); base = loss(D, lambda d: plan(d, 1 - 1 / (2 * (1 + d['s'])), d['s'] / (1 + d['s']))); floor = sum(np.minimum(d['RB'], d['RQ']).sum() for d in D); allq = loss(D, lambda d: np.zeros(n))
    print(f'\n== river, {what}: {len(D)} decisions. base rule 100, check everything {100*allq/base:.0f}, best possible in steps {100*floor/base:.0f}')
    res = []
    for t in (0.7, 0.75, 0.8, 0.85):
        for cut in (0.2, 0.3, 0.4):
            for a in (0.2, 0.3, 0.4, 0.5, 0.6):
                res.append((loss(D, lambda d: plan(d, t, d['s'] / (1 + d['s']), bluff=d['hb'](cut) >= a)) / base, f'value from {t}, bluff only if his hands under {cut} equity are {a}+ of his range'))
                for top, b in itertools.product((0.8, 0.9), (0.1, 0.15, 0.2, 0.25, 0.3)):
                    if what == 'first': res.append((loss(D, lambda d: plan(d, t, d['s'] / (1 + d['s']), bluff=d['hb'](cut) >= a, bet=d['ht'](top) <= b)) / base, f'bet at all only if his hands over {top} are at most {b}; value from {t}; bluff if his under {cut} are {a}+'))
    res.sort(); print('  best rules:'); [print(f'    {100*x:5.1f}  {name}') for x, name in res[:6]]
    one = [(loss(D, lambda d: plan(d, t, d['s'] / (1 + d['s']), bluff=False)) / base, f'value from {t}, never bluff') for t in (0.7, 0.75, 0.8, 0.85, 0.9)]; print('  never bluffing:', ', '.join(f'{name.split(",")[0]} {100*x:.0f}' for x, name in one))
