# What the caller's range does to the second bet, derived.
#
# The streets-to-come ratio assumed a caller holding only bluff-catchers, so every value bet stayed a value bet and the
# bettor fired again (1+s)/(1+2s) of the time. But the caller folds the bottom c of his range. Against what is left, a
# hand that beat a share x of his whole range beats only x' = (x - c)/(1 - c). The thin value bets of this street are
# not value bets against the range that called: they check the next street.
#
# With the order of hands kept from one street to the next (the card to come is left out), for a turn bet of s_t and a
# river bet of s_r:
#   river   the bettor's range is his turn value hands at x' and his turn bluffs at the bottom. The base thresholds on
#           that curve give the share of it that bets for value. phi: the share of the turn value bets that still do.
#   turn    the caller's weakest call beats only the bluffs that give up on the river, and loses to everything else,
#           value bets that check the river included. Indifference: (give-ups)(1 + s_t) = (the rest) s_t, so
#             bluffs for every value bet on the turn = r_t + r_r phi (1 + r_t),        r = s/(1+s)
#           (phi = 1 is the streets-to-come ratio; phi = 0 is the one-street ratio.)
#   the turn value threshold and the fold frequency follow from the base with that ratio, and phi from them: a fixed point.
# Fires again = (value bets + bluffs on the river) / (turn betting range) = phi (1 + r_r) / (1 + turn ratio).
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
from derive import base_with, oop_river
import warnings; warnings.filterwarnings('ignore')
def two_streets(G, s_t, s_r):
    """Turn bet frequency, the turn ratio, phi and how often the bettor fires again, from the bettor's turn curve."""
    r_t = s_t / (1 + s_t); r_r = s_r / (1 + s_r) if s_r > 1e-6 else 0.0; rho = r_t + r_r * (1 + r_t); phi = 1.0
    if r_r == 0: f, v = base_with(G, s_t, r_t); return dict(freq=f, v=v, rho=r_t, phi=0.0, again=0.0, fold=np.nan)
    for _ in range(25):
        f, v = base_with(G, s_t, rho); 
        if v < 1e-6: break
        b = G.quantile(1 - v); a = G.quantile(min(1.0, rho * v)); c = min(0.99, (s_t + a) / (1 + s_t))
        # the turn value hands against the range that called, and the turn bluffs under all of it
        top = G.e >= b; e = np.clip((G.e[top] - c) / (1 - c), 0, 1); w = G.w[top].copy(); w *= (v * G.total) / max(1e-12, w.sum())      # the level b may hold more than bets: share it out
        river = Dist(np.r_[0.0, e], np.r_[rho * v * G.total, w]); fr, vr = base_with(river, s_r, r_r)
        new_phi = min(1.0, vr * (1 + rho)); phi = (phi + new_phi) / 2; rho = (rho + r_t + r_r * phi * (1 + r_t)) / 2
    f, v = base_with(G, s_t, rho); a = G.quantile(min(1.0, rho * v)) if v > 0 else 0
    return dict(freq=f, v=v, rho=rho, phi=phi, again=phi * (1 + r_r) / (1 + rho), fold=min(1.0, (s_t + a) / (1 + s_t)))
if __name__ == '__main__':
    d = pd.read_pickle('research/insight/out/decisions.pkl'); b = d[d.kind == 'bet'].copy(); miss = lambda p, y: float(np.mean(np.abs(p - y)))
    t = b[b.street == 4].copy().reset_index(drop=True)
    # the river bet the stacks allow after this turn bet: three quarters of the pot, or what is left
    t['s_r'] = [max(0.0, min(0.75, (spr - s) / (1 + 2 * s))) for spr, s in zip(t.spr, t.smin)]
    got = [two_streets(Dist(e, w), s, sr) for e, w, s, sr in zip(t.me, t.mw, t.smin, t.s_r)]
    for k in ['freq', 'rho', 'phi', 'again', 'v']: t['d_' + k] = [g[k] for g in got]
    print(f'Turn: {len(t)} betting decisions on {t.spot.nunique()} flops ({(t.seed >= 9).sum()} on unseen flops)')
    ok = t.V > 0.02; print(f'  bluffs for every value bet: solver {t.B[ok].sum() / t.V[ok].sum():.2f}; one street {t.vn_ratio.mean():.2f}; streets to come {(t.smin / (1 + t.smin) + t.s_r / (1 + t.s_r) * (1 + t.smin / (1 + t.smin))).mean():.2f}; with the caller\'s range {t.d_rho.mean():.2f}')
    print(f'  share of turn value bets that still bet for value on the river (phi): {t.d_phi.mean():.2f}')
    for seat, sel in [('out of position', t['first'] == 1), ('in position', t['first'] == 0), ('all, unseen flops', t.seed >= 9)]:
        x = t[sel]; e = (x.d_freq - x.y).abs(); print(f'  bet frequency, {seat}: solver {x.y.mean():.3f}. Base {x.vn_min.mean():.3f}, misses by {miss(x.vn_min, x.y):.3f} (r {np.corrcoef(x.vn_min, x.y)[0, 1]:+.2f}). Derived {x.d_freq.mean():.3f}, misses by {e.mean():.3f} (r {np.corrcoef(x.d_freq, x.y)[0, 1]:+.2f}); within 5 points {np.mean(e < 0.05):.0%}, within 10 {np.mean(e < 0.1):.0%}; value part {x.d_v.mean():.3f} against {x.V.mean():.3f}')
    # fires again: the river decision of the same player after this turn bet was called
    r = b[b.street == 5].copy(); r['parent'] = r.spot + '|' + r.line.str.rsplit('|', n=2).str[0]; r['how'] = r.line.str.split('|').str[-2]; r['tl'] = r['tail']; r['turn_board'] = r.key.str.split('|').str[1].str[:11]
    t['parent'] = t.spot + '|' + t.line.str.rsplit('|', n=1).str[0]; t['turn_board'] = t.key.str.split('|').str[1]
    for seat, how, tail, first in [('out of position', 'bc', 'first', 1), ('in position', 'xbc', 'x', 0)]:
        rv = r[(r.how == how) & (r.tl == tail)].groupby(['parent', 'turn_board']).y.mean().rename('again').reset_index(); x = t[t['first'] == first].merge(rv, on=['parent', 'turn_board'])
        if len(x): print(f'  fires again on the river, {seat}: {len(x)} turn bets. Solver {x.again.mean():.3f}; bluff-catchers only {((1 + x.smin) / (1 + 2 * x.smin)).mean():.3f}; with the caller\'s range {x.d_again.mean():.3f}, misses by {miss(x.d_again, x.again):.3f} (r {np.corrcoef(x.d_again, x.again)[0, 1]:+.2f})')
