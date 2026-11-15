# Experiment 2. Where does a hand go on the chart? A strip sorts the range along one line and colours it by action. It
# reads well if the colours fall in a few clean bands. For each decision with real mixing: sort the range by a key, cut
# it into k bands at the best places, and measure how much of what the hands do the bands account for (share of the
# variance in "bets" or "continues", weighted by how often each hand is held). The grid's own figure: what the 169
# hand classes account for, and what a coach's hand types account for.
import numpy as np, json, collections
from load import load
D = [d for d in load() if 0.12 < d['y'] < 0.88]
rng = np.random.default_rng(3); pick = rng.choice(len(D), min(2500, len(D)), replace=False); D = [D[i] for i in pick]
def bands(key, a, w, K=5):
    ok = ~np.isnan(key); key, a, w = key[ok], a[ok], w[ok]; o = np.argsort(key, kind='stable'); a, w = a[o], w[o]; n = len(a)
    cw = np.concatenate([[0], np.cumsum(w)]); ca = np.concatenate([[0], np.cumsum(w * a)]); tot = (w * (a - ca[-1] / cw[-1]) ** 2).sum()
    if tot <= 1e-9: return None
    # between-band sum of squares to maximise: sum (sum wa)^2 / sum w
    gain = lambda i, j: (ca[j] - ca[i]) ** 2 / np.maximum(cw[j] - cw[i], 1e-12)
    best = gain(0, np.arange(n + 1)); res = [best[n]]; idx = np.arange(n + 1)
    for k in range(2, K + 1):
        new = np.full(n + 1, -1.0)
        for j in range(k, n + 1): new[j] = (best[k - 1:j] + gain(idx[k - 1:j], j)).max()
        best = new; res.append(best[n])
    base = ca[-1] ** 2 / cw[-1]; return [(r - base) / tot for r in res]
def groups(lab, a, w):
    m = (w * a).sum() / w.sum(); tot = (w * (a - m) ** 2).sum(); s = collections.defaultdict(lambda: [0.0, 0.0])
    for l, x, y in zip(lab, a, w): s[l][0] += y * x; s[l][1] += y
    return (sum(v[0] ** 2 / v[1] for v in s.values()) - (w * a).sum() ** 2 / w.sum()) / tot, len(s)
KEYS = {'equity against his range': lambda d: d['e'], 'beats now (no cards to come)': lambda d: d['now'], 'what the hand is worth in the solution': lambda d: d['v'],
        'equity plus its draw': lambda d: d['e'] + d['draw'], 'equity, draws moved up a notch': lambda d: d['e'] + 0.15 * (d['outs'] >= 8)}
res = collections.defaultdict(list)
for d in D:
    a, w = d['act'].astype(float), d['w'].astype(float); tag = ('facing' if d['facing'] else 'acting', d['street'])
    row = {}
    for name, f in KEYS.items():
        key = f(d).astype(float)
        if np.isnan(key).mean() > 0.2: continue
        b = bands(key, a, w)
        if b: row[name] = b
    if 'equity against his range' not in row: continue
    g, n = groups(d['cls'], a, w); row['grid'] = (g, n); g2, n2 = groups(d['kind'], a, w); row['types'] = (g2, n2)
    # two axes: bands of equity, each split by whether the hand has a real draw
    lab = np.digitize(d['e'], np.quantile(d['e'], [0.25, 0.5, 0.75])) * 2 + (d['outs'] >= 8); row['e4xdraw'] = groups(lab, a, w)
    lab4 = np.digitize(d['e'], np.quantile(d['e'], [0.25, 0.5, 0.75])); row['e4'] = groups(lab4, a, w)
    res[tag].append(row); res[('all', 0)].append(row)
out = {}
for tag in sorted(res):
    R = res[tag]; print(f'\n== {tag[0]}{", street " + str(tag[1]) if tag[1] else ""}: {len(R)} decisions with mixing')
    for name in KEYS:
        S = [r[name] for r in R if name in r]
        if len(S) < 30: continue
        m = np.mean(S, axis=0); base = np.mean([r['equity against his range'] for r in R if name in r], axis=0); print(f'  sorted by {name:42s} bands 1..5 account for: ' + ' '.join(f'{100*x:4.0f}%' for x in m) + f'   (n {len(S)}; by equity on the same decisions: ' + ' '.join(f'{100*x:.0f}%' for x in base[1:4]) + ')'); out[f'{tag}|{name}'] = m.tolist()
    for k, label in (('e4', 'four equal quarters by equity (no best cuts)'), ('e4xdraw', 'the same quarters, each split by draw or no draw'), ('types', "a coach's hand types (top pair, flush draw, ...)"), ('grid', 'the 169 cells of the grid')):
        m = np.mean([r[k][0] for r in R]); n = np.mean([r[k][1] for r in R]); print(f'  {label:54s} accounts for {100*m:4.0f}%  using {n:5.1f} groups'); out[f'{tag}|{k}'] = [float(m), float(n)]
json.dump(out, open('out/exp2.json', 'w'), indent=1)
