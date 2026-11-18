# A restricted solve from the flop: one player plays the flop, the turn and the river by shared tables; the other is free
# and plays the best reply over all three streets. As restricted_turn.py, one street earlier.
# Kept simple: one bet size a street (a third of the pot on the flop, three quarters on the turn and river) and one raise
# (to three times). Every runout is too many, so each flop is solved on a fixed sample of K turn cards, each with M river
# cards: the figures are for that sampled game.
# Tables (three a street: first to act, facing a bet, facing a raise): the hand's place in the range the player holds at
# the decision (six bands) by its equity against the strongest third of the other's range as the flop starts (three
# bands) by the stacks behind in pots (three bands).
# Flops: poker-huerosolver's full hands (store.mjs fullhand, the flop roots), solved on some, scored on others.
#   STORE=<dir> python3 research/butterfly/restricted_flop.py <job> [rounds] [flops to solve on] [flops to score on]
#     job: check (one flop, both players free: does it settle?) | base (the game's value on the scoring flops) | <seat 0/1> | alone
import os, sys, json, re, time, warnings, glob, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']
_src = open(os.path.join(HERE, 'restricted_turn.py')).read(); exec(_src[_src.index('RANKS = '):_src.index('def street(')].replace("HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']; ", ''))     # RANKS, DECK, score7, has_draw, EDGES
exec(_src[_src.index('def place_rows('):_src.index('def lay(')])
_an = open(os.path.join(HERE, 'analyse.py')).read(); exec(_an[_an.index('def cards(text)'):_an.index('def mono(')])       # cards, straight_top, row_of: the eight hand rows of the chart
RANKS = '23456789TJQKA'; DECK = [r + s for r in RANKS for s in 'cdhs']; K = int(os.environ.get('K', 5)); M = int(os.environ.get('M', 6)); BETS = [[float(x) for x in st.split(',')] for st in os.environ.get('SIZES', '0.33|0.75|0.75').split('|')]; RAISES = int(os.environ.get('RAISES', 1)); DEPTHS = [1.5, 4]; ND = 3; MINW = float(os.environ.get('MINW', 0.15))
def street(P, base, S, sizes):
    """One street's tree: a bet of each size in `sizes` (shares of the pot; sizes the stack cuts to the same amount are one bet), then up to RAISES raises, each to three times. A decision is (player, actions, invested, (bets so far, the size faced))."""
    nodes = []
    def add(n): nodes.append(n); return len(nodes) - 1
    def decide(p, inv, bets, checked, size):
        k = add(None); o = 1 - p; acts = []
        if inv[o] > inv[p]:
            acts.append(('fold', add(('fold', p, tuple(inv))))); c = list(inv); c[p] = inv[o]; acts.append(('call', add(('end', tuple(c)))))
            if bets < 1 + RAISES and inv[o] < S: n = list(inv); n[p] = min(S, round(base + 3 * (inv[o] - base), 2)); acts.append(('raise', decide(o, n, bets + 1, True, size)))
        else:
            acts.append(('check', add(('end', tuple(inv))) if checked else decide(o, inv, bets, True, size)))
            for i, to in enumerate(sorted({min(S, round(base + b * P, 2)) for b in sizes})):
                if inv[p] < S: n = list(inv); n[p] = to; acts.append((f'bet{i}', decide(o, n, 1, True, i)))
        nodes[k] = (p, acts, tuple(inv), (bets, size)); return k
    decide(0, [base, base], 0, False, 0); return nodes
