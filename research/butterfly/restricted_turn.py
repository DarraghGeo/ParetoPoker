# A restricted solve from the turn: does a draw column on the turn tables lower exploitability?
# One player plays the turn and the river by shared tables; the other is free and plays the best reply over both streets.
# Kept simple, as a test: one bet size (75% of the pot) and one raise (to three times) on each street.
# Turn tables: the hand's place in the player's own range (six bands) by how much of that range is weak (three),
# and, in the second version, by whether the hand has a draw (a flush draw, or eight or more cards to a straight).
# River tables (both versions): place by weak share, on that river card. Places, equities and weak shares are counted
# against the ranges as the turn starts, so the cells do not move with either player's play.
# Turn spots: poker-huerosolver's handselector-turn roots (store.mjs turn-real), solved on some flops, scored on others.
#   STORE=<dir> python3 research/butterfly/restricted_turn.py <job> [rounds] [spots to solve on] [spots to score on]
#     job: base (the game's value on the scoring spots) | alone:<variant> (each scoring spot solved alone) | <seat 0/1>:<variant>   ->  $STORE/turn-<job>.json
#     variants: frozen (the cells read the ranges as the turn starts) | true (the range the player holds at each decision) | spr (frozen, with stacks behind in pots) | true+spr
import os, sys, json, re, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']; RANKS = '23456789TJQKA'; DECK = [r + s for r in RANKS for s in 'cdhs']
def score7(cs):
    """The best five of seven cards as one number that compares."""
    rs = sorted((RANKS.index(c[0]) for c in cs), reverse=True); cnt = {}
    for r in rs: cnt[r] = cnt.get(r, 0) + 1
    suit = next((s for s in 'shdc' if sum(c[1] == s for c in cs) >= 5), None)
    def straight(ranks):
        have = set(ranks) | ({-1} if 12 in ranks else set()); return next((t for t in range(12, 2, -1) if all(t - k in have for k in range(5))), None)
    pack = lambda cat, ks: cat * 15 ** 5 + sum(k * 15 ** (4 - i) for i, k in enumerate(ks))
    fr = sorted((RANKS.index(c[0]) for c in cs if c[1] == suit), reverse=True) if suit else None
    if suit and straight(fr) is not None: return pack(8, [straight(fr)])
    by = sorted(cnt, key=lambda r: (-cnt[r], -r))
    if cnt[by[0]] == 4: return pack(7, [by[0], max(r for r in rs if r != by[0])])
    if cnt[by[0]] == 3 and len(by) > 1 and cnt[by[1]] >= 2: return pack(6, [by[0], by[1]])
    if suit: return pack(5, fr[:5])
    if straight(rs) is not None: return pack(4, [straight(rs)])
    if cnt[by[0]] == 3: return pack(3, [by[0]] + [r for r in rs if r != by[0]][:2])
    if cnt[by[0]] == 2 and len(by) > 1 and cnt[by[1]] == 2: return pack(2, [by[0], by[1], max(r for r in rs if r not in (by[0], by[1]))])
    if cnt[by[0]] == 2: return pack(1, [by[0]] + [r for r in rs if r != by[0]][:3])
    return pack(0, rs[:5])
def has_draw(hand, board):
    cs = [hand[:2], hand[2:]] + board
    if any(sum(c[1] == s for c in cs) == 4 and any(c[1] == s for c in cs[:2]) for s in 'shdc'): return 1
    ranks = [RANKS.index(c[0]) for c in cs]
    def top(r):
        have = set(r) | ({-1} if 12 in r else set()); return next((t for t in range(12, 2, -1) if all(t - k in have for k in range(5))), -1)
    return int(sum(1 for r in range(13) if top(ranks + [r]) > top(ranks)) >= 2)
