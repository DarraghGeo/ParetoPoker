# Decisions from collect.mjs as arrays. For each: S[lv, eb, cb] the share of the range in a cell (level, equity step, what is
# still to come), and R[a, lv, eb, cb] what always taking action a there gives up (pots at the decision, times the share).
import json, glob, os, numpy as np
AXIS = os.environ.get('AXIS', 'eq')   # the twenty-step axis: equity against his range, or (now) how much of his range the hand beats as the board stands
EST = {3: (0.09, 0.73, 0.05, 0.18), 4: (0.05, 0.84, 0.0, 0.10), 5: (0.0, 1.0, 0.0, 0.0)}   # equity from the chart: a + b x beaten now + a gutshot or overcards + a draw
def est(street, nb, cb): a, b, g, dr = EST[street]; return int(max(0, min(19, np.floor(20 * (a + b * (nb + .5) / 20 + (g if cb == 1 else dr if cb == 2 else 0))))))
def load(pattern=os.environ.get('PATTERN', 'out/cells-*.jsonl')):
    D = []
    for f in sorted(glob.glob(pattern)):
        for l in open(f):
            try: r = json.loads(l)
            except Exception: continue
            k = len(r['acts']); S = np.zeros((8, 20, 3)); R = np.zeros((k, 8, 20, 3)); P = np.zeros((k, 8, 20, 3))
            for c in r['cells']:
                lv, eb, cb, nb, w = c[0], c[1], c[2], c[3], c[4]; eb = nb if AXIS == 'now' else est(r['street'], nb, cb) if AXIS == 'est' else eb; S[lv, eb, cb] += w
                for a in range(k): P[a, lv, eb, cb] += w * c[5 + a]; R[a, lv, eb, cb] += w * c[5 + k + a]
            if S.sum() <= 0: continue
            S /= S.sum(); kinds = [a[0] for a in r['acts']]; sizes = [a[1] for a in r['acts']]; hisE = np.array(r['hisN'] if AXIS in ('now', 'est') else r['hisE']); hisLv = np.array(r['hisLv']); e = (np.arange(20) + .5) / 20
            d = dict(spot=r['spot'], pre=r['action'], street=r['street'], what=r['what'], ip=r['seat'], faced=r['faced'], spr=r['spr'], pot=r['pot'], kinds=kinds, sizes=sizes, S=S, R=R, P=P, hisE=hisE, hisLv=hisLv,
                     weight=r['reach'][0] * r['reach'][1] * r['pot'], eq=float((S.sum((0, 2)) * e).sum()), his_strong=float(hisE[16:].sum()), his_weak=float(hisE[:6].sum()), his_mid=float(hisE[8:14].sum()),
                     my_strong=float(S[:, 16:].sum()), my_weak=float(S[:, :6].sum()), top_me=float(S[4:].sum()), top_him=float(hisLv[4:].sum()), nut_me=float(S[6:].sum()), nut_him=float(hisLv[6:].sum()))
            d['gap'] = d['eq'] - 0.5; d['sol'] = float((P * R).sum() / 1) if False else float(sum((P[a] / np.maximum(S, 1e-12) * R[a]).sum() for a in range(k))); d['freq'] = [float(P[a].sum()) for a in range(k)]
            D.append(d)
    return D
def wmean(D, f): w = np.array([d['weight'] for d in D]); return float((w * np.array([f(d) for d in D])).sum() / w.sum()) if len(D) else float('nan')
