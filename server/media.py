"""Clips after the event search: which ones we may transcribe, and how transcript segments are linked
to the event, the source link and the time they were spoken. Pure functions (no network, no Whisper).
"""
import re
from urllib.parse import urljoin, urlsplit

import verify as V

MEDIA_EXT = re.compile(r'\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|mp4|m4v|mov|webm)(?:$|[?#])', re.I)
OPEN_LICENSE = re.compile(r'creativecommons\.org/(?:licenses|publicdomain)/[a-z\-]+|\bCC[ -](?:BY|0)(?:[ -]SA)?\b|public domain|ملكية عامة', re.I)
COMMONS = ('upload.wikimedia.org', 'commons.wikimedia.org')
TAG_SRC = re.compile(r'<(?:video|audio|source)\b[^>]*\bsrc=["\']([^"\']+)["\']', re.I)
OG_MEDIA = re.compile(r'<meta[^>]+property=["\']og:(?:video|audio)(?::url|:secure_url)?["\'][^>]+content=["\']([^"\']+)["\']', re.I)


def is_media_url(url):
    return bool(MEDIA_EXT.search(urlsplit(url).path + ('?' if urlsplit(url).query else '')))


def media_in_page(page_url, html):
    """Direct audio/video files a page embeds (not players or streams)."""
    found = []
    for m in TAG_SRC.findall(html or '') + OG_MEDIA.findall(html or ''):
        u = urljoin(page_url, m.strip())
        if u.startswith(('http://', 'https://')) and is_media_url(u) and u not in found:
            found.append(u)
    return found


def clip_status(source_url, html=''):
    """One clip candidate per source: allowed / not_permitted / unavailable, with the reason shown in the UI."""
    if V._has(source_url, V.SOCIAL):
        return {'source_url': source_url, 'status': 'unavailable', 'media_url': '',
                'reason': 'مقطع على منصة اجتماعية: ما نقدر نوصل لصوته أو تنزيله غير مسموح، فهو غير متاح للتفريغ.'}
    media = [source_url] if is_media_url(source_url) else media_in_page(source_url, html)
    if not media:
        return None  # a plain page without a clip
    m = media[0]
    host = (urlsplit(m).hostname or '')
    lic = OPEN_LICENSE.search(html or '')
    if any(host == c or host.endswith('.' + c) for c in COMMONS) or lic:
        return {'source_url': source_url, 'status': 'allowed', 'media_url': m,
                'license': (lic.group(0) if lic else 'Wikimedia Commons (ترخيص حر)'), 'reason': 'ملف صوت أو فيديو مباشر بترخيص حر'}
    return {'source_url': source_url, 'status': 'not_permitted', 'media_url': m,
            'reason': 'وصلنا للمقطع لكن ما فيه ترخيص يسمح بمعالجته، فما فرّغناه.'}


OPINION_CUE = re.compile(
    r'(رهيب|حلو|ممتع|روعه|رائع|يستاهل|زحمه|زحام|غالي|غاليه|تاخر|تأخر|سيء|سييء|ممل|انتظرنا|طابور|مزدحم|لذيذ|نظيف|وسخ|'
    r'amazing|great|loved|love|fun|boring|bad|worst|late|crowded|expensive|overpriced|waited|queue|dirty|clean|delicious|beautiful|terrible)', re.I)


def fmt_ts(sec):
    sec = int(sec or 0)
    return f'{sec // 60:02d}:{sec % 60:02d}'


_AR = {'ب': 'b', 'ت': 't', 'ث': 't', 'ج': 'j', 'ح': 'h', 'خ': 'k', 'د': 'd', 'ذ': 'd', 'ر': 'r', 'ز': 's', 'س': 's', 'ش': 's',
       'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'd', 'غ': 'g', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h'}


def skel(s):
    """Consonant pattern, so «Tontoro», «Tantora» and «طنطورة» compare equal."""
    o = ''
    for ch in V.norm(s):
        if 'a' <= ch <= 'z':
            o += '' if ch in 'aeiouyw' else {'x': 'ks', 'c': 'k', 'q': 'k', 'z': 's', 'p': 'b', 'v': 'f'}.get(ch, ch)
        else:
            o += _AR.get(ch, '')
    return re.sub(r'(.)+', r'', o)


def near_mention(text, alias_list):
    """Name heard slightly wrong by speech-to-text: same consonant pattern (≥ 5 letters)."""
    words = V.norm(text).split()
    for a in alias_list:
        k = skel(a)
        n = len(a.split())
        if len(k) < 5:
            continue
        for i in range(len(words) - n + 1):
            if skel(' '.join(words[i:i + n])) == k:
                return True
    return False


def link_segments(segments, name, name_en='', city='', source_kind='', page_names_event=False):
    """Tags each segment: opinion (goes to the analysis) / info (announcement or coverage) / speech / unrelated.

    source_kind: 'official' for announcements or media coverage, 'opinion' or '' otherwise.
    A clip is about the event when its transcript names it, or the page it came from names it.
    """
    al, _ = V.aliases(name, name_en, city)
    full = ' '.join(s.get('text', '') for s in segments)
    related = V.mentions(full, al) or near_mention(full, al) or page_names_event
    out = []
    for s in segments:
        t = (s.get('text') or '').strip()
        n = V.norm(t)
        if not related:
            kind = 'unrelated'
        elif source_kind == 'official':
            kind = 'info'
        elif V.FIRST_PERSON.search(n) or OPINION_CUE.search(n):
            kind = 'opinion'
        else:
            kind = 'speech'
        out.append({'start': round(float(s.get('start') or 0), 2), 'end': round(float(s.get('end') or 0), 2),
                    'ts': fmt_ts(s.get('start')), 'text': t, 'kind': kind, 'event': name})
    return {'related': bool(related), 'names_event': V.mentions(full, al), 'segments': out}
