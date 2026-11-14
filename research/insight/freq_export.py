# The fitted corrections in a form the play test can use: only facts that are cheap to work out at every decision
# (the shapes of the two ranges, the seat, the stacks, the board), fitted on every collected flop.
#   frequency = expit(logit(base) + const + sum of slope x factor)      -> out/tuned.json
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
import warnings; warnings.filterwarnings('ignore')
d = pd.read_pickle('research/insight/out/decisions.pkl'); d['lspr'] = np.log(d.spr.clip(0.05, 30)); d['base_raise'] = 0.5
def cv(x, y, off, feats, l2=1.0, folds=6):
    X = x[feats].to_numpy(float) if feats else np.zeros((len(x), 0)); mu = np.nanmean(X, 0) if feats else 0; sd = (np.nanstd(X, 0) + 1e-9) if feats else 1; Z = np.nan_to_num((X - mu) / sd); r = logit(y) - logit(off); g = pd.factorize(x.spot)[0] % folds; pred = np.zeros(len(y))
    for k in range(folds):
        tr, te = g != k, g == k; A = np.c_[np.ones(tr.sum()), Z[tr]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0; pred[te] = np.c_[np.ones(te.sum()), Z[te]] @ np.linalg.solve(A.T @ A + P, A.T @ r[tr])
    return float(np.mean(np.abs(expit(logit(off) + pred) - y)))
def fit(x, y, off, feats, l2=1.0):
    X = x[feats].to_numpy(float) if feats else np.zeros((len(x), 0)); mu = np.nanmean(X, 0) if feats else np.zeros(0); sd = (np.nanstd(X, 0) + 1e-9) if feats else np.ones(0); Z = np.nan_to_num((X - mu) / sd); A = np.c_[np.ones(len(y)), Z]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0
    beta = np.linalg.solve(A.T @ A + P, A.T @ (logit(y) - logit(off))); slope = beta[1:] / sd; return float(beta[0] - (slope * mu).sum()), dict(zip(feats, map(float, slope)))
def formula(x, ycol, offcol, cands, limit=5, gain=0.003):
    x = x[x[offcol].notna() & x[ycol].notna()].reset_index(drop=True); y = x[ycol].to_numpy(float); off = x[offcol].to_numpy(float); cands = [c for c in cands if x[c].notna().mean() > 0.95 and x[c].std() > 0]
    chosen = []; best = cv(x, y, off, chosen); start = float(np.mean(np.abs(off - y)))
    while len(chosen) < limit:
        e, c = min((cv(x, y, off, chosen + [c]), c) for c in cands if c not in chosen)
        if best - e < gain: break
        chosen.append(c); best = e
    const, slopes = fit(x, y, off, chosen); return dict(n=len(x), base_miss=start, miss=best, const=const, slopes=slopes)
RANGE = ['adv', 'nut_adv', 'strong_adv', 'air_adv', 'sd_adv', 'my_sd', 'his_sd', 'my_nut', 'his_nut', 'my_air', 'his_air', 'my_mid', 'his_mid']; SPOT = ['lspr', 'two_tone', 'monotone', 'paired', 'connected', 'high']
out = {'bet': {}, 'fold': {}, 'raise': {}}; b = d[d.kind == 'bet']; f = d[d.kind == 'face']
for st in [3, 4, 5]:
    for first in [1, 0]:
        r = formula(b[(b.street == st) & (b['first'] == first)], 'y', 'vn_min', RANGE + SPOT); out['bet'][f'{st}|{first}'] = r; print(f'bet street {st} first {first}: n {r["n"]} base misses {r["base_miss"]:.3f} tuned {r["miss"]:.3f} | {r["const"]:+.2f}' + ''.join(f' {s:+.2f} {c}' for c, s in r['slopes'].items()))
    r = formula(f[f.street == st], 'y', 'fold_thr', RANGE + SPOT + ['ip', 's', 'prior_adv']); out['fold'][str(st)] = r; print(f'fold street {st}: n {r["n"]} base misses {r["base_miss"]:.3f} tuned {r["miss"]:.3f} | {r["const"]:+.2f}' + ''.join(f' {s:+.2f} {c}' for c, s in r['slopes'].items()))
r = formula(f[(f.street == 3) & (f.raise_allowed == 1)], 'y_raise', 'base_raise', RANGE + SPOT + ['ip', 's', 'prior_adv']); out['raise']['3'] = r; print(f'raise flop: n {r["n"]} tuned {r["miss"]:.3f} | {r["const"]:+.2f}' + ''.join(f' {s:+.2f} {c}' for c, s in r['slopes'].items()))
json.dump(out, open('research/insight/out/tuned.json', 'w'), indent=1)
