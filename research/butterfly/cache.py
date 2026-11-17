# The stored solved decisions (research/insight/out) read once into arrays, for the heuristics study: every hand of every
# decision with what the chart shows of it, and every decision with what a player can see, count or read of the spot.
#   python3 research/butterfly/cache.py   ->  research/butterfly/cache.npz (not committed)
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', 'insight', 'out')
exec(open(os.path.join(HERE, 'analyse.py')).read().split('# ---------------------------------------------------------------- read')[0])   # row_of, cards, role_of, FILES

def bands(w, e):
    """A range by equity against the other: shares under 20%, 20-30, 30-50, 50-65, 65-80, 80%+."""
    t = w.sum(); edges = [0, .2, .3, .5, .65, .8, 1.01]
    return [float(w[(e >= a) & (e < b)].sum() / t) for a, b in zip(edges, edges[1:])]

H = {k: [] for k in ('dec', 'w', 'e', 'now', 'draw', 'top', 'f', 'row', 'frac', 'grank', 'fo', 'so', 'pocket')}
Dn = []
for name in FILES:
    path = os.path.join(DATA, name + '.jsonl')
    if not os.path.exists(path): continue
    for text in open(path):
        d = json.loads(text); vr = d.get('vr')
        if not vr or not d['hands']: continue
        board = cards(d['board']); acts = d['actions']; first = d['toCall'] <= 0; kinds = [a['kind'] for a in acts]
        wag = [i for i, k in enumerate(kinds) if k in WAGER]; fold = kinds.index('fold') if 'fold' in kinds else -1
        if (first and not wag) or (not first and fold < 0): continue
        hs = [h for h in d['hands'] if h['e'] is not None and h['w'] > 0]
        if len(hs) < 8: continue
        w = np.array([h['w'] for h in hs]); e = np.array([h['e'] for h in hs]); P = np.array([h['p'] for h in hs])
        f = P[:, wag].sum(axis=1) if first else 1 - P[:, fold]
        raises = P[:, wag].sum(axis=1) if not first else np.zeros(len(hs))
        row = np.array([row_of(cards(h['h']), board) for h in hs])
        vw = np.array([x[1] for x in vr]); ve = np.array([x[2] if x[2] is not None else 0.5 for x in vr]); vrow = np.array([row_of(cards(x[0]), board) for x in vr])
        frac = np.zeros(len(hs)); o = np.argsort(e, kind='stable'); grank = np.zeros(len(hs)); grank[o] = (np.cumsum(w[o]) - w[o] / 2) / w.sum()   # place in the whole range by equity
        for r in range(8):
            m = np.where(row == r)[0]
            if len(m): oo = m[np.argsort(e[m], kind='stable')]; frac[oo] = (np.cumsum(w[oo]) - w[oo] / 2) / w[oo].sum()
        ms = np.array([w[row == r].sum() for r in range(8)]) / w.sum(); hsr = np.array([vw[vrow == r].sum() for r in range(8)]) / max(vw.sum(), 1e-9)
        sizes = [acts[i]['add'] / d['pot'] for i in wag] if first else []
        main = max(wag, key=lambda i: acts[i]['freq']) if wag else -1
        k = len(Dn)
        Dn.append(dict(spot=d['spot'], pre=d['pre'], pot_type=d['action'], line=d['line'], street=len(board) - 3, seat=d['seat'], first=first, role=role_of(d), board=d['board'],
                       pot=d['pot'], toCall=d['toCall'], behind=d['behind'], spr=d['behind'] / max(d['pot'], 1e-9), price=(d['toCall'] / (d['pot'] + d['toCall'])) if not first else 0.0,
                       bet=(d['toCall'] / max(d['pot'] - d['toCall'], 1e-9)) if not first else 0.0,       # the bet faced, as a share of the pot before it
                       sizes=sizes, main_size=(acts[main]['add'] / d['pot'] if first and main >= 0 else 0.0), small=min(sizes) if sizes else 0.0,
                       act=float((w * f).sum() / w.sum()), raise_=float((w * raises).sum() / w.sum()), mix=float(w[(f > .1) & (f < .9)].sum() / w.sum()),
                       my_rows=ms.tolist(), his_rows=hsr.tolist(), my_bands=bands(w, e), his_bands=bands(vw, ve), my_eq=float((w * e).sum() / w.sum()), his_eq=float((vw * ve).sum() / vw.sum()),
                       n=len(hs), reach=d.get('reach'), exploit=d.get('exploit'),
                       paired=len({c[0] for c in board}) < len(board), suits=max(sum(c[1] == s for c in board) for s in 'shdc'), high=max(c[0] for c in board)))
        H['dec'].append(np.full(len(hs), k)); H['w'].append(w / w.sum()); H['e'].append(e); H['f'].append(f); H['row'].append(row); H['frac'].append(frac); H['grank'].append(grank)
        H['now'].append(np.array([h['now'] if h.get('now') is not None else h['e'] for h in hs])); H['draw'].append(np.array([h.get('draw') or 0 for h in hs])); H['top'].append(np.array([h['top'] if h.get('top') is not None else np.nan for h in hs]))
        H['fo'].append(np.array([h.get('fo') or 0 for h in hs])); H['so'].append(np.array([h.get('so') or 0 for h in hs])); H['pocket'].append(np.array([h['h'][0] == h['h'][2] for h in hs]))
    print(f'read {name}: {len(Dn)} decisions', file=sys.stderr)
np.savez_compressed(os.path.join(HERE, 'cache.npz'), **{k: np.concatenate(v).astype(np.float32 if k not in ('dec', 'row') else np.int32) for k, v in H.items()})
json.dump(Dn, open(os.path.join(HERE, 'cache-decisions.json'), 'w'))
print(f'{len(Dn)} decisions, {sum(len(x) for x in H["w"])} hands', file=sys.stderr)