EXP = [lambda x: x, lambda x: x[None], lambda x: x[None, None]]            # a per-hand array against a street's shape
class Flop:
    def __init__(self, d, seed=0):
        self.name = d['spot']; self.board = d['board'].split(); self.P0 = d['pot']; self.S = d['behind']; two = lambda h: (h[:2], h[2:])
        cut = lambda xs: [x for x in xs if x[1] >= MINW * max(y[1] for y in xs)]; hs = cut([(h['h'], h['w']) for h in d['hands']]); vs = cut([(x[0], x[1]) for x in d['vr']])
        self.hands = [[h for h, _ in hs], [h for h, _ in vs]]; self.w = [np.array([x for _, x in hs], np.float32), np.array([x for _, x in vs], np.float32)]; n0, n1 = len(hs), len(vs)
        rng = np.random.default_rng(zlib.crc32(self.name.encode()) + seed); free = [c for c in DECK if c not in self.board]; self.tc = list(rng.choice(free, K, replace=False)); self.rc = [list(rng.choice([c for c in free if c != t], M, replace=False)) for t in self.tc]
        V0 = np.array([[not (set(two(a)) & set(two(b))) for b in self.hands[1]] for a in self.hands[0]], np.float32); self.V0 = V0
        self.At = [np.array([[t not in two(h) for h in self.hands[p]] for t in self.tc], np.float32) for p in (0, 1)]                                       # (K, n)
        self.Ar = [np.array([[[t not in two(h) and r not in two(h) for h in self.hands[p]] for r in self.rc[k]] for k, t in enumerate(self.tc)], np.float32) for p in (0, 1)]     # (K, M, n)
        sc = [np.array([[[score7(list(two(h)) + self.board + [t, r]) for h in self.hands[p]] for r in self.rc[k]] for k, t in enumerate(self.tc)]) for p in (0, 1)]
        Vr = V0[None, None] * self.Ar[0][..., :, None] * self.Ar[1][..., None, :]; cmp = np.sign(sc[0][..., :, None] - sc[1][..., None, :]); self.W = ((cmp > 0) * Vr).astype(np.float32); self.T = ((cmp == 0) * Vr).astype(np.float32); self.L = ((cmp < 0) * Vr).astype(np.float32); self.Vr = Vr.astype(np.float32)
        self.Vt = (V0[None] * self.At[0][:, :, None] * self.At[1][:, None, :]).astype(np.float32); self.Z = float(self.w[0] @ V0 @ self.w[1]); self.A = [[np.ones(len(self.w[p]), np.float32), self.At[p], self.Ar[p]] for p in (0, 1)]
        self.sdraw = [[np.array([has_draw(h, self.board, True) == 2 for h in self.hands[p]], int), np.array([[has_draw(h, self.board + [t], True) == 2 for h in self.hands[p]] for t in self.tc], int), None] for p in (0, 1)]       # a flush draw or eight or more cards to a straight: on the flop, on each turn card
        # the trees: the flop's, a turn for each way the flop can end, a river for each way that turn can end
        self.tree = {(): street(self.P0, 0.0, self.S, BETS[0])}
        for kf, n in enumerate(self.tree[()]):
            if n[0] == 'end' and n[1][0] < self.S:
                self.tree[(kf,)] = street(self.P0 + 2 * n[1][0], n[1][0], self.S, BETS[1])
                for kt, n2 in enumerate(self.tree[(kf,)]):
                    if n2[0] == 'end' and n2[1][0] < self.S: self.tree[(kf, kt)] = street(self.P0 + 2 * n2[1][0], n2[1][0], self.S, BETS[2])
        # equities against the other's range as the flop starts, at each street's shape; and against the strongest third of it
        self.eq = [None, None]; self.top = [None, None]
        for p in (0, 1):
            o = 1 - p; wo = self.w[o]; win, den = self.rate(p, wo[None, None, :] * self.Ar[o]); er = win / np.maximum(den, 1e-9); et = win.sum(1) / np.maximum(den.sum(1), 1e-9); ef = win.sum((0, 1)) / np.maximum(den.sum((0, 1)), 1e-9); self.eq[p] = [ef, et, er]
        for p in (0, 1):
            o = 1 - p; wo = self.w[o]; bands = []
            def third(e, wt):                         # the strongest third of a weighted range by equity, each row
                od = np.argsort(-np.where(wt > 0, e, -1), axis=-1, kind='stable'); cw = np.cumsum(np.take_along_axis(wt, od, -1), -1) / np.maximum(wt.sum(-1, keepdims=True), 1e-12); mk = np.zeros_like(wt); np.put_along_axis(mk, od, (cw <= 1 / 3 + 1e-9).astype(np.float32), -1); return wt * mk
            hf = third(self.eq[o][0][None], wo[None])[0]; win, den = self.rate(p, hf[None, None, :] * self.Ar[o]); bands.append(np.digitize(win.sum((0, 1)) / np.maximum(den.sum((0, 1)), 1e-9), [.15, .4]))
            ht = third(self.eq[o][1], wo[None, :] * self.At[o]); win, den = self.rate(p, ht[:, None, :] * self.Ar[o]); bands.append(np.digitize(win.sum(1) / np.maximum(den.sum(1), 1e-9), [.15, .4]))
            hr = third(self.eq[o][2].reshape(K * M, -1), (wo[None, None, :] * self.Ar[o]).reshape(K * M, -1)).reshape(K, M, -1); win, den = self.rate(p, hr); bands.append(np.digitize(win / np.maximum(den, 1e-9), [.15, .4])); self.top[p] = bands
    def rate(self, p, r):
        """Player p's wins (ties as half) and matchups on every runout against the other's reach r (K, M, n_opp)."""
        if p == 0: return np.einsum('kmij,kmj->kmi', self.W, r) + 0.5 * np.einsum('kmij,kmj->kmi', self.T, r), np.einsum('kmij,kmj->kmi', self.Vr, r)
        return np.einsum('kmij,kmi->kmj', self.L, r) + 0.5 * np.einsum('kmij,kmi->kmj', self.T, r), np.einsum('kmij,kmi->kmj', self.Vr, r)
    def show(self, p, r, c):                       # the showdown on every runout, r (K, M, n_opp)
        if p == 0: return (self.P0 + c) * np.einsum('kmij,kmj->kmi', self.W, r) + (self.P0 / 2) * np.einsum('kmij,kmj->kmi', self.T, r) - c * np.einsum('kmij,kmj->kmi', self.L, r)
        return (self.P0 + c) * np.einsum('kmij,kmi->kmj', self.L, r) + (self.P0 / 2) * np.einsum('kmij,kmi->kmj', self.T, r) - c * np.einsum('kmij,kmi->kmj', self.W, r)
    def fold(self, p, r, lvl, folder, inv):
        V = (self.V0, self.Vt, self.Vr)[lvl]; sub = ('ij,j->i', 'kij,kj->ki', 'kmij,kmj->kmi')[lvl] if p == 0 else ('ij,i->j', 'kij,ki->kj', 'kmij,kmi->kmj')[lvl]
        return (-inv[p] if folder == p else self.P0 + inv[folder]) * np.einsum(sub, V, r)
    def deal(self, x, who, lvl):                   # a per-street array carried to the next street: the next card's dead hands drop out
        return (x[None, :] * self.At[who]) if lvl == 0 else (x[:, None, :] * self.Ar[who])
    def back(self, v, me, lvl):                    # values on the next street's cards brought back: the average over the sampled cards
        return (v * self.At[me]).sum(0) / K if lvl == 0 else (v * self.Ar[me]).sum(1) / M
    def walk(self, me, sig, mode, other=None):
        """mode 'reply': `me` is the free player replying to the table player's `sig`: its value and strategy. mode 'values': `me` against `other`: its value and, at its decisions, (each action's worth, its own reach)."""
        opp = 1 - me; out = {}
        def go(key, k, r, mine):
            lvl = len(key); node = self.tree[key][k]
            if node[0] == 'fold': return self.fold(me, r, lvl, node[1], node[2])
            if node[0] == 'end':
                if lvl == 2: return self.show(me, r, node[1][0])
                nk = key + (k,)
                if nk in self.tree: return self.back(go(nk, 0, self.deal(r, opp, lvl), self.deal(mine, me, lvl)), me, lvl)
                r2 = self.deal(r, opp, lvl) if lvl == 1 else self.deal(self.deal(r, opp, 0), opp, 1); v = self.show(me, r2, node[1][0])           # all in: the cards are only dealt
                return self.back(v, me, 1) if lvl == 1 else self.back(self.back(v, me, 1), me, 0)
            p, acts = node[:2]; nid = key + (k,)
            if p == me:
                if mode == 'reply': q = np.stack([go(key, c, r, mine) for _, c in acts], -1); s = np.zeros_like(q); np.put_along_axis(s, q.argmax(-1)[..., None], 1, -1); out[(lvl, nid)] = s; return q.max(-1)
                q = np.stack([go(key, c, r, mine * sig[(lvl, nid)][..., a]) for a, (_, c) in enumerate(acts)], -1); out[(lvl, nid)] = (q, mine); return (q * sig[(lvl, nid)]).sum(-1)
            st = (sig if mode == 'reply' else other)[(lvl, nid)]; return sum(go(key, c, r * st[..., a], mine) for a, (_, c) in enumerate(acts))
        v = go((), 0, self.w[opp].astype(np.float32), np.ones(len(self.w[me]), np.float32)); return float(self.w[me] @ v) / self.Z, out
    def decisions(self, p): return [(len(key), key + (k,)) for key, ns in self.tree.items() for k, n in enumerate(ns) if isinstance(n[0], int) and n[0] == p]
    def node(self, nid): return self.tree[nid[:-1]][nid[-1]]
    def shape(self, p, lvl): return ((len(self.w[p]),), (K, len(self.w[p])), (K, M, len(self.w[p])))[lvl]
