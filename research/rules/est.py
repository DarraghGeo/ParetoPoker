# Equity from what the chart shows: how much of his range the hand beats now, and whether it has a draw. A line fitted by
# street and by kind of decision, and how far out it is.
import json, glob, numpy as np, collections
rows = collections.defaultdict(list)
for f in glob.glob(__import__('os').environ.get('PATTERN', 'out/cells-*.jsonl')):
    for l in open(f):
        try: r = json.loads(l)
        except Exception: continue
        if r['street'] == 5: continue
        key = (r['street'], 'bet' if r['what'] in ('first', 'checkedTo') else 'face')
        for c in r['cells']: rows[key].append((c[1] / 20 + .025, c[3] / 20 + .025, c[2], c[0], c[4]))
for key in sorted(rows):
    A = np.array(rows[key]); e, n, cb, lv, w = A.T; X = np.c_[np.ones(len(A)), n, cb == 1, cb == 2]; W = np.sqrt(w)[:, None]; beta = np.linalg.lstsq(X * W, e * W[:, 0], rcond=None)[0]; err = np.abs(X @ beta - e)
    print(f'{key}: equity = {100*beta[0]:.0f} + {beta[1]:.2f} x (share of his range beaten now) + {100*beta[2]:.0f} with a gutshot or overcards + {100*beta[3]:.0f} with a draw   | out by {100*np.average(err, weights=w):.1f} points on average ({len(A)} cells)')
    for lo, hi in ((0, .3), (.3, .6), (.6, .8), (.8, 1.01)):
        m = (n >= lo) & (n < hi); print(f'      beats {100*lo:.0f}-{100*min(hi,1):.0f}% now: equity ' + ', '.join(f'{nm} {100*np.average(e[m & (cb == k)], weights=w[m & (cb == k)]):.0f}%' for k, nm in enumerate(['plain', 'gutshot/overs', 'draw']) if (m & (cb == k)).sum() > 5))
