"""Builds the single-file prototype from its parts.
Usage:  python3 build.py        -> advisor_simple.html (same content as ../index.html)
        python3 build.py dbg    -> simple_dbg.html (exposes window.__adv() for tests)
"""
import re, sys, os
d = os.path.dirname(os.path.abspath(__file__)) + os.sep
p1 = open(d + 'part1.html', encoding='utf-8').read()
js = ''.join(open(d + f'part{i}.js', encoding='utf-8').read() + '\n' for i in ('2', 'sample', '3', '4s', '5s', '6s', '8s', '7s'))
dbg = len(sys.argv) > 1 and sys.argv[1] == 'dbg'
if not dbg:
    js = re.sub(r'/\*DBG\*/.*?/\*DBGEND\*/', '', js, flags=re.S)
out = d + ('simple_dbg.html' if dbg else 'advisor_simple.html')
open(out, 'w', encoding='utf-8').write(('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' if dbg else '') + p1 + '\n<script>\n' + js + '</script>\n')
print(out, len(p1) + len(js))
