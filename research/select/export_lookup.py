"""Fit the river lookup tables on half of the spots (by a hash of the spot's name) and write them for exploit.mjs to
score on the other half.   python3 export_lookup.py <select-river.jsonl> <out.json>
first to act: category x equity band x nut advantage -> check / small / three quarters / big
facing a bet: equity band x bet size -> fold / call / raise;   facing a raise: equity against the price -> fold / call
Each cell carries the pure action that loses least and the solver's average mix in the cell."""
import sys, json, collections
import category, lookup, facing
half = lambda name: sum(map(ord, name)) % 2
out = {}
for sit in ('first-oop', 'first-ip'):
    spots = [d for d in category.load(sys.argv[1], sit) if d['nbets'] >= 3 and d['kinds'][1:4] == ['bet', 'bet', 'bet'] and half(d['spot']) == 0]
    acc = collections.defaultdict(lambda: [[0.0] * 4, [0.0] * 4, 0.0])
    for d in spots:
        for h in d['hands']:
            a = acc['|'.join((h['cat'], lookup.eband(h['e']), 'ahead' if d['nutAdv'] > 0 else 'behind'))]; top = max(h['v'][:4])
            for j in range(4): a[0][j] += h['w'] * (top - h['v'][j]); a[1][j] += h['w'] * h['p'][j]
            a[2] += h['w']
    out[sit] = {k: {'pure': min(range(4), key=lambda j: a[0][j]), 'mix': [x / a[2] for x in a[1]]} for k, a in acc.items()}
for seat in ('oop', 'ip'):
    for what in ('bet', 'raise'):
        spots = [d for d in facing.load(sys.argv[1], 0 if seat == 'oop' else 1, what) if half(d['spot']) == 0]; acc = collections.defaultdict(lambda: [[0.0] * 3, [0.0] * 3, 0.0])
        for d in spots:
            for h in d['hands']:
                k = '|'.join((facing.eband(h['e']), d['size'])) if what == 'bet' else facing.KEYS['vs price'](d, h); a = acc[k]; top = max(h['V'])
                for j in range(3): a[0][j] += h['w'] * (top - h['V'][j]); a[1][j] += h['w'] * h['P'][j]
                a[2] += h['w']
        out[f'facing-{what}-{seat}'] = {k: {'pure': min(range(3), key=lambda j: a[0][j]), 'mix': [x / a[2] for x in a[1]]} for k, a in acc.items()}
json.dump(out, open(sys.argv[2], 'w')); print({k: len(v) for k, v in out.items()})
