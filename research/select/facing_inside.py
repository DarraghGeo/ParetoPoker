"""Facing a river bet: inside one category in one spot, which characteristic picks the hands that continue? The solver's
continue share of the category is kept; hands are chosen by a characteristic.   python3 facing_inside.py <file> <oop|ip> <bet|raise>"""
import sys, collections
from category import ORDER, TOL
from facing import load
spots = load(sys.argv[1], 0 if sys.argv[2] == 'oop' else 1, sys.argv[3])
for h in (h for d in spots for h in d['hands']): h['blk'] = h['ubWeak'] - h['ubStrong']
F = [('random', 0), ('e', 1), ('e', -1), ('kick', 1), ('kick', -1), ('ubStrong', -1), ('ubStrong', 1), ('ubWeak', 1), ('ubWeak', -1), ('blk', 1)]
NAME = {('e', 1): 'highest equity', ('e', -1): 'lowest equity', ('kick', 1): 'highest kicker / side card', ('kick', -1): 'lowest kicker / side card', ('ubStrong', -1): 'blocks his strong hands most', ('ubStrong', 1): 'blocks his strong hands least', ('ubWeak', 1): 'blocks his weak hands least', ('ubWeak', -1): 'blocks his weak hands most', ('blk', 1): 'blocks value and not bluffs', ('random', 0): 'random'}
print('| Category | Spots where it splits | ' + ' | '.join(NAME[f] for f in F) + ' |\n|---|---|' + '---|' * len(F))
for cat in ORDER:
    res = collections.defaultdict(lambda: [0.0, 0.0]); n = tot = 0
    for d in spots:
        hs = [h for h in d['hands'] if h['cat'] == cat]; w = sum(h['w'] for h in hs)
        if w < 0.02 or len(hs) < 6: continue
        tot += 1; gap = lambda h: max(h['V'][1], h['V'][2]) - h['V'][0]
        okf = sum(h['w'] * (gap(h) <= TOL) for h in hs) / w; okc = sum(h['w'] * (gap(h) >= -TOL) for h in hs) / w
        if okf >= 0.9 or okc >= 0.9: continue
        n += 1; share = sum(h['w'] * (1 - h['P'][0]) for h in hs)
        for f, sign in F:
            order = sorted(hs, key=(lambda h: hash(h['h']) % 997) if f == 'random' else (lambda h: -sign * h[f])); need = share
            for h in order: t = min(h['w'], need); need -= t; g = gap(h); r = res[(f, sign)]; r[0] += t * max(-g, 0) + (h['w'] - t) * max(g, 0); r[1] += h['w']
    if n >= 8: print(f'| {cat} | {n} of {tot} | ' + ' | '.join(f'{res[f][0] / res[f][1]:.2f}' for f in F) + ' |')
