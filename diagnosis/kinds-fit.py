# Fits kind tables for opening decisions from diagnosis/open-hands-<set>.json.
#   python3 diagnosis/kinds-fit.py diagnosis/open-hands-turns-tune.json diagnosis/turn-kinds-fine.json [bands]
# Writes, per seat, a table [draw][band] of [a, b]: the kind bets a + b x level, where level is
# how often the whole range bets. Cells with little data fall back to the draw-less row, then
# to a line through the origin.
import json, sys
rows = json.load(open(sys.argv[1])); n = int(sys.argv[3]) if len(sys.argv) > 3 else 10
out = {}
for pos in ['oop', 'ip']:
    S = [r for r in rows if r['position'] == pos]
    cells = {}
    for r in S:
        for h in r['hands']:
            if h.get('rank') is None: continue
            k = (h['draw'], min(n - 1, int(h['rank'] * n)))
            cells.setdefault(k, []).append((h['weight'], r['level'], h['bet']))
    def line(g):
        w = sum(x[0] for x in g)
        if w < 8: return None
        mx = sum(x[0] * x[1] for x in g) / w; my = sum(x[0] * x[2] for x in g) / w
        sxx = sum(x[0] * (x[1] - mx) ** 2 for x in g); sxy = sum(x[0] * (x[1] - mx) * (x[2] - my) for x in g)
        if sxx < 1e-6: return [0, round(my / max(mx, 1e-6), 3)]
        b = sxy / sxx
        return [round(my - b * mx, 3), round(b, 3)]
    table = []
    for d in range(4):
        row = []
        for k in range(n):
            cell = line(cells.get((d, k), [])) or line(cells.get((0, k), [])) or [0, 1]
            row.append(cell)
        table.append(row)
    out[pos] = {'bands': [round(i / n, 4) for i in range(n + 1)], 'table': table}
json.dump({'turn': out}, open(sys.argv[2], 'w'))
print('written', sys.argv[2])