def runouts(sp):
    """Each hand's equity against the other's starting range on every pair of cards still to come, (49, 49, hands) per seat: from all runouts, kept on disk."""
    f = os.path.join(STORE, 'tilt', f"{sp.name.replace(':', '_')}-w{MINW}.npz"); free = [c for c in DECK if c not in sp.board]
    if os.path.exists(f): z = np.load(f); return [z['a'], z['b']], free
    two = lambda h: (h[:2], h[2:]); P = [np.full((49, 49, len(sp.w[p])), np.nan, np.float32) for p in (0, 1)]; cards = [np.array([two(h) for h in sp.hands[p]]) for p in (0, 1)]
    for i, t in enumerate(free):
        for j in range(i + 1, 49):
            r = free[j]; al = [((cards[p] != t) & (cards[p] != r)).all(1) for p in (0, 1)]; sc = [np.array([score7(list(two(h)) + sp.board + [t, r]) if a else 0 for h, a in zip(sp.hands[p], al[p])]) for p in (0, 1)]
            cmp = np.sign(sc[0][:, None] - sc[1][None, :]); V = sp.V0 * al[0][:, None] * al[1][None, :]; g = [((cmp > 0) + 0.5 * (cmp == 0)) * V, ((cmp < 0) + 0.5 * (cmp == 0)) * V]
            for p, (win, den) in enumerate(((g[0] @ sp.w[1], V @ sp.w[1]), (sp.w[0] @ g[1], sp.w[0] @ V))): P[p][i, j] = P[p][j, i] = np.where(al[p] & (den > 0), win / np.maximum(den, 1e-12), np.nan)
    os.makedirs(os.path.dirname(f), exist_ok=True); tmp = f[:-4] + f'.{os.getpid()}.npz'; np.savez(tmp, a=P[0], b=P[1]); os.replace(tmp, f); return P, free
