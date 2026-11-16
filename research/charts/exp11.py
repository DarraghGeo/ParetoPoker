# Experiment 11. How often a range bets, and how often its value bets: what they go with (stack depth, street, position,
# range advantage), and how close simple formulas come to the range's bet frequency. Flop and turn betting decisions from
# the research/insight collections (per hand); river decisions from research/value/out/sizes.jsonl (by equity step).
import json, glob, numpy as np, pandas as pd, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor, export_text
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupKFold
rows = []
for f in sorted(glob.glob('../insight/out/full-*.jsonl')):
    for l in open(f):
        r = json.loads(l); st = len(r['board'].split())
        if r['toCall'] > 0 or min(r['reach']) < 0.05 or r['actions'][0]['kind'] != 'check' or not r.get('vr'): continue
        H = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; w = np.array([h['w'] for h in H]); w = w / w.sum(); e = np.array([h['e'] for h in H]); b = np.array([1 - h['p'][0] for h in H]); dr = np.array([h.get('draw') or 0 for h in H])
        V = [x for x in r['vr'] if x[2] is not None]; hw = np.array([x[1] for x in V]); hw = hw / hw.sum(); he = np.array([x[2] for x in V])
        sizes = [a['add'] / r['pot'] for a in r['actions'][1:]]; P = np.array([h['p'][1:1 + len(sizes)] for h in H]); bet = float((w * b).sum()); s = float((w[:, None] * P * np.array(sizes)).sum() / max(bet, 1e-9)) if bet > 0.02 else 0.75
        sh = lambda lo, hi=1.01: float(w[(e >= lo) & (e < hi)].sum()); fr = lambda lo, hi=1.01: float((w * b)[(e >= lo) & (e < hi)].sum() / max(sh(lo, hi), 1e-9))
        rows.append(dict(spot=r['spot'], street=st, first=float(r['line'] == 'first'), ip=float(r['seat'] == 1), spr=min(r['behind'] / r['pot'], 15), F=bet, s=min(max(s, 0.2), 2), V80=sh(.8), V70=sh(.7), V60=sh(.6), mid=sh(.4, .7), weak=sh(0, .4),
                         vb80=fr(.8) if sh(.8) > 0.03 else np.nan, vb70=fr(.7) if sh(.7) > 0.03 else np.nan, midb=fr(.4, .7) if sh(.4, .7) > 0.03 else np.nan, weakb=fr(0, .4) if sh(0, .4) > 0.03 else np.nan,
                         eq=float((w * e).sum()), his_weak=float(hw[he < .3].sum()), his_strong=float(hw[he >= .8].sum()), nut_gap=sh(.9) - float(hw[he >= .9].sum()),
                         drawval=float((w * np.where(e < .7, dr, 0)).sum()), come=float((w * np.where(e < .7, np.clip(e, 0, 1), 0)).sum())))
T = pd.DataFrame(rows); T['gap'] = T['eq'] - 0.5; T['log_spr'] = np.log1p(T.spr)
print(len(T), 'betting decisions:', dict(T.street.map({3: 'flop', 4: 'turn'}).value_counts()))
for st, nm in ((3, 'FLOP'), (4, 'TURN')):
    t = T[T.street == st]; print(f'\n== {nm}: range bets {100*t.F.mean():.0f}%; hands at 80%+ bet {100*t.vb80.mean():.0f}%, 70%+ {100*t.vb70.mean():.0f}%, 40-70% {100*t.midb.mean():.0f}%, under 40% {100*t.weakb.mean():.0f}%')
    for y in ('F', 'vb80', 'midb', 'weakb'):
        u = t.dropna(subset=[y]); print(f'  {y:6s} goes with: ' + ', '.join(f'{c} {np.corrcoef(u[c], u[y])[0, 1]:+.2f}' for c in ('spr', 'ip', 'first', 'gap', 'nut_gap', 'his_weak', 'his_strong', 'V80', 'weak')))
    for c, cuts, labels in (('spr', [0, 1.5, 4, 99], ['under 1.5', '1.5 to 4', 'over 4']), ('gap', [-1, -.04, .04, 1], ['behind', 'even', 'ahead'])):
        g = t.groupby([pd.cut(t[c], cuts, labels=labels), t.ip.map({0: 'OOP', 1: 'IP'})])[['F', 'vb80', 'midb', 'weakb']].mean().round(2); g['n'] = t.groupby([pd.cut(t[c], cuts, labels=labels), t.ip.map({0: 'OOP', 1: 'IP'})]).size(); print(g.to_string())
def cv(t, cols, model):
    X = t[cols].values; y = t.F.values; p = np.zeros(len(t))
    for tr, te in GroupKFold(5).split(X, y, t.spot): p[te] = model().fit(X[tr], y[tr]).predict(X[te])
    return 100 * np.abs(p - y).mean()