def street(P, base, S):
    """One street's betting from a pot P with `base` already in from each player: nodes, the first decision's index. Ends: ('fold', folder, inv) or ('end', inv)."""
    nodes = []
    def add(n): nodes.append(n); return len(nodes) - 1
    def decide(p, inv, bets, checked):
        k = add(None); o = 1 - p; acts = []
        if inv[o] > inv[p]:
            acts.append(('fold', add(('fold', p, tuple(inv))))); c = list(inv); c[p] = inv[o]; acts.append(('call', add(('end', tuple(c)))))
            if bets < 2 and inv[o] < S: n = list(inv); n[p] = min(S, round(base + 3 * (inv[o] - base), 2)); acts.append(('raise', decide(o, n, bets + 1, True)))
        else:
            acts.append(('check', add(('end', tuple(inv))) if checked else decide(o, inv, bets, True)))
            if inv[p] < S: n = list(inv); n[p] = min(S, round(base + 0.75 * P, 2)); acts.append(('bet', decide(o, n, 1, True)))
        nodes[k] = (p, acts, tuple(inv)); return k
    decide(0, [base, base], 0, False); return nodes
class Turn:
    def __init__(self, d):
        self.name = d['spot']; self.board = d['board'].split(); self.P0 = d['pot']; self.S = d['behind']
        hs = [(h['h'], h['w']) for h in d['hands'] if h['w'] > 0]; vs = [(x[0], x[1]) for x in d['vr'] if x[1] > 0]; self.hands = [[h for h, _ in hs], [h for h, _ in vs]]; self.w = [np.array([x for _, x in hs]), np.array([x for _, x in vs])]
        two = lambda h: (h[:2], h[2:]); self.cards = [c for c in DECK if c not in self.board]; C = len(self.cards); n0, n1 = len(hs), len(vs)
        self.V0 = np.array([[not (set(two(a)) & set(two(b))) for b in self.hands[1]] for a in self.hands[0]], np.float32); self.A = [np.array([[c not in two(h) for h in self.hands[p]] for c in self.cards], np.float32) for p in (0, 1)]
        s0 = np.array([[score7(list(two(h)) + self.board + [c]) for h in self.hands[0]] for c in self.cards]); s1 = np.array([[score7(list(two(h)) + self.board + [c]) for h in self.hands[1]] for c in self.cards])
        V = self.V0[None] * self.A[0][:, :, None] * self.A[1][:, None, :]; cmp = np.sign(s0[:, :, None] - s1[:, None, :]); self.W = ((cmp > 0) * V).astype(np.float32); self.T = ((cmp == 0) * V).astype(np.float32); self.L = ((cmp < 0) * V).astype(np.float32); self.V = V.astype(np.float32)
        self.Z = float(self.w[0] @ self.V0 @ self.w[1]); self.tn = street(self.P0, 0.0, self.S); self.rv = {}
        for k, n in enumerate(self.tn):            # a river for each way the turn can end: two lines that put the same money in are still different rivers
            if n[0] == 'end' and n[1][0] < self.S: self.rv[k] = street(self.P0 + 2 * n[1][0], n[1][0], self.S)
        # what the tables look at, against the ranges as the turn starts
        w0, w1 = self.w[0].astype(np.float32), self.w[1].astype(np.float32); self.eqr = [None, None]; self.eqt = [None, None]
        win0 = self.W @ w1 + 0.5 * (self.T @ w1); den0 = self.V @ w1; win1 = np.einsum('cij,i->cj', self.L, w0) + 0.5 * np.einsum('cij,i->cj', self.T, w0); den1 = np.einsum('cij,i->cj', self.V, w0)
        self.eqr = [win0 / np.maximum(den0, 1e-9), win1 / np.maximum(den1, 1e-9)]; self.eqt = [win0.sum(0) / np.maximum(den0.sum(0), 1e-9), win1.sum(0) / np.maximum(den1.sum(0), 1e-9)]
        self.draw = [np.array([has_draw(h, self.board) for h in self.hands[p]]) for p in (0, 1)]
    def cells(self, hero, draw):
        """Each hand's cell on the turn, and on each river card."""
        def place_of(e, w):
            o = np.argsort(e, kind='stable'); pl = np.zeros(len(e)); ww = w / max(w.sum(), 1e-12); pl[o] = np.cumsum(ww[o]) - ww[o] / 2; return np.digitize(pl, [.15, .35, .55, .75, .9])
        w = self.w[hero]; e = self.eqt[hero]; weak = int(np.digitize(float(w[e < .3].sum() / w.sum()), [.3, .5])); ct = place_of(e, w) * 3 + weak
        if draw: ct = ct * 2 + self.draw[hero]
        cr = np.zeros(self.eqr[hero].shape, int)
        for c in range(len(self.cards)):
            wc = w * self.A[hero][c]; ec = self.eqr[hero][c]; wk = int(np.digitize(float(wc[ec < .3].sum() / max(wc.sum(), 1e-12)), [.3, .5])); cr[c] = place_of(np.where(self.A[hero][c] > 0, ec, -1), wc) * 3 + wk
        return ct, cr
    # ---- values at the ends, for player p against the other's reach
    def show(self, p, r, c):                       # r: (C, n_opp); every river card
        if p == 0: return (self.P0 + c) * np.einsum('cij,cj->ci', self.W, r) + (self.P0 / 2) * np.einsum('cij,cj->ci', self.T, r) - c * np.einsum('cij,cj->ci', self.L, r)
        return (self.P0 + c) * np.einsum('cij,ci->cj', self.L, r) + (self.P0 / 2) * np.einsum('cij,ci->cj', self.T, r) - c * np.einsum('cij,ci->cj', self.W, r)
    def fold_r(self, p, r, folder, inv): m = np.einsum('cij,cj->ci', self.V, r) if p == 0 else np.einsum('cij,ci->cj', self.V, r); return (-inv[p] if folder == p else self.P0 + inv[folder]) * m
    def fold_t(self, p, r, folder, inv): m = self.V0 @ r if p == 0 else self.V0.T @ r; return (-inv[p] if folder == p else self.P0 + inv[folder]) * m
    def walk(self, me, sig_t, sig_r, mode, other_t=None, other_r=None):
        """mode 'reply': `me` is the free player replying to the table player's strategy (sig_*): returns its value and its strategy.
        mode 'values': `me` is the table player against the other's strategy (other_*): returns its value and, at its decisions, each action's worth."""
        opp = 1 - me; out_t, out_r = {}, {}; NC = 44.0
        def river(key, k, r, mine):                # r: the other player's reach, (C, n_opp); mine: my own reach so far, (C, n_me)
            node = self.rv[key][k]
            if node[0] == 'fold': return self.fold_r(me, r, node[1], node[2])
            if node[0] == 'end': return self.show(me, r, node[1][0])
            p, acts, _ = node
            if p == me:
                if mode == 'reply': q = np.stack([river(key, c, r, mine) for _, c in acts], -1)
                else: q = np.stack([river(key, c, r, mine * sig_r[(key, k)][..., a]) for a, (_, c) in enumerate(acts)], -1)
                if mode == 'reply': best = q.argmax(-1); s = np.zeros_like(q); np.put_along_axis(s, best[..., None], 1, -1); out_r[(key, k)] = s; return q.max(-1)
                out_r[(key, k)] = (q, mine); return (q * sig_r[(key, k)]).sum(-1)
            st = (sig_r if mode == 'reply' else other_r)[(key, k)]; return sum(river(key, c, r * st[..., a], mine) for a, (_, c) in enumerate(acts))
        def turn(k, r, mine):
            node = self.tn[k]
            if node[0] == 'fold': return self.fold_t(me, r, node[1], node[2])
            if node[0] == 'end':
                rc = r[None, :] * self.A[opp]
                if k in self.rv: return (river(k, 0, rc, mine[None, :] * self.A[me]) * self.A[me]).sum(0) / NC
                return (self.show(me, rc, node[1][0]) * self.A[me]).sum(0) / NC          # all in on the turn: the river is only dealt
            p, acts, _ = node
            if p == me:
                if mode == 'reply': q = np.stack([turn(c, r, mine) for _, c in acts], -1); best = q.argmax(-1); s = np.zeros_like(q); s[np.arange(len(best)), best] = 1; out_t[k] = s; return q.max(-1)
                q = np.stack([turn(c, r, mine * sig_t[k][:, a]) for a, (_, c) in enumerate(acts)], -1); out_t[k] = (q, mine); return (q * sig_t[k]).sum(-1)
            st = (sig_t if mode == 'reply' else other_t)[k]; return sum(turn(c, r * st[:, a], mine) for a, (_, c) in enumerate(acts))
        v = turn(0, self.w[opp].astype(np.float32), np.ones(len(self.w[me]), np.float32)); return float(self.w[me] @ v) / self.Z, out_t, out_r
    def decisions(self, p): return [k for k, n in enumerate(self.tn) if isinstance(n[0], int) and n[0] == p], [(key, k) for key, ns in self.rv.items() for k, n in enumerate(ns) if isinstance(n[0], int) and n[0] == p]
