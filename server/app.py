"""Local server for Event Advisor: serves index.html and runs "search and analyse an event".

    python server/app.py            # http://127.0.0.1:8000

Search provider keys stay on the server, in environment variables:
    BRAVE_API_KEY                   Brave Search API (preferred)
    GOOGLE_CSE_KEY + GOOGLE_CSE_CX  Google Programmable Search (alternative)
Standard library only.
"""
import html
import ipaddress
import json
import os
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify as V  # noqa: E402
import media as M  # noqa: E402
import transcribe as W  # noqa: E402
import tempfile  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'EventAdvisor/0.1 (+local prototype)'
MAX_PAGE = 600_000
MAX_MEDIA = 60_000_000
MAX_CLIPS = int(os.environ.get('MAX_CLIPS', '1'))  # start with one clip per search
PAGE_TIMEOUT = 6


def provider():
    if os.environ.get('BRAVE_API_KEY'):
        return 'brave'
    if os.environ.get('GOOGLE_CSE_KEY') and os.environ.get('GOOGLE_CSE_CX'):
        return 'google'
    return None


def _get_json(url, headers):
    req = urllib.request.Request(url, headers=dict(headers, **{'User-Agent': UA, 'Accept': 'application/json'}))
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))


def search_one(q, lang):
    p = provider()
    out = []
    if p == 'brave':
        u = 'https://api.search.brave.com/res/v1/web/search?' + urllib.parse.urlencode(
            {'q': q, 'count': 20, 'search_lang': lang, 'extra_snippets': 'true', 'safesearch': 'moderate'})
        data = _get_json(u, {'X-Subscription-Token': os.environ['BRAVE_API_KEY']})
        for r in (data.get('web') or {}).get('results', []):
            out.append({'url': r.get('url', ''), 'title': html.unescape(re.sub('<[^>]+>', '', r.get('title', ''))),
                        'snippet': html.unescape(re.sub('<[^>]+>', '', r.get('description', ''))),
                        'extra': [html.unescape(re.sub('<[^>]+>', '', x)) for x in (r.get('extra_snippets') or [])],
                        'date': r.get('page_age') or r.get('age') or ''})
    elif p == 'google':
        u = 'https://www.googleapis.com/customsearch/v1?' + urllib.parse.urlencode(
            {'key': os.environ['GOOGLE_CSE_KEY'], 'cx': os.environ['GOOGLE_CSE_CX'], 'q': q, 'num': 10})
        data = _get_json(u, {})
        for r in data.get('items', []):
            mt = ((r.get('pagemap') or {}).get('metatags') or [{}])[0]
            out.append({'url': r.get('link', ''), 'title': r.get('title', ''), 'snippet': r.get('snippet', ''), 'extra': [],
                        'date': mt.get('article:published_time', '')})
    return out


def run_search(body):
    name, name_en, city, season = (str(body.get(k) or '').strip()[:120] for k in ('name', 'name_en', 'city', 'season'))
    qs = V.build_queries(name, name_en, city, season)
    results, errors = [], []
    with ThreadPoolExecutor(4) as ex:
        futs = [ex.submit(search_one, q, 'en' if q.startswith('"' + name_en) and name_en else 'ar') for q in qs]
        for q, f in zip(qs, futs):
            try:
                results.extend(f.result())
            except Exception as e:  # keep the other queries
                errors.append(f'{q}: {type(e).__name__}')
    amb = V.check_ambiguity(results, name, name_en, city, season)
    return {'provider': provider(), 'queries': qs, 'results': results, 'ambiguity': amb, 'errors': errors}


