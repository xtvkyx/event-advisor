"""Pure helpers for "search and analyse an event": query building, ambiguity checks,
source verification and classification. No network access here, so it can be unit tested.

A result is a dict: {url, title, snippet, extra:[str], date, page_text, page_date}.
"""
import hashlib
import re
from urllib.parse import urlsplit, urlunsplit

# ---------- Arabic / English normalisation (mirrors the browser's norm()) ----------
_DIAC = re.compile('[ً-ٰٟـ]')


def norm(s):
    s = str(s or '').lower()
    s = _DIAC.sub('', s)
    for a, b in (('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ٱ', 'ا'), ('ى', 'ي'), ('ة', 'ه'), ('ؤ', 'و'), ('ئ', 'ي')):
        s = s.replace(a, b)
    s = re.sub(r'[#_\-–—،,:|]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


SPLIT = re.compile(r'\s*[—–\-|،,]\s*')

CITIES = {
    'الرياض': 'riyadh', 'جده': 'jeddah', 'العلا': 'alula', 'الدمام': 'dammam', 'الخبر': 'khobar',
    'ابها': 'abha', 'الطايف': 'taif', 'مكه': 'makkah', 'المدينه': 'madinah', 'تبوك': 'tabuk',
    'حايل': 'hail', 'ينبع': 'yanbu', 'بريده': 'buraydah', 'جازان': 'jazan', 'نجران': 'najran',
    'الاحساء': 'al ahsa', 'الباحه': 'al baha', 'دبي': 'dubai', 'الدوحه': 'doha',
}


def city_re(c):
    """Matches a city with common Arabic prefixes: بالرياض، والرياض، للرياض، بجده."""
    forms = [c] + (['بال' + c[2:], 'وال' + c[2:], 'لل' + c[2:], 'فال' + c[2:]] if c.startswith('ال') else ['ب' + c, 'و' + c, 'ل' + c, 'في' + c])
    return re.compile(r'(?<![ء-ي])(?:' + '|'.join(forms) + r')(?![ء-ي])')


def split_name(name, city=''):
    """'شتاء طنطورة — العلا' -> ('شتاء طنطورة', 'العلا') when the city is not given separately."""
    parts = [p for p in SPLIT.split(str(name or '').strip()) if p]
    if not parts:
        return '', city
    core = parts[0]
    if not city and len(parts) > 1 and norm(parts[-1]) in CITIES:
        city = parts[-1]
    return core, city


def aliases(name, name_en='', city=''):
    core, city = split_name(name, city)
    out = [a for a in {core.strip(), str(name_en or '').strip()} if len(a) >= 3]
    return [norm(a) for a in out], city


def mentions(text, alias_list):
    t = norm(text)
    for a in alias_list:
        if a and (a in t or a.replace('ال', '', 1) in t):
            return True
    return False


def build_queries(name, name_en='', city='', season=''):
    core, city = split_name(name, city)
    q = []
    ctx = ' '.join(x for x in (city, season) if x)
    q.append(f'"{core}" {ctx}'.strip())
    q.append(f'"{core}" تجربة OR تقييم OR زرنا {ctx}'.strip())
    if name_en:
        en_city = CITIES.get(norm(city), '') if city else ''
        q.append(f'"{name_en}" review {en_city} {season}'.strip())
    q.append(f'"{core}" site:tiktok.com OR site:x.com OR site:instagram.com')
    q.append(f'"{core}" site:tripadvisor.com OR site:google.com/maps OR site:reddit.com')
    return [re.sub(r'\s+', ' ', x) for x in q]


# ---------- source types ----------
SOCIAL = ('tiktok.com', 'x.com', 'twitter.com', 'instagram.com', 'facebook.com', 'snapchat.com', 'youtube.com', 'threads.net')
REVIEW = ('tripadvisor.', 'google.com/maps', 'maps.app.goo.gl', 'goo.gl/maps', 'booking.com', 'reddit.com', 'trip.com', 'yelp.')
OFFICIAL = ('experiencealula.com', 'rcu.gov.sa', '.gov.sa', 'visitsaudi.com', 'spa.gov.sa', 'webook.com', 'riyadhseason.com')
NEWS = ('alwatan.com.sa', 'okaz.com.sa', 'ajel.sa', 'sabq.org', 'arabnews.com', 'saudigazette.com.sa', 'aawsat.com',
        'alarabiya.net', 'alriyadh.com', 'al-madina.com', 'almowaten.net', 'gulfnews.com', 'thenationalnews.com',
        'timeoutriyadh.com', 'whatsonsaudiarabia.com', 'argaam.com', 'almarsd.com', 'mz-mz.net', 'maaal.com')

FIRST_PERSON = re.compile(
    r'(?<![ء-ي])(رحت|رحنا|زرت|زرنا|جربت|جربنا|حضرت|حضرنا|كنا|كنت|تجربتي|تجربتنا|دخلنا|رجعنا|استمتعنا)(?![ء-ي])'
    r'|\b(we went|i went|we visited|i visited|my experience|we attended|i attended|we were there|loved it|our visit)\b')
PROMO = re.compile(r'(احجز|احجزوا|تذاكر متاحة|انطلاق|تنطلق|يقام|تقام|برنامج|فعاليات المهرجان|book now|tickets|announces|launches)')


def domain(url):
    try:
        h = urlsplit(url).hostname or ''
    except ValueError:
        return ''
    return h[4:] if h.startswith('www.') else h


def _has(url, needles):
    d = domain(url)
    full = (d + urlsplit(url).path).lower()
    return any(n in full if '/' in n else (d == n or d.endswith('.' + n.lstrip('.')) or n in d) for n in needles)


def platform_of(url):
    d = domain(url)
    if 'tiktok.com' in d:
        return 'tiktok'
    if d in ('x.com', 'twitter.com') or d.endswith('.x.com') or d.endswith('.twitter.com'):
        return 'x'
    if _has(url, ('google.com/maps', 'maps.app.goo.gl', 'goo.gl/maps')):
        return 'gmaps'
    return 'web'


def canonical(url):
    try:
        p = urlsplit(url)
    except ValueError:
        return url
    host = (p.hostname or '').lower()
    for pre in ('www.', 'm.', 'mobile.', 'amp.'):
        if host.startswith(pre):
            host = host[len(pre):]
    path = re.sub(r'/(amp|ampArticle)(?=/|$)', '', p.path, flags=re.I).rstrip('/')
    path = path.replace('/ampArticle/', '/article/')
    return urlunsplit(('https', host, path, '', ''))


def _sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!؟?\n])\s+|\n+', str(text or '')) if len(s.strip()) > 15]


