# The formulas. For each kind of decision: the derived base (never refitted), plus a correction on the log-odds scale
# from a few facts about the two ranges. Factors are chosen on the first collections (seeds 1-8) by leaving whole flops
# out; the finished formula is then tried once on flops it has never seen (seed 9 on).
#   frequency = expit( logit(base) + const + sum of slope x factor )
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
import warnings; warnings.filterwarnings('ignore')
d = pd.read_pickle('research/insight/out/decisions.pkl'); d['lspr'] = np.log(d.spr.clip(0.05, 30)); d['base_raise'] = 0.5
for c in ['adv', 'strong_adv', 'nut_adv', 'my_sd', 'his_sd']: d[c + '_sq'] = d[c] ** 2
d['adv_x_ip'] = d.adv * d.ip; d['strong_x_ip'] = d.strong_adv * d.ip
TEST = d.seed >= 9; NAMES = {3: 'Flop', 4: 'Turn', 5: 'River'}
def cv(x, y, off, feats, l2=1.0, folds=6):
    X = x[feats].to_numpy(float) if feats else np.zeros((len(x), 0)); mu = np.nanmean(X, 0) if feats else 0; sd = (np.nanstd(X, 0) + 1e-9) if feats else 1; Z = np.nan_to_num((X - mu) / sd); r = logit(y) - logit(off); g = pd.factorize(x.spot)[0] % folds; pred = np.zeros(len(y))
    for k in range(folds):
        tr, te = g != k, g == k; A = np.c_[np.ones(tr.sum()), Z[tr]]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0; pred[te] = np.c_[np.ones(te.sum()), Z[te]] @ np.linalg.solve(A.T @ A + P, A.T @ r[tr])
    return float(np.mean(np.abs(expit(logit(off) + pred) - y)))
def fit(x, y, off, feats, l2=1.0):
    X = x[feats].to_numpy(float) if feats else np.zeros((len(x), 0)); mu = np.nanmean(X, 0) if feats else np.zeros(0); sd = (np.nanstd(X, 0) + 1e-9) if feats else np.ones(0); Z = np.nan_to_num((X - mu) / sd); A = np.c_[np.ones(len(y)), Z]; P = np.eye(A.shape[1]) * l2; P[0, 0] = 0
    beta = np.linalg.solve(A.T @ A + P, A.T @ (logit(y) - logit(off))); slope = beta[1:] / sd; return float(beta[0] - (slope * mu).sum()), dict(zip(feats, map(float, slope))), dict(zip(feats, map(float, beta[1:]))), dict(zip(feats, map(float, mu)))
def apply(x, off, const, slopes, means):
    z = const + sum(s * x[c].fillna(means[c]).to_numpy(float) for c, s in slopes.items()); return expit(logit(off) + z)
def formula(title, x, ycol, offcol, cands, limit=7, gain=0.002):
    x = x[x[offcol].notna() & x[ycol].notna()]; tr = x[~TEST.reindex(x.index)].reset_index(drop=True); te = x[TEST.reindex(x.index)].reset_index(drop=True)
    if len(tr) < 60: return None
    y = tr[ycol].to_numpy(float); off = tr[offcol].to_numpy(float); cands = [c for c in cands if tr[c].notna().mean() > 0.9 and tr[c].std() > 0]
    chosen = []; best = cv(tr, y, off, chosen)
    while len(chosen) < limit:
        e, c = min((cv(tr, y, off, chosen + [c]), c) for c in cands if c not in chosen)
        if best - e < gain: break
        chosen.append(c); best = e
    const, slopes, per_sd, means = fit(tr, y, off, chosen); out = dict(title=title, n=len(tr), flops=int(tr.spot.nunique()), base=float(np.mean(np.abs(off - y))), cv=best, const=const, slopes=slopes, per_sd=per_sd, means=means)
    line = f'{title:<46} n {len(tr):4d}  base misses by {out["base"]:.3f}  formula {best:.3f}'
    if len(te) >= 15:
        p = apply(te, te[offcol].to_numpy(float), const, slopes, means); err = np.abs(p - te[ycol].to_numpy(float)); out.update(test_n=len(te), test=float(err.mean()), test_base=float(np.mean(np.abs(te[offcol] - te[ycol]))), within5=float(np.mean(err < 0.05)), within10=float(np.mean(err < 0.10)))
        line += f'  | unseen flops ({len(te)}): base {out["test_base"]:.3f}  formula {out["test"]:.3f}  within 5 pts {out["within5"]:.0%}, within 10 {out["within10"]:.0%}'
    print(line); print(f'      logit(base) {const:+.2f}' + ''.join(f'  {s:+.2f} x {c}' for c, s in slopes.items())); print('      weight of each (one standard deviation): ' + ('  '.join(f'{c} {v:+.2f}' for c, v in per_sd.items()) or 'none'))
    return out
RANGE = ['adv', 'nut_adv', 'strong_adv', 'air_adv', 'sd_adv', 'my_sd', 'his_sd', 'my_nut', 'his_nut', 'my_air', 'his_air', 'my_mid', 'his_mid', 'my_q90', 'his_q90', 'my_q10', 'his_q10', 'adv_sq', 'strong_adv_sq', 'my_sd_sq', 'his_sd_sq']; SPOT = ['raiser', 'lspr', 'two_tone', 'monotone', 'paired', 'connected', 'high']; NEXT = ['swing', 'drawn', 'draws']
results = []
for tier, extra_bet, extra_fold in [('From the ranges alone', [], []), ('With what he does in the solution', ['he_folds', 'he_raises', 'he_stabs'], ['bettor_freq', 'bettor_all'])]:
    print(f'\n######## {tier} ########\n-- How often the range bets (base: von Neumann thresholds on its own equity curve) --')
    b = d[d.kind == 'bet']; f = d[d.kind == 'face']
    for st in [3, 4, 5]:
        for first, seat in [(1.0, 'out of position, first to act'), (0.0, 'in position, after a check')]:
            r = formula(f'{NAMES[st]}, {seat}', b[(b.street == st) & (b['first'] == first)], 'y', 'vn_min', RANGE + SPOT + (NEXT if st < 5 else []) + ['smin', 'vn_b', 'vn_a'] + [c for c in extra_bet if not (c == 'he_stabs' and first == 0)])
            if r: r.update(tier=tier, kind='bet', street=st, first=first); results.append(r)
    print('-- How often the range folds to a bet (base: the thresholds on the bettor\'s range before the bet) --')
    for st in [3, 4, 5]:
        r = formula(f'{NAMES[st]}, facing a bet', f[f.street == st], 'y', 'fold_thr', RANGE + SPOT + (NEXT if st < 5 else []) + ['ip', 's', 'prior_adv', 'raise_allowed'] + extra_fold)
        if r: r.update(tier=tier, kind='fold', street=st); results.append(r)
    print('-- How often the range raises a bet, where it can (no derived base: starts from one half) --')
    for st in [3, 4, 5]:
        x = f[(f.street == st) & ((f.raise_allowed == 1) | (f.allin_only == 1))]
        r = formula(f'{NAMES[st]}, raising a bet', x, 'y_raise', 'base_raise', RANGE + SPOT + (NEXT if st < 5 else []) + ['ip', 's', 'prior_adv', 'raise_allowed'] + extra_fold)
        if r: r.update(tier=tier, kind='raise', street=st); results.append(r)
json.dump(results, open('research/insight/out/freq-formulas.json', 'w'), indent=1)
