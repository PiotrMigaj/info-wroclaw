# info-wroclaw

AI-powered local news aggregator for Wrocław. Fetches articles from local news sources, then uses a LangGraph agent pipeline to extract, fetch, and summarize content with GPT-4o.

## Commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run preview  # preview production build
```

No test or lint scripts are configured (though `@nuxt/eslint` is a dev dependency).

## Architecture

### Agent pipeline (`server/agent/`)

Three-stage LangGraph workflow defined in `server/agent/graph.ts`:

1. **Extract URLs** — fetches news source homepages via Tavily and extracts article URLs
2. **Fetch content** — retrieves full article content for each URL
3. **Summarize** — condenses articles into structured summaries using GPT-4o

The LLM extracts `publishedAt` from article content (ISO 8601); falls back to `new Date()` if absent.
Articles are sorted newest-first by `publishedAt` in `news.get.ts` before being cached/returned.

News source URLs are defined in `server/agent/constants.ts`. Each stage is implemented as a separate node in `server/agent/nodes/`.

### API & caching (`server/api/news.get.ts`)

Single API route `/api/news` that runs the agent pipeline. Results are cached server-side for 6 hours using Nuxt's `defineCachedFunction` with `swr: true` — stale data is served immediately while revalidation runs in the background.

Cache is persisted to **Netlify Blobs** (via `nitro.storage.cache` in `nuxt.config.ts`) so it survives cold starts. Requires `@netlify/blobs` package.

### Frontend (`app/pages/index.vue`)

Single-page UI. Fetches data from `/api/news` using `useLazyFetch` with `server: false` (client-side only fetch, no SSR for this call).

## Required environment variables

```
OPENAI_API_KEY=...
TAVILY_API_KEY=...
```
