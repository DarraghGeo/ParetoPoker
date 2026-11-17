# A restricted solve on river spots: one player may only play by cells (every hand in a cell the same way), the other is
# free and always plays the best reply. The restricted player learns, cell by cell, the frequencies that leave the best
# reply the least to win (CFR against a best response, Johanson et al. 2012). What comes out is the least exploitable
# strategy those cells allow: the floor for that table shape.
# Cells: at each of the player's decisions, the hand's equity against the other's range as the river starts, in bands.
# River spots come from the stored river decisions (research/insight/out/hands-*v.jsonl). Bets 75% and 150% of the pot,
# raises to three times, a bet and two raises at most.
#   python3 research/butterfly/restricted.py [spots] [rounds]   ->  research/butterfly/restricted.md
import json, os, sys, itertools, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', 'insight', 'out'); RANKS = '23456789TJQKA'
def rank7(cs):
    """The best five of seven cards as a tuple that compares."""
    rs = sorted((RANKS.index(c[0]) for c in cs), reverse=True); cnt = {}
    for r in rs: cnt[r] = cnt.get(r, 0) + 1
    suit = next((s for s in 'shdc' if sum(c[1] == s for c in cs) >= 5), None)
    def straight(ranks):
        have = set(ranks) | ({-1} if 12 in ranks else set())
        return next((t for t in range(12, 2, -1) if all(t - k in have for k in range(5))), None)
    if suit:
        fr = sorted((RANKS.index(c[0]) for c in cs if c[1] == suit), reverse=True); st = straight(fr)
        if st is not None: return (8, st)
    by = sorted(cnt, key=lambda r: (-cnt[r], -r))
    if cnt[by[0]] == 4: return (7, by[0], max(r for r in rs if r != by[0]))
    if cnt[by[0]] == 3 and len(by) > 1 and cnt[by[1]] >= 2: return (6, by[0], by[1])
    if suit: return (5, *fr[:5])
    st = straight(rs)
    if st is not None: return (4, st)
    if cnt[by[0]] == 3: return (3, by[0], *[r for r in rs if r != by[0]][:2])
    if cnt[by[0]] == 2 and len(by) > 1 and cnt[by[1]] == 2: return (2, by[0], by[1], max(r for r in rs if r not in (by[0], by[1])))
    if cnt[by[0]] == 2: return (1, by[0], *[r for r in rs if r != by[0]][:3])
    return (0, *rs[:5])
