# Two derivations, each from indifference alone and each tried against the solver with nothing fitted.
#
# A. First to act on the river. The base treats a check as a showdown. Out of position it is not: he may bet. The
#    game with one bet size and no raise, his range uniform on the scale of "share of his range beaten" (which is what
#    river equity is), ours any curve G:
#      we bet for value from b1 and bluff our weakest, s/(1+s) of the value bets          (his caller is indifferent)
#      he folds c1 = (s + what our best bluff is worth checked) / (1 + s)                   (our bluff is indifferent)
#      after our check he bets for value from b2 and bluffs a2 = s/(1+s) of that           (our caller is indifferent)
#      our checking range folds (s + what his best bluff wins checked back) / (1 + s)       (his bluff is indifferent)
#      b2 beats half of what we check and call with                                         (his thinnest value bet)
#      b1 is worth the same bet and checked                                                 (our thinnest value bet)
#    Solved by a search on b1; everything else follows in closed steps.
#
# B. Bluffs with streets to come. On the river a bluff-catcher is indifferent when bluffs are r = s/(1+s) of the value
#    bets. A street earlier, calling wins only against the hands that then give up: the ones that bet again are
#    balanced to leave it indifferent again. So what gives up is r of what bets again, and with n bets to come the
#    hands that are not value are (1 + r_1)(1 + r_2)...(1 + r_n) - 1 of the value bets, each r from that street's size
#    as the stacks allow it.
import sys; sys.path.insert(0, 'research/insight')
from freq_lib import *
import warnings; warnings.filterwarnings('ignore')
def oop_river(G, s):
    rho = s / (1 + s); Q = G.quantile; F = G.below
    def inner(v):
        """Given how much of our range bets for value: his play after our check, and ours against it."""
        b1 = Q(1 - v) if v > 1e-9 else 1.0; beta = rho * v; xa = Q(beta) if beta > 0 else 0.0; top = 1 - v; chk = max(1e-9, top - beta); a2, b2, k = 0.0, 1.0, xa
        for _ in range(30):
            v2 = max(0.0, F(a2) - beta) / chk                       # what his best bluff wins when it checks back
            fold = min(1.0, (s + v2) / (1 + s)); gk = beta + fold * chk; k = Q(gk)
            b2n = Q((gk + top) / 2); a2n = (1 - b2n) * rho; a2, b2 = (a2 + a2n) / 2, (b2 + b2n) / 2
        return b1, xa, a2, b2, k
    def check_value(x, a2, b2, k):
        showdown = min(max(x, a2), b2) - a2                            # he checks back and we are ahead
        call = showdown + a2 * (1 + s) + max(0.0, x - b2) * (1 + s) - (1 - max(x, b2)) * s
        return max(showdown, call)
    def gap(v):
        b1, xa, a2, b2, k = inner(v); c1 = min(1.0, (s + check_value(xa, a2, b2, k)) / (1 + s))
        bet = c1 + max(0.0, b1 - c1) * (1 + s) - (1 - max(b1, c1)) * s
        return bet - check_value(b1, a2, b2, k), c1, (a2, b2, k)
    lo, hi = 0.0, 1 / (1 + rho)
    for _ in range(40):
        v = (lo + hi) / 2
        if gap(v)[0] > 0: lo = v                                       # the thinnest value bet still gains by betting: bet more
        else: hi = v
    v = (lo + hi) / 2; g, c1, (a2, b2, k) = gap(v)
    return dict(freq=v * (1 + rho), v=v, he_folds=c1, he_bets_after_check=(1 - b2) + a2)
def bluffs_to_come(street, s, spr_after_pot):
    """(1 + r) over every bet still to come, less one: this street's at `s`, the later ones at three quarters of the pot, as the stack allows."""
    pot, left, total = 1.0, spr_after_pot, 1.0; size = s
    for _ in range(6 - street):
        size = min(size, left / pot) if pot > 0 else 0
        if size <= 1e-6: break
        total *= 1 + size / (1 + size); left -= size * pot; pot *= 1 + 2 * size; size = 0.75
    return total - 1
