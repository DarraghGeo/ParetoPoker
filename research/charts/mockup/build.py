import json
data = open('data.json').read()
html = open('template.html').read().replace('/*DATA*/', data)
open('chart-mockups.html', 'w').write(html); print(len(html))
