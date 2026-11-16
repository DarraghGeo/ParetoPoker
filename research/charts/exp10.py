# Experiment 10. Inside one bar of the strength ladder, does the bet frequency take a few shapes? Turn betting decisions
# (research/insight collections). Each level's hands are sorted (by equity, or by the level's own measure), cut in five
# equal parts by weight, and the bet frequency of each part taken. The five numbers are then named: full, empty, flat
# (a mix all along), rising, falling, both ends (polar), middle.
import json, glob, sys, collections, numpy as np, warnings; warnings.filterwarnings('ignore')
exec(open('../advantage/runouts.py').read().split("rows = []")[0])   # made(), card()
K = 5; LEVELS = ['Set or better', 'Two pair', 'Overpair', 'Top pair', 'Other pair', 'Draws', 'Trash']
def level(h, board):
    m = made([card(h['h'][:2]), card(h['h'][2:])], board)
    return {3: 0, 2: 1, 1.5: 2, 1: 3, 0.5: 4}.get(m, 5 if (h['fo'] >= 8 or h['so'] >= 8) else 6)
def cut(H, key):
    H = sorted(H, key=key); w = np.array([h['w'] for h in H]); b = np.array([1 - h['p'][0] for h in H]); edge = np.cumsum(w) / w.sum(); out = []
    for k in range(K):
        lo, hi = k / K, (k + 1) / K; part = np.clip(np.minimum(edge, hi) - np.maximum(edge - w / w.sum(), lo), 0, None); out.append(float((part * b).sum() / max(part.sum(), 1e-9)))
    return np.array(out)
def name(v):
    if v.min() >= 0.8: return 'full'
    if v.max() <= 0.2: return 'empty'
    if v.max() - v.min() < 0.25: return 'flat'
    ends = (v[0] + v[-1]) / 2; mid = v[1:-1].mean(); slope = np.polyfit(np.arange(K), v, 1)[0] * (K - 1)
    if min(v[0], v[-1]) - v[1:-1].min() >= 0.2 and abs(v[-1] - v[0]) < 0.35: return 'both ends'
    if v[1:-1].max() - max(v[0], v[-1]) >= 0.2: return 'middle'
    return 'rising' if slope > 0 else 'falling'
rows = []
for f in sorted(glob.glob('../insight/out/full-*.jsonl')):
    for l in open(f):
        r = json.loads(l); board = [card(c) for c in r['board'].split()]
        if len(board) != 4 or r['toCall'] > 0 or min(r['reach']) < 0.05 or r['actions'][0]['kind'] != 'check': continue
        H = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; tot = sum(h['w'] for h in H); freq = sum(h['w'] * (1 - h['p'][0]) for h in H) / tot
        by = collections.defaultdict(list)
        for h in H: by[level(h, board)].append(h)
        for lv, G in by.items():
            w = sum(h['w'] for h in G)
            if w / tot < 0.04 or len(G) < 10: continue
            keys = {'equity': lambda h: h['e'], 'own': (lambda h: h['now']) if lv <= 3 else (lambda h: h['draw'])}
            row = dict(spot=r['spot'], lv=lv, share=w / tot, bar=sum(h['w'] * (1 - h['p'][0]) for h in G) / w, range=freq)
            for k, key in keys.items(): v = cut(G, key); row[k] = v; row[k + '_name'] = name(v)
            # how pure the parts are, and how smooth the line through them is against the same numbers shuffled
            v = row['equity']; row['pure'] = float(np.mean((v < 0.15) | (v > 0.85))); row['jump'] = float(np.abs(np.diff(v)).mean()); row['spread'] = float(v.max() - v.min())
            rows.append(row)