def evidence_snippet(r, alias_list):
    """Best short quote from the result that mentions the event."""
    pool = [r.get('snippet', '')] + list(r.get('extra') or []) + _sentences(r.get('page_text', ''))[:400] + [r.get('title', '')]
    for s in pool:
        if mentions(s, alias_list) and FIRST_PERSON.search(norm(s)):
            return s.strip()[:400]
    for s in pool:
        if mentions(s, alias_list):
            return s.strip()[:400]
    return ''


def classify(r, alias_list, city=''):
    """Returns (kind, reason). kind in {'opinion','official','unverified','excluded'}."""
    url = r.get('url', '')
    blob = ' '.join([r.get('title', ''), r.get('snippet', '')] + list(r.get('extra') or []) + [r.get('page_text', '')[:20000]])
    if not mentions(blob, alias_list):
        return 'excluded', 'لا يذكر الفعالية نفسها (قد يكون عن المدينة أو مكان آخر)'
    n = norm(blob)
    if city:
        others = [c for c in CITIES if c != norm(city) and city_re(c).search(n)]
        if others and norm(city) not in n and CITIES.get(norm(city), '~') not in n:
            return 'excluded', 'يذكر مدينة مختلفة: ' + '، '.join(others[:2])
    if _has(url, OFFICIAL) or _has(url, NEWS):
        return 'official', 'صفحة رسمية أو إعلامية'
    first = bool(FIRST_PERSON.search(n))
    if _has(url, REVIEW):
        return ('opinion', 'تقييم زائر') if first or _has(url, ('tripadvisor.', 'google.com/maps')) else ('unverified', 'صفحة تقييمات بلا رأي واضح')
    if _has(url, SOCIAL):
        if first and not PROMO.search(n):
            return 'opinion', 'منشور بصيغة تجربة شخصية (المتاح هو المنشور أو وصفه فقط)'
        return 'unverified', 'منشور على منصة اجتماعية بلا تجربة شخصية واضحة'
    if first and not PROMO.search(n):
        return 'opinion', 'صفحة فيها تجربة شخصية تذكر الفعالية'
    return 'unverified', 'يذكر الفعالية لكن ما قدرنا نتحقق إنه رأي زائر'


