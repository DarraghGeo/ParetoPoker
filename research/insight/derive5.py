# Multi-street equity where it belongs: in the count of bluffs.
#
# On the river the caller's weakest call is indifferent when bluffs are r = s/(1+s) of the value bets, because it beats
# every bluff. Before the river a bluff that is called still wins q of the time. Against it the caller wins the pot and
# the bet only (1 - q) of the time and loses his call q of the time, so toward his indifference that hand is worth
#       1 - q (1 + 2s)/(1 + s)      of a bluff.
# The budget is the same, r for every value bet, but it is spent in these fractions: a range with draws bets more hands.
#   value      the base thresholds on what each hand beats now (derive3)
#   q          the hand's equity against the range that calls: between its equity against his whole range and
#              against his strongest third, by how much of his range calls
#   which      the hands that gain most by betting over checking: he folds c, else they have q of a pot grown by two
#              bets less the bet, against what they beat now if they check
import sys, glob, json, re; sys.path.insert(0, 'research/insight')
from freq_lib import *
from derive import base_with, oop_river
import warnings; warnings.filterwarnings('ignore')
def with_draws(hs, s, first):
    w = np.array([h['w'] for h in hs]); now = np.array([h['now'] for h in hs]); e = np.array([h['e'] for h in hs]); top = np.array([h['top'] if h.get('top') is not None else h['e'] for h in hs]); W = w.sum()
    G = Dist(now, w); rho = s / (1 + s)
    if first: v = oop_river(G, s)['v']
    else: v = base_with(G, s, rho)[1]
    order = np.argsort(-now); cum = np.cumsum(w[order]) / W; value = np.zeros(len(hs)); k = np.searchsorted(cum, v); value[order[:k]] = 1
    if k < len(hs): value[order[k]] = max(0.0, (v - (cum[k - 1] if k else 0)) * W / w[order[k]])     # the hand on the line bets in part
    a = G.quantile(rho * v) if v > 0 else 0.0; c = min(0.99, (s + a) / (1 + s))
    calls = 1 - c; q = np.clip(top + (e - top) * (calls - 1 / 3) / (2 / 3), 0, 1) if calls > 1 / 3 else top
    weight = np.clip(1 - q * (1 + 2 * s) / (1 + s), 0.05, 1); gain = c + (1 - c) * (q * (1 + 2 * s) - s) - now
    budget = rho * v * W; rest = np.argsort(-gain); bluffs = 0.0
    for i in rest:
        free = w[i] * (1 - value[i])
        if free <= 0 or gain[i] <= -1: continue
        take = min(free, budget / weight[i]); bluffs += take; budget -= take * weight[i]
        if budget <= 1e-9: break
    return v + bluffs / W, v, bluffs / W
rows = []
for f in sorted(glob.glob('research/insight/out/full-*.jsonl')) + [g for g in sorted(glob.glob('research/insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', g).group(1)) >= 7]:
    seed = int(re.search(r'-(\d+)\.jsonl', f).group(1))
    for line in open(f):
        if '"toCall":0' not in line.replace(' ', ''): continue
        d = json.loads(line); n = len(d['board'].replace(' ', '')) // 2
        if n not in (3, 4) or re.search(r'b\d+r\d+', d['line']): continue
        hs = [h for h in d['hands'] if h.get('now') is not None]
        if sum(h['w'] for h in hs) < 1: continue
        bets = [i for i, a in enumerate(d['actions']) if a['kind'] in ('bet', 'allin')]
        if not bets: continue
        s = min(d['actions'][i]['add'] / d['pot'] for i in bets); y = sum(d['actions'][i]['freq'] for i in bets); first = d['line'].split('|')[-1] == 'first'; W = sum(h['w'] for h in hs)
        pb = [sum(h['p'][i] for i in bets) for h in hs]; f1, v1, b1 = with_draws(hs, s, first); G = Dist([h['now'] for h in hs], [h['w'] for h in hs])
        rows.append(dict(seed=seed, spot=d['spot'], street=n, first=float(first), y=y, V=sum(h['w'] * q for h, q in zip(hs, pb) if h['e'] >= 0.5) / W, B=sum(h['w'] * q for h, q in zip(hs, pb) if h['e'] < 0.5) / W, now_base=(oop_river(G, s)['freq'] if first else base_with(G, s, s / (1 + s))[0]), d=f1, dv=v1, db=b1))
t = pd.DataFrame(rows); t.to_pickle('research/insight/out/derive5.pkl'); miss = lambda p, y: float(np.mean(np.abs(p - y)))
for st, nm in [(3, 'Flop'), (4, 'Turn')]:
    for first, seat in [(0.0, 'in position'), (1.0, 'out of position')]:
        for tag, x in [('all', t[(t.street == st) & (t['first'] == first)]), ('unseen flops', t[(t.street == st) & (t['first'] == first) & (t.seed >= 9)])]:
            if len(x) < 12: continue
            e = (x.d - x.y).abs(); print(f'{nm}, {seat}, {tag}: {len(x)} decisions. Solver bets {x.y.mean():.3f} (ahead {x.V.mean():.3f}, behind {x.B.mean():.3f}). On "beats now" {x.now_base.mean():.3f}, misses by {miss(x.now_base, x.y):.3f} (r {np.corrcoef(x.now_base, x.y)[0, 1]:+.2f}). Bluffs counted by their equity {x.d.mean():.3f} (value {x.dv.mean():.3f}, bluffs {x.db.mean():.3f}), misses by {e.mean():.3f} (r {np.corrcoef(x.d, x.y)[0, 1]:+.2f}); within 5 points {np.mean(e < 0.05):.0%}, within 10 {np.mean(e < 0.1):.0%}')
