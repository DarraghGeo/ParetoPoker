import json, numpy as np
R = [json.loads(l) for l in open('out/values.jsonl')]; n = 20
rows = [r for r in R if r['what'] == 'checkedTo' and r['round'] == 1 and r['s'] > 0]
def rule(w, his, s):
    loud = np.zeros(n); loud[16:] = 1
    if his[:4].sum() >= 0.1:
        room = s / (1 + s) * w[16:].sum()
        for k in range(3):
            if room <= 0: break
            take = min(1, room / w[k]) if w[k] > 0 else 0; loud[k] = take; room -= w[k] * take
    return loud
out = []
for r in rows:
    B = np.array(r['bins']); reach = r['reach']; w = B[:, 0]; his = np.array(r['his']); p = rule(w, his, r['s']); loss = (p * B[:, 2] + (1 - p) * B[:, 3]) * reach
    out.append((loss.sum(), r, p, loss))
out.sort(key=lambda x: -x[0]); total = sum(o[0] for o in out); f = lambda v: ''.join(f'{int(round(x)):>4d}' for x in v)
print('third rule, checked to on the river: total', round(total), '; the eight worst decisions hold', round(100 * sum(o[0] for o in out[:8]) / total), '% and the worst fifty', round(100 * sum(o[0] for o in out[:50]) / total), '%')
for l, r, p, loss in out[:8]:
    B = np.array(r['bins']); w = B[:, 0]
    print(f"\n{r['spot']}  s {r['s']} pot {r['nodePot']} loss {l:.0f}")
    print('  my range %  ', f(100 * w / w.sum())); print('  solution %  ', f(100 * B[:, 1] / np.maximum(w, 1e-9))); print('  rule %      ', f(100 * p)); print('  loss        ', f(loss / l * 100)); print('  his range % ', f(100 * np.array(r['his'])))
    if r['reply']: rep = np.array(r['reply']); print(f"  he folds {100*rep[:,0].sum():.0f} calls {100*rep[:,1].sum():.0f} raises {100*rep[:,2].sum():.0f}")
