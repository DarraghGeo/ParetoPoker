import json
data = open('data.json').read()
html = open('template.html').read().replace('/*DATA*/', data).replace('/*LADDER*/', open('ladder.json').read()).replace('/*LINES*/', open('lines.json').read())
open('chart-mockups.html', 'w').write(html); print(len(html))
