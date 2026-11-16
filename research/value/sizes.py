# What sets the bet size: stack depth, the street, the nuts, or something else? From sizes.mjs.
import json, sys, numpy as np, pandas as pd, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor, export_text
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold
R = [json.loads(l) for l in open('out/sizes.jsonl') if l.strip()]; n = 20; rows = []
for r in R:
    M = np.array(r['mine']); w = M[:, 0]; byS = M[:, 1:]; his = np.array(r['his']); amt = np.array(r['amounts']); bet = byS.sum()
    if bet < 0.08: continue
    c = lambda a, lo, hi=1.0001: float(a[int(round(lo * n)):int(round(hi * n))].sum())
    size = float((byS.sum(0) * amt).sum() / bet); left = 6 - r['street']   # streets of betting left, this one included (turn 2, river 1)
    geo = ((1 + 2 * r['spr']) ** (1 / left) - 1) / 2                       # the size that gets the stacks in by the river in equal steps
    val = byS[14:].sum(0); bl = byS[:6].sum(0)
    rows.append(dict(spot=r['spot'], action=r['action'], street=r['street'], what=r['what'], first=float(r['what'] == 'first'), mult=r['mult'], spr=min(r['spr'], 25), geo=min(geo, 3), bet=bet, size=size, sizecap=min(size, r['spr']),
                     small=float(byS[:, 0].sum() / bet), big=float(byS[:, -1].sum() / bet), biggest=float(amt[-1]),
                     nut_me=c(w, .9), nut_him=c(his, .9), top_me=c(w, .8), top_him=c(his, .8), val_me=c(w, .7), val_him=c(his, .7), air_me=c(w, 0, .25), weak_him=c(his, 0, .3), mid_me=c(w, .4, .7), mid_him=c(his, .4, .7),
                     eq_me=float((w * (np.arange(n) + .5) / n).sum()), value_size=float((val * amt).sum() / max(val.sum(), 1e-9)) if val.sum() > 0.01 else np.nan, bluff_size=float((bl * amt).sum() / max(bl.sum(), 1e-9)) if bl.sum() > 0.01 else np.nan))
T = pd.DataFrame(rows); T['nut_gap'] = T.nut_me - T.nut_him; T['top_gap'] = T.top_me - T.top_him; T['range_gap'] = T.eq_me - 0.5; T['polar'] = T.top_me + T.air_me - T.mid_me; T['nut_per_spr'] = T.nut_gap / (1 + T.spr); T['log_spr'] = np.log1p(T.spr)
print(len(T), 'betting decisions on', T.spot.nunique(), 'spots;', dict(T.street.value_counts()), '| mean size', round(T['size'].mean(), 2), 'pots, sd', round(T['size'].std(), 2))
F = ['street', 'first', 'spr', 'log_spr', 'geo', 'nut_me', 'nut_him', 'nut_gap', 'top_gap', 'range_gap', 'val_me', 'air_me', 'weak_him', 'mid_me', 'mid_him', 'polar', 'eq_me', 'nut_per_spr', 'top_him']
for st in (4, 5):
    t = T[T.street == st]; print(f"\n== {'TURN' if st == 4 else 'RIVER'}: {len(t)} decisions; mean size {t['size'].mean():.2f}; small size {100*t.small.mean():.0f}% of bets, biggest {100*t.big.mean():.0f}%")
    print('  goes with a bigger bet: ' + ', '.join(f'{c} {np.corrcoef(t[c], t["size"])[0, 1]:+.2f}' for c in sorted([f for f in F if f != 'street'], key=lambda c: -abs(np.corrcoef(t[c], t['size'])[0, 1]))[:10]))
def cv(cols, model, t=T, y='size'):
    X = t[cols].values; Y = t[y].values; p = np.zeros(len(t))
    for tr, te in GroupKFold(5).split(X, Y, t.spot): p[te] = model().fit(X[tr], Y[tr]).predict(X[te])
    return np.abs(p - Y).mean(), 1 - ((p - Y) ** 2).sum() / ((Y - Y.mean()) ** 2).sum()
tree = lambda: DecisionTreeRegressor(max_depth=3, min_samples_leaf=30); gbm = lambda: HistGradientBoostingRegressor(max_depth=4, max_iter=200, learning_rate=0.06)
print('\nHow well the size can be told on spots not seen (off by, in pots; share explained): a rule of three questions | a flexible model')
print(f'  {"always the average":58s} {np.abs(T["size"] - T["size"].mean()).mean():.2f}  0.00')
for name, cols in [('stack depth alone', ['spr']), ('street alone', ['street']), ('nut advantage alone (90%+ shares)', ['nut_me', 'nut_him']), ('range advantage alone', ['eq_me']), ('depth and street', ['spr', 'street']),
                   ('depth, street, nuts', ['spr', 'street', 'nut_me', 'nut_him']), ('depth, street, nuts, first or checked to', ['spr', 'street', 'nut_me', 'nut_him', 'first']), ('depth, street, his weak share, my shape', ['spr', 'street', 'weak_him', 'polar', 'mid_me']),
                   ('the size that gets stacks in by the river', ['geo']), ('everything', F)]:
    a, b = cv(cols, tree), cv(cols, gbm); print(f'  {name:58s} {a[0]:.2f}  {a[1]:5.2f}   |  {b[0]:.2f}  {b[1]:5.2f}')
m = DecisionTreeRegressor(max_depth=3, min_samples_leaf=40).fit(T[F].values, T['size'].values); print('\nthe three best questions:\n' + export_text(m, feature_names=F, decimals=2))
# the combination asked about: nut advantage at each depth, each street
print('mean size by depth and nut gap (my 90%+ share less his):')
T['depth'] = pd.cut(T.spr, [0, 1.5, 4, 10, 99], labels=['under 1.5', '1.5-4', '4-10', 'over 10']); T['nuts'] = pd.cut(T.nut_gap, [-1, -0.05, 0.05, 1], labels=['he has them', 'even', 'I have them'])
for st in (4, 5): print('  turn' if st == 4 else '  river'); print(T[T.street == st].pivot_table(index='depth', columns='nuts', values='size', aggfunc=['mean', 'count']).round(2).to_string())
print('\nvalue hands (70%+) and weak hands (under 30%): the size each uses, where both bet:'); V = T.dropna(subset=['value_size', 'bluff_size']); print(f'  value {V.value_size.mean():.2f} pots, weak {V.bluff_size.mean():.2f} pots; value bigger in {100*(V.value_size > V.bluff_size + 0.02).mean():.0f}%, the same within 0.02 in {100*((V.value_size - V.bluff_size).abs() <= 0.02).mean():.0f}% ({len(V)} decisions)')
print('by size of bet relative to the stack: share of decisions where the biggest size is all-in', round(100 * (T.biggest >= T.spr - 1e-6).mean()), '%')
