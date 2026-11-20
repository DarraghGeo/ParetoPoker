"""Inside one lookup cell, how much of the bet-or-check question is decided by the spot and how much by the hand, and
which reads of the spot move it.   python3 cellspots.py <file> <sit> "<category>" "<equity band>" <ahead|behind>"""
import sys, math, collections
from category import load, corr, TOL
from lookup import KEYS, eband
spots = [d for d in load(sys.argv[1], sys.argv[2]) if d['nbets'] >= 3 and d['kinds'][1:4] == ['bet', 'bet', 'bet']]; cat, band, adv = sys.argv[3:6]
rows = []
for d in spots:
    if KEYS['nut advantage'](d, None) != adv and adv != 'any': continue
    hs = [h for h in d['hands'] if h['cat'] == cat and eband(h['e']) == band]; w = sum(h['w'] for h in hs)
    if w < 0.005 or len(hs) < 3: continue
    m = sum(h['w'] * h['gap'] for h in hs) / w; var = sum(h['w'] * (h['gap'] - m) ** 2 for h in hs) / w
    rows.append({'d': d, 'w': w, 'gap': m, 'var': var, 'pbet': sum(h['w'] * h['pbet'] for h in hs) / w, 'size': sum(h['w'] * h['size'] for h in hs) / w, 'hs': hs})
W = sum(r['w'] for r in rows); M = sum(r['w'] * r['gap'] for r in rows) / W; between = sum(r['w'] * (r['gap'] - M) ** 2 for r in rows) / W; within = sum(r['w'] * r['var'] for r in rows) / W
print(f"{cat} | {band} | {adv}: {len(rows)} spots. Bet minus check: mean {M:+.2f}; spread between spots {math.sqrt(between):.2f}, between hands of one spot {math.sqrt(within):.2f}")
D = {'nut advantage': lambda d: d['nutAdv'], 'my strong share': lambda d: d['myStrong'], 'his strong share': lambda d: d['hisStrong'], 'his weak share': lambda d: d['hisWeak'], 'my weak share': lambda d: d['myWeak'], 'range equity': lambda d: d['rangeEq'],
     'stack/pot': lambda d: min(d['spr'], 5), 'he bets after check': lambda d: d.get('hisBetsAfter') or 0, 'he calls a bet': lambda d: d.get('hisCalls') or 0, 'he raises a bet': lambda d: d.get('hisRaises') or 0,
     'my value per air': lambda d: d['myStrong'] / max(d['myWeak'], 0.02), 'his middle share': lambda d: 1 - d['hisStrong'] - d['hisWeak']}
ws = [r['w'] for r in rows]
print('  correlation with the gap / solver bet share: ' + '; '.join(f'{k} {a:+.2f}/{b:+.2f}' for k, a, b in sorted(((k, corr([f(r['d']) for r in rows], [r['gap'] for r in rows], ws), corr([f(r['d']) for r in rows], [r['pbet'] for r in rows], ws)) for k, f in D.items()), key=lambda x: -abs(x[1]))))
for name in sys.argv[6:]:
    f = D[name]; xs = sorted(rows, key=lambda r: f(r['d'])); n = len(xs) // 4
    for q in range(4):
        rs = xs[q * n:(q + 1) * n if q < 3 else len(xs)]; w = sum(r['w'] for r in rs)
        okc = sum(h['w'] * (h['gap'] <= TOL) for r in rs for h in r['hs']) / w; okb = sum(h['w'] * (h['gap'] >= -TOL) for r in rs for h in r['hs']) / w
        print(f"    {name} {f(rs[0]['d']):.2f} to {f(rs[-1]['d']):.2f}: solver bets {100 * sum(r['w'] * r['pbet'] for r in rs) / w:.0f}%, gap {sum(r['w'] * r['gap'] for r in rs) / w:+.2f}, may check {100 * okc:.0f}%, may bet {100 * okb:.0f}%, usual best size {sum(r['w'] * r['size'] for r in rs) / w:.1f} (0 small, 2 big)")
