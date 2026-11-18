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
EDGES = list(np.linspace(.05, .95, 19)) if os.environ.get('BANDS') == '20' else [.15, .35, .55, .75, .9]; NB = len(EDGES) + 1      # the bands of a hand's place in the range: six, or twenty of five points each (BANDS=20)
DEPTHS = [0.75, 1.5, 3, 6] if os.environ.get('DEPTH') == 'fine' else [1.5, 4]; ND = len(DEPTHS) + 1      # the bands of the stacks behind, in pots
BETF = 0.75                                    # the one bet size, in pots (the divergent tests change it)
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
def has_draw(hand, board, kinds=False):
    """A draw: a flush draw or eight or more cards to a straight. With `kinds`: 0 none, 1 a gutshot, 2 a flush draw or eight or more cards."""
    cs = [hand[:2], hand[2:]] + board
    if any(sum(c[1] == s for c in cs) == 4 and any(c[1] == s for c in cs[:2]) for s in 'shdc'): return 2 if kinds else 1
    ranks = [RANKS.index(c[0]) for c in cs]
    def top(r):
        have = set(r) | ({-1} if 12 in r else set()); return next((t for t in range(12, 2, -1) if all(t - k in have for k in range(5))), -1)
    n = sum(1 for r in range(13) if top(ranks + [r]) > top(ranks)); return (2 if n >= 2 else 1 if n == 1 else 0) if kinds else int(n >= 2)
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
            if inv[p] < S: n = list(inv); n[p] = min(S, round(base + BETF * P, 2)); acts.append(('bet', decide(o, n, 1, True)))
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
        self.draw = [np.array([has_draw(h, self.board) for h in self.hands[p]]) for p in (0, 1)]; self.draw3 = [np.array([has_draw(h, self.board, True) for h in self.hands[p]]) for p in (0, 1)]
        self.cat_r = [s0 // 15 ** 5, s1 // 15 ** 5]; self.cat_t = [np.array([score7(list(two(h)) + self.board) // 15 ** 5 for h in self.hands[p]]) for p in (0, 1)]          # made hand: 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6+ full house or better
    def cells(self, hero, draw):
        """Each hand's cell on the turn, and on each river card."""
        def place_of(e, w):
            o = np.argsort(e, kind='stable'); pl = np.zeros(len(e)); ww = w / max(w.sum(), 1e-12); pl[o] = np.cumsum(ww[o]) - ww[o] / 2; return np.digitize(pl, EDGES)
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
    return np.digitize(pl, EDGES), np.digitize((Wt * (E < .3)).sum(1) / tot[:, 0], [.3, .5])
def lay(sp, hero, tab, opts):
    """The tables laid over a spot. opts = (true, spr): `true` reads the place and the weak share from the range the player
    holds at each decision, as its own tables have shaped it (else from its range as the turn starts); `spr` adds the
    stacks behind in pots at the decision (under 1.5, 1.5 to 4, over 4)."""
    true, spr, drw, vs = opts[:4]; nut = len(opts) > 4 and opts[4]; fdraw = len(opts) > 5 and opts[5]; top = len(opts) > 6 and opts[6]; hs2 = len(opts) > 7 and opts[7]; vol = opts[8] if len(opts) > 8 else None; st, sr, plan = {}, {}, []; w = sp.w[hero]; C = len(sp.cards); opp = 1 - hero
    if nut and not hasattr(sp, '_hs'):            # his share of strong hands (80%+ against my range) as the turn starts: on the turn, and on each river card
        wo = sp.w[opp]; wc = wo[None, :] * sp.A[opp]; sp._hs = [None, None]
        for q in (0, 1): wq = sp.w[q]; wcq = wq[None, :] * sp.A[q]; sp._hs[q] = (float(wq[sp.eqt[q] >= .8].sum() / wq.sum()), (wcq * (sp.eqr[q] >= .8)).sum(1) / np.maximum(wcq.sum(1), 1e-12))
    if vs: et, er = eq_store(sp); ot, orv = et[opp], er[opp]
    if (hs2 or vol) and not hasattr(sp, '_hs2'):   # over the river cards: the mean of the hand's strength squared (E[HS2]), and how uneven its strength is across them (three bands)
        sp._hs2 = [None, None]; sp._vol = [None, None]
        for q in (0, 1): A_ = sp.A[q]; e_ = sp.eqr[q]; n_ = np.maximum(A_.sum(0), 1); m1 = (e_ * A_).sum(0) / n_; m2 = (e_ ** 2 * A_).sum(0) / n_; sp._hs2[q] = m2; sp._vol[q] = np.digitize(np.sqrt(np.maximum(m2 - m1 ** 2, 0)), [.12, .19])
    if top and not hasattr(sp, '_top'):            # each hand's equity against the strongest third of his range as the turn starts (on the turn, and on each river card), in three bands
        sp._top = [None, None]
        for q in (0, 1):
            o_ = 1 - q; wo_ = sp.w[o_].astype(np.float32); order = np.argsort(-sp.eqt[o_], kind='stable'); cum = np.cumsum(wo_[order]) / wo_.sum(); mt = np.zeros(len(wo_), np.float32); mt[order[cum <= 1 / 3 + 1e-9]] = 1; ht = (wo_ * mt)[None, :] * sp.A[o_]
            wr = wo_[None, :] * sp.A[o_]; er_ = np.where(sp.A[o_] > 0, sp.eqr[o_], -1); od = np.argsort(-er_, axis=1, kind='stable'); cw = np.cumsum(np.take_along_axis(wr, od, 1), 1) / np.maximum(wr.sum(1, keepdims=True), 1e-12); mk = np.zeros_like(wr); np.put_along_axis(mk, od, (cw <= 1 / 3 + 1e-9).astype(np.float32), 1); hr = wr * mk
            if q == 0: f = lambda X, r, sub: np.einsum('cij,cj->' + sub, X, r)
            else: f = lambda X, r, sub: np.einsum('cij,ci->' + sub.replace('i', 'j'), X, r)
            win, tie = (sp.W, sp.T) if q == 0 else (sp.L, sp.T); et_ = (f(win, ht, 'i') + 0.5 * f(tie, ht, 'i')) / np.maximum(f(sp.V, ht, 'i'), 1e-9); err = (f(win, hr, 'ci') + 0.5 * f(tie, hr, 'ci')) / np.maximum(f(sp.V, hr, 'ci'), 1e-9)
            sp._top[q] = (np.digitize(et_, [.15, .4]), np.digitize(err, [.15, .4]))
    if vol in ('sd', 'sd+top') and not hasattr(sp, '_sd'):   # showdown value now (the share of his starting range the hand beats with no river dealt) and draw equity (its equity less that), in three bands
        sp._sd = [None, None]; two = lambda h: (h[:2], h[2:]); sc = [np.array([score7(list(two(h)) + list(sp.board)) for h in sp.hands[q]]) for q in (0, 1)]; ok = np.array([[not (set(two(a)) & set(two(b))) for b in sp.hands[1]] for a in sp.hands[0]], np.float32); cmp = np.sign(sc[0][:, None] - sc[1][None, :])
        for q in (0, 1):
            g = (((cmp > 0) if q == 0 else (cmp < 0)) + 0.5 * (cmp == 0)) * ok; now = (g @ sp.w[1] / np.maximum(ok @ sp.w[1], 1e-12)) if q == 0 else (sp.w[0] @ g / np.maximum(sp.w[0] @ ok, 1e-12)); sp._sd[q] = (now, np.digitize(sp.eqt[q] - now, SDB))
    if not hasattr(sp, '_frozen'): sp._frozen = {}
    if hero not in sp._frozen: sp._frozen[hero] = sp.cells(hero, False)
    ct0, cr0 = sp._frozen[hero]
    def depth(inv): return int(np.digitize((sp.S - max(inv)) / (sp.P0 + inv[0] + inv[1]), DEPTHS))
    def strat(kd, cells, na):
        t = tab[kd][cells]; s = np.zeros(cells.shape + (na,), np.float32); s[..., :min(na, t.shape[-1])] = t[..., :na]
        if na < t.shape[-1]: s[..., na - 1] += t[..., na:].sum(-1)
        return s
    def versus_r(his):                             # each hand's equity on each river card against his reach there, (C, n)
        if hero == 0: win = np.einsum('cij,cj->ci', sp.W, his) + 0.5 * np.einsum('cij,cj->ci', sp.T, his); den = np.einsum('cij,cj->ci', sp.V, his)
        else: win = np.einsum('cij,ci->cj', sp.L, his) + 0.5 * np.einsum('cij,ci->cj', sp.T, his); den = np.einsum('cij,ci->cj', sp.V, his)
        return np.where(den > 1e-9, win / np.maximum(den, 1e-9), sp.eqr[hero])
    def versus_t(his):                             # each hand's equity on the turn against his reach, every river card dealt
        hc = his[None, :] * sp.A[opp]
        if hero == 0: win = np.einsum('cij,cj->i', sp.W, hc) + 0.5 * np.einsum('cij,cj->i', sp.T, hc); den = np.einsum('cij,cj->i', sp.V, hc)
        else: win = np.einsum('cij,ci->j', sp.L, hc) + 0.5 * np.einsum('cij,ci->j', sp.T, hc); den = np.einsum('cij,ci->j', sp.V, hc)
        return np.where(den > 1e-9, win / np.maximum(den, 1e-9), sp.eqt[hero])
    def river(key, k, mine, his):                  # mine: my own reach so far, (C, n); his: the other's reach as a sound opponent plays, (C, n_opp)
        node = sp.rv[key][k]
        if not isinstance(node[0], int): return
        p, acts, inv = node
        if p != hero:
            for a, (_, c) in enumerate(acts): river(key, c, mine, his * orv[(key, k)][..., a] if vs else his)
            return
        E = versus_r(his) if vs else sp.eqr[hero]
        if true or vs or nut or top: Wt = w[None, :] * (mine if true else 1) * sp.A[hero]; pl, wk = place_rows(E, Wt); cells = pl * 3 + wk[:, None]
        else: cells = cr0
        if top: cells = pl * 3 + sp._top[hero][1]
        if nut and inv[opp] <= inv[hero]: cells = pl * 3 + np.digitize((Wt * (E >= .8)).sum(1) / np.maximum(Wt.sum(1), 1e-12) - sp._hs[opp][1], [-.05, .05])[:, None]      # first to act: who has more strong hands, in place of the weak share
        if spr: cells = cells * ND + depth(inv)
        kd = kind(node, hero, 'R'); na = len(acts); x = strat(kd, cells, na); sr[(key, k)] = x; plan.append(('r', (key, k), kd, cells, na))
        for a, (_, c) in enumerate(acts): river(key, c, mine * x[..., a], his)
    def turn(k, mine, his):
        node = sp.tn[k]
        if node[0] == 'fold': return
        if node[0] == 'end':
            if k in sp.rv: river(k, 0, np.repeat(mine[None, :], C, 0), (his[None, :] * sp.A[opp]) if vs else None)
            return
        p, acts, inv = node
        if p != hero:
            for a, (_, c) in enumerate(acts): turn(c, mine, his * ot[k][:, a] if vs else his)
            return
        E = versus_t(his) if vs else sp.eqt[hero]
        if true or vs or nut or top: Wt = (w * (mine if true else 1))[None, :]; pl, wk = place_rows((sp._hs2[hero] if hs2 else sp._sd[hero][0] if vol in ('sd', 'sd+top') else E)[None, :], Wt); cells = pl[0] * 3 + wk[0]
        else: cells = ct0
        if top: cells = pl[0] * 3 + sp._top[hero][0]
        if vol == 'replace': cells = pl[0] * 3 + sp._vol[hero]
        if vol == 'add': cells = cells * 3 + sp._vol[hero]
        if vol == 'sd': cells = pl[0] * 3 + sp._sd[hero][1]
        if vol == 'sd+top': cells = cells * 3 + sp._sd[hero][1]
        if nut and inv[opp] <= inv[hero]: cells = pl[0] * 3 + int(np.digitize(float((Wt[0] * (E >= .8)).sum() / max(Wt[0].sum(), 1e-12)) - sp._hs[opp][0], [-.05, .05]))
        if spr: cells = cells * ND + depth(inv)
        if drw: cells = cells * 3 + sp.draw3[hero]
        kd = kind(node, hero, 'T')
        if fdraw and kd == 'T facing a bet': cells = cells * 2 + (sp.draw3[hero] == 2)          # facing a turn bet only: a flush draw or eight or more cards to a straight, or not
        kd = kind(node, hero, 'T'); na = len(acts); x = strat(kd, cells, na); st[k] = x; plan.append(('t', k, kd, cells, na))
        for a, (_, c) in enumerate(acts): turn(c, mine * x[:, a], his)
    turn(0, np.ones(len(w), np.float32), sp.w[opp].astype(np.float32)); return st, sr, plan
# true: my own range as my tables shape it; spr: stacks behind; draw: on the turn tables, in three kinds; vs: equity against the range a sound opponent holds at the decision
VARIANTS = {'frozen': (False, False, False, False), 'true': (True, False, False, False), 'spr': (False, True, False, False), 'true+spr': (True, True, False, False), 'true+spr+draw': (True, True, True, False),
            'true+spr+vs': (True, True, False, True), 'true+vs': (True, False, False, True), 'true+spr+draw+vs': (True, True, True, True),
            # nut: first to act, who has more strong hands in place of the weak share; fdraw: a strong draw or not, on the turn's facing-a-bet table only
            'true+spr+nut': (True, True, False, False, True, False), 'true+spr+fdraw': (True, True, False, False, False, True), 'true+spr+nut+fdraw': (True, True, False, False, True, True), 'true+spr+nut+fdraw+vs': (True, True, False, True, True, True),
            # top: in place of the weak share, the hand's equity against the strongest third of his range (three bands), on both streets
            'true+spr+top': (True, True, False, False, False, False, True), 'true+spr+top+fdraw': (True, True, False, False, False, True, True),
            # hs2: the turn's places ranked by E[HS2] in place of equity; vol: how uneven the hand's strength is across river cards, in place of the turn's column or beside it
            'true+spr+top+hs2': (True, True, False, False, False, False, True, True, None), 'true+spr+vol': (True, True, False, False, False, False, True, False, 'replace'), 'true+spr+top+vol': (True, True, False, False, False, False, True, False, 'add'),
            # sd: the turn's places ranked by showdown value now, and the hand's draw equity (three bands) in place of the turn's column (sd) or beside it (sd+top)
            'true+spr+sd': (True, True, False, False, False, False, True, False, 'sd'), 'true+spr+sd+top': (True, True, False, False, False, False, True, False, 'sd+top')}
SDB = [float(x) for x in os.environ.get('SDB', '-0.04,0.06').split(',')]
def eq_store(sp):
    """The unrestricted solve's strategies for a spot (both players), solved once and kept on disk: the 'sound opponent' whose ranges the tables may assume."""
    if hasattr(sp, '_eq'): return sp._eq
    f = os.path.join(STORE, 'eq', re.sub(r'[^A-Za-z0-9_-]', '_', sp.name) + f'-{BETF}-{sp.S:g}.npz')
    if os.path.exists(f):
        z = np.load(f); nt, nr = [dict(), dict()], [dict(), dict()]
        for name in z.files:
            typ, p_, rest = name.split('|', 2)
            if typ == 't': nt[int(p_)][int(rest)] = z[name]
            else: a_, b_ = rest.split('|'); nr[int(p_)][(int(a_), int(b_))] = z[name]
    else:
        os.makedirs(os.path.dirname(f), exist_ok=True); vals, nt, nr = equilibrium(sp, int(os.environ.get('EQROUNDS', 400)), True); np.savez(f, **{f't|{p_}|{k}': v for p_ in (0, 1) for k, v in nt[p_].items()}, **{f'r|{p_}|{k[0]}|{k[1]}': v for p_ in (0, 1) for k, v in nr[p_].items()})
    sp._eq = (nt, nr); return sp._eq

def solve(spots, hero, rounds, opts, log=None):
    draw = opts; nc = {kd: NB * 3 * (ND if opts[1] else 1) * (3 if opts[2] and kd[0] == 'T' else 1) * (2 if len(opts) > 5 and opts[5] and kd == 'T facing a bet' else 1) * (3 if len(opts) > 8 and opts[8] in ('add', 'sd+top') and kd[0] == 'T' else 1) for kd in KINDS}; reg = {kd: np.zeros((nc[kd], a)) for kd, a in KINDS.items()}; avg = {kd: np.zeros((nc[kd], a)) for kd, a in KINDS.items()}; cur = {kd: np.full((nc[kd], a), 1 / a) for kd, a in KINDS.items()}; best = (1e9, None); t0 = time.time()
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
def equilibrium(sp, rounds, full=False):
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
    vals = [100 * sp.walk(1 - p, nt[p], nr[p], 'reply')[0] / sp.P0 for p in (0, 1)]          # what the free player gets against each seat's equilibrium play
    return (vals, nt, nr) if full else vals
def profile(sp, hero, nt, nr):
    """How the unrestricted solve plays each of our cells: for each table, cell and kind of hand (the turn: draw kind and made hand; the river: made hand), the weight there and the share of each answer."""
    out = {}; w = sp.w[hero]; C = len(sp.cards)
    def put(kd, cell, grp, wt, probs):
        for c_, g_, w_, p_ in zip(cell.reshape(-1), grp.reshape(-1), wt.reshape(-1), probs.reshape(-1, probs.shape[-1])):
            if w_ > 0: key = f'{kd}|{int(c_)}|{int(g_)}'; cur = out.setdefault(key, [0.0] * (1 + probs.shape[-1])); cur[0] += float(w_); [cur.__setitem__(1 + i, cur[1 + i] + float(w_ * x)) for i, x in enumerate(p_)]
    def depth(inv): return int(np.digitize((sp.S - max(inv)) / (sp.P0 + inv[0] + inv[1]), DEPTHS))
    def river(key, k, mine):
        node = sp.rv[key][k]
        if not isinstance(node[0], int): return
        p, acts, inv = node
        if p != hero: [river(key, c, mine) for _, c in acts]; return
        x = nr[hero][(key, k)]; wt = w[None, :] * mine * sp.A[hero] / C; pl, wk = place_rows(sp.eqr[hero], w[None, :] * mine * sp.A[hero]); cells = (pl * 3 + wk[:, None]) * 3 + depth(inv); put(kind(node, hero, 'R'), cells, np.minimum(sp.cat_r[hero], 6), wt, x)
        for a, (_, c) in enumerate(acts): river(key, c, mine * x[..., a])
    def turn(k, mine):
        node = sp.tn[k]
        if node[0] == 'fold': return
        if node[0] == 'end':
            if k in sp.rv: river(k, 0, np.repeat(mine[None, :], C, 0))
            return
        p, acts, inv = node
        if p != hero: [turn(c, mine) for _, c in acts]; return
        x = nt[hero][k]; pl, wk = place_rows(sp.eqt[hero][None, :], (w * mine)[None, :]); cells = (pl[0] * 3 + wk[0]) * 3 + depth(inv); put(kind(node, hero, 'T'), cells, sp.draw3[hero] * 10 + np.minimum(sp.cat_t[hero], 6), w * mine, x)
        for a, (_, c) in enumerate(acts): turn(c, mine * x[:, a])
    turn(0, np.ones(len(w), np.float32)); return out
if __name__ == '__main__':
    job = sys.argv[1]; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 300; n_tr = int(sys.argv[3]) if len(sys.argv) > 3 else 12; n_te = int(sys.argv[4]) if len(sys.argv) > 4 else 8; rows = []
    for text in open(os.path.join(STORE, 'turn-real.jsonl')):
        if '"line":"r|"' not in text: continue
        d = json.loads(text)
        if d['seat'] == 0 and 60 <= len(d['hands']) <= 190 and 60 <= len(d['vr']) <= 190 and d['behind'] / d['pot'] >= 1: d['flop'] = re.search(r'f\d+|b\d+', d['spot']).group(0); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows); t0 = time.time(); log = sys.stderr
    te = [x for x in rows if x['flop'] in held][:n_te]; tr = [x for x in rows if x['flop'] not in held][:n_tr]
    if job.startswith('eqcache'):                    # eqcache:<part>/<parts>: the unrestricted solve of every spot, kept
        i, n = [int(x) for x in job.split(':')[1].split('/')]
        for j, d in enumerate(tr + te):
            if j % n == i: eq_store(Turn(d)); print(f"  {d['spot']} {time.time() - t0:.0f} s", file=log, flush=True)
    elif job.startswith('ablate'):                   # where the best reply makes its gain: our tables on one street, the unrestricted solve's play on the other
        var = job.split(':')[1]; OPT = VARIANTS[var]; base = json.load(open(os.path.join(STORE, 'turn-base.json'))); res = {}
        tabs = [{k: np.array(v) for k, v in json.load(open(os.path.join(STORE, f'turn-{h}-{var}.json')))['tables'].items()} for h in (0, 1)]
        for d in te:
            sp = Turn(d); nt, nr = eq_store(sp); row = {}
            for h in (0, 1):
                st, sr, _ = lay(sp, h, tabs[h], OPT); g = lambda a, b: 100 * sp.walk(1 - h, a, b, 'reply')[0] / sp.P0 - base[d['spot']][h]
                row[h] = dict(tables=g(st, sr), turn_tables_only=g(st, nr[h]), river_tables_only=g(nt[h], sr), neither=g(nt[h], nr[h]))
                for kd in KINDS:                       # one table at a time, the unrestricted play everywhere else
                    a = {k: (st[k] if kind(sp.tn[k], h, 'T') == kd else v) for k, v in nt[h].items()}; b = {k: (sr[k] if kind(sp.rv[k[0]][k[1]], h, 'R') == kd else v) for k, v in nr[h].items()}; row[h][kd] = g(a, b)
            res[d['spot']] = row; print(f"  {d['spot']} {[round(row[h]['tables'], 1) for h in (0, 1)]} {time.time() - t0:.0f} s", file=log, flush=True)
        json.dump(res, open(os.path.join(STORE, f'turn-ablate-{var}.json'), 'w'))
    elif job.startswith('floor'):                    # one deep spot solved alone for many rounds: does the figure keep falling, and does a version of the cells lower it? floor:<variant>
        order = sorted(te, key=lambda d: d['behind'] / d['pot']); d0 = order[len(order) // 2]; var = job.split(':')[1]; OPT = VARIANTS[var]; sp = Turn(d0); vals = equilibrium(sp, 600); out = {}
        for h in (0, 1):
            best = []; tab = None
            for stage in (300, 600, 1200, 2400):           # each stage a fresh solve of that many rounds
                if stage > rounds: break
                tab = solve([sp], h, stage, OPT); best.append((stage, 100 * sp.walk(1 - h, *lay(sp, h, tab, OPT)[:2], 'reply')[0] / sp.P0 - vals[h])); print(f"  {var} seat {h}: {[(a_, round(b_, 1)) for a_, b_ in best]} | {time.time() - t0:.0f} s", file=log, flush=True)
            out[h] = best
        json.dump(out, open(os.path.join(STORE, f"turn-floor-{var}{'-b20' if NB == 20 else ''}.json"), 'w'))
    elif job.startswith('poolcheck'):                # is sharing a table costly even across near-identical spots? poolcheck:<cards|depths|flops>
        import copy
        what = job.split(':')[1]; order = sorted(te, key=lambda d: d['behind'] / d['pot']); d0 = order[len(order) // 2]; OPT = VARIANTS[os.environ.get('VAR', 'true+spr')]; flop = d0['board'].split()[:3]; ds = []
        if what == 'cards':
            for card in [c for c in DECK if c not in flop][::9][:6]:
                d = copy.deepcopy(d0); d['board'] = ' '.join(flop + [card]); d['hands'] = [h for h in d['hands'] if card not in (h['h'][:2], h['h'][2:])]; d['vr'] = [v for v in d['vr'] if card not in (v[0][:2], v[0][2:])]; d['spot'] += '|' + card; ds.append(d)
        elif what == 'depths':
            for x in (0.75, 1.5, 3, 6):
                d = copy.deepcopy(d0); d['behind'] = round(x * d['pot'], 2); d['spot'] += f'|{x}'; ds.append(d)
        elif what == 'same': ds = [copy.deepcopy(d0) for _ in range(3)]
        else: ds = [d for d in rows if d['pre'] == d0['pre'] and abs(d['behind'] / d['pot'] - d0['behind'] / d0['pot']) < 0.3][:6]
        sps = [Turn(d) for d in ds]; vals = [equilibrium(sp, 500) for sp in sps]; res = dict(what=what, base=d0['spot'], spots=[d['spot'] + ' ' + d['board'] for d in ds], alone=[], pooled=[])
        for h in (0, 1):
            al = [100 * sp.walk(1 - h, *lay(sp, h, solve([sp], h, rounds, OPT), OPT)[:2], 'reply')[0] / sp.P0 - v[h] for sp, v in zip(sps, vals)]; tab = solve(sps, h, rounds, OPT); po = [100 * sp.walk(1 - h, *lay(sp, h, tab, OPT)[:2], 'reply')[0] / sp.P0 - v[h] for sp, v in zip(sps, vals)]
            res['alone'].append(al); res['pooled'].append(po); print(f"  {what} seat {h}: alone {np.mean(al):.1f} {[round(x, 1) for x in al]} | one shared table {np.mean(po):.1f} {[round(x, 1) for x in po]} | {time.time() - t0:.0f} s", file=log, flush=True)
        json.dump(res, open(os.path.join(STORE, f"turn-poolcheck-{what}{os.environ.get('TAG', '')}.json"), 'w'))
    elif job.startswith('diverge'):                    # one spot, one thing changed at a time: stack depth, the turn card, the bet size, the shape of a range
        import copy
        order = sorted(te, key=lambda d: d['behind'] / d['pot']); d0 = [order[1], order[len(order) // 2], order[-2]][int(job.split(':')[1])]; shared = [json.load(open(os.path.join(STORE, f'turn-{h}-true+spr.json')))['tables'] for h in (0, 1)]; OPT = VARIANTS['true+spr']; res = []
        def measure(d, factor, level):
            sp = Turn(d); vals = equilibrium(sp, 500); row = dict(base=d0['spot'], board=d['board'], factor=factor, level=level, spr=d['behind'] / d['pot'], alone=[], shared=[])
            for h in (0, 1):
                tab = solve([sp], h, rounds, OPT); row['alone'].append(100 * sp.walk(1 - h, *lay(sp, h, tab, OPT)[:2], 'reply')[0] / sp.P0 - vals[h]); row['shared'].append(100 * sp.walk(1 - h, *lay(sp, h, {k: np.array(v) for k, v in shared[h].items()}, OPT)[:2], 'reply')[0] / sp.P0 - vals[h])
            res.append(row); print(f"  {factor}: {level} | alone {[round(x, 1) for x in row['alone']]} shared {[round(x, 1) for x in row['shared']]} | {time.time() - t0:.0f} s", file=log, flush=True); json.dump(res, open(os.path.join(STORE, f"turn-diverge-{job.split(':')[1]}.json"), 'w'))
        measure(d0, 'as it is', f"{d0['pre']} {d0['board']}, {d0['behind'] / d0['pot']:.1f} pots behind")
        for x in (0.75, 1.5, 3, 6, 12):              # stack depth, with the pot, the board and the ranges as they are
            d = copy.deepcopy(d0); d['behind'] = round(x * d['pot'], 2); measure(d, 'stacks behind, in pots', x)
        for bf in (0.33, 1.5):                       # the bet size
            globals()['BETF'] = bf; measure(d0, 'bet size, in pots', bf)
        globals()['BETF'] = 0.75
        flop = d0['board'].split()[:3]; fr = sorted((RANKS.index(c[0]) for c in flop), reverse=True); fsu = [c[1] for c in flop]; two_tone = next((x for x in 'shdc' if fsu.count(x) == 2), None); off = next(x for x in 'shdc' if fsu.count(x) == 0) if any(fsu.count(x) == 0 for x in 'shdc') else fsu[0]
        cand = {}
        if two_tone: cand['completes the flush'] = next((RANKS[r] + two_tone for r in range(12) if RANKS[r] + two_tone not in flop and r not in fr), None)
        cand['pairs the top card'] = next((RANKS[fr[0]] + x for x in 'shdc' if RANKS[fr[0]] + x not in flop and x != two_tone), None)
        cand['pairs the bottom card'] = next((RANKS[fr[-1]] + x for x in 'shdc' if RANKS[fr[-1]] + x not in flop and x != two_tone), None)
        cand['an overcard'] = next((RANKS[r] + off for r in range(12, fr[0], -1)), None)
        cand['a low blank'] = next((RANKS[r] + off for r in range(0, 13) if r not in fr and all(abs(r - y) > 3 for y in fr)), None) or next((RANKS[r] + off for r in range(0, 13) if r not in fr), None)
        cand['a connecting card'] = next((RANKS[r] + off for r in range(12, -1, -1) if r not in fr and sum(1 for y in fr if abs(r - y) <= 2) >= 2), None)
        for name, card in cand.items():              # the turn card, with the flop and the ranges that reached the turn as they are
            if not card or card in flop: continue
            d = copy.deepcopy(d0); d['board'] = ' '.join(flop + [card]); d['hands'] = [h for h in d['hands'] if card not in (h['h'][:2], h['h'][2:])]; d['vr'] = [v for v in d['vr'] if card not in (v[0][:2], v[0][2:])]; measure(d, 'the turn card', f'{name} ({card})')
        sp0 = Turn(d0)
        for name, seat, f in (('out of position has no strong hands (80%+ cut to a fifth)', 0, lambda e: np.where(e >= .8, .2, 1)), ('out of position has few weak hands (under 30% cut to a fifth)', 0, lambda e: np.where(e < .3, .2, 1)),
                              ('in position has no strong hands', 1, lambda e: np.where(e >= .8, .2, 1)), ('in position has few weak hands', 1, lambda e: np.where(e < .3, .2, 1))):
            d = copy.deepcopy(d0); m = f(sp0.eqt[seat]); live = [h for h in (d['hands'] if seat == 0 else d['vr']) if (h['w'] if seat == 0 else h[1]) > 0]
            if seat == 0: [h.__setitem__('w', h['w'] * float(m[i])) for i, h in enumerate(live)]; d['hands'] = live
            else: d['vr'] = [[v[0], v[1] * float(m[i]), v[2]] for i, v in enumerate(live)]
            measure(d, 'the shape of a range', name)
    elif job == 'profile':                             # how the unrestricted solve plays our cells, on the spots solved on and scored on
        res = {}
        for d in (tr + te)[: int(os.environ.get('PROFILE', 30))]:
            sp = Turn(d); vals, nt, nr = equilibrium(sp, rounds, True); res[d['spot']] = dict(board=d['board'], pot=d['action'], spr=d['behind'] / d['pot'], cells=[profile(sp, h, nt, nr) for h in (0, 1)]); print(f"  {d['spot']} {time.time() - t0:.0f} s", file=log, flush=True)
            json.dump(res, open(os.path.join(STORE, 'turn-profile.json'), 'w'))
    elif job == 'base':
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
        json.dump(dict(job=job, rounds=rounds, solved_on=float(np.mean(raw_tr)), scored=raw_te, tables={k: v.tolist() for k, v in tab.items()}), open(os.path.join(STORE, f"turn-{hero}-{kindj}{'-b20' if NB == 20 else ''}{'-d5' if ND == 5 else ''}{os.environ.get('TAG', '')}.json"), 'w')); print(f'  done {time.time() - t0:.0f} s', file=log, flush=True)
