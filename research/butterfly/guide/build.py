# The training guide as a page: the chart, the reads, the sums, and for each of the twelve spots its table and real
# examples (data.json, from guide_data.py).   python3 research/butterfly/guide/build.py -> guide.html (print.cjs makes the PDF)
import json, os, html
HERE = os.path.dirname(os.path.abspath(__file__)); R = json.load(open(os.path.join(HERE, 'data.json')))
SUIT = {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}
card = lambda c: f'<span class="card {c[1]}">{c[0]}{SUIT[c[1]]}</span>'
cards = lambda t: ''.join(card(t[i:i + 2]) for i in range(0, len(t.replace(' ', '')), 2)) if ' ' not in t else ''.join(card(c) for c in t.split())
pct = lambda x, d=0: f'{100 * x:.{d}f}%'
POT = {'SRP': 'Single-raised pot', '3BP': '3-bet pot', '4BP': '4-bet pot', 'Squeeze': 'Squeezed pot'}
ORDER = ['river, out of position, facing a bet', 'river, in position, facing a bet', 'turn, out of position, facing a bet', 'turn, in position, facing a bet', 'flop, out of position, facing a bet', 'flop, in position, facing a bet',
         'river, in position, first to act', 'river, out of position, first to act', 'turn, in position, first to act', 'turn, out of position, first to act', 'flop, in position, first to act', 'flop, out of position, first to act']