KINDS = {'T first': 2, 'T facing a bet': 3, 'T facing a raise': 2, 'R first': 2, 'R facing a bet': 3, 'R facing a raise': 2}
def kind(node, hero, tag):
    p, acts, inv = node; return tag + (' first' if inv[1 - hero] <= inv[hero] else ' facing a raise' if len(acts) == 2 and acts[0][0] == 'fold' and any(True for _ in [0]) and node_raised(node, hero) else ' facing a bet')
def node_raised(node, hero): return len(node[1]) == 2            # facing a wager with no raise left: a raise was faced (or the stack is gone)
def place_rows(E, Wt):
    """For each row (a river card, or the turn): each hand's place in the weighted range by equity (six bands), and the range's weak share (three bands)."""
    o = np.argsort(E, axis=1, kind='stable'); ws = np.take_along_axis(Wt, o, 1); tot = np.maximum(Wt.sum(1, keepdims=True), 1e-12); cum = (np.cumsum(ws, 1) - ws / 2) / tot; pl = np.empty_like(cum); np.put_along_axis(pl, o, cum, 1)
    return np.digitize(pl, [.15, .35, .55, .75, .9]), np.digitize((Wt * (E < .3)).sum(1) / tot[:, 0], [.3, .5])
def lay(sp, hero, tab, opts):
    """The tables laid over a spot. opts = (true, spr): `true` reads the place and the weak share from the range the player
    holds at each decision, as its own tables have shaped it (else from its range as the turn starts); `spr` adds the
    stacks behind in pots at the decision (under 1.5, 1.5 to 4, over 4)."""
    true, spr = opts; st, sr, plan = {}, {}, []; w = sp.w[hero]; C = len(sp.cards)
    if not hasattr(sp, '_frozen'): sp._frozen = {}
    if hero not in sp._frozen: sp._frozen[hero] = sp.cells(hero, False)
    ct0, cr0 = sp._frozen[hero]
    def depth(inv): return int(np.digitize((sp.S - max(inv)) / (sp.P0 + inv[0] + inv[1]), [1.5, 4]))
    def strat(kd, cells, na):
        t = tab[kd][cells]; s = np.zeros(cells.shape + (na,), np.float32); s[..., :min(na, t.shape[-1])] = t[..., :na]
        if na < t.shape[-1]: s[..., na - 1] += t[..., na:].sum(-1)
        return s
    def river(key, k, mine):                       # mine: my own reach so far, (C, n)
        node = sp.rv[key][k]
        if not isinstance(node[0], int): return
        p, acts, inv = node
        if p != hero:
            for _, c in acts: river(key, c, mine)
            return
        if true: pl, wk = place_rows(sp.eqr[hero], w[None, :] * mine * sp.A[hero]); cells = pl * 3 + wk[:, None]
        else: cells = cr0
        if spr: cells = cells * 3 + depth(inv)
        kd = kind(node, hero, 'R'); na = len(acts); x = strat(kd, cells, na); sr[(key, k)] = x; plan.append(('r', (key, k), kd, cells, na))
        for a, (_, c) in enumerate(acts): river(key, c, mine * x[..., a])
    def turn(k, mine):
        node = sp.tn[k]
        if node[0] == 'fold': return
        if node[0] == 'end':
            if k in sp.rv: river(k, 0, np.repeat(mine[None, :], C, 0))
            return
        p, acts, inv = node
        if p != hero:
            for _, c in acts: turn(c, mine)
            return
        if true: pl, wk = place_rows(sp.eqt[hero][None, :], (w * mine)[None, :]); cells = pl[0] * 3 + wk[0]
        else: cells = ct0
        if spr: cells = cells * 3 + depth(inv)
        kd = kind(node, hero, 'T'); na = len(acts); x = strat(kd, cells, na); st[k] = x; plan.append(('t', k, kd, cells, na))
        for a, (_, c) in enumerate(acts): turn(c, mine * x[:, a])
    turn(0, np.ones(len(w), np.float32)); return st, sr, plan
