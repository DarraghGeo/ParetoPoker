# What tells a spot where the weak hands bluff from one where they do not, and where the value line falls?
import json, numpy as np, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor, export_text
R = [json.loads(l) for l in open('out/values.jsonl')]
def feats(r):
    B = np.array(r['bins']); w = B[:, 0]; tot = w.sum(); my = w / tot; his = np.array(r['his']); n = 20
    cum = lambda a, lo, hi: float(a[int(lo * n):int(hi * n)].sum())
    f = dict(my_air=cum(my, 0, .15), my_weak=cum(my, .15, .4), my_mid=cum(my, .4, .7), my_good=cum(my, .7, .9), my_nuts=cum(my, .9, 1.01), my_top80=cum(my, .8, 1.01), my_top70=cum(my, .7, 1.01),
             his_air=cum(his, 0, .15), his_weak=cum(his, .15, .4), his_mid=cum(his, .4, .7), his_good=cum(his, .7, .9), his_nuts=cum(his, .9, 1.01), his_top80=cum(his, .8, 1.01), his_top70=cum(his, .7, 1.01), his_bottom30=cum(his, 0, .3), his_bottom40=cum(his, 0, .4),
             my_eq=float((my * (np.arange(n) + .5) / n).sum()), s=r['s'], pot=r['nodePot'], seat=r['seat'])
    f['air_per_value'] = f['my_air'] / max(f['my_top70'], 1e-3); f['nut_gap'] = f['my_nuts'] - f['his_nuts']; f['top_gap'] = f['my_top80'] - f['his_top80']
    return f, B
for what in ('checkedTo', 'first'):
    rows = [r for r in R if r['what'] == what and r['round'] == 1 and r['s'] > 0 and r['reach'] * r['tot'] > 5]
    X = []; yb = []; wb = []; vline = []; wv = []; ytop = []; wtop = []
    for r in rows:
        f, B = feats(r); reach = r['reach']; w, L, RB, RQ = B[:, 0], B[:, 1], B[:, 2] * reach, B[:, 3] * reach
        air = slice(0, 3); gain = (RQ[air].sum() - RB[air].sum())                 # > 0: bluffing the air beats checking it
        X.append(list(f.values())); yb.append(gain > 0); wb.append(abs(gain))
        # the best value line: bet every step from k up (steps 8 and above), check from 3 to k
        costs = [RQ[3:k].sum() + RB[k:].sum() for k in range(8, 21)]; k = 8 + int(np.argmin(costs)); vline.append(k / 20); wv.append(max(costs) - min(costs))
        top = slice(18, 20); g = RQ[top].sum() - RB[top].sum(); ytop.append(g > 0); wtop.append(abs(g))
    X = np.array(X); names = list(feats(rows[0])[0].keys()); yb = np.array(yb); wb = np.array(wb); vline = np.array(vline); wv = np.array(wv)
    print(f'\n==== river, {what}: {len(rows)} decisions')
    print(f'  bluffing the air is right in {100*np.average(yb, weights=wb):.0f}% (by what is at stake); betting the top tenth is right in {100*np.average(ytop, weights=wtop):.0f}%; best value line: mean {np.average(vline, weights=wv):.2f}, quartiles {np.quantile(vline, [.25, .5, .75])}')
    for target, y, w, model in (('BLUFF THE AIR?', yb, wb, DecisionTreeClassifier(max_depth=2, min_samples_leaf=25)), ('VALUE LINE', vline, wv, DecisionTreeRegressor(max_depth=2, min_samples_leaf=25)), ('BET THE TOP?', np.array(ytop), np.array(wtop), DecisionTreeClassifier(max_depth=2, min_samples_leaf=25))):
        m = model.fit(X, y, sample_weight=w); print(f'  {target}  (fit {m.score(X, y, sample_weight=w):.2f})'); print('    ' + export_text(m, feature_names=names, decimals=2).replace('\n', '\n    '))
        cors = sorted(((abs(np.corrcoef(X[:, j], y.astype(float))[0, 1]), names[j], np.corrcoef(X[:, j], y.astype(float))[0, 1]) for j in range(len(names)) if X[:, j].std() > 0), reverse=True)[:6]
        print('    strongest single inputs:', ', '.join(f'{n} {c:+.2f}' for _, n, c in cors))
