import type { ChatOpenAI } from '@langchain/openai'
import type { tavily } from '@tavily/core'
import { LISTING_PAGES } from '../constants'
import type { TavilyExtractResponse } from '../types'

export async function extractListingPages(
  tavilyClient: ReturnType<typeof tavily>,
  llm: ChatOpenAI,
): Promise<string[]> {
  const getArticleUrls = async (pageUrl: string): Promise<string[]> => {
    const origin = new URL(pageUrl).origin
    const extracted = (await tavilyClient.extract([pageUrl])) as TavilyExtractResponse
    const content = extracted.results?.[0]?.rawContent ?? ''

    const response = await llm.invoke(
      `Masz treść strony z listą artykułów: ${pageUrl}

Treść strony:
${content.slice(0, 8000)}

Wypisz URL-e pierwszych 6 artykułów widocznych NA GÓRZE listy (najnowszych).
Zasady:
- Tylko linki do konkretnych artykułów – NIE do kategorii, tagów, stron głównych ani stron z filtrami.
- Jeśli URL jest relatywny (zaczyna się od "/"), uzupełnij go: ${origin}
- Jeśli artykułów jest mniej niż 6, zwróć ile jest.

Odpowiedz TYLKO JSON:
{"urls": ["url1", "url2", "url3", "url4", "url5", "url6"]}`,
    )

    const text = typeof response.content === 'string' ? response.content : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed.urls) ? parsed.urls.slice(0, 6) : []
  }

  const batches = await Promise.all(LISTING_PAGES.map(getArticleUrls))

  const seen = new Set<string>()
  const articleUrls: string[] = []
  for (const urls of batches) {
    for (const url of urls) {
      const key = url.split('?')[0]!.replace(/\/$/, '')
      if (!seen.has(key)) {
        seen.add(key)
        articleUrls.push(url)
      }
    }
  }

  return articleUrls
}
