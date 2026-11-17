# The tables as the two pages give them, every cell filled, for a program to play: rules-final.json.
# A cell with under 0.3% of the range in the data (or none) takes the next band up in its column.
#   python3 research/butterfly/final_tables.py
import json, os, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); R = json.load(open(os.path.join(HERE, 'rules-hybrid.json'))); out = {}
for nm, t in R.items():
    names = t['names']; labs = [t['labels'][n] for n in names]; got = {tuple(c['key']): c for c in t['cells'] if c['share'] >= 0.003}; cells = {}
    for key in itertools.product(*labs):
        src = got.get(key)
        if not src:
            i = labs[0].index(key[0])
            for j in list(range(i + 1, len(labs[0]))) + list(range(i - 1, -1, -1)):
                if (labs[0][j],) + key[1:] in got: src = got[(labs[0][j],) + key[1:]]; break
        cells['|'.join(key)] = src['quarters'] if src else [4, 0, 0]
    out[nm] = dict(names=names, labels=labs, cells=cells)
json.dump(out, open(os.path.join(HERE, 'rules-final.json'), 'w'), indent=1); print('ok', len(out))
