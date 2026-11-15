# Experiment 7. Inside each bar of the strength ladder (a kind of hand), does a line of equity follow the betting?
# For every betting decision on the flop and turn with real mixing, and every level with enough hands in it, the
# correlation between how often a hand bets and each kind of equity, inside that level only. Averaged over decisions,
# with how often the sign agrees and how much of the betting inside the level the best measure accounts for.
import json, glob, re, numpy as np, collections, warnings; warnings.filterwarnings('ignore')
LEVELS = ['Set / trips +', 'Two pair', 'Overpair', 'Top pair', 'Middle pair', 'Low pair', 'Draws', 'Trash']
def level(h):
    if h['own'] >= 1 and h['made'] >= 3: return 0
    if h['own'] >= 2 and h['made'] == 2: return 1
    p = h.get('pair')
    if p == 'overpair': return 2
    if p == 'top pair': return 3
    if p == 'middle pair': return 4
    if p in ('bottom pair', 'underpair') or h['own'] >= 1: return 5
    return 6 if (h['fo'] >= 8 or h['so'] >= 4) else 7
MEASURES = {'equity': 'e', 'showdown (ahead now)': 'now', 'draw (still to come)': 'draw', 'against his best hands': 'top', 'what good cards add': 'up', 'what bad cards cost': 'down'}
def wcorr(x, y, w):
    mx = (w * x).sum() / w.sum(); my = (w * y).sum() / w.sum(); v = np.sqrt((w * (x - mx) ** 2).sum() * (w * (y - my) ** 2).sum()); return (w * (x - mx) * (y - my)).sum() / v if v > 1e-9 else np.nan
res = collections.defaultdict(lambda: collections.defaultdict(list)); spread = collections.defaultdict(list); share = collections.defaultdict(list)
files = sorted(glob.glob('../insight/out/full-*.jsonl')) + [f for f in sorted(glob.glob('../insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
for f in files:
    for line in open(f):
        r = json.loads(line); st = len(r['board'].split())
        if st == 5 or r['toCall'] > 0 or min(r['reach']) < 0.05: continue
        hs = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None and h.get('now') is not None and h.get('top') is not None and h.get('up') is not None]
        if len(hs) < 40: continue
        w = np.array([h['w'] for h in hs]); a = np.array([1 - h['p'][0] for h in hs]); y = (w * a).sum() / w.sum()
        if not 0.12 < y < 0.88: continue
        lv = np.array([level(h) for h in hs]); tot = (w * (a - y) ** 2).sum()
        for k in range(len(LEVELS)):
            m = lv == k
            if m.sum() < 8 or w[m].sum() < 0.03 * w.sum(): continue
            ak = a[m]; wk = w[m]; mk = (wk * ak).sum() / wk.sum(); var = (wk * (ak - mk) ** 2).sum() / wk.sum(); share[(st, k)].append(w[m].sum() / w.sum()); spread[(st, k)].append(var)
            if var < 0.01: continue
            for name, key in MEASURES.items():
                x = np.array([h[key] for h, ok in zip(hs, m) if ok], float); c = wcorr(x, ak, wk)
                if not np.isnan(c): res[(st, k)][name].append(c)
for st in (3, 4):
    print(f"\n== {'Flop' if st == 3 else 'Turn'} betting: inside each bar, how each line goes with betting (correlation; share of decisions with the same sign)")
    for k, name in enumerate(LEVELS):
        R = res[(st, k)]
        if not R or len(next(iter(R.values()))) < 25: continue
        n = len(next(iter(R.values()))); mixes = np.mean(np.array(spread[(st, k)]) >= 0.01)
        rows = sorted(((np.mean(v), m, np.mean(np.sign(v) == np.sign(np.mean(v)))) for m, v in R.items()), key=lambda t: -abs(t[0]))
        print(f'  {name:14s} ({n:4d} decisions; {100*np.mean(share[(st, k)]):2.0f}% of the range; the bar is not all one action in {100*mixes:2.0f}%)   ' + '   '.join(f'{m} {c:+.2f} ({100*s:.0f}%)' for c, m, s in rows[:4]))