def check_ambiguity(results, name, name_en='', city='', season=''):
    """Ask for a city/season when the name alone matches events in several places or years."""
    core, city = split_name(name, city)
    if city and season:
        return {}
    al, _ = aliases(name, name_en, city)
    cities, years = {}, {}
    for r in results:
        blob = norm(' '.join([r.get('title', ''), r.get('snippet', '')] + list(r.get('extra') or [])))
        if not mentions(blob, al):
            continue
        for c in CITIES:
            if city_re(c).search(blob) or re.search(r'' + CITIES[c] + r'', blob):
                cities[c] = cities.get(c, 0) + 1
        for y in set(re.findall(r'(?<!\d)(20[12]\d)(?!\d)', blob)):
            years[y] = years.get(y, 0) + 1
    need = []
    multi_city = [c for c, k in cities.items() if k >= 2]
    if not city and (len(multi_city) >= 2 or (len(core.split()) <= 1 and len(cities) >= 2)):
        need.append('city')
    if not season and len([y for y, k in years.items() if k >= 2]) >= 3:
        need.append('season')
    if not need:
        return {}
    return {'needs': need, 'cities': sorted(cities, key=lambda c: -cities[c])[:6], 'years': sorted(years, reverse=True)[:5]}


def verify(results, name, name_en='', city='', season=''):
    al, city = aliases(name, name_en, city)
    seen_url, seen_txt = set(), set()
    out = {'opinions': [], 'official': [], 'unverified': [], 'excluded': [], 'duplicates': 0}
    for r in results:
        cu = canonical(r.get('url', ''))
        if not cu or cu in seen_url:
            out['duplicates'] += 1
            continue
        seen_url.add(cu)
        kind, why = classify(r, al, city)
        quote = evidence_snippet(r, al)
        if kind != 'excluded':
            h = hashlib.sha1(norm(r.get('title', '') + ' ' + r.get('snippet', '')).encode('utf-8')).hexdigest()
            if h in seen_txt:
                out['duplicates'] += 1
                continue
            seen_txt.add(h)
        plat = platform_of(r.get('url', ''))
        item = {'url': r.get('url', ''), 'title': (r.get('title') or '')[:200], 'quote': quote, 'date': r.get('page_date') or r.get('date') or '',
                'platform': plat, 'domain': domain(r.get('url', '')), 'reason': why,
                'access': 'المتاح هو المنشور أو وصفه فقط، لم نقرأ التعليقات' if plat in ('tiktok', 'x') or _has(r.get('url', ''), SOCIAL) else
                          ('نص الصفحة' if r.get('page_text') else 'عنوان ومقتطف نتيجة البحث فقط')}
        out[{'opinion': 'opinions', 'official': 'official', 'unverified': 'unverified', 'excluded': 'excluded'}[kind]].append(item)
    notes = []
    if not any(i['platform'] == 'gmaps' for k in ('opinions', 'unverified') for i in out[k]):
        notes.append('ما توفّرت مراجعات قوقل ماب للفعالية عبر البحث، لأن خدمة البحث لا تعيد نصوص المراجعات.')
    if any(i['platform'] in ('tiktok', 'x') for k in ('opinions', 'unverified') for i in out[k]):
        notes.append('روابط تيك توك وX: المتاح هو المنشور أو وصفه في نتيجة البحث، وما قرأنا التعليقات.')
    if len(out['opinions']) < 5:
        notes.append('آراء الزوار المتحقق منها قليلة، فالنتائج غير كافية لتوصية موثوقة.')
    out['notes'] = notes
    return out
