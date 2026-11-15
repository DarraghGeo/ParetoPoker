# Experiment 4. Is there a small vocabulary of shapes? Each range's betting is drawn as a strip of ten steps, weakest to
# strongest, each step shaded by how often it bets. If a handful of shapes covers nearly every strip, a player can
# store a spot as one of them. Facing a bet: the same for continuing.
import numpy as np, json
from sklearn.cluster import KMeans
from load import load
D = load(); out = {}
def profile(d, n=10):
    o = np.argsort(d['e'], kind='stable'); w = d['w'][o].astype(float); a = d['act'][o].astype(float); c = np.cumsum(w) / w.sum(); b = np.minimum((c * n - 1e-9).astype(int), n - 1)
    return np.array([(w[b == i] * a[b == i]).sum() / max(w[b == i].sum(), 1e-9) for i in range(n)])
for name, pick in (('betting', lambda d: not d['facing']), ('continuing against a bet', lambda d: d['facing'])):
    P = np.array([profile(d) for d in D if pick(d)]); tot = ((P - P.mean(0)) ** 2).sum(); print(f'\n== {name}: {len(P)} strips'); out[name] = {}
    for k in (3, 4, 5, 6, 8):
        km = KMeans(k, n_init=5, random_state=1).fit(P); print(f'  {k} shapes account for {100*(1-km.inertia_/tot):.0f}% of how strips differ')
        out[name][k] = float(1 - km.inertia_ / tot)
        if k == 5:
            for i in np.argsort(-np.bincount(km.labels_)): print(f'     {100*(km.labels_==i).mean():3.0f}% of strips, weakest -> strongest: ' + ' '.join(f'{round(100*x):3d}' for x in km.cluster_centers_[i]))
            out[name]['shapes'] = [dict(share=float((km.labels_ == i).mean()), profile=km.cluster_centers_[i].round(3).tolist()) for i in np.argsort(-np.bincount(km.labels_))]
json.dump(out, open('out/exp4.json', 'w'), indent=1)
