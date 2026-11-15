# Where a rule loses, by equity step: first-order regrets recorded by derive.mjs (DUMP=values).
import json, numpy as np, sys
R = [json.loads(l) for l in open('out/values.jsonl')]
def pick(what, rnd): return [r for r in R if r['what'] == what and r['round'] == rnd]
def arr(rows):
    B = np.array([r['bins'] for r in rows]); reach = np.array([r['reach'] for r in rows])[:, None]
    return B[:, :, 0], B[:, :, 1], B[:, :, 2] * reach, B[:, :, 3] * reach, reach
def base_plan(w, s, t=None, bluff=None):
    """bet from equity t up; bluffs from the bottom, `bluff` per value bet."""
    n = len(w); t = 1 - 1 / (2 * (1 + s)) if t is None else t; b = s / (1 + s) if bluff is None else bluff
    loud = np.zeros(n); k0 = int(np.ceil(t * n - 1e-9)); loud[k0:] = 1; room = b * w[k0:].sum()
    for k in range(k0):
        if room <= 0: break
        take = min(1, room / w[k]) if w[k] > 0 else 0; loud[k] = take; room -= w[k] * take
    return loud
for what, rnd in (('checkedTo', 1), ('first', 1), ('checkedTo', 0), ('first', 0)):
    rows = [r for r in pick(what, rnd) if r['s'] > 0]
    if not rows: continue
    W, L, RB, RQ, reach = arr(rows); norm = (W * reach).sum() / 100
    plans = np.array([base_plan(W[i], rows[i]['s']) for i in range(len(rows))])
    loss = plans * RB + (1 - plans) * RQ; sol = (L / np.maximum(W, 1e-12)); best = np.minimum(RB, RQ)
    print(f"\n== {what}, {'turn' if rnd == 0 else 'river'}: {len(rows)} decisions. Per equity step of 5 points (0-5 ... 95-100):")
    f = lambda v: ' '.join(f'{x:5.1f}' for x in v)
    print('  share of range %      ', f(100 * (W * reach).sum(0) / (W * reach).sum()))
    print('  solution acts %       ', f(100 * (L * reach).sum(0) / np.maximum((W * reach).sum(0), 1e-9)))
    print('  base rule acts %      ', f(100 * (plans * W * reach).sum(0) / np.maximum((W * reach).sum(0), 1e-9)))
    print('  base rule loses       ', f(loss.sum(0) / norm), ' total', round(loss.sum() / norm, 2))
    print('  always bet loses      ', f(RB.sum(0) / norm), ' total', round(RB.sum() / norm, 2))
    print('  always check loses    ', f(RQ.sum(0) / norm), ' total', round(RQ.sum() / norm, 2))
    print('  best per step loses   ', ' ' * 119, ' total', round(best.sum() / norm, 2))
    # the best single value line and bluff ratio over all these decisions
    out = []
    for t in np.arange(0.5, 1.001, 0.05):
        for b in (0, 0.1, 0.2, 0.3, 0.43, 0.6):
            pl = np.array([base_plan(W[i], rows[i]['s'], t, b) for i in range(len(rows))]); out.append(((pl * RB + (1 - pl) * RQ).sum() / norm, round(t, 2), b))
    out.sort(); print('  best value line and bluffs per value bet:', [(round(a, 2), t, b) for a, t, b in out[:5]], '| base', round(loss.sum() / norm, 2))