class Spot:
    def __init__(self, d):
        self.name = f"{d['spot']} | {d['board']}"; board = d['board'].split(); self.P0 = d['pot']; self.S = d['behind']
        hs = [(h['h'], h['w']) for h in d['hands'] if h['w'] > 0]; vs = [(x[0], x[1]) for x in d['vr'] if x[1] > 0]
        self.hands = [[h for h, _ in hs], [h for h, _ in vs]]; self.w = [np.array([x for _, x in hs], float), np.array([x for _, x in vs], float)]
        two = lambda h: (h[:2], h[2:]); r0 = [rank7(list(two(h)) + board) for h in self.hands[0]]; r1 = [rank7(list(two(h)) + board) for h in self.hands[1]]
        n0, n1 = len(r0), len(r1); self.V = np.array([[not (set(two(a)) & set(two(b))) for b in self.hands[1]] for a in self.hands[0]], float)
        cmp = np.array([[(x > y) - (x < y) for y in r1] for x in r0]); self.W = (cmp > 0) * self.V; self.T = (cmp == 0) * self.V; self.L = (cmp < 0) * self.V
        self.Z = float(self.w[0] @ self.V @ self.w[1]); self.build()
        den = self.V @ self.w[1]; self.eq0 = [(self.W @ self.w[1] + 0.5 * self.T @ self.w[1]) / np.maximum(den, 1e-12), None]; den1 = self.V.T @ self.w[0]; self.eq0[1] = (self.L.T @ self.w[0] + 0.5 * self.T.T @ self.w[0]) / np.maximum(den1, 1e-12)
    def build(self):
        """The river's tree. A node: (player, [(label, child)], invested) or a terminal ('fold', folder, invested) / ('show', invested)."""
        self.nodes = []; P0, S = self.P0, self.S
        def add(node): self.nodes.append(node); return len(self.nodes) - 1
        def decide(p, inv, raises, checked):
            k = add(None); acts = []; other = 1 - p; to_call = inv[other] - inv[p]
            if to_call > 0:
                acts.append(('fold', add(('fold', p, tuple(inv))))); c = list(inv); c[p] = inv[other]; acts.append(('call', add(('show', tuple(c)))))
                if raises < 3 and inv[other] < S:
                    to = min(S, 3 * inv[other]); n = list(inv); n[p] = to; acts.append(('raise' if to < S else 'allin', decide(other, n, raises + 1, True)))
            else:
                acts.append(('check', add(('show', tuple(inv))) if checked else decide(other, inv, raises, True)))
                seen = set()
                for f in (0.75, 1.5):
                    amt = min(S, round(f * P0, 2))
                    if amt in seen or amt <= 0: continue
                    seen.add(amt); n = list(inv); n[p] = amt; acts.append((f'bet {int(100 * f)}%' if amt < S else 'allin', decide(other, n, 1, True)))
            self.nodes[k] = (p, acts, tuple(inv)); return k
        self.root = decide(0, [0.0, 0.0], 0, False); self.dec = [k for k, n in enumerate(self.nodes) if isinstance(n[0], int)]
    def terminal(self, node, p, r_opp):
        """What player p's hands are worth at a terminal, against the other's reach (chips times reach)."""
        M = (lambda X: X @ r_opp) if p == 0 else (lambda X: X.T @ r_opp)
        if node[0] == 'fold':
            folder, inv = node[1], node[2]; return (-inv[p] if folder == p else self.P0 + inv[folder]) * M(self.V)
        c = node[1][0]; win, lose = (self.W, self.L) if p == 0 else (self.L, self.W)
        return (self.P0 + c) * M(win) + (self.P0 / 2) * M(self.T) - c * M(lose)
    def best_reply(self, hero, sig):
        """The free player's best reply to `hero`'s strategy: its value and its strategy at each of its decisions."""
        opp = 1 - hero; br = {}
        def go(k, r_hero):
            node = self.nodes[k]
            if not isinstance(node[0], int): return self.terminal(node, opp, r_hero)
            p, acts, _ = node
            if p == hero: return sum(go(c, r_hero * sig[k][:, a]) for a, (_, c) in enumerate(acts))
            vals = np.column_stack([go(c, r_hero) for _, c in acts]); best = vals.argmax(1); s = np.zeros_like(vals); s[np.arange(len(best)), best] = 1; br[k] = s; return vals.max(1)
        v = go(self.root, self.w[hero].copy()); return float(self.w[opp] @ v) / self.Z, br
    def values(self, hero, sig, opp_sig):
        """For `hero`: at each of its decisions, what each action is worth to each hand against `opp_sig` (times the other's reach), and the hero's reach."""
        opp = 1 - hero; out = {}
        def go(k, r_opp, r_own):
            node = self.nodes[k]
            if not isinstance(node[0], int): return self.terminal(node, hero, r_opp)
            p, acts, _ = node
            if p == opp:
                if not r_opp.any(): return np.zeros(len(self.w[hero]))
                return sum(go(c, r_opp * opp_sig[k][:, a], r_own) for a, (_, c) in enumerate(acts))
            q = np.column_stack([go(c, r_opp, r_own * sig[k][:, a]) for a, (_, c) in enumerate(acts)]); out[k] = (q, r_own); return (q * sig[k]).sum(1)
        v = go(self.root, self.w[opp].copy(), np.ones(len(self.w[hero]))); return float(self.w[hero] @ v) / self.Z, out
