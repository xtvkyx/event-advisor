# Event Advisor · مستشار الفعالية

English · [العربية](README.ar.md)

Agent X Hackathon · team **beyond limits** · NEC track: "Turning the event into continuous content"

## The idea

Event Advisor is a general-purpose agent that reads visitor opinions about any event and tells the organiser what visitors ran into and what can be improved. Boulevard World (Riyadh Season) is only the first pilot and is not hard-coded into the logic. The user picks an event or adds a new one, and the agent analyses its data the same way.

The MVP works on **collected data, not live integrations**, and classification is **rule-based** (Saudi Arabic and English), not an LLM.

## Try it

Open `index.html` in a browser. It is a single page with no install and no server, and it opens on Boulevard World with collected data. Events you add, and their data, are stored in your browser only.

1. **What happened?** A summary of visitor opinions: sentiment, recurring complaints, what visitors liked, most-mentioned topics, platform comparison, and the visitor journey. Two charts: the share of visitors who complained per period (approximate), and sentiment per platform.
2. **Recommendations:** improvements for the organiser, with the evidence, when and who, and how to measure the effect. The event status (ongoing or ended) changes the wording.
3. **Data:** choose an event or add a new one, see the data sources, upload files (CSV, JSON or TXT) or paste comments.
4. **Ask the assistant:** a chat that answers from the data only (for example "compare the platforms" or "how do visitors feel?").
5. **View the report (PDF):** preview, then download a report that makes sense to someone who has not seen the dashboard.

## Collected data (Boulevard World)

| Platform | Count | Note |
| --- | --- | --- |
| Google Maps | 187 reviews | Copied by the team without names in November 2026. 70 of them have star ratings |
| TikTok | 37 items | From a public web search on 20 November 2026: video titles, not comments |
| Twitter | 9 items | Same source: public posts |

16 of the TikTok and X items are official, media or advertising content and are not counted as visitor opinion. **There is no live connection to any platform in this version.**

## How it analyses

- **Language rules, not a language model:** word lists for aspects (waiting, crowding, entry, booking, prices, food, shows, vendors, cleanliness, wayfinding) and for praise and criticism, covering Saudi dialect and English. They can be wrong on ambiguous phrases.
- **Sentiment (positive / neutral / negative):** from Google Maps stars when available (4 and 5 positive, 3 neutral, 1 and 2 negative), otherwise from the text.
- **Two star-based rules:** with 4 or 5 stars, a mention of crowding, waiting or vendors only counts as a complaint with an explicit criticism word. With 1 or 2 stars, praise does not count as praise.
- **A recommendation** appears only if a complaint repeats at least 5 times across at least 3 independent sources.
- **Every number can be checked:** clicking it opens the verbatim examples behind it.
- **Two charts in "What happened?":** the share of visitors who complained in each period (approximate, because the data has no exact publish dates, and a hollow point means fewer than 8 opinions), and sentiment per platform. Both are drawn from the same numbers as the tables, with no extra logic.

## Tech stack

- **HTML, CSS and JavaScript** in one file (`index.html`): styles in a `<style>` tag and logic in a `<script>` tag. That is why GitHub reports "HTML 100%".
- **No libraries, server, language model or APIs:** all analysis runs in the browser with rules and word lists.
- **Data** is collected beforehand and embedded in the file (Google Maps, TikTok, X). Events added by the user are stored in their browser only (`localStorage`).
- **The PDF report** is drawn and generated in the browser.

## Architecture: add a source without rebuilding

Every source becomes one unified row (text, platform, date, stars if present, event) and goes through the same analysis pipeline. So platform comparison, sentiment and recommendations work for any new source without changing the logic.

Columns accepted in an uploaded file: `text` (required), `platform` (gmaps, tiktok or x, or chosen at upload), `rating`, `published_at` or `date`, `season`, `area`, and `url`. A sample that shows the format only: [`sample-data/example-format-only.csv`](sample-data/example-format-only.csv) (sentences written for testing, not real opinions).

## Team: beyond limits

| Name | Role |
| --- | --- |
| غلا الشريف | Team lead, presentation |
| لميس الجبلي | Data collection |
| زهى الرويس | Data analysis |
| غيداء بن معدي | Agent development |
| ميس الحماد | Interface design |

## Code and tests

- [`source/`](source/): the file's parts before the build, `build.py`, and browser tests (`./run-tests.sh`).
- [`docs/STATUS.md`](docs/STATUS.md): prototype status and limits (in Arabic).
- [`docs/beyond-limits-solution-deck.pdf`](docs/beyond-limits-solution-deck.pdf): the deck submitted for round one, as submitted (in Arabic).

## Coming soon (not enabled, not part of the MVP)

1. **Live Google Maps:** collect reviews and stars automatically instead of uploading files.
2. **Cameras:** use existing camera data (visitor counts and crowd movement) and link it to visitor opinions, subject to privacy and consent. No direct control of cameras.
3. **Upload your reports:** upload the organiser's reports and documents to combine with what the agent knows.

These three are shown in the interface as "coming soon" and are disabled. Automatically saving lessons from one season to the next has also not been built.

## Limits worth stating

- The Google Maps reviews are a selected sample, not a random one, and the period names are approximate (based on the age of the review).
- TikTok and X items here are titles and posts from content creators and media, so they are an early signal, not a measure of visitor opinion.
- Classification is rule-based and can be wrong, which is why the examples are shown behind every number.
- The PDF report is built from page images (the text cannot be selected).
