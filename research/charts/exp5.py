# Experiment 5. A line on the strip. The strip is sorted by equity now; a line beside it shows each hand's equity on the
# next card: its best card, its average, its median, and so on. Does that line follow the actions?
#  a. on its own: how much of what hands do each line accounts for (weighted correlation squared, and best bands if the
#     strip were sorted by the line instead);
#  b. as an addition: what the line's distance from the strip (line minus equity now) adds to five strength bands;
#  c. as a second axis: six regions on (equity, line) against six on equity alone.
import json, sys, numpy as np, collections, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor
LINES = {'best next card (max)': 4, 'worst next card (min)': 5, 'average next card (mean)': 6, 'median next card': 7, 'upper quarter of next cards': 8, 'lower quarter of next cards': 9, 'how spread the next cards are (sd)': 10, 'share of next cards that make it strong (70%+)': 11}
def wcorr(x, y, w): mx = (w * x).sum() / w.sum(); my = (w * y).sum() / w.sum(); c = (w * (x - mx) * (y - my)).sum(); v = np.sqrt((w * (x - mx) ** 2).sum() * (w * (y - my) ** 2).sum()); return c / v if v > 1e-12 else 0.0
def bands(key, a, w, K=5):
    o = np.argsort(key, kind='stable'); a, w = a[o], w[o]; n = len(a); cw = np.concatenate([[0], np.cumsum(w)]); ca = np.concatenate([[0], np.cumsum(w * a)]); tot = (w * (a - ca[-1] / cw[-1]) ** 2).sum()
    gain = lambda i, j: (ca[j] - ca[i]) ** 2 / np.maximum(cw[j] - cw[i], 1e-12); best = gain(0, np.arange(n + 1)); idx = np.arange(n + 1); cuts = None
    for k in range(2, K + 1):
        new = np.full(n + 1, -1.0)
        for j in range(k, n + 1): new[j] = (best[k - 1:j] + gain(idx[k - 1:j], j)).max()
        best = new
    return (best[n] - ca[-1] ** 2 / cw[-1]) / tot
def tree(X, a, w, leaves=6): m = DecisionTreeRegressor(max_leaf_nodes=leaves, min_samples_leaf=3).fit(X, a, sample_weight=w); p = m.predict(X); mu = (w * a).sum() / w.sum(); return 1 - (w * (a - p) ** 2).sum() / (w * (a - mu) ** 2).sum(), p
R = collections.defaultdict(lambda: collections.defaultdict(list))
for root in ('flop', 'turn'):
    try: rows = [json.loads(l) for l in open(f'out/nextcard-{root}.jsonl')]
    except FileNotFoundError: continue
    for r in rows:
        H = np.array([h[1:] for h in r['hands']], float); 
        if len(H) < 40: continue
        w, e, a = H[:, 0], H[:, 1], H[:, 2]; y = (w * a).sum() / w.sum()
        if not 0.12 < y < 0.88: continue
        tag = f"{root}, {'facing a bet' if r['facing'] else 'betting'}"; S = R[tag]; S['n'].append(1)
        S['strip by equity now: 5 bands'].append(bands(e, a, w)); r6, p6 = tree(e[:, None], a, w); S['equity now alone: 6 regions'].append(r6); res = a - p6
        for name, col in LINES.items():
            x = H[:, col - 1]; S[f'a. {name}: on its own (r squared)'].append(wcorr(x, a, w) ** 2); S[f'a. {name}: strip sorted by it, 5 bands'].append(bands(x, a, w))
            S[f'b. {name}: tracks what strength bands miss (r)'].append(wcorr(x - e, res, w)); S[f'c. {name}: as second axis, 6 regions'].append(tree(np.c_[e, x], a, w)[0])
out = {}
for tag in sorted(R):
    S = R[tag]; print(f"\n== {tag}: {len(S['n'])} decisions with mixing"); out[tag] = {}
    for k in ['strip by equity now: 5 bands', 'equity now alone: 6 regions']: print(f'  {k:62s} {100*np.mean(S[k]):4.0f}%'); out[tag][k] = float(np.mean(S[k]))
    for part in 'abc':
        for k in sorted((k for k in S if k.startswith(part + '.')), key=lambda k: -abs(np.mean(S[k]))):
            m = np.mean(S[k]); print(f'  {k:62s} ' + (f'{m:+.2f}  (same sign in {100*np.mean(np.sign(S[k]) == np.sign(m)):.0f}% of decisions)' if 'tracks' in k else f'{100*m:4.0f}%')); out[tag][k] = float(m)
json.dump(out, open('out/exp5.json', 'w'), indent=1)