def uniform(spot, p): return {k: np.full((len(spot.w[p]), len(spot.nodes[k][1])), 1 / len(spot.nodes[k][1])) for k in spot.dec if spot.nodes[k][0] == p}
def equilibrium(spot, rounds=600):
    """Both players free (CFR+): the value of the game to each."""
    sig = [uniform(spot, 0), uniform(spot, 1)]; reg = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig]; avg = [{k: np.zeros_like(v) for k, v in s.items()} for s in sig]
    for t in range(1, rounds + 1):
        for p in (0, 1):
            _, vals = spot.values(p, sig[p], sig[1 - p])
            for k, (q, r_own) in vals.items():
                v = (q * sig[p][k]).sum(1); reg[p][k] = np.maximum(reg[p][k] + q - v[:, None], 0); tot = reg[p][k].sum(1, keepdims=True); sig[p][k] = np.where(tot > 0, reg[p][k] / np.maximum(tot, 1e-12), 1 / q.shape[1]); avg[p][k] += t * r_own[:, None] * sig[p][k]
    norm = [{k: v / np.maximum(v.sum(1, keepdims=True), 1e-12) for k, v in a.items()} for a in avg]
    for p in (0, 1):
        for k, v in norm[p].items(): v[v.sum(1) == 0] = 1 / v.shape[1]
    return norm
def quarters(fr):
    x = fr * 4; lo = np.floor(x + 1e-9); left = (4 - lo.sum(1)).astype(int); order = np.argsort(-(x - lo), axis=1)
    for k in range(fr.shape[1]): lo[np.arange(len(lo)), order[:, k]] += (left > k)
    return lo / 4
def restricted(spot, hero, cells, rounds):
    """The least exploitable strategy for `hero` when every hand of a cell must play alike. `cells[k]`: each hand's cell at decision k."""
    mine = [k for k in spot.dec if spot.nodes[k][0] == hero]; nb = {k: int(cells[k].max()) + 1 for k in mine}; A = {k: len(spot.nodes[k][1]) for k in mine}
    reg = {k: np.zeros((nb[k], A[k])) for k in mine}; avg = {k: np.zeros((nb[k], A[k])) for k in mine}; cur = {k: np.full((nb[k], A[k]), 1 / A[k]) for k in mine}; w0 = spot.w[hero]
    expand = lambda tab: {k: tab[k][cells[k]] for k in mine}; best = (1e9, None); trace = []
    for t in range(1, rounds + 1):
        sig = expand(cur); gain, br = spot.best_reply(hero, sig); _, vals = spot.values(hero, sig, br)
        if gain < best[0]: best = (gain, {k: v.copy() for k, v in cur.items()})
        for k in mine:
            if k not in vals: continue                       # the best reply never comes here this round
            q, r_own = vals[k]; v = (q * sig[k]).sum(1); d = w0[:, None] * (q - v[:, None]); add = np.zeros_like(reg[k]); np.add.at(add, cells[k], d)
            reg[k] = np.maximum(reg[k] + add, 0); tot = reg[k].sum(1, keepdims=True); own = np.zeros(nb[k]); np.add.at(own, cells[k], w0 * r_own); avg[k] += t * own[:, None] * cur[k]
            cur[k] = np.where(tot > 0, reg[k] / np.maximum(tot, 1e-12), 1 / A[k])
        if t in (1, 10, 30, 100, 300, 1000, 3000) or t == rounds: trace.append((t, gain))
    av = {k: np.where(v.sum(1, keepdims=True) > 0, v / np.maximum(v.sum(1, keepdims=True), 1e-12), 1 / A[k]) for k, v in avg.items()}
    g_av, _ = spot.best_reply(hero, expand(av)); pick = av if g_av < best[0] else best[1]; g = min(g_av, best[0]); qt = {k: quarters(v) for k, v in pick.items()}; g_q, _ = spot.best_reply(hero, expand(qt))
    return dict(gain=g, gain_quarters=g_q, table=qt, smooth=pick, trace=trace)
def bands(x, n):
    edges = {3: [.35, .65], 6: [.2, .35, .5, .65, .8], 12: [.1, .2, .275, .35, .425, .5, .575, .65, .725, .8, .9]}[n]; return np.digitize(x, edges)
