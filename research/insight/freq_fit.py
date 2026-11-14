# Which facts about the spot explain the gap between the derived base and the solver, and how they balance.
# The base enters as a fixed offset (never refitted); corrections are added on the log-odds scale and judged
# only on flops the fit has not seen.
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
import warnings; warnings.filterwarnings('ignore')
d = pd.read_pickle('research/insight/out/decisions.pkl')
d['lspr'] = np.log(d.spr.clip(0.05, 30)); d['street4'] = (d.street == 4).astype(float); d['street5'] = (d.street == 5).astype(float)
def cv_fit(x, y, off, groups, feats, l2=1.0, folds=6):
    """Ridge on the residual log-odds, tested on whole flops left out. Returns mean absolute error in frequency, out of sample."""
    X = x[feats].to_numpy(float); mu, sd = np.nanmean(X, 0), np.nanstd(X, 0) + 1e-9; X = np.nan_to_num((X - mu) / sd); r = logit(y) - logit(off); g = pd.factorize(groups)[0] % folds; pred = np.zeros(len(y))
    for k in range(folds):
        tr, te = g != k, g == k; A = np.c_[np.ones(tr.sum()), X[tr]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0
        beta = np.linalg.solve(A.T @ A + P, A.T @ r[tr]); pred[te] = np.c_[np.ones(te.sum()), X[te]] @ beta
    return float(np.mean(np.abs(expit(logit(off) + pred) - y))), pred
def full_fit(x, y, off, feats, l2=1.0):
    X = x[feats].to_numpy(float); mu, sd = np.nanmean(X, 0), np.nanstd(X, 0) + 1e-9; Z = np.nan_to_num((X - mu) / sd); A = np.c_[np.ones(len(y)), Z]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0
    beta = np.linalg.solve(A.T @ A + P, A.T @ (logit(y) - logit(off))); return beta, mu, sd
def distill(name, x, ycol, offcol, cands, max_feats=7):
    x = x[x[offcol].notna()].reset_index(drop=True); y = x[ycol].to_numpy(float); off = x[offcol].to_numpy(float); r = logit(y) - logit(off)
    print(f'\n=== {name}: {len(x)} decisions on {x.spot.nunique()} flops. Base alone misses by {np.mean(np.abs(off - y)):.3f}; base with one constant by {cv_fit(x, y, off, x.spot, [])[0]:.3f} ===')
    print('  each factor against the gap (correlation with what the base leaves over):')
    cor = sorted([(abs(np.corrcoef(x[c].fillna(x[c].mean()), r)[0, 1]), c, np.corrcoef(x[c].fillna(x[c].mean()), r)[0, 1]) for c in cands if x[c].std() > 0], reverse=True)
    print('   ' + '  '.join(f'{c} {v:+.2f}' for _, c, v in cor[:14]))
    chosen = []; best = cv_fit(x, y, off, x.spot, [])[0]
    while len(chosen) < max_feats:
        trial = [(cv_fit(x, y, off, x.spot, chosen + [c])[0], c) for c in cands if c not in chosen and x[c].std() > 0]; e, c = min(trial)
        if best - e < 0.002: break
        chosen.append(c); best = e; print(f'   + {c:<12} -> misses by {e:.3f}')
    beta, mu, sd = full_fit(x, y, off, chosen); print('   balance (change in log-odds for one standard deviation): const %+.2f  ' % beta[0] + '  '.join(f'{c} {b:+.2f}' for c, b in zip(chosen, beta[1:])))
    return chosen
PRE = ['ip', 'raiser', 'adv', 'nut_adv', 'strong_adv', 'air_adv', 'sd_adv', 'top_adv', 'my_sd', 'his_sd', 'my_nut', 'his_nut', 'my_air', 'his_air', 'my_mid', 'his_mid', 'lspr', 'swing', 'drawn', 'draws', 'two_tone', 'monotone', 'paired', 'connected', 'high']
b = d[d.kind == 'bet']; f = d[d.kind == 'face']
if __name__ == '__main__':
    distill('Flop: how often the range bets', b[b.street == 3], 'y', 'vn_min', PRE + ['first'])
    distill('Turn: how often the range bets', b[b.street == 4], 'y', 'vn_min', PRE + ['first'])
    if (b.street == 5).sum() > 150: distill('River: how often the range bets', b[b.street == 5], 'y', 'vn_min', [c for c in PRE if c not in ('swing', 'drawn', 'draws')] + ['first'])
    distill('All streets together: how often the range bets', b, 'y', 'vn_min', PRE + ['first', 'street4', 'street5'])
    FP = PRE + ['s', 'bettor_ip', 'raise_allowed']
    for st, nm in [(3, 'Flop'), (4, 'Turn'), (5, 'River')]:
        x = f[f.street == st]
        if len(x) > 120:
            distill(f'{nm}: how often the range folds to a bet (base: the price)', x, 'y', 'alpha', FP); distill(f'{nm}: how often the range folds to a bet (base: thresholds)', x, 'y', 'fold_thr', FP)
