# Facing a river bet across the range sweep (sweep.mjs): how much continues against the minimum defence, which equity bands fold and raise.   python3 research/engine/sweep_defence.py
import json, glob, os
import numpy as np
R=[]
for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'sweep-*.jsonl')):
    for t in open(f): R.append(json.loads(t))
for key in ('ip facing a bet','oop facing a bet'):
    D=[(r['at'][key], r) for r in R if key in r['at'] and r['at'][key]['reach']>0]
    bands=np.array([d['bands'] for d,_ in D]); sh=bands[:,:,0]; fold=bands[:,:,1]; call=bands[:,:,2]; rs=bands[:,:,3]
    size=np.array([d['size'] for d,_ in D]); mdf=1/(1+size); price=size/(1+2*size); cont=1-(sh*fold).sum(1); raise_=(sh*rs).sum(1); can=np.array([d['canRaise'] for d,_ in D])
    eq=np.array([d['equity'] for d,_ in D]); weak=np.array([d['weak'] for d,_ in D]); strong=np.array([d['strong'] for d,_ in D]); st=np.array([r['stack'] for _,r in D])
    m=np.abs(size-0.75)<0.02
    print(f"\n== {key}: {len(D)} decisions ({m.mean():.2f} face the full three-quarter bet); continues {cont[m].mean():.3f} (sd {cont[m].std():.3f}) against a minimum defence of {mdf[m].mean():.3f}; raises {raise_[m&can].mean():.3f} where it can")
    print(' fold rate by equity band:', np.round((sh[m]*fold[m]).sum(0)/sh[m].sum(0),2))
    print(' raise rate by equity band (where a raise exists):', np.round((sh[m&can]*rs[m&can]).sum(0)/sh[m&can].sum(0),2))
    print(' share of range by band:', np.round(sh[m].mean(0),3))
    over=np.array([sum(s_ for s_,lo in zip(row,np.arange(0,1,.1)) if lo+.05>=p) for row,p in zip(sh,price)])  # share with equity over the price (band midpoints)
    for nm,pred in (('minimum defence',mdf),('MDF x min(1, 2 x range equity)',mdf*np.minimum(1,2*eq)),('share with equity over the price',over),('0.9 x MDF',0.9*mdf)):
        print(f"  {nm}: off by {100*np.mean(np.abs(pred[m]-cont[m])):.1f} points, r {np.corrcoef(pred[m],cont[m])[0,1] if pred[m].std()>0 else 0:+.2f}, mean {pred[m].mean():.3f}")
    for nm,x in (('range equity against his bets',eq),('own weak share',weak),('own strong share',strong)): print(f"  correlation of continue share with {nm}: {np.corrcoef(x[m],cont[m])[0,1]:+.2f}")
    print('  continue share by range equity against his betting range (<30%, 30-40, 40-50, 50-60, 60%+):', [f"{cont[m&(eq>=a)&(eq<b)].mean():.2f} (n {int((m&(eq>=a)&(eq<b)).sum())})" for a,b in ((0,.3),(.3,.4),(.4,.5),(.5,.6),(.6,2))])
    for s_ in (40,75,125,250,500): mm=m&(st==s_); print(f"  stack {s_}: continues {cont[mm].mean():.2f}, raises {raise_[mm].mean():.2f}; fold by band", np.round((sh[mm]*fold[mm]).sum(0)/np.maximum(sh[mm].sum(0),1e-9),2)) if mm.sum()>50 else None
    A=np.stack([np.ones(m.sum()),eq[m]],1); b=np.linalg.lstsq(A,cont[m],rcond=None)[0]; print(f"  line: continue = {b[0]:.2f} + {b[1]:.2f} x range equity, off by {100*np.mean(np.abs(A@b-cont[m])):.1f}")