TILT = float(os.environ.get('TILT', 0.1))
def lean(e):
    """How a hand's equity is spread over the next card, e (cards, hands): 0 flat, 1 tilted up (a few cards lift it), 2 tilted down (a few cards sink it)."""
    with warnings.catch_warnings(): warnings.simplefilter('ignore'); lo, md, hi = np.nan_to_num(np.nanquantile(e, [.1, .5, .9], axis=0))
    return np.where((hi - md) - (md - lo) > TILT, 1, np.where((md - lo) - (hi - md) > TILT, 2, 0))
def tilts(sp):
    P, free = runouts(sp); out = []
    for p in (0, 1):
        with warnings.catch_warnings(): warnings.simplefilter('ignore'); et = np.nanmean(P[p], axis=1)
        out.append([lean(et), np.stack([lean(P[p][free.index(t)]) for t in sp.tc]), None])
    return out
STREETS = 'FTR'; RNAME = ['a raise', 'a re-raise', 'a third raise', 'a fourth raise']
def bet_name(lvl, i): return 'a bet' if len(BETS[lvl]) == 1 else f'bet {i + 1} of {len(BETS[lvl])}'
KINDS = {}                                          # each table and how many answers it has
for lvl, s_ in enumerate(STREETS):
    KINDS[f'{s_} first'] = 1 + len(BETS[lvl])
    for i in range(len(BETS[lvl])): KINDS[f'{s_} facing {bet_name(lvl, i)}'] = 3
    for j in range(RAISES): KINDS[f'{s_} facing {RNAME[j]}'] = 3 if j < RAISES - 1 else 2
def is_first(kd, streets='FT'): return kd[0] in streets and kd.endswith('first')
def is_bet(kd, streets='FT'): return kd[0] in streets and ' facing ' in kd and 'raise' not in kd
# CELLS: what the tables read beside the hand's place, its equity against his strongest third and the stacks behind.
#   fdraw: facing a bet on the flop or turn, a strong draw or not; adv: first to act on the flop or turn, the range's equity (under 45%, 45-55%, over 55%)
#   pot: every table by the pot before the flop (single-raised or 3-bet, read from the stacks behind as the flop starts)
#   tilt: on the flop and turn, how the hand's equity is spread over the next card: flat, tilted up or tilted down
CELLS = set(filter(None, os.environ.get('CELLS', '').split('+')))
if 'nodepth' in CELLS: DEPTHS = []; ND = 1                 # nodepth: the tables without the stacks-behind column
BASE = 8 if 'rows' in CELLS else 12 if 'eq' in CELLS else 6 * 3 * ND            # eq: the hand's equity in six bands (cuts at 20, 35, 50, 65, 80%) by a strong draw or not, in place of the three columns            # rows: the hand's row alone (nothing, draw, low / middle / top pair, overpair, two pair, trips or better) in place of the three columns
def n_cells(kd): return BASE * (2 if 'fdraw' in CELLS and is_bet(kd) else 1) * (3 if 'adv' in CELLS and is_first(kd) else 1) * (2 if 'pot' in CELLS else 1) * (3 if 'tilt' in CELLS and kd[0] in 'FT' else 1)
def kind(node, hero, lvl): p, acts, inv, (bets, size) = node; return STREETS[lvl] + (' first' if inv[1 - hero] <= inv[hero] else f' facing {bet_name(lvl, size)}' if bets == 1 else f' facing {RNAME[bets - 2]}')
EQCUTS = [.2, .35, .5, .65, .8]
def hand_rows(sp):
    """Each hand's row on the flop (n), on each sampled turn card (K, n) and on each sampled river card (K, M, n)."""
    two = lambda h: cards(h); B = cards(''.join(sp.board)); out = []
    for p in (0, 1):
        hs = [two(h) for h in sp.hands[p]]; out.append([np.array([row_of(h, B) for h in hs]), np.array([[row_of(h, B + cards(t)) for h in hs] for t in sp.tc]), np.array([[[row_of(h, B + cards(t) + cards(r)) for h in hs] for r in sp.rc[k]] for k, t in enumerate(sp.tc)])])
    return out
