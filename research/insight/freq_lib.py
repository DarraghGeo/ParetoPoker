# Range frequencies: one row a decision, with the derived base formulas and the things about the two ranges that
# might correct them. The base is not tuned: the von Neumann thresholds on the real equity curves.
import glob, json, re, numpy as np, pandas as pd
import sys; sys.path.insert(0, 'research/insight')
from lib import cards, texture, aggressor
class Dist:
    """A range as a curve: each hand's equity against the other range, with its weight."""
    def __init__(self, e, w):
        e = np.asarray(e, float); w = np.asarray(w, float); ok = ~np.isnan(e) & (w > 0); o = np.argsort(e[ok]); self.e = e[ok][o]; self.w = w[ok][o]; self.total = self.w.sum(); self.cum = np.cumsum(self.w)
    def below(self, t): return float(self.w[self.e < t].sum() / self.total) if self.total > 0 else 0.0
    def quantile(self, q):
        if not len(self.e): return 0.0
        i = int(np.searchsorted(self.cum, q * self.total, side='left')); return float(self.e[min(i, len(self.e) - 1)])
    def mean(self): return float((self.e * self.w).sum() / self.total)
    def std(self): m = self.mean(); return float(np.sqrt(((self.e - m) ** 2 * self.w).sum() / self.total))
    def share(self, lo, hi): return float(self.w[(self.e >= lo) & (self.e < hi)].sum() / self.total)
def thresholds(mine, his, s, raise_to=0.0):
    """The von Neumann thresholds of research/src/derived.js on the real curve, solved by how much of the range bets for
    value rather than by the equity it starts at, so that many hands of one strength are shared out and not counted
    whole. Value: the top v of the range, from equity b. Bluffs: s/(1+s) of that, the weakest hands, up to equity a.
    The three indifferences: he folds c = (s + a)/(1 + s); the thinnest value bet beats half of what calls,
    b = (1 + c)/2 (+ what bluff raises cost it, when he can raise)."""
    rho = s / (1 + s)
    def solve(extra):
        lo, hi = 0.0, 1.0 / (1 + rho)
        for _ in range(40):
            v = (lo + hi) / 2; b = mine.quantile(1 - v); a = mine.quantile(rho * v) if v > 0 else 0.0
            if b - extra - (1 + (s + a) / (1 + s)) / 2 > 0: lo = v
            else: hi = v
        v = (lo + hi) / 2; return v, mine.quantile(1 - v) if v > 1e-6 else 1.0, mine.quantile(rho * v) if v > 1e-6 else 0.0
    v, value, bluff = solve(0.0); br = 0.0
    if raise_to > s:
        alpha = raise_to / (raise_to + 1 + s); price = (raise_to - s) / (1 + 2 * raise_to)
        for k in range(12):
            freq = v * (1 + rho); calls = (1 - alpha) * freq; needed = mine.quantile(1 - calls / 2)
            vr = 1 - his.below(his.quantile(min(1, max(0, needed)))); nxt = min(vr * (price / (1 - price)), 1.0)
            br = (br + nxt) / 2 if k else nxt; v, value, bluff = solve(((1 + s) / (2 * s)) * br)
    return dict(value=value, bluff=bluff, v=v, freq=v * (1 + rho), fold=min(1.0, (s + bluff) / (1 + s)), bluff_share=rho / (1 + rho))
def fold_from_bets(bettor, s, checks_back=1.0):
    """derived.js riverFold: from the betting range alone."""
    if bettor.total <= 0: return s / (1 + s)
    return min(1.0, (s + bettor.quantile(s / (1 + 2 * s) / 2) * checks_back) / (1 + s))
def shape(d, name):
    return {f'{name}_eq': d.mean(), f'{name}_sd': d.std(), f'{name}_nut': d.share(0.8, 1.01), f'{name}_strong': d.share(0.65, 1.01), f'{name}_mid': d.share(0.35, 0.65), f'{name}_air': d.share(0, 0.25), f'{name}_q90': d.quantile(0.9), f'{name}_q10': d.quantile(0.1)}
