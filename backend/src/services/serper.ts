/**
 * Serper.dev — Google Search API (free 2500 queries/month).
 * Falls back to an empty result array if SERPER_API_KEY is unset,
 * so Phase 1 runs without any external credentials.
 */
import axios from 'axios'

export interface SerperResult {
  title: string
  link: string
  snippet: string
}

const SERPER_URL = 'https://google.serper.dev/search'

export async function searchWeb(query: string, num = 8): Promise<SerperResult[]> {
  const key = process.env.SERPER_API_KEY
  if (!key) {
    // No key configured — return a mock result so agents still have something to reason about
    return [
      {
        title: `[mock] Results for: ${query}`,
        link: 'https://example.com',
        snippet: 'Serper is not configured. Set SERPER_API_KEY in .env for real search results.',
      },
    ]
  }
  try {
    const res = await axios.post(
      SERPER_URL,
      { q: query, num },
      {
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        timeout: 8000,
      },
    )
    const organic = (res.data?.organic || []) as any[]
    return organic.slice(0, num).map((r) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet || '',
    }))
  } catch (err) {
    console.error('[serper] query failed:', (err as Error).message)
    return []
  }
}
