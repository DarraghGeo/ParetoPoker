# Third pass: the bluffs are the hands that cannot win a showdown (the air), and how many of them bet depends on how much
# of his range has to fold: all of them when he is weak enough that he cannot defend, none when he has little to fold,
# the usual ratio between. Searched on the first-order values; relative to the base rule = 100.
import json, numpy as np, itertools
R = [json.loads(l) for l in open('out/values.jsonl')]; n = 20
def run(what):
    rows = [r for r in R if r['what'] == what and r['round'] == 1 and r['s'] > 0]
    D = [(np.array(r['bins']), r['reach'], np.array(r['his']), r['s']) for r in rows]
    def loss(rule): return sum(((lambda p: (p * B[:, 2] + (1 - p) * B[:, 3]).sum() * reach)(rule(B[:, 0], his, s))) for B, reach, his, s in D)
    def base(w, his, s):
        t = 1 - 1 / (2 * (1 + s)); loud = np.zeros(n); k0 = int(np.ceil(t * n - 1e-9)); loud[k0:] = 1; room = s / (1 + s) * w[k0:].sum()
        for k in range(k0):
            if room <= 0: break
            take = min(1, room / w[k]) if w[k] > 0 else 0; loud[k] = take; room -= w[k] * take
        return loud
    b0 = loss(base); floor = sum((np.minimum(B[:, 2], B[:, 3]).sum() * reach) for B, reach, his, s in D); res = []
    for t, air, cut, lo, hi, gate in itertools.product((0.75, 0.8, 0.85), (1, 2, 3), (4, 6, 8), (0.1, 0.2, 0.3), (0.3, 0.4, 0.5, 9), ((9,) if what == 'checkedTo' else (0.15, 0.2, 0.25, 0.3, 9))):
        if hi < lo: continue
        def rule(w, his, s, t=t, air=air, cut=cut, lo=lo, hi=hi, gate=gate):
            loud = np.zeros(n)
            if his[16:].sum() > gate: return loud
            k0 = int(round(t * n)); loud[k0:] = 1; weak = his[:cut].sum()
            if weak >= hi: loud[:air] = 1
            elif weak >= lo:
                room = s / (1 + s) * w[k0:].sum()
                for k in range(air):
                    if room <= 0: break
                    take = min(1, room / w[k]) if w[k] > 0 else 0; loud[k] = take; room -= w[k] * take
            return loud
        res.append((loss(rule) / b0, t, air * 5, cut * 5, lo, hi, gate))
    res.sort(); print(f'\n== river, {what}: base 100, floor {100*floor/b0:.0f}. Best (loss, value from, air = equity under, his weak = under, ratio bluffs from weak share, all air from weak share, bet only if his 80+ at most):')
    for r in res[:6]: print('   ', round(100 * r[0], 1), r[1:])
run('checkedTo'); run('first')
