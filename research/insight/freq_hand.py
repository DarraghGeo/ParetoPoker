# The range's bet frequency as the sum of its hands' own tendencies: each hand's chance of betting from what it is
# (its equity, where it stands in the range, its draws) and the spot, added up over the range.
import sys; sys.path.insert(0, 'research/insight')
import warnings; warnings.filterwarnings('ignore')
from freq_lib import *
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
dec = pd.read_pickle('research/insight/out/decisions.pkl'); dec['lspr'] = np.log(dec.spr.clip(0.05, 30))
CTX = ['ip', 'raiser', 'adv', 'strong_adv', 'nut_adv', 'air_adv', 'sd_adv', 'my_sd', 'his_sd', 'my_nut', 'his_nut', 'my_air', 'his_air', 'lspr', 'two_tone', 'monotone', 'paired', 'connected', 'high', 'vn_b', 'vn_a', 'vn_min', 'smin', 'swing']
def hands(street):
    """Every hand at the betting decisions of a street, read lean: only what the model uses."""
    import glob, re as _re
    keep = dec[(dec.kind == 'bet') & (dec.street == street)].set_index('key')[['first'] + CTX]; rows = []
    for f in sorted(glob.glob('research/insight/out/hands-*.jsonl')):
        for line in open(f):
            d = json.loads(line)
            if len(d['board'].replace(' ', '')) != 2 * street or d['toCall'] > 0: continue
            key = f"{d['spot']}|{d['board']}|{d['line']}"
            if key not in keep.index: continue
            bets = [i for i, a in enumerate(d['actions']) if a['kind'] in ('bet', 'allin')]; hs = sorted(d['hands'], key=lambda h: h['e']); W = sum(h['w'] for h in hs); cum = 0
            for h in hs:
                cum += h['w']; rows.append((key, d['spot'], h['w'], sum(h['p'][i] for i in bets), h['e'], cum / W, h.get('now'), h.get('draw'), h.get('top'), h.get('down'), h.get('up'), float(h['fo'] >= 8 or h['so'] >= 8), float(4 <= h['so'] < 8), float(h['own'] >= 1), h['made']))
    x = pd.DataFrame(rows, columns=['dkey', 'spot', 'w', 'bet', 'e', 'rank', 'now', 'draw', 'vtop', 'down', 'up', 'isdraw', 'gutf', 'pairf', 'made']).astype({c: 'float32' for c in ['w', 'bet', 'e', 'rank', 'now', 'draw', 'vtop', 'down', 'up', 'isdraw', 'gutf', 'pairf', 'made']})
    x = x.join(keep.astype('float32'), on='dkey'); x['above_b'] = x.e - x.vn_b; x['below_a'] = x.vn_a - x.e
    return x
HF = ['e', 'rank', 'now', 'draw', 'vtop', 'down', 'up', 'above_b', 'below_a', 'isdraw', 'gutf', 'pairf', 'made', 'first'] + CTX
def run(street, name):
    x = hands(street).reset_index(drop=True); g = pd.factorize(x.spot)[0] % 6; pred = np.zeros(len(x)); X = x[HF].to_numpy(float); y = x.bet.to_numpy(float)
    for k in range(6):
        tr, te = g != k, g == k; m = HistGradientBoostingRegressor(max_iter=300, max_depth=6, learning_rate=0.06, min_samples_leaf=40, l2_regularization=1.0).fit(X[tr], y[tr], sample_weight=x.w[tr]); pred[te] = np.clip(m.predict(X[te]), 0, 1)
    x['pred'] = pred; agg = x.groupby('dkey').apply(lambda t: pd.Series(dict(y=(t.w * t.bet).sum() / t.w.sum(), p=(t.w * t.pred).sum() / t.w.sum(), vn=t.vn_min.iloc[0]))); err = (agg.p - agg.y).abs()
    print(f'{name}: {len(agg)} decisions, {len(x):,} hands. Base misses by {(agg.vn - agg.y).abs().mean():.3f}; hands added up, on flops left out, {err.mean():.3f}; within 5 points on {np.mean(err < 0.05):.0%}, within 10 on {np.mean(err < 0.1):.0%}; worst tenth {err.quantile(0.9):.2f}')
    return x, agg
if __name__ == '__main__':
    run(3, 'Flop'); run(4, 'Turn')
