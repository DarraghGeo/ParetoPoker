# Where the formulas' amounts part from the solver's, weighted by how often the decision is reached and the pot there.
import json, sys, pandas as pd, numpy as np
rows = []
for l in open(sys.argv[1] if len(sys.argv) > 1 else 'research/insight/out/play-full-diag.jsonl'):
    r = json.loads(l)
    for key, g in r.get('diag', {}).items():
        street, kind, tex = key.split('|'); rows.append(dict(spot=r['spot'], board=r['board'], action=r['action'], street=street, kind=kind, tex=tex, **g))
d = pd.DataFrame(rows).fillna(0); spots = d.groupby(['spot', 'board']).ngroups; print(spots, 'spots'); pd.set_option('display.width', 250)
ORDER = {'flop': 0, 'turn': 1, 'river': 2}
def show(kind, names, by=('street', 'tex')):
    x = d[d.kind == kind]; g = x.groupby(list(by)).sum(numeric_only=True); out = pd.DataFrame({'weight': (g['w'] / spots).round(3)})
    for nm in names: out[nm + ': solver'] = (g[nm + '_solver'] / g['w']).round(2); out[nm + ': ours less his'] = (g[nm] / g['w']).round(2); out[nm + ': gap'] = (g[nm + '_abs'] / g['w']).round(2)
    out['cost proxy'] = sum(g[nm + '_abs'] for nm in names).div(spots).round(3)
    print(f'\n== {kind} =='); print(out.sort_index(key=lambda i: i.map(lambda v: ORDER.get(v, v))).to_string())
show('first to act', ['bet', 'big']); show('after a check', ['bet', 'big']); show('face a bet', ['fold', 'raise']); show('face a raise', ['fold', 'raise'])