HEAD = {'margin': 'Your equity against the price', 'draw': 'Your draw', 'row': 'Your hand\'s row', 'equity': 'Your equity', 'stack to pot': 'Stack to pot', 'who bet last street': 'Who bet on the street before', 'his weak hands': 'His weak hands'}
T = {
 'river, out of position, facing a bet': dict(title='River, facing a bet, out of position', look=['The price of the call (sum 1).', 'Your hand\'s equity against the range that bets.'],
   short=['Equity above the price: call.', 'Equity below the price: fold.', 'Within 5 points either way the two choices are worth nearly the same, so do not agonise.'],
   why='There are no more cards and no more betting after a call. The call either wins often enough to pay for itself or it does not. Nothing about the spot changes that, so this is the one place where a single sum is the whole answer.'),
 'river, in position, facing a bet': dict(title='River, facing a bet, in position', look=['The price of the call (sum 1).', 'Your hand\'s equity against the range that bets.'],
   short=['Exactly as out of position: above the price call, below it fold.'], why='Position does not matter once the betting is over. The same sum decides.'),
 'turn, out of position, facing a bet': dict(title='Turn, facing a bet, out of position', look=['The price of the call (sum 1).', 'Your equity against his betting range.', 'Stack to pot (read 1).'],
   short=['15 points or more over the price: call.', '5 to 15 over: call only when stacks are short (under 2 pots behind).', 'Anything less: fold.'],
   why='Equity on the turn is not money yet. Out of position you act first on the river and he can bet again, so a hand just over the price often has to fold later and never collects. It needs a cushion. When stacks are short there is little left to bet, so the cushion can be smaller.'),
 'turn, in position, facing a bet': dict(title='Turn, facing a bet, in position', look=['The price of the call (sum 1).', 'Your equity against his betting range.', 'Your draw (read 2).'],
   short=['No draw: call with 5 points or more over the price.', 'Gutshot: call when over the price at all.', 'Flush draw: call unless you are 5 or more under.', 'Open-ended straight draw: call.'],
   why='A draw is worth more than its equity says: when it comes in you win a further bet, and when it misses you lose nothing more. In position you also see what he does on the river before you act. So draws may call slightly under the price, and made hands need a small cushion.'),
 'flop, out of position, facing a bet': dict(title='Flop, facing a bet, out of position', look=['The price of the call (sum 1).', 'Your equity against his betting range.', 'Your draw (read 2).'],
   short=['15 points or more over the price: call.', 'Any straight or flush draw, gutshots included: call when over the price.', 'No draw and less than 15 over: fold.'],
   why='Two cards and two streets of betting are still to come, and you will act first on both. A made hand with no draw needs a big cushion to survive that. A draw knows when it has got there, so it can continue on much less.'),
 'flop, in position, facing a bet': dict(title='Flop, facing a bet, in position', look=['The price of the call (sum 1).', 'Your equity against his betting range.', 'Your draw (read 2).'],
   short=['No draw: call with 5 points or more over the price.', 'Any draw: call when over the price, and a gutshot or better may call up to 5 under.'],
   why='The same idea as out of position, with a smaller cushion because you act last on the later streets.'),
 'river, in position, first to act': dict(title='River, checked to you, in position', look=['Your equity against his range.', 'How much of his range is weak (read 4).'],
   short=['80% equity or more: bet.', '65 to 80%: bet only when he has few weak hands (under a fifth of his range), because then he has hands that can call.', 'Under 20% equity: bluff, unless he has few weak hands.', '20 to 50%: check, unless nearly half his range is weak.', '50 to 65%: always check. These hands win at showdown and gain nothing by betting.'],
   why='A river bet makes money in two ways: worse hands call (value) or better hands fold (a bluff). Hands in the middle do neither, so they check. How far down value goes, and how many bluffs you may add, both depend on what he holds: value needs him to have hands that call, bluffs need him to have hands that fold.'),
 'river, out of position, first to act': dict(title='River, first to act, out of position', look=['Your equity against his range.', 'How much of his range is weak (read 4).'],
   short=['He has few weak hands (under a fifth): bet with 65% equity or more, check the rest.', 'He has many weak hands (over 45%): bet only your worst hands as bluffs, check everything else, strong hands included.', 'In between: check everything.'],
   why='Out of position a check is not the end: he may bet, and then your strong hands collect anyway. So betting for value pays only when his range is strong enough to call. When his range is weak he cannot call, so strong hands check and let him bluff, and your hopeless hands take the pot by betting.'),
 'turn, in position, first to act': dict(title='Turn, checked to you, in position', look=['Your equity against his range.', 'Your draw (read 2).'],
   short=['80% equity or more: bet.', 'A flush draw or an open-ended straight draw: bet.', 'Everything else checks, gutshots and medium-strength hands included.'],
   why='Strong hands bet to build the pot. Good draws bet because they can win at once when he folds and can still make the best hand when he calls. Medium hands have the most to lose from being raised, so they check and see the river for free.'),
 'turn, out of position, first to act': dict(title='Turn, first to act, out of position', look=['Your hand\'s row on the chart.', 'Who bet on the flop (read 3).'],
   short=['He bet the flop and you called: check everything.', 'You bet the flop and he called: bet overpairs and draws. Check the rest.', 'The flop was checked through: bet draws and two pair. Check the rest.'],
   why='The player who bet last usually holds the stronger range, and betting into a stronger range from out of position loses money. Checking the whole range to the flop bettor costs almost nothing. When the lead is yours, the hands that gain most from betting are the ones that want protection or can improve.'),
 'flop, in position, first to act': dict(title='Flop, checked to you, in position', look=['Your hand\'s row on the chart.', 'Stack to pot (read 1).'],
   short=['Short stacks (under 2 pots behind): bet overpairs. Check the rest, your very best hands included.', 'Otherwise: bet top pair and better, and draws. Check low pairs. Middle pairs and air can go either way.'],
   why='With short stacks the money goes in easily, so your very best hands can wait and let him catch up or bluff, while overpairs bet because many turn cards hurt them. With deep stacks the best hands must start building the pot now to win a big one by the river.'),
 'flop, out of position, first to act': dict(title='Flop, first to act, out of position', look=['Nothing yet.'],
   short=['Check your whole range.'],
   why='This is the least costly decision in the game. Against solver play, checking everything here loses about a tenth of a percent of the pot. Betting well in this spot is real skill, but it is the last thing to learn, not the first.'),
}
def filled(table):
    """The table's cells by key, with cells that never came up filled from the next band up (marked rare)."""
    names = table['names']; labs = [table['labels'][n] for n in names]; got = {tuple(c['key']): c for c in table['cells']}; out = {}
    import itertools
    for key in itertools.product(*labs):
        if key in got: out[key] = dict(got[key]); continue
        i = labs[0].index(key[0]); src = None
        for j in list(range(i + 1, len(labs[0]))) + list(range(i - 1, -1, -1)):
            k2 = (labs[0][j],) + key[1:]
            if k2 in got: src = got[k2]; break
        out[key] = dict(call=(src['lean'] if src and src['call'] == 'either' else src['call']) if src else 'no', lean=src['lean'] if src else 'no', share=0, solver=None, gap=0, rare=True)
    return names, labs, out
def word(call, facing): return {'act': 'Call' if facing else 'Bet', 'no': 'Fold' if facing else 'Check', 'either': 'Either'}[call]
def cell(c, facing):
    cls = {'act': 'yes', 'no': 'nay', 'either': 'either'}[c['call']] + (' rare' if c.get('rare') or c['share'] < 0.002 else '')
    sub = '' if c.get('solver') is None else f' <i>{pct(c["solver"])}</i>'
    return f'<td class="c {cls}"><b>{word(c["call"], facing)}</b>{sub}</td>'
