# Shared river tables by a restricted solve, on river spots whose ranges come from play with raises on every street
# (poker-huerosolver's handselector-river-real, read by store.mjs; the rows stay outside this repository).
# The river: bets of 33%, 75% and 150% of the pot, all-in when the stack is two pots or less, raises to three times
# (all-in when that is the stack), a bet and two raises at most. One player plays by tables shared by every board; the
# other plays the best reply. Five tables a seat: first to act; facing a small bet (up to half the pot); a bet (up to the
# pot); a big bet (over the pot); a raise. Solved on some flops' rivers, scored on other flops' rivers.
#   STORE=<dir> python3 research/butterfly/restricted_river.py [rounds] [spots to solve on] [spots to score on]
#     ->  research/butterfly/restricted-river.md, restricted-river-tables.json
import os, sys, json, time, re
HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']
exec(open(os.path.join(HERE, 'restricted.py')).read().split("if __name__ == '__main__':")[0])
class River(Spot):
    def build(self):
        self.nodes = []; P0, S = self.P0, self.S
        def add(node): self.nodes.append(node); return len(self.nodes) - 1
        def decide(p, inv, raises, checked):
            k = add(None); acts = []; other = 1 - p; to_call = inv[other] - inv[p]
            if to_call > 0:
                acts.append(('fold', add(('fold', p, tuple(inv))))); c = list(inv); c[p] = inv[other]; acts.append(('call', add(('show', tuple(c)))))
                if raises < 3 and inv[other] < S:
                    to = min(S, round(3 * inv[other], 2)); n = list(inv); n[p] = to; acts.append(('raise' if to < S else 'allin', decide(other, n, raises + 1, True)))
            else:
                acts.append(('check', add(('show', tuple(inv))) if checked else decide(other, inv, raises, True))); seen = set()
                for f in (0.33, 0.75, 1.5) + ((99,) if S <= 2 * P0 else ()):
                    amt = min(S, round(f * P0, 2))
                    if amt in seen or amt <= 0: continue
                    seen.add(amt); n = list(inv); n[p] = amt; acts.append((f'bet {int(100 * f)}%' if amt < S else 'allin', decide(other, n, 1, True)))
            self.nodes[k] = (p, acts, tuple(inv)); return k
        self.root = decide(0, [0.0, 0.0], 0, False); self.dec = [k for k, n in enumerate(self.nodes) if isinstance(n[0], int)]
KINDS = {'first': ['check', 'bet 33%', 'bet 75%', 'bet 150% or all-in'], 'facing a small bet': ['fold', 'call', 'raise'], 'facing a bet': ['fold', 'call', 'raise'], 'facing a big bet': ['fold', 'call', 'raise'], 'facing a raise': ['fold', 'call', 'raise']}
def kind_of(spot, k, hero):
    p, acts, inv = spot.nodes[k]; n = len(acts); other = 1 - hero; to_call = inv[other] - inv[hero]
    if to_call <= 0: return 'first', [0] + [min(j, n - 1) for j in (1, 2, 3)]
    b = inv[other] / spot.P0; return ('facing a raise' if inv[hero] > 0 else 'facing a small bet' if b <= 0.5 else 'facing a bet' if b <= 1.0 else 'facing a big bet'), [0, 1, 2 if n > 2 else 1]
def read_of(spot, hero, read):
    if read is None: return 0, 1
    w, e = spot.w[hero] / spot.w[hero].sum(), spot.eq0[hero]; return int(np.digitize(float(w[e < .3].sum()), [.3, .5])), 3          # how much of my range is weak
def hand_cells(spot, hero, hand):
    e = spot.eq0[hero]; w = spot.w[hero] / spot.w[hero].sum(); o = np.argsort(e, kind='stable'); place = np.zeros(len(e)); place[o] = np.cumsum(w[o]) - w[o] / 2; pb = np.digitize(place, [.15, .35, .55, .75, .9])
    return (bands(e, 6), 6) if hand == 'equity' else (pb, 6) if hand == 'place' else (pb * 3 + bands(e, 3), 18)
