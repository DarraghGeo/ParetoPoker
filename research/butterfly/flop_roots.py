# The flops the flop solver starts from: each stored full hand's first decision with both ranges, out of store.mjs's rows.
#   node research/butterfly/store.mjs fullhand <dir>/fullhand.jsonl && STORE=<dir> python3 research/butterfly/flop_roots.py
import json, os
S = os.environ['STORE']; n = 0
with open(os.path.join(S, 'flop-roots.jsonl'), 'w') as out:
    for t in open(os.path.join(S, 'fullhand.jsonl')):
        if '"line":"f|"' not in t: continue
        d = json.loads(t)
        if d['seat'] == 0: out.write(json.dumps({k: d[k] for k in ('spot', 'pre', 'action', 'board', 'pot', 'behind', 'hands', 'vr')}) + '\n'); n += 1
print(n, 'flops')
