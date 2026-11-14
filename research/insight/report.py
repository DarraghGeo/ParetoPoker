# Runs every idea on all the flops and on two halves of them, and says where each one flips.
#   python3 report.py -> out/ideas.json and a table on screen
import sys, json; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
import ideas
flop = load(street=3); flop['size_pos'] = (flop['size'] - flop.smin) / (flop.smax - flop.smin); flop['nodraw'] = ~flop.fd & ~flop.oesd & ~flop.gut; flop['over_real'] = flop.v - flop.e
turn = load(street=4); turn['nodraw'] = ~turn.fd & ~turn.oesd & ~turn.gut
who = turn.line.str.split('|').str[0].str.replace(r'\d', '', regex=True); pos = turn.line.str.split('|').str[1]
DATA = {'bet': flop[~flop.facing], 'face': flop[flop.facing], 'barrel': turn[((who == 'bc') & (pos == 'first')) | ((who == 'xbc') & (pos == 'x'))], 'delayed': turn[(who == 'xx') & (pos == 'x')], 'probe': turn[(who == 'xx') & (pos == 'first')]}
CTX = {k: context(v) for k, v in DATA.items()}
spots = sorted(flop.spot.unique()); half = {s: i % 2 for i, s in enumerate(spots)}
print(f'{len(spots)} flops: ' + ', '.join(f'{a} {n}' for a, n in flop.groupby('action').spot.nunique().items()))
out = []
for it in ideas.I:
    data = DATA[it['where']]; cols = [it['key'], 'e']
    r = paired(data, it['A'], it['B'], cols, match=it['match'], min_w=it['min_w'])
    if not len(r): continue
    v = verdict(r, cols, show=False)[it['key']]; r['half'] = r.cl.map(half)
    hs = [verdict(r[r.half == h], cols, show=False).get(it['key'], dict(mean=np.nan, t=np.nan, n=0)) for h in (0, 1)]
    s = it['sign']; ok = lambda x, t: x['n'] >= 8 and np.sign(x['mean']) == s and abs(x['t']) >= t
    grade = 'holds' if ok(v, 3) and ok(hs[0], 1.7) and ok(hs[1], 1.7) and v['agree'] >= 0.65 else 'reversed' if v['n'] >= 16 and np.sign(v['mean']) == -s and abs(v['t']) >= 3 and all(np.sign(h['mean']) == -s for h in hs) else 'leans' if ok(v, 2) else 'thin' if v['n'] < 16 else 'no'
    mods = moderators(r, CTX[it['where']], it['key'], show=False, floor=20)[:3]
    by_action = r.assign(a=r.pre.str.split('-').str[0]).groupby('a')[it['key']].agg(['mean', 'count']).round(3).to_dict('index')
    out.append(dict(id=it['id'], where=it['where'], say=it['say'], why=it['why'], key=it['key'], grade=grade, mean=v['mean'], t=v['t'], agree=v['agree'], flops=v['n'], halves=[(h['mean'], h['t'], h['n']) for h in hs], equity=float(r['e'].mean()),
                    mods=[dict(by=c, r=rho, low=lo, high=hi, n=[nl, nh]) for _, c, rho, lo, hi, nl, nh in mods], by_action=by_action))
    print(f"{grade:<9} {it['where']:<7} {it['say'][:88]:<88} {it['key']:<9} {v['mean']:+.3f} t {v['t']:+5.1f} {v['agree']:.0%} n {v['n']:3d} | halves {hs[0]['mean']:+.2f} {hs[1]['mean']:+.2f}" + ''.join(f" | {m[1]} {m[3]:+.2f}/{m[4]:+.2f}" for m in mods[:2] if abs(m[2]) >= 0.3))
json.dump(out, open('research/insight/out/ideas.json', 'w'), indent=1, default=float)
