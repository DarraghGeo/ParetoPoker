# River bets across the range sweep (sweep.mjs): how often, which equity bands, bluffs per value bet, by depth and by read.   python3 research/engine/sweep_bets.py
import json, glob, os
import numpy as np
R=[]
for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'sweep-*.jsonl')):
    for t in open(f): R.append(json.loads(t))
print(len(R), 'rivers')
def arr(key, f): return np.array([f(r['at'][key], r) for r in R if key in r['at']])
for key in ('ip checked to','oop first'):
    D=[(r['at'][key], r) for r in R if key in r['at']]
    bands=np.array([d['bands'] for d,_ in D])  # n,10,4 : share, quiet, call, loud
    sh=bands[:,:,0]; bet=bands[:,:,3]; freq=(sh*bet).sum(1)
    val=(sh[:,5:]*bet[:,5:]).sum(1); blf=(sh[:,:5]*bet[:,:5]).sum(1); air=(sh[:,:3]*bet[:,:3]).sum(1)
    print(f"\n== {key}: {len(D)} decisions; bets {freq.mean():.3f} (sd {freq.std():.3f}); never bets (<2%) in {np.mean(freq<.02):.2f}, bets over 90% in {np.mean(freq>.9):.2f}")
    print(' bet rate by equity band (0-10% ... 90-100%), weighted:', np.round((sh*bet).sum(0)/sh.sum(0),2))
    print(' share of range by band:', np.round(sh.mean(0),3))
    ok=val>0.02
    print(f" bluffs (under 50%) per value bet (50%+): median {np.median(blf[ok]/val[ok]):.2f}, quartiles {np.percentile(blf[ok]/val[ok],[25,75]).round(2)}; the ratio rule says {0.75/1.75:.2f}")
    print(f" air (under 30%) per value bet: median {np.median(air[ok]/val[ok]):.2f}")
    # by stack
    for st in (40,75,125,250,500):
        m=np.array([r['stack']==st for _,r in D]); print(f"  stack {st}: bets {freq[m].mean():.2f}; band rates", np.round((sh[m]*bet[m]).sum(0)/sh[m].sum(0),2))
    eq=np.array([d['equity'] for d,_ in D]); strong=np.array([d['strong'] for d,_ in D]); hS=np.array([d['hisStrong'] for d,_ in D]); hW=np.array([d['hisWeak'] for d,_ in D]); weak=np.array([d['weak'] for d,_ in D])
    for nm,x in (('range equity',eq),('own strong share',strong),('own weak share',weak),('his strong share',hS),('his weak share',hW)): print(f"  correlation of bet frequency with {nm}: {np.corrcoef(x,freq)[0,1]:+.2f}")
    # candidate formulas
    s=0.75; v80=sh[:,8:].sum(1); v70=sh[:,7:].sum(1); v60=sh[:,6:].sum(1)
    for nm,pred in (('mean',np.full(len(freq),freq.mean())),('value 80+ x (1+ratio)',v80*(1+s/(1+s))),('value 70+ x (1+ratio)',v70*(1+s/(1+s))),('value 60+ x (1+ratio)',v60*(1+s/(1+s)))):
        print(f"  {nm}: off by {100*np.mean(np.abs(np.clip(pred,0,1)-freq)):.1f} points, r {np.corrcoef(pred,freq)[0,1]:+.2f}")
    A=np.stack([np.ones(len(freq)),eq,strong,weak,hS,hW],1); b=np.linalg.lstsq(A,freq,rcond=None)[0]; print('  linear fit on (1, equity, strong, weak, hisStrong, hisWeak):', np.round(b,2), f"off by {100*np.mean(np.abs(A@b-freq)):.1f}")
    # grid: his strong share x own strong share
    print('  bet frequency by his strong share (rows: <10%, 10-20, 20-30, 30%+) and own strong share (cols: <10, 10-25, 25-40, 40+):')
    for lo,hi in ((0,.1),(.1,.2),(.2,.3),(.3,2)):
        print('   ', [f"{freq[(hS>=lo)&(hS<hi)&(strong>=a)&(strong<b_)].mean():.2f}" if ((hS>=lo)&(hS<hi)&(strong>=a)&(strong<b_)).sum()>30 else '  - ' for a,b_ in ((0,.1),(.1,.25),(.25,.4),(.4,2))])
