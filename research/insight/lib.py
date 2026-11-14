# Loads the collected decisions into one table, a row a hand, with the properties a player would name:
# kicker, redraws, backdoor draws and how good they are, overcards, blockers, how exposed the hand is to the next card.
import glob, json, numpy as np, pandas as pd
R = '23456789TJQKA'; ORDER = ['UTG', 'HJ', 'CO', 'BU', 'SB', 'BB']
def cards(t): t = t.replace(' ', ''); return [(R.index(t[i]), t[i + 1]) for i in range(0, len(t), 2)]
def aggressor(action, oop, ip):
    """Who raised last before the flop: 0 out of position, 1 in position."""
    first = oop if ORDER.index(oop) < ORDER.index(ip) else ip   # acts first before the flop: the opener
    last = ip if first == oop else oop
    who = {'SRP': first, '3BP': last, '4BP': first, 'Squeeze': oop}[action]
    return 0 if who == oop else 1
def texture(b):
    rk = sorted([r for r, _ in b], reverse=True); su = [s for _, s in b]; n = max(su.count(s) for s in 'shdc')
    uniq = sorted(set(rk)); span = 0
    for lo in range(-1, 9):
        run = {12 if lo + k == -1 else lo + k for k in range(5)}; span = max(span, len(run & set(uniq)))
    return dict(top=rk[0], paired=len(set(rk)) < len(rk), suited=n, conn=span, mid=rk[1], low=rk[-1])
def runner_straights(b, h):
    allr = {r for r, _ in b} | {r for r, _ in h}; br = {r for r, _ in b}; ways = 0
    for lo in range(-1, 9):
        run = [12 if lo + k == -1 else lo + k for k in range(5)]
        if sum(r in allr for r in run) == 3 and sum(r in br for r in run) < 3: ways += 1
    return ways
def props(board, hand, made, own, pair, fo, so):
    b = cards(board); h = cards(hand); br = [r for r, _ in b]; hr = sorted([r for r, _ in h], reverse=True); flop = len(b) == 3
    top = max(br); out = {}
    out['pocket'] = hr[0] == hr[1]; out['suited'] = h[0][1] == h[1][1]
    out['hi'], out['lo'] = hr
    out['over'] = sum(r > top for r in hr) if made == 0 or (made == 1 and own == 0) else 0   # overcards, for unpaired hands
    # one pair made with one hole card: the other card is the kicker
    kick = None
    if own == 1 and made in (1, 2) and not out['pocket']:
        hit = [r for r in hr if r in br]; rest = [r for r in hr if r not in br]
        if len(hit) == 1 and rest: kick = rest[0]
    out['kick'] = kick
    out['kick_over'] = kick is not None and kick > top                       # kicker above the whole board
    better = [r for r in range(12, -1, -1) if r not in br]                    # kickers from the best down
    out['kick_rank'] = better.index(kick) if kick is not None else None       # 0: the best kicker there is
    # suits
    fl = None; bdf = None; bdf_two = False
    for s in 'shdc':
        mine = [r for r, x in h if x == s]; nb = sum(1 for _, x in b if x == s)
        if not mine: continue
        above = sum(1 for r in range(max(mine) + 1, 13) if (r, s) not in b)   # cards of the suit that beat ours
        if len(mine) + nb == 4 and nb <= 3 and made < 5: fl = above
        if flop and len(mine) + nb == 3: bdf = above if bdf is None else min(bdf, above); bdf_two = bdf_two or len(mine) == 2
    out['fd'] = fo >= 8; out['fd_nut'] = fl if fo >= 8 else None
    out['bdf'] = flop and bdf is not None and fo < 8; out['bdf_nut'] = bdf if out['bdf'] else None; out['bdf_two'] = bool(out['bdf'] and bdf_two)
    out['oesd'] = so >= 8; out['gut'] = 4 <= so < 8
    out['ways'] = runner_straights(b, h) if flop and so < 4 and made < 4 else 0
    out['bds'] = out['ways'] >= 2
    out['blocker_fd'] = None
    # holding the ace or king of a suit the board has two or three of, without the draw
    for s in 'shdc':
        nb = sum(1 for _, x in b if x == s)
        if nb >= 2 and fo < 8 and made < 5: out['blocker_fd'] = any(x == s and r >= 11 for r, x in h) or bool(out['blocker_fd'])
    return out
