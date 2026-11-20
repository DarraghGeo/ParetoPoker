"""One river hand category in depth: which read of the spot decides bet or check for the whole category, how much a
one-line rule on that read costs, which bet size, and what separates hands inside the spots where the category splits.
  python3 research/select/deep.py <select-river.jsonl> <first-oop|first-ip> <category>
Rules are found on the even-numbered spots and scored on the odd ones."""
import sys, collections
from category import load, per_spot, thirds, TOL, FEATS

DESC = {'category equity': lambda r: r['e'], 'range equity': lambda r: r['d']['rangeEq'], 'my strong share': lambda r: r['d']['myStrong'], 'his strong share': lambda r: r['d']['hisStrong'],
        'nut advantage': lambda r: r['d']['nutAdv'], 'his weak share': lambda r: r['d']['hisWeak'], 'my weak share': lambda r: r['d']['myWeak'], 'stack/pot': lambda r: min(r['d']['spr'], 5),
        'he bets after check': lambda r: r['d'].get('hisBetsAfter') or 0}


def cost(rows, decide):
    """Mean loss per hand of the category, and the share of its hands over the tolerance, when `decide(row)` says bet (True) or check for the whole category."""
    L = W = over = 0.0
    for r in rows:
        bet = decide(r)
        for h in r['hs']:
            loss = max(h['gap'], 0) if not bet else max(-h['gap'], 0); L += h['w'] * loss; W += h['w']; over += h['w'] * (loss > TOL)
    return L / W, over / W


def best_cut(rows, f):
    xs = sorted({round(f(r), 3) for r in rows}); best = (9e9, None, None)
    for t in xs[::max(1, len(xs) // 60)]:
        for above in (True, False):
            c = cost(rows, lambda r: (f(r) > t) == above)[0]
            if c < best[0]: best = (c, t, above)
    return best


def main(path, sit, cat):
    spots = load(path, sit); rows = per_spot(spots, cat); train = rows[::2]; test = rows[1::2]
    print(f'# {cat}, {sit}: {len(rows)} spots\n')
    show = lambda name, c: print(f'| {name} | {c[0]:.2f} | {100 * c[1]:.0f}% |')
    print('| Policy for the whole category | Mean loss per hand | Hands over the tolerance |\n|---|---|---|')
    show('Always check', cost(test, lambda r: False)); show('Always bet', cost(test, lambda r: True)); show('Right choice spot by spot (whole category together)', cost(test, lambda r: r['gap'] > 0))
    cuts = {}
    for name, f in DESC.items():
        c, t, above = best_cut(train, f); cuts[name] = (t, above); res = cost(test, lambda r: (f(r) > t) == above)
        show(f"Bet when {name} is {'over' if above else 'under'} {t:.2f}", res)
    # two reads together: the best single read, then a second cut inside each side
    first = min(DESC, key=lambda n: cost(train, lambda r: (DESC[n](r) > cuts[n][0]) == cuts[n][1])[0]); f1 = DESC[first]; t1, a1 = cuts[first]
    for name, f in DESC.items():
        if name == first: continue
        side = [r for r in train if (f1(r) > t1) == a1]; other = [r for r in train if (f1(r) > t1) != a1]
        if len(side) < 10 or len(other) < 10: continue
        cs, ts, as_ = best_cut(side, f); co, to, ao = best_cut(other, f)
        rule = lambda r: ((f(r) > ts) == as_) if (f1(r) > t1) == a1 else ((f(r) > to) == ao)
        show(f'{first} first, then {name}', cost(test, rule))
    # by the two strongest reads
    print(f'\nSolver bet share of the category / mean bet minus check, by nut advantage (rows) and category equity (columns):')
    eb = [0, .5, .65, .8, .9, 1.01]; nb = [-1, -.1, 0, .1, .2, 1]
    print('| Nut advantage | ' + ' | '.join(f'{int(100 * a)}-{min(100, int(100 * b))}%' for a, b in zip(eb[:-1], eb[1:])) + ' |\n|---|' + '---|' * (len(eb) - 1))
    for lo, hi in zip(nb[:-1], nb[1:]):
        cells = []
        for a, b in zip(eb[:-1], eb[1:]):
            rs = [r for r in rows if lo <= r['d']['nutAdv'] < hi and a <= r['e'] < b]; w = sum(r['w'] for r in rs)
            cells.append('-' if len(rs) < 4 else f"{100 * sum(r['w'] * r['pbet'] for r in rs) / w:.0f}% / {sum(r['w'] * r['gap'] for r in rs) / w:+.1f} ({len(rs)})")
        print(f'| {lo:+.1f} to {hi:+.1f} | ' + ' | '.join(cells) + ' |')
    # size
    c = collections.defaultdict(lambda: [0.0, 0.0])
    for r in rows:
        d = r['d']; bets = [a for a, k in enumerate(d['kinds']) if k != 'check']
        if len(bets) < 3: continue
        for h in r['hs']:
            if h['gap'] <= 0: continue
            top = max(h['v'][a] for a in bets); band = 'short (under 1.5 pots behind)' if d['spr'] < 1.5 else 'deep'
            for j, a in enumerate(bets[:3]): x = c[(band, ('small', 'three quarters', 'big')[j])]; x[0] += h['w'] * (top - h['v'][a]); x[1] += h['w']
    print('\nBet size, for the hands that should bet: mean loss from always using one size: ' + '; '.join(f'{k[0]}, {k[1]}: {x[0] / x[1]:.2f}' for k, x in sorted(c.items())))
    # inside the spots where the category splits
    split = [r for r in rows if r['okc'] < 0.9 and r['okb'] < 0.9]; eff = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for r in split:
        for f in FEATS:
            t = thirds(r['hs'], f)
            if t is not None: e = eff[f]; e[0] += r['w'] * t; e[1] += r['w']; e[2] += 1
    print(f'\nSpots where the category splits (neither all-bet nor all-check fits): {len(split)} of {len(rows)}. Top third minus bottom third of bet minus check: ' + ', '.join(f'{f} {e[0] / e[1]:+.1f}' for f, e in sorted(eff.items(), key=lambda kv: -abs(kv[1][0] / kv[1][1])) if e[2] >= 8))
    # rules for choosing inside a split spot: keep the solver's bet share of the category, pick by a characteristic
    print('\nInside split spots, the solver\'s bet share of the category kept, hands chosen by (mean loss per hand, share over tolerance):')
    for f, sign in [('random', 0)] + [(f, s) for f in FEATS for s in (1, -1)]:
        L = W = over = 0.0
        for r in split:
            hs = [h for h in r['hs'] if f == 'random' or h.get(f) is not None]
            if len(hs) < 4: continue
            if f == 'random': order = sorted(hs, key=lambda h: hash(h['h']) % 997)
            else: order = sorted(hs, key=lambda h: -sign * h[f])
            need = sum(h['w'] * h['pbet'] for h in hs)
            for h in order:
                t = min(h['w'], need); need -= t; loss = (t * max(-h['gap'], 0) + (h['w'] - t) * max(h['gap'], 0)); L += loss; W += h['w']; over += t * (max(-h['gap'], 0) > TOL) + (h['w'] - t) * (max(h['gap'], 0) > TOL)
        if W > 0: print(f"  {'random' if f == 'random' else ('highest ' if sign > 0 else 'lowest ') + f} bets: {L / W:.2f}, {100 * over / W:.0f}%")


main(*sys.argv[1:4])
