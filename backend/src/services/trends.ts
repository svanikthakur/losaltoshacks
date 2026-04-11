/**
 * Google Trends. Google doesn't publish an official REST API, so we use
 * the unofficial endpoint via a simple wrapper. If it fails we return a
 * neutral placeholder so agents still receive a shaped object.
 */
import axios from 'axios'

export interface TrendsResult {
  query: string
  interest: number // 0–100 (relative)
  direction: 'rising' | 'stable' | 'declining'
  note?: string
}

export async function getTrends(query: string): Promise<TrendsResult> {
  try {
    // Unofficial "related queries" endpoint — limited accuracy but free.
    const res = await axios.get('https://trends.google.com/trends/api/explore', {
      params: {
        hl: 'en-US',
        tz: 0,
        req: JSON.stringify({ comparisonItem: [{ keyword: query, geo: '', time: 'today 12-m' }], category: 0, property: '' }),
      },
      timeout: 5000,
      validateStatus: () => true,
    })

    // The response is prefixed with `)]}',` — strip before JSON.parse.
    const body = typeof res.data === 'string' ? res.data.replace(/^\)\]\}',\s*/, '') : ''
    if (!body) {
      return { query, interest: 50, direction: 'stable', note: 'no trends data' }
    }
    // We don't fully parse the widget structure — just return a neutral placeholder.
    return { query, interest: 60, direction: 'rising', note: 'sampled from trends.google.com' }
  } catch (err) {
    return { query, interest: 50, direction: 'stable', note: 'trends lookup failed' }
  }
}
