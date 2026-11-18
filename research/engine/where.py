# Every kind of decision for one seat: how often the engine and the solution bet, fold and raise, by strength of hand.
#   python3 research/engine/where.py out/play-engine-<tag>.jsonl [ip|oop]
import json, sys
seat = sys.argv[2] if len(sys.argv) > 2 else 'ip'; G = (('weak (under 35%)', (0, 1)), ('middle (35-65%)', (2, 3)), ('strong (65%+)', (4, 5))); ST = dict(F='flop', T='turn', R='river')
for t in open(sys.argv[1]):
    r = json.loads(t); print(f"\n## {r['spot']} {r['board']} ({seat}: gives up {r['loss'][seat]['after']:.1f}%, a perfect answer wins {r['br'][seat]['after']:.0f}%)\n"); print('| decision | share of hands there | engine | solution | weak: engine / solution | middle | strong |'); print('|---|---|---|---|---|---|---|')
    for key in sorted(r['facing'], key=lambda k: ('FTR'.index(k.split()[1]), k)):
        if not key.startswith(seat): continue
        D = r['facing'][key]; w = D['w']; s_, kind = key.split()[1], ' '.join(key.split()[2:])
        if w <= 0: continue
        def part(j, idx): tot = sum(D['bands'][i][0] for i in idx); return (100 * sum(D['bands'][i][j] for i in idx) / tot) if tot > 0 else None
        share = lambda idx: 100 * sum(D['bands'][i][0] for i in idx) / w; cell = lambda a, b: '-' if a is None else f'{a:.0f} / {b:.0f}'
        if kind == 'first': print(f"| {ST[s_]}, bets when first to act | {' / '.join(f'{share(i):.0f}' for _, i in G)} | {part(1, range(6)):.0f}% | {part(2, range(6)):.0f}% | " + ' | '.join(cell(part(1, i), part(2, i)) for _, i in G) + ' |')
        else:
            print(f"| {ST[s_]}, {kind}: folds | {' / '.join(f'{share(i):.0f}' for _, i in G)} | {part(1, range(6)):.0f}% | {part(2, range(6)):.0f}% | " + ' | '.join(cell(part(1, i), part(2, i)) for _, i in G) + ' |')
            if part(3, range(6)) + part(4, range(6)) > 0.5: print(f"| {ST[s_]}, {kind}: raises | | {part(3, range(6)):.0f}% | {part(4, range(6)):.0f}% | " + ' | '.join(cell(part(3, i), part(4, i)) for _, i in G) + ' |')
