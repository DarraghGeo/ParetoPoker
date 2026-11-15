# Builds the place-the-lines mock-up: the app's stylesheet, the mock-up's additions, and the drill with its data.
head = open('hifi.head.html').read().replace('/*APPCSS*/', open('../../web/style.css').read()).replace('<title>Pareto drills</title>', '<title>Pareto line drill</title>')
body = open('lines.body.html').read().replace('/*DATA*/', open('lines.json').read())
open('pareto-line-drill.html', 'w').write(head + body)
print(len(head + body))
