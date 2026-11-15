# Builds the strength-ladder mock-up: the app's stylesheet, the mock-up's additions, and the chart with its data.
head = open('hifi.head.html').read().replace('/*APPCSS*/', open('../../web/style.css').read()).replace('<title>Pareto drills</title>', '<title>Pareto strength ladder</title>')
body = open('strength.body.html').read().replace('/*DATA*/', open('strength.json').read())
open('pareto-strength-ladder.html', 'w').write(head + body)
print(len(head + body))
