# Can the chart give equity more closely? Equity fitted on what is beaten now and the draw class, with and without the ladder level.
import json, glob, numpy as np, collections
rows = collections.defaultdict(list)
for f in glob.glob('out/cells-*.jsonl'):
    for l in open(f):
        try: r = json.loads(l)
        except Exception: continue
        if r['street'] == 5: continue
        for c in r['cells']: rows[r['street']].append((c[1] / 20 + .025, c[3] / 20 + .025, c[2], c[0], c[4]))
names = ['trash', 'draw', 'low pair', 'middle pair', 'top pair', 'overpair', 'two pair', 'set+']
for st in sorted(rows):
    A = np.array(rows[st]); e, n, cb, lv, w = A.T; W = np.sqrt(w)[:, None]
    def fit(X): beta = np.linalg.lstsq(X * W, e * W[:, 0], rcond=None)[0]; return beta, 100 * np.average(np.abs(X @ beta - e), weights=w)
    b1, m1 = fit(np.c_[np.ones(len(A)), n, cb == 1, cb == 2]); L = np.stack([(lv == k) for k in range(8)], 1).astype(float); b2, m2 = fit(np.c_[L, cb == 1, cb == 2]); b3, m3 = fit(np.c_[L, n, cb == 1, cb == 2])
    print(f'{"flop" if st == 3 else "turn"}: out by {m1:.1f} points from beaten-now and draw; {m2:.1f} from the level and draw alone; {m3:.1f} from all three')
    print('   by level alone (plain / gutshot or overcards / draw): ' + ', '.join(f'{names[k]} {100*b2[k]:.0f}' for k in range(8)) + f' | +{100*b2[8]:.0f} gutshot/overs, +{100*b2[9]:.0f} draw')
    print('   mean equity by level: ' + ', '.join(f'{names[k]} {100*np.average(e[lv == k], weights=w[lv == k]):.0f}' for k in range(8) if (lv == k).sum() > 3))
