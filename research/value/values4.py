import json, numpy as np
R = [json.loads(l) for l in open('out/values.jsonl')]; n = 20
def plan(w, t, room):
    loud = np.zeros(n); k0 = int(np.ceil(t * n - 1e-9)); loud[k0:] = 1
    for k in range(k0):
        if room <= 0: break
        take = min(1, room / w[k]) if w[k] > 0 else 0; loud[k] = take; room -= w[k] * take
    return loud
for what, t, need in (('checkedTo', 0.8, 0.2),):
    rows = [r for r in R if r['what'] == what and r['round'] == 1 and r['s'] > 0]
    tot = np.zeros(n); base = np.zeros(n); floor = np.zeros(n); W = np.zeros(n); sol = np.zeros(n); mine = np.zeros(n); split = {'he has weak hands': [0, 0, 0, 0], 'he has few weak hands': [0, 0, 0, 0]}
    for r in rows:
        B = np.array(r['bins']); reach = r['reach']; w, L, RB, RQ = B[:, 0], B[:, 1], B[:, 2] * reach, B[:, 3] * reach; his = np.array(r['his']); weak = his[:6].sum() >= need; s = r['s']
        p = plan(w, t, (s / (1 + s)) * w[int(t * n):].sum() if weak else 0); loss = p * RB + (1 - p) * RQ; tot += loss; floor += np.minimum(RB, RQ); W += w * reach; sol += L * reach; mine += p * w * reach
        g = split['he has weak hands' if weak else 'he has few weak hands']; g[0] += loss.sum(); g[1] += np.minimum(RB, RQ).sum(); g[2] += (w * reach).sum(); g[3] += 1
    f = lambda v: ' '.join(f'{x:5.1f}' for x in v); norm = tot.sum() / 100
    print(what, 'rule: value from', t, 'bluff if he has', need, 'under 30. Loss by equity step, as % of the rule total:')
    print('  share of range ', f(100 * W / W.sum())); print('  solution acts %', f(100 * sol / np.maximum(W, 1e-9))); print('  rule acts %    ', f(100 * mine / np.maximum(W, 1e-9))); print('  rule loses     ', f(tot / norm)); print('  floor          ', f(floor / norm))
    for k, g in split.items(): print(f'  {k}: {g[3]} decisions, {100*g[2]/W.sum():.0f}% of the weight, loses {g[0]/norm:.0f} (floor {g[1]/norm:.0f})')
    # in the spots where he has few weak hands: what would the best value line alone be, and the best bluffs?
    for name, sel in (('he has weak hands', True), ('he has few weak hands', False)):
        best = []
        for tt in (0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95):
            for ratio in (0, 0.15, 0.3, 0.43, 0.6, 1.0, 5.0):
                l = 0
                for r in rows:
                    B = np.array(r['bins']); reach = r['reach']; w = B[:, 0]; his = np.array(r['his'])
                    if (his[:6].sum() >= need) != sel: continue
                    p = plan(w, tt, ratio * w[int(round(tt * n)):].sum()); l += ((p * B[:, 2] + (1 - p) * B[:, 3]) * reach).sum()
                best.append((l / norm, tt, ratio))
        best.sort(); print(f'  {name}: best (loss, value line, bluffs per value bet):', [(round(a, 1), b, c) for a, b, c in best[:4]])
