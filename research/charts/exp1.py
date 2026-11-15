# Experiment 1. Does a chart imply the answer? What a viewer can read off each chart is reduced to a few numbers (its
# landmarks); a shallow rule (a tree three questions deep: about what a person can hold) and a flexible model (the
# ceiling) are then asked to give the solver's range-level answers on boards they have not seen.
import numpy as np, pandas as pd, json, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold
from load import load
D = load()
def share(e, w, lo, hi): return float(w[(e >= lo) & (e < hi)].sum() / w.sum())
def q(e, w, p): o = np.argsort(e); c = np.cumsum(w[o]) / w.sum(); return float(e[o][min(np.searchsorted(c, p), len(e) - 1)])
rows = []
for d in D:
    e, w = d['e'], d['w']; ok = ~np.isnan(d['he']); he, hw = d['he'][ok], d['hw'][ok]
    if hw.sum() <= 0: continue
    r = dict(spot=d['spot'], street=d['street'], facing=d['facing'], y=d['y'], size=d['size'], raise_=d['raise_'], first=d['line'].endswith('first'),
             c_street=d['street'], c_s=d['s'], c_spr=min(d['spr'], 15), c_seat=d['seat'])
    r['mean_me'] = float((e * w).sum() / w.sum()); r['mean_him'] = float((he * hw).sum() / hw.sum())
    for p in (10, 25, 50, 75, 90): r[f'curve_q{p}'] = q(e, w, p / 100)
    for name, (lo, hi) in dict(trash=(0, .33), weak=(.33, .5), good=(.5, .75), strong=(.75, 1.01)).items(): r[f'box_me_{name}'] = share(e, w, lo, hi); r[f'box_him_{name}'] = share(he, hw, lo, hi)
    for c in (.5, .6, .7, .8, .9): r[f'top{int(c*100)}_me'] = share(e, w, c, 1.01); r[f'top{int(c*100)}_him'] = share(he, hw, c, 1.01); r[f'top{int(c*100)}_gap'] = r[f'top{int(c*100)}_me'] - r[f'top{int(c*100)}_him']
    for c in (.2, .33, .4): r[f'bot{int(c*100)}_me'] = share(e, w, 0, c); r[f'bot{int(c*100)}_him'] = share(he, hw, 0, c); r[f'bot{int(c*100)}_gap'] = r[f'bot{int(c*100)}_me'] - r[f'bot{int(c*100)}_him']
    r['mid_me'] = share(e, w, .4, .7); r['mid_him'] = share(he, hw, .4, .7)
    rows.append(r)
T = pd.DataFrame(rows); CTX = ['c_street', 'c_s', 'c_spr', 'c_seat']
SETS = {
  'nothing but the situation (street, size faced, stack, seat)': [],
  'average equity only (one number each)': ['mean_me', 'mean_him'],
  'equity curve, own range (five points)': [f'curve_q{p}' for p in (10, 25, 50, 75, 90)],
  'four-box card (strong/good/weak/nothing, both)': [c for c in T.columns if c.startswith('box_')],
  'two strips, four landmarks (tops and bottoms)': ['box_me_strong', 'box_him_strong', 'box_me_trash', 'box_him_trash'],
  'two strips, tops only': ['box_me_strong', 'box_him_strong'],
  'two strips with the very top marked (90%+)': ['box_me_strong', 'box_him_strong', 'box_me_trash', 'box_him_trash', 'top90_me', 'top90_him'],
}
POOL = [c for c in T.columns if c.startswith(('top', 'bot', 'mid_', 'mean_', 'box_'))]
def score(X, y, g, model):
    pred = np.zeros(len(y)); 
    for tr, te in GroupKFold(5).split(X, y, g): m = model(); m.fit(X[tr], y[tr]); pred[te] = m.predict(X[te])
    cl = lambda v: np.digitize(v, [0.3, 0.7]); return dict(mae=float(np.abs(pred - y).mean()), r2=float(1 - ((pred - y) ** 2).sum() / ((y - y.mean()) ** 2).sum()), three=float((cl(pred) == cl(y)).mean()))
tree = lambda: DecisionTreeRegressor(max_depth=3, min_samples_leaf=40); gbm = lambda: HistGradientBoostingRegressor(max_depth=4, max_iter=200, learning_rate=0.06)
TASKS = {'how often the range bets (first to act or checked to)': (T[~T.facing], 'y'), 'how often the range continues facing a bet': (T[T.facing], 'y'),
         'how big the range bets (flop, three sizes on offer)': (T[(~T.facing) & (T.street == 3) & T['size'].notna()], 'size'), 'how often the range raises facing a bet': (T[T.facing & T.raise_.notna()], 'raise_')}
out = {}
for task, (t, col) in TASKS.items():
    y = t[col].values; g = t.spot.values; print(f'\n== {task}: {len(t)} decisions, mean {y.mean():.2f}, sd {y.std():.2f}'); out[task] = {}
    for name, cols in SETS.items():
        X = t[CTX + cols].values; a = score(X, y, g, tree); b = score(X, y, g, gbm); out[task][name] = dict(rule=a, ceiling=b)
        print(f'  {name:62s} simple rule: off by {100*a["mae"]:5.1f} pts, R2 {a["r2"]:5.2f}, band right {100*a["three"]:3.0f}% | ceiling: {100*b["mae"]:5.1f} pts, R2 {b["r2"]:5.2f}')
    # which landmarks a chart should carry: forward selection of up to four, for the simple rule
    chosen = []
    for k in range(4):
        best = None
        for c in POOL:
            if c in chosen: continue
            sc = score(t[CTX + chosen + [c]].values, y, g, tree)['mae']
            if best is None or sc < best[0]: best = (sc, c)
        chosen.append(best[1]); print(f'  best {k+1} landmark(s) for a simple rule: {chosen}  -> off by {100*best[0]:.1f} pts')
    out[task]['selected'] = chosen
    X = t[CTX + POOL].values; b = score(X, y, g, gbm); print(f'  everything in the pool, flexible model: off by {100*b["mae"]:.1f} pts, R2 {b["r2"]:.2f}'); out[task]['all'] = b
json.dump(out, open('out/exp1.json', 'w'), indent=1)
