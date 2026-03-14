import { runAgentGraph } from '../agent/graph'
import type { NewsItem } from '../../shared/types'
import { incrementAgentRunCounter, getAgentRunCounter } from '../util/counter'

export type { NewsItem }

const TTL = 6 * 60 * 60 // 6 hours in seconds

const getCachedNews = defineCachedFunction(
  async () => {
    const config = useRuntimeConfig()
    const news = await runAgentGraph(config.openaiApiKey, config.tavilyApiKey)
    news.sort((a, b) => {

      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : NaN
      if (isNaN(da) && isNaN(db)) return 0
      if (isNaN(da)) return 1
      if (isNaN(db)) return -1
      return db - da
    })
    await incrementAgentRunCounter()
    return { news, generatedAt: Date.now() }
  },
  {
    name: 'wroclaw-news',
    maxAge: TTL,
    getKey: () => 'wroclaw-news',
    swr: true, // serve stale data immediately, revalidate in background
  },
)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.openaiApiKey || !config.tavilyApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Brak kluczy API. Ustaw OPENAI_API_KEY i TAVILY_API_KEY w pliku .env',
    })
  }

  const { news, generatedAt } = await getCachedNews()
  const agentRunCount = await getAgentRunCounter()

  // Netlify CDN-level caching (works in production where Nitro's maxAge is ignored)
  setHeader(event, 'Netlify-CDN-Cache-Control', 'public, durable, s-maxage=21600, stale-while-revalidate=3600')
  setHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')
  setHeader(event, 'Netlify-Cache-Tag', 'news')

  return {
    news,
    cachedAt: generatedAt + TTL * 1000,
    fromCache: Date.now() - generatedAt > 1000, // fresh if generated less than 1s ago
    agentRunCount,
  }
})
