"""Casos de preservação, vínculo e taxonomia do complemento offline."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('aod', pathlib.Path(__file__).parents[1] / 'scripts/prepare-aod-metadata.py')
aod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aod)

class PrepareTest(unittest.TestCase):
    def current(self, **changes):
        return {'mal_id':1,'type':None,'season':None,'year':2020,'studios':[], **changes}

    def source(self, **changes):
        return {'sources':['https://myanimelist.net/anime/1'],'type':'TV','animeSeason':{'season':'WINTER','year':2020},'studios':[],'tags':['action'], **changes}

    def run_prepare(self, current, source):
        return aod.prepare([current], {'data':[source]})[0]

    def test_empty_only_without_genres(self):
        fields = self.run_prepare(self.current(), self.source())[0]['fields']
        self.assertEqual(fields['type'], 'TV')
        self.assertNotIn('genres', fields)
        self.assertNotIn('tags', fields)

    def test_preserve_filled(self):
        self.assertEqual(self.run_prepare(self.current(type='Movie',season='fall'), self.source()), [])

    def test_year_conflict(self):
        fields = self.run_prepare(self.current(year=2019), self.source())[0]['fields']
        self.assertNotIn('season', fields)
        self.assertNotIn('year', fields)

    def test_multiple_mal_ids_rejected(self):
        self.assertEqual(self.run_prepare(self.current(), self.source(sources=['https://myanimelist.net/anime/1','https://myanimelist.net/anime/2'])), [])

    def test_unrecognized_studio_rejected(self):
        self.assertNotIn('studios', self.run_prepare(self.current(), self.source(studios=['unverified']))[0]['fields'])

    def test_known_studio_canonical_id(self):
        catalog = [self.current(), self.current(mal_id=2,studios=[{'name':'Bones','mal_id':4}])]
        result = aod.prepare(catalog, {'data':[self.source(studios=['bones'])]})[0]
        self.assertEqual(result[0]['fields']['studios'], [{'name':'Bones','mal_id':4}])

if __name__ == '__main__':
    unittest.main()
