# The blend: shared coarse river tables solved against a mixture of two opponents, a fixed strategy (the solver's own
# equilibrium play, which does not adjust) and an adaptive one (the best reply to the tables as they stand). A dial sets
# the adaptive share: 0 gives the tables that lose least to the fixed strategy, 1 the least exploitable tables. For each
# setting, on river spots the tables were not solved on: the exploitability and the EV given up to the fixed strategy.
#   STORE=<dir> python3 research/butterfly/restricted_blend.py [rounds] [spots to solve on] [spots to score on]
#     ->  research/butterfly/restricted-blend.md, restricted-blend-tables.json
import os, sys, json, re, time
HERE = os.path.dirname(os.path.abspath(__file__)); MAIN = "\nif __name__ == '__main__':"
exec(open(os.path.join(HERE, 'restricted_river.py')).read().split(MAIN)[0])
def lay_all(spots, hero, tab, hand, read):
    sig = [dict() for _ in spots]; plan = []
    for si, sp in enumerate(spots):
        rb, nr = read_of(sp, hero, read); b, nh = hand_cells(sp, hero, hand)
        for k in sp.dec:
            if sp.nodes[k][0] != hero: continue
            kd, amap = kind_of(sp, k, hero); cells = b * nr + rb; amap = np.array(amap); plan.append((si, k, kd, cells, amap)); s = np.zeros((len(cells), len(sp.nodes[k][1]))); np.add.at(s.T, amap, np.asarray(tab[kd])[cells].T); sig[si][k] = s
    return sig, plan
def measure(spots, hero, tab, hand, read, EQ, STAR, FLOOR):
    sig, _ = lay_all(spots, hero, tab, hand, read)
    ex = [100 * (sp.best_reply(hero, sig[si])[0] - FLOOR[id(sp)][hero]) / sp.P0 for si, sp in enumerate(spots)]; ev = [100 * (STAR[id(sp)][hero] - sp.values(hero, sig[si], EQ[id(sp)][1 - hero])[0]) / sp.P0 for si, sp in enumerate(spots)]
    return np.array(ex), np.array(ev)
def blend(spots, hero, rounds, dial, hand, read, EQ, STAR, FLOOR):
    b0, nh = hand_cells(spots[0], hero, hand); ncell = nh * (1 if read is None else 3); A = {kd: len(a) for kd, a in KINDS.items()}
    reg = {t: np.zeros((ncell, A[t])) for t in KINDS}; avg = {t: np.zeros((ncell, A[t])) for t in KINDS}; cur = {t: np.full((ncell, A[t]), 1 / A[t]) for t in KINDS}; best = (1e9, None); opp = 1 - hero
    def cost(tab): ex, ev = measure(spots, hero, tab, hand, read, EQ, STAR, FLOOR); return dial * ex.mean() + (1 - dial) * ev.mean()
    for t in range(1, rounds + 1):
        sig, plan = lay_all(spots, hero, cur, hand, read); add = {tid: np.zeros_like(reg[tid]) for tid in KINDS}; own = {tid: np.zeros(ncell) for tid in KINDS}; vals = []; score = 0.0
        for si, sp in enumerate(spots):
            va = sp.values(hero, sig[si], EQ[id(sp)][opp]) if dial < 1 else (0, {}); g, br = sp.best_reply(hero, sig[si]) if dial > 0 else (0, None); vb = sp.values(hero, sig[si], br)[1] if dial > 0 else {}
            vals.append((va[1], vb)); score += (dial * 100 * (g - FLOOR[id(sp)][hero]) / sp.P0 if dial > 0 else 0) + ((1 - dial) * 100 * (STAR[id(sp)][hero] - va[0]) / sp.P0 if dial < 1 else 0)
        score /= len(spots)
        if score < best[0]: best = (score, {k: v.copy() for k, v in cur.items()})
        for si, k, tid, cells, amap in plan:
            sp = spots[si]; fa, ad = vals[si]; n = len(cells); q = np.zeros((n, len(sp.nodes[k][1]))); r_own = None
            if k in fa: q += (1 - dial) * fa[k][0]; r_own = fa[k][1]
            if k in ad: q += dial * ad[k][0]; r_own = ad[k][1]
            if r_own is None: continue
            v = (q * sig[si][k]).sum(1); np.add.at(add[tid], cells, (sp.w[hero] / (sp.Z * sp.P0))[:, None] * (q[:, amap] - v[:, None])); np.add.at(own[tid], cells, sp.w[hero] * r_own / sp.w[hero].sum())
        for tid in KINDS:
            reg[tid] = np.maximum(reg[tid] + add[tid], 0); tot = reg[tid].sum(1, keepdims=True); avg[tid] += t * own[tid][:, None] * cur[tid]; cur[tid] = np.where(tot > 0, reg[tid] / np.maximum(tot, 1e-12), 1 / A[tid])
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / A[k]) for k, v in avg.items()}
    return av if cost(av) < best[0] else best[1]
