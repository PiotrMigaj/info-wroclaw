import { runAgentGraph } from '../agent/graph'
import type { NewsItem } from '../agent/types'

export type { NewsItem }

const TTL = 6 * 60 * 60 * 0.0001 // 6 hours in seconds

const getCachedNews = defineCachedFunction(
  async () => {
    const config = useRuntimeConfig()
    const news = await runAgentGraph(config.openaiApiKey, config.tavilyApiKey)
    return { news, generatedAt: Date.now() }
  },
  {
    name: 'wroclaw-news',
    maxAge: TTL,
    getKey: () => 'wroclaw-news',
    swr: false, // hard 6-hour lock — no stale serving, no background revalidation
  },
)

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  if (!config.openaiApiKey || !config.tavilyApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Brak kluczy API. Ustaw OPENAI_API_KEY i TAVILY_API_KEY w pliku .env',
    })
  }

  const { news, generatedAt } = await getCachedNews()
  return {
    news,
    cachedAt: generatedAt + TTL * 1000,
    fromCache: Date.now() - generatedAt > 1000, // fresh if generated less than 1s ago
  }
})
