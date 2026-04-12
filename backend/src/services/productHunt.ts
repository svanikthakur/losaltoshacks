/**
 * Product Hunt API wrapper — free, GraphQL v2.
 * https://api.producthunt.com/v2/docs
 *
 * Auth priority:
 *   1. PRODUCT_HUNT_DEV_TOKEN (personal developer token — simplest)
 *   2. PRODUCT_HUNT_CLIENT_ID + SECRET (client credentials grant)
 *
 * Returns a short list of recent launches that collide with an idea.
 */
import axios from 'axios'

const GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql'
const OAUTH_URL = 'https://api.producthunt.com/v2/oauth/token'

export interface PhLaunch {
  id: string
  name: string
  tagline: string
  url: string
  votesCount: number
  createdAt: string
  thumbnailUrl?: string
  topics: string[]
}

let cachedClientToken: { token: string; expiresAt: number } | null = null

async function getAuthToken(): Promise<string | null> {
  const dev = process.env.PRODUCT_HUNT_DEV_TOKEN
  if (dev) return dev

  const id = process.env.PRODUCT_HUNT_CLIENT_ID
  const secret = process.env.PRODUCT_HUNT_CLIENT_SECRET
  if (!id || !secret) return null

  // Use cached client_credentials token if still valid
  if (cachedClientToken && cachedClientToken.expiresAt > Date.now() + 30_000) {
    return cachedClientToken.token
  }
  try {
    const res = await axios.post(OAUTH_URL, {
      client_id: id,
      client_secret: secret,
      grant_type: 'client_credentials',
    })
    const tok = (res.data as { access_token?: string; expires_in?: number }).access_token
    const ttl = (res.data as { expires_in?: number }).expires_in || 3600
    if (!tok) return null
    cachedClientToken = { token: tok, expiresAt: Date.now() + ttl * 1000 }
    return tok
  } catch (err) {
    console.warn('[producthunt] oauth token failed:', (err as Error).message)
    return null
  }
}

/** Short token extraction from an idea — 3 most distinctive lowercase words. */
function keywords(idea: string): string {
  const STOPWORDS = new Set([
    'a','an','the','and','or','for','of','to','in','on','with','by','from','is','that','this','app','platform','tool','service','ai','for',
  ])
  const tokens = idea
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
  return tokens.slice(0, 3).join(' ') || idea.slice(0, 40)
}

export async function searchLaunches(idea: string, limit = 10): Promise<PhLaunch[]> {
  const token = await getAuthToken()
  if (!token) return []

  const query = `
    query Search($q: String!, $n: Int!) {
      posts(first: $n, order: RANKING, postedAfter: "${new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()}") {
        edges {
          node {
            id
            name
            tagline
            url
            votesCount
            createdAt
            thumbnail { url }
            topics { edges { node { name } } }
          }
        }
      }
    }
  `

  try {
    const res = await axios.post(
      GRAPHQL_URL,
      { query, variables: { q: keywords(idea), n: 50 } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        timeout: 10_000,
      },
    )
    const edges = (res.data?.data?.posts?.edges || []) as Array<{
      node: {
        id: string
        name: string
        tagline: string
        url: string
        votesCount: number
        createdAt: string
        thumbnail?: { url: string }
        topics?: { edges: Array<{ node: { name: string } }> }
      }
    }>

    // PH's GraphQL doesn't support free-text search directly via the public schema,
    // so we pull recent top-ranked launches and filter client-side against the
    // idea's keywords. That's still grounded in REAL launches from the last 90 days.
    const q = keywords(idea).toLowerCase().split(/\s+/).filter(Boolean)
    const scored = edges
      .map(({ node }) => {
        const text = `${node.name} ${node.tagline}`.toLowerCase()
        let score = 0
        for (const term of q) if (text.includes(term)) score++
        return {
          score,
          launch: {
            id: node.id,
            name: node.name,
            tagline: node.tagline,
            url: node.url,
            votesCount: node.votesCount,
            createdAt: node.createdAt,
            thumbnailUrl: node.thumbnail?.url,
            topics: (node.topics?.edges || []).map((e) => e.node.name),
          } as PhLaunch,
        }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.launch.votesCount - a.launch.votesCount)
      .slice(0, limit)
      .map((x) => x.launch)

    return scored
  } catch (err) {
    console.warn('[producthunt] search failed:', (err as Error).message)
    return []
  }
}
