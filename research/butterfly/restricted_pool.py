# The restricted solve with the page's shape: a few river tables per seat (first to act; facing a bet; facing a big bet;
# facing a raise), each shared by every board, solved on many river spots at once against the best reply on each, then
# scored on river spots it was not solved on. Beside it: the same tables solved for one spot alone (what sharing across
# boards costs), and a table for every decision of one spot (what tying decisions together costs).
# Cells: the hand's equity against the other's range as the river starts, in six bands; optionally a read of the spot.
#   python3 research/butterfly/restricted_pool.py [rounds]   ->  research/butterfly/restricted-pool.md
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
def pooled(spots, hero, rounds, read=None, per_node=False, table=None):
    """Shared tables for `hero` over `spots`. With `table` given, nothing is learnt: the table is only laid over the spots (for scoring)."""
    plan = []; KINDS = ['first', 'facing a bet', 'facing a big bet', 'facing a raise']
    for si, sp in enumerate(spots):
        rb, nr = read_of(sp, hero, read); b = bands(sp.eq0[hero], 6)
        for k in sp.dec:
            if sp.nodes[k][0] != hero: continue
            kd, amap = kind_of(sp, k, hero); tid = (si, k) if per_node else kd; plan.append((si, k, tid, b * nr + rb, np.array(amap), len(sp.nodes[k][1])))
    ncell = 6 * (1 if read is None else 3); tids = sorted({p[2] for p in plan}, key=str); reg = {t: np.zeros((ncell, 3)) for t in tids}; avg = {t: np.zeros((ncell, 3)) for t in tids}; cur = {t: np.full((ncell, 3), 1 / 3) for t in tids}
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
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / 3) for k, v in avg.items()}; ga = float(np.mean([100 * x / sp.P0 for x, sp in zip(pooled(spots, hero, 0, read, per_node, av), spots)]))
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
    out = open(os.path.join(HERE, 'restricted-pool.md'), 'w')
    def say(*a): print(*a); print(*a, file=out); out.flush()
    ex = lambda spots, gains, hero: float(np.mean([100 * (g - base[id(sp)][hero]) / sp.P0 for g, sp in zip(gains, spots)]))
    say(f'# Shared river tables, solved across boards ({len(S_tr)} river spots to solve on, {len(S_te)} others to score on, from {len(flops)} flops)\n')
    say('What the best reply wins over the value of the game, percent of the pot, averaged over spots. Each seat has four tables (first to act; facing a bet; facing a big bet; facing a raise) of six equity bands, shared by every board.\n')
    say('| tables | seat | on the spots solved on | on other spots: exact | in 10% steps | in 25% steps | worst spot (exact) |'); say('|---|---|---|---|---|---|---|'); KEEP = {}
    for read in (None, 'range equity', 'his weak hands', 'stack to pot'):
        for hero in (0, 1):
            tab = pooled(S_tr, hero, rounds, read); g_tr = pooled(S_tr, hero, 0, read, table=tab); g_te = pooled(S_te, hero, 0, read, table=tab); g10 = pooled(S_te, hero, 0, read, table={k: quarters(v, 10) for k, v in tab.items()}); g4 = pooled(S_te, hero, 0, read, table={k: quarters(v) for k, v in tab.items()})
            worst = max(100 * (g - base[id(sp)][hero]) / sp.P0 for g, sp in zip(g_te, S_te)); KEEP[(read, hero)] = tab
            say(f"| six equity bands{'' if read is None else ' x ' + read} | {'OOP' if hero == 0 else 'IP'} | {ex(S_tr, g_tr, hero):.1f} | {ex(S_te, g_te, hero):.1f} | {ex(S_te, g10, hero):.1f} | {ex(S_te, g4, hero):.1f} | {worst:.1f} |")
    # what sharing costs: the same four tables solved for each scoring spot alone, and a table for every decision of it
    say('\n| on the scoring spots, each solved alone | seat | four tables a spot | a table for every decision |'); say('|---|---|---|---|')
    for hero in (0, 1):
        a = [pooled([sp], hero, 0, table=pooled([sp], hero, rounds))[0] for sp in S_te[:8]]; b = [pooled([sp], hero, 0, per_node=True, table=pooled([sp], hero, rounds, per_node=True))[0] for sp in S_te[:8]]
        say(f"| (first 8) | {'OOP' if hero == 0 else 'IP'} | {ex(S_te[:8], a, hero):.1f} | {ex(S_te[:8], b, hero):.1f} |")
    say('\n## The shared tables (six equity bands, no read), in 10% steps: first answer / second / third\n'); lab = ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']
    for hero in (0, 1):
        for kd, ans in (('first', 'check / bet 75% / bet 150%'), ('facing a bet', 'fold / call / raise'), ('facing a big bet', 'fold / call / raise'), ('facing a raise', 'fold / call / raise')):
            t = quarters(KEEP[(None, hero)][kd], 10); say(f"**{'Out of position' if hero == 0 else 'In position'}, {kd}** ({ans}): " + '; '.join(f"{lab[b]}: {' / '.join(str(int(round(100 * x))) for x in t[b])}" for b in range(5, -1, -1)) + '\n')
    say(f'({time.time() - t0:.0f} s)'); out.close()