def rule_table(table, facing):
    names, labs, cells = filled(table); h = '<table class="rule">'
    if len(names) == 1:
        h += f'<tr><th>{HEAD[names[0]]}</th><th>Do this</th><th>Share of the range</th></tr>'
        for a in reversed(labs[0]): c = cells[(a,)]; h += f'<tr><th class="k">{a}</th>{cell(c, facing)}<td class="n">{pct(c["share"])}</td></tr>'
    else:
        h += f'<tr><th>{HEAD[names[0]]}</th>' + ''.join(f'<th>{HEAD[names[1]]}:<br>{b}</th>' for b in labs[1]) + '</tr>'
        for a in reversed(labs[0]): h += f'<tr><th class="k">{a}</th>' + ''.join(cell(cells[(a, b)], facing) for b in labs[1]) + '</tr>'
    return h + '</table>'
def butterfly(rows, seat, facing, wide=236):
    """Both ranges back to back by row, out of position on the left; the player to act in ink, with how much of each row the solver acts with."""
    half = wide / 2 - 58; top = max(max(r['mine'], r['his']) for r in rows); sc = (half - 20) / max(top, 0.01); rh = 17; H = len(rows) * rh + 22
    s = f'<svg class="fly" viewBox="0 0 {wide} {H}" width="{wide}" height="{H}" role="img" aria-label="Both ranges by row">'
    s += f'<text x="{wide / 2 - 46}" y="10" text-anchor="end" class="cap">Out of position</text><text x="{wide / 2 + 46}" y="10" class="cap">In position</text>'
    for i, r in enumerate(rows):
        y = 16 + i * rh; s += f'<text x="{wide / 2}" y="{y + 10}" text-anchor="middle" class="rl">{r["row"]}</text>'
        for side in (0, 1):
            mine = side == seat; v = r['mine'] if mine else r['his']; L = v * sc; x = wide / 2 - 44 - L if side == 0 else wide / 2 + 44
            s += f'<rect x="{x:.1f}" y="{y}" width="{max(L, 0.5):.1f}" height="{rh - 5}" rx="2" class="{"me" if mine else "him"}"/>'
            if mine and r['solver'] is not None and L > 1:
                a = L * r['solver']; xa = x + L - a if side == 0 else x; s += f'<rect x="{xa:.1f}" y="{y}" width="{a:.1f}" height="{rh - 5}" rx="2" class="acts"/>'
            tx = x - 3 if side == 0 else x + L + 3; s += f'<text x="{tx:.1f}" y="{y + 9.5}" text-anchor="{"end" if side == 0 else "start"}" class="num">{pct(v)}</text>'
    return s + '</svg>'
def example(ex, nm, k):
    facing = 'facing' in nm; seat = 0 if 'out of position' in nm else 1; _, oop, ip = ex['pre'].split('-'); me, him = (oop, ip) if seat == 0 else (ip, oop); tb = R[nm]['table']
    head = f'<b>Example {k}.</b> {POT[ex["pot_type"]]}: you are {me}, he is {him}. Board {cards(ex["board"])}'
    if facing: facts = f'Pot {ex["pot"]:g} big blinds with his bet in it, {ex["toCall"]:.1f} to call. <b>Price {pct(ex["price"])}.</b> {ex["behind"]:g} behind.'
    else: facts = f'Pot {ex["pot"]:g} big blinds, {ex["behind"]:g} behind.'
    reads = []
    if 'stack to pot' in tb['names']: reads.append(f'Stack to pot: {ex["spr"]:.1f} ({ex["reads"]["stack to pot"]}).')
    if 'who bet last street' in tb['names']: reads.append({'nobody': 'The street before was checked through.', 'I did': 'You bet the street before and he called.', 'he did': 'He bet the street before and you called.'}[ex['who']])
    if 'his weak hands' in tb['names']: reads.append(f'His weak hands: {pct(ex["values"]["his_weak"])} of his range.')
    cols = ['Hand', 'Row', 'Equity'] + (['Over the price'] if 'margin' in tb['names'] else []) + (['Draw'] if 'draw' in tb['names'] else []) + ['The table says', 'The solver', 'Cost of the table\'s call']
    t = '<table class="ex"><tr>' + ''.join(f'<th>{c}</th>' for c in cols) + '</tr>'
    for h in ex['hands'][:5]:
        does = h['lean'] if h['call'] == 'either' else h['call']; cost = h['cost_act'] if does == 'act' else h['cost_no']; verb = ('calls' if facing else 'bets')
        t += f'<tr><td class="n">{cards(h["hand"])}</td><td>{h["row"]}</td><td class="n">{pct(h["equity"])}</td>' + (f'<td class="n">{100 * h["margin"]:+.0f}</td>' if 'margin' in tb['names'] else '') + (f'<td>{h["draw"]}</td>' if 'draw' in tb['names'] else '')
        t += f'<td><span class="tag {"yes" if does == "act" else "nay"}">{word(h["call"], facing)}</span></td><td class="n">{verb} {pct(h["solver"])}</td><td class="n">{"nothing" if cost < 0.05 else f"{cost:.1f}% of the pot"}</td></tr>'
    t += '</table>'
    fig = butterfly(ex['rows'], seat, facing) if k == 1 else ''
    note = f'<p class="small">The solver {"continues with" if facing else "bets"} {pct(ex["solver_acts"])} of the range here. The table loses {ex["lost"]:.2f}% of the pot on this decision.</p>'
    return f'<div class="example"><p>{head}. {facts} {" ".join(reads)}</p><div class="exrow">{t}{fig}</div>{note}</div>'
