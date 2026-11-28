"""Unit tests for server/verify.py.   python -m unittest discover -s server

The search results below are hand-written test inputs that imitate the *shape* of search results.
They are not real pages or real visitor reviews, and the app never uses them.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify as V  # noqa: E402

NAME = 'شتاء طنطورة — العلا'
R = [
    {'url': 'https://www.tripadvisor.com/Attraction_Review-AlUla_Old_Town.html', 'title': 'AlUla Old Town - Reviews',
     'snippet': 'زرنا العلا والبلدة القديمة رائعة والمطاعم حلوة'},
    {'url': 'https://www.experiencealula.com/ar/events/winter-at-tantora', 'title': 'شتاء طنطورة',
     'snippet': 'يعود مهرجان شتاء طنطورة في العلا ببرنامج حفلات وتجارب تراثية'},
    {'url': 'https://www.alwatan.com.sa/article/0000000', 'title': 'انطلاق شتاء طنطورة في العلا',
     'snippet': 'تنطلق فعاليات شتاء طنطورة الخميس'},
    {'url': 'https://www.alwatan.com.sa/ampArticle/0000000', 'title': 'انطلاق شتاء طنطورة في العلا',
     'snippet': 'تنطلق فعاليات شتاء طنطورة الخميس'},
    {'url': 'https://www.tiktok.com/@someone/video/1', 'title': 'جربنا شتاء طنطورة 😍',
     'snippet': 'رحنا شتاء طنطورة والحفل كان رهيب بس الباص بين المواقع تأخر'},
    {'url': 'https://x.com/brand/status/2', 'title': 'احجز تذاكر شتاء طنطورة الآن', 'snippet': 'تذاكر متاحة لشتاء طنطورة'},
    {'url': 'https://someblog.example/winter-tantora-trip', 'title': 'رحلتي إلى العلا',
     'snippet': 'كنا في شتاء طنطورة ثلاثة أيام، التنظيم ممتاز والإرشاد بين المواقع ضعيف'},
    {'url': 'https://forum.example/thread/9', 'title': 'شتاء طنطورة', 'snippet': 'أحد يعرف أسعار شتاء طنطورة؟'},
    {'url': 'https://news.example/riyadh-tantora', 'title': 'شتاء طنطورة', 'snippet': 'زرنا شتاء طنطورة في الرياض'},
]


class VerifyTests(unittest.TestCase):
    def test_split_name_takes_city_from_name(self):
        self.assertEqual(V.split_name(NAME), ('شتاء طنطورة', 'العلا'))

    def test_queries_include_city_and_english(self):
        q = V.build_queries(NAME, 'Winter at Tantora', '', '2025')
        self.assertIn('"شتاء طنطورة" العلا 2025', q)
        self.assertTrue(any(x.startswith('"Winter at Tantora" review alula') for x in q))

    def test_classification(self):
        out = V.verify(R, NAME, 'Winter at Tantora')
        kinds = {i['url']: k for k in ('opinions', 'official', 'unverified', 'excluded') for i in out[k]}
        self.assertEqual(kinds[R[0]['url']], 'excluded')        # general AlUla review, no event name
        self.assertEqual(kinds[R[1]['url']], 'official')
        self.assertEqual(kinds[R[2]['url']], 'official')
        self.assertNotIn(R[3]['url'], kinds)                       # amp duplicate of R[2]
        self.assertEqual(kinds[R[4]['url']], 'opinions')
        self.assertEqual(kinds[R[5]['url']], 'unverified')        # promotional post
        self.assertEqual(kinds[R[6]['url']], 'opinions')
        self.assertEqual(kinds[R[7]['url']], 'unverified')        # a question, not an experience
        self.assertEqual(kinds[R[8]['url']], 'excluded')          # names another city
        self.assertEqual(out['duplicates'], 1)

    def test_social_access_note_and_notes(self):
        out = V.verify(R, NAME, 'Winter at Tantora')
        tik = [i for i in out['opinions'] if i['platform'] == 'tiktok'][0]
        self.assertIn('المنشور أو وصفه', tik['access'])
        self.assertIn('شتاء طنطورة', tik['quote'])
        self.assertTrue(any('قوقل ماب' in n for n in out['notes']))
        self.assertTrue(any('غير كافية' in n for n in out['notes']))  # only 2 opinions

    def test_ambiguous_name_asks_for_city(self):
        res = [{'url': f'https://e{i}.example', 'title': 'مهرجان الشتاء', 'snippet': s} for i, s in enumerate([
            'مهرجان الشتاء في الرياض 2024', 'زرنا مهرجان الشتاء بالرياض', 'مهرجان الشتاء جدة الواجهة', 'مهرجان الشتاء في جده كان زحمة'])]
        amb = V.check_ambiguity(res, 'مهرجان الشتاء')
        self.assertIn('city', amb.get('needs', []))
        self.assertEqual(set(amb['cities'][:2]), {'الرياض', 'جده'})
        self.assertEqual(V.check_ambiguity(res, 'مهرجان الشتاء', city='الرياض', season='2024'), {})

    def test_specific_name_with_city_is_not_ambiguous(self):
        self.assertEqual(V.check_ambiguity(R, NAME), {})


if __name__ == '__main__':
    unittest.main()