print('\nHow far out each way of getting the range\'s bet frequency is (points, mean): flop | turn')
def line(name, f): print(f'  {name:76s} ' + ' | '.join(f'{f(T[T.street == st]):5.1f}' for st in (3, 4)))
mae = lambda p, t: 100 * np.abs(np.clip(p, 0, 1) - t.F).mean(); b = lambda t: t.s / (1 + t.s)
line('always the average', lambda t: mae(t.F.mean(), t))
line('Ferguson, one street: value (80%+) and its bluffs', lambda t: mae(t.V80 / (1 - b(t)), t))
line('the same, value from 70%', lambda t: mae(t.V70 / (1 - b(t)), t))
line('one bet for each street left: value (80%+) / (1-b)^streets', lambda t: mae(t.V80 / (1 - b(t)) ** (6 - t.street), t))
line('draws part value: (value 80%+ plus what weaker hands win from behind) / (1-b)', lambda t: mae((t.V80 + t.drawval) / (1 - b(t)), t))
line('weak hands part value: (value 80%+ plus the equity of the hands under 70%) / (1-b)', lambda t: mae((t.V80 + t.come) / (1 - b(t)), t))
line('two thirds of value (80%+), two streets of bluffs', lambda t: mae(0.67 * t.V80 / (1 - b(t)) ** 2, t))
lin = lambda: LinearRegression(); tree = lambda: DecisionTreeRegressor(max_depth=3, min_samples_leaf=20)
for name, cols in [('fitted: range advantage alone', ['gap']), ('fitted: range advantage and position', ['gap', 'ip']), ('fitted: range advantage, position, depth', ['gap', 'ip', 'log_spr']), ('fitted: the same and value share (80%+)', ['gap', 'ip', 'log_spr', 'V80']),
                   ('fitted: the same and his weak and strong shares', ['gap', 'ip', 'log_spr', 'V80', 'his_weak', 'his_strong']), ('three questions (a tree): everything above', ['gap', 'ip', 'log_spr', 'V80', 'V70', 'his_weak', 'his_strong', 'nut_gap', 'first'])]:
    m = tree if name.startswith('three') else lin; line(name, lambda t, cols=cols, m=m: cv(t, cols, m))
for st, nm in ((3, 'flop'), (4, 'turn')):
    t = T[T.street == st]; m = LinearRegression().fit(t[['gap', 'ip']].values, t.F.values); print(f'\n{nm}: bet frequency = {100*m.intercept_:.0f}% {100*m.coef_[0]/10:+.1f} points for each point of range advantage, {100*m.coef_[1]:+.0f} in position')
    m = DecisionTreeRegressor(max_depth=2, min_samples_leaf=25).fit(t[['gap', 'ip', 'log_spr', 'V80', 'his_weak', 'his_strong']].values, t.F.values); print(export_text(m, feature_names=['gap', 'ip', 'log_spr', 'V80', 'his_weak', 'his_strong'], decimals=2))
# the river, from the size study
R = [json.loads(l) for l in open('../value/out/sizes.jsonl') if l.strip()]; rr = []
for r in R:
    if r['street'] != 5: continue
    M = np.array(r['mine']); w = M[:, 0]; bet = M[:, 1:].sum(1); his = np.array(r['his']); amt = np.array(r['amounts']); F = bet.sum(); s = float((M[:, 1:].sum(0) * amt).sum() / max(F, 1e-9)) if F > 0.02 else 0.75
    rr.append(dict(spot=r['spot'], first=float(r['what'] == 'first'), spr=min(r['spr'], 25), F=F, s=s, V80=w[16:].sum(), vb80=bet[16:].sum() / w[16:].sum() if w[16:].sum() > 0.03 else np.nan, midb=bet[8:14].sum() / w[8:14].sum() if w[8:14].sum() > 0.03 else np.nan,
                   weakb=bet[:8].sum() / w[:8].sum() if w[:8].sum() > 0.03 else np.nan, gap=float((w * (np.arange(20) + .5) / 20).sum()) - .5, his_strong=his[16:].sum(), his_weak=his[:6].sum()))
V = pd.DataFrame(rr); print(f'\n== RIVER ({len(V)}): range bets {100*V.F.mean():.0f}%; 80%+ bet {100*V.vb80.mean():.0f}%, 40-70% {100*V.midb.mean():.0f}%, under 40% {100*V.weakb.mean():.0f}%')
for y in ('F', 'vb80', 'weakb'): u = V.dropna(subset=[y]); print(f'  {y:6s} goes with: ' + ', '.join(f'{c} {np.corrcoef(u[c], u[y])[0, 1]:+.2f}' for c in ('spr', 'first', 'gap', 'his_weak', 'his_strong', 'V80')))
g = V.groupby([pd.cut(V.spr, [0, 1.5, 4, 99], labels=['under 1.5', '1.5 to 4', 'over 4']), V['first'].map({1: 'first to act', 0: 'checked to'})])[['F', 'vb80', 'weakb']].mean().round(2); print(g.to_string())
bb = V.s / (1 + V.s); print(f'  river frequency, points out: the average {100*np.abs(V.F - V.F.mean()).mean():.1f}; value (80%+) and its bluffs {100*np.abs(np.clip(V.V80 / (1 - bb), 0, 1) - V.F).mean():.1f}; fitted on value, range advantage, his strong share, first {cv(V, ["V80", "gap", "his_strong", "first"], lin):.1f}')
