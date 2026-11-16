# Experiment 12. A way to get the range's bet frequency from the ladder and what surrounds it. The range is cut in three
# zones by the chart (above the value line: 80% equity or more; the bottom: under 40%; the middle), and each zone bets
# at a rate looked up from the street, the seat, who has the range advantage and whether he holds many strong hands:
#   frequency = value share x its rate + middle share x its rate + bottom share x its rate
# Tested against the solution's frequency on spots the rates were not taken from, and against simpler ways.
import json, glob, numpy as np, pandas as pd, warnings; warnings.filterwarnings('ignore')
from sklearn.model_selection import GroupKFold
rows = []
for f in sorted(glob.glob('../insight/out/full-*.jsonl')):
    for l in open(f):
        r = json.loads(l); st = len(r['board'].split())
        if r['toCall'] > 0 or min(r['reach']) < 0.05 or r['actions'][0]['kind'] != 'check' or not r.get('vr'): continue
        H = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; w = np.array([h['w'] for h in H]); w = w / w.sum(); e = np.array([h['e'] for h in H]); b = np.array([1 - h['p'][0] for h in H])
        V = [x for x in r['vr'] if x[2] is not None]; hw = np.array([x[1] for x in V]); hw = hw / hw.sum(); he = np.array([x[2] for x in V]); z = lambda m: (float(w[m].sum()), float((w * b)[m].sum()))
        rows.append(dict(spot=r['spot'], street=st, ip=int(r['seat'] == 1), spr=r['behind'] / r['pot'], gap=float((w * e).sum()) - .5, strong=float(hw[he >= .8].sum()), zones=[z(e >= .8), z((e >= .4) & (e < .8)), z(e < .4)]))
for l in open('../value/out/sizes.jsonl'):
    r = json.loads(l)
    if r['street'] != 5: continue
    M = np.array(r['mine']); w = M[:, 0]; bet = M[:, 1:].sum(1); his = np.array(r['his']); z = lambda a, c: (float(w[a:c].sum()), float(bet[a:c].sum()))
    rows.append(dict(spot=r['spot'], street=5, ip=int(r['what'] != 'first'), spr=r['spr'], gap=float((w * (np.arange(20) + .5) / 20).sum()) - .5, strong=float(his[16:].sum()), zones=[z(16, 20), z(8, 16), z(0, 8)]))
T = pd.DataFrame(rows); T['F'] = [sum(b for _, b in z) for z in T.zones]; T['adv'] = np.digitize(T.gap, [-.04, .04]); T['hs'] = (T.strong > .2).astype(int); T['shallow'] = (T.spr < 1.5).astype(int)
for k in range(3): T[f'w{k}'] = [z[k][0] for z in T.zones]; T[f'b{k}'] = [z[k][1] for z in T.zones]
NAMES = {3: 'flop', 4: 'turn', 5: 'river'}; print({NAMES[s]: int(n) for s, n in T.street.value_counts().items()})
def rates(t, keys):
    """Each zone's rate in each cell: what bets there over what is there."""
    g = t.groupby(keys)[[f'{c}{k}' for c in 'wb' for k in range(3)]].sum(); return {i: [r[f'b{k}'] / max(r[f'w{k}'], 1e-9) for k in range(3)] for i, r in g.iterrows()}, [t[f'b{k}'].sum() / t[f'w{k}'].sum() for k in range(3)]
def predict(t, table, base, keys): return np.array([sum(r[f'w{k}'] * table.get(tuple(r[c] for c in keys) if len(keys) > 1 else r[keys[0]], base)[k] for k in range(3)) for _, r in t.iterrows()])
def cv(t, keys):
    p = np.zeros(len(t))
    for tr, te in GroupKFold(5).split(t, t.F, t.spot): table, base = rates(t.iloc[tr], keys) if keys else ({}, rates(t.iloc[tr], ['ip'])[1]); p[te] = predict(t.iloc[te], table, base, keys or ['ip'])
    return p
# the rule in round numbers, to carry: [value, middle, bottom] rates
def carried(r):
    ip, adv, hs, st = r.ip, r.adv, r.hs, r.street
    value = (1 if st == 5 else .8) if ip else ([.35, .45, .9][adv] if st == 3 else .55 if st == 4 else .75)
    middle = (.25 if ip else .4) if st == 5 else 1 / 3 if st == 4 or ip else [.15, .35, .65][adv]
    bottom = [.25, .35, .55][adv] + (.05 if ip else -.05) if st > 3 or ip else [.1, .3, .75][adv]
    if hs and not (ip and st == 5): value, bottom = value / 2, bottom / 2
    if hs and st == 5 and not ip: middle = middle / 2
    return [value, middle, bottom]
print('\nPoints out on the range\'s bet frequency, spots not seen (mean; and how often within 10 points):')
print(f'{"":64s}' + ''.join(f'{NAMES[s]:>14s}' for s in (3, 4, 5)))
def line(name, f):
    out = []
    for s in (3, 4, 5): t = T[T.street == s]; d = np.abs(f(t) - t.F.values); out.append(f'{100*d.mean():6.1f} ({100*(d < .1).mean():2.0f}%)')
    print(f'{name:64s}' + ''.join(f'{x:>14s}' for x in out))
line('always the average', lambda t: np.full(len(t), t.F.mean()))
line('the average for the seat', lambda t: t.groupby('ip').F.transform('mean').values)
line('three zones, one rate each', lambda t: cv(t, None))
line('three zones, rates by seat', lambda t: cv(t, ['ip']))
line('three zones, rates by seat and range advantage', lambda t: cv(t, ['ip', 'adv']))
line('three zones, rates by seat, advantage, his strong hands', lambda t: cv(t, ['ip', 'adv', 'hs']))
line('the same, and shallow or not', lambda t: cv(t, ['ip', 'adv', 'hs', 'shallow']))
line('the rule in round numbers (to carry)', lambda t: np.array([sum(r[f'w{k}'] * carried(r)[k] for k in range(3)) for _, r in t.iterrows()]))
print('\nThe rates found (value, middle, bottom), by seat, advantage (behind, even, ahead) and whether he holds many strong hands; and how many decisions')
for s in (3, 4, 5):
    t = T[T.street == s]; table, _ = rates(t, ['ip', 'adv', 'hs']); n = t.groupby(['ip', 'adv', 'hs']).size()
    for key in sorted(table): print(f'  {NAMES[s]:6s}{"IP " if key[0] else "OOP"} {["behind", "even", "ahead"][key[1]]:7s}{"many strong" if key[2] else "few strong":12s}' + '  '.join(f'{100*x:3.0f}%' for x in table[key]) + f'   {n[key]}')