if __name__ == '__main__':
    rounds = int(sys.argv[1]) if len(sys.argv) > 1 else 800; n_tr = int(sys.argv[2]) if len(sys.argv) > 2 else 40; n_te = int(sys.argv[3]) if len(sys.argv) > 3 else 24; rows = []
    for text in open(os.path.join(STORE, 'river-real.jsonl')):
        if '"line":"r|"' not in text: continue
        d = json.loads(text)
        if d['seat'] == 0 and 60 <= len(d['hands']) <= 260 and 60 <= len(d['vr']) <= 260: d['flop'] = re.search(r'f\d+', d['spot']).group(0); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows); t0 = time.time()       # the same split as restricted_river.py
    S_tr = [River(d) for d in [x for x in rows if x['flop'] not in held][:n_tr]]; S_te = [River(d) for d in [x for x in rows if x['flop'] in held][:n_te]]; EQ, STAR, FLOOR = {}, {}, {}
    for sp in S_tr + S_te: eq = equilibrium(sp, 600); EQ[id(sp)] = eq; STAR[id(sp)] = [sp.values(p, eq[p], eq[1 - p])[0] for p in (0, 1)]; FLOOR[id(sp)] = [sp.best_reply(p, eq[p])[0] for p in (0, 1)]
    out = open(os.path.join(HERE, 'restricted-blend.md'), 'w'); SAVE = {}
    def say(*a): print(*a); print(*a, file=out); out.flush()
    say(f'# The blend: coarse river tables against a mix of a fixed and an adaptive opponent ({len(S_tr)} river spots to solve on, {len(S_te)} others to score on; {rounds} rounds)\n')
    say('On the spots the tables were not solved on, percent of the pot for the whole river. "Exploitability": what the adaptive strategy (the best reply) wins. "EV lost": what the tables give up to the fixed strategy (the solver\'s own play). Tables in 10% steps in brackets.\n')
    PLAN = [('place', 'my weak hands')] + ([('place x equity', None)] if not os.environ.get('ONE') else [])
    for hand, read in PLAN:
        say(f"\n## Rows: {hand}; columns: {read or 'none'}\n"); say('| adaptive share | seat | exploitability | worst spot | EV lost | worst spot | exploitability (10% steps) | EV lost (10% steps) |'); say('|---|---|---|---|---|---|---|---|')
        for dial in (0, 0.05, 0.1, 0.25, 0.5, 1):
            for hero in (0, 1):
                tab = blend(S_tr, hero, rounds, dial, hand, read, EQ, STAR, FLOOR); ex, ev = measure(S_te, hero, tab, hand, read, EQ, STAR, FLOOR); t10 = {k: quarters(v, 10) for k, v in tab.items()}; ex10, ev10 = measure(S_te, hero, t10, hand, read, EQ, STAR, FLOOR)
                SAVE[f'{hand}|{read}|{dial}|{hero}'] = {k: v.tolist() for k, v in tab.items()}
                say(f"| {int(100 * dial)}% | {'OOP' if hero == 0 else 'IP'} | {ex.mean():.1f} | {ex.max():.1f} | {ev.mean():.2f} | {ev.max():.2f} | {ex10.mean():.1f} | {ev10.mean():.2f} |"); print(f'  {time.time() - t0:.0f} s', file=sys.stderr)
        json.dump(dict(kinds=KINDS, tables=SAVE), open(os.path.join(HERE, 'restricted-blend-tables.json'), 'w'))
    out.close()
