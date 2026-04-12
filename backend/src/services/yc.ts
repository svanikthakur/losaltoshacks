/**
 * Y Combinator companies — free public data, no auth.
 *
 * Uses the community-maintained yc-oss mirror which exposes the YC company
 * directory as a static JSON file at https://yc-oss.github.io/api/companies/all.json
 * (updated from the official YC Algolia feed). Zero rate limits.
 *
 * We fetch once, cache for 24h, and filter client-side against the idea.
 */
import axios from 'axios'

const YC_ALL_JSON = 'https://yc-oss.github.io/api/companies/all.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface YcCompany {
  id: number
  name: string
  slug: string
  one_liner: string
  website: string
  long_description?: string
  batch: string
  status: string // Active | Inactive | Acquired | Public
  industry?: string
  tags?: string[]
  stage?: string
  team_size?: number
}

let cache: { data: YcCompany[]; fetchedAt: number } | null = null

async function loadAllCompanies(): Promise<YcCompany[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data
  try {
    const res = await axios.get<YcCompany[]>(YC_ALL_JSON, { timeout: 15_000 })
    if (!Array.isArray(res.data)) return []
    cache = { data: res.data, fetchedAt: Date.now() }
    return res.data
  } catch (err) {
    console.warn('[yc] load failed:', (err as Error).message)
    return cache?.data || []
  }
}

function tokenize(s: string): string[] {
  const STOPWORDS = new Set([
    'a','an','the','and','or','for','of','to','in','on','with','by','from','is','that','this','app','platform','tool','service','ai','using','help','helps','make','build',
  ])
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
}

export interface YcMatch {
  name: string
  slug: string
  one_liner: string
  website: string
  batch: string
  status: string
  score: number
}

export async function searchYcCompanies(idea: string, limit = 10): Promise<YcMatch[]> {
  const all = await loadAllCompanies()
  if (all.length === 0) return []

  const ideaTokens = new Set(tokenize(idea))
  if (ideaTokens.size === 0) return []

  const scored: YcMatch[] = []
  for (const c of all) {
    const haystack = `${c.name} ${c.one_liner} ${c.long_description || ''} ${(c.tags || []).join(' ')}`
    const text = tokenize(haystack)
    let hits = 0
    for (const t of text) if (ideaTokens.has(t)) hits++
    if (hits >= 2) {
      scored.push({
        name: c.name,
        slug: c.slug,
        one_liner: c.one_liner,
        website: c.website,
        batch: c.batch,
        status: c.status,
        score: hits,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
