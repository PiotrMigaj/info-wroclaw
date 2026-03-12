export interface NewsItem {
  title: string
  summary: string
  source: string
  url: string
  imageUrl: string | null
  publishedAt: string | null
  category: string
}

export interface Article {
  url: string
  fullContent: string
}

export type TavilyExtractResponse = {
  results?: Array<{ rawContent?: string }>
}
