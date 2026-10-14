"""Seleciona os vínculos únicos da fonte AOD 2026-27 para IDs MAL aprovados.
Entradas: JSON AOD original e ann-links.json público (chaves MAL aprovadas).
Saída: crosswalk derivado de IDs, sem gêneros/estúdios do ANN. ODbL/DbCL.
"""
import collections
import json
import re
import sys
data=json.load(open(sys.argv[1],encoding='utf-8'))['data']
approved=json.load(open(sys.argv[2],encoding='utf-8'))['data']
pairs=collections.defaultdict(set)
reverse=collections.defaultdict(set)
for row in data:
    mal=[int(m[1]) for u in row['sources'] if (m:=re.fullmatch(r'https://myanimelist.net/anime/(\d+)/?',u))]
    ann=[int(m[1]) for u in row['sources'] if (m:=re.fullmatch(r'https://(?:www\.)?animenewsnetwork.com/encyclopedia/anime.php\?id=(\d+)',u))]
    for aid in ann: reverse[aid].update(mal)
    if len(mal)==len(ann)==1: pairs[mal[0]].add(ann[0])
result={key:next(iter(pairs[int(key)])) for key in approved if len(pairs[int(key)])==1 and len(reverse[next(iter(pairs[int(key)]))])==1}
print(json.dumps(result,sort_keys=True))
