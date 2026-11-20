"""The river, one hand category at a time: what the category should do, what moves that from spot to spot, and which
hands inside the category matter. Tolerance: a hand may lose TOL (default 0.5) % of the pot.
  python3 research/select/category.py <select-river.jsonl> <first-oop|first-ip> [category]"""
import json, sys, collections, math

TOL = 0.5
CATS = ['air', 'air', 'low pair', 'mid pair', 'top pair', 'overpair', 'two pair', 'trips+']
ORDER = ['trips+', 'two pair', 'overpair', 'top pair', 'mid pair', 'low pair', 'air']
FEATS = ['e', 'kick', 'hi', 'ubStrong', 'ubWeak', 'ub_calls', 'ub_raises', 'ub_betsAfter', 'ubFolds', 'e_calls', 'e_betsAfter']


def load(path, sit):
    seat = 0 if sit.endswith('oop') else 1; out = []
    for t in open(path):
        d = json.loads(t)
        if d['seat'] != seat or d['toCall'] > 0 or 'check' not in d['kinds']: continue
        bets = [a for a, k in enumerate(d['kinds']) if k != 'check']
        if not bets: continue
        for h in d['hands']:
            h['cat'] = CATS[h['row']]; h['chk'] = h['v'][0]; h['bet'] = max(h['v'][a] for a in bets); h['gap'] = h['bet'] - h['chk']
            h['size'] = max(bets, key=lambda a: h['v'][a]) - bets[0]; h['pbet'] = 1 - h['p'][0]
        W = sum(h['w'] for h in d['hands']); d['rangeEq'] = sum(h['w'] * h['e'] for h in d['hands']) / W
        d['myStrong'] = sum(h['w'] for h in d['hands'] if h['e'] >= 0.8) / W; d['myWeak'] = sum(h['w'] for h in d['hands'] if h['e'] < 0.3) / W
        d['nutAdv'] = d['myStrong'] - d['hisStrong']; d['spr'] = d['behind'] / d['potNow']; d['nbets'] = len(bets); out.append(d)
    return out


def corr(xs, ys, ws):
    W = sum(ws); mx = sum(w * x for x, w in zip(xs, ws)) / W; my = sum(w * y for y, w in zip(ys, ws)) / W
    sx = math.sqrt(sum(w * (x - mx) ** 2 for x, w in zip(xs, ws)) / W); sy = math.sqrt(sum(w * (y - my) ** 2 for y, w in zip(ys, ws)) / W)
    return 0 if sx * sy == 0 else sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws)) / W / sx / sy


def thirds(rows, f):
    xs = sorted((r for r in rows if r.get(f) is not None), key=lambda r: r[f])
    if len(xs) < 6 or xs[0][f] == xs[-1][f]: return None
    tot = sum(r['w'] for r in xs); lo = hi = wlo = whi = acc = 0.0
    for r in xs:
        if acc < tot / 3: lo += r['w'] * r['gap']; wlo += r['w']
        elif acc >= 2 * tot / 3: hi += r['w'] * r['gap']; whi += r['w']
        acc += r['w']
    return None if wlo <= 0 or whi <= 0 else hi / whi - lo / wlo


def policy(spots):
    print(f'## Policy by category ({len(spots)} spots, tolerance {TOL}% of the pot)\n')
    print('| Category | Of range | Equity | Solver bets | May check | May bet | Either | Must bet | Must check | Always check costs | Always bet costs |\n|---|---|---|---|---|---|---|---|---|---|---|')
    for cat in ORDER:
        c = collections.Counter(); n = 0
        for d in spots:
            n += sum(h['w'] for h in d['hands'])
            for h in d['hands']:
                if h['cat'] != cat: continue
                w = h['w']; best = max(h['bet'], h['chk']); c['w'] += w; c['e'] += w * h['e']; c['pbet'] += w * h['pbet']
                ok_c = best - h['chk'] <= TOL; ok_b = best - h['bet'] <= TOL; c['okc'] += w * ok_c; c['okb'] += w * ok_b; c['both'] += w * (ok_c and ok_b)
                c['lc'] += w * (best - h['chk']); c['lb'] += w * (best - h['bet'])
        if c['w'] <= 0: continue
        W = c['w']; print(f"| {cat} | {100 * W / n:.0f}% | {100 * c['e'] / W:.0f}% | {100 * c['pbet'] / W:.0f}% | {100 * c['okc'] / W:.0f}% | {100 * c['okb'] / W:.0f}% | {100 * c['both'] / W:.0f}% | {100 * (1 - c['okc'] / W):.0f}% | {100 * (1 - c['okb'] / W):.0f}% | {c['lc'] / W:.2f} | {c['lb'] / W:.2f} |")


