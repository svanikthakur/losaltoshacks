/**
 * Pexels — free image search API. 200 requests/hour on the free tier.
 * https://www.pexels.com/api/
 *
 * Used by the Deck agent to fetch a hero image for each slide.
 */
import axios from 'axios'

export interface PexelsImage {
  url: string // direct .jpg URL
  photographer: string
  width: number
  height: number
}

const ENDPOINT = 'https://api.pexels.com/v1/search'

export async function searchImage(query: string): Promise<PexelsImage | null> {
  // Accept both spellings — common typo
  const key = process.env.PEXELS_API_KEY || process.env.PEXEL_API_KEY
  if (!key) return null
  try {
    const res = await axios.get(ENDPOINT, {
      params: { query, per_page: 5, orientation: 'landscape' },
      headers: { Authorization: key },
      timeout: 8000,
    })
    const photo = res.data?.photos?.[0]
    if (!photo) return null
    return {
      url: photo.src.large, // ~940px wide, perfect for slide hero
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height,
    }
  } catch (err) {
    console.warn(`[pexels] search failed for "${query}":`, (err as Error).message)
    return null
  }
}

/** Fetch one image per query, in parallel, with graceful nulls. */
export async function searchImages(queries: string[]): Promise<Array<PexelsImage | null>> {
  return Promise.all(queries.map((q) => searchImage(q)))
}

/** Download an image to a Buffer for embedding into binaries. */
export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    })
    return Buffer.from(res.data)
  } catch (err) {
    console.warn(`[pexels] fetch failed for ${url}:`, (err as Error).message)
    return null
  }
}
