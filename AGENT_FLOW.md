# Agentic Flow — info-wroclaw

## Overview

The app runs a **3-node LangGraph pipeline** on every cache miss at `GET /api/news`. It scrapes 4 Wrocław news sites, extracts up to 24 article URLs, fetches full content, and summarizes each one with GPT-4o — all in Polish.

```
GET /api/news
     │
     ▼
[cache hit?] ──yes──► return cached result (valid for 6h)
     │
    no
     │
     ▼
runAgentGraph()
     │
     ▼
┌──────────────────────────┐
│  Node 1                  │
│  extract_listing_pages   │
└────────────┬─────────────┘
             │ articleUrls: string[]
             ▼
┌──────────────────────────┐
│  Node 2                  │
│  fetch_article_content   │
└────────────┬─────────────┘
             │ articles: Article[]
             ▼
┌──────────────────────────┐
│  Node 3                  │
│  summarize_articles      │
└────────────┬─────────────┘
             │ summaries: NewsItem[]
             ▼
        return & cache
```

---

## Node 1 — `extract_listing_pages`

**File:** `server/agent/nodes/extractListingPages.ts`

**What it does:**

Takes the 4 hardcoded listing page URLs from `constants.ts`:
- `wroclaw.pl/kultura/aktualnosci`
- `wroclaw.pl/dla-mieszkanca/aktualnosci`
- `gazetawroclawska.pl/wiadomosci`
- `tuwroclaw.com/wiadomosci/`

For **each page in parallel**:
1. Calls `tavilyClient.extract([pageUrl])` — Tavily scrapes the raw HTML/text of the listing page.
2. Takes the first 8000 characters of the raw content and sends it to GPT-4o with a Polish prompt asking it to extract the top 6 most recent article URLs.
3. The LLM responds with a JSON object `{"urls": [...]}`. The node parses it out with a regex match on `{...}` (tolerant of markdown wrapping).
4. Resolves relative URLs by prepending the page's `origin`.

After all 4 pages are processed, duplicates are removed by normalising URLs (stripping query strings and trailing slashes). The output is a flat deduplicated `string[]` of up to 24 article URLs.

**State output:** `articleUrls: string[]`

---

## Node 2 — `fetch_article_content`

**File:** `server/agent/nodes/fetchArticleContent.ts`

**What it does:**

Takes the `articleUrls` array from Node 1 and fetches all articles **in parallel** using `tavilyClient.extract()`.

For each URL:
1. Calls `tavilyClient.extract([url])` to get the full raw text of the article page.
2. Trims the content to 8000 characters.
3. Returns an `Article` object `{ url, fullContent }`, or `null` on failure (errors are silently swallowed).

Null results are filtered out before the output is passed to Node 3.

**State output:** `articles: Article[]`

---

## Node 3 — `summarize_articles`

**File:** `server/agent/nodes/summarizeArticle.ts`

**What it does:**

Takes the `articles` array and summarizes all articles **in parallel** with `Promise.all`. For each article:

1. Sends the article URL + first 5000 characters of content to GPT-4o with a Polish prompt acting as a "press editor".
2. The LLM is asked to produce a JSON object with:
   - `title` — article title in Polish
   - `summary` — 2–3 sentence summary in Polish
   - `category` — one of: `Polityka`, `Sport`, `Kultura`, `Infrastruktura`, `Biznes`, `Wydarzenia`, `Bezpieczeństwo`, `Inne`
   - `imageUrl` — direct image URL if found in the content, otherwise `null`
3. The response is parsed with a regex + `JSON.parse`. If parsing fails, a fallback `NewsItem` is returned (URL as title, "Streszczenie niedostępne." as summary).
4. `source` is derived from `new URL(article.url).hostname`.
5. `publishedAt` is set to the current timestamp (no publication date is extracted from the article).

**State output:** `summaries: NewsItem[]` — accumulated via the `reducer: (a, b) => [...a, ...b]` defined in the graph state.

---

## Graph State

Defined in `server/agent/graph.ts` using LangGraph's `Annotation.Root`:

| Field        | Type        | Reducer                     |
|--------------|-------------|-----------------------------|
| `articleUrls`| `string[]`  | replace (`_a, b => b`)      |
| `articles`   | `Article[]` | replace (`_a, b => b`)      |
| `summaries`  | `NewsItem[]`| append (`[...a, ...b]`)     |

The graph is compiled and invoked with an empty initial state `{}` — defaults kick in.

---

## Caching Layer

**File:** `server/api/news.get.ts`

Nuxt's `defineCachedFunction` wraps the entire `runAgentGraph()` call:
- Cache key: `'wroclaw-news'` (global singleton)
- TTL: **6 hours** (`swr: false` — no stale-while-revalidate, no background refresh)
- On a cache hit the full pipeline is skipped entirely.
- The response includes `cachedAt` (expiry timestamp) and `fromCache` (boolean) so the UI can show when data was last generated.
- API keys are validated before calling the cached function; a 500 error is thrown if either is missing.

---

## Data flow summary

```
constants.ts (4 URLs)
    │
    ▼
Tavily extract (listing pages) × 4 in parallel
    │
    ▼
GPT-4o: extract top 6 article URLs per page
    │
    ▼
deduplicate → up to 24 article URLs
    │
    ▼
Tavily extract (full articles) × N in parallel
    │
    ▼
GPT-4o: summarize each article × N in parallel
    │
    ▼
NewsItem[] → cached for 6h → returned to client
```

**LLM calls per full run:** `4` (URL extraction) + `N` (summarization, up to ~24) = up to **~28 GPT-4o calls**.
**Tavily calls per full run:** `4` (listing pages) + `N` (articles) = up to **~28 extract calls**.