# ---------- page fetching for verification (public http(s) pages only) ----------
def _public_host(host):
    try:
        for fam, _, _, _, sa in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(sa[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except OSError:
        return False


class _NoRedirectToPrivate(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        p = urllib.parse.urlsplit(newurl)
        if p.scheme not in ('http', 'https') or not _public_host(p.hostname or ''):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_NoRedirectToPrivate)
_TAGS = re.compile(r'<(script|style|noscript)[^>]*>.*?</\1>', re.S | re.I)


def fetch_page(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ('http', 'https') or not _public_host(p.hostname or ''):
        return '', ''
    if V._has(url, V.SOCIAL):  # social pages need login/JS; we keep only what the search result shows
        return '', ''
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html'})
        with _opener.open(req, timeout=PAGE_TIMEOUT) as r:
            if 'html' not in (r.headers.get('Content-Type') or ''):
                return '', ''
            raw = r.read(MAX_PAGE).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
    except (urllib.error.URLError, socket.timeout, ValueError, ConnectionError):
        return '', ''
    m = re.search(r'(?:article:published_time|datePublished)["\']?\s*(?:content|:)\s*=?\s*["\']([0-9]{4}-[0-9]{2}-[0-9]{2})', raw)
    text = html.unescape(re.sub(r'<[^>]+>', '\n', _TAGS.sub(' ', raw)))
    text = re.sub(r'\n\s*\n+', '\n', text)
    return text[:60000], (m.group(1) if m else '')


def fetch_html(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ('http', 'https') or not _public_host(p.hostname or '') or V._has(url, V.SOCIAL):
        return ''
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html'})
        with _opener.open(req, timeout=PAGE_TIMEOUT) as r:
            if 'html' not in (r.headers.get('Content-Type') or ''):
                return ''
            return r.read(MAX_PAGE).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
    except (urllib.error.URLError, socket.timeout, ValueError, ConnectionError):
        return ''


def run_media(body):
    """Clip candidates among verified sources: allowed / not_permitted / unavailable."""
    items = [i for i in (body.get('items') or []) if isinstance(i, dict) and i.get('url')][:30]
    out = []
    def one(i):
        u = i['url']
        html = '' if (M.is_media_url(u) or V._has(u, V.SOCIAL)) else fetch_html(u)
        c = M.clip_status(u, html)
        if c:
            c.update({'title': i.get('title', ''), 'source_kind': i.get('kind', ''), 'date': i.get('date', '')})
        return c
    with ThreadPoolExecutor(6) as ex:
        for c in ex.map(one, items):
            if c:
                out.append(c)
    return {'clips': out, 'whisper': W.available(), 'max_clips': MAX_CLIPS}


def _download_media(url, dest):
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ('http', 'https') or not _public_host(p.hostname or ''):
        raise ValueError('not_public')
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with _opener.open(req, timeout=20) as r:
        ct = (r.headers.get('Content-Type') or '').lower()
        if not (ct.startswith('audio/') or ct.startswith('video/') or (M.is_media_url(url) and 'octet-stream' in ct)):
            raise ValueError('not_media')
        n = 0
        while True:
            b = r.read(1 << 16)
            if not b:
                break
            n += len(b)
            if n > MAX_MEDIA:
                raise ValueError('too_large')
            dest.write(b)


def _transcribe_and_link(path, q, source_kind, page_names_event):
    tr = W.transcribe(path, names=[q['name'], q.get('name_en', ''), q.get('city', '')])
    link = M.link_segments(tr['segments'], q['name'], q.get('name_en', ''), q.get('city', ''), source_kind, page_names_event)
    return dict(link, language=tr['language'], duration=tr['duration'], model=W.model_name())


def _q(body):
    return {k: str(body.get(k) or '').strip()[:120] for k in ('name', 'name_en', 'city', 'season')}


def run_transcribe_url(body):
    """Transcribe one allowed clip. The audio is kept only in a temp file that is deleted right after."""
    if not W.available():
        return 503, {'error': 'no_whisper'}
    q = _q(body)
    c = M.clip_status(body.get('source_url', ''), '' if M.is_media_url(body.get('source_url', '')) else fetch_html(body.get('source_url', '')))
    if not c or c['status'] != 'allowed' or c['media_url'] != body.get('media_url'):
        return 403, {'error': 'not_allowed', 'reason': (c or {}).get('reason', 'ما وصلنا لمقطع مسموح بمعالجته')}
    fd, path = tempfile.mkstemp(suffix='.media')
    try:
        with os.fdopen(fd, 'wb') as f:
            _download_media(c['media_url'], f)
        res = _transcribe_and_link(path, q, body.get('source_kind', ''), bool(body.get('page_names_event')))
    except ValueError as e:
        return 422, {'error': str(e)}
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
    return 200, dict(res, source_url=body.get('source_url'), media_url=c['media_url'], license=c.get('license', ''))


def run_transcribe_file(raw, query):
    """A clip the organiser uploads (they confirm they may process it). Not stored after transcription."""
    if not W.available():
        return 503, {'error': 'no_whisper'}
    q = _q(query)
    if not q['name']:
        return 400, {'error': 'name_required'}
    fd, path = tempfile.mkstemp(suffix='.media')
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(raw)
        try:
            res = _transcribe_and_link(path, q, query.get('kind', ''), False)
        except Exception as e:  # undecodable upload
            return 422, {'error': 'bad_media', 'detail': type(e).__name__}
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
    return 200, res


def run_verify(body):
    name, name_en, city, season = (str(body.get(k) or '').strip()[:120] for k in ('name', 'name_en', 'city', 'season'))
    results = [r for r in (body.get('results') or []) if isinstance(r, dict)][:120]
    al, _ = V.aliases(name, name_en, city)
    # read pages only for results whose search snippet already names the event (bounded work)
    todo = [r for r in results if V.mentions(' '.join([r.get('title', ''), r.get('snippet', '')] + list(r.get('extra') or [])), al)][:15]
    with ThreadPoolExecutor(6) as ex:
        for r, (txt, d) in zip(todo, ex.map(lambda r: fetch_page(r.get('url', '')), todo)):
            r['page_text'], r['page_date'] = txt, d
    out = V.verify(results, name, name_en, city, season)
    out['pages_read'] = sum(1 for r in todo if r.get('page_text'))
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def guess_type(self, path):
        t = super().guess_type(path)
        return t + '; charset=utf-8' if t.startswith('text/') else t

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path == '/api/status':
            return self._json(200, {'provider': provider(), 'ready': bool(provider()), 'whisper': W.available(), 'whisper_model': W.model_name()})
        path = urllib.parse.urlsplit(self.path).path
        if path in ('', '/', '/index.html'):
            self.path = '/index.html'
            return super().do_GET()
        return self._json(404, {'error': 'not_found'})  # only the page and the API are served

    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == '/api/transcribe-file':
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0 or n > MAX_MEDIA:
                return self._json(413, {'error': 'too_large'})
            raw = self.rfile.read(n)
            query = {k: v[0] for k, v in urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).items()}
            code, obj = run_transcribe_file(raw, query)
            return self._json(code, obj)
        if path not in ('/api/search', '/api/verify', '/api/media', '/api/transcribe'):
            return self._json(404, {'error': 'not_found'})
        try:
            n = min(int(self.headers.get('Content-Length') or 0), 2_000_000)
            body = json.loads(self.rfile.read(n).decode('utf-8') or '{}')
        except (ValueError, UnicodeDecodeError):
            return self._json(400, {'error': 'bad_json'})
        if not str(body.get('name') or '').strip():
            return self._json(400, {'error': 'name_required'})
        if path == '/api/search':
            if not provider():
                return self._json(503, {'error': 'no_key', 'message': 'ما فيه مفتاح بحث على الخادم. اضبطوا BRAVE_API_KEY أو GOOGLE_CSE_KEY وGOOGLE_CSE_CX ثم أعيدوا تشغيل الخادم.'})
            try:
                return self._json(200, run_search(body))
            except urllib.error.HTTPError as e:
                return self._json(502, {'error': 'provider_error', 'status': e.code})
        if path == '/api/media':
            return self._json(200, run_media(body))
        if path == '/api/transcribe':
            code, obj = run_transcribe_url(body)
            return self._json(code, obj)
        return self._json(200, run_verify(body))


def main():
    port = int(os.environ.get('PORT', '8000'))
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Event Advisor on http://127.0.0.1:{port}  (search provider: {provider() or "none — set BRAVE_API_KEY"})')
    srv.serve_forever()


if __name__ == '__main__':
    main()
