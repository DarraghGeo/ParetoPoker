# What a seat's range is made of at each kind of decision: the engine's beside the solution's.   python3 research/engine/composition.py out/play-engine-<tag>.jsonl [ip|oop]
import json, sys
seat = sys.argv[2] if len(sys.argv) > 2 else 'ip'; ST = dict(F='flop', T='turn', R='river')
for t in open(sys.argv[1]):
    r = json.loads(t)
    if 'composition' not in r: continue
    C = r['composition']; print(f"\n## {r['spot']} {r['board']} ({seat})\n"); print('| decision | weak / middle / strong: engine | solution | average equity: engine | solution | reaches it: engine against solution |'); print('|---|---|---|---|---|---|')
    tot = sum(sum(v[:3]) for k, v in C['solution'].items() if k.startswith(seat + ' F'))
    for key in sorted(C['solution'], key=lambda k: ('FTR'.index(k.split()[1]), -sum(C['solution'][k][:3]))):
        if not key.startswith(seat) or key not in C['engine']: continue
        a, b = C['engine'][key], C['solution'][key]; ta, tb = sum(a[:3]), sum(b[:3])
        if ta <= 0 or tb <= 0 or tb < 0.03 * tot: continue                 # lines the solution takes at least 3% as often as it sees the flop
        f = lambda x, t_: ' / '.join(f'{100 * v / t_:.0f}' for v in x[:3]); k = key.split(' after '); kk = k[0].split()
        print(f"| {ST[kk[1]]}, {' '.join(kk[2:])}, after {k[1]} | {f(a, ta)} | {f(b, tb)} | {100 * a[3] / ta:.0f}% | {100 * b[3] / tb:.0f}% | {ta / tb:.2f}x |")