def base_with(mine, s, rho):
    """The base thresholds with another number of bluffs for every value bet."""
    lo, hi = 0.0, 1.0 / (1 + rho)
    for _ in range(40):
        v = (lo + hi) / 2; b = mine.quantile(1 - v); a = mine.quantile(min(1.0, rho * v)) if v > 0 else 0.0
        if b - (1 + (s + a) / (1 + s)) / 2 > 0: lo = v
        else: hi = v
    v = (lo + hi) / 2; return v * (1 + rho), v
if __name__ == '__main__':
    d = pd.read_pickle('research/insight/out/decisions.pkl'); b = d[d.kind == 'bet'].copy(); miss = lambda p, y: float(np.mean(np.abs(p - y)))
    print('A. Out of position on the river, first to act')
    x = b[(b.street == 5) & (b['first'] == 1)].copy(); r = [oop_river(Dist(e, w), s) for e, w, s in zip(x.me, x.mw, x.smin)]; x['d'] = [t['freq'] for t in r]; x['d_stab'] = [t['he_bets_after_check'] for t in r]; x['d_fold'] = [t['he_folds'] for t in r]
    for name, sel in [('all', x.seed > 0), ('unseen flops', x.seed >= 9)]:
        t = x[sel]; e = (t.d - t.y).abs(); print(f'   {name}: {len(t)} decisions. Solver bets {t.y.mean():.3f}. Base {t.vn_min.mean():.3f}, misses by {miss(t.vn_min, t.y):.3f} (r {np.corrcoef(t.vn_min, t.y)[0, 1]:+.2f}). Derived {t.d.mean():.3f}, misses by {e.mean():.3f} (r {np.corrcoef(t.d, t.y)[0, 1]:+.2f}); within 5 points {np.mean(e < 0.05):.0%}, within 10 {np.mean(e < 0.1):.0%}')
    t = x[x.he_stabs.notna()]; print(f'   he bets after our check: solver {t.he_stabs.mean():.3f}, derived {t.d_stab.mean():.3f}, misses by {miss(t.d_stab, t.he_stabs):.3f} | he folds to our bet: solver {t.he_folds.mean():.3f}, derived {t[t.he_folds.notna()].d_fold.mean():.3f}, misses by {miss(t[t.he_folds.notna()].d_fold, t[t.he_folds.notna()].he_folds):.3f}')
    print('B. Bluffs for every value bet, with streets to come')
    for st, name in [(3, 'Flop'), (4, 'Turn'), (5, 'River')]:
        x = b[b.street == st].copy(); x['rho_n'] = [bluffs_to_come(st, s, spr * 1.0) for s, spr in zip(x.smin, x.spr)]
        ok = x.V > 0.02; print(f'   {name}: {len(x)} decisions. Solver has {x.B[ok].sum() / x.V[ok].sum():.2f} bets from hands behind for every bet from hands ahead. One street says {x.vn_ratio.mean():.2f}; streets to come say {x.rho_n.mean():.2f}')
        if st < 5:
            got = [base_with(Dist(e, w), s, rho) for e, w, s, rho in zip(x.me, x.mw, x.smin, x.rho_n)]; x['f_n'] = [g[0] for g in got]; x['v_n'] = [g[1] for g in got]
            for seat, sel in [('out of position', x['first'] == 1), ('in position', x['first'] == 0)]:
                t = x[sel]; e = (t.f_n - t.y).abs(); print(f'      {seat}: solver bets {t.y.mean():.3f}. Base {t.vn_min.mean():.3f}, misses by {miss(t.vn_min, t.y):.3f}. With streets to come {t.f_n.mean():.3f}, misses by {e.mean():.3f} (r {np.corrcoef(t.f_n, t.y)[0, 1]:+.2f}); within 10 points {np.mean(e < 0.1):.0%}; value part {t.v_n.mean():.3f} against {t.V.mean():.3f}')
