import { runAgentGraph } from '../agent/graph'
import type { NewsItem } from '../../shared/types'

export type { NewsItem }

const TTL = 6 * 60 * 60 // 6 hours in seconds

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
    swr: true, // serve stale data immediately, revalidate in background
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
