# The restricted solve with the page's shape: a few river tables per seat (first to act; facing a bet; facing a big bet;
# facing a raise), each shared by every board, solved on many river spots at once against the best reply on each, then
# scored on river spots it was not solved on. Beside it: the same tables solved for one spot alone (what sharing across
# boards costs), and a table for every decision of one spot (what tying decisions together costs).
# Cells: the hand's equity against the other's range as the river starts, in six bands; optionally a read of the spot.
# This version tries cells on the player's own range: the hand's place in it, and how much of it is strong or weak.
#   python3 research/butterfly/restricted_own.py [rounds]   ->  research/butterfly/restricted-own-range.md
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'restricted.py')).read().split("if __name__ == '__main__':")[0])
def kind_of(spot, k, hero):
    """Which table a decision uses, and how the table's three answers map to the decision's actions."""
    p, acts, inv = spot.nodes[k]; names = [a for a, _ in acts]; other = 1 - hero; to_call = inv[other] - inv[hero]
    if to_call <= 0: return 'first', [0, 1 if len(names) > 1 else 0, len(names) - 1]
    faced = 'a raise' if inv[hero] > 0 else ('a big bet' if inv[other] / spot.P0 > 1.0 else 'a bet'); return 'facing ' + faced, [0, 1, 2 if len(names) > 2 else 1]
def read_of(spot, hero, read):
    if read is None: return 0, 1
    if read == 'range equity': x = float(spot.w[hero] @ spot.eq0[hero] / spot.w[hero].sum()); return int(np.digitize(x, [.45, .55])), 3
    if read == 'his weak hands': o = 1 - hero; x = float(spot.w[o][spot.eq0[o] < .3].sum() / spot.w[o].sum()); return int(np.digitize(x, [.2, .45])), 3
    if read == 'stack to pot': return int(np.digitize(spot.S / spot.P0, [1.5, 4])), 3
    w, e = spot.w[hero] / spot.w[hero].sum(), spot.eq0[hero]; strong, weak = float(w[e >= .8].sum()), float(w[e < .3].sum())
    if read == 'my strong hands': return int(np.digitize(strong, [.15, .3])), 3
    if read == 'my weak hands': return int(np.digitize(weak, [.3, .5])), 3
    if read == 'my strong to weak': return int(np.digitize(strong / max(weak, 1e-9), [.4, 1.0])), 3
def hand_cells(spot, hero, hand):
    """Each hand's row in the table: its equity band, or its place in its own range (by equity, weakest first), or both."""
    e = spot.eq0[hero]; w = spot.w[hero] / spot.w[hero].sum(); o = np.argsort(e, kind='stable'); place = np.zeros(len(e)); place[o] = np.cumsum(w[o]) - w[o] / 2
    pb = np.digitize(place, [.15, .35, .55, .75, .9])
    if hand == 'equity': return bands(e, 6), 6
    if hand == 'place': return pb, 6
    if hand == 'place x equity': return pb * 3 + bands(e, 3), 18
    if hand == 'place 6 x equity 6': return pb * 6 + bands(e, 6), 36
    if hand == 'place 7 x equity 7': return np.digitize(place, [.1, .25, .4, .6, .75, .9]) * 7 + np.digitize(e, [.15, .3, .45, .55, .7, .85]), 49
def pooled(spots, hero, rounds, read=None, per_node=False, table=None, hand='equity'):
    """Shared tables for `hero` over `spots`. With `table` given, nothing is learnt: the table is only laid over the spots (for scoring)."""
    plan = []; KINDS = ['first', 'facing a bet', 'facing a big bet', 'facing a raise']
    for si, sp in enumerate(spots):
        rb, nr = read_of(sp, hero, read); b, nh = hand_cells(sp, hero, hand)
        for k in sp.dec:
            if sp.nodes[k][0] != hero: continue
            kd, amap = kind_of(sp, k, hero); tid = (si, k) if per_node else kd; plan.append((si, k, tid, b * nr + rb, np.array(amap), len(sp.nodes[k][1])))
    ncell = nh * (1 if read is None else 3); tids = sorted({p[2] for p in plan}, key=str); reg = {t: np.zeros((ncell, 3)) for t in tids}; avg = {t: np.zeros((ncell, 3)) for t in tids}; cur = {t: np.full((ncell, 3), 1 / 3) for t in tids}
    def lay(tab):
        sig = [dict() for _ in spots]
        for si, k, tid, cells, amap, na in plan:
            s = np.zeros((len(cells), na)); np.add.at(s.T, amap, tab[tid][cells].T); sig[si][k] = s
        return sig
    def gains(tab):
        sig = lay(tab); return [sp.best_reply(hero, sig[si]) for si, sp in enumerate(spots)], sig
    if table is not None: g, _ = gains(table); return [x[0] for x in g]
    best = (1e9, None)
    for t in range(1, rounds + 1):
        g, sig = gains(cur); add = {tid: np.zeros((ncell, 3)) for tid in tids}; own = {tid: np.zeros(ncell) for tid in tids}; vals = [sp.values(hero, sig[si], g[si][1])[1] for si, sp in enumerate(spots)]
        total = float(np.mean([100 * x[0] / sp.P0 for x, sp in zip(g, spots)]))
        if total < best[0]: best = (total, {k: v.copy() for k, v in cur.items()})
        for si, k, tid, cells, amap, na in plan:
            if k not in vals[si]: continue
            sp = spots[si]; q, r_own = vals[si][k]; v = (q * sig[si][k]).sum(1); d = (sp.w[hero] / (sp.Z * sp.P0))[:, None] * (q[:, amap] - v[:, None]); np.add.at(add[tid], cells, d); np.add.at(own[tid], cells, sp.w[hero] * r_own / sp.w[hero].sum())
        for tid in tids:
            reg[tid] = np.maximum(reg[tid] + add[tid], 0); tot = reg[tid].sum(1, keepdims=True); avg[tid] += t * own[tid][:, None] * cur[tid]; cur[tid] = np.where(tot > 0, reg[tid] / np.maximum(tot, 1e-12), 1 / 3)
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / 3) for k, v in avg.items()}; ga = float(np.mean([100 * x / sp.P0 for x, sp in zip(pooled(spots, hero, 0, read, per_node, av, hand), spots)]))
    return av if ga < best[0] else best[1]