NAMES = {0: 'high card', 1: 'pair', 2: 'two pair', 3: 'trips', 4: 'straight', 5: 'flush', 6: 'full house', 7: 'quads', 8: 'straight flush'}
def klass(r):
    """One name a hand, by what it is now."""
    if r.made >= 4 and r.own > 0: return 'straight+'
    if r.made == 3 and r.own > 0: return 'set' if r.pocket else 'trips'
    if r.made == 2 and r.own >= 1 and not r.board_paired: return 'two pair'
    if r['pair'] == 'overpair': return 'overpair'
    if r['pair'] == 'top pair': return 'top pair'
    if r['pair'] == 'middle pair': return 'pocket below top' if r.pocket else 'middle pair'
    if r['pair'] == 'bottom pair': return 'bottom pair'
    if r['pair'] == 'underpair': return 'underpair'
    if r.own == 0 or r.made == 0: return 'no pair'
    return 'other'
def load(pattern='research/insight/out/hands-*.jsonl', street=None, raised=False):
    rows = []
    for f in sorted(glob.glob(pattern)):
        for line in open(f):
            try: d = json.loads(line)
            except Exception: continue
            n = len(d['board'].replace(' ', '')) // 2
            if street and n != street: continue
            if bool(__import__('re').search(r'b\d+r\d+', d['line'].split('|')[0])) != raised: continue   # the bettor facing a raise is its own question
            tx = texture(cards(d['board'])); acts = d['actions']; kinds = [a['kind'] for a in acts]
            agg = aggressor(d['action'], d['oop'], d['ip']); key = d['spot'] + '|' + d['line'] + '|' + d['board']
            bets = [i for i, k in enumerate(kinds) if k in ('bet', 'allin', 'raise')]; W = sum(h['w'] for h in d['hands'])
            if W < 1: continue
            req = sum(h['w'] * h['e'] for h in d['hands']) / W
            for h in d['hands']:
                p = h['p']; x = dict(key=key, spot=d['spot'], pre=d['pre'], action=d['action'], line=d['line'], seat=d['seat'], ip=d['seat'] == 1, pfa=agg == d['seat'], cards=n, board=d['board'].replace(' ', ''),
                         pot=d['pot'], toCall=d['toCall'], spr=d['behind'] / d['pot'], facing=d['toCall'] > 0, range_eq=req, board_paired=tx['paired'], board_suited=tx['suited'], board_top=tx['top'], board_conn=tx['conn'],
                         hand=h['h'], w=h['w'], e=h['e'], now=h['now'], draw=h['draw'], vtop=h['top'], down=h['down'], up=h['up'], made=h['made'], own=h['own'], pair=h['pair'], fo=h['fo'], so=h['so'], v=(h['v'] + 0.5) if h.get('v') is not None else None)
                x.update(props(d['board'], h['h'], h['made'], h['own'], h['pair'], h['fo'], h['so']))
                if d['toCall'] > 0:
                    x['fold'] = sum(p[i] for i, k in enumerate(kinds) if k == 'fold'); x['call'] = sum(p[i] for i, k in enumerate(kinds) if k == 'call'); x['raise'] = sum(p[i] for i in bets); x['bet'] = None; x['size'] = None
                    x['price'] = d['toCall'] / (d['pot'] + d['toCall'])
                else:
                    bet = sum(p[i] for i in bets); x['bet'] = bet; x['check'] = 1 - bet
                    sz = [acts[i]['add'] / d['pot'] for i in bets]; x['size'] = sum(p[i] * s for i, s in zip(bets, sz)) / bet if bet > 0.02 else None
                    x['nsizes'] = len(bets); x['smax'] = max(sz) if sz else None; x['smin'] = min(sz) if sz else None
                    # how he answers our bets, seen through this hand's cards: averaged over the bets the range uses
                    fr = [(acts[i]['freq'], h['re'][i]) for i in bets if h['re'][i] and h['re'][i][0] is not None and acts[i]['freq'] > 0.03]
                    tot = sum(a for a, _ in fr); x['hefolds'] = sum(a * r[0] for a, r in fr) / tot if tot else None; x['heraises'] = sum(a * r[1] for a, r in fr) / tot if tot else None
                    x['betfreq_range'] = sum(acts[i]['freq'] for i in bets)
                rows.append(x)
    d = pd.DataFrame(rows); d['klass'] = d.apply(klass, axis=1)
    return d
def wmean(x, col, w='w'):
    x = x[x[col].notna()]; return (x[w] * x[col]).sum() / x[w].sum() if len(x) and x[w].sum() > 0 else np.nan
