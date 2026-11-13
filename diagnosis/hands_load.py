"""Loads diagnosis/hands/<set>.jsonl (from diagnosis/hands.mjs) into one table, a row per hand per decision."""
import json, numpy as np, pandas as pd

TAU = 0.005  # an action costing more than this share of the pot is a mistake for the hand

def load(*sets, folder='diagnosis/hands'):
    rows = []
    did = 0
    for s in sets:
        for line in open(f'{folder}/{s}.jsonl'):
            d = json.loads(line)
            types = [a['type'] for a in d['actions']]
            agg = [i for i, a in enumerate(d['actions']) if a['size'] is not None]
            passive = types.index('fold') if 'fold' in types else types.index('check')
            call = types.index('call') if 'call' in types else None
            fr = d['frequencies']
            base = dict(did=did, set=s, spot=d['spot'], pair=d['pair'], depth=d['depth'], board=d['board'], street=d['street'], position=d['position'],
                        kind=d['kind'], line=d['line'], faced=d['faced'], spr=d['spr'], rangeEq=d['rangeEquity'], nutShare=d['nutShare'], hisNutShare=d['hisNutShare'],
                        airShare=d['airShare'], hisAirShare=d['hisAirShare'], paired=d['paired'], maxSuit=d['maxSuit'], straighty=d['straighty'], high=d['high'],
                        fAgg=sum(fr[i] for i in agg), fCall=fr[call] if call is not None else 0.0, fPassive=fr[passive], nAgg=len(agg),
                        mainSize=d['actions'][d['main']]['size'] if d['main'] is not None else np.nan,
                        foldsMain=(d['folds'][agg.index(d['main'])] if d['main'] is not None else np.nan))
            for h in d['hands']:
                s_, g = h['s'], h['gap']
                r = dict(base)
                r.update({k: h[k] for k in ('hand', 'w', 'eq', 'rank', 'rankNow', 'now', 'drawEq', 'swing', 'ehs2', 'best', 'up', 'down', 'implied', 'spread', 'slope', 'pair_', 'draw', 'eqTop', 'bTop', 'bBot', 'bAll', 'bFold', 'bCont', 'eqCalled') if k in h})
                r['pairClass'] = h['pair']
                r['pAgg'] = sum(s_[i] for i in agg)
                r['pCall'] = s_[call] if call is not None else 0.0
                r['pPassive'] = s_[passive]
                r['gPassive'] = g[passive]
                r['gCall'] = g[call] if call is not None else np.nan
                r['gAgg'] = min(g[i] for i in agg) if agg else np.nan
                # the big and the small size, when there are several
                if agg:
                    best = min(agg, key=lambda i: g[i])
                    r['bestSize'] = d['actions'][best]['size']
                    r['pBig'] = s_[agg[-1]] if len(agg) > 1 else np.nan
                    r['pSmall'] = s_[agg[0]]
                rows.append(r)
            did += 1
    df = pd.DataFrame(rows)
    for c in ('bFold', 'bCont', 'eqCalled'):
        df[c] = df[c].astype(float)
    # status of aggression (bet or raise) and of continuing (call or raise) for each hand
    other = df[['gPassive', 'gCall']].min(axis=1)
    df['aggStatus'] = np.where(df.gAgg.isna(), 'none', np.where(other > TAU, 'must', np.where(df.gAgg > TAU, 'cant', 'optional')))
    cont = df[['gCall', 'gAgg']].min(axis=1)
    df['contStatus'] = np.where(df.kind == 'open', 'none', np.where(df.gPassive > TAU, 'must', np.where(cont > TAU, 'cant', 'optional')))
    df['pCont'] = df.pCall + df.pAgg
    df['blockEdge'] = df.bTop - df.bBot       # blocks his best more than his worst
    df['foldEdge'] = df.bCont - df.bFold      # blocks what continues more than what folds
    return df

def wmean(x, w):
    return float(np.sum(x * w) / np.sum(w)) if np.sum(w) > 0 else float('nan')