def source_key(line):
    head, tail = (line.rsplit('|', 1) + [None])[:2] if '|' in line else (None, line); pre = '' if head is None else head + '|'
    m = re.match(r'^(x?)b(\d+)$', tail)
    return (pre + ('x' if m.group(1) else 'first'), int(m.group(2))) if m else None
def load(files=None):
    files = files or sorted(glob.glob('research/insight/out/full-*.jsonl')) + [f for f in sorted(glob.glob('research/insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
    rows = []
    for f in files:
        seed = int(re.search(r'-(\d+)\.jsonl', f).group(1)); recs = {}
        lines = [json.loads(l) for l in open(f) if l.strip()]
        for d in lines: recs[(d['spot'], d['board'], d['line'])] = d
        for d in lines:
            if re.search(r'b\d+r\d+', d['line']) or not d.get('vr') or not d['hands']: continue
            n = len(d['board'].replace(' ', '')) // 2; hs = d['hands']; W = sum(h['w'] for h in hs)
            if W < 1 or sum(v[1] for v in d['vr']) < 1: continue
            mine = Dist([h['e'] for h in hs], [h['w'] for h in hs]); his = Dist([v[2] for v in d['vr']], [v[1] for v in d['vr']])
            acts = d['actions']; kinds = [a['kind'] for a in acts]; tx = texture(cards(d['board'])); pfa = aggressor(d['action'], d['oop'], d['ip']) == d['seat']
            tail = d['line'].split('|')[-1]; facing = d['toCall'] > 0; pot0 = d['pot'] - d['toCall']
            x = dict(key=f"{d['spot']}|{d['board']}|{d['line']}", spot=d['spot'], seed=seed, pre=d['pre'], action=d['action'], street=n, line=d['line'], tail=tail, ip=float(d['seat'] == 1), raiser=float(pfa), facing=facing, spr=d['behind'] / d['pot'], reach_me=d['reach'][0], reach_him=d['reach'][1],
                     two_tone=float(tx['suited'] == 2), monotone=float(tx['suited'] >= 3), paired=float(tx['paired']), connected=float(tx['conn'] >= 3), high=float(tx['top'] >= 11), exploit=d['exploit'], can_raise=float(n == 3))
            x.update(shape(mine, 'my')); x.update(shape(his, 'his')); x['adv'] = x['my_eq'] - 0.5; x['nut_adv'] = x['my_nut'] - x['his_nut']; x['strong_adv'] = x['my_strong'] - x['his_strong']; x['air_adv'] = x['my_air'] - x['his_air']; x['sd_adv'] = x['my_sd'] - x['his_sd']; x['top_adv'] = x['my_q90'] - x['his_q90']
            # how much the next card moves the range's hands, and how much of its equity is drawn
            sw = [(h['w'], (h['down'] or 0) + (h['up'] or 0)) for h in hs if h.get('down') is not None]; x['swing'] = sum(w * v for w, v in sw) / sum(w for w, _ in sw) if sw else np.nan
            dr = [(h['w'], h['draw']) for h in hs if h.get('draw') is not None]; x['drawn'] = sum(w * v for w, v in dr) / sum(w for w, _ in dr) if dr else (0.0 if n == 5 else np.nan)
            x['draws'] = sum(h['w'] for h in hs if h['fo'] >= 8 or h['so'] >= 8) / W
            if not facing:
                bets = [i for i, k in enumerate(kinds) if k in ('bet', 'allin')]
                if not bets: continue
                sizes = [acts[i]['add'] / d['pot'] for i in bets]; fr = [acts[i]['freq'] for i in bets]; bet = sum(fr)
                x.update(kind='bet', y=bet, size=sum(a * b for a, b in zip(fr, sizes)) / bet if bet > 0.01 else np.nan, smin=min(sizes), smax=max(sizes), nsizes=len(sizes), first=float(tail == 'first'))
                # the bets in two parts: from hands ahead of his range (value) and from hands behind it (bluffs), and the equity
                # the value bets start from: the level b with as much of the range above it as bets for value
                pb = [sum(h['p'][i] for i in bets) for h in hs]; V = sum(h['w'] * q for h, q in zip(hs, pb) if h['e'] >= 0.5) / W; B = sum(h['w'] * q for h, q in zip(hs, pb) if h['e'] < 0.5) / W
                t0 = thresholds(mine, his, min(sizes)); x.update(V=V, B=B, b_eff=mine.quantile(1 - V) if V > 0.002 else 1.0, vn_b=t0['value'], vn_a=t0['bluff'], vn_ratio=min(sizes) / (1 + min(sizes)), me=mine.e, mw=mine.w, strong_share=1 - mine.below(0.5))
                for name, s in [('min', min(sizes)), ('max', max(sizes)), ('mid', sorted(sizes)[len(sizes) // 2])]:
                    t = thresholds(mine, his, s); x[f'vn_{name}'] = t['freq']
                    rt = min(3 * s, x['spr']) if n == 3 else 0.0; x[f'vnr_{name}'] = thresholds(mine, his, s, rt)['freq']
                # what he does, as the solver has it (not known before solving): to the bets, and with the lead when checked to
                pre = d['line'][:-len(tail)]; got = [(acts[i]['freq'], recs.get((d['spot'], d['board'], pre + ('b' if tail == 'first' else 'xb') + str(i)))) for i in bets]; got = [(q, r) for q, r in got if r is not None and q > 0]
                tot = sum(q for q, _ in got); fr_of = lambda r, ks: sum(a['freq'] for a in r['actions'] if a['kind'] in ks)
                x['he_folds'] = sum(q * fr_of(r, ('fold',)) for q, r in got) / tot if tot else np.nan; x['he_raises'] = sum(q * fr_of(r, ('raise', 'allin')) for q, r in got) / tot if tot else np.nan
                if tot: x['he_folds_over'] = x['he_folds'] - sum(q * (r['toCall'] / r['pot']) for q, r in got) / tot   # against the price of the bets
                nxt = recs.get((d['spot'], d['board'], pre + 'x')) if tail == 'first' else None; x['he_stabs'] = fr_of(nxt, ('bet', 'allin')) if nxt else np.nan
            else:
                s = d['toCall'] / pot0; x.update(kind='face', s=s, alpha=s / (1 + s), y=sum(a['freq'] for a in acts if a['kind'] == 'fold'), y_raise=sum(a['freq'] for a in acts if a['kind'] in ('raise', 'allin')), bettor_ip=1 - x['ip'])
                x['y_call'] = 1 - x['y'] - x['y_raise']; x['fold_bets'] = fold_from_bets(his, s)
                src = source_key(d['line']); prior = recs.get((d['spot'], d['board'], src[0])) if src else None
                if prior:
                    # the bettor's range before the bet, and ours as it faced it then
                    pm = Dist([h['e'] for h in prior['hands']], [h['w'] for h in prior['hands']]); t = thresholds(pm, mine, s); x['fold_thr'] = t['fold']; x['bettor_freq'] = prior['actions'][src[1]]['freq']; x['bettor_all'] = sum(a['freq'] for a in prior['actions'] if a['kind'] in ('bet', 'allin')); x['prior_adv'] = pm.mean() - 0.5
                x['raise_allowed'] = float(any(a['kind'] == 'raise' for a in acts)); x['allin_only'] = float(any(a['kind'] == 'allin' for a in acts) and not any(a['kind'] == 'raise' for a in acts))
            rows.append(x)
    return pd.DataFrame(rows)
logit = lambda p: np.log(np.clip(p, 0.01, 0.99) / (1 - np.clip(p, 0.01, 0.99)))
expit = lambda z: 1 / (1 + np.exp(-z))