VARIANTS = {'frozen': (False, False), 'true': (True, False), 'spr': (False, True), 'true+spr': (True, True)}
def solve(spots, hero, rounds, opts, log=None):
    draw = opts; nc = {kd: 18 * (3 if opts[1] else 1) for kd in KINDS}; reg = {kd: np.zeros((nc[kd], a)) for kd, a in KINDS.items()}; avg = {kd: np.zeros((nc[kd], a)) for kd, a in KINDS.items()}; cur = {kd: np.full((nc[kd], a), 1 / a) for kd, a in KINDS.items()}; best = (1e9, None); t0 = time.time()
    for t in range(1, rounds + 1):
        add = {kd: np.zeros_like(v) for kd, v in reg.items()}; own = {kd: np.zeros(nc[kd]) for kd in KINDS}; total = 0.0
        for sp in spots:
            st, sr, plan = lay(sp, hero, cur, draw); g, bt, br = sp.walk(1 - hero, st, sr, 'reply'); _, qt, qr = sp.walk(hero, st, sr, 'values', bt, br); total += 100 * g / sp.P0; w0 = sp.w[hero] / (sp.Z * sp.P0)
            for typ, key, kd, cells, na in plan:
                got = (qt if typ == 't' else qr).get(key)
                if got is None: continue
                q, mine = got
                s = st[key] if typ == 't' else sr[key]; v = (q * s).sum(-1); d = np.zeros(q.shape[:-1] + (KINDS[kd],)); d[..., :na] = q - v[..., None]; d = d * (w0[:, None] if typ == 't' else (w0[None, :, None] * sp.A[hero][:, :, None] / 44.0))
                np.add.at(add[kd], cells.reshape(-1), d.reshape(-1, KINDS[kd])); np.add.at(own[kd], cells.reshape(-1), (mine * sp.w[hero] / sp.w[hero].sum()).reshape(-1) / (1 if typ == 't' else cells.shape[0]))
        total /= len(spots)
        if total < best[0]: best = (total, {k: v.copy() for k, v in cur.items()})
        for kd in KINDS:
            reg[kd] = np.maximum(reg[kd] + add[kd], 0); tot = reg[kd].sum(1, keepdims=True); avg[kd] += t * own[kd][:, None] * cur[kd]; cur[kd] = np.where(tot > 0, reg[kd] / np.maximum(tot, 1e-12), 1 / KINDS[kd])
        if log and (t in (1, 5, 20, 50) or t % 100 == 0): print(f'    round {t}: the reply wins {total:.1f}% of the pot (raw), {time.time() - t0:.0f} s', file=log, flush=True)
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / KINDS[k]) for k, v in avg.items()}
    ga = float(np.mean([100 * sp.walk(1 - hero, *lay(sp, hero, av, draw)[:2], 'reply')[0] / sp.P0 for sp in spots])); return av if ga < best[0] else best[1]