def spot(nm, num):
    v = R[nm]; t = T[nm]; facing = 'facing' in nm; sc = v['table']['score']
    h = f'<section class="spot"><h2><span class="no">Spot {num}</span>{t["title"]}</h2>'
    h += '<div class="two"><div><h4>Look at</h4><ul>' + ''.join(f'<li>{x}</li>' for x in t['look']) + '</ul></div><div><h4>In short</h4><ul>' + ''.join(f'<li>{x}</li>' for x in t['short']) + '</ul></div></div>'
    h += f'<p class="why"><b>Why.</b> {t["why"]}</p>' + rule_table(v['table'], facing)
    h += f'<p class="small">The small number is how often the solver {"continues" if facing else "bets"} with those hands. On unseen spots this table loses <b>{sc["mean"]:.2f}% of the pot per decision</b>, {sc["p90"]:.2f}% in the worst tenth.</p>'
    h += ''.join(example(ex, nm, k) for k, ex in enumerate(v['examples'], 1)) + '</section>'
    return h
def results():
    h = '<table class="res"><tr><th>Spot</th><th>The solver acts</th><th>This guide\'s table</th><th>Worst tenth</th><th>Always check or fold</th><th>Always bet or call</th><th>Fitted model</th></tr>'
    for k, nm in enumerate(ORDER, 1):
        v = R[nm]; sc = v['table']['score']; h += f'<tr><td style="white-space:nowrap">{k}. {T[nm]["title"]}</td><td class="n">{pct(v["solver_acts"])}</td><td class="n"><b>{sc["mean"]:.2f}</b></td><td class="n">{sc["p90"]:.2f}</td><td class="n">{v["never"]:.2f}</td><td class="n">{v["always"]:.2f}</td><td class="n">{v["model"][0]:.2f}</td></tr>'
    return h + '</table>'
def appendix_tables():
    h = ''
    for k, nm in enumerate(ORDER, 1):
        names, labs, cells = filled(R[nm]['table']); facing = 'facing' in nm
        h += f'<h4>Spot {k}: {nm}. Inputs: {", ".join(names)}</h4><pre>' + '\n'.join(f'{" | ".join(key)} -> {word(c["lean"] if c["call"] == "either" else c["call"], facing).upper()}{"  (either is fine)" if c["call"] == "either" else ""}{"  (did not occur; filled)" if c.get("rare") else ""}' for key, c in cells.items()) + '</pre>'
    return h
first_ex = R['flop, in position, first to act']['examples'][1]
BODY = open(os.path.join(HERE, 'text.html')).read()
BODY = BODY.replace('{{INTRO_FLY}}', butterfly(first_ex['rows'], 1, False, wide=330)).replace('{{INTRO_BOARD}}', cards(first_ex['board']))
BODY = BODY.replace('{{SPOTS_FACING}}', ''.join(spot(nm, k) for k, nm in enumerate(ORDER[:6], 1))).replace('{{SPOTS_FIRST}}', ''.join(spot(nm, k) for k, nm in enumerate(ORDER[6:], 7)))
BODY = BODY.replace('{{RESULTS}}', results()).replace('{{APPENDIX_TABLES}}', appendix_tables()).replace('{{N}}', str(sum(v['n'] for v in R.values())))
open(os.path.join(HERE, 'guide.html'), 'w').write(BODY)
print('written', len(BODY))