print(len(rows), 'bars on', len({r['spot'] for r in rows}), 'turn spots')
SH = ['full', 'empty', 'flat', 'rising', 'falling', 'both ends', 'middle']
for k in ('equity', 'own'):
    print(f'\nShape of the bet frequency along the bar, hands sorted by {"equity" if k == "equity" else "the level\'s own line (ahead now for top pair and up, still to come below)"}: % of bars')
    print(f'{"":16s}{"bars":>5s}{"bets":>6s}  ' + ''.join(f'{s:>10s}' for s in SH))
    for lv, nm in enumerate(LEVELS):
        G = [r for r in rows if r['lv'] == lv]
        if len(G) < 15: continue
        c = collections.Counter(r[k + '_name'] for r in G); print(f'{nm:16s}{len(G):5d}{100*np.mean([r["bar"] for r in G]):5.0f}%  ' + ''.join(f'{100*c[s]/len(G):9.0f}%' for s in SH))
    c = collections.Counter(r[k + '_name'] for r in rows); print(f'{"all":16s}{len(rows):5d}{"":6s}  ' + ''.join(f'{100*c[s]/len(rows):9.0f}%' for s in SH))
print('\nMean frequency in each of the five parts (weak end to strong end, by equity), bars that are neither full nor empty:')
for lv, nm in enumerate(LEVELS):
    G = [r for r in rows if r['lv'] == lv and r['equity_name'] not in ('full', 'empty')]
    if len(G) >= 15: print(f'  {nm:16s}{len(G):4d}  ' + '  '.join(f'{x:.2f}' for x in np.mean([r["equity"] for r in G], 0)) + '   by own line: ' + '  '.join(f'{x:.2f}' for x in np.mean([r["own"] for r in G], 0)))
mixed = [r for r in rows if r['equity_name'] not in ('full', 'empty')]
rng = np.random.default_rng(1); sh = np.mean([np.abs(np.diff(rng.permutation(r['equity']))).mean() for r in mixed for _ in range(20)])
print(f'\nSmoothness: mean step between neighbouring parts {np.mean([r["jump"] for r in mixed]):.2f}, the same numbers shuffled {sh:.2f}; parts that are all-or-nothing (under 15% or over 85%): {100*np.mean([r["pure"] for r in mixed]):.0f}%')
# can the shape be told beforehand? from the level alone, then with what the ladder shows (the bar's size, the range's frequency)
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import GroupKFold
y = np.array([SH.index(r['equity_name']) for r in rows]); g = np.array([r['spot'] for r in rows])
def acc(X):
    p = np.zeros(len(y), int)
    for tr, te in GroupKFold(5).split(X, y, g): p[te] = DecisionTreeClassifier(max_depth=4, min_samples_leaf=15).fit(X[tr], y[tr]).predict(X[te])
    return 100 * (p == y).mean()
one = np.eye(len(LEVELS))[[r['lv'] for r in rows]]
print(f'\nNaming the shape on spots not seen: always the commonest {100*np.bincount(y).max()/len(y):.0f}%; from the level {acc(one):.0f}%; level and how often the whole range bets {acc(np.c_[one, [r["range"] for r in rows]]):.0f}%; and how often the bar itself bets {acc(np.c_[one, [r["range"] for r in rows], [r["bar"] for r in rows]]):.0f}%')
# given how often the bar bets, how well does "the strong end first" (or the weak end, or both ends) rebuild the five parts?
def fill(order, f):
    out = np.zeros(K); room = f * K
    for k in order: out[k] = min(1, room); room -= out[k]
    return out
ORD = {'strong end first': [4, 3, 2, 1, 0], 'weak end first': [0, 1, 2, 3, 4], 'both ends first': [4, 0, 3, 1, 2], 'even': None}
print('\nGiven only how often a bar bets, the five parts rebuilt by a filling order: mean error per part, in points (by equity | by own line)')
for lv, nm in enumerate(LEVELS):
    G = [r for r in rows if r['lv'] == lv]
    if len(G) < 15: continue
    line = []
    for o, order in ORD.items(): line.append(f'{o} ' + ' | '.join(f'{100*np.mean([np.abs((np.full(K, r[k].mean()) if order is None else fill(order, r[k].mean())) - r[k]).mean() for r in G]):.0f}' for k in ('equity', 'own')))
    print(f'  {nm:16s}' + ';  '.join(line))