def equilibrium(sp, rounds):
    """Both players free (CFR+): each player's value against the other's best play, percent of the pot."""
    td, rd = [sp.decisions(p) for p in (0, 1)], None; sig_t = [dict(), dict()]; sig_r = [dict(), dict()]; C = len(sp.cards)
    for p in (0, 1):
        for k in td[p][0]: a = len(sp.tn[k][1]); sig_t[p][k] = np.full((len(sp.w[p]), a), 1 / a, np.float32)
        for key in td[p][1]: a = len(sp.rv[key[0]][key[1]][1]); sig_r[p][key] = np.full((C, len(sp.w[p]), a), 1 / a, np.float32)
    rt = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig_t]; rr = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig_r]; at = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig_t]; ar = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig_r]
    for t in range(1, rounds + 1):
        for p in (0, 1):
            _, qt, qr = sp.walk(p, sig_t[p], sig_r[p], 'values', sig_t[1 - p], sig_r[1 - p])
            for store, regs, sigs, avs in ((qt, rt[p], sig_t[p], at[p]), (qr, rr[p], sig_r[p], ar[p])):
                for k, (q, mine) in store.items():
                    v = (q * sigs[k]).sum(-1); regs[k] = np.maximum(regs[k] + q - v[..., None], 0); tot = regs[k].sum(-1, keepdims=True); sigs[k] = np.where(tot > 0, regs[k] / np.maximum(tot, 1e-12), 1 / q.shape[-1]).astype(np.float32); avs[k] += t * mine[..., None] * sigs[k]
    norm = lambda a: {k: np.where(v.sum(-1, keepdims=True) > 0, v / np.maximum(v.sum(-1, keepdims=True), 1e-12), 1 / v.shape[-1]).astype(np.float32) for k, v in a.items()}
    nt, nr = [norm(at[0]), norm(at[1])], [norm(ar[0]), norm(ar[1])]
    return [100 * sp.walk(1 - p, nt[p], nr[p], 'reply')[0] / sp.P0 for p in (0, 1)]          # what the free player gets against each seat's equilibrium play
