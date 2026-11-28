"""Unit tests for server/media.py (hand-written inputs, no network)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import media as M  # noqa: E402

NAME = 'شتاء طنطورة — العلا'


class ClipPolicyTests(unittest.TestCase):
    def test_social_is_unavailable(self):
        c = M.clip_status('https://www.tiktok.com/@a/video/1')
        self.assertEqual(c['status'], 'unavailable')
        self.assertIn('غير متاح للتفريغ', c['reason'])

    def test_commons_file_is_allowed(self):
        c = M.clip_status('https://upload.wikimedia.org/wikipedia/commons/a/ab/Talk.ogg')
        self.assertEqual(c['status'], 'allowed')

    def test_embedded_video_without_license_is_not_permitted(self):
        c = M.clip_status('https://news.example/story', '<video src="/media/clip.mp4"></video>')
        self.assertEqual(c['status'], 'not_permitted')
        self.assertEqual(c['media_url'], 'https://news.example/media/clip.mp4')

    def test_embedded_video_with_cc_license_is_allowed(self):
        html = '<video><source src="https://cdn.example/v.webm"></video><a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>'
        self.assertEqual(M.clip_status('https://blog.example/p', html)['status'], 'allowed')

    def test_plain_page_is_not_a_clip(self):
        self.assertIsNone(M.clip_status('https://blog.example/p', '<p>no media</p>'))


class LinkTests(unittest.TestCase):
    SEG = [{'start': 0.0, 'end': 3.2, 'text': 'We went to Winter at Tantora last weekend.'},
           {'start': 3.2, 'end': 6.0, 'text': 'The concert was amazing.'},
           {'start': 6.0, 'end': 9.5, 'text': 'The shuttle bus between the sites was very late.'},
           {'start': 9.5, 'end': 11.0, 'text': 'The sky over the old town.'}]

    def test_opinion_segments_with_timestamps(self):
        r = M.link_segments(self.SEG, NAME, 'Winter at Tantora')
        self.assertTrue(r['related'])
        kinds = [s['kind'] for s in r['segments']]
        self.assertEqual(kinds, ['opinion', 'opinion', 'opinion', 'speech'])
        self.assertEqual(r['segments'][2]['ts'], '00:06')
        self.assertEqual(r['segments'][0]['event'], NAME)

    def test_misheard_name_still_links(self):
        seg = [{'start': 0, 'end': 3, 'text': 'We went to winter at Tontoro and it was amazing.'}]
        self.assertTrue(M.link_segments(seg, NAME, 'Winter at Tantora')['related'])

    def test_announcement_is_info_only(self):
        r = M.link_segments(self.SEG, NAME, 'Winter at Tantora', source_kind='official')
        self.assertEqual({s['kind'] for s in r['segments']}, {'info'})

    def test_clip_about_something_else_is_unrelated(self):
        seg = [{'start': 0, 'end': 2, 'text': 'We visited Riyadh and it was amazing.'}]
        r = M.link_segments(seg, NAME, 'Winter at Tantora')
        self.assertFalse(r['related'])
        self.assertEqual(r['segments'][0]['kind'], 'unrelated')


if __name__ == '__main__':
    unittest.main()