def lay(sp, hero, tab):
    """The tables laid over a flop: at each of the player's decisions the cells are read from the range it holds there."""
    sig = {}; plan = []; w = sp.w[hero]
    def go(key, k, mine):
        lvl = len(key); node = sp.tree[key][k]
        if node[0] == 'fold': return
        if node[0] == 'end':
            nk = key + (k,)
            if lvl < 2 and nk in sp.tree: go(nk, 0, sp.deal(mine, hero, lvl))
            return
        p, acts, inv = node[:3]
        if p != hero:
            for _, c in acts: go(key, c, mine)
            return
        E = sp.eq[hero][lvl]; Wt = EXP[lvl](w) * mine * sp.A[hero][lvl]; rows = E.reshape(-1, E.shape[-1]); pl, _ = place_rows(np.broadcast_to(rows, (Wt.reshape(-1, Wt.shape[-1]).shape)), Wt.reshape(-1, Wt.shape[-1]))
        cells = (pl.reshape(Wt.shape) * 3 + sp.top[hero][lvl]) * ND + int(np.digitize((sp.S - max(inv)) / (sp.P0 + inv[0] + inv[1]), DEPTHS)); kd = kind(node, hero, lvl); na = len(acts)
        if 'eq' in CELLS: cells = np.broadcast_to(np.digitize(E, EQCUTS) * 2 + (sp.sdraw[hero][lvl] if lvl < 2 else 0), Wt.shape).copy()
        if 'rows' in CELLS:
            if not hasattr(sp, 'rows'): sp.rows = hand_rows(sp)
            cells = np.broadcast_to(sp.rows[hero][lvl], Wt.shape).copy()
        if 'fdraw' in CELLS and is_bet(kd): cells = cells * 2 + sp.sdraw[hero][lvl]
        if 'adv' in CELLS and is_first(kd): tot = np.maximum(Wt.sum(-1, keepdims=True), 1e-12); cells = cells * 3 + np.digitize((Wt * E).sum(-1, keepdims=True) / tot, [.45, .55])
        if 'pot' in CELLS: cells = cells * 2 + int(sp.S / sp.P0 > 8)
        if 'tilt' in CELLS and lvl < 2:
            if not hasattr(sp, 'tilt'): sp.tilt = tilts(sp)
            cells = cells * 3 + sp.tilt[hero][lvl]
        t = tab[kd][cells]; x = np.zeros(cells.shape + (na,), np.float32); x[..., :min(na, t.shape[-1])] = t[..., :na]
        if na < t.shape[-1]: x[..., na - 1] += t[..., na:].sum(-1)
        nid = key + (k,); sig[(lvl, nid)] = x; plan.append(((lvl, nid), kd, cells, na))
        for a, (_, c) in enumerate(acts): go(key, c, mine * x[..., a])
    go((), 0, np.ones(len(w), np.float32)); return sig, plan
