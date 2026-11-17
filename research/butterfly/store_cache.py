# The decisions read from poker-huerosolver's stored solves (store.mjs) as arrays, with three answers a decision:
# first to act: check / bet (up to the pot) / bet big (over the pot, the all-in included); facing a bet or raise: fold / call / raise.
# For every hand, what each answer loses against the hand's best action (in pots at the decision). Flop and turn come from the
# full hands (one bet size on the turn, one raise a street); the river from the river set with two raises, 33/75/150% and all-in.
#   STORE=<dir of store.mjs rows> python3 research/butterfly/store_cache.py   ->  <dir>/cache3.npz, cache3-decisions.json (not committed)
import json, os, sys, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']
exec(open(os.path.join(HERE, 'analyse.py')).read().split('# ---------------------------------------------------------------- read')[0])   # row_of, cards
def group_value(P, Q, idx):
    """A group of actions as the solver mixes them for the hand, or its best member where the solver never takes it."""
    if not idx: return None
    pa = P[:, idx]; s = pa.sum(1); return np.where(s > 0.02, (pa * Q[:, idx]).sum(1) / np.maximum(s, 1e-9), Q[:, idx].max(1)), s
H = {k: [] for k in ('dec', 'w', 'e', 'row', 'draw', 'frac', 'l0', 'l1', 'l2', 'p1', 'p2')}; Dn = []
for name, streets in (('fullhand', (0, 1)), ('river-real', (2,))):
    for text in open(os.path.join(STORE, name + '.jsonl')):
        if name == 'fullhand' and text.count(' ', text.index('"board":"'), text.index('"board":"') + 24) >= 4: continue      # the full hands' rivers are not used
        d = json.loads(text); board = cards(d['board']); street = len(board) - 3
        if street not in streets: continue
        acts = d['actions']; kinds = [a['kind'] for a in acts]; first = d['toCall'] <= 0; hs = d['hands']; vr = d['vr']
        w = np.array([h['w'] for h in hs]); e = np.array([h['e'] for h in hs]); P = np.array([h['p'] for h in hs]); Q = np.array([[x if x is not None else -9 for x in h['q']] for h in hs])
        if first:
            if 'check' not in kinds: continue
            g0 = [kinds.index('check')]; bets = [i for i, k in enumerate(kinds) if k in ('bet', 'allin')]; g1 = [i for i in bets if acts[i]['add'] / d['pot'] <= 1.0]; g2 = [i for i in bets if acts[i]['add'] / d['pot'] > 1.0]
        else:
            if 'fold' not in kinds or 'call' not in kinds: continue
            g0 = [kinds.index('fold')]; g1 = [kinds.index('call')]; g2 = [i for i, k in enumerate(kinds) if k in ('raise', 'allin')]
        if not g1 and not g2: continue
        v0, _ = group_value(P, Q, g0); a1 = group_value(P, Q, g1); a2 = group_value(P, Q, g2); top = Q.max(1)
        v1, p1 = a1 if a1 else a2; v2, p2 = a2 if a2 else a1                      # an answer the tree does not offer is played as the other
        if not a1: p1 = np.zeros(len(hs))
        if not a2: p2 = np.zeros(len(hs))
        row = np.array([row_of(cards(h['h']), board) for h in hs]); fo = np.array([h['fo'] for h in hs]); so = np.array([h['so'] for h in hs]); draw = np.where(fo >= 9, 3, np.where(so >= 8, 2, np.where(so >= 4, 1, 0)))
        vw = np.array([x[1] for x in vr]); ve = np.array([x[2] for x in vr]); vrow = np.array([row_of(cards(x[0]), board) for x in vr]); vw = vw / vw.sum(); w = w / w.sum()
        frac = np.zeros(len(hs))
        for r in range(8):
            m = np.where(row == r)[0]
            if len(m): oo = m[np.argsort(e[m], kind='stable')]; frac[oo] = (np.cumsum(w[oo]) - w[oo] / 2) / w[oo].sum()
        flop = re.search(r'f\d+', d['spot']).group(0); sizes = sorted(round(acts[i]['add'] / d['pot'], 2) for i in (g1 + g2)) if first else []
        Dn.append(dict(spot=d['spot'], flop=flop, set=name, pre=d['pre'], pot_type=d['action'], line=d['line'], street=street, seat=d['seat'], first=first, faced=d['faced'] if not first else 'none', role=d['role'], board=d['board'],
                       pot=d['pot'], toCall=d['toCall'], behind=d['behind'], spr=d['behind'] / d['pot'], price=d['toCall'] / (d['pot'] + d['toCall']) if not first else 0.0, share=d['share'], n=len(hs), has1=bool(a1), has2=bool(a2), sizes=sizes,
                       act1=float((w * p1).sum()), act2=float((w * p2).sum()), my_eq=float((w * e).sum()), his_weak=float(vw[ve < .3].sum()), my_ends=float(w[(e < .3) | (e >= .8)].sum()), his_strong=float(vw[ve >= .8].sum()), my_strong=float(w[e >= .8].sum()),
                       tp_lead=float(w[row >= 4].sum() - vw[vrow >= 4].sum()), my_rows=[float(w[row == r].sum()) for r in range(8)], his_rows=[float(vw[vrow == r].sum()) for r in range(8)]))
        k = len(Dn) - 1
        for key, val in (('dec', np.full(len(hs), k)), ('w', w), ('e', e), ('row', row), ('draw', draw), ('frac', frac), ('l0', top - v0), ('l1', top - v1), ('l2', top - v2), ('p1', p1), ('p2', p2)): H[key].append(val)
    print(f'read {name}: {len(Dn)} decisions', file=sys.stderr)
np.savez_compressed(os.path.join(STORE, 'cache3.npz'), **{k: np.concatenate(v).astype(np.int32 if k in ('dec', 'row', 'draw') else np.float32) for k, v in H.items()})
json.dump(Dn, open(os.path.join(STORE, 'cache3-decisions.json'), 'w')); print(f'{len(Dn)} decisions, {sum(len(x) for x in H["w"])} hands', file=sys.stderr)
