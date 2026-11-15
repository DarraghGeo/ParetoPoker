# Questions for the range-advantage drill mock-up: real spots, each with both ranges' equity and what each range has made.
import json, glob, re, sys, subprocess, numpy as np, collections
sys.path.insert(0, '..'); sys.argv = ['x']
R = '23456789TJQKA'; SU = 'shdc'
exec(open('../runouts.py').read().split("rows = []")[0])          # made(), card(), shares()
exec(open('../analyse.py').read().split("def counts")[0].split("R = ")[0] + "import itertools\n" + "def expand" + open('../analyse.py').read().split("def expand")[1].split("def counts")[0])
js = "import('../../../web/lib/study/presets.js').then(m=>console.log(JSON.stringify(m.PRESETS.filter(p=>p.action!=='Limped').map(p=>({pre:`${p.action}-${p.oop}-${p.ip}`,ranges:[p.ranges.oop,p.ranges.ip]})))))"
PRE = {p['pre']: p['ranges'] for p in json.loads(subprocess.check_output(['node', '-e', js]))}
def cls(h): a, b = sorted((R.index(h[0]), R.index(h[2])), reverse=True); return R[a] + R[b] + ('' if a == b else 's' if h[1] == h[3] else 'o')
def side(hands, board):
    tot = sum(w for _, w in hands); lv = collections.defaultdict(float); ex = collections.defaultdict(lambda: collections.defaultdict(float))
    for h, w in hands:
        m = made([card(h[:2]), card(h[2:])], board); key = 'big' if m >= 2 else 'tp' if m >= 1 else 'pair' if m > 0 else 'none'; lv[key] += w; ex['tp' if m >= 1 else key][cls(h)] += w
        if m >= 2: ex['big'][cls(h)] += w
    top = lambda k: [c for c, _ in sorted(ex[k].items(), key=lambda x: -x[1])[:4]]
    return dict(tp=round((lv['big'] + lv['tp']) / tot, 3), pair=round((lv['big'] + lv['tp'] + lv['pair']) / tot, 3), big=round(lv['big'] / tot, 3), exTp=top('tp'), exBig=top('big'))
def combos(text, board):
    b = set(board); out = []
    for c1, c2, w in expand(text):
        if c1 in b or c2 in b: continue
        out.append((R[c1[0]] + SU[c1[1]] + R[c2[0]] + SU[c2[1]], w))
    return out
def say(line):
    parts = line.split('|'); now = parts[-1]; hist = []
    for seg in parts[:-1]:
        s = re.sub(r'\d', '', seg); hist.append({'xx': 'checked through', 'bc': 'OOP bet, IP called', 'xbc': 'OOP checked, IP bet, OOP called'}.get(s, s))
    cur = {'first': 'OOP to act', 'x': 'OOP checks', 'b': 'OOP bets', 'xb': 'OOP checks, IP bets'}[re.sub(r'\d', '', now)]; return hist, cur
Q = []
def add(pre, boardtxt, eq, a, b, hist, cur, bettor=None):
    act, oop, ip = pre.split('-'); adv = eq - 0.5; Q.append(dict(pre=act, names=[oop, ip], board=boardtxt, street=len(boardtxt.split()), eq=[round(eq, 3), round(1 - eq, 3)], sides=[a, b], hist=hist, cur=cur, bettor=bettor, answer='close' if abs(adv) < 0.02 else 0 if adv > 0 else 1))
# flops: a clear one, a close one, the exception
want = [('SRP-BB-BU', None, lambda r: r['eq'] < 0.44), ('3BP-SB-BU', None, lambda r: abs(r['eq'] - 0.5) < 0.008), ('SRP-SB-UTG', 'Js4h2s', lambda r: True)]
F = [json.loads(l) for f in glob.glob('../out/flops-*.jsonl') for l in open(f)]
for pre, bd, test in want:
    r = next((r for r in F if r['pre'] == pre and (bd is None or r['board'] == bd) and test(r)), None)
    if not r: print('missing', pre); continue
    board = [card(r['board'][i:i + 2]) for i in (0, 2, 4)]; a = side(combos(PRE[pre][0], board), board); b = side(combos(PRE[pre][1], board), board); add(pre, ' '.join(r['board'][i:i + 2] for i in (0, 2, 4)), r['eq'], a, b, [], 'Flop dealt')
# turn before a bet; river facing a bet; river before a bet where two pair or better decides
picks = {'turn': None, 'face': None, 'river': None}
for l in open('../../insight/out/hands-7.jsonl'):
    r = json.loads(l); board = [card(c) for c in r['board'].split()]; n = len(board)
    if n < 4 or min(r['reach']) < 0.15: continue
    mine = [(h['h'], h['w']) for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; his = [(x[0], x[1]) for x in r['vr'] if x[2] is not None]
    w = np.array([w for _, w in mine]); e = np.array([h['e'] for h in r['hands'] if h['w'] > 0 and h['e'] is not None]); eqm = float((w * e).sum() / w.sum()); eq = eqm if r['seat'] == 0 else 1 - eqm
    a, b = side(mine, board), side(his, board); a, b = (a, b) if r['seat'] == 0 else (b, a); adv = eq - 0.5; dtp = a['tp'] - b['tp']; dbig = a['big'] - b['big']; hist, cur = say(r['line']); now = re.sub(r'\d', '', r['line'].split('|')[-1])
    key = None
    if n == 4 and len({c[0] for c in board}) == 4 and now == 'first' and 0.05 < abs(adv) < 0.12 and np.sign(dtp) == np.sign(adv) and abs(dtp) > 0.06 and not picks['turn']: key = 'turn'
    if n == 5 and now in ('b', 'xb') and abs(adv) > 0.1 and not picks['face'] and r['spot'].split()[0] != (picks['turn'] or {}).get('pre'): key = 'face'
    if n == 5 and now == 'first' and 0.05 < abs(adv) < 0.15 and np.sign(dtp) != np.sign(adv) and np.sign(dbig) == np.sign(adv) and abs(dbig) > 0.05 and not picks['river']: key = 'river'
    if key: picks[key] = dict(pre=r['spot'].split()[0]); add(r['spot'].split()[0], r['board'], eq, a, b, hist, cur, bettor=(0 if now == 'b' else 1) if key == 'face' else None)
    if all(picks.values()): break
json.dump(Q, open('questions.json', 'w'), separators=(',', ':'))
for q in Q: print(q['pre'], q['names'], q['board'], q['hist'], q['cur'], 'eq', q['eq'], 'ans', q['answer'], '| tp', q['sides'][0]['tp'], q['sides'][1]['tp'], '| pair', q['sides'][0]['pair'], q['sides'][1]['pair'], '| big', q['sides'][0]['big'], q['sides'][1]['big'], q['sides'][0]['exTp'], q['sides'][1]['exTp'])
