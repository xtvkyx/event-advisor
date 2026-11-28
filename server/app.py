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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'EventAdvisor/0.1 (+local prototype)'
MAX_PAGE = 600_000
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
            return self._json(200, {'provider': provider(), 'ready': bool(provider())})
        path = urllib.parse.urlsplit(self.path).path
        if path in ('', '/', '/index.html'):
            self.path = '/index.html'
            return super().do_GET()
        return self._json(404, {'error': 'not_found'})  # only the page and the API are served

    def do_POST(self):
        if self.path not in ('/api/search', '/api/verify'):
            return self._json(404, {'error': 'not_found'})
        try:
            n = min(int(self.headers.get('Content-Length') or 0), 2_000_000)
            body = json.loads(self.rfile.read(n).decode('utf-8') or '{}')
        except (ValueError, UnicodeDecodeError):
            return self._json(400, {'error': 'bad_json'})
        if not str(body.get('name') or '').strip():
            return self._json(400, {'error': 'name_required'})
        if self.path == '/api/search':
            if not provider():
                return self._json(503, {'error': 'no_key', 'message': 'ما فيه مفتاح بحث على الخادم. اضبطوا BRAVE_API_KEY أو GOOGLE_CSE_KEY وGOOGLE_CSE_CX ثم أعيدوا تشغيل الخادم.'})
            try:
                return self._json(200, run_search(body))
            except urllib.error.HTTPError as e:
                return self._json(502, {'error': 'provider_error', 'status': e.code})
        return self._json(200, run_verify(body))


def main():
    port = int(os.environ.get('PORT', '8000'))
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Event Advisor on http://127.0.0.1:{port}  (search provider: {provider() or "none — set BRAVE_API_KEY"})')
    srv.serve_forever()


if __name__ == '__main__':
    main()
