# Multi-street equities as the ruler. Each turn hand has a standing on every river card (the share of his range it
# beats there). Its equity is the average of those; what it beats now is one more number. The base thresholds are put,
# untouched, on several single numbers made from that spread:
#   equity        the average over river cards
#   now           what it beats on the turn
#   median, low quarter, high quarter of its river standings
#   equivalent    the fixed standing worth as much as the hand's spread, when a river bet is still to come. On each
#                 river a standing x is worth max(a, x, x + 2s(x - b)) of the pot to the player who may bet (the von
#                 Neumann value, a and b from that river's own curve). Average that over the rivers, and read back the
#                 x that the average value curve gives it. Lumpy equity is worth more than even equity, by this much.
import sys, glob, json, re; sys.path.insert(0, 'research/insight')
from freq_lib import *
from derive import base_with, oop_river
import warnings; warnings.filterwarnings('ignore')
idx = {r['key']: r for r in json.load(open('research/insight/out/runouts.json'))}; raw = np.memmap('research/insight/out/runouts.bin', dtype=np.float32, mode='r')
S_R = 0.75
def equivalent(X, w):
    """Certainty-equivalent standing of each hand, from its river standings X (hands x rivers) and the range weights."""
    nr = X.shape[1]; A = np.zeros(nr); B = np.ones(nr)
    for k in range(nr):
        ok = ~np.isnan(X[:, k]); t = thresholds(Dist(X[ok, k], w[ok]), None, S_R); A[k], B[k] = t['bluff'], t['value']
    worth = lambda x: np.maximum(np.maximum(A, x), x + 2 * S_R * (x - B))            # per river, broadcasting over hands
    U = np.nanmean(np.where(np.isnan(X), np.nan, worth(X)), axis=1)
    grid = np.linspace(0, 1, 201); curve = np.array([np.mean(np.maximum(np.maximum(A, g), g + 2 * S_R * (g - B))) for g in grid])   # the average value of a fixed standing
    return np.interp(U, curve, grid)
rows = []
for f in sorted(glob.glob('research/insight/out/full-*.jsonl')) + [g for g in sorted(glob.glob('research/insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', g).group(1)) >= 7]:
    seed = int(re.search(r'-(\d+)\.jsonl', f).group(1))
    for line in open(f):
        if '"toCall":0' not in line.replace(' ', ''): continue
        d = json.loads(line); key = f"{d['spot']}|{d['board']}|{d['line']}"; r = idx.get(key)
        if not r or len(d['hands']) != r['nh']: continue
        hs = d['hands']; w = np.array([h['w'] for h in hs]); X = np.array(raw[r['at']: r['at'] + r['nh'] * r['nr']]).reshape(r['nh'], r['nr']).astype(float)
        bets = [i for i, a in enumerate(d['actions']) if a['kind'] in ('bet', 'allin')]
        if not bets: continue
        s = min(d['actions'][i]['add'] / d['pot'] for i in bets); y = sum(d['actions'][i]['freq'] for i in bets); first = d['line'].split('|')[-1] == 'first'
        rulers = dict(equity=np.nanmean(X, 1), now=np.array([h['now'] for h in hs]), median=np.nanmedian(X, 1), low=np.nanquantile(X, 0.25, 1), high=np.nanquantile(X, 0.75, 1), equivalent=equivalent(X, w))
        x = dict(seed=seed, spot=d['spot'], first=float(first), y=y, s=s)
        for name, v in rulers.items():
            D = Dist(v, w); x[name] = base_with(D, s, s / (1 + s))[0]
            if first: x[name + '_oop'] = oop_river(D, s)['freq']
        rows.append(x)
t = pd.DataFrame(rows); t.to_pickle('research/insight/out/derive4.pkl'); miss = lambda p, y: float(np.mean(np.abs(p - y)))
print(f'{len(t)} turn betting decisions on {t.spot.nunique()} flops')
for first, seat in [(0.0, 'In position'), (1.0, 'Out of position')]:
    for tag, x in [('all', t[t['first'] == first]), ('unseen flops', t[(t['first'] == first) & (t.seed >= 9)])]:
        print(f'{seat}, {tag}: {len(x)} decisions, solver bets {x.y.mean():.3f}')
        for name in ['equity', 'now', 'median', 'low', 'high', 'equivalent']:
            line = f'    {name:<11} bets {x[name].mean():.3f}  misses by {miss(x[name], x.y):.3f}  tracks {np.corrcoef(x[name], x.y)[0, 1]:+.2f}'
            if first: line += f'   | with the check game: bets {x[name + "_oop"].mean():.3f}  misses by {miss(x[name + "_oop"], x.y):.3f}  tracks {np.corrcoef(x[name + "_oop"], x.y)[0, 1]:+.2f}'
            print(line)
