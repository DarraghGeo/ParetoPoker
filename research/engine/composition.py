# What a seat's range is made of at each kind of decision: the engine's beside the solution's.   python3 research/engine/composition.py out/play-engine-<tag>.jsonl [ip|oop]
import json, sys
seat = sys.argv[2] if len(sys.argv) > 2 else 'ip'; ST = dict(F='flop', T='turn', R='river')
for t in open(sys.argv[1]):
    r = json.loads(t)
    if 'composition' not in r: continue
    C = r['composition']; print(f"\n## {r['spot']} {r['board']} ({seat})\n"); print('| decision | weak / middle / strong: engine | solution | average equity: engine | solution | reaches it: engine against solution |'); print('|---|---|---|---|---|---|')
    for key in sorted(C['engine'], key=lambda k: ('FTR'.index(k.split()[1]), k)):
        if not key.startswith(seat) or key not in C['solution']: continue
        a, b = C['engine'][key], C['solution'][key]; ta, tb = sum(a[:3]), sum(b[:3])
        if ta <= 0 or tb <= 0: continue
        f = lambda x, tot: ' / '.join(f'{100 * v / tot:.0f}' for v in x[:3]); k = key.split()
        print(f"| {ST[k[1]]}, {' '.join(k[2:])} | {f(a, ta)} | {f(b, tb)} | {100 * a[3] / ta:.0f}% | {100 * b[3] / tb:.0f}% | {ta / tb:.2f}x |")