if __name__ == '__main__':
    job = sys.argv[1]; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 300; n_tr = int(sys.argv[3]) if len(sys.argv) > 3 else 12; n_te = int(sys.argv[4]) if len(sys.argv) > 4 else 8; rows = []
    for text in open(os.path.join(STORE, 'turn-real.jsonl')):
        if '"line":"r|"' not in text: continue
        d = json.loads(text)
        if d['seat'] == 0 and 60 <= len(d['hands']) <= 190 and 60 <= len(d['vr']) <= 190 and d['behind'] / d['pot'] >= 1: d['flop'] = re.search(r'f\d+|b\d+', d['spot']).group(0); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows); t0 = time.time(); log = sys.stderr
    te = [x for x in rows if x['flop'] in held][:n_te]; tr = [x for x in rows if x['flop'] not in held][:n_tr]
    if job == 'base':
        res = {}
        for d in te: sp = Turn(d); res[d['spot']] = equilibrium(sp, rounds); print(f"  {d['spot']} {res[d['spot']]} {time.time() - t0:.0f} s", file=log, flush=True)
        json.dump(res, open(os.path.join(STORE, 'turn-base.json'), 'w'))
    elif job.startswith('alone'):                             # each scoring spot solved alone with the same tables: what sharing across boards costs
        base = json.load(open(os.path.join(STORE, 'turn-base.json'))); res = {}; VAR = job.split(':')[1] if ':' in job else 'frozen'
        for d in te[: int(os.environ.get('ALONE', 6))]:
            sp = Turn(d); res[d['spot']] = []
            for hero in (0, 1): tab = solve([sp], hero, rounds, VARIANTS[VAR]); res[d['spot']].append(100 * sp.walk(1 - hero, *lay(sp, hero, tab, VARIANTS[VAR])[:2], 'reply')[0] / sp.P0 - base[d['spot']][hero])
            print(f"  {d['spot']} alone: {[round(x, 1) for x in res[d['spot']]]} {time.time() - t0:.0f} s", file=log, flush=True)
        json.dump(res, open(os.path.join(STORE, f'turn-alone-{VAR}.json'), 'w'))
    else:
        hero, kindj = job.split(':'); hero = int(hero); draw = VARIANTS[kindj]; S_tr = [Turn(d) for d in tr]; print(f'  spots ready {time.time() - t0:.0f} s', file=log, flush=True); tab = solve(S_tr, hero, rounds, draw, log)
        raw_tr = [100 * sp.walk(1 - hero, *lay(sp, hero, tab, draw)[:2], 'reply')[0] / sp.P0 for sp in S_tr]; del S_tr; raw_te = {}
        for d in te: sp = Turn(d); raw_te[d['spot']] = 100 * sp.walk(1 - hero, *lay(sp, hero, tab, draw)[:2], 'reply')[0] / sp.P0
        json.dump(dict(job=job, rounds=rounds, solved_on=float(np.mean(raw_tr)), scored=raw_te, tables={k: v.tolist() for k, v in tab.items()}), open(os.path.join(STORE, f'turn-{hero}-{kindj}.json'), 'w')); print(f'  done {time.time() - t0:.0f} s', file=log, flush=True)
