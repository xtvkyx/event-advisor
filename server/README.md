# Event Advisor server: «ابحث وحلّل فعالية»

The page (`index.html`) still runs on its own. The server adds web search:
it serves the page and two endpoints, keeps the search key on the server, and uses only the Python standard library.

## Setup

1. Get a search key (one of these):
   - **Brave Search API** (preferred): https://brave.com/search/api/ → create a key.
   - **Google Programmable Search**: an API key from Google Cloud plus a search engine ID (cx) from https://programmablesearchengine.google.com/.
2. Put the key in an environment variable (PowerShell, current window only):

   ```powershell
   $env:BRAVE_API_KEY = "your-key"
   ```

   Alternative: `$env:GOOGLE_CSE_KEY = "…"` and `$env:GOOGLE_CSE_CX = "…"`.
   Never put the key in the page or the repository.
3. Run it from the repository root:

   ```powershell
   python server/app.py
   ```

   Open http://127.0.0.1:8000 (set `$env:PORT` for another port). `/api/status` reports which provider is active.

## How it works

| Step | Where | What happens |
| --- | --- | --- |
| Search | `POST /api/search` | Queries in Arabic and English (when given), adding the city and season. Asks for a city or season when the name matches events in several cities or years. |
| Verify | `POST /api/verify` | Reads public pages that name the event (http/https only, no private addresses, size and time limits; social pages are not opened). Keeps only results that name the event itself, drops duplicates, and classifies each one: visitor opinion / official or media / unverified / excluded. Each item keeps its link, quote and date when available. |
| Analyse | in the page | Only visitor opinions go through the existing analysis. Official pages describe the event and are never counted. Results are stored per event and per search (name, city, season), with «تحديث البحث». |

Limits: search services do not return Google Maps review text, and for TikTok and X only the post or its description is available, not its comments. The UI states both.

## Tests

```powershell
python -m unittest discover -s server
```

The test inputs in `test_verify.py` are hand-written result shapes, not real pages.
