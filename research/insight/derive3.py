# Is the turn base poor because equity is the wrong ruler? On the river equity is the share of his range beaten. On the
# turn a draw has 30% equity and beats nothing yet. The thresholds are about what beats what calls, so try them on the
# share of his range each hand beats now, with draws entering as bluffs that have somewhere to go.
import sys, glob, json, re; sys.path.insert(0, 'research/insight')
from freq_lib import *
from derive import base_with, oop_river
from derive2 import two_streets
import warnings; warnings.filterwarnings('ignore')
rows = []
for f in sorted(glob.glob('research/insight/out/full-*.jsonl')) + [g for g in sorted(glob.glob('research/insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', g).group(1)) >= 7]:
    seed = int(re.search(r'-(\d+)\.jsonl', f).group(1))
    for line in open(f):
        if '"toCall":0' not in line.replace(' ', ''): continue
        d = json.loads(line); n = len(d['board'].replace(' ', '')) // 2
        if n not in (3, 4) or re.search(r'b\d+r\d+', d['line']): continue
        hs = [h for h in d['hands'] if h.get('now') is not None]; W = sum(h['w'] for h in hs)
        if W < 1: continue
        bets = [i for i, a in enumerate(d['actions']) if a['kind'] in ('bet', 'allin')]
        if not bets: continue
        s = min(d['actions'][i]['add'] / d['pot'] for i in bets); spr = d['behind'] / d['pot']; y = sum(d['actions'][i]['freq'] for i in bets)
        w = [h['w'] for h in hs]; E = Dist([h['e'] for h in hs], w); Nw = Dist([h['now'] for h in hs], w)
        # each hand where it would stand if the draws got there as often as they do: now, plus what it draws
        s_r = max(0.0, min(0.75, (spr - s) / (1 + 2 * s))); r_t = s / (1 + s)
        x = dict(seed=seed, spot=d['spot'], street=n, first=float(d['line'].split('|')[-1] == 'first'), y=y, s=s, base_e=base_with(E, s, r_t)[0], base_now=base_with(Nw, s, r_t)[0], drawn=sum(h['w'] * h['draw'] for h in hs) / W)
        if x['first'] == 1: x['oop_now'] = oop_river(Nw, s)['freq']; x['oop_e'] = oop_river(E, s)['freq']
        if n == 4: x['two_e'] = two_streets(E, s, s_r)['freq']; x['two_now'] = two_streets(Nw, s, s_r)['freq']
        rows.append(x)
t = pd.DataFrame(rows); t.to_pickle('research/insight/out/derive3.pkl'); miss = lambda p, y: float(np.mean(np.abs(p - y)))
for st, nm in [(3, 'Flop'), (4, 'Turn')]:
    for first, seat in [(1.0, 'out of position'), (0.0, 'in position')]:
        x = t[(t.street == st) & (t['first'] == first)]; cols = ['base_e', 'base_now'] + (['oop_e', 'oop_now'] if first == 1 else []) + (['two_e', 'two_now'] if st == 4 else [])
        for tag, x in [('', x), (' (unseen flops)', x[x.seed >= 9])]:
          if len(x) > 20: print(f'{nm}, {seat}{tag}: {len(x)} decisions, solver bets {x.y.mean():.3f} | ' + ' | '.join(f'{c} {x[c].mean():.3f} misses {miss(x[c], x.y):.3f} r {np.corrcoef(x[c], x.y)[0, 1]:+.2f}' for c in cols))