def per_spot(spots, cat):
    """One row a spot for the category: its weight, equity, mean gap, solver bet share, and the spot's descriptors."""
    rows = []
    for d in spots:
        hs = [h for h in d['hands'] if h['cat'] == cat]; w = sum(h['w'] for h in hs)
        if w < 0.02 or len(hs) < 6: continue
        m = lambda f: sum(h['w'] * f(h) for h in hs) / w
        rows.append({'d': d, 'hs': hs, 'w': w, 'e': m(lambda h: h['e']), 'gap': m(lambda h: h['gap']), 'pbet': m(lambda h: h['pbet']),
                     'okc': m(lambda h: max(h['gap'], 0) <= TOL), 'okb': m(lambda h: max(-h['gap'], 0) <= TOL), 'size': m(lambda h: h['size'] / max(1, d['nbets'] - 1))})
    return rows


def spot_level(spots, cat):
    rows = per_spot(spots, cat)
    if len(rows) < 15: print(f'\n### {cat}: too few spots ({len(rows)})'); return rows
    kinds = collections.Counter('check all' if r['okc'] >= 0.9 and r['okb'] < 0.9 else 'bet all' if r['okb'] >= 0.9 and r['okc'] < 0.9 else 'anything' if r['okb'] >= 0.9 else 'split' for r in rows)
    print(f"\n### {cat}: {len(rows)} spots. Whole category within tolerance by: " + ', '.join(f'{k} {100 * v / len(rows):.0f}%' for k, v in kinds.most_common()))
    ws = [r['w'] for r in rows]; desc = {'category equity': [r['e'] for r in rows], 'range equity': [r['d']['rangeEq'] for r in rows], 'my strong share': [r['d']['myStrong'] for r in rows], 'his strong share': [r['d']['hisStrong'] for r in rows],
                                         'nut advantage': [r['d']['nutAdv'] for r in rows], 'his weak share': [r['d']['hisWeak'] for r in rows], 'my weak share': [r['d']['myWeak'] for r in rows], 'stack/pot': [min(r['d']['spr'], 5) for r in rows],
                                         'he bets after check': [r['d'].get('hisBetsAfter') or 0 for r in rows], 'he calls a bet': [r['d'].get('hisCalls') or 0 for r in rows], 'he raises a bet': [r['d'].get('hisRaises') or 0 for r in rows]}
    cs = sorted(((k, corr(v, [r['gap'] for r in rows], ws), corr(v, [r['pbet'] for r in rows], ws)) for k, v in desc.items()), key=lambda x: -abs(x[1]))
    print('  What moves bet minus check across spots (correlation with the gap / with the solver bet share): ' + '; '.join(f'{k} {a:+.2f} / {b:+.2f}' for k, a, b in cs))
    return rows


def table(rows, key, edges, label, fmt='{:.0f}%', scale=100):
    out = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        rs = [r for r in rows if lo <= key(r) < hi]; w = sum(r['w'] for r in rs)
        if len(rs) < 5: continue
        out.append(f"  {label} {fmt.format(scale * lo)}-{fmt.format(scale * hi)}: n={len(rs)}, solver bets {100 * sum(r['w'] * r['pbet'] for r in rs) / w:.0f}%, gap {sum(r['w'] * r['gap'] for r in rs) / w:+.1f}, may check {100 * sum(r['w'] * r['okc'] for r in rs) / w:.0f}%, may bet {100 * sum(r['w'] * r['okb'] for r in rs) / w:.0f}%")
    print('\n'.join(out))


def inside(rows, cat):
    """Which characteristic separates the hands of a category inside one spot (top third minus bottom third of bet - check)."""
    eff = collections.defaultdict(lambda: [0.0, 0.0, 0]); sp = [0.0, 0.0]
    for r in rows:
        hs = r['hs']; m = r['gap']; sd = math.sqrt(sum(h['w'] * (h['gap'] - m) ** 2 for h in hs) / r['w']); sp[0] += r['w'] * sd; sp[1] += r['w']
        for f in FEATS:
            t = thirds(hs, f)
            if t is not None: e = eff[f]; e[0] += r['w'] * t; e[1] += r['w']; e[2] += 1
    if sp[1] <= 0: return
    out = sorted(((f, e[0] / e[1]) for f, e in eff.items() if e[2] >= 10), key=lambda x: -abs(x[1]))
    print(f'  Inside a spot the gap varies by {sp[0] / sp[1]:.1f}. Top third minus bottom third: ' + ', '.join(f'{f} {x:+.1f}' for f, x in out))
    if cat == 'trips+':
        c = collections.defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])
        for r in rows:
            for h in r['hs']: x = c[h['sub']]; x[0] += h['w']; x[1] += h['w'] * h['gap']; x[2] += h['w'] * h['pbet']; x[3] += h['w'] * h['e']
        print('  By made hand: ' + '; '.join(f'{k} (equity {100 * x[3] / x[0]:.0f}%) solver bets {100 * x[2] / x[0]:.0f}%, gap {x[1] / x[0]:+.1f}' for k, x in sorted(c.items(), key=lambda kv: -kv[1][0])))


if __name__ == '__main__':
    spots = load(sys.argv[1], sys.argv[2]); policy(spots)
    for cat in ([sys.argv[3]] if len(sys.argv) > 3 else ORDER):
        rows = spot_level(spots, cat)
        if len(rows) < 15: continue
        table(rows, lambda r: r['e'], [0, .2, .35, .5, .65, .8, .9, 1.01], 'category equity')
        inside(rows, cat)
