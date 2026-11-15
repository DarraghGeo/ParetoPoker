# What each rule gives up where it is played, and how often it acts against how often the solution does.
import json, sys, numpy as np
name = sys.argv[1] if len(sys.argv) > 1 else 'parts'
rows = [json.loads(l) for l in open(f'out/derive-{name}.jsonl') if l.strip()]
print(f'{name}: {len(rows)} spots. Loss in % of the pot; "acts" is how often the rule bets or continues there, then how often the solution does')
print(f'{"":66s} {"turn":>6s} {"acts":>11s}   {"river":>6s} {"acts":>11s}')
for k in rows[0]['loss']:
    out = []
    for scope in ('turn', 'river'):
        v = np.array([r['loss'][k][scope] for r in rows]); d = [r['does'][k][scope] for r in rows if r['does'][k][scope]]
        acts = f'{100*np.mean([x[0] for x in d]):3.0f} v {100*np.mean([x[1] for x in d]):3.0f}' if d else '    -    '
        out.append(f'{v.mean():6.2f} {acts:>11s}')
    print(f'{k:66s} {out[0]}   {out[1]}')