if __name__ == '__main__':
    rounds = int(sys.argv[1]) if len(sys.argv) > 1 else 1500; rows = []; seen = set()
    for name in ('hands-9v', 'hands-7v', 'hands-8v'):
        for text in open(os.path.join(DATA, name + '.jsonl')):
            if '|first"' not in text: continue
            d = json.loads(text)
            if len(d['board'].split()) != 5 or d['seat'] != 0 or d['toCall'] > 0 or (d['spot'], d['board']) in seen or len(d['hands']) < 80 or len(d['vr']) < 80 or not (0.5 <= d['behind'] / d['pot'] <= 12): continue
            seen.add((d['spot'], d['board'])); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['spot'] for d in rows}); rng.shuffle(flops); held = set(flops[: max(4, len(flops) // 3)]); rng.shuffle(rows)
    train = [d for d in rows if d['spot'] not in held][:36]; test = [d for d in rows if d['spot'] in held][:18]; t0 = time.time()
    S_tr = [Spot(d) for d in train]; S_te = [Spot(d) for d in test]; base = {id(sp): [sp.best_reply(p, equilibrium(sp, 600)[p])[0] for p in (0, 1)] for sp in S_tr + S_te}
    out = open(os.path.join(HERE, 'restricted-grid.md' if os.environ.get('GRID') else os.devnull if os.environ.get('SHOW') else 'restricted-own-range.md'), 'w')
    def say(*a): print(*a); print(*a, file=out); out.flush()
    ex = lambda spots, gains, hero: float(np.mean([100 * (g - base[id(sp)][hero]) / sp.P0 for g, sp in zip(gains, spots)]))
    say(f'# Shared river tables with cells on the player\'s own range ({len(S_tr)} river spots to solve on, {len(S_te)} others to score on, from {len(flops)} flops)\n')
    say('What the best reply wins over the value of the game, percent of the pot, averaged over spots. Four tables a seat (first to act; facing a bet; facing a big bet; facing a raise), shared by every board. "Place" is where the hand stands in the player\'s own range by equity: bottom 15%, 15-35, 35-55, 55-75, 75-90, top 10%.\n')
    say('| rows | columns (a read of the spot) | cells a table | seat | on the spots solved on | on other spots: exact | in 10% steps | in 25% steps | worst spot |'); say('|---|---|---|---|---|---|---|---|---|'); KEEP = {}
    PLAN = [('equity', None), ('place', None), ('place', 'my strong hands'), ('place', 'my weak hands'), ('place', 'my strong to weak'), ('equity', 'my strong to weak'), ('equity', 'my strong hands'), ('place x equity', None), ('place x equity', 'my strong to weak')]
    if os.environ.get('SHOW'): PLAN = [('place', 'my weak hands'), ('place x equity', None)]
    if os.environ.get('GRID'): PLAN = [('place 6 x equity 6', None), ('place 7 x equity 7', None)]
    for hand, read in PLAN:
        for hero in (0, 1):
            tab = pooled(S_tr, hero, rounds, read, hand=hand); sc = lambda S, t: pooled(S, hero, 0, read, table=t, hand=hand); g_tr = sc(S_tr, tab); g_te = sc(S_te, tab); g10 = sc(S_te, {k: quarters(v, 10) for k, v in tab.items()}); g4 = sc(S_te, {k: quarters(v) for k, v in tab.items()})
            worst = max(100 * (g - base[id(sp)][hero]) / sp.P0 for g, sp in zip(g_te, S_te)); KEEP[(hand, read, hero)] = tab; nc = next(iter(tab.values())).shape[0]
            say(f"| {hand} | {read or '-'} | {nc} | {'OOP' if hero == 0 else 'IP'} | {ex(S_tr, g_tr, hero):.1f} | {ex(S_te, g_te, hero):.1f} | {ex(S_te, g10, hero):.1f} | {ex(S_te, g4, hero):.1f} | {worst:.1f} |")
    if os.environ.get('SHOW'): json.dump({f'{h}|{r}|{hero}': {k: v.tolist() for k, v in t.items()} for (h, r, hero), t in KEEP.items()}, open(os.path.join(HERE, 'restricted-tables.json'), 'w'))
    say(f'\n({time.time() - t0:.0f} s)'); out.close()
