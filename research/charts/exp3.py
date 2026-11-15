# Experiment 3. The second axis. Betting on the flop and turn does not fall in bands by strength. For each decision the
# hands are placed on a map with two axes and the map is cut into at most six regions (a small tree); the share of what
# the hands do that the regions account for says how well that pair of axes would draw as a picture. Every pair is tried.
import numpy as np, json, itertools, collections, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor
from load import load
D = [d for d in load() if 0.12 < d['y'] < 0.88 and not d['facing'] and d['street'] < 5]
rng = np.random.default_rng(5); D = [D[i] for i in rng.choice(len(D), min(900, len(D)), replace=False)]
AX = {'equity': lambda d: d['e'], 'beats now': lambda d: d['now'], 'draw (equity still to come)': lambda d: d['draw'], 'outs': lambda d: d['outs'].astype(float), 'equity against his best hands': lambda d: d['top'],
      'what bad cards cost it': lambda d: d['down'], 'what good cards add': lambda d: d['up'], 'rank in own range': lambda d: np.argsort(np.argsort(d['e'])) / len(d['e'])}
def r2(X, a, w, leaves):
    m = DecisionTreeRegressor(max_leaf_nodes=leaves, min_samples_leaf=3).fit(X, a, sample_weight=w); p = m.predict(X); mu = (w * a).sum() / w.sum(); return 1 - (w * (a - p) ** 2).sum() / (w * (a - mu) ** 2).sum()
res = collections.defaultdict(list)
for d in D:
    a, w = d['wag'].astype(float), d['w'].astype(float); cols = {k: f(d).astype(float) for k, f in AX.items()}
    if any(np.isnan(c).mean() > 0.05 for c in cols.values()) or (w * (a - (w * a).sum() / w.sum()) ** 2).sum() < 1e-6: continue
    cols = {k: np.nan_to_num(c) for k, c in cols.items()}; st = d['street']
    for k in AX: res[(st, k)].append(r2(cols[k][:, None], a, w, 4)); 
    for k1, k2 in itertools.combinations(AX, 2): res[(st, k1 + ' x ' + k2)].append(r2(np.c_[cols[k1], cols[k2]], a, w, 6))
    res[(st, 'all axes, six regions')].append(r2(np.c_[tuple(cols.values())], a, w, 6)); res[(st, 'all axes, twelve regions')].append(r2(np.c_[tuple(cols.values())], a, w, 12))
out = {}
for st in (3, 4):
    rows = sorted(((np.mean(v), k, len(v)) for (s, k), v in res.items() if s == st), reverse=True); print(f'\n== betting, street {st}: {rows[0][2]} decisions. Share of what hands do that the picture accounts for')
    for m, k, n in rows: print(f'  {100*m:4.0f}%  {k}'); out[f'{st}|{k}'] = float(m)
json.dump(out, open('out/exp3.json', 'w'), indent=1)
