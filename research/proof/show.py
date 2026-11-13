import sys, json
r = json.loads(sys.stdin.read())
print(r['spots'][0][:14], len(r['spots']), 'spots | decisions', r['decisionsExplained'], 'silent', r['decisionsLeftSilent'], '| conclusions', r['conclusions'], '| numbers', r['numbers'], '| largest reversed gap', round(r['largestReversedGap']['gap'], 2), r['largestReversedGap']['where'][:60])
print('    ', json.dumps({k.split(' ')[0]: [v['made'], v['failed']] for k, v in r['byKind'].items()}))
