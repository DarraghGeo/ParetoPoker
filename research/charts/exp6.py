# Experiment 6. Do different kinds of equity track value bets and bluffs differently? Betting decisions with mixing, flop
# and turn. The range is cut in three by equity now: the weak end (where bets are bluffs), the middle, and the strong
# end (where bets are for value). Inside each part, how each measure goes with how often the hand bets (weighted
# correlation inside the decision, averaged over decisions; and how often it has the same sign).
import json, numpy as np, collections, sys
sys.path.insert(0, '.')
def wcorr(x, y, w):
    mx = (w * x).sum() / w.sum(); my = (w * y).sum() / w.sum(); v = np.sqrt((w * (x - mx) ** 2).sum() * (w * (y - my) ** 2).sum()); return (w * (x - mx) * (y - my)).sum() / v if v > 1e-9 else np.nan
PARTS = {'weak end (bluffs), equity under 40%': (0, .4), 'middle, 40 to 65%': (.4, .65), 'strong end (value), 65% and over': (.65, 1.01)}
def report(title, decisions, measures):
    R = collections.defaultdict(list)
    for e, w, a, cols in decisions:
        for part, (lo, hi) in PARTS.items():
            m = (e >= lo) & (e < hi)
            if w[m].sum() < 0.08 * w.sum() or m.sum() < 12: continue
            aa = a[m]; 
            if (w[m] * (aa - (w[m] * aa).sum() / w[m].sum()) ** 2).sum() / w[m].sum() < 0.01: continue
            for name, x in cols.items():
                if np.isnan(x[m]).any(): continue
                c = wcorr(x[m], aa, w[m]); 
                if not np.isnan(c): R[(part, name)].append(c)
    print(f'\n==== {title}')
    for part in PARTS:
        rows = sorted(((np.mean(v), k[1], len(v), np.mean(np.sign(v) == np.sign(np.mean(v)))) for k, v in R.items() if k[0] == part), key=lambda r: -abs(r[0]))
        if not rows: continue
        print(f'  {part}  ({rows[0][2]} decisions)')
        for m, name, n, same in rows: print(f'     {m:+.2f}  {name:48s} same sign in {100*same:3.0f}%')
# a. next-card measures (nextcard.mjs)
for root in ('turn', 'flop'):
    D = []
    for l in open(f'out/nextcard-{root}.jsonl'):
        r = json.loads(l)
        if r['facing']: continue
        H = np.array([h[1:] for h in r['hands']], float); w, e, a = H[:, 0], H[:, 1], H[:, 2]; y = (w * a).sum() / w.sum()
        if not 0.12 < y < 0.88: continue
        D.append((e, w, a, {'equity now': e, 'best next card (max)': H[:, 3], 'worst next card (min)': H[:, 4], 'median next card': H[:, 6], 'upper quarter of next cards': H[:, 7], 'lower quarter of next cards': H[:, 8], 'spread of next cards': H[:, 9], 'share of next cards that make it strong': H[:, 10]}))
    report(f'{root} betting, next-card measures', D, None)
# b. showdown and draw measures (the larger collection)
from load import load
for st in (3, 4):
    D = []
    for d in load():
        if d['facing'] or d['street'] != st or not 0.12 < d['y'] < 0.88: continue
        if np.isnan(d['now']).mean() > 0.05 or np.isnan(d['top']).mean() > 0.05: continue
        e = d['e'].astype(float); D.append((e, d['w'].astype(float), d['wag'].astype(float), {'equity now (with cards to come)': e, 'showdown: beats now, no more cards': np.nan_to_num(d['now'].astype(float)), 'draw: equity still to come': d['draw'].astype(float), 'equity against his best third': np.nan_to_num(d['top'].astype(float)), 'what good cards add': np.nan_to_num(d['up'].astype(float)), 'what bad cards cost': np.nan_to_num(d['down'].astype(float))}))
    report(f"{'flop' if st == 3 else 'turn'} betting, showdown and draw measures", D, None)
