# What each summary of a strategy gives up, over the spots run: mean, median and the worst tenth, turn and river.
import json, sys, numpy as np
for name in ('worth', 'errors'):
    try: rows = [json.loads(l) for l in open(f'out/{name}.jsonl') if l.strip()]
    except FileNotFoundError: continue
    if not rows: continue
    print(f'\n== {name}: {len(rows)} turn spots ({", ".join(f"{a} {sum(r["action"] == a for r in rows)}" for a in sorted({r["action"] for r in rows}))}); % of the pot given up to the solver, per seat')
    print(f'{"":58s} {"turn decisions":>26s}   {"river decisions":>26s}')
    print(f'{"":58s} {"mean":>8s} {"median":>8s} {"worst 10%":>9s}   {"mean":>8s} {"median":>8s} {"worst 10%":>9s}')
    for k in rows[0]['loss']:
        out = []
        for scope in ('turn', 'river'):
            v = np.array([r['loss'][k][scope] for r in rows if k in r['loss']]); out.append(f'{v.mean():8.2f} {np.median(v):8.2f} {np.quantile(v, 0.9):9.2f}')
        print(f'{k:58s} {out[0]}   {out[1]}')
    if name == 'worth':
        for a in sorted({r['action'] for r in rows}):
            sub = [r for r in rows if r['action'] == a]; print(f'  {a} ({len(sub)}): 3 bands {np.mean([r["loss"]["3 bands by strength"]["turn"] for r in sub]):.2f}/{np.mean([r["loss"]["3 bands by strength"]["river"] for r in sub]):.2f}, grid {np.mean([r["loss"]["the 13x13 grid (169 hand classes)"]["turn"] for r in sub]):.2f}/{np.mean([r["loss"]["the 13x13 grid (169 hand classes)"]["river"] for r in sub]):.2f}, frequency only {np.mean([r["loss"]["range frequency only"]["turn"] for r in sub]):.2f}/{np.mean([r["loss"]["range frequency only"]["river"] for r in sub]):.2f}')
