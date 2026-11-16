# The rules as they would be carried, scored with exact equities and then as read off the chart (levels and lines).
# Cost first order, % of the pot at the decision, weighted by how often the decision arises and the pot's size.
import sys, numpy as np, collections
from load import load, wmean
D = load(); names = {3: 'flop', 4: 'turn', 5: 'river'}; E = (np.arange(20) + .5) / 20
# ---- reading a cell's place from equity or from the chart --------------------------------------------------------------
def line(share, t):
    below = 0.0
    for k in range(8):
        if share[k] > 0 and below + share[k] >= t: return k, (t - below) / share[k]
        below += share[k]
    return 8, 0.0
def above_share(share, ln): k, fr = ln; return share[k + 1:].sum() + (share[k] * (1 - fr) if k < 8 else 0)
def places(d):
    """Each cell's place along its bar (0 low end .. 1 high end), by equity step within the level."""
    S = d['S']; q = np.zeros(S.shape)
    for lv in range(8):
        tot = S[lv].sum(); seen = 0.0
        if tot <= 0: continue
        for eb in range(20):
            w = S[lv, eb].sum(); q[lv, eb, :] = (seen + w / 2) / tot; seen += w
    return q
def reader(d, how):
    """over(t): which cells sit above the line a share t of his range lies under; and his strong and weak shares."""
    if how == 'equity':
        over = lambda t: np.broadcast_to((E >= t)[None, :, None], d['S'].shape); return over, d['his_strong'], d['his_weak']
    q = places(d); mine = d['S'].sum((1, 2)); lv = np.arange(8)[:, None, None]
    def over(t): k, fr = line(d['hisLv'], t); return (lv > k) | ((lv == k) & (q >= fr))
    return over, above_share(d['hisLv'], line(mine, 0.8)), 1 - above_share(d['hisLv'], line(mine, 0.3))
# ---- the rules -----------------------------------------------------------------------------------------------------------
def value_from(s): return 0.75 if s < 0.5 else 0.8 if s < 1.1 else 0.85
def bet_rule(d, how, P):
    """The action for every cell at a decision to bet: an array of action indices."""
    st, ip = d['street'], d['ip']; x = d['kinds'].index('check'); out = np.full(d['S'].shape, x); b = [(a, d['sizes'][a]) for a, k in enumerate(d['kinds']) if k in ('bet', 'allin')]
    want = P['size'][st]; a, s = min(b, key=lambda t: abs(t[1] - want)); over, strong, weak = reader(d, how)
    if not ip and strong >= P['gate'][st]: return out
    if ip and strong >= P.get('gate_ip', {}).get(st, 9): return out
    out[over(min(0.97, value_from(s) + P.get('vplus', {}).get(st, 0)))] = a; bl = max(0.0, weak - (P['bluff_ip'] if ip else P['bluff_oop'])[st]) if P['bluffs'][st] else 0
    if bl > 0: out[~over(bl)] = a
    if st < 5 and P['draws'][st]: out[:, :, 2] = np.where(out[:, :, 2] == x, a, out[:, :, 2]) if P['draws'][st] == 1 else out[:, :, 2]
    return out
def face_rule(d, how, P):
    st = d['street']; f, c = d['kinds'].index('fold'), d['kinds'].index('call'); r = next((a for a, k in enumerate(d['kinds']) if k in ('raise', 'allin')), None); s = d['faced']; over, _, _ = reader(d, how)
    extra = P['extra'][st] + (P['big'][st] if s > 1.0 else 0); out = np.full(d['S'].shape, f); out[over(min(0.95, s / (1 + 2 * s) + extra))] = c
    if st < 5 and s < P['draw_call'][st]: out[:, :, 2] = c
    if r is not None and d['what'] == 'facingBet' and P['rz'][st] < 1: out[over(P['rz'][st] + (0.05 if s > 1.0 else 0))] = r
    return out
def cost(d, acts): return 100 * sum(d['R'][a][acts == a].sum() for a in range(len(d['kinds'])))
def freq(d, acts, quiet): return float(d['S'][acts != quiet].sum())
P = dict(size={3: 0.33, 4: 0.33, 5: 0.75}, gate={3: 9, 4: 0.2, 5: 0.2}, bluffs={3: 0, 4: 0, 5: 1}, bluff_ip={5: 0.2, 4: 0.2, 3: 0.2}, bluff_oop={5: 0.25, 4: 0.25, 3: 0.25}, draws={3: 0, 4: 0},
         extra={3: 0.1, 4: 0.1, 5: 0.0}, big={3: 0.05, 4: 0.05, 5: 0.05}, draw_call={3: 0.5, 4: 0.5}, rz={3: 9, 4: 9, 5: 0.75})
if __name__ == '__main__':
    print(f'{"":44s}{"n":>5s}{"solution":>10s}{"passive":>9s}{"equities":>10s}{"chart":>8s}   acts: solution / equities / chart')
    for st in (3, 4, 5):
        for what in ('first', 'checkedTo', 'facingBet', 'facingRaise'):
            G = [d for d in D if d['street'] == st and d['what'] == what and (('check' in d['kinds'] and any(k in ('bet', 'allin') for k in d['kinds'])) if what in ('first', 'checkedTo') else ('fold' in d['kinds'] and 'call' in d['kinds']))]
            if len(G) < 8: continue
            rule = bet_rule if what in ('first', 'checkedTo') else face_rule; quiet = lambda d: d['kinds'].index('check' if what in ('first', 'checkedTo') else 'fold')
            ce, cc = wmean(G, lambda d: cost(d, rule(d, 'equity', P))), wmean(G, lambda d: cost(d, rule(d, 'chart', P)))
            print(f'{names[st]:6s}{what:12s}{"":26s}{len(G):5d}{wmean(G, lambda d: 100 * d["sol"]):10.2f}{wmean(G, lambda d: 100 * d["R"][quiet(d)].sum()):9.2f}{ce:10.2f}{cc:8.2f}   {100*wmean(G, lambda d: 1 - d["freq"][quiet(d)]):3.0f}% / {100*wmean(G, lambda d: freq(d, rule(d, "equity", P), quiet(d))):3.0f}% / {100*wmean(G, lambda d: freq(d, rule(d, "chart", P), quiet(d))):3.0f}%')
