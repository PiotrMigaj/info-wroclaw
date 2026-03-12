import type { tavily } from '@tavily/core'
import type { Article, TavilyExtractResponse } from '../../../shared/types'

export async function fetchArticleContent(
  tavilyClient: ReturnType<typeof tavily>,
  articleUrls: string[],
): Promise<Article[]> {
  const fetchOne = async (url: string): Promise<Article | null> => {
    try {
      const extracted = (await tavilyClient.extract([url])) as TavilyExtractResponse
      const raw = extracted.results?.[0]?.rawContent
      if (!raw) return null
      return { url, fullContent: raw.slice(0, 8000) }
    } catch {
      return null
    }
  }

  const results = await Promise.all(articleUrls.map(fetchOne))
  return results.filter((a): a is Article => a !== null)
}
