"""Gera complemento ODbL revisável; nunca escreve no banco de produção.

Entradas: snapshot público do catálogo e JSON original 2026-27.
Saída: dataset derivado público, com somente campos vazios seguros e sem tags.
"""
import collections
import hashlib
import json
import pathlib
import re
import sys

EXPECTED_HASH = '395be786fb2f98f1fca9e963911b9332110098a080e7e2569902bbc5641d1a41'

def prepare(catalog, source):
    indexed = collections.defaultdict(list)
    names = collections.defaultdict(set)
    ids = collections.defaultdict(set)
    for anime in catalog:
        for studio in anime.get('studios') or []:
            name = studio.get('name')
            if name:
                names[name.casefold()].add(name)
                if isinstance(studio.get('mal_id'), int) and studio['mal_id'] > 0:
                    ids[name].add(studio['mal_id'])
    for anime in source['data']:
        matches = [re.fullmatch(r'https://myanimelist.net/anime/(\d+)/?', url) for url in anime['sources']]
        mal_ids = [int(match[1]) for match in matches if match]
        if len(mal_ids) == 1:
            indexed[mal_ids[0]].append(anime)
    result = []
    counts = collections.Counter()
    for current in catalog:
        matches = indexed.get(current['mal_id'], [])
        if len(matches) != 1:
            continue
        anime = matches[0]
        patch = {}
        season = anime.get('animeSeason', {})
        year = season.get('year')
        valid_year = isinstance(year, int) and 1900 <= year <= 2100
        if current.get('season') is None and valid_year and season.get('season') in ('WINTER','SPRING','SUMMER','FALL') and (current.get('year') is None or current['year'] == year):
            patch['season'] = season['season'].lower()
            patch['season_year'] = year
            if current.get('year') is None:
                patch['year'] = year
        types = {'TV':'TV','MOVIE':'Movie','ONA':'ONA','OVA':'OVA','SPECIAL':'Special'}
        if current.get('type') is None and anime.get('type') in types:
            patch['type'] = types[anime['type']]
        studios = anime.get('studios') or []
        if not current.get('studios') and studios and all(len(names[name.casefold()]) == 1 for name in studios):
            canonical = sorted({next(iter(names[name.casefold()])) for name in studios})
            patch['studios'] = [{'name': name, **({'mal_id':next(iter(ids[name]))} if len(ids[name]) == 1 else {})} for name in canonical]
        if patch:
            result.append({'mal_id':current['mal_id'], 'fields':patch})
            counts.update(key for key in patch if key != 'season_year')
    return result, dict(counts)

def main():
    snapshot, original, output = map(pathlib.Path, sys.argv[1:])
    raw = original.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_HASH:
        raise ValueError('O hash do snapshot da fonte não corresponde à versão revisada')
    catalog = json.loads(snapshot.read_text(encoding='utf-8'))
    source = json.loads(raw)
    data, counts = prepare(catalog, source)
    export = {'source':'anime-offline-database / manami-project','version':'2026-27','source_date':'2026-07-04','source_sha256':EXPECTED_HASH,'license':'ODbL-1.0 + DbCL-1.0','license_url':'/metadata/aod/LICENSE.txt','original':'https://github.com/manami-project/anime-offline-database/releases/tag/2026-27','method':'/metadata/aod/prepare-aod-metadata.py','description':'Complemento derivado: somente campos vazios com IDs únicos; sem tags/gêneros, imagens ou pontuações. Nomes canônicos de estúdio são conteúdos adicionais da normalização.','counts':counts,'data':data}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(export, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    print(json.dumps({'titles':len(data),'fields':counts}, ensure_ascii=False))

if __name__ == '__main__':
    main()
