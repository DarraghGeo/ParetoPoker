"""Summary of the turn bet-frequency sweep (diagnosis/level-sweep.mjs): for each spot and seat, the
bet frequency at which the engine loses least to the best response, against the solver's and the
engine's own frequency, and what the best frequency moves with."""
import json, sys, numpy as np, pandas as pd
from scipy.stats import spearmanr
rows = [json.loads(l) for l in open(sys.argv[1] if len(sys.argv) > 1 else 'diagnosis/level-sweep.jsonl') if l.strip()]
d = pd.DataFrame([{**{k: v for k, v in r.items() if k != 'profile'}, **(r.get('profile') or {})} for r in rows])
d['spot'] = d.pair + '|' + d.board + '|' + d.depth.astype(str) + '|' + d.seat
out = []
for spot, g in d.groupby('spot'):
    own = g[g.level.isna()]; lv = g[g.level.notna()].sort_values('level')
    if len(own) == 0 or len(lv) < 5: continue
    o = own.iloc[0]; best = lv.loc[lv.exploited.idxmin()]
    # a parabola through the best level and its neighbours, for a finer minimum
    i = list(lv.level).index(best.level); x = lv.level.values; y = lv.exploited.values; at = best.level
    if 0 < i < len(x) - 1:
        a, b, c = np.polyfit(x[i-1:i+2], y[i-1:i+2], 2)
        if a > 0: at = float(np.clip(-b / (2 * a), x[i-1], x[i+1]))
    out.append(dict(spot=spot, pair=o.pair, seat=o.seat, depth=o.depth, board=o.board, own=o.exploited, ownBets=o.engineBets, solverBets=o.solverBets, bestLevel=at, best=best.exploited,
                    worst=lv.exploited.max(), equity=o.equity, rangeAdvantage=o.rangeAdvantage, nutAdvantage=o.nutAdvantage, polarization=o.polarization, polarizationAdvantage=o.polarizationAdvantage))
t = pd.DataFrame(out)
print(f"{len(d)} measurements, {len(t)} complete spot-seats\n")
for seat, g in t.groupby('seat'):
    print(f"== {seat}: {len(g)} spots")
    print(f"   loss at the engine's own frequency {100*g.own.mean():.2f}%; at the best of the five levels {100*g.best.mean():.2f}%; at the worst {100*g.worst.mean():.2f}%")
    print(f"   bet frequency: engine {g.ownBets.mean():.2f}, solver {g.solverBets.mean():.2f}, least exploitable {g.bestLevel.mean():.2f} (sd {g.bestLevel.std():.2f})")
    print(f"   least-exploitable frequency against the solver's: correlation {spearmanr(g.bestLevel, g.solverBets)[0]:+.2f}; mean difference {np.mean(g.bestLevel - g.solverBets):+.2f}; mean absolute difference {np.mean(np.abs(g.bestLevel - g.solverBets)):.2f}")
    print(f"   least-exploitable frequency against the engine's: correlation {spearmanr(g.bestLevel, g.ownBets)[0]:+.2f}; mean absolute difference {np.mean(np.abs(g.bestLevel - g.ownBets)):.2f}")
    print("   it moves with: " + ', '.join(f"{c} {spearmanr(g.bestLevel, g[c])[0]:+.2f}" for c in ('equity', 'rangeAdvantage', 'nutAdvantage', 'polarization', 'polarizationAdvantage', 'depth')))
    print("   the solver's frequency moves with: " + ', '.join(f"{c} {spearmanr(g.solverBets, g[c])[0]:+.2f}" for c in ('equity', 'rangeAdvantage', 'nutAdvantage', 'polarization', 'polarizationAdvantage', 'depth')))
    # a straight line in the spot's definition
    X = np.c_[np.ones(len(g)), g[['rangeAdvantage', 'nutAdvantage', 'polarizationAdvantage', 'depth']].values]
    for target in ('bestLevel', 'solverBets'):
        beta, *_ = np.linalg.lstsq(X, g[target].values, rcond=None); pred = X @ beta
        r2 = 1 - np.sum((g[target].values - pred) ** 2) / np.sum((g[target].values - g[target].mean()) ** 2)
        print(f"   {target} = {beta[0]:.2f} {beta[1]:+.2f} x range advantage {beta[2]:+.2f} x nut advantage {beta[3]:+.2f} x polarisation advantage {beta[4]:+.3f} x depth   (R2 {r2:.2f})")
    print("   by pair: " + ' | '.join(f"{p}: best {x.bestLevel.mean():.2f}, solver {x.solverBets.mean():.2f}, engine {x.ownBets.mean():.2f}, loss {100*x.own.mean():.1f}->{100*x.best.mean():.1f}" for p, x in g.groupby('pair')))
    print("   by depth: " + ' | '.join(f"{p}x: best {x.bestLevel.mean():.2f}, solver {x.solverBets.mean():.2f}, loss {100*x.own.mean():.1f}->{100*x.best.mean():.1f}" for p, x in g.groupby('depth')))
t.to_csv('diagnosis/level-sweep-best.csv', index=False)
