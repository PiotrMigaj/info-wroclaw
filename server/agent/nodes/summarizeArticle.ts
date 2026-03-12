import type { ChatOpenAI } from '@langchain/openai'
import type { Article, NewsItem } from '../../../shared/types'

export async function summarizeArticle(llm: ChatOpenAI, article: Article): Promise<NewsItem> {
  const response = await llm.invoke(
    `Jesteś redaktorem prasowym. Masz przed sobą treść konkretnego artykułu z portalu wrocławskiego.

URL: ${article.url}
Treść:
${article.fullContent.slice(0, 5000)}

Zadania:
1. Napisz STRESZCZENIE tego artykułu w 2-3 zdaniach po polsku. Opisuj konkretne wydarzenie/historię z artykułu.
2. Podaj TYTUŁ artykułu po polsku.
3. Przypisz JEDNĄ kategorię: Polityka, Sport, Kultura, Infrastruktura, Biznes, Wydarzenia, Bezpieczeństwo, Inne.
4. Jeśli w treści jest bezpośredni link do obrazka (jpg/png/webp/jpeg), podaj go – w przeciwnym razie null.

Odpowiedz TYLKO JSON:
{
  "title": "tytuł",
  "summary": "streszczenie",
  "category": "kategoria",
  "imageUrl": "url lub null"
}`,
  )

  const text = typeof response.content === 'string' ? response.content : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return fallback(article)

  try {
    const parsed = JSON.parse(match[0])
    return {
      title: parsed.title || article.url,
      summary: parsed.summary || 'Streszczenie niedostępne.',
      source: new URL(article.url).hostname,
      url: article.url,
      imageUrl: parsed.imageUrl || null,
      publishedAt: new Date().toISOString(),
      category: parsed.category || 'Inne',
    }
  } catch {
    return fallback(article)
  }
}

function fallback(article: Article): NewsItem {
  return {
    title: article.url,
    summary: 'Streszczenie niedostępne.',
    source: new URL(article.url).hostname,
    url: article.url,
    imageUrl: null,
    publishedAt: new Date().toISOString(),
    category: 'Inne',
  }
}
