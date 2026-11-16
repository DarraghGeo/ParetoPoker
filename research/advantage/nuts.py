# Is there a count for nut advantage, as "who has more top pair or better" is for range advantage?
# Nut advantage: who has the bigger share of hands with 90% equity or more against the other range. Set beside counts a
# player can make: sets and better (sets, straights, flushes, full houses), two pair or better, overpairs or better,
# top pair or better. Flop, turn and river decisions of solved spots (the ranges as the action leaves them).
import json, glob, re, sys, numpy as np, collections, warnings; warnings.filterwarnings('ignore')
sys.argv = ['x']; exec(open('runouts.py').read().split("rows = []")[0])   # made(), card()
def shares(hands, board):
    tot = 0; out = collections.Counter()
    for h, w in hands:
        m = made([card(h[:2]), card(h[2:])], board); tot += w
        for name, lo in (('set', 3), ('twopair', 2), ('overpair', 1.5), ('toppair', 1)):
            if m >= lo: out[name] += w
    return {k: out[k] / tot for k in ('set', 'twopair', 'overpair', 'toppair')}
rows = []; files = sorted(glob.glob('../insight/out/full-*.jsonl')) + [f for f in sorted(glob.glob('../insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
for f in files:
    for l in open(f):
        r = json.loads(l); board = [card(c) for c in r['board'].split()]
        if min(r['reach']) < 0.02 or not r.get('vr') or r['toCall'] > 0: continue
        H = [(h['h'], h['w'], h['e']) for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; V = [(x[0], x[1], x[2]) for x in r['vr'] if x[2] is not None]
        if len(H) < 15 or len(V) < 15: continue
        nut = lambda L, t: sum(w for _, w, e in L if e >= t) / sum(w for _, w, _ in L)
        a = shares([(h, w) for h, w, _ in H], board); b = shares([(h, w) for h, w, _ in V], board)
        rows.append(dict(spot=r['spot'], street=len(board), gap=nut(H, 0.9) - nut(V, 0.9), gap80=nut(H, 0.8) - nut(V, 0.8), **{k: a[k] - b[k] for k in a}))
import pandas as pd
T = pd.DataFrame(rows); print(len(T), 'decisions (not facing a bet) on', T.spot.nunique(), 'flops')
NAMES = {'set': 'sets and better (sets, straights, flushes, boats)', 'twopair': 'two pair or better', 'overpair': 'overpair or better', 'toppair': 'top pair or better'}
for st, name in ((3, 'FLOP'), (4, 'TURN'), (5, 'RIVER')):
    t = T[T.street == st]; g = t.gap.values; a = np.abs(g)
    print(f'\n{name}: {len(t)} decisions; nut advantage (90%+) differs by {100*np.std(g):.1f} points; under a point apart in {100*(a < 0.01).mean():.0f}%')
    for k, label in NAMES.items():
        x = t[k].values; ok = np.sign(x) == np.sign(g); band = lambda lo, hi: f'{100*ok[(a >= lo) & (a < hi)].mean():3.0f}%' if ((a >= lo) & (a < hi)).sum() > 15 else '  - '
        print(f'  who has more {label:52s} correlation {np.corrcoef(x, g)[0, 1]:+.2f} | names the right player when the gap is 1-3 pts {band(.01, .03)}, 3-8 pts {band(.03, .08)}, over 8 pts {band(.08, 9)}')

# A count that moves with the board: the best kind of hand that either range holds in any number (5% of the two ranges
# together, or 3%, or 10%), and who has more of that kind or better. Kinds, best first: full house and better, flush,
# straight, set or trips, two pair, overpair, top pair.
def fine(hole, board):
    hr = [c[0] for c in hole]; br = [c[0] for c in board]; allc = hole + board; cnt = collections.Counter(hr + br); m = made(hole, board)
    if m < 3: return m
    trips = [r for r in set(hr + br) if cnt[r] >= 3]; pairs = [r for r in set(hr + br) if cnt[r] >= 2]
    if any(cnt[r] >= 4 for r in hr) or (trips and len(pairs) >= 2 and any(cnt[r] >= 2 for r in hr)): return 6
    for s in range(4):
        if sum(1 for c in allc if c[1] == s) >= 5 and any(c[1] == s for c in hole): return 5
    def straight(rs): rs = set(rs) | ({-1} if 12 in rs else set()); return max((h for h in range(3, 13) if all((h - k) in rs for k in range(5))), default=None)
    sa, sb = straight([c[0] for c in allc]), straight(br)
    if sa is not None and (sb is None or sa > sb): return 4
    return 3
LV = [6, 5, 4, 3, 2, 1.5, 1]
rows = []
for f in files:
    for l in open(f):
        r = json.loads(l); board = [card(c) for c in r['board'].split()]
        if min(r['reach']) < 0.02 or not r.get('vr') or r['toCall'] > 0: continue
        H = [(h['h'], h['w'], h['e']) for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; V = [(x[0], x[1], x[2]) for x in r['vr'] if x[2] is not None]
        if len(H) < 15 or len(V) < 15: continue
        def cum(L):
            tot = sum(w for _, w, _ in L); c = collections.Counter()
            for h, w, _ in L: c[fine([card(h[:2]), card(h[2:])], board)] += w
            return [sum(v for k, v in c.items() if k >= lv) / tot for lv in LV]
        a, b = cum(H), cum(V); nut = lambda L: sum(w for _, w, e in L if e >= 0.9) / sum(w for _, w, _ in L); row = dict(street=len(board), gap=nut(H) - nut(V))
        for need in (0.03, 0.05, 0.1):
            k = next((i for i in range(len(LV)) if (a[i] + b[i]) / 2 >= need), len(LV) - 1); row[f'best{int(need*100)}'] = a[k] - b[k]; row[f'lvl{int(need*100)}'] = LV[k]
        rows.append(row)
T2 = pd.DataFrame(rows)
for st, name in ((3, 'FLOP'), (4, 'TURN'), (5, 'RIVER')):
    t = T2[T2.street == st]; g = t.gap.values; a = np.abs(g); print(f'\n{name}: the best kind of hand around, and who has more of it or better')
    for need in (3, 5, 10):
        x = t[f'best{need}'].values; ok = np.sign(x) == np.sign(g); band = lambda lo, hi: f'{100*ok[(a >= lo) & (a < hi)].mean():3.0f}%' if ((a >= lo) & (a < hi)).sum() > 15 else '  - '
        kinds = t[f'lvl{need}'].value_counts(normalize=True).round(2).to_dict()
        print(f'  kind held by {need}%+ of the two ranges: correlation {np.corrcoef(x, g)[0, 1]:+.2f} | right when the gap is 1-3 pts {band(.01, .03)}, 3-8 pts {band(.03, .08)}, over 8 pts {band(.08, 9)} | which kind: {kinds}')
