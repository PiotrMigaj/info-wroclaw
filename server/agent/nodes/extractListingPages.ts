import * as cheerio from 'cheerio'
import type { ChatOpenAI } from '@langchain/openai'
import type { tavily } from '@tavily/core'
import { LISTING_PAGES } from '../constants'

export async function extractListingPages(
  tavilyClient: ReturnType<typeof tavily>,
  llm: ChatOpenAI,
): Promise<string[]> {
  const getArticleUrlsViaFetch = async (pageUrl: string): Promise<string[]> => {
    const origin = new URL(pageUrl).origin

    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    }).catch(() => null)

    if (!res?.ok) return []

    const html = await res.text()
    const $ = cheerio.load(html)

    const links = new Set<string>()
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (href.startsWith('/')) links.add(origin + href)
      else if (href.startsWith('http')) links.add(href)
    })

    const linkList = [...links]
      .filter(l => l.startsWith(origin))
      .join('\n')

    if (!linkList) return []

    const response = await llm.invoke(
      `Masz listę linków ze strony z newsami: ${pageUrl}

Linki:
${linkList.slice(0, 8000)}

Wypisz URL-e pierwszych 6 artykułów (najnowszych).
Zasady:
- Tylko linki do konkretnych artykułów – NIE do kategorii, tagów, stron głównych ani stron z filtrami.
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

  const getArticleUrlsViaSearch = async (pageUrl: string): Promise<string[]> => {
    const domain = new URL(pageUrl).hostname

    // Use Tavily news search scoped to the domain to find today's articles
    const searchResult = await tavilyClient.search(
      `najnowsze wiadomości Wrocław site:${domain}`,
      {
        topic: 'news',
        timeRange: 'day',
        maxResults: 6,
        includeDomains: [domain],
      },
    )

    return (searchResult.results ?? [])
      .map((r: { url: string }) => r.url)
      .slice(0, 6)
  }

  const getArticleUrls = async (pageUrl: string): Promise<string[]> => {
    // Try direct fetch + cheerio first; fall back to Tavily search if blocked
    const urls = await getArticleUrlsViaFetch(pageUrl)
    if (urls.length > 0) return urls

    return getArticleUrlsViaSearch(pageUrl)
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