def solve(spots, hero, rounds, log=None, keep=None):
    """The least exploitable shared tables for `hero`. `keep`: a file the state is saved to every 20 rounds and taken up from."""
    reg = {kd: np.zeros((n_cells(kd), a)) for kd, a in KINDS.items()}; avg = {kd: np.zeros((n_cells(kd), a)) for kd, a in KINDS.items()}; cur = {kd: np.full((n_cells(kd), a), 1 / a) for kd, a in KINDS.items()}; best = [1e9, None]; t0 = time.time(); start = 1
    if keep and os.path.exists(keep): z = np.load(keep); start = int(z['t']) + 1; best = [float(z['best']), {kd: z['b|' + kd] for kd in KINDS}]; reg = {kd: z['r|' + kd] for kd in KINDS}; avg = {kd: z['a|' + kd] for kd in KINDS}; cur = {kd: z['c|' + kd] for kd in KINDS}
    for t in range(start, rounds + 1):
        add = {kd: np.zeros_like(v) for kd, v in reg.items()}; own = {kd: np.zeros(n_cells(kd)) for kd in KINDS}; total = 0.0
        for sp in spots:
            sig, plan = lay(sp, hero, cur); g, br = sp.walk(1 - hero, sig, 'reply'); _, vals = sp.walk(hero, sig, 'values', br); total += 100 * g / sp.P0; w0 = sp.w[hero] / (sp.Z * sp.P0)
            for nid, kd, cells, na in plan:
                if nid not in vals: continue
                q, mine = vals[nid]; lvl = nid[0]; v = (q * sig[nid]).sum(-1); d = np.zeros(q.shape[:-1] + (KINDS[kd],)); d[..., :na] = q - v[..., None]; scale = (1, 1 / K, 1 / (K * M))[lvl]; d = d * (EXP[lvl](w0) * sp.A[hero][lvl] * scale)[..., None]
                np.add.at(add[kd], cells.reshape(-1), d.reshape(-1, KINDS[kd])); np.add.at(own[kd], cells.reshape(-1), (mine * EXP[lvl](sp.w[hero] / sp.w[hero].sum()) * scale).reshape(-1))
        total /= len(spots)
        if total < best[0]: best = [total, {k: v.copy() for k, v in cur.items()}]
        for kd in KINDS:
            reg[kd] = np.maximum(reg[kd] + add[kd], 0); tot = reg[kd].sum(1, keepdims=True); avg[kd] += t * own[kd][:, None] * cur[kd]; cur[kd] = np.where(tot > 0, reg[kd] / np.maximum(tot, 1e-12), 1 / KINDS[kd])
        if log and (t in (1, 5, 20, 50) or t % 50 == 0): print(f'    round {t}: the reply wins {total:.1f}% of the pot (raw), {time.time() - t0:.0f} s', file=log, flush=True)
        if keep and t % 20 == 0: np.savez(keep, t=t, best=best[0], **{'b|' + kd: v for kd, v in best[1].items()}, **{'r|' + kd: v for kd, v in reg.items()}, **{'a|' + kd: v for kd, v in avg.items()}, **{'c|' + kd: v for kd, v in cur.items()})
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / KINDS[k]) for k, v in avg.items()}
    ga = float(np.mean([100 * sp.walk(1 - hero, lay(sp, hero, av)[0], 'reply')[0] / sp.P0 for sp in spots])); return av if ga < best[0] else best[1]
def equilibrium(sp, rounds, strategies=False):
    """Both players free (CFR+). Returns, for each seat p: what the free player wins against p's equilibrium play, and what it wins when both play it (the game's value to it), percent of the pot."""
    sig = [dict(), dict()]
    for p in (0, 1):
        for lvl, nid in sp.decisions(p): a = len(sp.node(nid)[1]); sig[p][(lvl, nid)] = np.full(sp.shape(p, lvl) + (a,), 1 / a, np.float32)
    reg = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig]; avs = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig]
    for t in range(1, rounds + 1):
        for p in (0, 1):
            _, vals = sp.walk(p, sig[p], 'values', sig[1 - p])
            for k, (q, mine) in vals.items(): v = (q * sig[p][k]).sum(-1); reg[p][k] = np.maximum(reg[p][k] + q - v[..., None], 0); tot = reg[p][k].sum(-1, keepdims=True); sig[p][k] = np.where(tot > 0, reg[p][k] / np.maximum(tot, 1e-12), 1 / q.shape[-1]).astype(np.float32); avs[p][k] += t * mine[..., None] * sig[p][k]
    norm = [{k: np.where(v.sum(-1, keepdims=True) > 0, v / np.maximum(v.sum(-1, keepdims=True), 1e-12), 1 / v.shape[-1]).astype(np.float32) for k, v in a.items()} for a in avs]
    reply = [100 * sp.walk(1 - p, norm[p], 'reply')[0] / sp.P0 for p in (0, 1)]; value = [100 * sp.walk(1 - p, norm[1 - p], 'values', norm[p])[0] / sp.P0 for p in (0, 1)]
    return (reply, value, norm) if strategies else (reply, value)