if __name__ == '__main__':
    n_spots = int(sys.argv[1]) if len(sys.argv) > 1 else 3; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 1000; picked = []; seen = set()
    for name in ('hands-9v', 'hands-7v'):
        for text in open(os.path.join(DATA, name + '.jsonl')):
            if '|first"' not in text: continue
            d = json.loads(text)
            if len(d['board'].split()) != 5 or d['seat'] != 0 or d['toCall'] > 0 or d['action'] in seen or len(d['hands']) < 120 or len(d['vr']) < 120 or not (1 <= d['behind'] / d['pot'] <= 6): continue
            seen.add(d['action']); picked.append(d)
            if len(picked) >= n_spots: break
        if len(picked) >= n_spots: break
    out = open(os.path.join(HERE, 'restricted.md'), 'w')
    def say(*a): print(*a); print(*a, file=out); out.flush()
    say('# A restricted solve on river spots\n'); say('One player plays by cells (its equity against the other\'s range as the river starts, in bands, at each of its decisions); the other plays the best reply. "Best reply wins" is what the free player gains over the value of the game, in percent of the pot: 0 is unexploitable.\n')
    for d in picked:
        t0 = time.time(); spot = Spot(d); eq = equilibrium(spot, 800); base = [spot.best_reply(p, eq[p])[0] for p in (0, 1)]       # the free player's value against equilibrium play: the game's value to it (near enough)
        say(f'\n## {spot.name}: pot {spot.P0}, {spot.S} behind; {len(spot.w[0])} and {len(spot.w[1])} hands; {len(spot.dec)} decisions in the tree\n')
        say('| the restricted player | cells a decision | best reply wins: every hand alike | 3 bands | 6 bands | 6 bands in quarters | 12 bands | each hand its own (no restriction) |'); say('|---|---|---|---|---|---|---|---|')
        for hero in (0, 1):
            mine = [k for k in spot.dec if spot.nodes[k][0] == hero]; row = []; table6 = None
            for nb in (1, 3, 6, 12, 0):
                cells = {k: (np.arange(len(spot.w[hero])) if nb == 0 else np.zeros(len(spot.w[hero]), int) if nb == 1 else bands(spot.eq0[hero], nb)) for k in mine}; r = restricted(spot, hero, cells, rounds); ex = 100 * (r['gain'] - base[hero]) / spot.P0; row.append(ex)
                if nb == 6: table6 = r; exq = 100 * (r['gain_quarters'] - base[hero]) / spot.P0
            say(f"| {'out of position' if hero == 0 else 'in position'} | equity bands | {row[0]:.1f} | {row[1]:.1f} | {row[2]:.1f} | {exq:.1f} | {row[3]:.1f} | {row[4]:.1f} |")
            say(f"\nHow the 6-band solve settled ({'OOP' if hero == 0 else 'IP'}; rounds: best reply wins, % of pot): " + ', '.join(f'{t}: {100 * (g - base[hero]) / spot.P0:.1f}' for t, g in table6['trace']) + '\n')
            lab = ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']
            for k in mine[:3]:
                acts = [a for a, _ in spot.nodes[k][1]]; inv = spot.nodes[k][2]; tab = table6['table'][k]; sm = table6['smooth'][k]; share = np.array([spot.w[hero][bands(spot.eq0[hero], 6) == b].sum() for b in range(6)]) / spot.w[hero].sum()
                say(f"Decision with {inv[0]:g} / {inv[1]:g} in ({' / '.join(acts)}), in quarters (as solved):"); [say(f"- {lab[b]} ({100 * share[b]:.0f}% of range): {' / '.join(str(int(100 * x)) for x in tab[b])}  ({' / '.join(f'{100 * x:.0f}' for x in sm[b])})") for b in range(5, -1, -1) if b < tab.shape[0]]; say('')
        print(f'  ({time.time() - t0:.0f} s)', file=sys.stderr)
    out.close()
