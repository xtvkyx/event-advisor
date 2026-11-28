#!/usr/bin/env bash
# Builds the prototype, then runs the browser tests (needs Node + Playwright with Chromium).
# Screenshots and PDFs the tests produce go to tests/out/ (git-ignored).
set -e
cd "$(dirname "$0")"
python3 build.py && python3 build.py dbg
mkdir -p tests/out && cd tests/out
for t in u1 u2 u3 u4 u5 u6 u7 u8 u9 t5; do
  echo "=== $t"; node ../$t.js 2>&1 | grep -E "ERRS|errors:|wide" || true
done