if __name__ == '__main__':
    job = sys.argv[1]; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 300; n_tr = int(sys.argv[3]) if len(sys.argv) > 3 else 8; n_te = int(sys.argv[4]) if len(sys.argv) > 4 else 6; rows = []; log = sys.stderr; t0 = time.time()
    for text in open(os.path.join(STORE, 'flop-roots.jsonl')):
        d = json.loads(text); d['flop'] = re.search(r'f\d+', d['spot']).group(0); rows.append(d)
    rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows); te = [x for x in rows if x['flop'] in held][:n_te]; pool = [x for x in rows if x['flop'] not in held]
    if os.environ.get('BAL'):                           # the flops solved on: as many 3-bet pots as single-raised ones
        a_ = [x for x in pool if x['action'] == '3BP']; b_ = [x for x in pool if x['action'] != '3BP']; pool = [x for pair in zip(a_, b_) for x in pair]
    tr = pool[:n_tr]
    CT = (('-' + '+'.join(sorted(CELLS))) if CELLS else '') + ('-bal' if os.environ.get('BAL') else ''); TAGF = f'-k{K}m{M}' + (('-' + os.environ['GAME']) if os.environ.get('GAME') else '')                                # results and saved states are kept by the sample and the number of flops, so runs do not pick up each other's
    def load_base():                                  # the game's value on the scoring flops, from every part's file
        out = {}
        for g in glob.glob(os.path.join(STORE, f'flop-base{TAGF}*.json')):
            if re.fullmatch(rf'flop-base{re.escape(TAGF)}(-\d+of\d+)?\.json', os.path.basename(g)): out.update(json.load(open(g)))
        return out
    if job == 'check':
        sp = Flop(te[0]); print(f"  {sp.name} {' '.join(sp.board)}: {len(sp.w[0])} and {len(sp.w[1])} hands, turn cards {sp.tc}, {len(sp.tree)} trees, {sum(len(v) for v in sp.tree.values())} nodes; ready {time.time() - t0:.0f} s", file=log, flush=True)
        for R in (50, 200, 600):
            if R > rounds: break
            t1 = time.time(); reply, value = equilibrium(sp, R); print(f"  {R} rounds: the reply wins {[round(x, 2) for x in reply]}, the game's value {[round(x, 2) for x in value]}, so exploitable for {[round(a - b, 2) for a, b in zip(reply, value)]} | {time.time() - t1:.0f} s", file=log, flush=True)
    elif job == 'base':                              # PART=-0of4 solves every fourth scoring flop into its own file, so several can run side by side
        part = os.environ.get('PART', ''); f = os.path.join(STORE, f'flop-base{TAGF}{part}.json'); res = json.load(open(f)) if os.path.exists(f) else {}; have = load_base()
        for j, d in enumerate(te):
            if d['spot'] in have or (part and j % int(part.split('of')[1]) != int(part.split('of')[0][1:])): continue
            reply, value = equilibrium(Flop(d), rounds); res[d['spot']] = reply; json.dump(res, open(f, 'w')); print(f"  {d['spot']} {[round(x, 1) for x in reply]} exploitable for {[round(a_ - b_, 2) for a_, b_ in zip(reply, value)]} {time.time() - t0:.0f} s", file=log, flush=True)
    elif job.startswith('score'):                    # score:<seat>:<flops solved on>: the saved tables on every scoring flop the game's value is known for
        _, hero, ntr = job.split(':'); hero = int(hero); f = os.path.join(STORE, f'flop-{hero}-n{ntr}{CT}{TAGF}.json'); r = json.load(open(f)); base = load_base(); tab = {k: np.array(v) for k, v in r['tables'].items()}
        if os.environ.get('RESCORE'): r['scored'] = {}
        for d in te:
            if d['spot'] in r['scored'] or d['spot'] not in base: continue
            sp = Flop(d); r['scored'][d['spot']] = 100 * sp.walk(1 - hero, lay(sp, hero, tab)[0], 'reply')[0] / sp.P0; json.dump(r, open(f, 'w')); print(f"  {d['spot']} {r['scored'][d['spot']] - base[d['spot']][hero]:.1f} {time.time() - t0:.0f} s", file=log, flush=True)
    elif job.startswith('ablate'):                   # ablate:<flops solved on>: the solver's own play everywhere but one table (or one street's tables), so each table's cost shows on its own
        ntr = job.split(':')[1]; f = os.path.join(STORE, f'flop-ablate-n{ntr}{CT}{TAGF}.json'); res = json.load(open(f)) if os.path.exists(f) else {}; tabs = [{k: np.array(v) for k, v in json.load(open(os.path.join(STORE, f'flop-{h}-n{ntr}{CT}{TAGF}.json')))['tables'].items()} for h in (0, 1)]
        for d in te:
            if d['spot'] in res: continue
            sp = Flop(d); reply, _, norm = equilibrium(sp, rounds, True); out = [{}, {}]
            for h in (0, 1):
                sig, plan = lay(sp, h, tabs[h]); groups = {kd: [kd] for kd in KINDS}; groups.update({'all of ' + s_: [kd for kd in KINDS if kd[0] == s_] for s_ in STREETS}); groups['every table'] = list(KINDS)
                for g, kds in groups.items(): mix = dict(norm[h]); mix.update({nid: sig[nid] for nid, kd, _, _ in plan if kd in kds}); out[h][g] = 100 * sp.walk(1 - h, mix, 'reply')[0] / sp.P0 - reply[h]
            res[d['spot']] = out; json.dump(res, open(f, 'w')); print(f"  {d['spot']} {time.time() - t0:.0f} s", file=log, flush=True)
    elif job.startswith('evlost'):                   # evlost:<flops solved on>: what the tables give up over the whole hand to an opponent who does not adjust (the solver's own play), beside their exploitability
        ntr = job.split(':')[1]; part = os.environ.get('PART', ''); f = os.path.join(STORE, f'flop-evlost-n{ntr}{CT}{TAGF}{part}.json'); res = json.load(open(f)) if os.path.exists(f) else {}; tabs = [{k: np.array(v) for k, v in json.load(open(os.path.join(STORE, f'flop-{h}-n{ntr}{CT}{TAGF}.json')))['tables'].items()} for h in (0, 1)]
        for j, d in enumerate(te):
            if d['spot'] in res or (part and j % int(part.split('of')[1]) != int(part.split('of')[0][1:])): continue
            sp = Flop(d); reply, _, norm = equilibrium(sp, rounds, True); out = []
            for h in (0, 1): sig = lay(sp, h, tabs[h])[0]; fair = sp.walk(h, norm[h], 'values', norm[1 - h])[0]; got = sp.walk(h, sig, 'values', norm[1 - h])[0]; out.append(dict(lost=100 * (fair - got) / sp.P0, exploitable=100 * sp.walk(1 - h, sig, 'reply')[0] / sp.P0 - reply[h]))
            res[d['spot']] = out; json.dump(res, open(f, 'w')); print(f"  {d['spot']} lost {[round(o['lost'], 2) for o in out]} exploitable {[round(o['exploitable'], 1) for o in out]} {time.time() - t0:.0f} s", file=log, flush=True)
    elif job == 'alone':
        base = load_base(); f = os.path.join(STORE, f"flop-alone{CT}{TAGF}{os.environ.get('PART', '')}.json"); res = json.load(open(f)) if os.path.exists(f) else {}
        part = os.environ.get('PART', '')
        for j, d in enumerate(te):
            if d['spot'] in res or d['spot'] not in base or (os.environ.get('ONLY') and d['spot'] not in os.environ['ONLY'].split(',')) or (part and j % int(part.split('of')[1]) != int(part.split('of')[0][1:])): continue
            sp = Flop(d); res[d['spot']] = [100 * sp.walk(1 - h, lay(sp, h, solve([sp], h, rounds))[0], 'reply')[0] / sp.P0 - base[d['spot']][h] for h in (0, 1)]; json.dump(res, open(f, 'w')); print(f"  {d['spot']} alone {[round(x, 1) for x in res[d['spot']]]} {time.time() - t0:.0f} s", file=log, flush=True)
    else:
        hero = int(job); S_tr = [Flop(d) for d in tr]; print(f'  flops ready {time.time() - t0:.0f} s', file=log, flush=True); tab = solve(S_tr, hero, rounds, log, os.path.join(STORE, f'flop-{hero}-n{n_tr}{CT}{TAGF}-state.npz'))
        raw_tr = float(np.mean([100 * sp.walk(1 - hero, lay(sp, hero, tab)[0], 'reply')[0] / sp.P0 for sp in S_tr])); del S_tr; raw_te = {}
        for d in te: sp = Flop(d); raw_te[d['spot']] = 100 * sp.walk(1 - hero, lay(sp, hero, tab)[0], 'reply')[0] / sp.P0
        json.dump(dict(rounds=rounds, solved_on=raw_tr, scored=raw_te, tables={k: v.tolist() for k, v in tab.items()}), open(os.path.join(STORE, f'flop-{hero}-n{n_tr}{CT}{TAGF}.json'), 'w')); print(f'  done {time.time() - t0:.0f} s', file=log, flush=True)
