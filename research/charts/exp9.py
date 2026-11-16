# Experiment 9. What sets the bet size, and is it on the strength ladder? Flop decisions with three sizes on offer (33%,
# 75%, 125% of the pot). The size the range uses (the mean size of its bets, and whether the big size is used) against
# what the ladder shows: the nut line, the range line, how much of each range is above the value line of each size,
# how much of his range is weak, how polar each range is, and how deep the stacks are.
import json, glob, re, sys, numpy as np, collections, warnings; warnings.filterwarnings('ignore')
from sklearn.tree import DecisionTreeRegressor, export_text
from sklearn.model_selection import GroupKFold
sys.argv = ['x']; exec(open('../advantage/runouts.py').read().split("rows = []")[0])   # made(), card()
rows = []
for f in sorted(glob.glob('../insight/out/full-*.jsonl')):
    for l in open(f):
        r = json.loads(l); board = [card(c) for c in r['board'].split()]
        if len(board) != 3 or r['toCall'] > 0 or min(r['reach']) < 0.05 or not r.get('vr'): continue
        acts = r['actions']; bets = [(k, a['add'] / r['pot']) for k, a in enumerate(acts) if a['kind'] == 'bet']
        if len(bets) < 3: continue
        H = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; V = [x for x in r['vr'] if x[2] is not None]
        w = np.array([h['w'] for h in H]); e = np.array([h['e'] for h in H]); P = np.array([h['p'] for h in H]); hw = np.array([x[1] for x in V]); he = np.array([x[2] for x in V])
        freq = (P * w[:, None]).sum(0) / w.sum(); bet = sum(freq[k] for k, _ in bets)
        if bet < 0.1: continue
        sh = lambda ee, ww, lo, hi=1.01: float(ww[(ee >= lo) & (ee < hi)].sum() / ww.sum())
        mm = np.array([made([card(h['h'][:2]), card(h['h'][2:])], board) for h in H]); hm = np.array([made([card(x[0][:2]), card(x[0][2:])], board) for x in V]); cnt = lambda lv, m, ww: float(ww[m >= lv].sum() / ww.sum())
        row = dict(spot=r['spot'], action=r['action'], size=sum(freq[k] * s for k, s in bets) / bet, big=freq[bets[-1][0]] / bet, small=freq[bets[0][0]] / bet, bet=bet, spr=min(r['behind'] / r['pot'], 15),
                   nut_me=cnt(2, mm, w), nut_him=cnt(2, hm, hw), range_me=cnt(1, mm, w), range_him=cnt(1, hm, hw), eq_me=float((w * e).sum() / w.sum()),
                   n90_me=sh(e, w, .9), n90_him=sh(he, hw, .9), his_weak=sh(he, hw, 0, .3), his_strong=sh(he, hw, .8), my_air=sh(e, w, 0, .25), my_mid=sh(e, w, .4, .7), his_mid=sh(he, hw, .4, .7))
        for s in (0.33, 0.75, 1.25, 2.0): row[f'above_{s}'] = sh(e, w, 1 - 1 / (2 * (1 + s)))
        row['nut_gap'] = row['nut_me'] - row['nut_him']; row['range_gap'] = row['range_me'] - row['range_him']; row['n90_gap'] = row['n90_me'] - row['n90_him']
        row['polar'] = (sh(e, w, .8) + sh(e, w, 0, .3)) - sh(e, w, .4, .7); row['keeps'] = row['above_1.25'] / max(row['above_0.33'], 1e-3)
        rows.append(row)
import pandas as pd
T = pd.DataFrame(rows); print(len(T), 'flop decisions with three sizes on', T.spot.nunique(), 'flops; mean size of the bets', round(T['size'].mean(), 2), 'pots (sd', round(T['size'].std(), 2), '); the big size is', round(100 * T.big.mean()), '% of bets, the small', round(100 * T.small.mean()), '%')
feats = [c for c in T.columns if c not in ('spot', 'action', 'size', 'big', 'small', 'bet')]
print('\nwhat goes with a bigger bet (correlation with the mean size, and with how much of the betting is the big size):')
for c in sorted(feats, key=lambda c: -abs(np.corrcoef(T[c], T['size'])[0, 1])): print(f'  {c:12s} {np.corrcoef(T[c], T["size"])[0, 1]:+.2f}   {np.corrcoef(T[c], T["big"])[0, 1]:+.2f}')
def cv(cols, depth=2):
    X = T[cols].values; y = T['size'].values; p = np.zeros(len(T))
    for tr, te in GroupKFold(5).split(X, y, T.spot): p[te] = DecisionTreeRegressor(max_depth=depth, min_samples_leaf=12).fit(X[tr], y[tr]).predict(X[te])
    return np.abs(p - y).mean(), 1 - ((p - y) ** 2).sum() / ((y - y.mean()) ** 2).sum()
print('\nhow well a simple rule gets the size from each (off by, in pots; share explained), on flops not seen:')
for name, cols in [('nothing (always the average)', None), ('the nut line', ['nut_me', 'nut_him']), ('nut share at 90% equity', ['n90_me', 'n90_him']), ('the range line', ['range_me', 'range_him']), ('stack depth', ['spr']), ('how much of his range is weak', ['his_weak']),
                   ('how much of my value survives the big size', ['keeps']), ('nut line and stack depth', ['nut_me', 'nut_him', 'spr']), ('nut line, his weak share, depth', ['nut_me', 'nut_him', 'his_weak', 'spr']), ('everything', feats)]:
    if cols is None: print(f'  {name:46s} {np.abs(T["size"] - T["size"].mean()).mean():.3f}   0.00'); continue
    m, r2 = cv(cols, 3 if len(cols) > 2 else 2); print(f'  {name:46s} {m:.3f}   {r2:.2f}')
m = DecisionTreeRegressor(max_depth=2, min_samples_leaf=15).fit(T[feats].values, T['size'].values); print('\nthe best two questions:\n' + export_text(m, feature_names=feats, decimals=2))
print('by pot type:', T.groupby('action')['size'].agg(['mean', 'count']).round(2).to_dict('index'))
