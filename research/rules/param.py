# One betting rule in a few numbers, scored by street and seat. Value from V(size); bluffs under B(his weak share); out of
# position, no bet when his strong share passes a gate; the size by who has the best hands.
import sys, numpy as np, collections
from load import wmean
import bet2
from bet2 import D, table, VS, BS, names
grid = lambda x, G: int(np.abs(G - x).argmin())
def formula(s): return 1 - 1 / (2 * (1 + s))
VRULES = {'formula': lambda s: formula(s), 'formula+8': lambda s: formula(s) + 0.08, '70+10s': lambda s: 0.70 + 0.1 * s, '75/80/85': lambda s: 0.75 if s < 0.5 else 0.8 if s < 1.1 else 0.85, '80 flat': lambda s: 0.8}
BRULES = {'none': lambda d: 0, 'weak-10': lambda d: d['his_weak'] - 0.10, 'weak-15': lambda d: d['his_weak'] - 0.15, 'weak-20': lambda d: d['his_weak'] - 0.20, 'weak-25': lambda d: d['his_weak'] - 0.25}
def play(d, s, vr, br, gate, T=None):
    t = table(d, s) if T is None else T
    if t is None: return None
    if d['his_strong'] >= gate: return t[len(VS) - 1, 0, 0]
    return t[grid(min(1, VRULES[vr](s)), VS), grid(min(0.4, max(0, BRULES[br](d))), BS), 0]
for st in (int(a) for a in sys.argv[1:] or [4, 5]):
    for ip in (0, 1):
        G = [d for d in D if d['street'] == st and d['ip'] == ip]
        if len(G) < 10: continue
        sizes = (0.33, 0.75, 1.25) if st == 3 else (0.33, 0.75, 1.5); TT = {s: [(d, table(d, s)) for d in G] for s in sizes}
        print(f'\n== {names[st]} {"IN position" if ip else "OUT of position"} ({len(G)} decisions). Cost in % of the pot. Check everything: {wmean(G, lambda d: 100 * d["R"][d["kinds"].index("check")].sum()):.2f}; the solution: {wmean(G, lambda d: 100 * d["sol"]):.2f}')
        for s in sizes:
            H = [(d, t) for d, t in TT[s] if t is not None]
            if len(H) < 10: continue
            w = np.array([d['weight'] for d, _ in H]); w = w / w.sum(); res = []
            for vr in VRULES:
                for br in BRULES:
                    for gate in (0.2, 0.3, 0.4, 9):
                        res.append((float(w @ np.array([play(d, s, vr, br, gate, t) for d, t in H])), vr, br, gate))
            res.sort(); best = res[0]; get = lambda vr, br, gate: next(r[0] for r in res if r[1:] == (vr, br, gate))
            print(f'  size {s}: best {best[0]:.2f} (value {best[1]}, bluff {best[2]}, gate {best[3]}) | per-decision best pair {float(w @ np.array([t[:, :, 0].min() for _, t in H])):.2f}')
            print('     value rule (bluff weak-15, gate 0.3 OOP / none IP): ' + '  '.join(f'{vr} {get(vr, "weak-15", 0.3 if not ip else 9):.2f}' for vr in VRULES))
            print('     bluff rule (value 75/80/85, same gate):             ' + '  '.join(f'{br} {get("75/80/85", br, 0.3 if not ip else 9):.2f}' for br in BRULES))
            print('     gate on his strong share (value 75/80/85, weak-15): ' + '  '.join(f'{g if g < 9 else "none"} {get("75/80/85", "weak-15", g):.2f}' for g in (0.2, 0.3, 0.4, 9)))
        # the size: one size always, the best size per decision, and a rule by who has the best hands (90%+ shares)
        rule = lambda d, s: play(d, s, '75/80/85', 'weak-15', 0.3 if not ip else 9)
        both = [d for d in G if all(table(d, s) is not None for s in sizes)]
        if len(both) >= 10:
            def nutsize(d, lo=-0.03, hi=0.03): g = d['S'][:, 18:].sum() - d['hisE'][18:].sum(); return sizes[0] if g < lo else sizes[2] if g > hi else sizes[1]
            def polar(d): return sizes[2] if d['his_strong'] < 0.1 and d['his_mid'] > 0.3 else sizes[0] if d['his_strong'] > 0.2 else sizes[1]
            print(f'  the size ({len(both)} decisions with all three): always ' + ', '.join(f'{s}: {wmean(both, lambda d: rule(d, s)):.2f}' for s in sizes) + f' | best size per decision {wmean(both, lambda d: min(rule(d, s) for s in sizes)):.2f} | by the nuts {wmean(both, lambda d: rule(d, nutsize(d))):.2f} | by his strong hands {wmean(both, lambda d: rule(d, polar(d))):.2f}')
            best = collections.Counter(min(sizes, key=lambda s: rule(d, s)) for d in both); print('     which size is best how often:', {s: f'{100*best[s]/len(both):.0f}%' for s in sizes})
