# How often a range bets, in two parts that each have a derived base:
#   value: the hands above an equity level b (base: the von Neumann value threshold)
#   bluffs: so many for every value bet (base: s/(1+s), the price he gets)
# Corrections are added to b (in equity) and to the log of the bluff ratio, chosen and judged on flops left out.
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
import warnings; warnings.filterwarnings('ignore')
d = pd.read_pickle('research/insight/out/decisions.pkl'); d['lspr'] = np.log(d.spr.clip(0.05, 30)); b = d[d.kind == 'bet'].reset_index(drop=True)
def F_above(e, w, t): return float(w[e >= t].sum() / w.sum())
def ridge_cv(Z, r, g, folds, l2):
    pred = np.zeros(len(r))
    for k in range(folds):
        tr, te = g != k, g == k; A = np.c_[np.ones(tr.sum()), Z[tr]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0; pred[te] = np.c_[np.ones(te.sum()), Z[te]] @ np.linalg.solve(A.T @ A + P, A.T @ r[tr])
    return pred
def prep(x, feats):
    X = x[feats].to_numpy(float) if feats else np.zeros((len(x), 0)); mu = np.nanmean(X, 0) if feats else np.zeros(0); sd = (np.nanstd(X, 0) + 1e-9) if feats else np.ones(0); return np.nan_to_num((X - mu) / sd), mu, sd
def predict(x, db, lr):
    """From a shift of the value threshold and of the log bluff ratio to a bet frequency, through the range's own curve."""
    bhat = np.clip(x.vn_b.to_numpy() + db, 0.3, 1.0); V = np.array([F_above(e, w, t) for e, w, t in zip(x.me, x.mw, bhat)]); rho = x.vn_ratio.to_numpy() * np.exp(lr)
    return np.minimum(1.0, V * (1 + rho)), V, V * rho
def evaluate(x, fv, fb, folds=6, l2=2.0):
    g = pd.factorize(x.spot)[0] % folds; ok = (x.V > 0.01).to_numpy()
    Zv, _, _ = prep(x, fv); Zb, _, _ = prep(x, fb); rv = (x.b_eff - x.vn_b).to_numpy(); rb = np.log(np.clip(x.B / x.V.clip(0.01), 0.02, 20) / x.vn_ratio).to_numpy()
    # the bluff ratio is fitted where there are value bets to count against
    pv = ridge_cv(Zv, rv, g, folds, l2); pb = np.zeros(len(x)); 
    for k in range(folds):
        tr, te = (g != k) & ok, g == k; A = np.c_[np.ones(tr.sum()), Zb[tr]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0; pb[te] = np.c_[np.ones(te.sum()), Zb[te]] @ np.linalg.solve(A.T @ A + P, A.T @ rb[tr])
    yhat, V, B = predict(x, pv, pb); return float(np.mean(np.abs(yhat - x.y))), float(np.mean(np.abs(V - x.V))), float(np.mean(np.abs(B - x.B))), yhat
def choose(x, cands, part, other, limit=6):
    chosen = []; best = evaluate(x, chosen if part == 'v' else other, other if part == 'v' else chosen)[0]
    while len(chosen) < limit:
        trial = [(evaluate(x, chosen + [c] if part == 'v' else other, other if part == 'v' else chosen + [c])[0], c) for c in cands if c not in chosen and x[c].std() > 0 and x[c].notna().mean() > 0.9]
        e, c = min(trial)
        if best - e < 0.002: break
        chosen.append(c); best = e
    return chosen, best
PRE = ['ip', 'raiser', 'first', 'adv', 'nut_adv', 'strong_adv', 'air_adv', 'sd_adv', 'top_adv', 'my_sd', 'his_sd', 'my_nut', 'his_nut', 'my_air', 'his_air', 'my_mid', 'his_mid', 'lspr', 'swing', 'drawn', 'draws', 'two_tone', 'monotone', 'paired', 'connected', 'high', 'smin', 'nsizes']
def coefficients(x, feats, target, l2=2.0, mask=None):
    Z, mu, sd = prep(x, feats); r = target; m = np.ones(len(x), bool) if mask is None else mask; A = np.c_[np.ones(m.sum()), Z[m]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0; beta = np.linalg.solve(A.T @ A + P, A.T @ r[m])
    # back to the factor's own units: a constant and a slope a factor
    slope = beta[1:] / sd; const = beta[0] - (slope * mu).sum(); return const, dict(zip(feats, slope)), dict(zip(feats, beta[1:]))
if __name__ == '__main__':
    out = {}
    for st, name in [(3, 'Flop'), (4, 'Turn'), (5, 'River')]:
        x = b[b.street == st].reset_index(drop=True)
        if len(x) < 100: continue
        cands = [c for c in PRE if not (st == 5 and c in ('swing', 'drawn', 'draws'))]
        base = float(np.mean(np.abs(x.vn_min - x.y))); e0 = evaluate(x, [], [])
        fv, _ = choose(x, cands, 'v', []); fb, e2 = choose(x, cands, 'b', fv); fv, e3 = choose(x, cands, 'v', fb) if True else (fv, e2); final = evaluate(x, fv, fb)
        print(f'\n=== {name}: {len(x)} decisions on {x.spot.nunique()} flops ===')
        print(f'  base formula misses by {base:.3f}; the two parts with a constant each {e0[0]:.3f}; with the factors below {final[0]:.3f} (value part {final[1]:.3f}, bluff part {final[2]:.3f}), on flops left out')
        cv, sv, zv = coefficients(x, fv, (x.b_eff - x.vn_b).to_numpy()); ok = (x.V > 0.01).to_numpy(); cb, sb, zb = coefficients(x, fb, np.log(np.clip(x.B / x.V.clip(0.01), 0.02, 20) / x.vn_ratio).to_numpy(), mask=ok)
        print(f'  value starts at: base {cv:+.3f}' + ''.join(f'  {s:+.3f} x {c}' for c, s in sv.items())); print('      per standard deviation: ' + '  '.join(f'{c} {v:+.3f}' for c, v in zv.items()))
        print(f'  bluffs per value bet: base x exp({cb:+.2f}' + ''.join(f'  {s:+.2f} x {c}' for c, s in sb.items()) + ')'); print('      per standard deviation: ' + '  '.join(f'{c} {v:+.2f}' for c, v in zb.items()))
        err = np.abs(final[3] - x.y); print(f'  within 5 points on {np.mean(err < 0.05):.0%} of decisions, within 10 on {np.mean(err < 0.10):.0%}; worst tenth misses by {np.quantile(err, 0.9):.2f}')
        out[name] = dict(value=dict(const=cv, slopes=sv), bluff=dict(const=cb, slopes=sb), error=final[0], base=base, n=len(x))
    json.dump(out, open('research/insight/out/freq-two.json', 'w'), indent=1, default=float)
