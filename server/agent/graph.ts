import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import { tavily } from '@tavily/core'
import type { Article, NewsItem } from '../../shared/types'
import { extractListingPages } from './nodes/extractListingPages'
import { fetchArticleContent } from './nodes/fetchArticleContent'
import { summarizeArticle } from './nodes/summarizeArticle'

const GraphState = Annotation.Root({
  articleUrls: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  articles: Annotation<Article[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  summaries: Annotation<NewsItem[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
})

export async function runAgentGraph(
  openaiApiKey: string,
  tavilyApiKey: string,
): Promise<NewsItem[]> {
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', apiKey: openaiApiKey, temperature: 0.2 })
  const tavilyClient = tavily({ apiKey: tavilyApiKey })

  const graph = new StateGraph(GraphState)
    .addNode('extract_listing_pages', async () => ({
      articleUrls: await extractListingPages(tavilyClient, llm),
    }))
    .addNode('fetch_article_content', async (state) => ({
      articles: await fetchArticleContent(tavilyClient, state.articleUrls),
    }))
    .addNode('summarize_articles', async (state) => ({
      summaries: await Promise.all(state.articles.map((a) => summarizeArticle(llm, a))),
    }))
    .addEdge(START, 'extract_listing_pages')
    .addEdge('extract_listing_pages', 'fetch_article_content')
    .addEdge('fetch_article_content', 'summarize_articles')
    .addEdge('summarize_articles', END)

  const result = await graph.compile().invoke({})
  return result.summaries
}