def paired(d, A, B, cols, by='key', cluster='spot', min_w=0.5, match=None, width=0.05):
    """Hands A against hands B inside the same decision (and, with match, at about the same value of that column):
    the mean difference decision by decision, then averaged over flops, with a t over flops."""
    rows = []
    for key, x in d.groupby(by):
        a, b = x[A(x)], x[B(x)]
        if a.w.sum() < min_w or b.w.sum() < min_w: continue
        if match:
            # reweight B to A's spread of the matched column, bin by bin
            bins = np.floor(x[match] / width); parts = []; wsum = 0
            for k in set(bins[A(x)]) & set(bins[B(x)]):
                aa, bb = a[np.floor(a[match] / width) == k], b[np.floor(b[match] / width) == k]
                if aa.w.sum() < 0.1 or bb.w.sum() < 0.1: continue
                wt = aa.w.sum(); parts.append((wt, {c: wmean(aa, c) - wmean(bb, c) for c in cols})); wsum += wt
            if wsum < min_w * 0.5: continue
            row = {c: np.nansum([wt * p[c] for wt, p in parts if not np.isnan(p[c])]) / max(1e-9, sum(wt for wt, p in parts if not np.isnan(p[c]))) if any(not np.isnan(p[c]) for _, p in parts) else np.nan for c in cols}
        else: row = {c: wmean(a, c) - wmean(b, c) for c in cols}
        row.update(key=key, cl=x[cluster].iloc[0], pre=x.pre.iloc[0], board=x.board.iloc[0], line=x.line.iloc[0], seat=x.seat.iloc[0]); rows.append(row)
    return pd.DataFrame(rows)
def verdict(r, cols, label='', show=True):
    out = {}
    if not len(r): 
        if show: print(f'  {label:<58} no data')
        return out
    g = r.groupby('cl')[cols].mean(); text = f'  {label:<58} flops {len(g):3d}'
    for c in cols:
        v = g[c].dropna(); t = v.mean() / (v.std(ddof=1) / np.sqrt(len(v))) if len(v) > 2 and v.std(ddof=1) > 0 else np.nan
        agree = (np.sign(v) == np.sign(v.mean())).mean() if len(v) else np.nan
        out[c] = dict(mean=v.mean(), t=t, agree=agree, n=len(v)); text += f'   {c} {v.mean():+.3f} (t {t:+.1f}, {agree:.0%})'
    if show: print(text)
    return out
def context(d):
    """One row a decision: the things about the spot that could turn an idea on or off."""
    def one(x):
        r = dict(ip=float(x.ip.iloc[0]), raiser=float(x.pfa.iloc[0]), spr=x.spr.iloc[0], range_eq=x.range_eq.iloc[0], two_tone=float(x.board_suited.iloc[0] == 2), monotone=float(x.board_suited.iloc[0] == 3), connected=float(x.board_conn.iloc[0] >= 3),
                 paired=float(x.board_paired.iloc[0]), high_board=float(x.board_top.iloc[0] >= 11), low_board=float(x.board_top.iloc[0] <= 8), srp=float(x.action.iloc[0] == 'SRP'), fourbet=float(x.action.iloc[0] == '4BP'))
        if 'heraises' in x and x.heraises.notna().any(): r['he_raises'] = wmean(x, 'heraises'); r['he_folds'] = wmean(x, 'hefolds'); r['range_bets'] = x.betfreq_range.iloc[0]
        if x.facing.iloc[0]: r['price'] = x.price.iloc[0]; r['range_raises'] = wmean(x, 'raise'); r['range_folds'] = wmean(x, 'fold')
        return r
    return pd.DataFrame({k: one(x) for k, x in d.groupby('key')}).T.astype(float)
def moderators(r, ctx, col, top=4, show=True, floor=12):
    """Where an effect is larger or smaller: each feature of the spot against the effect, decision by decision."""
    x = r.set_index('key').join(ctx, how='left'); out = []
    for c in ctx.columns:
        v = x[[col, c]].dropna()
        if len(v) < floor or v[c].std() == 0: continue
        rho = np.corrcoef(v[col], v[c])[0, 1]
        if set(v[c].unique()) <= {0.0, 1.0}: lo, hi = v[v[c] == 0][col], v[v[c] == 1][col]
        else: m = v[c].median(); lo, hi = v[v[c] <= m][col], v[v[c] > m][col]
        if len(lo) < 4 or len(hi) < 4: continue
        out.append((abs(rho), c, rho, lo.mean(), hi.mean(), len(lo), len(hi)))
    out.sort(reverse=True)
    if show:
        for _, c, rho, lo, hi, nl, nh in out[:top]: print(f'        {col} by {c:<12} r {rho:+.2f}   low/no {lo:+.3f} ({nl})   high/yes {hi:+.3f} ({nh})')
    return out