def pooled(spots, hero, rounds, hand='equity', read=None, table=None):
    plan = []
    for si, sp in enumerate(spots):
        rb, nr = read_of(sp, hero, read); b, nh = hand_cells(sp, hero, hand)
        for k in sp.dec:
            if sp.nodes[k][0] == hero: kd, amap = kind_of(sp, k, hero); plan.append((si, k, kd, b * nr + rb, np.array(amap), len(sp.nodes[k][1])))
    ncell = nh * (1 if read is None else 3); A = {kd: len(a) for kd, a in KINDS.items()}; reg = {t: np.zeros((ncell, A[t])) for t in KINDS}; avg = {t: np.zeros((ncell, A[t])) for t in KINDS}; cur = {t: np.full((ncell, A[t]), 1 / A[t]) for t in KINDS}
    def lay(tab):
        sig = [dict() for _ in spots]
        for si, k, tid, cells, amap, na in plan: s = np.zeros((len(cells), na)); np.add.at(s.T, amap, tab[tid][cells].T); sig[si][k] = s
        return sig
    if table is not None: sig = lay(table); return [sp.best_reply(hero, sig[si])[0] for si, sp in enumerate(spots)]
    best = (1e9, None)
    for t in range(1, rounds + 1):
        sig = lay(cur); g = [sp.best_reply(hero, sig[si]) for si, sp in enumerate(spots)]; vals = [sp.values(hero, sig[si], g[si][1])[1] for si, sp in enumerate(spots)]; total = float(np.mean([100 * x[0] / sp.P0 for x, sp in zip(g, spots)]))
        if total < best[0]: best = (total, {k: v.copy() for k, v in cur.items()})
        add = {tid: np.zeros_like(reg[tid]) for tid in KINDS}; own = {tid: np.zeros(ncell) for tid in KINDS}
        for si, k, tid, cells, amap, na in plan:
            if k not in vals[si]: continue
            sp = spots[si]; q, r_own = vals[si][k]; v = (q * sig[si][k]).sum(1); np.add.at(add[tid], cells, (sp.w[hero] / (sp.Z * sp.P0))[:, None] * (q[:, amap] - v[:, None])); np.add.at(own[tid], cells, sp.w[hero] * r_own / sp.w[hero].sum())
        for tid in KINDS:
            reg[tid] = np.maximum(reg[tid] + add[tid], 0); tot = reg[tid].sum(1, keepdims=True); avg[tid] += t * own[tid][:, None] * cur[tid]; cur[tid] = np.where(tot > 0, reg[tid] / np.maximum(tot, 1e-12), 1 / A[tid])
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / A[k]) for k, v in avg.items()}
    ga = float(np.mean([100 * x / sp.P0 for x, sp in zip(pooled(spots, hero, 0, hand, read, av), spots)])); return av if ga < best[0] else best[1]
if __name__ == '__main__':
    rounds = int(sys.argv[1]) if len(sys.argv) > 1 else 1000; n_tr = int(sys.argv[2]) if len(sys.argv) > 2 else 40; n_te = int(sys.argv[3]) if len(sys.argv) > 3 else 24; rows = []
    for text in open(os.path.join(STORE, 'river-real.jsonl')):
        if '"line":"r|"' not in text: continue
        d = json.loads(text)
        if d['seat'] == 0 and 60 <= len(d['hands']) <= 260 and 60 <= len(d['vr']) <= 260: d['flop'] = re.search(r'f\d+', d['spot']).group(0); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows); t0 = time.time()
    S_tr = [River(d) for d in [x for x in rows if x['flop'] not in held][:n_tr]]; S_te = [River(d) for d in [x for x in rows if x['flop'] in held][:n_te]]
    base = {id(sp): [sp.best_reply(p, equilibrium(sp, 500)[p])[0] for p in (0, 1)] for sp in S_tr + S_te}; print(f'spots ready {time.time() - t0:.0f} s; decisions a tree: {np.mean([len(sp.dec) for sp in S_tr]):.0f}', file=sys.stderr)
    out = open(os.path.join(HERE, 'restricted-river.md'), 'w')
    def say(*a): print(*a); print(*a, file=out); out.flush()
    ex = lambda spots, gains, hero: [100 * (g - base[id(sp)][hero]) / sp.P0 for g, sp in zip(gains, spots)]
    say(f'# Shared river tables on rivers reached with raises on every street ({len(S_tr)} river spots to solve on, {len(S_te)} others to score on; {rounds} rounds)\n')
    say('What the best reply wins over the value of the game, percent of the pot. River: bets 33/75/150%, all-in, two raises to three times.\n')
    say('| rows | columns | cells a table | seat | on the spots solved on | on other spots: exact | in 10% steps | in 25% steps | worst spot | each scoring spot solved alone (same tables) |'); say('|---|---|---|---|---|---|---|---|---|---|'); SAVE = {}
    for hand, read in [('equity', None), ('place', 'my weak hands'), ('place x equity', None)]:
        for hero in (0, 1):
            tab = pooled(S_tr, hero, rounds, hand, read); sc = lambda S, t: pooled(S, hero, 0, hand, read, t); e_tr = ex(S_tr, sc(S_tr, tab), hero); e_te = ex(S_te, sc(S_te, tab), hero); e10 = ex(S_te, sc(S_te, {k: quarters(v, 10) for k, v in tab.items()}), hero); e4 = ex(S_te, sc(S_te, {k: quarters(v) for k, v in tab.items()}), hero)
            alone = np.mean([ex([sp], pooled([sp], hero, 0, hand, read, pooled([sp], hero, rounds, hand, read)), hero)[0] for sp in S_te[:6]]); nc = next(iter(tab.values())).shape[0]
            SAVE[f"{hand}|{read}|{hero}"] = {k: v.tolist() for k, v in tab.items()}
            say(f"| {hand} | {read or '-'} | {nc} | {'OOP' if hero == 0 else 'IP'} | {np.mean(e_tr):.1f} | {np.mean(e_te):.1f} | {np.mean(e10):.1f} | {np.mean(e4):.1f} | {max(e_te):.1f} | {alone:.1f} |")
            print(f'  {hand} {read} {hero}: {time.time() - t0:.0f} s', file=sys.stderr)
    json.dump(dict(kinds=KINDS, tables=SAVE), open(os.path.join(HERE, 'restricted-river-tables.json'), 'w')); say(f'\n({time.time() - t0:.0f} s)'); out.close()
